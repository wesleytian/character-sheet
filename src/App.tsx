import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { loadSheet, seedIfEmpty } from './db';
import { Sheet as SheetData, EMPTY_SHEET } from './types';
import { Sheet } from './Sheet';
import { Chat } from './Chat';
import { AddModal, AddKind } from './Modal';
import { Picker, PickerKind } from './Picker';

const KEY_STORAGE = 'cs-anthropic-key';

function Login() {
  const [error, setError] = useState('');

  // Google OAuth, the same door Homebase uses - this account has no password
  // and magic links are rate limited.
  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="login">
      <h1>◈ CHARACTER SHEET</h1>
      <p className="d">Same account as Homebase.</p>
      <button onClick={signIn}>Sign in with Google</button>
      {error && <p className="r">{error}</p>}
    </div>
  );
}

const SPIN = ['|', '/', '-', '\\'];

function Boot({ lines, phase }: { lines: string[]; phase: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 120);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="boot">
      <h1>◈ CHARACTER SHEET</h1>
      <div className="rule">{'\u2500'.repeat(120)}</div>
      {lines.map((l, i) => (
        <div className="boot-line ok" key={i}>
          <span className="tick">[✓]</span> {l}
        </div>
      ))}
      <div className="boot-line">
        <span className="boot-spin">[{SPIN[tick % SPIN.length]}]</span> {phase}
      </div>
      {lines.length > 0 && (
        <div className="boot-note">
          First run writes 11 skill ladders, 46 quests and 17 metrics. Takes a few
          seconds — it only happens once.
        </div>
      )}
    </div>
  );
}

export function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sheet, setSheet] = useState<SheetData>(EMPTY_SHEET);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [booting, setBooting] = useState(true);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [phase, setPhase] = useState('connecting\u2026');
  const [syncing, setSyncing] = useState(false);
  const [adding, setAdding] = useState<AddKind | null>(null);
  const [picking, setPicking] = useState<PickerKind | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      setSheet(await loadSheet(userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setBooting(true);
        setPhase('checking character record\u2026');
        await seedIfEmpty(userId, (msg) => {
          setBootLines((l) => [...l, msg]);
          setPhase(`writing ${msg}\u2026`);
        });
        setPhase('loading sheet\u2026');
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBooting(false);
      }
    })();

    // The Anthropic key lives in Homebase's settings blob; fall back to a local
    // copy so this app works even if that shape changes.
    (async () => {
      const local = localStorage.getItem(KEY_STORAGE);
      if (local) {
        setApiKey(local);
        return;
      }
      const { data } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .maybeSingle();
      const fromHomebase =
        (data?.settings as Record<string, string> | undefined)?.anthropicApiKey ?? '';
      if (fromHomebase) setApiKey(fromHomebase);
    })();
  }, [userId, refresh]);

  const promptForKey = () => {
    const entered = window.prompt('Anthropic API key (stored in this browser only):');
    if (entered) {
      localStorage.setItem(KEY_STORAGE, entered.trim());
      setApiKey(entered.trim());
    }
  };

  if (!ready) return <Boot lines={[]} phase={'connecting\u2026'} />;
  if (!userId) return <Login />;
  if (booting) return <Boot lines={bootLines} phase={phase} />;

  return (
    <>
      {error && <div className="page r">{error}</div>}
      {syncing && <div className="syncing">syncing…</div>}
      <Sheet sheet={sheet} onChanged={refresh} onAdd={setAdding} onPick={setPicking} userId={userId} />
      {picking && (
        <Picker
          kind={picking}
          userId={userId}
          existing={sheet.atlas.filter((a) => a.kind === picking)}
          onClose={() => setPicking(null)}
          onSaved={refresh}
        />
      )}
      {adding && (
        <AddModal
          kind={adding}
          userId={userId}
          metrics={sheet.metrics}
          nextPlaceOrder={
            sheet.atlas.filter((a) => a.kind === 'city_lived').length + 1
          }
          onClose={() => setAdding(null)}
          onSaved={refresh}
        />
      )}
      <Chat
        apiKey={apiKey}
        userId={userId}
        sheet={sheet}
        onChanged={refresh}
        onNeedKey={promptForKey}
      />
    </>
  );
}
