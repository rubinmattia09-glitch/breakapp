import React, { useState, useEffect } from 'react';
import { PERSONAS } from '../data/personas.js';
import { MascotBubble } from './Mascot.jsx';
import { MOTIVATIONAL } from '../data/motivational.js';
import { dailyTasksFor, loadDaily, saveDaily, dateKey } from '../lib/dailytasks.js';

// Schermata "Oggi": mostra i compiti del giorno (calcolati dal percorso) e
// invita a fare il questionario giornaliero quando non è ancora stato compilato.
export default function Oggi({ user, result, todayKey, onChatWith, onDaily }) {
  const d = new Date();
  const key = todayKey || dateKey(d);
  const tasks = dailyTasksFor(result, d);

  const todayObj = loadDaily(user, key);
  const todayDone = !!(todayObj && todayObj.answers);

  const [done, setDone] = useState(() => (todayObj ? todayObj.done : {}));

  useEffect(() => {
    const obj = loadDaily(user, key) || { done: {} };
    saveDaily(user, key, { ...obj, done });
  }, [done, user, key]);

  const toggle = (id) => {
    const wasOn = !!done[id];
    const n = { ...done };
    if (wasOn) delete n[id];
    else n[id] = true;
    setDone(n);
    if (!wasOn) {
      const nextFatti = tasks.filter((t) => n[t.id]).length;
      if (tasks.length > 0 && nextFatti === tasks.length) {
        setMascot({ text: 'Tutto fatto per oggi. Sei grande!', mood: 'cheer' });
      } else {
        const pick = MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)];
        setMascot({ text: pick.text, mood: pick.mood || 'happy' });
      }
    } else {
      setMascot({ text: 'Nessun problema, rifalla quando vuoi.', mood: 'think' });
    }
  };

  const fatti = tasks.filter((t) => done[t.id]).length;
  const personaConsigliato = tasks.length ? tasks[0].persona : 'elena';
  const completato = tasks.length > 0 && fatti === tasks.length;

  // Cuorino commenta le attività del giorno con frasi motivazionali.
  const [mascot, setMascot] = useState(() => {
    if (tasks.length === 0)
      return { text: 'Completa il questionario per sbloccare i compiti giornalieri.', mood: 'happy' };
    if (completato)
      return { text: 'Tutto fatto per oggi. Sei grande!', mood: 'cheer' };
    return { text: 'Ecco le attività di oggi. Fai quello che puoi, quando puoi.', mood: 'happy' };
  });

  return (
    <section className="oggi">
      <h2>Le attività di oggi</h2>
      <p className="lead">
        Ogni giorno BREAKAPP ti propone attività diverse, scelte in base alle tue risposte. Piccoli
        passi, tutti i giorni.
      </p>

      <MascotBubble mood={mascot.mood} size={64}>
        {mascot.text}
      </MascotBubble>

      <div className="daily-date">{key}</div>

      {!todayDone && (
        <div className="daily-prompt">
          <p>
            Non hai ancora risposto a <strong>come ti senti oggi?</strong>. Fallo per adattare i
            compiti alle tue risposte del momento.
          </p>
          <button className="primary small" onClick={onDaily}>
            Come ti senti oggi?
          </button>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="muted">Nessun compito disponibile.</p>
      ) : (
        <ul className="attivita daily-tasks">
          {tasks.map((t) => {
            const on = !!done[t.id];
            return (
              <li key={t.id}>
                <label className={`check ${on ? 'on' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(t.id)} />
                  <span className="tick" aria-hidden="true" />
                  <span className="txt">{t.text}</span>
                </label>
                <span className="daily-mod">{t.modulo}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="daily-foot">
        <span>
          {fatti}/{tasks.length} fatti oggi
        </span>
        {tasks.length > 0 && (
          <button className="ghost small" onClick={() => onChatWith(personaConsigliato)}>
            Parla con {PERSONAS[personaConsigliato].name}
          </button>
        )}
      </div>
    </section>
  );
}
