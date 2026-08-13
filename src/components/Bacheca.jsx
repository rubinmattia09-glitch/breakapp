import React, { useState, useEffect } from 'react';

// Bacheca anonima: gli utenti leggono i pensieri/lettere lasciati dagli altri
// e possono pubblicarne uno nuovo, senza alcun nome. I messaggi vivono nel
// database condiviso (Turso/SQLite), non sul telefono di ciascuno.
export default function Bacheca({ onBack }) {
  const [posts, setPosts] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const r = await fetch('/api/board');
      const data = await r.json();
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch {
      setError('Non riesco a caricare la bacheca. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publish = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError('');
    try {
      const r = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setError(data.error || 'Invio non riuscito.');
      } else {
        setBody('');
        load();
      }
    } catch {
      setError('Invio non riuscito. Controlla la connessione.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="bacheca">
      <div className="resp-head">
        <button className="ghost small" type="button" onClick={onBack}>
          ← Indietro
        </button>
        <h2>Bacheca dei pensieri</h2>
      </div>

      <p className="lead">
        Uno spazio anonimo per lasciare un pensiero o una lettera a chi passa di qui. Nessun nome,
        solo parole. Sii gentile: la tua frase potrebbe essere d&apos;aiuto a qualcuno.
      </p>

      <form className="board-form" onSubmit={publish}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Scrivi qui il tuo pensiero anonimo…"
          rows={4}
        />
        <div className="board-form-foot">
          <span className="muted">{body.length} caratteri</span>
          <button className="primary small" type="submit" disabled={sending || !body.trim()}>
            {sending ? 'Invio…' : 'Pubblica anonimo'}
          </button>
        </div>
      </form>

      {error && (
        <p className="resp-note" style={{ color: '#c0392b' }}>
          {error}
        </p>
      )}

      <div className="board-list">
        {loading && <p className="empty">Caricamento…</p>}
        {!loading && posts.length === 0 && (
          <p className="empty">Ancora nessun messaggio. Sii il primo a lasciarne uno.</p>
        )}
        {posts.map((p) => (
          <article className="board-card" key={p.id}>
            <p className="board-body">{p.body}</p>
            <span className="board-date">{formatDate(p.created_at)}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}
