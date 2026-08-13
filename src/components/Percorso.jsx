import React, { useState, useEffect, useRef } from 'react';
import { CRISI } from '../lib/pathway.js';
import { PERSONAS } from '../data/personas.js';
import { loadProgress, saveProgress, loadObjective, saveObjective, computeStreak } from '../lib/storage.js';
import { MascotBubble } from './Mascot.jsx';
import { MOTIVATIONAL } from '../data/motivational.js';

// Cuorino "giudica" i progressi: messaggi a copione, veloci e offline.
const GENERIC = [
  'Ottimo, un passo in più!',
  'Bene così, continua.',
  'Ecco, un’altra spunta.',
  'Stai andando forte!',
  'Un passettino alla volta. Brava/o.',
];

// Pool unico da cui Cuorino pesca a caso: frasi generiche + citazioni
// motivazionali su "tenere duro" e "andare avanti". Ogni voce ha il testo
// e l'umore (mood) da mostrare.
const ENCOURAGE = [
  ...GENERIC.map((text) => ({ text, mood: 'happy' })),
  ...MOTIVATIONAL,
];

function countDone(prog, moduli) {
  let n = 0;
  moduli.forEach((m) => { n += prog[m.id] ? Object.keys(prog[m.id]).length : 0; });
  return n;
}
function doneMods(prog, moduli) {
  return new Set(
    moduli
      .filter((m) => prog[m.id] && Object.keys(prog[m.id]).length === m.attivita.length)
      .map((m) => m.id)
  );
}
function reactToProgress(before, after, moduli) {
  const cb = countDone(before, moduli);
  const ca = countDone(after, moduli);
  const db = doneMods(before, moduli);
  const da = doneMods(after, moduli);
  const tot = moduli.reduce((s, m) => s + m.attivita.length, 0);

  if (ca > cb) {
    if (da.size === moduli.length && db.size !== moduli.length) {
      return { text: 'Percorso completato! Sono fiero di te.', mood: 'cheer' };
    }
    for (const m of moduli) {
      if (da.has(m.id) && !db.has(m.id)) {
        return { text: `Modulo «${m.titolo}» completato! Ne sei capace.`, mood: 'cheer' };
      }
    }
    const pick = ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)];
    return { text: pick.text, mood: pick.mood || 'happy' };
  }
  if (ca < cb) {
    return { text: 'Nessun problema, rifalla quando vuoi.', mood: 'think' };
  }
  return null;
}

