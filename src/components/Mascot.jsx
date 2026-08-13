import React from 'react';

// Espressioni della bocca per ciascun "umore" del mascotte.
const MOUTHS = {
  happy: 'M48 92 Q60 102 72 92',
  cheer: 'M46 90 Q60 110 74 90 Q60 100 46 90 Z',
  cheeky: 'M52 95 Q64 101 74 90',
  think: 'M54 95 Q60 92 66 95',
};

// Cuorino, in stile Duolingo: un ometto tondo e amichevole, testa grossa,
// occhi enormi e corpo a goccia. Tutto SVG, offline, con espressioni e un
// leggero dondolio. L'intro del petto richiama il cuore del logo BREAKAPP.
export default function Mascot({ mood = 'happy', size = 120, className = '' }) {
  const mouth = MOUTHS[mood] || MOUTHS.happy;
  return (
    <svg
      className={`mascot mascot-${mood} ${className}`}
      width={size}
      height={Math.round(size * 1.12)}
      viewBox="0 0 120 134"
      role="img"
      aria-label="Cuorino, il tuo compagno di percorso"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mbody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7ed957" />
          <stop offset="100%" stopColor="#4fb222" />
        </linearGradient>
        <radialGradient id="mhead" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffd9b8" />
          <stop offset="100%" stopColor="#f4b98c" />
        </radialGradient>
        <filter id="mds" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1f6b0e" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter="url(#mds)">
        {/* Corpo a goccia (verde Duolingo) */}
        <path
          d="M60 70 C 34 70, 26 112, 33 122 C 40 132, 80 132, 87 122 C 94 112, 86 70, 60 70 Z"
          fill="url(#mbody)"
        />
        {/* Piccole braccia */}
        <path d="M34 96 q-12 6 -14 20 q10 -2 16 -10 Z" fill="url(#mbody)" />
        <path d="M86 96 q12 6 14 20 q-10 -2 -16 -10 Z" fill="url(#mbody)" />
        {/* Cuore sul petto (omaggio al logo) */}
        <path
          d="M60 97 C 60 97 53 89 53 84 C 53 81 56 80 58 82 C 59 83 60 85 60 85 C 60 85 61 83 62 82 C 64 80 67 81 67 84 C 67 89 60 97 60 97 Z"
          fill="#ec465c"
        />

        {/* Testa tonda */}
        <circle cx="60" cy="44" r="33" fill="url(#mhead)" />
        {/* Capelli semplici in cima */}
        <path
          d="M28 40 C 28 18, 92 18, 92 40 C 92 30, 80 22, 60 22 C 40 22, 28 30, 28 40 Z"
          fill="#6b4a2f"
        />
        <ellipse cx="60" cy="23" rx="32" ry="10" fill="#6b4a2f" />

        {/* Occhi grandi */}
        <circle cx="48" cy="46" r="11" fill="#ffffff" />
        <circle cx="72" cy="46" r="11" fill="#ffffff" />
        <circle className="pupil" cx="50" cy="48" r="5.6" fill="#2c2c2a" />
        <circle className="pupil" cx="74" cy="48" r="5.6" fill="#2c2c2a" />
        <circle cx="52" cy="44.5" r="1.8" fill="#ffffff" />
        <circle cx="76" cy="44.5" r="1.8" fill="#ffffff" />

        {/* Guance */}
        <circle cx="40" cy="58" r="5" fill="#ff9aa6" opacity="0.5" />
        <circle cx="80" cy="58" r="5" fill="#ff9aa6" opacity="0.5" />

        {/* Bocca (varia con l'umore) */}
        <path
          d={mouth}
          fill={mood === 'cheer' ? '#b5303f' : 'none'}
          stroke="#7a1322"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

// Fumetto di dialogo: Cuorino + testo.
export function MascotBubble({ mood = 'happy', size = 72, children, className = '' }) {
  return (
    <div className={`mascot-bubble ${className}`}>
      <Mascot mood={mood} size={size} />
      <div className="mascot-speech">
        <p>{children}</p>
        <span className="mascot-tail" />
      </div>
    </div>
  );
}
