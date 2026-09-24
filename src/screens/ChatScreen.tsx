import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore, uid } from '../lib/store';
import type { Attachment, Chat, Message } from '../lib/types';
import { Field, Sheet } from '../components/ui';

export default function ChatScreen({ chat, onBack }: { chat: Chat; onBack: () => void }) {
  const { send, stop, regenerate, deleteMessage, streamingChatId, keys, settings } = useStore();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streaming = streamingChatId === chat.id;
  const key = keys.find((k) => k.id === chat.keyId);
  const atBottom = useRef(true);

  useEffect(() => {
    const el = scroller.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [chat.messages, streaming]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const doSend = async () => {
    const t = text.trim();
    if ((!t && !attachments.length) || streaming) return;
    setText('');
    setAttachments([]);
    atBottom.current = true;
    await send(chat.id, t, attachments);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const out: Attachment[] = [];
    for (const f of Array.from(files)) {
      if (f.type.startsWith('image/')) {
        out.push({ id: uid(), kind: 'image', name: f.name, mimeType: f.type, data: await toBase64(f) });
      } else {
        out.push({ id: uid(), kind: 'text', name: f.name, mimeType: f.type || 'text/plain', data: await f.text() });
      }
    }
    setAttachments((a) => [...a, ...out]);
  };

  return (
    <div className="app">
      <div className="header">
        <button className="iconbtn" onClick={onBack}>
          ‹
        </button>
        <h1>
          {chat.title}
          <span className="sub">
            {key ? `${key.name} · ${chat.model ?? 'модель не выбрана'}` : 'ключ не выбран'}
          </span>
        </h1>
        <button className="iconbtn" onClick={() => setShowSettings(true)}>
          ⚙
        </button>
      </div>

      <div className="content" ref={scroller} onScroll={onScroll}>
        {!chat.messages.length && (
          <div className="empty">
            <div className="big">✨</div>
            Спроси что угодно. Можно приложить фото или текстовый файл.
          </div>
        )}
        <div className="messages">
          {chat.messages.map((m) => (
            <MessageView key={m.id} m={m} onDelete={() => deleteMessage(chat.id, m.id)} />
          ))}
        </div>
        {!streaming && chat.messages.some((m) => m.role === 'assistant') && (
          <div className="row" style={{ justifyContent: 'center', padding: '4px 0 14px' }}>
            <button className="btn sm" onClick={() => regenerate(chat.id)}>
              ⟳ Перегенерировать
            </button>
          </div>
        )}
      </div>

      <div className="composer">
        {!!attachments.length && (
          <div className="thumbs" style={{ marginBottom: 8 }}>
            {attachments.map((a) => (
              <div key={a.id} onClick={() => setAttachments((x) => x.filter((y) => y.id !== a.id))}>
                {a.kind === 'image' ? (
                  <img src={`data:${a.mimeType};base64,${a.data}`} alt={a.name} />
                ) : (
                  <span className="chip">📄 {a.name} ✕</span>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="inputrow">
          <button className="iconbtn" onClick={() => fileRef.current?.click()}>
            📎
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,text/*,.md,.json,.csv,.log,.py,.js,.ts"
            style={{ display: 'none' }}
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <textarea
            value={text}
            placeholder="Сообщение…"
            rows={1}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && settings.sendOnEnter) {
                e.preventDefault();
                void doSend();
              }
            }}
          />
          {streaming ? (
            <button className="sendbtn stop" onClick={stop}>
              ■
            </button>
          ) : (
            <button className="sendbtn" disabled={!text.trim() && !attachments.length} onClick={doSend}>
              ↑
            </button>
          )}
        </div>
      </div>

      {showSettings && <ChatSettings chat={chat} onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function MessageView({ m, onDelete }: { m: Message; onDelete: () => void }) {
  const [copied, setCopied] = useState(false);
  const imgs = (m.attachments ?? []).filter((a) => a.kind === 'image');
  const files = (m.attachments ?? []).filter((a) => a.kind === 'text');

  return (
    <div className={`msg ${m.role}`}>
      {!!imgs.length && (
        <div className="thumbs">
          {imgs.map((a) => (
            <img key={a.id} src={`data:${a.mimeType};base64,${a.data}`} alt={a.name} />
          ))}
        </div>
      )}
      {!!files.length && (
        <div className="thumbs">
          {files.map((a) => (
            <span key={a.id} className="chip">
              📄 {a.name}
            </span>
          ))}
        </div>
      )}
      {(m.content || m.pending) && (
        <div className="bubble">
          {m.role === 'assistant' ? (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              {m.pending && <span className="dots" />}
            </>
          ) : (
            <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
          )}
        </div>
      )}
      {m.error && <div className="bubble error">{m.error}</div>}
      {m.role === 'assistant' && !m.pending && (m.content || m.error) && (
        <div className="msgmeta">
          {m.model && <span>{m.model}</span>}
          {m.usage?.completionTokens ? <span>{m.usage.completionTokens} ток.</span> : null}
          <button
            onClick={async () => {
              await navigator.clipboard?.writeText(m.content).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? '✓ скопировано' : 'копировать'}
          </button>
          <button onClick={onDelete}>удалить</button>
        </div>
      )}
    </div>
  );
}

function ChatSettings({ chat, onClose }: { chat: Chat; onClose: () => void }) {
  const { keys, updateChat, refreshModels, deleteChat } = useStore();
  const key = keys.find((k) => k.id === chat.keyId);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const models = useMemo(() => key?.models ?? [], [key]);

  return (
    <Sheet title="Настройки чата" onClose={onClose}>
      <Field label="Название">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => updateChat(chat.id, { title })} />
      </Field>

      <Field label="Ключ / провайдер">
        <select
          value={chat.keyId ?? ''}
          onChange={(e) => {
            const k = keys.find((x) => x.id === e.target.value);
            updateChat(chat.id, { keyId: e.target.value || undefined, model: k?.defaultModel });
          }}
        >
          <option value="">— выбери ключ —</option>
          {keys.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name} {k.status === 'valid' ? '✓' : k.status === 'invalid' ? '✕' : ''}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Модель">
        <div className="row">
          {models.length ? (
            <select className="grow" value={chat.model ?? ''} onChange={(e) => updateChat(chat.id, { model: e.target.value })}>
              <option value="">— выбери модель —</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="grow"
              type="text"
              spellCheck={false}
              value={chat.model ?? ''}
              placeholder="например gpt-4o-mini"
              onChange={(e) => updateChat(chat.id, { model: e.target.value })}
            />
          )}
          <button
            className="btn sm"
            disabled={!key || loading}
            onClick={async () => {
              if (!key) return;
              setLoading(true);
              try {
                await refreshModels(key.id);
              } catch (e: any) {
                alert('Не получилось получить список моделей: ' + (e?.message ?? e));
              }
              setLoading(false);
            }}
          >
            {loading ? '…' : '⟳'}
          </button>
        </div>
      </Field>

      <Field label="Системный промпт" hint="Инструкция, которая идёт перед всем диалогом">
        <textarea
          value={chat.systemPrompt ?? ''}
          placeholder="Ты полезный ассистент. Отвечай кратко."
          onChange={(e) => updateChat(chat.id, { systemPrompt: e.target.value })}
        />
      </Field>

      <div className="row" style={{ gap: 10 }}>
        <Field label="Температура">
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={chat.temperature ?? 0.7}
            onChange={(e) => updateChat(chat.id, { temperature: Number(e.target.value) })}
          />
        </Field>
        <Field label="Макс. токенов">
          <input
            type="number"
            step="256"
            min="64"
            value={chat.maxTokens ?? 4096}
            onChange={(e) => updateChat(chat.id, { maxTokens: Number(e.target.value) })}
          />
        </Field>
      </div>

      <button
        className="btn danger full"
        onClick={() => {
          void deleteChat(chat.id);
          onClose();
        }}
      >
        Удалить чат
      </button>
    </Sheet>
  );
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
