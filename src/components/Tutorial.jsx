import React, { useState, useLayoutEffect, useEffect, useRef } from 'react';
import { MascotBubble } from './Mascot.jsx';

// Passi del tour del "percorso": ognuno punta a un elemento con una freccia.
// `line` è la battuta parlata da Cuorino, `mood` la sua espressione.
const PERCORSO_STEPS = [
  {
    selector: '.streak-box',
    placement: 'left',
    title: 'Obiettivo e streak',
    text: 'Qui vedi l’obiettivo che ti sei dato/a e quanti giorni di fila stai facendo gli esercizi. Non è una gara: ogni giorno conta.',
    line: 'Ciao! Sono Cuorino, e ti accompagno io. Guarda: questo è il tuo obiettivo e la tua streak!',
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
    text: 'Clicca sul cerchio per segnare un’attività come completata: si colora e la spunta appare al centro.',
    line: 'Spunta le attività qui: si colorano e la streak sale. Satisfying, vero?',
    mood: 'cheer',
  },
  {
    selector: '.ghost.small',
    placement: 'bottom',
    title: 'Parla con un assistente',
    text: 'Ogni tappa ti suggerisce un assistente e guida AI. Tocca qui per aprire subito la chat con quello giusto per l’argomento.',
    line: 'Serve parlare con qualcuno? Tocca qui per l’assistente giusto.',
    mood: 'think',
  },
  {
    selector: '.actions .primary',
    placement: 'top',
    title: 'La chat è sempre qui',
    text: 'In qualsiasi momento puoi aprire la chat con uno dei tre assistenti, rifare il questionario o ricominciare da zero da qui.',
    line: 'La chat è sempre a portata di clic. Io resto qui a fare il tifo. Ci sei?',
    mood: 'happy',
  },
];

// Passi del tour della CHAT: spiega che non sono dottori ma assistenti/guide AI.
export const CHAT_STEPS = [
  {
    selector: '.persona-bar',
    placement: 'bottom',
    title: 'Non sono dottori',
    text: 'Elena, Marco e Sofia sono assistenti e guide create dall’intelligenza artificiale. Non sono psicologi né psichiatri: non fanno diagnosi né prescrizioni. Sono qui per starti vicino quando vuoi parlare.',
    line: 'Ciao! Sono Cuorino. Prima di tutto una cosa importante: loro non sono dottori!',
    mood: 'think',
  },
  {
    selector: '.composer',
    placement: 'top',
    title: 'Scrivi come ti senti',
    text: 'Scrivi qui sotto, o tocca una delle frasi d’esempio. La conversazione resta solo nel tuo dispositivo: nessun dato lascia il tuo telefono o computer.',
    line: 'Scrivi pure come stai. Quello che dici resta solo qui, sul tuo dispositivo.',
    mood: 'happy',
  },
  {
    selector: '.mem-btn',
    placement: 'left',
    title: 'Memoria locale',
    text: 'Tocca qui per far ricordare all’assistente i punti importanti delle vostre chiacchierate. Tutto resta sul tuo dispositivo: puoi cancellarlo quando vuoi.',
    line: 'Vuoi che l’assistente si ricordi di te? Premi qui: la memoria resta solo sul tuo dispositivo.',
    mood: 'cheer',
  },
];

export default function Tutorial({ steps = PERCORSO_STEPS, onClose }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [tip, setTip] = useState({ w: 300, h: 150 });
  const tipRef = useRef(null);

  const measure = () => {
    const el = document.querySelector(steps[step].selector);
    if (!el) {
      // se l'elemento non c'è, salta al passo successivo
      setStep((s) => (s < steps.length - 1 ? s + 1 : s));
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
  const { placement, title, text, line, mood } = steps[step];
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

  const total = steps.length;
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
              className="ghost small back-arrow"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              aria-label="Torna indietro"
            >
              ←
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
