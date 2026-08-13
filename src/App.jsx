import React, { useState } from 'react';
import Welcome from './components/Welcome.jsx';
import Auth from './components/Auth.jsx';
import Questionario from './components/Questionario.jsx';
import Percorso from './components/Percorso.jsx';
import Chat from './components/Chat.jsx';
import Diario from './components/Diario.jsx';
import Oggi from './components/Oggi.jsx';
import Tutorial, { CHAT_STEPS } from './components/Tutorial.jsx';
import EmergencyPopup from './components/EmergencyPopup.jsx';
import Respirazione from './components/Respirazione.jsx';
import Bacheca from './components/Bacheca.jsx';
import { DOMANDE, DOMANDA_OBIETTIVO } from './data/questionario.js';
import { computePathway } from './lib/pathway.js';
import { dateKey } from './lib/dailytasks.js';
import {
  getCurrentUser,
  loadProfile,
  loadPath,
  saveProfile,
  savePath,
  saveDaily,
  saveLastDaily,
  isTodayQuestionnaireDone,
  clearAll,
  logout,
  loadTutorialSeen,
  saveTutorialSeen,
  loadObjective,
  saveObjective,
  loadChatTutorialSeen,
  saveChatTutorialSeen,
} from './lib/storage.js';

// Domande del profilo (una tantum, alla registrazione) e del questionario
// giornaliero (si ripete ogni giorno per adattare i compiti).
const DOMANDE_PROFILO = DOMANDE.slice(0, 2); // tempo, chi
const DOMANDE_GIORNALIERE = DOMANDE.slice(2); // dolore, sintomi, supporto, terapia, crisi

function loadSession(username) {
  const prof = loadProfile(username);
  const result = loadPath(username) || (prof ? computePathway({ ...prof }) : null);
  return { name: prof?.name || username, prof, result };
}

