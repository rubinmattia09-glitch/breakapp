import React, { useState, useLayoutEffect, useEffect, useRef } from 'react';
import { MascotBubble } from './Mascot.jsx';

// Passi del tour: ognuno punta a un elemento di "Il tuo percorso" con una freccia.
// `line` è la battuta parlata da Cuorino, `mood` la sua espressione.
const STEPS = [
  {
    selector: '.ring',
    placement: 'left',
    title: 'La metro di guarigione',
    text: 'Questo anello mostra a che punto sei: si riempie man mano che completi le attività. Non è una gara, vai al tuo ritmo.',
    line: 'Ciao! Sono Cuorino, e ti accompagno io. Guarda: questa è la tua metro di guarigione!',
    mood: 'cheer',
  },
  {
    selector: '.timeline',
    placement: 'top',
    title: 'Il percorso, tappa dopo tappa',
    text: 'Le tappe sono scelte per te in base alle risposte. Ogni tappa ha un argomento (respiro, rabbia, sonno…) e delle attività da fare quando vuoi.',
    line: 'Qui vedi il percorso, tappa dopo tappa. Una cosa alla volta, ok?',
    mood: 'happy',
  },
  {
    selector: '.attivita li:first-child .check',
    placement: 'right',
    title: 'Spunta le attività fatte',
    text: 'Clicca sul cerchio per segnare un’attività come completata: si colora e la spunta appare al centro. Così la metro sale piano piano.',
    line: 'Spunta le attività qui: si colorano e la metro sale. Satisfying, vero?',
    mood: 'cheer',
  },
  {
    selector: '.ghost.small',
    placement: 'bottom',
    title: 'Parla con uno psicologo',
    text: 'Ogni tappa ti suggerisce uno psicologo AI. Tocca qui per aprire subito la chat con quello giusto per l’argomento.',
    line: 'Serve parlare con qualcuno? Tocca qui per lo psicologo giusto.',
    mood: 'think',
  },
  {
    selector: '.actions .primary',
    placement: 'top',
    title: 'La chat è sempre qui',
    text: 'In qualsiasi momento puoi aprire la chat con uno dei tre psicologi, rifare il questionario o ricominciare da zero da qui.',
    line: 'La chat è sempre a portata di clic. Io resto qui a fare il tifo. Ci sei?',
    mood: 'happy',
  },
];

export default function Tutorial({ onClose }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [tip, setTip] = useState({ w: 300, h: 150 });
  const tipRef = useRef(null);

  const measure = () => {
    const el = document.querySelector(STEPS[step].selector);
    if (!el) {
      // se l'elemento non c'è, salta al passo successivo
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: 'auto' });
    setRect(el.getBoundingClientRect());
  };

  useLayoutEffect(() => {
    measure();
    const id = requestAnimationFrame(() => {
      if (tipRef.current) setTip({ w: tipRef.current.offsetWidth, h: tipRef.current.offsetHeight });
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    const onR = () => measure();
    window.addEventListener('resize', onR);
    window.addEventListener('scroll', onR, true);
    return () => {
      window.removeEventListener('resize', onR);
      window.removeEventListener('scroll', onR, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!rect) return null;

  const pad = 8;
  const gap = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const { placement, title, text, line, mood } = STEPS[step];
  const sr = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };

  let left = sr.left;
  let top = sr.top;
  let arrow = 'down';
  if (placement === 'top' || placement === 'bottom') {
    left = Math.min(Math.max(rect.left + rect.width / 2 - tip.w / 2, 10), vw - tip.w - 10);
    if (placement === 'top') {
      top = sr.top - gap - tip.h;
      arrow = 'down';
    } else {
      top = sr.top + sr.height + gap;
      arrow = 'up';
    }
  } else {
    if (placement === 'left') {
      left = sr.left - gap - tip.w;
      arrow = 'right';
    } else {
      left = sr.left + sr.width + gap;
      arrow = 'left';
    }
    top = Math.min(Math.max(rect.top + rect.height / 2 - tip.h / 2, 10), vh - tip.h - 10);
  }
  left = Math.min(Math.max(left, 10), vw - tip.w - 10);
  top = Math.min(Math.max(top, 10), vh - tip.h - 10);

  const total = STEPS.length;
  const last = step === total - 1;

  return (
    <div className="tut">
      <div
        className="tut-spot"
        style={{
          top: sr.top,
          left: sr.left,
          width: sr.width,
          height: sr.height,
          boxShadow: '0 0 0 9999px rgba(8,6,10,.62)',
        }}
      />
      <div ref={tipRef} className={`tut-card tut-${arrow}`} style={{ top, left }}>
        <span className="tut-arrow" />
        <MascotBubble mood={mood} size={56} className="tut-mascot">
          {line}
        </MascotBubble>
        <h4>{title}</h4>
        <p>{text}</p>
        <div className="tut-nav">
          <span>
            {step + 1}/{total}
          </span>
          <div>
            <button
              className="ghost small"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Indietro
            </button>
            {last ? (
              <button className="primary small" onClick={onClose}>
                Fine
              </button>
            ) : (
              <button className="primary small" onClick={() => setStep((s) => s + 1)}>
                Avanti
              </button>
            )}
            <button className="ghost small" onClick={onClose}>
              Salta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
