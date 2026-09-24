import type { ApiKey, Attachment, Message, Protocol } from './types';
import { getProvider } from './providers';
import { isNative, joinUrl, request, safeJson, sseLines } from './http';

/* ------------------------------------------------------------------ */
/* Заголовки                                                           */
/* ------------------------------------------------------------------ */

export function authHeaders(k: ApiKey): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (k.protocol === 'anthropic') {
    if (k.key) h['x-api-key'] = k.key;
    h['anthropic-version'] = '2023-06-01';
    // без этого заголовка Anthropic блокирует запросы прямо из WebView
    h['anthropic-dangerous-direct-browser-access'] = 'true';
  } else if (k.protocol === 'gemini') {
    if (k.key) h['x-goog-api-key'] = k.key;
  } else {
    if (k.key) h['Authorization'] = `Bearer ${k.key}`;
    if (k.providerId === 'openrouter') {
      h['HTTP-Referer'] = 'https://github.com/anykey-chat';
      h['X-Title'] = 'AnyKey Chat';
    }
  }
  return { ...h, ...(k.extraHeaders ?? {}) };
}

/* ------------------------------------------------------------------ */
/* Список моделей                                                      */
/* ------------------------------------------------------------------ */

export async function listModels(k: ApiKey): Promise<string[]> {
  const url = k.protocol === 'gemini' ? joinUrl(k.baseUrl, '/models') : joinUrl(k.baseUrl, '/models');
  const res = await request(url, { headers: authHeaders(k), timeoutMs: 20000 });
  if (!res.ok) throw new HttpError(res.status, extractError(res.data, res.text));
  return parseModels(res.data, k.protocol);
}

