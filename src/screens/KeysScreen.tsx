import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { providerLabel } from '../lib/providers';
import { detectKey, type DetectHit } from '../lib/detect';
import type { ApiKey } from '../lib/types';
import { Field, Sheet, StatusBadge } from '../components/ui';
import KeyEditor from './KeyEditor';

function mask(k: string) {
  if (!k) return 'без ключа';
  if (k.length <= 12) return k.slice(0, 3) + '•••';
  return `${k.slice(0, 6)}•••${k.slice(-4)}`;
}

function ago(ts?: number) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'только что';
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч назад`;
  return `${Math.floor(s / 86400)} дн назад`;
}

export default function KeysScreen() {
  const { keys, verifyKey, verifyAll, updateKey } = useStore();
  const [editing, setEditing] = useState<ApiKey | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [detailsOf, setDetailsOf] = useState<ApiKey | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);

  const current = detailsOf ? (keys.find((k) => k.id === detailsOf.id) ?? null) : null;

  return (
    <>
      <div className="pad">
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="col">
            <b>Хранилище ключей</b>
            <span className="tiny">{keys.length} шт · хранятся только на этом телефоне</span>
          </div>
          <button
            className="btn sm"
            disabled={!keys.length || checkingAll}
            onClick={async () => {
              setCheckingAll(true);
              await verifyAll();
              setCheckingAll(false);
            }}
          >
            {checkingAll ? '⟳ проверяю' : '⟳ Проверить все'}
          </button>
        </div>

        <div className="row" style={{ gap: 10, marginBottom: 14 }}>
          <button className="btn primary grow" onClick={() => { setEditing(null); setShowEditor(true); }}>
            + Добавить ключ
          </button>
          <button className="btn grow" onClick={() => setAutoOpen(true)}>
            🔎 Определить по ключу
          </button>
        </div>

        {!keys.length && (
          <div className="empty">
            <div className="big">🔑</div>
            Ключей пока нет.
            <br />
            Добавь любой — от OpenAI, Claude, Gemini, OpenRouter, локального сервера или частного прокси.
          </div>
        )}

        {keys.map((k) => (
          <div key={k.id} className="card tap" onClick={() => setDetailsOf(k)}>
            <div className="row between">
              <div className="col grow">
                <div className="row" style={{ gap: 8 }}>
                  <b className="ellipsis">{k.name}</b>
                </div>
                <div className="tiny ellipsis">
                  {providerLabel(k.providerId)} · {mask(k.key)}
                </div>
                <div className="tiny ellipsis">{k.defaultModel ?? 'модель не выбрана'}</div>
              </div>
              <div className="col" style={{ alignItems: 'flex-end', gap: 6 }}>
                <StatusBadge status={k.status} />
                {!!k.latencyMs && k.status !== 'checking' && <span className="tiny">{k.latencyMs} мс · {ago(k.checkedAt)}</span>}
              </div>
            </div>
            {k.statusMessage && k.status !== 'valid' && (
              <div className="tiny" style={{ marginTop: 8 }}>{k.statusMessage}</div>
            )}
          </div>
        ))}
      </div>

      {showEditor && <KeyEditor editing={editing} onClose={() => setShowEditor(false)} />}

      {current && (
        <Sheet title={current.name} onClose={() => setDetailsOf(null)}>
          <div className="row between" style={{ marginBottom: 12 }}>
            <StatusBadge status={current.status} />
            <span className="tiny">{current.checkedAt ? `проверен ${ago(current.checkedAt)}` : 'ещё не проверялся'}</span>
          </div>
          {current.statusMessage && <div className="muted" style={{ marginBottom: 12 }}>{current.statusMessage}</div>}

          <div className="card" style={{ marginBottom: 12 }}>
            <div className="tiny">Провайдер</div>
            <div>{providerLabel(current.providerId)} · {current.protocol}</div>
            <div className="hr" />
            <div className="tiny">Базовый URL</div>
            <div className="ellipsis">{current.baseUrl}</div>
            <div className="hr" />
            <div className="tiny">Ключ</div>
            <div>{mask(current.key)}</div>
          </div>

          {!!current.models?.length && (
            <Field label={`Модель по умолчанию (${current.models.length} доступно)`}>
              <select
                value={current.defaultModel ?? ''}
                onChange={(e) => updateKey(current.id, { defaultModel: e.target.value })}
              >
                <option value="">— не выбрана —</option>
                {current.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="row" style={{ gap: 10 }}>
            <button className="btn grow" onClick={() => verifyKey(current.id)}>
              ⟳ Проверить
            </button>
            <button
              className="btn primary grow"
              onClick={() => {
                setEditing(current);
                setDetailsOf(null);
                setShowEditor(true);
              }}
            >
              ✎ Изменить
            </button>
          </div>
        </Sheet>
      )}

      {autoOpen && <AutoDetect onClose={() => setAutoOpen(false)} />}
    </>
  );
}

function AutoDetect({ onClose }: { onClose: () => void }) {
  const { addKey } = useStore();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [hits, setHits] = useState<DetectHit[] | null>(null);

  const run = async () => {
    setBusy(true);
    setHits(null);
    const res = await detectKey(value, (done, total, cur) => setProgress(`${done}/${total} · ${cur}`));
    setHits(res);
    setBusy(false);
  };

  return (
    <Sheet title="Определить провайдера по ключу" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Вставь ключ — приложение само переберёт известных провайдеров и покажет, где он реально работает. Для приватных
        прокси всё равно нужен свой базовый URL (добавь вручную).
      </p>
      <Field label="Ключ">
        <textarea
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          placeholder="sk-..."
          onChange={(e) => setValue(e.target.value)}
        />
      </Field>
      <button className="btn primary full" disabled={!value.trim() || busy} onClick={run}>
        {busy ? `Проверяю… ${progress}` : 'Проверить у всех провайдеров'}
      </button>

      {hits && !hits.length && (
        <div className="card" style={{ marginTop: 14 }}>
          Ни у одного известного провайдера ключ не подошёл. Если это ключ от прокси/зеркала — добавь его вручную и
          укажи базовый URL.
        </div>
      )}

      {hits?.map((h) => (
        <div key={h.provider.id} className="card" style={{ marginTop: 12 }}>
          <div className="row between">
            <b>{h.provider.name}</b>
            <span className="badge ok">✓ {h.latencyMs} мс</span>
          </div>
          <div className="tiny" style={{ margin: '6px 0 10px' }}>{h.message}</div>
          <button
            className="btn primary full"
            onClick={async () => {
              await addKey({
                name: h.provider.name,
                providerId: h.provider.id,
                protocol: h.provider.protocol,
                baseUrl: h.provider.baseUrl,
                key: value.trim(),
                models: h.models,
                defaultModel: h.models[0],
              } as any);
              onClose();
            }}
          >
            Добавить этот ключ
          </button>
        </div>
      ))}
    </Sheet>
  );
}
