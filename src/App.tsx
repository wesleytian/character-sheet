import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { loadSheet, seedIfEmpty, needsSeed, runOp, setDemoMode } from './db';
import { disguise } from './demo';
import {
  cacheSheet, cachedSheet, applyAll, queued, onQueueChange, drain, onOp, applyLocally,
  isOffline, looksOffline,
} from './offline';
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
  // Showing cached data because the server could not be reached.
  const [stale, setStale] = useState(isOffline());
  const [pending, setPending] = useState(queued().length);
  // Someone is looking over your shoulder: same sheet, invented numbers.
  const [demo, setDemo] = useState(new URLSearchParams(location.search).has('demo'));
  const [demoSeed, setDemoSeed] = useState(7);
  const lastLoad = useRef(0);
  useEffect(() => { setDemoMode(demo); }, [demo]);

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
      // Anything still queued is layered on top, so a write made offline does
      // not vanish from the screen when a later load succeeds.
      const fresh = applyAll(await loadSheet(userId));
      lastLoad.current = Date.now();
      cacheSheet(userId, fresh);
      setSheet(fresh);
      setError('');
      setStale(false);
    } catch (e) {
      const cached = cachedSheet(userId);
      if (looksOffline(e) && cached) {
        setSheet(applyAll(cached));
        setStale(true);
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  // Send anything written while offline, then reload from the server.
  const flush = useCallback(async () => {
    if (!userId || isOffline()) return;
    const sent = await drain(runOp);
    if (sent) await refresh();
  }, [userId, refresh]);

  // Apply every write to the sheet as it is made. The reload that follows
  // only confirms it.
  useEffect(() => onOp((op) => setSheet((s) => applyLocally(s, op))), []);

  // Come back to the tab and you get the current sheet. Without this the page
  // keeps whatever it loaded hours ago, which looks exactly like data loss.
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastLoad.current < 30_000) return;
      refresh();
    };
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
    return () => {
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('focus', onShow);
    };
  }, [refresh]);

  useEffect(() => {
    setPending(queued().length);
    const off = onQueueChange(setPending);
    const back = () => { setStale(false); flush(); };
    const gone = () => setStale(true);
    window.addEventListener('online', back);
    window.addEventListener('offline', gone);
    return () => {
      off();
      window.removeEventListener('online', back);
      window.removeEventListener('offline', gone);
    };
  }, [flush]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setBooting(true);
        // Paint the cached sheet immediately - the network round trip is the
        // slowest thing on a cold open, and the data rarely changes between
        // one load and the next.
        const cached = cachedSheet(userId);
        if (cached) {
          setSheet(applyAll(cached));
          setBooting(false);
        }
        await flush();

        // Then load, and seed only if what comes back is genuinely empty.
        // Seeding used to run first and cost five serial round trips on every
        // load, for an account seeded months ago.
        setPhase('loading sheet\u2026');
        let first: SheetData;
        try {
          first = applyAll(await loadSheet(userId));
          cacheSheet(userId, first);
          setSheet(first);
          setStale(false);
        } catch (e) {
          if (!cached || !looksOffline(e)) throw e;
          setStale(true);
          return;
        }
        if (needsSeed(first)) {
          setPhase('checking character record\u2026');
          await seedIfEmpty(userId, (msg) => {
            setBootLines((l) => [...l, msg]);
            setPhase(`writing ${msg}\u2026`);
          }, first);
          await refresh();
        }
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
      {(stale || pending > 0) && (
        <div className="offline-bar">
          {stale && <span>offline — showing your last saved sheet</span>}
          {pending > 0 && (
            <span>
              {pending} change{pending === 1 ? '' : 's'} waiting to sync
              {!isOffline() && <button className="btn" onClick={flush}>retry now</button>}
            </span>
          )}
        </div>
      )}
      {demo && (
        <div className="demo-bar">
          <span>Demo sheet — invented numbers, nothing here is saved</span>
          <button className="btn" onClick={() => setDemoSeed((n) => n + 1)}>reroll</button>
          <button className="btn primary" onClick={() => setDemo(false)}>back to mine</button>
        </div>
      )}
      <Sheet sheet={demo ? disguise(sheet, demoSeed) : sheet}
             onChanged={demo ? () => {} : refresh}
             onAdd={setAdding} onPick={setPicking}
             userId={userId} apiKey={demo ? '' : apiKey} demo={demo} />
      {!demo && (
        <button className="demo-toggle" title="Show someone this sheet with invented numbers"
                onClick={() => setDemo(true)}>demo</button>
      )}
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