function parseModels(data: any, protocol: Protocol): string[] {
  if (!data) return [];
  if (protocol === 'gemini') {
    const arr = data.models ?? [];
    return arr.map((m: any) => String(m.name ?? '').replace(/^models\//, '')).filter(Boolean);
  }
  const arr = Array.isArray(data) ? data : (data.data ?? data.models ?? data.result ?? []);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((m: any) => (typeof m === 'string' ? m : (m.id ?? m.name ?? m.model)))
    .filter(Boolean)
    .map(String);
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function extractError(data: any, text: string): string {
  if (data) {
    const e = data.error ?? data;
    const msg = e?.message ?? e?.error ?? e?.detail ?? e?.msg;
    if (typeof msg === 'string') return msg;
    if (typeof e === 'string') return e;
  }
  return (text || '').slice(0, 300) || 'Пустой ответ';
}

/* ------------------------------------------------------------------ */
/* Проверка ключа на валидность                                        */
/* ------------------------------------------------------------------ */

export interface CheckResult {
  status: 'valid' | 'invalid' | 'error';
  message: string;
  models?: string[];
  latencyMs: number;
}

export async function checkKey(k: ApiKey): Promise<CheckResult> {
  const started = Date.now();
  const done = () => Date.now() - started;

  if (!k.baseUrl) return { status: 'error', message: 'Не указан базовый URL', latencyMs: done() };

  // 1) Пытаемся получить список моделей — самый дешёвый способ (0 токенов)
  try {
    const models = await listModels(k);
    if (models.length) {
      return {
        status: 'valid',
        message: `Ключ рабочий · моделей: ${models.length}`,
        models,
        latencyMs: done(),
      };
    }
    // 200, но пустой список — пробуем «пробный» запрос
  } catch (e: any) {
    if (e instanceof HttpError) {
      if (e.status === 401 || e.status === 403) {
        return { status: 'invalid', message: `Ключ отклонён (${e.status}): ${e.message}`, latencyMs: done() };
      }
      if (e.status === 402) {
        return { status: 'invalid', message: `Нет средств/лимит исчерпан (402): ${e.message}`, latencyMs: done() };
      }
      if (e.status === 429) {
        return { status: 'valid', message: 'Ключ принят, но сейчас rate-limit (429)', latencyMs: done() };
      }
      // 404/405 и прочее — у прокси часто нет /models, идём дальше
    } else {
      return { status: 'error', message: `Сеть: ${e?.message ?? e}`, latencyMs: done() };
    }
  }

  // 2) Fallback: минимальный чат-запрос на 1 токен
  const model = k.defaultModel || getProvider(k.providerId)?.probeModel || 'gpt-4o-mini';
  try {
    const probe = await probeChat(k, model);
    if (probe.ok) {
      return { status: 'valid', message: `Ключ рабочий (проверен запросом к ${model})`, latencyMs: done() };
    }
    if (probe.status === 401 || probe.status === 403) {
      return { status: 'invalid', message: `Ключ отклонён (${probe.status}): ${probe.message}`, latencyMs: done() };
    }
    if (probe.status === 402) {
      return { status: 'invalid', message: `Оплата/лимит (402): ${probe.message}`, latencyMs: done() };
    }
    if (probe.status === 404 || probe.status === 400) {
      // ключ прошёл авторизацию, но модель не та
      return {
        status: 'valid',
        message: `Авторизация прошла, но модель «${model}» недоступна: ${probe.message}. Укажи свою модель.`,
        latencyMs: done(),
      };
    }
    if (probe.status === 429) {
      return { status: 'valid', message: 'Ключ принят, rate-limit (429)', latencyMs: done() };
    }
    return { status: 'error', message: `HTTP ${probe.status}: ${probe.message}`, latencyMs: done() };
  } catch (e: any) {
    return { status: 'error', message: `Сеть: ${e?.message ?? e}`, latencyMs: done() };
  }
}

async function probeChat(k: ApiKey, model: string) {
  const { url, body } = buildChatRequest(k, model, [{ role: 'user', content: 'ping' } as any], {
    maxTokens: 1,
    temperature: 0,
    stream: false,
    systemPrompt: '',
  });
  const res = await request(url, { method: 'POST', headers: authHeaders(k), body, timeoutMs: 30000 });
  return { ok: res.ok, status: res.status, message: extractError(res.data, res.text) };
}

/* ------------------------------------------------------------------ */
/* Конвертация сообщений под каждый протокол                           */
/* ------------------------------------------------------------------ */

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream: boolean;
  systemPrompt?: string;
}

function textOf(m: Message): string {
  const files = (m.attachments ?? []).filter((a) => a.kind === 'text');
  const extra = files.map((f) => `\n\n--- файл: ${f.name} ---\n${f.data}`).join('');
  return m.content + extra;
}

function imagesOf(m: Message): Attachment[] {
  return (m.attachments ?? []).filter((a) => a.kind === 'image');
}

export function buildChatRequest(k: ApiKey, model: string, messages: Message[], opts: ChatOptions) {
  if (k.protocol === 'anthropic') {
    const body: any = {
      model,
      max_tokens: opts.maxTokens ?? 4096,
      stream: opts.stream,
      messages: messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role,
          content: [
            ...imagesOf(m).map((a) => ({
              type: 'image',
              source: { type: 'base64', media_type: a.mimeType, data: a.data },
            })),
            { type: 'text', text: textOf(m) || '...' },
          ],
        })),
    };
    if (opts.temperature !== undefined) body.temperature = opts.temperature;
    if (opts.systemPrompt) body.system = opts.systemPrompt;
    return { url: joinUrl(k.baseUrl, '/messages'), body };
  }

  if (k.protocol === 'gemini') {
    const body: any = {
      contents: messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [
            ...imagesOf(m).map((a) => ({ inline_data: { mime_type: a.mimeType, data: a.data } })),
            { text: textOf(m) || '...' },
          ],
        })),
      generationConfig: {
        temperature: opts.temperature,
        maxOutputTokens: opts.maxTokens,
      },
    };
    if (opts.systemPrompt) body.systemInstruction = { parts: [{ text: opts.systemPrompt }] };
    const method = opts.stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
    return { url: joinUrl(k.baseUrl, `/models/${model}:${method}`), body };
  }

  // openai-совместимый
  const body: any = {
    model,
    stream: opts.stream,
    messages: [
      ...(opts.systemPrompt ? [{ role: 'system', content: opts.systemPrompt }] : []),
      ...messages
        .filter((m) => m.role !== 'system')
        .map((m) => {
          const imgs = imagesOf(m);
          if (!imgs.length) return { role: m.role, content: textOf(m) };
          return {
            role: m.role,
            content: [
              { type: 'text', text: textOf(m) },
              ...imgs.map((a) => ({
                type: 'image_url',
                image_url: { url: `data:${a.mimeType};base64,${a.data}` },
              })),
            ],
          };
        }),
    ],
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.stream) body.stream_options = { include_usage: true };
  return { url: joinUrl(k.baseUrl, '/chat/completions'), body };
}

