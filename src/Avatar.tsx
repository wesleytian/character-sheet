/**
 * A heraldic sigil, not a figure. Hand-authoring a convincing portrait in SVG
 * does not work; a crest built from type and geometry does, and it reads as
 * deliberate. Replaced by a real photograph as soon as one is set.
 */
export function Avatar({ mark = '田' }: { mark?: string }) {
  return (
    <svg viewBox="0 0 120 152" className="avatar" role="img" aria-label="Character sigil">
      <defs>
        <linearGradient id="sg-ground" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#262E35" />
          <stop offset="100%" stopColor="#151A1E" />
        </linearGradient>
        <linearGradient id="sg-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F0CE9A" />
          <stop offset="45%" stopColor="#B98B4A" />
          <stop offset="100%" stopColor="#7A5C31" />
        </linearGradient>
        <radialGradient id="sg-glow" cx="0.5" cy="0.42" r="0.6">
          <stop offset="0%" stopColor="#DCAF89" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#DCAF89" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="2" y="2" width="116" height="148" fill="url(#sg-ground)" stroke="#4C575E" />
      <rect x="7" y="7" width="106" height="138" fill="none" stroke="#B98B4A" strokeWidth="0.8" opacity=".45" />
      <circle cx="60" cy="66" r="46" fill="url(#sg-glow)" />

      {/* roundel */}
      <circle cx="60" cy="66" r="34" fill="#1B2126" stroke="url(#sg-brass)" strokeWidth="2.4" />
      <circle cx="60" cy="66" r="29" fill="none" stroke="#B98B4A" strokeWidth="0.7" opacity=".5" />

      <text x="60" y="66" textAnchor="middle" dominantBaseline="central"
            fill="url(#sg-brass)"
            style={{ font: '700 38px "Songti SC", "Noto Serif SC", Georgia, serif' }}>
        {mark}
      </text>

      {/* laurels */}
      <path d="M26 92 q6 14 20 20" stroke="#B98B4A" strokeWidth="1.6" fill="none" opacity=".75" />
      <path d="M94 92 q-6 14 -20 20" stroke="#B98B4A" strokeWidth="1.6" fill="none" opacity=".75" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} opacity=".7">
          <ellipse cx={30 + i * 4.6} cy={97 + i * 5} rx="4.4" ry="2" fill="#8A6636"
                   transform={`rotate(${38 + i * 8} ${30 + i * 4.6} ${97 + i * 5})`} />
          <ellipse cx={90 - i * 4.6} cy={97 + i * 5} rx="4.4" ry="2" fill="#8A6636"
                   transform={`rotate(${-38 - i * 8} ${90 - i * 4.6} ${97 + i * 5})`} />
        </g>
      ))}

      {/* banner */}
      <path d="M32 124 L88 124 L88 136 L60 131 L32 136 Z" fill="#2E241A" stroke="url(#sg-brass)" strokeWidth="1.2" />

      {/* corners */}
      <path d="M12 12 L24 12 M12 12 L12 24" stroke="#B98B4A" strokeWidth="1.6" fill="none" />
      <path d="M108 140 L96 140 M108 140 L108 128" stroke="#B98B4A" strokeWidth="1.6" fill="none" />
    </svg>
  );
}
