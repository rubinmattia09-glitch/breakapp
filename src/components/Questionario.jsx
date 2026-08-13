import React, { useState } from 'react';

// Questionario parametrizzato: riceve le domande come prop e restituisce le
// risposte grezze a onComplete(answers). Chi chiama decide cosa farne
// (es. calcolare il percorso, salvare il profilo, ecc.).
// `hideMultiCheck` toglie la spunta ✓ dalle domande a risposta multipla,
// lasciando solo l'evidenziazione (come nelle domande a scelta singola).
export default function Questionario({ domande, title, cta = 'Crea il mio percorso', onComplete, onBack, hideMultiCheck }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const d = domande[step];
  const total = domande.length;
  const value = answers[d.id];

  const choose = (v) => setAnswers((a) => ({ ...a, [d.id]: v }));
  const toggle = (v) =>
    setAnswers((a) => {
      const cur = a[d.id] || [];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      return { ...a, [d.id]: next };
    });

  const answered = d.type === 'multi' ? (value || []).length > 0 : value !== undefined;
  const last = step === total - 1;
  const single = total === 1;

  const next = () => {
    if (!answered) return;
    if (last) onComplete(answers);
    else setStep(step + 1);
  };

  return (
    <section className="quiz">
      {title && <h2 className="quiz-title">{title}</h2>}
      <div className="progress">
        <div className="bar" style={{ width: `${((step + 1) / total) * 100}%` }} />
        <span>
          {step + 1} / {total}
        </span>
      </div>

      <h2>{d.q}</h2>
      {d.hint && <p className="hint">{d.hint}</p>}

      <div className="options">
        {d.type === 'single' &&
          d.options.map((o) => (
            <button
              key={o.value}
              className={`opt ${value === o.value ? 'sel' : ''}`}
              onClick={() => choose(o.value)}
            >
              {o.label}
            </button>
          ))}

        {d.type === 'multi' &&
          d.options.map((o) => {
            const on = (value || []).includes(o.value);
            return (
              <button key={o.value} className={`opt ${on ? 'sel' : ''}`} onClick={() => toggle(o.value)}>
                {hideMultiCheck ? (
                  o.label
                ) : (
                  <>
                    <span className="check">{on ? '✓' : ''}</span> {o.label}
                  </>
                )}
              </button>
            );
          })}

        {d.type === 'scale' &&
          d.options.map((n) => (
            <button key={n} className={`scale ${value === n ? 'sel' : ''}`} onClick={() => choose(n)}>
              {n}
            </button>
          ))}
      </div>

      <div className="actions">
        {onBack && (
          <button className="ghost" onClick={onBack}>
            Indietro
          </button>
        )}
        <button className="primary" disabled={!answered} onClick={next}>
          {last ? cta : single ? cta : 'Avanti'}
        </button>
      </div>
    </section>
  );
}
