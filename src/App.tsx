import React, { useEffect, useState } from 'react';
import { useStore } from './lib/store';
import { applyTheme } from './lib/theme';
import KeysScreen from './screens/KeysScreen';
import SettingsScreen from './screens/SettingsScreen';
import ChatScreen from './screens/ChatScreen';
import Dock, { type Tab } from './components/Dock';
import { Field } from './components/ui';
import { IconChat, IconLock, IconPlus, IconTrash } from './components/icons';

export default function App() {
  const { ready, locked, init, chats, activeChatId, openChat, newChat, deleteChat, keys, settings } = useStore();
  const [tab, setTab] = useState<Tab>('chats');

  useEffect(() => {
    void init();
    let remove: (() => void) | undefined;
    void (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;
      const { App: CapApp } = await import('@capacitor/app');
      const handle = await CapApp.addListener('backButton', () => {
        // если открыт чат — возвращаемся к списку, иначе сворачиваем приложение
        if (useStore.getState().activeChatId) useStore.getState().openChat(null);
        else void CapApp.minimizeApp();
      });
      remove = () => void handle.remove();
    })();
    return () => remove?.();
  }, []);

  // тема: системный seed или выбранный пресет
  useEffect(() => {
    if (ready) void applyTheme(settings.themeSeed);
  }, [ready, settings.themeSeed]);

  if (!ready) return <div className="empty" style={{ paddingTop: 120 }}>Загрузка…</div>;
  if (locked) return <LockScreen />;

  const chat = chats.find((c) => c.id === activeChatId);
  if (chat) return <ChatScreen chat={chat} onBack={() => openChat(null)} />;

  return (
    <div className="app">
      <div className="topbar">
        <h1>
          {tab === 'chats' ? 'Чаты' : tab === 'keys' ? 'Ключи' : 'Настройки'}
          <span className="sub">
            {tab === 'chats'
              ? `${chats.length} диалогов · ${keys.filter((k) => k.status === 'valid').length} рабочих ключей`
              : 'AnyKey Chat'}
          </span>
        </h1>
      </div>

      <div className="content">
        {tab === 'chats' && (
          <div className="pad">
            {!chats.length && (
              <div className="empty">
                <div className="big"><IconChat size={44} /></div>
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
                      <b className="ellipsis ttl">{c.title}</b>
                      <div className="tiny ellipsis">
                        {last ? `${last.role === 'user' ? 'Ты: ' : ''}${(last.content || last.error || '').slice(0, 60)}` : 'пусто'}
                      </div>
                      <div className="tiny ellipsis">{k?.name ?? 'без ключа'} · {c.model ?? '—'}</div>
                    </div>
                    <button
                      className="iconbtn"
                      aria-label="Удалить чат"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteChat(c.id);
                      }}
                    >
                      <IconTrash size={20} />
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
          <button className="fab" aria-label="Новый чат" onClick={() => newChat()}>
            <IconPlus size={26} />
          </button>
        )}
      </div>

      <Dock tab={tab} onTab={setTab} />
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
      <div style={{ color: 'var(--m3-primary)' }}><IconLock size={52} /></div>
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
      {err && <div className="tiny" style={{ color: 'var(--m3-error)' }}>Неверный PIN</div>}
      <button className="btn primary" disabled={!pin || busy} onClick={go}>
        Разблокировать
      </button>
    </div>
  );
}
