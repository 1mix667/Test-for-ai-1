import type { Protocol } from './types';

export interface ProviderPreset {
  id: string;
  name: string;
  protocol: Protocol;
  baseUrl: string;
  /** подсказка, как выглядит ключ */
  keyHint?: string;
  /** модель для fallback-проверки, если /models недоступен */
  probeModel?: string;
  /** нужен ли ключ вообще */
  keyOptional?: boolean;
  note?: string;
}

export const PROVIDERS: ProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    keyHint: 'sk-...',
    probeModel: 'gpt-4o-mini',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    keyHint: 'sk-ant-...',
    probeModel: 'claude-3-5-haiku-latest',
  },
  {
    id: 'google',
    name: 'Google Gemini',
    protocol: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    keyHint: 'AIza...',
    probeModel: 'gemini-2.0-flash',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (сотни моделей)',
    protocol: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyHint: 'sk-or-v1-...',
  },
  {
    id: 'groq',
    name: 'Groq',
    protocol: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyHint: 'gsk_...',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    keyHint: 'sk-...',
    probeModel: 'deepseek-chat',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    protocol: 'openai',
    baseUrl: 'https://api.mistral.ai/v1',
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    protocol: 'openai',
    baseUrl: 'https://api.x.ai/v1',
    keyHint: 'xai-...',
  },
  {
    id: 'together',
    name: 'Together AI',
    protocol: 'openai',
    baseUrl: 'https://api.together.xyz/v1',
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    protocol: 'openai',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    protocol: 'openai',
    baseUrl: 'https://api.perplexity.ai',
    probeModel: 'sonar',
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    protocol: 'openai',
    baseUrl: 'https://api.cerebras.ai/v1',
  },
  {
    id: 'sambanova',
    name: 'SambaNova',
    protocol: 'openai',
    baseUrl: 'https://api.sambanova.ai/v1',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    protocol: 'openai',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
  },
  {
    id: 'novita',
    name: 'Novita AI',
    protocol: 'openai',
    baseUrl: 'https://api.novita.ai/v3/openai',
  },
  {
    id: 'hyperbolic',
    name: 'Hyperbolic',
    protocol: 'openai',
    baseUrl: 'https://api.hyperbolic.xyz/v1',
  },
  {
    id: 'azure-like',
    name: 'GitHub Models',
    protocol: 'openai',
    baseUrl: 'https://models.inference.ai.azure.com',
  },
  {
    id: 'ollama',
    name: 'Ollama (локально в сети)',
    protocol: 'openai',
    baseUrl: 'http://192.168.1.10:11434/v1',
    keyOptional: true,
    note: 'Укажи IP компьютера в локальной сети. Ключ не нужен.',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    protocol: 'openai',
    baseUrl: 'http://192.168.1.10:1234/v1',
    keyOptional: true,
  },
  {
    id: 'custom-openai',
    name: 'Любой OpenAI-совместимый (прокси, «пиратский»)',
    protocol: 'openai',
    baseUrl: '',
    note: 'Подходит для reverse-proxy, зеркал и приватных провайдеров. Главное — эндпоинт /chat/completions.',
  },
  {
    id: 'custom-anthropic',
    name: 'Любой Anthropic-совместимый',
    protocol: 'anthropic',
    baseUrl: '',
  },
  {
    id: 'custom-gemini',
    name: 'Любой Gemini-совместимый',
    protocol: 'gemini',
    baseUrl: '',
  },
];

export function getProvider(id: string): ProviderPreset | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function providerLabel(id: string): string {
  return getProvider(id)?.name ?? 'Свой провайдер';
}
