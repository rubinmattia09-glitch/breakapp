import React, { useState, useMemo } from 'react';
import { buildCircuit, VOGLIA, DIFFICOLTA } from '../lib/movimento.js';

// Scorciatoia "Movimento": come la respirazione, ma con un circuito a corpo
// libero. L'utente sceglie quanta voglia ha oggi (la "voglia" cambia il giro)
// e la difficoltà (facile / intermedio / difficile). Ogni giro ha comunque
// riscaldamento e defaticamento e attiva tutto il corpo.
export default function Movimento({ onBack }) {
  const [voglia, setVoglia] = useState('media');
  const [diff, setDiff] = useState(null);
  const [seed, setSeed] = useState(1);

  const circuit = useMemo(
    () => (diff ? buildCircuit({ difficolta: diff, voglia, seed }) : null),
    [diff, voglia, seed]
  );

  const diffLabel = (id) => (DIFFICOLTA.find((d) => d.id === id) || {}).label || id;

  return (
    <section className="movimento">
      <div className="resp-head">
        <button className="ghost small" type="button" onClick={onBack}>
          ← Indietro
        </button>
        <h2>Movimento di oggi</h2>
      </div>

      <p className="lead">
        Un circuito a corpo libero per attivare tutto il corpo, con riscaldamento e defaticamento.
        Scegli quanta voglia hai oggi: il giro cambia di conseguenza. Nessun attrezzo, solo il tuo corpo.
      </p>

      <div className="voglia-row" role="group" aria-label="Quanta voglia hai oggi">
        {VOGLIA.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`chip voglia ${voglia === v.id ? 'on' : ''}`}
            onClick={() => setVoglia(v.id)}
          >
            <span className="voglia-emoji">{v.emoji}</span>
            <span className="voglia-label">{v.label}</span>
            <span className="voglia-note">{v.note}</span>
          </button>
        ))}
      </div>

      {!diff && (
        <div className="diff-grid">
          {DIFFICOLTA.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`diff-card diff-${d.id}`}
              onClick={() => setDiff(d.id)}
            >
              <span className="diff-emoji">{d.emoji}</span>
              <span className="diff-label">{d.label}</span>
            </button>
          ))}
        </div>
      )}

      {diff && circuit && (
        <div className="circuit">
          <div className="circuit-meta">
            <span className={`pill diff-${diff}`}>{diffLabel(diff)}</span>
            <span className="pill">{circuit.rounds} giri</span>
            <span className="pill">{circuit.durata}</span>
          </div>
          <p className="circuit-rule">
            Ogni esercizio: <strong>{circuit.work}</strong>. Tra uno e l’altro <strong>{circuit.rest}</strong>.
            Ripeti tutto il giro <strong>{circuit.rounds} volte</strong>.
          </p>

          <h3>Riscaldamento</h3>
          <ol className="ex-list">
            {circuit.warmup.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ol>

          <h3>Circuito (corpo intero)</h3>
          <ol className="ex-list circuit-items">
            {circuit.circuit.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ol>

          <h3>Defaticamento</h3>
          <ol className="ex-list">
            {circuit.cooldown.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ol>

          <div className="resp-controls">
            <button type="button" className="ghost" onClick={() => setDiff(null)}>
              ← Scegli difficoltà
            </button>
            <button type="button" className="primary" onClick={() => setSeed((s) => s + 1)}>
              ↻ Un altro giro
            </button>
          </div>
        </div>
      )}

      <p className="resp-note">
        Muoviti con gentilezza: se qualcosa fa male, fermati. Questo non è allenamento medico, ma una
        piccola cura per il corpo dopo una giornata pesante.
      </p>
    </section>
  );
}
