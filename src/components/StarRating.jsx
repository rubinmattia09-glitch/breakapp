import React, { useState } from 'react';

// Stelle interattive da 0 a 5. Con `readOnly` si usano solo per mostrare un voto.
export default function StarRating({ value = 0, onChange, size = 36, readOnly = false }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="stars" role="radiogroup" aria-label="Valutazione da 0 a 5 stelle">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          className="star"
          disabled={readOnly}
          aria-label={n + ' stelle'}
          aria-pressed={value === n}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange && onChange(n)}
        >
          <span style={{ fontSize: size + 'px', color: shown >= n ? '#ffb400' : '#d9d2d4' }}>★</span>
        </button>
      ))}
    </div>
  );
}