export default function App() {
  const [user, setUser] = useState(() => getCurrentUser());
  const [name, setName] = useState(() => {
    const u = getCurrentUser();
    return u ? (loadProfile(u)?.name || u) : '';
  });
  const [prof, setProf] = useState(() => {
    const u = getCurrentUser();
    return u ? loadProfile(u) : null;
  });
  const [result, setResult] = useState(() => {
    const u = getCurrentUser();
    if (!u) return null;
    const r = loadPath(u);
    if (r) return r;
    const p = loadProfile(u);
    return p ? computePathway({ ...p }) : null;
  });
  const [screen, setScreen] = useState(() => (getCurrentUser() ? 'welcome' : 'auth'));
  const [pending, setPending] = useState(null); // { user, name } durante la registrazione
  const [chatPersona, setChatPersona] = useState('elena');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showChatTutorial, setShowChatTutorial] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [respiraBack, setRespiraBack] = useState('welcome');

  const todayKey = dateKey(new Date());
  const todayDone = user ? isTodayQuestionnaireDone(user, todayKey) : true;

  // Domande del questionario giornaliero. Se l'utente non ha ancora scelto un
  // obiettivo, aggiungiamo la domanda sull'obiettivo (solo la prima volta).
  const effUser = user || (pending && pending.user);
  const needObjective = !!effUser && !loadObjective(effUser);
  const dailyDomande = needObjective
    ? [...DOMANDE_GIORNALIERE, DOMANDA_OBIETTIVO]
    : DOMANDE_GIORNALIERE;

  // --- Registrazione: passo 1 credenziali -> passo 2 profilo ---
  const handleRegister = (username, displayName) => {
    setPending({ user: username, name: displayName });
    setScreen('quiz-profilo');
  };

  // --- Profilo (Q1-2) salvato, si passa al questionario giornaliero del giorno 1 ---
  const handleProfilo = (answers) => {
    const u = pending.user;
    const p = { name: pending.name, ...answers };
    saveProfile(u, p);
    setProf(p);
    setPending((prev) => ({ ...prev, prof: p }));
    setScreen('quiz-giornaliero');
  };

  // --- Questionario giornaliero completato: ricalcola percorso + compiti del giorno ---
  const handleDaily = (answers) => {
    const u = user || (pending && pending.user);
    const full = { ...(prof || {}), ...answers };
    const r = computePathway(full);
    savePath(u, r);
    saveDaily(u, todayKey, { answers, done: {} });
    saveLastDaily(u, todayKey);
    if (answers.obiettivo) saveObjective(u, Number(answers.obiettivo));
    setUser(u);
    setName(pending ? pending.name : name);
    setResult(r);
    setScreen('oggi');
    // Se ha segnalato pensieri di autolesionismo, mostra il popup di emergenza.
    if (answers.crisi === 'a_volte' || answers.crisi === 'si') {
      setShowEmergency(true);
    }
  };

  // --- Login: carica profilo + percorso salvati ---
  const handleLogin = (username) => {
    const s = loadSession(username);
    setUser(username);
    setName(s.name);
    setProf(s.prof);
    setResult(s.result);
    setScreen('welcome');
    if (!loadTutorialSeen()) setShowTutorial(true);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setProf(null);
    setResult(null);
    setPending(null);
    setScreen('auth');
  };

  const handleReset = () => {
    if (!user) return;
    clearAll(user);
    setProf(null);
    setResult(null);
    setPending({ user, name });
    setScreen('quiz-profilo');
  };

  const openChatWith = (personaId) => {
    if (personaId) setChatPersona(personaId);
    setScreen('chat');
    if (!loadChatTutorialSeen()) setShowChatTutorial(true);
  };

  const closeChatTutorial = () => {
    setShowChatTutorial(false);
    saveChatTutorialSeen();
  };

  // Apre "Il tuo percorso" e, al primo accesso, fa partire il tutorial
  // con le frecce che spiegano le varie voci (se già visto, non ricompare).
  const goPercorso = () => {
    setScreen('percorso');
    if (!loadTutorialSeen()) setShowTutorial(true);
  };

  const closeTutorial = () => {
    setShowTutorial(false);
    saveTutorialSeen();
  };

  // Apre l'esercizio di respirazione, ricordandosi da dove veniamo (per il "Indietro").
  const openRespira = () => {
    setRespiraBack(screen);
    setScreen('respirazione');
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">BREAKAPP</div>
        {user && (
          <>
            {screen === 'chat' && (
              <button
                type="button"
                className="ghost small tut-help topbar-help"
                onClick={() => setShowChatTutorial(true)}
                title="Come funziona la chat con gli assistenti"
              >
                Come funziona?
              </button>
            )}
            <button
              className={`hamburger ${menuOpen ? 'open' : ''}`}
              aria-label="Apri il menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            {menuOpen && <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />}
            {menuOpen && (
              <div className="menu-panel" role="menu">
                <nav className="menu-list">
                  <button
                    className={screen === 'welcome' ? 'active' : ''}
                    onClick={() => {
                      setScreen('welcome');
                      setMenuOpen(false);
                    }}
                  >
                    Home
                  </button>
                  {result && (
                    <button
                      className={screen === 'oggi' ? 'active' : ''}
                      onClick={() => {
                        setScreen('oggi');
                        setMenuOpen(false);
                      }}
                    >
                      Oggi
                    </button>
                  )}
                  {result && (
                    <button
                      className={screen === 'percorso' ? 'active' : ''}
                      onClick={() => {
                        goPercorso();
                        setMenuOpen(false);
                      }}
                    >
                      Il tuo percorso
                    </button>
                  )}
                  {result && (
                    <button
                      className={screen === 'chat' ? 'active' : ''}
                      onClick={() => {
                        openChatWith();
                        setMenuOpen(false);
                      }}
                    >
                      Assistenti e guida
                    </button>
                  )}
                  <button
                    className={screen === 'diario' ? 'active' : ''}
                    onClick={() => {
                      setScreen('diario');
                      setMenuOpen(false);
                    }}
                  >
                    Diario
                  </button>
                  <button
                    className={screen === 'respirazione' ? 'active' : ''}
                    onClick={() => {
                      openRespira();
                      setMenuOpen(false);
                    }}
                  >
                    Respirazione
                  </button>
                  <button
                    className={screen === 'bacheca' ? 'active' : ''}
                    onClick={() => {
                      setScreen('bacheca');
                      setMenuOpen(false);
                    }}
                  >
                    Bacheca
                  </button>
                </nav>
                <div className="menu-foot">
                  <span className="who" title={user}>
                    {name || user}
                  </span>
                  <button
                    className="ghost small"
                    onClick={() => {
                      handleLogout();
                      setMenuOpen(false);
                    }}
                  >
                    Esci
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </header>

      <main className="main">
        {screen === 'auth' && <Auth onLogin={handleLogin} onRegister={handleRegister} />}

        {screen === 'welcome' && user && (
          <Welcome
            todayDone={todayDone}
            onDaily={() => setScreen('quiz-giornaliero')}
            onOggi={() => setScreen('oggi')}
            onRespira={openRespira}
          />
        )}

        {screen === 'quiz-profilo' && (
          <Questionario
            domande={DOMANDE_PROFILO}
            title="Prima di iniziare"
            cta="Avanti"
            onComplete={handleProfilo}
            onBack={() => setScreen('auth')}
          />
        )}

        {screen === 'quiz-giornaliero' && (
          <Questionario
            domande={dailyDomande}
            title="Come ti senti oggi?"
            cta="Salva e mostra i compiti"
            hideMultiCheck
            onComplete={handleDaily}
            onBack={pending ? () => setScreen('quiz-profilo') : () => setScreen('welcome')}
          />
        )}

        {screen === 'oggi' && user && result && (
          <Oggi
            key={todayKey}
            user={user}
            result={result}
            todayKey={todayKey}
            onChatWith={openChatWith}
            onDaily={() => setScreen('quiz-giornaliero')}
          />
        )}

        {screen === 'percorso' && user && result && (
          <Percorso
            user={user}
            result={result}
            onChat={() => openChatWith()}
            onChatWith={openChatWith}
            onRedo={() => setScreen('quiz-giornaliero')}
            onReset={handleReset}
            onHelp={() => setShowTutorial(true)}
          />
        )}

        {screen === 'chat' && user && result && (
          <Chat
            user={user}
            crisi={result.crisi}
            initialPersona={chatPersona}
          />
        )}

        {screen === 'diario' && user && <Diario user={user} />}

        {screen === 'respirazione' && <Respirazione onBack={() => setScreen(respiraBack)} />}

        {screen === 'bacheca' && <Bacheca onBack={() => setScreen('welcome')} />}
      </main>

      {showTutorial && screen === 'percorso' && <Tutorial onClose={closeTutorial} />}

      {showChatTutorial && screen === 'chat' && (
        <Tutorial steps={CHAT_STEPS} onClose={closeChatTutorial} />
      )}

      {showEmergency && (
        <EmergencyPopup
          onClose={() => setShowEmergency(false)}
          onRespira={() => {
            setShowEmergency(false);
            openRespira();
          }}
        />
      )}

      <footer className="footer">
        <strong>Nota importante:</strong> BREAKAPP è uno strumento di compagnia e cura di sé, non un
        sostituto di un professionista della salute mentale. In caso di emergenza chiama il 112 / 118.
      </footer>
    </div>
  );
}
