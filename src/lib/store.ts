import { create } from 'zustand';
import type { ApiKey, Attachment, Chat, Message, Settings } from './types';
import { DEFAULT_SETTINGS } from './types';
import { CHATS_BLOB, KEYS_BLOB, SETTINGS_BLOB, getItem, setItem } from './storage';
import { b64, decryptString, deriveKey, encryptString, randomBytes, unb64 } from './crypto';
import { checkKey, listModels, sendChat } from './api';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

interface State {
  ready: boolean;
  locked: boolean;
  cryptoKey: CryptoKey | null;
  settings: Settings;
  keys: ApiKey[];
  chats: Chat[];
  activeChatId: string | null;
  streamingChatId: string | null;
  abort: AbortController | null;

  init: () => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  setPin: (pin: string | null, currentPin?: string) => Promise<void>;

  saveSettings: (patch: Partial<Settings>) => Promise<void>;

  addKey: (k: Omit<ApiKey, 'id' | 'createdAt' | 'status'>) => Promise<ApiKey>;
  updateKey: (id: string, patch: Partial<ApiKey>) => Promise<void>;
  deleteKey: (id: string) => Promise<void>;
  verifyKey: (id: string) => Promise<void>;
  verifyAll: () => Promise<void>;
  refreshModels: (id: string) => Promise<string[]>;
  importKeys: (keys: ApiKey[]) => Promise<void>;

  newChat: () => string;
  openChat: (id: string | null) => void;
  deleteChat: (id: string) => Promise<void>;
  renameChat: (id: string, title: string) => Promise<void>;
  updateChat: (id: string, patch: Partial<Chat>) => Promise<void>;
  clearChats: () => Promise<void>;

  send: (chatId: string, text: string, attachments: Attachment[]) => Promise<void>;
  regenerate: (chatId: string) => Promise<void>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  stop: () => void;
}

/** Запись чатов на диск с дебаунсом — во время стриминга иначе сотни записей */
let chatsTimer: ReturnType<typeof setTimeout> | null = null;
let pendingChats: Chat[] | null = null;

function persistChats(chats: Chat[], immediate = false) {
  pendingChats = chats;
  if (chatsTimer) clearTimeout(chatsTimer);
  const write = () => {
    chatsTimer = null;
    if (pendingChats) void setItem(CHATS_BLOB, JSON.stringify(pendingChats));
    pendingChats = null;
  };
  if (immediate) write();
  else chatsTimer = setTimeout(write, 500);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && pendingChats) persistChats(pendingChats, true);
  });
}

async function persistKeys(keys: ApiKey[], cryptoKey: CryptoKey | null) {
  const json = JSON.stringify(keys);
  if (cryptoKey) {
    await setItem(KEYS_BLOB, 'enc:' + (await encryptString(cryptoKey, json)));
  } else {
    await setItem(KEYS_BLOB, json);
  }
}

