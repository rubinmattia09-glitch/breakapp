import React, { useState, useEffect } from 'react';

// Bacheca anonima: gli utenti leggono i pensieri/lettere lasciati dagli altri
// e possono pubblicarne uno nuovo, senza alcun nome. I messaggi vivono nel
// database condiviso (Turso/SQLite), non sul telefono di ciascuno.
// I messaggi lunghi vengono accorciati con "…" e si aprono con "Espandi".
const LIMIT = 280;

function truncate(text, limit) {
  if (text.length <= limit) return text;
  const cut = text.lastIndexOf(' ', limit);
  const idx = cut > 0 ? cut : limit;
  return text.slice(0, idx).trimEnd() + '…';
}

// I token di cancellazione sono salvati SOLO sul dispositivo di chi ha pubblicato,
// così può ritirare i propri pensieri ma non quelli degli altri.
const MY_POSTS_KEY = 'breakapp_my_posts';

function loadMyTokens() {
  try {
    return JSON.parse(localStorage.getItem(MY_POSTS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}
function saveMyToken(id, token) {
  const m = loadMyTokens();
  m[String(id)] = token;
  try {
    localStorage.setItem(MY_POSTS_KEY, JSON.stringify(m));
  } catch {
    /* localStorage pieno o non disponibile: il tasto Ritira non sarà disponibile */
  }
}
function removeMyToken(id) {
  const m = loadMyTokens();
  delete m[String(id)];
  try {
    localStorage.setItem(MY_POSTS_KEY, JSON.stringify(m));
  } catch {
    /* ignora */
  }
}

function PostCard({ post, myToken, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = post.body.length > LIMIT;
  const shown = !isLong || expanded ? post.body : truncate(post.body, LIMIT);
  return (
    <article className="board-card">
      <p className="board-body">{shown}</p>
      {isLong && (
        <button
          type="button"
          className="board-expand"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'Riduci' : 'Espandi'}
        </button>
      )}
      <div className="board-foot">
        <span className="board-date">{formatDate(post.created_at)}</span>
        {myToken && (
          <button
            type="button"
            className="board-retract"
            onClick={() => onDelete(post.id)}
          >
            Ritira
          </button>
        )}
      </div>
    </article>
  );
}

export default function Bacheca({ onBack }) {
  const [posts, setPosts] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const myTokens = loadMyTokens();

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
        if (data.id != null && data.deleteToken) saveMyToken(data.id, data.deleteToken);
        setBody('');
        load();
      }
    } catch {
      setError('Invio non riuscito. Controlla la connessione.');
    } finally {
      setSending(false);
    }
  };

  const deletePost = async (id) => {
    const token = loadMyTokens()[String(id)];
    if (!token) return;
    setError('');
    try {
      const r = await fetch('/api/board', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setError(data.error || 'Impossibile ritirare il messaggio.');
      } else {
        removeMyToken(id);
        load();
      }
    } catch {
      setError('Impossibile ritirare il messaggio. Controlla la connessione.');
    }
  };

  return (
    <section className="bacheca">
      <div className="resp-head">
        <button className="ghost small back-arrow" type="button" onClick={onBack} aria-label="Torna indietro">
          ←
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
          <PostCard
            key={p.id}
            post={p}
            myToken={myTokens[String(p.id)] || null}
            onDelete={deletePost}
          />
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
