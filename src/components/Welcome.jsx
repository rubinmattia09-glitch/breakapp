import React from 'react';
import { CRISI } from '../lib/pathway.js';

export default function Welcome({ todayDone, onDaily, onOggi }) {
  return (
    <section className="welcome">
      {!todayDone && (
        <div className="daily-prompt home-prompt">
          <p>
            Prima di iniziare, rispondi a <strong>come ti senti oggi?</strong>: serve a BREAKAPP per
            proporirti i compiti giusti per come stai in questo momento.
          </p>
          <button className="primary small" onClick={onDaily}>
            Come ti senti oggi?
          </button>
        </div>
      )}

      <div className="hero">
        <svg className="logo-heart" viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <radialGradient id="hg" cx="38%" cy="28%" r="82%">
              <stop offset="0" stopColor="#ff8a96" />
              <stop offset="55%" stopColor="#ec465c" />
              <stop offset="100%" stopColor="#bd1f33" />
            </radialGradient>
            <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f6e7cb" />
              <stop offset="100%" stopColor="#e3caa3" />
            </linearGradient>
            <filter id="ds" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#9c1626" flood-opacity="0.35" />
            </filter>
            <clipPath id="bclip">
              <rect className="bclip-rect" x="30" y="50" width="0" height="20" />
            </clipPath>
          </defs>
          <path
            className="heart-shape"
            d="M60 102 C 60 102 16 74 16 46 C 16 30 28 22 40 22 C 50 22 57 28 60 36 C 63 28 70 22 80 22 C 92 22 104 30 104 46 C 104 74 60 102 60 102 Z"
            fill="url(#hg)" filter="url(#ds)"
          />
          <ellipse cx="43" cy="40" rx="15" ry="9" fill="#ffffff" opacity="0.22" transform="rotate(-25 43 40)" />
          <path
            className="crack"
            d="M60 38 L52 54 L65 68 L55 84 L62 98"
            fill="none" stroke="#8f1f30" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          />
          <g className="bandage" clipPath="url(#bclip)">
            <rect x="30" y="53" width="60" height="14" rx="7" fill="url(#bg)" stroke="#cdb089" strokeWidth="1.4" />
            <rect x="49" y="53" width="22" height="14" rx="5" fill="#f7ecd7" />
            <line x1="34" y1="60" x2="86" y2="60" stroke="#cdb089" strokeWidth="1" opacity="0.6" />
            <line x1="55" y1="55.5" x2="65" y2="55.5" stroke="#cdb089" strokeWidth="1" />
            <line x1="55" y1="64.5" x2="65" y2="64.5" stroke="#cdb089" strokeWidth="1" />
          </g>
        </svg>
        <h1 className="logo">BREAK<span>APP</span></h1>
        <p className="sub">
          Un compagno che ti accompagna dopo la fine di una relazione, passo dopo passo, finché non ti
          senti di nuovo intero/a. Un percorso fatto su misura, e qualcuno con cui parlare quando vuoi.
        </p>
        <button className="primary" onClick={todayDone ? onOggi : onDaily}>
          {todayDone ? 'I compiti di oggi' : 'Come ti senti oggi?'}
        </button>
      </div>

      <div className="cards">
        <div className="card">
          <span className="card-ico">📝</span>
          <h3>Questionario breve</h3>
          <p>Due domande fisse all'inizio, più un check quotidiano per adattare il percorso.</p>
        </div>
        <div className="card">
          <span className="card-ico">🌱</span>
          <h3>Percorso che ti segue</h3>
          <p>Tappe ed esercizi scelti per te, da spuntare al tuo ritmo finché guarisci.</p>
        </div>
        <div className="card">
          <span className="card-ico">💬</span>
          <h3>Assistenti e guida</h3>
          <p>Tre stili diversi, creati dall'IA, con cui chattare quando hai bisogno di parole. Non sono psicologi: ti stanno vicino, non fanno diagnosi.</p>
        </div>
      </div>

      <div className="disclaimer">
        <strong>Questa app non è terapia.</strong> Offre compagnia e strumenti di auto-cura, ma non
        sostituisce uno psicologo, uno psichiatra o il pronto soccorso. Se in questo momento stai
        male davvero, parla con qualcuno adesso:
        <ul className="crisi-list">
          {CRISI.map((c) => (
            <li key={c.numero}>
              <strong>{c.nome}:</strong> {c.numero}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
