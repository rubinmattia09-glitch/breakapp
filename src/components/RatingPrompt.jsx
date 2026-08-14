import React, { useEffect, useState } from 'react';
import StarRating from './StarRating.jsx';

// Popup che appare "appena l'utente entra" nell'app, se la valutazione è aperta
// (solo il giorno della campagna) e l'utente non ha ancora votato. Una volta sola.
export default function RatingPrompt({ user }) {
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [chosen, setChosen] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    // Se ha già votato (in questa app) non mostrare più.
    if (localStorage.getItem('dn_rating_submitted') === '1') return;
    // Se ha chiuso con "Non ora" in questa sessione, non riappare finché non ricarica.
    if (sessionStorage.getItem('dn_rating_dismissed') === '1') return;
    let active = true;
    fetch('/api/rating/status?username=' + encodeURIComponent(user))
      .then((r) => r.json())
      .then((j) => {
        if (!active) return;
        if (j.open && !j.alreadyRated) {
          setVisible(true);
        } else if (j.alreadyRated) {
          localStorage.setItem('dn_rating_submitted', '1');
        }
      })
      .catch(() => {
        /* in caso di errore restiamo silenziosi: nessun popup */
      });
    return () => {
      active = false;
    };
  }, [user]);

  const choose = (n) => {
    setRating(n);
    setChosen(true);
    setMsg('');
  };

  const submit = async () => {
    if (!chosen) {
      setMsg('Scegli una valutazione (anche 0 se per te non è utile).');
      return;
    }
    setSending(true);
    setMsg('');
    try {
      const r = await fetch('/api/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, rating }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.ok) {
        localStorage.setItem('dn_rating_submitted', '1');
        setVisible(false);
      } else {
        setMsg(j.error || 'Invio non riuscito. Riprova.');
      }
    } catch (e) {
      setMsg('Invio non riuscito. Controlla la connessione.');
    }
    setSending(false);
  };

  const dismiss = () => {
    sessionStorage.setItem('dn_rating_dismissed', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="rating-overlay" role="dialog" aria-modal="true" aria-label="Valuta BREAKAPP">
      <div className="rating-card">
        <button className="rating-x" onClick={dismiss} aria-label="Chiudi">
          ×
        </button>
        <h3>Come valuti BREAKAPP?</h3>
        <p className="rating-sub">
          Aiutaci a migliorare: dai una valutazione da <strong>0 a 5 stelle</strong>. Puoi farlo una
          volta sola.
        </p>
        <StarRating value={rating} onChange={choose} />
        <div className="rating-row">
          <button type="button" className="rating-zero" onClick={() => choose(0)}>
            0 — per niente utile
          </button>
          <span className="rating-val">{chosen ? rating + ' / 5' : '— / 5'}</span>
        </div>
        {msg && <p className="rating-msg">{msg}</p>}
        <button className="primary" onClick={submit} disabled={sending}>
          {sending ? 'Invio…' : 'Invia valutazione'}
        </button>
        <button type="button" className="rating-later" onClick={dismiss}>
          Non ora
        </button>
      </div>
    </div>
  );
}
