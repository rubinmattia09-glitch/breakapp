import React, { useState } from 'react';
import { registerUser, verifyUser, setSession } from '../lib/storage.js';

// Schermata di accesso: login o registrazione. Alla registrazione servono
// nome, nome utente e password; al termine si richiama onRegister(username, name)
// per passare alle domande del profilo (Q1-2). Al login si richiama onLogin(username).
export default function Auth({ onLogin, onRegister }) {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const u = username.trim();
    if (!u) return setError('Inserisci un nome utente.');
    if (!password) return setError('Inserisci la password.');

    setBusy(true);
    try {
      if (tab === 'register') {
        const res = await registerUser({ username: u, name, password });
        if (!res.ok) {
          setBusy(false);
          return setError(res.error);
        }
        onRegister(u, name.trim() || u);
      } else {
        const ok = await verifyUser(u, password);
        if (!ok) {
          setBusy(false);
          return setError('Nome utente o password non corretti.');
        }
        setSession(u);
        onLogin(u);
      }
    } catch {
      setError('Qualcosa è andato storto. Riprova.');
    } finally {
      setBusy(false);
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setError('');
  };

  return (
    <section className="auth">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={tab === 'login' ? 'sel' : ''}
            onClick={() => switchTab('login')}
          >
            Accedi
          </button>
          <button
            type="button"
            className={tab === 'register' ? 'sel' : ''}
            onClick={() => switchTab('register')}
          >
            Registrati
          </button>
        </div>

        <h2>{tab === 'register' ? 'Crea il tuo account' : 'Bentornato/a'}</h2>
        <p className="lead">
          {tab === 'register'
            ? 'Ti serve un account per salvare il tuo percorso e restare connesso. Nessun dato lascia questo dispositivo.'
            : 'Accedi per ritrovare il tuo percorso, i tuoi compiti e le tue conversazioni.'}
        </p>

        <form className="auth-form" onSubmit={submit}>
          {tab === 'register' && (
            <label className="field">
              <span>Nome (come vuoi essere chiamato/a)</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Mauro"
                autoComplete="name"
              />
            </label>
          )}

          <label className="field">
            <span>Nome utente</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Scegli un nome utente"
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Almeno 4 caratteri"
              autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
            />
          </label>

          {tab === 'register' && (
            <label className="field">
              <span>Ripeti la password</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Stessa password di sopra"
                autoComplete="new-password"
              />
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="primary" type="submit" disabled={busy}>
            {busy
              ? 'Attendi…'
              : tab === 'register'
                ? 'Registrati e continua'
                : 'Accedi'}
          </button>
        </form>
      </div>
    </section>
  );
}
