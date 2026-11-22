import React from 'react';

// Stately: a friendly automaton state. The start arrow is its tail, and when it is
// happy it wears the double ring of an accepting state.
// mood: 'idle' | 'happy' | 'thinking' | 'sad' | 'wow'
export default function Mascot({ mood = 'idle', size = 64, className = '', bob = true }) {
  const eyesUp = mood === 'thinking';
  const body = { idle: '#fde68a', happy: '#bbf7d0', thinking: '#e9d5ff', sad: '#fecdd3', wow: '#bae6fd' }[mood] || '#fde68a';
  const mouth = {
    idle: 'M55 72 Q64 80 73 72',
    happy: 'M52 70 Q64 86 76 70 Z',
    thinking: 'M58 75 L70 73',
    sad: 'M55 79 Q64 71 73 79',
    wow: null
  }[mood];

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`${bob ? 'mascot-bob' : ''} ${mood === 'happy' ? 'mascot-wiggle' : ''} ${className}`}
      role="img"
      aria-label={`Stately the mascot, ${mood}`}
    >
      {/* start-arrow tail */}
      <path d="M6 64 L22 64" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      <path d="M17 57 L25 64 L17 71" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

      {/* accepting ring when happy */}
      {mood === 'happy' && <circle cx="66" cy="62" r="45" fill="none" stroke="#16a34a" strokeWidth="3.5" />}

      {/* body */}
      <circle cx="66" cy="62" r="37" fill={body} stroke="#0f172a" strokeWidth="4" />
      {/* shine */}
      <path d="M44 44 Q50 34 62 32" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.8" />

      {/* eyes */}
      <g className="mascot-eye">
        <ellipse cx="54" cy={eyesUp ? 54 : 58} rx="4.5" ry="6" fill="#0f172a" />
        <ellipse cx="78" cy={eyesUp ? 54 : 58} rx="4.5" ry="6" fill="#0f172a" />
        <circle cx="55.5" cy={eyesUp ? 52 : 56} r="1.6" fill="white" />
        <circle cx="79.5" cy={eyesUp ? 52 : 56} r="1.6" fill="white" />
      </g>

      {/* cheeks */}
      <ellipse cx="45" cy="70" rx="5" ry="3" fill="#fb7185" opacity="0.45" />
      <ellipse cx="87" cy="70" rx="5" ry="3" fill="#fb7185" opacity="0.45" />

      {/* mouth */}
      {mouth ? (
        <path d={mouth} fill={mood === 'happy' ? '#0f172a' : 'none'} stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <ellipse cx="64" cy="75" rx="4" ry="5" fill="#0f172a" />
      )}

      {/* little q0 label */}
      <text x="66" y="93" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontSize="9" fontWeight="600" fill="#0f172a" opacity="0.55">
        q₀
      </text>

      {/* thinking bubbles */}
      {mood === 'thinking' && (
        <g fill="white" stroke="#0f172a" strokeWidth="2.5">
          <circle cx="100" cy="26" r="4" />
          <circle cx="108" cy="14" r="6" />
        </g>
      )}
      {/* sad sweat drop */}
      {mood === 'sad' && <path d="M95 40 Q99 48 95 51 Q91 48 95 40 Z" fill="#7dd3fc" stroke="#0f172a" strokeWidth="2" />}
    </svg>
  );
}
