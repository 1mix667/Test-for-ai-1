import { Capacitor, CapacitorHttp } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();

export interface SimpleResponse {
  status: number;
  ok: boolean;
  data: any;
  text: string;
  via: 'fetch' | 'native';
}

/**
 * Обычный не-стриминговый запрос.
 * На телефоне сначала пробуем нативный HTTP (обходит CORS, который есть
 * в WebView и ломает многие «пиратские» прокси), в вебе — обычный fetch.
 */
export async function request(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: any; timeoutMs?: number } = {},
): Promise<SimpleResponse> {
  const method = init.method ?? 'GET';
  const headers = init.headers ?? {};
  const timeoutMs = init.timeoutMs ?? 30000;

  if (isNative()) {
    try {
      const res = await CapacitorHttp.request({
        url,
        method,
        headers,
        data: init.body,
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
        responseType: 'text',
      });
      const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      return {
        status: res.status,
        ok: res.status >= 200 && res.status < 300,
        data: safeJson(text),
        text,
        via: 'native',
      };
    } catch (e: any) {
      // падаем в обычный fetch
      if (!navigator.onLine) throw new Error('Нет интернета');
    }
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: init.body === undefined ? undefined : typeof init.body === 'string' ? init.body : JSON.stringify(init.body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    return { status: res.status, ok: res.ok, data: safeJson(text), text, via: 'fetch' };
  } finally {
    clearTimeout(timer);
  }
}

export function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Разбор SSE-потока из ReadableStream в строки данных */
export async function* sseLines(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).replace(/\r$/, '');
        buffer = buffer.slice(idx + 1);
        if (line.startsWith('data:')) yield line.slice(5).trim();
      }
    }
    if (buffer.startsWith('data:')) yield buffer.slice(5).trim();
  } finally {
    try {
      reader.releaseLock();
    } catch {}
  }
}

export function joinUrl(base: string, path: string): string {
  const b = (base || '').replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return b + p;
}
