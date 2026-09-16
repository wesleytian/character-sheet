import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MoneyRow, ItemRow } from './types';
import { setMoney, insertRows, deleteRow, updateItem } from './db';
import { Tip } from './Tip';

const MONEY_GROUPS: [string, string][] = [
  ['position', 'Position'],
  ['flow', 'Flow'],
  ['target', 'Targets'],
];

export const SLOTS: [string, string][] = [
  ['dwelling', 'Dwelling'],
  ['timepiece', 'Timepiece'],
  ['tools', 'Tools'],
  ['gear', 'Gear'],
  ['trinket', 'Trinkets'],
  ['pack', 'Pack'],
];

const money = (n: number | null, unit: string) =>
  n == null ? '—' : unit === 'USD' ? `$${n.toLocaleString()}` : `${n.toLocaleString()}${unit === '%' ? '%' : ` ${unit}`}`;

/**
 * Always shows grouping commas, including while you type. Re-grouping a
 * number moves every character after the caret, so the caret is restored by
 * counting digits rather than string offset - otherwise editing the middle of
 * a seven-figure number throws you to the end on every keystroke.
 */
function group(raw: string): string {
  const neg = raw.trim().startsWith('-');
  const cleaned = raw.replace(/[^\d.]/g, '');
  const [intPart, ...rest] = cleaned.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const dec = rest.length ? `.${rest.join('').slice(0, 2)}` : '';
  return (neg ? '-' : '') + grouped + dec;
}

const digitsBefore = (str: string, pos: number) =>
  (str.slice(0, pos).match(/[\d.]/g) ?? []).length;

/** Index in `str` just after the nth digit. */
function caretAfterDigits(str: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < str.length; i++) {
    if (/[\d.]/.test(str[i])) {
      seen++;
      if (seen === n) return i + 1;
    }
  }
  return str.length;
}

function MoneyInput({
  value, unit, onCommit,
}: { value: number | null; unit: string; onCommit: (v: number | null) => void }) {
  const fmt = (n: number | null) => (n == null ? '' : group(String(n)));
  // What we have committed but the reloaded sheet has not caught up to yet.
  // Without this the field repaints the old number for a beat after clearing.
  const [optimistic, setOptimistic] = useState<number | null | undefined>(undefined);
  const shown = optimistic !== undefined ? optimistic : value;
  const [text, setText] = useState(fmt(shown));
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  // Once props agree with what we committed, stop overriding them.
  useEffect(() => {
    if (optimistic !== undefined && value === optimistic) setOptimistic(undefined);
  }, [value, optimistic]);

  useEffect(() => { if (!focused) setText(fmt(shown)); }, [shown, focused]);

  // Put the caret back where the digit it was sitting after ended up.
  useLayoutEffect(() => {
    if (caret.current != null && ref.current) {
      const pos = caretAfterDigits(text, caret.current);
      ref.current.setSelectionRange(pos, pos);
      caret.current = null;
    }
  }, [text]);

  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    caret.current = digitsBefore(el.value, el.selectionStart ?? el.value.length);
    setText(group(el.value));
  };

  const commit = () => {
    setFocused(false);
    const raw = text.replace(/,/g, '').trim();
    const v = raw === '' ? null : Number(raw);
    if (v !== null && Number.isNaN(v)) { setText(fmt(shown)); return; }
    setText(fmt(v));
    if (v !== shown) { setOptimistic(v); onCommit(v); }
  };

  return (
    <input
      ref={ref}
      className={`cnum num ${unit === 'USD' ? 'wide' : ''}`}
      value={text}
      placeholder="—"
      inputMode="decimal"
      onFocus={() => setFocused(true)}
      onChange={change}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setText(fmt(shown)); setFocused(false); (e.target as HTMLInputElement).blur(); }
      }}
    />
  );
}