export default function Percorso({ user, result, onChat, onChatWith, onRedo, onReset, onHelp }) {
  const { profilo, crisi, moduli } = result;

  const [progress, setProgress] = useState(() => loadProgress(user));
  const [mascot, setMascot] = useState({
    text: 'Sono Cuorino: completa le attività e io ti faccio il tifo!',
    mood: 'happy',
    visible: true,
  });
  const prevRef = useRef(null);

  useEffect(() => {
    saveProgress(user, progress);
  }, [progress, user]);

  // Cuorino commenta i cambiamenti di progresso.
  useEffect(() => {
    const before = prevRef.current;
    prevRef.current = progress;
    if (!before) return; // primo render: lascia il benvenuto
    const r = reactToProgress(before, progress, moduli);
    if (r) setMascot({ ...r, visible: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const toggle = (modId, idx) => {
    setProgress((prev) => {
      const mod = { ...(prev[modId] || {}) };
      if (mod[idx]) delete mod[idx];
      else mod[idx] = true;
      return { ...prev, [modId]: mod };
    });
  };

  const doneOf = (m) => (progress[m.id] ? Object.keys(progress[m.id]).length : 0);

  // Obiettivo scelto dall'utente (modificabile) e streak di giorni consecutivi.
  const [obiettivo, setObiettivo] = useState(() => loadObjective(user));
  const [editObj, setEditObj] = useState(false);
  const streak = computeStreak(user);
  const pctObiettivo = obiettivo ? Math.min(100, Math.round((streak / obiettivo) * 100)) : 0;

  const changeObjective = (n) => {
    saveObjective(user, n);
    setObiettivo(n);
    setEditObj(false);
  };

  // Conteggi globali per la "metro di guarigione"
  let totAtt = 0;
  let doneAtt = 0;
  moduli.forEach((m) => {
    totAtt += m.attivita.length;
    doneAtt += doneOf(m);
  });
  const pct = totAtt ? Math.round((doneAtt / totAtt) * 100) : 0;
  const completato = pct >= 100;

  return (
    <section className="percorso">
      <div className="percorso-top">
        <div>
          <h2>Il tuo percorso</h2>
          <p className="lead">
            Non hai una scadenza: avanzi quando puoi. Ogni passo conta. Qui sotto vedi l’obiettivo che
            ti sei dato/a e quanti giorni di fila stai facendo gli esercizi — finché non ti senti di
            nuovo intero/a.
          </p>
          {onHelp && (
            <button className="ghost small tut-help" onClick={onHelp} title="Come funziona l'interfaccia">
              Come funziona?
            </button>
          )}
        </div>
        <div className="streak-wrap">
          <div
            className="streak-box"
            role="button"
            tabIndex={0}
            title="Tocca per cambiare il tuo obiettivo"
            onClick={() => setEditObj((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setEditObj((v) => !v);
              }
            }}
          >
            <div className="streak-stat">
              <span className="streak-emoji" aria-hidden="true">🔥</span>
              <div>
                <strong>{streak}</strong>
                <small>{streak === 1 ? 'giorno di fila' : 'giorni di fila'}</small>
              </div>
            </div>
            <div className="streak-stat">
              <span className="streak-emoji" aria-hidden="true">🎯</span>
              <div>
                <strong>{obiettivo ? `${obiettivo} giorni` : '—'}</strong>
                <small>obiettivo · ✎ tocca per cambiare</small>
              </div>
            </div>
            {obiettivo ? (
              <div className="streak-goal" title={`${pctObiettivo}% dell'obiettivo`}>
                <div className="streak-goal-fill" style={{ width: `${pctObiettivo}%` }} />
              </div>
            ) : null}
          </div>
          {editObj && (
            <div className="streak-edit" role="menu" aria-label="Cambia obiettivo">
              <p>Vuoi cambiare il tuo obiettivo?</p>
              <div className="streak-edit-opts">
                {[5, 10, 30].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`opt ${obiettivo === n ? 'sel' : ''}`}
                    onClick={() => changeObjective(n)}
                  >
                    {n === 5 ? '5 giorni' : n === 10 ? '10 giorni' : '1 mese'}
                  </button>
                ))}
              </div>
              <button type="button" className="ghost small" onClick={() => setEditObj(false)}>
                Annulla
              </button>
            </div>
          )}
        </div>
      </div>

      {crisi && (
        <div className="crisis-banner">
          <strong>Sei importante.</strong> Hai segnalato pensieri difficili: non sei solo/a.
          <ul className="crisi-list">
            {CRISI.map((c) => (
              <li key={c.numero}>
                <strong>{c.nome}:</strong> {c.numero}
              </li>
            ))}
          </ul>
        </div>
      )}

      {profilo && <p className="profilo">{profilo}</p>}

      {completato && (
        <div className="completato">
          <strong>Hai completato tutte le tappe del percorso.</strong> La guarigione però non è una
          riga da barrare: va e viene. Va benissimo tornare indietro, rileggere, o semplicemente stare
          nel diario o nella chat quando ne hai bisogno.
        </div>
      )}

      <ol className="timeline">
        {moduli.map((m, i) => {
          const done = doneOf(m);
          const isModDone = done === m.attivita.length;
          return (
            <li className={`tappa ${isModDone ? 'fatta' : ''}`} key={m.id}>
              <div className="tappa-dot">{isModDone ? '✓' : i + 1}</div>
              <div className="tappa-body">
                <div className="modulo-head">
                  <div>
                    <h3>{m.titolo}</h3>
                    <span className="durata">
                      {m.durata} · {done}/{m.attivita.length}
                    </span>
                  </div>
                  <span className="tag">Consigliato: {PERSONAS[m.persona].name}</span>
                </div>
                <p>{m.descrizione}</p>
                <div className="mod-bar" title={`${done}/${m.attivita.length} attività`}>
                  <div
                    className="mod-bar-fill"
                    style={{ width: `${Math.round((done / m.attivita.length) * 100)}%` }}
                  />
                </div>
                <ul className="attivita">
                  {m.attivita.map((a, k) => {
                    const done = !!(progress[m.id] && progress[m.id][k]);
                    return (
                      <li key={k}>
                        <label className={`check ${done ? 'on' : ''}`}>
                          <input type="checkbox" checked={done} onChange={() => toggle(m.id, k)} />
                          <span className="tick" aria-hidden="true"></span>
                          <span className="txt">{a}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <button className="ghost small" onClick={() => onChatWith(m.persona)}>
                  Parla con {PERSONAS[m.persona].name}
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="actions center">
        <button className="primary" onClick={onChat}>
          Apri la chat con un assistente
        </button>
        <button className="ghost" onClick={onRedo}>
          Rifai il questionario
        </button>
        <button
          className="ghost danger"
          onClick={onReset}
          title="Cancella questionario e progressi salvati"
        >
          Ricomincia da zero
        </button>
      </div>

      {mascot.visible && (
        <div className="cuorino-dice" role="status">
          <MascotBubble mood={mascot.mood} size={66}>
            {mascot.text}
          </MascotBubble>
          <button
            className="cuorino-close"
            onClick={() => setMascot((v) => ({ ...v, visible: false }))}
            aria-label="Nascondi Cuorino"
          >
            ×
          </button>
        </div>
      )}
    </section>
  );
}
