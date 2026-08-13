import React, { useState, useEffect, useRef, useMemo } from 'react';
import { buildPhases, DEFAULT_PATTERN, describePattern } from '../lib/breathing.js';

// Esercizio di respirazione per ansia/panico: un cerchio rosso che si allarga
// durante l'inspirazione e si restringe durante l'espirazione. L'espirazione è
// più lunga dell'inspirazione perché aiuta il sistema parasimpatico a calmarsi.
//
// `pattern` (opzionale) permette di adattare il ritmo a un'attività specifica:
//   { inhale, hold, exhale, rest, cycles }  (durate in ms, cycles=0 = illimitato).
// Se non passato, si usa il ritmo "calmante" di default.
export default function Respirazione({ pattern, onBack }) {
  const effPattern = pattern || DEFAULT_PATTERN;
  const phases = useMemo(() => buildPhases(effPattern), [effPattern]);
  const limited = effPattern.cycles > 0;

  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [cyclesDone, setCyclesDone] = useState(0);
  const timerRef = useRef(null);

  // Avanza tra le fasi finché l'esercizio è in esecuzione. Ad ogni giro completo
  // (tornando alla fase 0) conta un "respiro"; se il pattern è limitato, ci si
  // ferma al raggiungimento del numero di cicli richiesto dall'attività.
  useEffect(() => {
    if (!running) return;
    const phase = phases[phaseIdx];
    timerRef.current = setTimeout(() => {
      const nextIdx = (phaseIdx + 1) % phases.length;
      if (nextIdx === 0) {
        const nc = cyclesDone + 1;
        setCyclesDone(nc);
        if (limited && nc >= effPattern.cycles) {
          setRunning(false);
          setPhaseIdx(0);
          return;
        }
      }
      setPhaseIdx(nextIdx);
    }, phase.dur);
    return () => clearTimeout(timerRef.current);
  }, [running, phaseIdx, phases, cyclesDone, limited, effPattern.cycles]);

  const start = () => {
    setCyclesDone(0);
    setPhaseIdx(0);
    setRunning(true);
  };
  const stop = () => {
    setRunning(false);
  };

  const completed = limited && cyclesDone >= effPattern.cycles && !running;
  const phase = phases[phaseIdx];
  const scale = running ? phase.scale : 0.55;
  const label = running ? phase.label : completed ? 'Fatto!' : 'Pronto?';

  return (
    <section className="respirazione">
      <div className="resp-head">
        <button className="ghost small" type="button" onClick={onBack}>
          ← Indietro
        </button>
        <h2>Respirazione calmante</h2>
      </div>

      <p className="lead">
        Quando senti salire l&apos;ansia o il panico, fermati un attimo. Segui il cerchio:{' '}
        <strong>inspira</strong> mentre si allarga, <strong>espira</strong> mentre si restringe.
        L&apos;espirazione è più lunga, per aiutarti a ritrovare la calma.
      </p>

      {pattern && (
        <p className="resp-pattern">
          <strong>Ritmo dell&apos;attività:</strong> {describePattern(effPattern)}
        </p>
      )}

      <div className="breath-stage">
        <div className="breath-label" aria-live="polite">
          {label}
        </div>
        <div
          className="breath-circle"
          style={{ transform: `scale(${scale})`, transitionDuration: `${phase.dur}ms` }}
          aria-hidden="true"
        />
        {limited && (
          <div className="resp-counter" aria-live="polite">
            {completed
              ? `Hai completato ${effPattern.cycles} respiri 🎉`
              : `Respiro ${cyclesDone + (running ? 1 : 0)} / ${effPattern.cycles}`}
          </div>
        )}
      </div>

      <div className="resp-controls">
        {!running ? (
          <button className="primary" type="button" onClick={start}>
            {completed ? 'Rifai' : 'Inizia'}
          </button>
        ) : (
          <button className="ghost" type="button" onClick={stop}>
            Ferma
          </button>
        )}
      </div>

      <p className="resp-note">
        Questo esercizio aiuta a ritrovare il respiro, ma non sostituisce un medico o uno psicologo.
        Se è un&apos;emergenza chiama il <strong>112 / 118</strong>.
      </p>
    </section>
  );
}
