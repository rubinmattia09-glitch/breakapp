import React from 'react';
import { CRISI } from '../lib/pathway.js';

// Popup di emergenza mostrato quando l'utente segnala pensieri di autolesionismo
// (risposta "a volte" o "sì" all'ultima domanda del questionario).
// Ha una X in alto a destra per chiuderlo. I numeri sono cliccabili (tel:).
export default function EmergencyPopup({ onClose, onRespira }) {
  return (
    <div
      className="emergency-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Numeri di emergenza"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="emergency-popup">
        <button className="emergency-close" onClick={onClose} aria-label="Chiudi">
          ×
        </button>
        <h3>Non sei solo/a. Ci sono persone pronte ad aiutarti.</h3>
        <p>
          Hai risposto di avere pensieri difficili. Parlarne è importante: qui ci sono numeri
          gratuiti a cui rivolgerti subito, anche adesso. Non devi affrontarlo da solo/a.
        </p>
        <ul className="emergency-list">
          {CRISI.map((c) => (
            <li key={c.numero}>
              <span className="emergency-name">{c.nome}</span>
              <a className="emergency-num" href={`tel:${c.numero.replace(/\s+/g, '')}`}>
                {c.numero}
              </a>
            </li>
          ))}
        </ul>
        <p className="emergency-foot">
          In caso di pericolo immediato chiama il <strong>112 / 118</strong>.
        </p>
        <button className="primary" onClick={onClose}>
          Ho capito, chiudi
        </button>
        {onRespira && (
          <button className="ghost" onClick={onRespira}>
            🫁 Respira con me
          </button>
        )}
      </div>
    </div>
  );
}
