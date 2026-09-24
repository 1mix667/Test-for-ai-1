export type Protocol = 'openai' | 'anthropic' | 'gemini';

export type KeyStatus = 'unknown' | 'checking' | 'valid' | 'invalid' | 'error';

export interface ApiKey {
  id: string;
  /** Человекочитаемое имя, например "OpenAI личный" */
  name: string;
  /** id пресета провайдера или 'custom' */
  providerId: string;
  /** Формат API: openai / anthropic / gemini */
  protocol: Protocol;
  /** Базовый URL, например https://api.openai.com/v1 */
  baseUrl: string;
  /** Сам ключ (может быть пустым для локальных серверов) */
  key: string;
  /** Дополнительные заголовки: "Header: value" построчно */
  extraHeaders?: Record<string, string>;
  /** Модель по умолчанию */
  defaultModel?: string;
  /** Последняя проверка */
  status: KeyStatus;
  statusMessage?: string;
  checkedAt?: number;
  latencyMs?: number;
  models?: string[];
  createdAt: number;
}

export interface Attachment {
  id: string;
  kind: 'image' | 'text';
  name: string;
  mimeType: string;
  /** для image — base64 без префикса; для text — сам текст */
  data: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
  createdAt: number;
  /** метаданные ответа */
  model?: string;
  keyId?: string;
  error?: string;
  pending?: boolean;
  usage?: { promptTokens?: number; completionTokens?: number };
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  keyId?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  /** PIN включён -> ключи хранятся зашифрованными */
  encrypted: boolean;
  /** соль для PBKDF2 (base64) */
  salt?: string;
  /** проверочный блок для PIN (base64) */
  verifier?: string;
  streaming: boolean;
  sendOnEnter: boolean;
  defaultSystemPrompt: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  autoTitle: boolean;
  allowInsecureHttp: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  encrypted: false,
  streaming: true,
  sendOnEnter: false,
  defaultSystemPrompt: '',
  defaultTemperature: 0.7,
  defaultMaxTokens: 4096,
  autoTitle: true,
  allowInsecureHttp: true,
};
