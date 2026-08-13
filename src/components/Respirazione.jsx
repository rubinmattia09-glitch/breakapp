import React, { useState, useEffect, useRef } from 'react';

// Esercizio di respirazione per ansia/panico: un cerchio rosso che si allarga
// durante l'inspirazione e si restringe durante l'espirazione. L'espirazione è
// più lunga dell'inspirazione perché aiuta il sistema parasimpatico a calmarsi.
// Fasi (durata in ms) e scala del cerchio per ogni fase.
const PHASES = [
  { key: 'inspira', label: 'Inspira', dur: 4000, scale: 1 },
  { key: 'trattieni', label: 'Trattieni', dur: 2000, scale: 1 },
  { key: 'espira', label: 'Espira', dur: 6000, scale: 0.55 },
  { key: 'riposa', label: 'Riposa', dur: 1000, scale: 0.55 },
];

export default function Respirazione({ onBack }) {
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [audio, setAudio] = useState(false);
  const timerRef = useRef(null);

  // Parla la fase corrente (voce del browser, italiano) se l'opzione è attiva.
  const speak = (text) => {
    if (!audio) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'it-IT';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      }
    } catch {
      /* voce non disponibile: ignoriamo */
    }
  };

  // Avanza tra le fasi finché l'esercizio è in esecuzione.
  useEffect(() => {
    if (!running) return;
    const phase = PHASES[phaseIdx];
    speak(phase.label);
    timerRef.current = setTimeout(() => {
      setPhaseIdx((i) => (i + 1) % PHASES.length);
    }, phase.dur);
    return () => clearTimeout(timerRef.current);
  }, [running, phaseIdx, audio]);

  // Ferma tutto se si esce dalla schermata.
  useEffect(
    () => () => {
      try {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      } catch {
        /* noop */
      }
    },
    []
  );

  const start = () => {
    setPhaseIdx(0);
    setRunning(true);
  };
  const stop = () => {
    setRunning(false);
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch {
      /* noop */
    }
  };

  const phase = PHASES[phaseIdx];
  const scale = running ? phase.scale : 0.55;
  const label = running ? phase.label : 'Pronto?';

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

      <div className="breath-stage">
        <div className="breath-label">{label}</div>
        <div
          className="breath-circle"
          style={{ transform: `scale(${scale})`, transitionDuration: `${phase.dur}ms` }}
          aria-hidden="true"
        />
      </div>

      <div className="resp-controls">
        {!running ? (
          <button className="primary" type="button" onClick={start}>
            Inizia
          </button>
        ) : (
          <button className="ghost" type="button" onClick={stop}>
            Ferma
          </button>
        )}
        <label className="resp-audio" title="Fai leggere le fasi a voce alta">
          <input
            type="checkbox"
            checked={audio}
            onChange={(e) => setAudio(e.target.checked)}
          />
          🔊 Voce guida
        </label>
      </div>

      <p className="resp-note">
        Questo esercizio aiuta a ritrovare il respiro, ma non sostituisce un medico o uno psicologo.
        Se è un&apos;emergenza chiama il <strong>112 / 118</strong>.
      </p>
    </section>
  );
}
