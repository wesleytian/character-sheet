import { useEffect, useRef, useState } from 'react';
import { signedUrl, setAvatar } from './db';
import { Avatar } from './Avatar';

/**
 * A treated photograph makes a far better character portrait than drawn SVG.
 * The drawn one stays as the fallback until a photo is set.
 */
export function Portrait({
  userId, avatarPath, onChanged, mark,
}: {
  userId: string; avatarPath: string | null; onChanged: () => void; mark?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!avatarPath) { setUrl(null); return; }
    signedUrl(avatarPath).then(setUrl).catch(() => setUrl(null));
  }, [avatarPath]);

  const choose = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try { await setAvatar(userId, f); onChanged(); } finally { setBusy(false); }
  };

  return (
    <div className="portrait">
      {url ? (
        <div className="portrait-frame">
          <img src={url} alt="Character portrait" />
          <span className="portrait-wash" />
        </div>
      ) : (
        <Avatar mark={mark} />
      )}
      <button className="portrait-set" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? 'uploading…' : url ? 'change' : 'add photo'}
      </button>
      <input ref={input} type="file" accept="image/*" style={{ display: 'none' }}
             onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
