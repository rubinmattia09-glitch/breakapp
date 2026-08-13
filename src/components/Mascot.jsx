import React from 'react';

// Mascotte dell'app: ora è l'immagine avatar.png (PNG statico).
// Accettiamo `mood`, `size` e `className` per restare compatibili con i
// chiamanti (Tutorial, Percorso, Oggi), ma l'immagine è unica.
// L'asset vive in public/avatar.png e viene servito da Vite/Node a /avatar.png.
const AVATAR_URL = '/avatar.png';

export default function Mascot({ mood = 'happy', size = 120, className = '' }) {
  return (
    <img
      className={`mascot mascot-${mood} ${className}`.trim()}
      src={AVATAR_URL}
      alt="Cuorino, il tuo compagno di percorso"
      width={size}
      height={size}
      draggable={false}
    />
  );
}

// Fumetto di dialogo: mascotte + testo. API invariata.
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