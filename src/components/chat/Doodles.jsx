import React from 'react';

// Hand-drawn-looking course doodles that float in the background.
const ITEMS = [
  { x: '6%', y: '12%', r: -8, c: '#99f6e4', kind: 'state' },
  { x: '88%', y: '9%', r: 10, c: '#fbcfe8', kind: 'eps' },
  { x: '80%', y: '62%', r: -6, c: '#c7d2fe', kind: 'arrow' },
  { x: '4%', y: '70%', r: 6, c: '#fde68a', kind: 'empty' },
  { x: '46%', y: '4%', r: 4, c: '#bae6fd', kind: 'sigma' },
  { x: '92%', y: '86%', r: -10, c: '#bbf7d0', kind: 'stack' },
  { x: '18%', y: '40%', r: 12, c: '#fecdd3', kind: 'accept' },
  { x: '70%', y: '30%', r: -4, c: '#fde047', kind: 'delta' }
];

function Shape({ kind, c }) {
  const s = { fill: 'none', stroke: c, strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (kind) {
    case 'state':
      return (
        <svg viewBox="0 0 60 60" width="56" height="56">
          <circle cx="30" cy="30" r="20" {...s} />
          <text x="30" y="36" textAnchor="middle" fontFamily="Fredoka" fontSize="16" fill={c}>q</text>
        </svg>
      );
    case 'accept':
      return (
        <svg viewBox="0 0 60 60" width="60" height="60">
          <circle cx="30" cy="30" r="22" {...s} />
          <circle cx="30" cy="30" r="15" {...s} />
        </svg>
      );
    case 'eps':
      return <span style={{ color: c, fontFamily: 'Fredoka', fontSize: 52, fontWeight: 600 }}>ε</span>;
    case 'empty':
      return <span style={{ color: c, fontFamily: 'Fredoka', fontSize: 50, fontWeight: 600 }}>∅</span>;
    case 'sigma':
      return <span style={{ color: c, fontFamily: 'Fredoka', fontSize: 44, fontWeight: 600 }}>Σ*</span>;
    case 'arrow':
      return (
        <svg viewBox="0 0 90 40" width="90" height="40">
          <path d="M5 30 Q45 -5 80 22" {...s} />
          <path d="M70 14 L82 23 L68 28" {...s} />
          <text x="40" y="38" fontFamily="Fredoka" fontSize="13" fill={c}>a</text>
        </svg>
      );
    case 'delta':
      return <span style={{ color: c, fontFamily: 'Fredoka', fontSize: 50, fontWeight: 600 }}>δ</span>;
    case 'stack':
      return (
        <svg viewBox="0 0 50 60" width="44" height="54">
          <rect x="6" y="40" width="38" height="12" rx="3" {...s} />
          <rect x="6" y="24" width="38" height="12" rx="3" {...s} />
          <rect x="6" y="8" width="38" height="12" rx="3" {...s} />
        </svg>
      );
    default:
      return null;
  }
}

export default function Doodles({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {ITEMS.map((it, i) => (
        <div
          key={i}
          className="absolute doodle-float"
          style={{ left: it.x, top: it.y, '--r': `${it.r}deg`, animationDelay: `${i * 0.7}s` }}
        >
          <Shape kind={it.kind} c={it.c} />
        </div>
      ))}
    </div>
  );
}

export function Confetti() {
  const colors = ['#2dd4bf', '#fbbf24', '#f472b6', '#818cf8', '#4ade80', '#38bdf8'];
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 w-0 h-0" aria-hidden="true">
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="confetti-bit absolute block rounded-sm"
          style={{
            width: 7,
            height: 11,
            background: colors[i % colors.length],
            left: (i - 9) * 9,
            '--dx': `${(i - 9) * 14}px`,
            animationDelay: `${(i % 6) * 0.05}s`
          }}
        />
      ))}
    </div>
  );
}
