import { PROVIDERS, type ProviderPreset } from './providers';
import { checkKey } from './api';
import type { ApiKey } from './types';

/** Порядок кандидатов по префиксу ключа */
export function guessProviders(key: string): ProviderPreset[] {
  const k = key.trim();
  const byId = (id: string) => PROVIDERS.find((p) => p.id === id)!;
  const order: string[] = [];
  if (/^sk-ant-/.test(k)) order.push('anthropic');
  else if (/^sk-or-v1-/.test(k)) order.push('openrouter');
  else if (/^gsk_/.test(k)) order.push('groq');
  else if (/^xai-/.test(k)) order.push('xai');
  else if (/^AIza/.test(k)) order.push('google');
  else if (/^csk-/.test(k)) order.push('cerebras');
  else if (/^r8_/.test(k)) order.push('together');
  else if (/^sk-proj-|^sk-svcacct-/.test(k)) order.push('openai');
  else if (/^sk-/.test(k)) order.push('openai', 'deepseek', 'mistral', 'openrouter');

  const rest = ['openai', 'anthropic', 'google', 'openrouter', 'groq', 'deepseek', 'mistral', 'xai', 'together', 'fireworks', 'perplexity', 'cerebras'];
  for (const id of rest) if (!order.includes(id)) order.push(id);
  return order.map(byId).filter(Boolean);
}

export interface DetectHit {
  provider: ProviderPreset;
  message: string;
  models: string[];
  latencyMs: number;
}

/**
 * Пробует ключ у нескольких провайдеров сразу и возвращает те,
 * где он реально работает. Для «пиратских» ключей всё равно можно
 * указать свой baseUrl вручную.
 */
export async function detectKey(
  rawKey: string,
  onProgress?: (done: number, total: number, current: string) => void,
  limit = 12,
): Promise<DetectHit[]> {
  const candidates = guessProviders(rawKey).slice(0, limit);
  const hits: DetectHit[] = [];
  let done = 0;

  const run = async (p: ProviderPreset) => {
    onProgress?.(done, candidates.length, p.name);
    const probe: ApiKey = {
      id: 'probe',
      name: p.name,
      providerId: p.id,
      protocol: p.protocol,
      baseUrl: p.baseUrl,
      key: rawKey.trim(),
      status: 'unknown',
      createdAt: Date.now(),
    };
    try {
      const res = await checkKey(probe);
      if (res.status === 'valid') {
        hits.push({ provider: p, message: res.message, models: res.models ?? [], latencyMs: res.latencyMs });
      }
    } catch {
      /* игнорируем */
    } finally {
      done++;
      onProgress?.(done, candidates.length, p.name);
    }
  };

  // по 4 параллельно
  const queue = [...candidates];
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) await run(queue.shift()!);
  });
  await Promise.all(workers);
  return hits.sort((a, b) => b.models.length - a.models.length);
}
