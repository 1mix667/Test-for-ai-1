import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { Field, Sheet, Switch } from '../components/ui';
import type { ApiKey } from '../lib/types';

export default function SettingsScreen() {
  const { settings, saveSettings, setPin, keys, chats, clearChats, importKeys } = useStore();
  const [pinOpen, setPinOpen] = useState(false);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [err, setErr] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  const exportJson = JSON.stringify({ version: 1, keys, chats }, null, 2);

  return (
    <div className="pad">
      <div className="card">
        <b>Безопасность</b>
        <div className="tiny" style={{ margin: '6px 0 10px' }}>
          Ключи лежат в приватном хранилище приложения на телефоне — ни на какой сервер они не уходят. С PIN-кодом они
          дополнительно шифруются (AES-256-GCM, ключ из PIN через PBKDF2).
        </div>
        {settings.encrypted ? (
          <button className="btn full danger" onClick={() => setPin(null)}>
            Отключить PIN и шифрование
          </button>
        ) : (
          <button className="btn full" onClick={() => setPinOpen(true)}>
            🔒 Включить PIN-код
          </button>
        )}
      </div>

      <div className="card">
        <b>Чат</b>
        <Switch
          label="Стриминг ответа"
          hint="Текст появляется по мере генерации. Если провайдер не поддерживает — приложение само переключится."
          checked={settings.streaming}
          onChange={(v) => saveSettings({ streaming: v })}
        />
        <Switch
          label="Enter отправляет сообщение"
          hint="Иначе Enter — перенос строки, отправка кнопкой"
          checked={settings.sendOnEnter}
          onChange={(v) => saveSettings({ sendOnEnter: v })}
        />
        <Switch
          label="Автоматические названия чатов"
          checked={settings.autoTitle}
          onChange={(v) => saveSettings({ autoTitle: v })}
        />
        <Field label="Системный промпт по умолчанию">
          <textarea
            value={settings.defaultSystemPrompt}
            placeholder="Пусто"
            onChange={(e) => saveSettings({ defaultSystemPrompt: e.target.value })}
          />
        </Field>
        <div className="row" style={{ gap: 10 }}>
          <Field label="Температура">
            <input
              type="number"
              step="0.1"
              value={settings.defaultTemperature}
              onChange={(e) => saveSettings({ defaultTemperature: Number(e.target.value) })}
            />
          </Field>
          <Field label="Макс. токенов">
            <input
              type="number"
              step="256"
              value={settings.defaultMaxTokens}
              onChange={(e) => saveSettings({ defaultMaxTokens: Number(e.target.value) })}
            />
          </Field>
        </div>
      </div>

      <div className="card">
        <b>Данные</b>
        <div className="tiny" style={{ margin: '6px 0 10px' }}>
          {keys.length} ключей · {chats.length} чатов
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn grow" onClick={() => setExportOpen(true)}>
            ⬆ Экспорт
          </button>
          <button className="btn grow" onClick={() => setImportOpen(true)}>
            ⬇ Импорт ключей
          </button>
        </div>
        <button className="btn danger full" style={{ marginTop: 10 }} onClick={() => clearChats()}>
          Удалить все чаты
        </button>
      </div>

      <div className="card">
        <b>AnyKey Chat</b>
        <div className="tiny" style={{ marginTop: 6 }}>
          Универсальный клиент для любых AI-API: OpenAI, Anthropic, Gemini, OpenRouter, Groq, DeepSeek, локальные
          серверы и любые совместимые прокси. Всё работает напрямую с телефона.
        </div>
      </div>

      {pinOpen && (
        <Sheet title="Новый PIN-код" onClose={() => setPinOpen(false)}>
          <p className="muted" style={{ marginTop: 0 }}>
            Запомни его: без PIN расшифровать ключи будет невозможно.
          </p>
          <Field label="PIN (минимум 4 символа)">
            <input type="password" value={pin1} onChange={(e) => setPin1(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Повтори PIN">
            <input type="password" value={pin2} onChange={(e) => setPin2(e.target.value)} inputMode="numeric" />
          </Field>
          {err && <div className="tiny" style={{ color: 'var(--err)', marginBottom: 10 }}>{err}</div>}
          <button
            className="btn primary full"
            onClick={async () => {
              if (pin1.length < 4) return setErr('Слишком короткий PIN');
              if (pin1 !== pin2) return setErr('PIN-коды не совпадают');
              await setPin(pin1);
              setPin1('');
              setPin2('');
              setErr('');
              setPinOpen(false);
            }}
          >
            Включить
          </button>
        </Sheet>
      )}

      {exportOpen && (
        <Sheet title="Экспорт данных" onClose={() => setExportOpen(false)}>
          <p className="muted" style={{ marginTop: 0 }}>
            Внутри — твои ключи в открытом виде. Храни файл в надёжном месте.
          </p>
          <textarea readOnly value={exportJson} style={{ minHeight: 200, fontSize: 12 }} />
          <button
            className="btn primary full"
            style={{ marginTop: 10 }}
            onClick={() => navigator.clipboard?.writeText(exportJson)}
          >
            Скопировать в буфер
          </button>
        </Sheet>
      )}

      {importOpen && (
        <Sheet title="Импорт ключей" onClose={() => setImportOpen(false)}>
          <p className="muted" style={{ marginTop: 0 }}>
            Вставь JSON, полученный из экспорта, либо просто список ключей — по одному в строке (они добавятся как
            OpenAI-совместимые, провайдера можно поправить потом).
          </p>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} style={{ minHeight: 160 }} />
          <button
            className="btn primary full"
            style={{ marginTop: 10 }}
            onClick={async () => {
              const list = parseImport(importText);
              if (!list.length) return alert('Не нашёл ключей в этом тексте');
              await importKeys(list);
              setImportText('');
              setImportOpen(false);
            }}
          >
            Импортировать
          </button>
        </Sheet>
      )}
    </div>
  );
}

function parseImport(text: string): ApiKey[] {
  const t = text.trim();
  if (!t) return [];
  try {
    const j = JSON.parse(t);
    const arr: any[] = Array.isArray(j) ? j : (j.keys ?? []);
    return arr
      .filter((k) => k && (k.key || k.baseUrl))
      .map((k) => ({
        ...k,
        protocol: k.protocol ?? 'openai',
        providerId: k.providerId ?? 'custom-openai',
        name: k.name ?? 'Импортированный',
        baseUrl: k.baseUrl ?? 'https://api.openai.com/v1',
      })) as ApiKey[];
  } catch {
    return t
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map(
        (key, i) =>
          ({
            name: `Импорт ${i + 1}`,
            providerId: 'custom-openai',
            protocol: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            key,
          }) as ApiKey,
      );
  }
}
