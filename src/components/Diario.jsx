import React, { useState, useEffect } from 'react';
import { loadDiario, saveDiario } from '../lib/storage.js';

function formatTs(ts) {
  try {
    return new Date(ts).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function Diario({ user }) {
  const [entries, setEntries] = useState(() => loadDiario(user));
  const [text, setText] = useState('');

  useEffect(() => {
    saveDiario(user, entries);
  }, [entries, user]);

  const save = () => {
    const t = text.trim();
    if (!t) return;
    setEntries((prev) => [{ id: Date.now(), ts: Date.now(), text: t }, ...prev]);
    setText('');
  };

  const remove = (id) => setEntries((prev) => prev.filter((e) => e.id !== id));

  return (
    <section className="diario">
      <h2>Diario</h2>
      <p className="lead">
        Scrivi quello che senti. Le note restano solo su questo dispositivo (localStorage), non vengono
        inviate da nessuna parte.
      </p>

      <div className="composer diario-compose">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Oggi mi sento..."
          rows={4}
        />
        <button className="primary" onClick={save} disabled={!text.trim()}>
          Salva nota
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="empty">Ancora nessuna nota. Scrivi pure la prima.</p>
      ) : (
        <ul className="entries">
          {entries.map((e) => (
            <li key={e.id} className="entry">
              <div className="entry-head">
                <span className="entry-ts">{formatTs(e.ts)}</span>
                <button className="del" onClick={() => remove(e.id)} aria-label="Elimina nota">
                  Elimina
                </button>
              </div>
              <p className="entry-text">{e.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