export const useStore = create<State>((set, get) => ({
  ready: false,
  locked: false,
  cryptoKey: null,
  settings: DEFAULT_SETTINGS,
  keys: [],
  chats: [],
  activeChatId: null,
  streamingChatId: null,
  abort: null,

  /* ---------------- init / lock ---------------- */

  init: async () => {
    const rawSettings = await getItem(SETTINGS_BLOB);
    const settings: Settings = { ...DEFAULT_SETTINGS, ...(rawSettings ? JSON.parse(rawSettings) : {}) };
    const rawChats = await getItem(CHATS_BLOB);
    const chats: Chat[] = rawChats ? JSON.parse(rawChats) : [];

    if (settings.encrypted) {
      set({ settings, chats, ready: true, locked: true });
      return;
    }
    const rawKeys = await getItem(KEYS_BLOB);
    const keys: ApiKey[] = rawKeys && !rawKeys.startsWith('enc:') ? JSON.parse(rawKeys) : [];
    set({ settings, chats, keys, ready: true, locked: false });
  },

  unlock: async (pin) => {
    const { settings } = get();
    if (!settings.encrypted || !settings.salt) return true;
    try {
      const key = await deriveKey(pin, unb64(settings.salt));
      if (settings.verifier) {
        const v = await decryptString(key, settings.verifier);
        if (v !== 'anykey-ok') return false;
      }
      const raw = await getItem(KEYS_BLOB);
      let keys: ApiKey[] = [];
      if (raw?.startsWith('enc:')) keys = JSON.parse(await decryptString(key, raw.slice(4)));
      else if (raw) keys = JSON.parse(raw);
      set({ cryptoKey: key, keys, locked: false });
      return true;
    } catch {
      return false;
    }
  },

  setPin: async (pin) => {
    const { keys, settings } = get();
    if (!pin) {
      await persistKeys(keys, null);
      const s: Settings = { ...settings, encrypted: false, salt: undefined, verifier: undefined };
      await setItem(SETTINGS_BLOB, JSON.stringify(s));
      set({ settings: s, cryptoKey: null });
      return;
    }
    const salt = randomBytes(16);
    const key = await deriveKey(pin, salt);
    const verifier = await encryptString(key, 'anykey-ok');
    await persistKeys(keys, key);
    const s: Settings = { ...settings, encrypted: true, salt: b64(salt), verifier };
    await setItem(SETTINGS_BLOB, JSON.stringify(s));
    set({ settings: s, cryptoKey: key });
  },

  saveSettings: async (patch) => {
    const s = { ...get().settings, ...patch };
    await setItem(SETTINGS_BLOB, JSON.stringify(s));
    set({ settings: s });
  },

  /* ---------------- ключи ---------------- */

  addKey: async (data) => {
    const k: ApiKey = { ...data, id: uid(), createdAt: Date.now(), status: 'unknown' };
    const keys = [...get().keys, k];
    set({ keys });
    await persistKeys(keys, get().cryptoKey);
    return k;
  },

  updateKey: async (id, patch) => {
    const keys = get().keys.map((k) => (k.id === id ? { ...k, ...patch } : k));
    set({ keys });
    await persistKeys(keys, get().cryptoKey);
  },

  deleteKey: async (id) => {
    const keys = get().keys.filter((k) => k.id !== id);
    set({ keys });
    await persistKeys(keys, get().cryptoKey);
  },

  verifyKey: async (id) => {
    const k = get().keys.find((x) => x.id === id);
    if (!k) return;
    await get().updateKey(id, { status: 'checking', statusMessage: 'Проверяю…' });
    const res = await checkKey(k);
    await get().updateKey(id, {
      status: res.status,
      statusMessage: res.message,
      checkedAt: Date.now(),
      latencyMs: res.latencyMs,
      ...(res.models?.length ? { models: res.models } : {}),
      ...(res.models?.length && !k.defaultModel ? { defaultModel: pickDefaultModel(res.models) } : {}),
    });
  },

  verifyAll: async () => {
    const ids = get().keys.map((k) => k.id);
    // по 3 параллельно, чтобы не забить сеть телефона
    const queue = [...ids];
    const worker = async () => {
      while (queue.length) {
        const id = queue.shift()!;
        await get().verifyKey(id);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  },

  refreshModels: async (id) => {
    const k = get().keys.find((x) => x.id === id);
    if (!k) return [];
    const models = await listModels(k);
    await get().updateKey(id, { models });
    return models;
  },

  importKeys: async (incoming) => {
    const keys = [...get().keys];
    for (const raw of incoming) {
      const k: ApiKey = {
        ...raw,
        id: uid(),
        createdAt: raw.createdAt ?? Date.now(),
        status: 'unknown',
        statusMessage: undefined,
      };
      keys.push(k);
    }
    set({ keys });
    await persistKeys(keys, get().cryptoKey);
  },

  /* ---------------- чаты ---------------- */

  newChat: () => {
    const { settings, keys, chats } = get();
    const firstValid = keys.find((k) => k.status === 'valid') ?? keys[0];
    const chat: Chat = {
      id: uid(),
      title: 'Новый чат',
      messages: [],
      keyId: firstValid?.id,
      model: firstValid?.defaultModel,
      systemPrompt: settings.defaultSystemPrompt,
      temperature: settings.defaultTemperature,
      maxTokens: settings.defaultMaxTokens,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [chat, ...chats];
    set({ chats: next, activeChatId: chat.id });
    persistChats(next, true);
    return chat.id;
  },

  openChat: (id) => set({ activeChatId: id }),

  deleteChat: async (id) => {
    const chats = get().chats.filter((c) => c.id !== id);
    set({ chats, activeChatId: get().activeChatId === id ? null : get().activeChatId });
    persistChats(chats, true);
  },

  renameChat: async (id, title) => get().updateChat(id, { title }),

  updateChat: async (id, patch) => {
    const chats = get().chats.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c));
    set({ chats });
    persistChats(chats);
  },

  clearChats: async () => {
    set({ chats: [], activeChatId: null });
    persistChats([], true);
  },

  deleteMessage: async (chatId, messageId) => {
    const chat = get().chats.find((c) => c.id === chatId);
    if (!chat) return;
    await get().updateChat(chatId, { messages: chat.messages.filter((m) => m.id !== messageId) });
  },

  stop: () => {
    get().abort?.abort();
    set({ abort: null, streamingChatId: null });
  },

  send: async (chatId, text, attachments) => {
    const chat = get().chats.find((c) => c.id === chatId);
    if (!chat) return;
    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content: text,
      attachments: attachments.length ? attachments : undefined,
      createdAt: Date.now(),
    };
    await get().updateChat(chatId, { messages: [...chat.messages, userMsg] });
    await runCompletion(chatId, set, get);
  },

  regenerate: async (chatId) => {
    const chat = get().chats.find((c) => c.id === chatId);
    if (!chat) return;
    const msgs = [...chat.messages];
    while (msgs.length && msgs[msgs.length - 1].role === 'assistant') msgs.pop();
    await get().updateChat(chatId, { messages: msgs });
    await runCompletion(chatId, set, get);
  },
}));

