import React, { useMemo, useState } from 'react';
import { PROVIDERS, getProvider } from '../lib/providers';
import type { ApiKey, Protocol } from '../lib/types';
import { useStore } from '../lib/store';
import { Field, Sheet } from '../components/ui';

export default function KeyEditor({ editing, onClose }: { editing: ApiKey | null; onClose: () => void }) {
  const { addKey, updateKey, verifyKey, deleteKey } = useStore();
  const [providerId, setProviderId] = useState(editing?.providerId ?? 'openai');
  const preset = useMemo(() => getProvider(providerId), [providerId]);
  const [name, setName] = useState(editing?.name ?? '');
  const [baseUrl, setBaseUrl] = useState(editing?.baseUrl ?? getProvider('openai')!.baseUrl);
  const [protocol, setProtocol] = useState<Protocol>(editing?.protocol ?? 'openai');
  const [key, setKey] = useState(editing?.key ?? '');
  const [model, setModel] = useState(editing?.defaultModel ?? '');
  const [headers, setHeaders] = useState(
    Object.entries(editing?.extraHeaders ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n'),
  );
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);

  const onProvider = (id: string) => {
    setProviderId(id);
    const p = getProvider(id);
    if (p) {
      setProtocol(p.protocol);
      if (!editing) setBaseUrl(p.baseUrl);
      if (!name || PROVIDERS.some((x) => x.name === name)) setName(p.name);
    }
  };

  const parseHeaders = () => {
    const out: Record<string, string> = {};
    headers
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((l) => {
        const i = l.indexOf(':');
        if (i > 0) out[l.slice(0, i).trim()] = l.slice(i + 1).trim();
      });
    return out;
  };

  const save = async (thenCheck: boolean) => {
    setBusy(true);
    const data = {
      name: name.trim() || preset?.name || 'Без имени',
      providerId,
      protocol,
      baseUrl: baseUrl.trim(),
      key: key.trim(),
      defaultModel: model.trim() || undefined,
      extraHeaders: parseHeaders(),
    };
    let id = editing?.id;
    if (editing) await updateKey(editing.id, { ...data, status: 'unknown', statusMessage: undefined });
    else id = (await addKey({ ...data } as any)).id;
    setBusy(false);
    onClose();
    if (thenCheck && id) void verifyKey(id);
  };

  return (
    <Sheet title={editing ? 'Ключ' : 'Новый ключ'} onClose={onClose}>
      <Field label="Провайдер">
        <select value={providerId} onChange={(e) => onProvider(e.target.value)}>
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      {preset?.note && <div className="tiny" style={{ marginTop: -8, marginBottom: 14 }}>{preset.note}</div>}

      <Field label="Название (как будет видно в списке)">
        <input type="text" value={name} placeholder={preset?.name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <Field
        label="API-ключ"
        hint={preset?.keyOptional ? 'Для локальных серверов можно оставить пустым' : preset?.keyHint}
      >
        <div className="row">
          <input
            className="grow"
            type={showKey ? 'text' : 'password'}
            value={key}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={preset?.keyHint ?? 'вставь ключ'}
            onChange={(e) => setKey(e.target.value)}
          />
          <button className="btn sm" onClick={() => setShowKey((v) => !v)}>
            {showKey ? '🙈' : '👁'}
          </button>
        </div>
      </Field>

      <Field label="Базовый URL" hint="Например https://api.openai.com/v1 — путь /chat/completions добавится сам">
        <input
          type="text"
          value={baseUrl}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://..."
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      </Field>

      <Field label="Формат API" hint="Большинство прокси и «пиратских» ключей — OpenAI-совместимые">
        <select value={protocol} onChange={(e) => setProtocol(e.target.value as Protocol)}>
          <option value="openai">OpenAI (/chat/completions)</option>
          <option value="anthropic">Anthropic (/messages)</option>
          <option value="gemini">Google Gemini (:generateContent)</option>
        </select>
      </Field>

      <Field label="Модель по умолчанию" hint="Можно оставить пустым — подтянется из списка моделей">
        <input
          type="text"
          value={model}
          autoCapitalize="off"
          spellCheck={false}
          placeholder={preset?.probeModel ?? 'gpt-4o-mini'}
          onChange={(e) => setModel(e.target.value)}
        />
      </Field>

      <Field label="Доп. заголовки (по одному в строке)" hint="Формат: Header-Name: значение">
        <textarea
          value={headers}
          spellCheck={false}
          placeholder={'X-Custom-Auth: 12345'}
          onChange={(e) => setHeaders(e.target.value)}
        />
      </Field>

      <div className="row" style={{ gap: 10 }}>
        <button className="btn grow" disabled={busy} onClick={() => save(false)}>
          Сохранить
        </button>
        <button className="btn primary grow" disabled={busy} onClick={() => save(true)}>
          Сохранить и проверить
        </button>
      </div>

      {editing && (
        <button
          className="btn danger full"
          style={{ marginTop: 10 }}
          onClick={async () => {
            await deleteKey(editing.id);
            onClose();
          }}
        >
          Удалить ключ
        </button>
      )}
    </Sheet>
  );
}