function parseStreamChunk(raw: string, protocol: Protocol): { text: string; usage?: any } {
  const j = safeJson(raw);
  if (!j) return { text: '' };
  if (protocol === 'anthropic') {
    if (j.type === 'content_block_delta') return { text: j.delta?.text ?? j.delta?.partial_json ?? '' };
    if (j.type === 'message_delta') return { text: '', usage: j.usage };
    return { text: '' };
  }
  if (protocol === 'gemini') {
    const parts = j.candidates?.[0]?.content?.parts ?? [];
    return { text: parts.map((p: any) => p.text ?? '').join(''), usage: j.usageMetadata };
  }
  const d = j.choices?.[0]?.delta ?? {};
  const text = d.content ?? j.choices?.[0]?.text ?? '';
  return { text: typeof text === 'string' ? text : '', usage: j.usage };
}

function parseFullResponse(data: any, protocol: Protocol): string {
  if (!data) return '';
  if (protocol === 'anthropic') {
    return (data.content ?? []).map((c: any) => c.text ?? '').join('');
  }
  if (protocol === 'gemini') {
    return (data.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('');
  }
  const c = data.choices?.[0];
  return c?.message?.content ?? c?.text ?? '';
}

/* ------------------------------------------------------------------ */
/* Основной вызов чата                                                 */
/* ------------------------------------------------------------------ */

export interface SendParams {
  key: ApiKey;
  model: string;
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream: boolean;
  signal: AbortSignal;
  onDelta: (chunk: string) => void;
}

export async function sendChat(p: SendParams): Promise<{ text: string; usage?: any }> {
  const opts: ChatOptions = {
    temperature: p.temperature,
    maxTokens: p.maxTokens,
    stream: p.stream,
    systemPrompt: p.systemPrompt,
  };
  const { url, body } = buildChatRequest(p.key, p.model, p.messages, opts);
  const headers = authHeaders(p.key);

  if (p.stream) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { ...headers, Accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal: p.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new HttpError(res.status, extractError(safeJson(text), text));
      }
      if (!res.body) throw new Error('Пустой поток');
      let full = '';
      let usage: any;
      for await (const raw of sseLines(res.body, p.signal)) {
        if (raw === '[DONE]') break;
        const { text, usage: u } = parseStreamChunk(raw, p.key.protocol);
        if (u) usage = u;
        if (text) {
          full += text;
          p.onDelta(text);
        }
      }
      if (full || usage) return { text: full, usage };
      // пустой поток — возможно сервер не умеет SSE, добираем обычным запросом
    } catch (e: any) {
      if (p.signal.aborted) throw e;
      if (e instanceof HttpError) throw e;
      // CORS / нет стриминга в WebView — тихо переходим на нативный запрос
      if (!isNative()) throw e;
    }
  }

  // не-стриминговый путь (работает через нативный HTTP, без CORS)
  const { url: url2, body: body2 } = buildChatRequest(p.key, p.model, p.messages, { ...opts, stream: false });
  const res = await request(url2, { method: 'POST', headers, body: body2, timeoutMs: 180000 });
  if (!res.ok) throw new HttpError(res.status, extractError(res.data, res.text));
  const text = parseFullResponse(res.data, p.key.protocol);
  if (text) p.onDelta(text);
  return { text, usage: res.data?.usage ?? res.data?.usageMetadata };
}