function pickDefaultModel(models: string[]): string {
  const prefer = [
    /^gpt-4o-mini$/,
    /^gpt-4o$/,
    /^gpt-4/,
    /^claude-3-5-sonnet/,
    /^claude/,
    /^gemini-2\.0-flash$/,
    /^gemini/,
    /^deepseek-chat$/,
    /llama.*70b/i,
  ];
  for (const re of prefer) {
    const hit = models.find((m) => re.test(m));
    if (hit) return hit;
  }
  return models[0];
}

async function runCompletion(chatId: string, set: any, get: () => State) {
  const state = get();
  const chat = state.chats.find((c) => c.id === chatId);
  if (!chat) return;
  const key = state.keys.find((k) => k.id === chat.keyId);
  const model = chat.model || key?.defaultModel;

  if (!key) {
    await pushAssistantError(chatId, 'Не выбран API-ключ. Добавь ключ во вкладке «Ключи».', get);
    return;
  }
  if (!model) {
    await pushAssistantError(chatId, 'Не выбрана модель. Открой настройки чата (⚙) и выбери модель.', get);
    return;
  }

  const assistantId = uid();
  const assistant: Message = {
    id: assistantId,
    role: 'assistant',
    content: '',
    createdAt: Date.now(),
    model,
    keyId: key.id,
    pending: true,
  };
  await get().updateChat(chatId, { messages: [...chat.messages, assistant] });

  const abort = new AbortController();
  set({ abort, streamingChatId: chatId });

  let acc = '';
  let lastFlush = 0;
  const flush = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFlush < 60) return;
    lastFlush = now;
    const c = get().chats.find((x) => x.id === chatId);
    if (!c) return;
    await get().updateChat(chatId, {
      messages: c.messages.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
    });
  };

  try {
    const history = (get().chats.find((c) => c.id === chatId)?.messages ?? []).filter(
      (m) => m.id !== assistantId && !m.error,
    );
    const { usage } = await sendChat({
      key,
      model,
      messages: history,
      systemPrompt: chat.systemPrompt,
      temperature: chat.temperature,
      maxTokens: chat.maxTokens,
      stream: get().settings.streaming,
      signal: abort.signal,
      onDelta: (d) => {
        acc += d;
        void flush();
      },
    });
    const c = get().chats.find((x) => x.id === chatId);
    if (c) {
      await get().updateChat(chatId, {
        messages: c.messages.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: acc || '(пустой ответ)',
                pending: false,
                usage: usage
                  ? {
                      promptTokens: usage.prompt_tokens ?? usage.input_tokens ?? usage.promptTokenCount,
                      completionTokens: usage.completion_tokens ?? usage.output_tokens ?? usage.candidatesTokenCount,
                    }
                  : undefined,
              }
            : m,
        ),
      });
    }
    await maybeAutoTitle(chatId, get);
  } catch (e: any) {
    const aborted = abort.signal.aborted;
    const c = get().chats.find((x) => x.id === chatId);
    if (c) {
      await get().updateChat(chatId, {
        messages: c.messages.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                pending: false,
                content: acc,
                error: aborted ? 'Остановлено' : humanError(e),
              }
            : m,
        ),
      });
    }
  } finally {
    set({ abort: null, streamingChatId: null });
  }
}

function humanError(e: any): string {
  const status = e?.status;
  const msg = e?.message ?? String(e);
  if (status === 401 || status === 403) return `Ключ не принят (${status}). Проверь ключ во вкладке «Ключи». ${msg}`;
  if (status === 402) return `Закончились средства или лимит (402). ${msg}`;
  if (status === 404) return `Модель или адрес не найдены (404). ${msg}`;
  if (status === 429) return `Слишком много запросов (429). Подожди немного. ${msg}`;
  if (status >= 500) return `Ошибка сервера (${status}). ${msg}`;
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg))
    return 'Не удалось подключиться. Проверь интернет и базовый URL (для http-адресов нужен доступ в ту же сеть).';
  return msg;
}

async function pushAssistantError(chatId: string, text: string, get: () => State) {
  const chat = get().chats.find((c) => c.id === chatId);
  if (!chat) return;
  await get().updateChat(chatId, {
    messages: [...chat.messages, { id: uid(), role: 'assistant', content: '', error: text, createdAt: Date.now() }],
  });
}

async function maybeAutoTitle(chatId: string, get: () => State) {
  const s = get();
  if (!s.settings.autoTitle) return;
  const chat = s.chats.find((c) => c.id === chatId);
  if (!chat || chat.title !== 'Новый чат') return;
  const first = chat.messages.find((m) => m.role === 'user')?.content ?? '';
  const title = first.replace(/\s+/g, ' ').trim().slice(0, 40);
  if (title) await get().updateChat(chatId, { title: title + (first.length > 40 ? '…' : '') });
}
