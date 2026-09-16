import { useState } from 'react';
import { updateProfile } from './db';

/**
 * A privacy screen for the Vault: the numbers stay hidden until a passcode is
 * entered, so money is not on screen when someone is looking over your
 * shoulder or you are sharing a window. It is not encryption — see the note
 * shown under the prompt.
 */
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`character-sheet:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const KEY = 'cs-vault-unlocked';
export const isUnlocked = () => sessionStorage.getItem(KEY) === '1';

export function VaultLock({
  userId, pinHash, onUnlock, compact = false,
}: { userId: string; pinHash: string | null; onUnlock: () => void; compact?: boolean }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const setup = !pinHash;

  const submit = async () => {
    setError('');
    if (setup) {
      if (pin.length < 4) return setError('Use at least four characters.');
      if (pin !== confirm) return setError('The two entries do not match.');
      await updateProfile(userId, { vault_pin_hash: await hashPin(pin) });
      sessionStorage.setItem(KEY, '1');
      onUnlock();
      return;
    }
    if ((await hashPin(pin)) !== pinHash) {
      setPin('');
      return setError('Wrong passcode.');
    }
    sessionStorage.setItem(KEY, '1');
    onUnlock();
  };

  if (compact) {
    return (
      <div className="vault-lock-bar">
        <span className="lock-sigil">◈</span>
        <span className="d">
          {setup ? 'Set a passcode to hide the figures' : 'Figures hidden'}
        </span>
        <input type="password" value={pin} placeholder="Passcode"
               onChange={(e) => setPin(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        {setup && (
          <input type="password" value={confirm} placeholder="Again"
                 onChange={(e) => setConfirm(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        )}
        <button className="btn primary" onClick={submit}>{setup ? 'Set' : 'Show'}</button>
        {error && <span className="r">{error}</span>}
      </div>
    );
  }

  return (
    <div className="vault-lock">
      <div className="lock-sigil">◈</div>
      <h3>{setup ? 'Set a Vault passcode' : 'Vault is locked'}</h3>
      <p className="d">
        {setup
          ? 'Your money and belongings stay hidden until this is entered.'
          : 'Enter your passcode to show the numbers.'}
      </p>

      <div className="lock-row">
        <input type="password" value={pin} autoFocus placeholder="Passcode"
               onChange={(e) => setPin(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter' && !setup) submit(); }} />
        {setup && (
          <input type="password" value={confirm} placeholder="Again"
                 onChange={(e) => setConfirm(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        )}
        <button className="btn primary" onClick={submit}>{setup ? 'Set' : 'Unlock'}</button>
      </div>

      {error && <p className="r">{error}</p>}

      <p className="lock-note">
        This hides the numbers on screen; it does not encrypt them. Anyone already signed
        in as you could still read them from the database. Treat it as a privacy screen,
        not a second password.
      </p>
    </div>
  );
}