export function Vault({
  rows, items, userId, onChanged,
}: { rows: MoneyRow[]; items: ItemRow[]; userId: string; onChanged: () => void }) {
  const [adding, setAdding] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [val, setVal] = useState('');

  const addItem = async (slot: string) => {
    if (!name.trim()) return;
    await insertRows('cs_items', [{
      user_id: userId, name: name.trim(), slot, brand: '',
      acquired_on: null, value: val === '' ? null : Number(val), note: '',
      is_public: false, display_order: 0,
    }]);
    setName(''); setVal(''); setAdding(null);
    onChanged();
  };

  const amountOf = (k: string) => rows.find((r) => r.key === k)?.value ?? null;
  const net = amountOf('net_worth');
  const gear = items.reduce((n, i) => n + (Number(i.value) || 0), 0);

  const lastUpdated = rows
    .filter((r) => r.value != null && r.recorded_on)
    .map((r) => r.recorded_on!)
    .sort()
    .pop();

  // Position should reconcile: liquid + invested + illiquid - debt.
  const parts = ['liquid', 'invested', 'illiquid'].map(amountOf);
  const sum = parts.every((x) => x != null)
    ? parts.reduce((n, x) => n! + x!, 0)! - (amountOf('debt') ?? 0)
    : null;
  const mismatch = net != null && sum != null && Math.abs(sum - net) > 1 ? sum - net : null;

  return (
    <>
      <div className="vault-head">
        <div>
          <div className="card-now-label">Net worth</div>
          <div className="hs-n">{money(net, 'USD')}</div>
          {lastUpdated && <div className="d vault-when">as of {lastUpdated}</div>}
        </div>
        <div>
          <div className="card-now-label">Top items</div>
          <div className="hs-n">{money(gear || null, 'USD')}</div>
          <div className="d vault-when">{items.length} recorded</div>
        </div>
      </div>

      {mismatch != null && (
        <p className="vault-warn">
          Liquid + invested + illiquid − debt comes to {money(sum, 'USD')}, which is{' '}
          {money(Math.abs(mismatch), 'USD')} {mismatch > 0 ? 'more' : 'less'} than the net worth above.
        </p>
      )}

      <div className="cols">
        <div>
          {MONEY_GROUPS.map(([key, label]) => {
            const g = rows.filter((r) => r.category === key)
              .sort((a, b) => a.display_order - b.display_order);
            if (!g.length) return null;
            return (
              <div key={key}>
                <div className="group-head">{label}</div>
                {g.map((r) => (
                  <div className="row counter" key={r.id}>
                    <span className="k">{r.label}</span>
                    <MoneyInput value={r.value} unit={r.unit}
                                onCommit={async (v) => { await setMoney(r.id, v); onChanged(); }} />
                    <span className="d">{r.unit === 'USD' ? '$' : r.unit}</span>
                    {r.note && <Tip body={r.note} />}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div>
          <div className="group-head">Top items <span className="d">{items.length}</span></div>
          {SLOTS.map(([slot, label]) => {
            const owned = items.filter((i) => i.slot === slot);
            return (
              <div className="slot" key={slot}>
                <div className="slot-head">
                  <span className="slot-name">{label}</span>
                  <button className="add" onClick={() => setAdding(adding === slot ? null : slot)}>+</button>
                </div>
                {owned.map((i) => (
                  <div className="row item" key={i.id}>
                    <input
                      className="qedit"
                      defaultValue={i.name}
                      onBlur={async (e) => {
                        const v = e.target.value.trim();
                        if (v && v !== i.name) { await updateItem(i.id, { name: v }); onChanged(); }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    />
                    <MoneyInput
                      value={i.value == null ? null : Number(i.value)}
                      unit="USD"
                      onCommit={async (v) => { await updateItem(i.id, { value: v }); onChanged(); }}
                    />
                    <button className="qdel" title="Remove"
                            onClick={async () => { await deleteRow('cs_items', i.id); onChanged(); }}>×</button>
                  </div>
                ))}
                {adding === slot && (
                  <div className="row item">
                    <input className="qedit" value={name} autoFocus placeholder="What is it?"
                           onChange={(e) => setName(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && addItem(slot)} />
                    <input className="cnum num wide" value={val} placeholder="$"
                           inputMode="decimal"
                           onChange={(e) => setVal(group(e.target.value))}
                           onKeyDown={(e) => e.key === 'Enter' && addItem(slot)} />
                  </div>
                )}
                {!owned.length && adding !== slot && <p className="d slot-empty">empty</p>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
