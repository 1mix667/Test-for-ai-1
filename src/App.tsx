import React, { useEffect, useState } from 'react';
import { useStore } from './lib/store';
import KeysScreen from './screens/KeysScreen';
import SettingsScreen from './screens/SettingsScreen';
import ChatScreen from './screens/ChatScreen';
import { Field } from './components/ui';

type Tab = 'chats' | 'keys' | 'settings';

export default function App() {
  const { ready, locked, init, chats, activeChatId, openChat, newChat, deleteChat, keys } = useStore();
  const [tab, setTab] = useState<Tab>('chats');

  useEffect(() => {
    void init();
  }, []);

  if (!ready) return <div className="empty" style={{ paddingTop: 120 }}>Загрузка…</div>;
  if (locked) return <LockScreen />;

  const chat = chats.find((c) => c.id === activeChatId);
  if (chat) return <ChatScreen chat={chat} onBack={() => openChat(null)} />;

  return (
    <div className="app">
      <div className="header">
        <h1>
          {tab === 'chats' ? 'Чаты' : tab === 'keys' ? 'Ключи' : 'Настройки'}
          <span className="sub">
            {tab === 'chats'
              ? `${chats.length} диалогов · ${keys.filter((k) => k.status === 'valid').length} рабочих ключей`
              : 'AnyKey Chat'}
          </span>
        </h1>
      </div>

      <div className="content" style={{ position: 'relative' }}>
        {tab === 'chats' && (
          <div className="pad">
            {!chats.length && (
              <div className="empty">
                <div className="big">💬</div>
                Пока нет чатов.
                <br />
                {keys.length ? 'Нажми «+», чтобы начать.' : 'Сначала добавь API-ключ во вкладке «Ключи».'}
              </div>
            )}
            {chats.map((c) => {
              const k = keys.find((x) => x.id === c.keyId);
              const last = c.messages[c.messages.length - 1];
              return (
                <div key={c.id} className="card tap" onClick={() => openChat(c.id)}>
                  <div className="row between">
                    <div className="col grow">
                      <b className="ellipsis">{c.title}</b>
                      <div className="tiny ellipsis">
                        {last ? `${last.role === 'user' ? 'Ты: ' : ''}${(last.content || last.error || '').slice(0, 60)}` : 'пусто'}
                      </div>
                      <div className="tiny ellipsis">{k?.name ?? 'без ключа'} · {c.model ?? '—'}</div>
                    </div>
                    <button
                      className="iconbtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteChat(c.id);
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab === 'keys' && <KeysScreen />}
        {tab === 'settings' && <SettingsScreen />}

        {tab === 'chats' && (
          <button className="fab" onClick={() => newChat()}>
            +
          </button>
        )}
      </div>

      <div className="tabbar">
        <button className={tab === 'chats' ? 'active' : ''} onClick={() => setTab('chats')}>
          <span className="ic">💬</span>Чаты
        </button>
        <button className={tab === 'keys' ? 'active' : ''} onClick={() => setTab('keys')}>
          <span className="ic">🔑</span>Ключи
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          <span className="ic">⚙️</span>Настройки
        </button>
      </div>
    </div>
  );
}

function LockScreen() {
  const { unlock } = useStore();
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    const ok = await unlock(pin);
    setBusy(false);
    if (!ok) {
      setErr(true);
      setPin('');
    }
  };

  return (
    <div className="lock">
      <div style={{ fontSize: 48 }}>🔒</div>
      <b>Введи PIN-код</b>
      <Field label="">
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          autoFocus
          onChange={(e) => {
            setPin(e.target.value);
            setErr(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && go()}
        />
      </Field>
      {err && <div className="tiny" style={{ color: 'var(--err)' }}>Неверный PIN</div>}
      <button className="btn primary" disabled={!pin || busy} onClick={go}>
        Разблокировать
      </button>
    </div>
  );
}
