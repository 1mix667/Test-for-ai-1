import React from 'react';

export function Sheet({
  title,
  onClose,
  children,
}: {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <div className="tiny" style={{ marginTop: 5 }}>{hint}</div>}
    </label>
  );
}

export function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="switch">
      <div className="col grow">
        <div>{label}</div>
        {hint && <div className="tiny">{hint}</div>}
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

export function StatusBadge({ status, children }: { status: string; children?: React.ReactNode }) {
  const map: Record<string, [string, string]> = {
    valid: ['ok', '✓ рабочий'],
    invalid: ['err', '✕ не работает'],
    error: ['warn', '! ошибка связи'],
    checking: ['busy', '⟳ проверяю…'],
    unknown: ['', '— не проверен'],
  };
  const [cls, text] = map[status] ?? ['', status];
  return <span className={`badge ${cls}`}>{children ?? text}</span>;
}

export function Confirm({
  text,
  onYes,
  onClose,
}: {
  text: string;
  onYes: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet onClose={onClose}>
      <p style={{ marginTop: 0 }}>{text}</p>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn grow" onClick={onClose}>
          Отмена
        </button>
        <button
          className="btn primary grow"
          onClick={() => {
            onYes();
            onClose();
          }}
        >
          Да
        </button>
      </div>
    </Sheet>
  );
}
