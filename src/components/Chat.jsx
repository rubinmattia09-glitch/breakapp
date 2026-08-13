import React, { useState, useRef, useEffect } from 'react';
import { PERSONA_LIST, PERSONAS } from '../data/personas.js';
import { CRISI } from '../lib/pathway.js';
import {
  loadChat,
  saveChat,
  loadMemoryProfile,
  saveMemoryProfile,
} from '../lib/storage.js';

const MAX_CTX = 30; // massimo numero di messaggi inviati al modello (il resto vive nel profilo)

const APERTURE = [
  'Oggi non sto bene e non so da dove iniziare.',
  'Continuo a pensare a cosa ho sbagliato.',
  'Ho paura di non superare questo momento.',
  'Mi manca, anche se so che era giusto chiudere.',
];

export default function Chat({ user, crisi, initialPersona = 'elena' }) {
  const [persona, setPersona] = useState(initialPersona);
  const [messages, setMessages] = useState(() => loadChat(user, initialPersona) || []);
  const [profile, setProfile] = useState(() => loadMemoryProfile(user, initialPersona));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [slow, setSlow] = useState(false);
  const [savedFlash, setSavedFlash] = useState('');
  const endRef = useRef(null);
  const ctrlRef = useRef(null);
  const slowTimerRef = useRef(null);
  // ref sempre aggiornati, usati nella cleanup allo smontaggio
  const personaRef = useRef(persona);
  const messagesRef = useRef(messages);
  const profileRef = useRef(profile);
  personaRef.current = persona;
  messagesRef.current = messages;
  profileRef.current = profile;

  useEffect(() => {
    endRef.current && endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Salva la cronologia localmente a ogni nuovo messaggio (per ripresa futura).
  useEffect(() => {
    saveChat(user, persona, messages);
  }, [messages, persona, user]);

  // Aggiorna il profilo riassuntivo presso il modello (fire-and-forget).
  const updateMemory = async (pid, msgs, prof) => {
    if (!msgs || msgs.length < 2) return;
    try {
      const r = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, persona: pid, profile: prof || '' }),
      });
      const data = await r.json();
      if (data && data.profile) {
        saveMemoryProfile(user, pid, data.profile);
        if (pid === personaRef.current) setProfile(data.profile);
      }
    } catch {
      /* la memoria non è critica: ignoriamo gli errori */
    }
  };

  // Alla chiusura della chat, salva la memoria della sessione corrente.
  useEffect(() => {
    return () => {
      updateMemory(personaRef.current, messagesRef.current, profileRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async (text) => {
    const content = (text || input).trim();
    if (!content || busy) return;
    const userMsg = { role: 'user', content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError('');
    setSlow(false);
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    slowTimerRef.current = setTimeout(() => setSlow(true), 18000);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Invia solo gli ultimi MAX_CTX messaggi (il resto è nel profilo/profilo)
        body: JSON.stringify({ messages: next.slice(-MAX_CTX), persona, memory: profile }),
        signal: ctrl.signal,
      });
      const data = await r.json();
      if (!r.ok) {
        const e = data && data.error;
        const msg = (typeof e === 'string' && e) || (e && e.message) || 'Risposta non valida dal server.';
        throw new Error(msg);
      }
      // Estrai il testo in modo robusto: il campo content può essere stringa,
      // array di parti [{type:'text', text:'...'}] oppure oggetto, a seconda del provider.
      const choice = data && data.choices && data.choices[0];
      const m = choice && choice.message;
      let reply = '';
      if (m) {
        const c = m.content;
        if (typeof c === 'string') {
          reply = c;
        } else if (Array.isArray(c)) {
          reply = c
            .map((p) => (p && (typeof p.text === 'string'
              ? p.text
              : typeof p.content === 'string' ? p.content : '')) || '')
            .join('')
            .trim();
        } else if (c && typeof c === 'object') {
          const t = c.text || c.content;
          if (typeof t === 'string') reply = t;
        }
      }
      if (!reply) {
        if (m && Array.isArray(m.tool_calls) && m.tool_calls.length) {
          reply = '(il modello ha restituito una chiamata a strumenti, nessun testo)';
        } else {
          reply = '(nessuna risposta)';
        }
      }
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      if (e && e.name === 'AbortError') {
        setError('Richiesta annullata.');
      } else {
        setError(e && e.message ? e.message : 'Errore di rete.');
      }
    } finally {
      clearTimeout(slowTimerRef.current);
      setBusy(false);
      setSlow(false);
      ctrlRef.current = null;
    }
  };

  const cancel = () => {
    if (ctrlRef.current) ctrlRef.current.abort();
  };

  // Cambio di personaggio: aggiorna la memoria di quello vecchio e carica
  // cronologia + profilo di quello nuovo, così ognuno "ti conosce".
  const switchPersona = (next) => {
    if (next === persona) return;
    updateMemory(persona, messages, profile);
    setPersona(next);
    setMessages(loadChat(user, next) || []);
    setProfile(loadMemoryProfile(user, next));
    setInput('');
    setError('');
    setSavedFlash('');
  };

  const saveMemoryNow = () => {
    setSavedFlash('Aggiorno la memoria…');
    updateMemory(persona, messages, profile).then(() => {
      setSavedFlash('Memoria salvata ✓');
      setTimeout(() => setSavedFlash(''), 2500);
    });
  };

  return (
    <section className="chat">
      <div className="persona-bar">
        <span className="label">Con chi vuoi parlare?</span>
        <div className="personas">
        {PERSONA_LIST.map((p) => (
          <button
            key={p.id}
            className={`persona ${persona === p.id ? 'sel' : ''}`}
            onClick={() => switchPersona(p.id)}
            title={p.tone}
          >
            <strong>{p.name}</strong>
            <small>{p.style}</small>
          </button>
        ))}
        <button type="button" className="ghost small mem-btn" onClick={saveMemoryNow} title="Aggiorna ciò che l'assistente ricorda di te">
          💾 Salva memoria
        </button>
        </div>
        <p className="persona-tone">{PERSONAS[persona].tone}</p>
        {profile && (
          <p className="mem-note">
            🧠 Questo psicologo ricorda le tue conversazioni passate (memoria locale sul tuo dispositivo).
          </p>
        )}
        {savedFlash && <p className="mem-flash">{savedFlash}</p>}
      </div>

      {crisi && (
        <div className="crisis-banner small">
          <strong>Ricorda:</strong> se in questo momento provi pensieri di farti del male, chiama
          subito il 112 / 118 o il Telefono Amico 199 284 284.
        </div>
      )}

      <div className="messages">
        {messages.length === 0 && (
          <div className="empty">
            <p>Scrivi qui sotto, o usa una di queste aperture:</p>
            <div className="aperture">
              {APERTURE.map((a) => (
                <button key={a} className="chip" onClick={() => send(a)}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="msg assistant">
            <div className="bubble typing">…</div>
          </div>
        )}
        {busy && slow && (
          <div className="slow-hint">
            Sto ancora pensando… la prima risposta del modello locale può richiedere fino a un paio di
            minuti (sta caricando il modello in memoria).{' '}
            <button type="button" className="link" onClick={cancel}>
              Annulla
            </button>
          </div>
        )}
        {error && <div className="msg error"><div className="bubble">{error}</div></div>}
        <div ref={endRef} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrivi quello che senti…"
          disabled={busy}
        />
        <button className="primary" type="submit" disabled={busy || !input.trim()}>
          Invia
        </button>
      </form>
    </section>
  );
}
