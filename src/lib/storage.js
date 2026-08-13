// Persistenza lato browser (localStorage). Nessun dato lascia il computer.
// Tutto è per-utente: ogni account ha il proprio profilo, percorso, diario,
// memoria delle chat e compiti giornalieri. La sessione resta attiva finché
// l'utente non si disconnette, così l'app "si ricorda" di chi è collegato.

// ---------- Chiavi ----------
const K_SESSION = 'dn_session'; // username corrente (stringa o null)
const K_USERS = 'dn_users'; // { username: { name, salt, hash } }
const K_PROF = 'dn_prof_'; // + username -> { name, tempo, chi }
const K_PATH = 'dn_path_'; // + username -> result (percorso)
const K_LASTDAILY = 'dn_lastdaily_'; // + username -> dateKey ultimo questionario
const K_DAILY = 'dn_daily_'; // + username + ':' + dateKey -> { answers, done }
const K_DIARIO = 'dn_diario_'; // + username -> [ { id, ts, text } ]
const K_PROGRESS = 'dn_progress_'; // + username -> { [moduleId]: {...} }
const K_TUTORIAL = 'dn_tutorial_seen'; // globale (tutorial percorso visto una volta)
const K_CHAT_TUTORIAL = 'dn_chat_tutorial_seen'; // globale (tutorial chat visto una volta)
const K_OBJECTIVE = 'dn_objective_'; // + username -> giorni (5/15/30)
const K_CHAT = 'dn_chat_'; // + username + ':' + personaId -> [ { role, content } ]
const K_MEMPROF = 'dn_memprof_'; // + username + ':' + personaId -> riassunto AI

// ---------- Account / sessione ----------
export function getCurrentUser() {
  try {
    return localStorage.getItem(K_SESSION) || null;
  } catch {
    return null;
  }
}

export function setSession(username) {
  if (username) localStorage.setItem(K_SESSION, username);
  else localStorage.removeItem(K_SESSION);
}

export function logout() {
  setSession(null);
}

export function userExists(username) {
  return Object.prototype.hasOwnProperty.call(loadUsers(), (username || '').trim());
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(K_USERS) || '{}');
  } catch {
    return {};
  }
}

function saveUsers(reg) {
  try {
    localStorage.setItem(K_USERS, JSON.stringify(reg));
  } catch {
    /* ignora */
  }
}

// Password mai in chiaro: salt casuale + SHA-256. La sicurezza è locale
// (protegge da occhiata allo storage del browser), non sostituisce un server.
async function hashPassword(password, salt) {
  const enc = new TextEncoder().encode(password + ':' + salt);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function makeSalt() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Chiama un endpoint del server. Se il server non risponde (dev/offline) lancia,
// così il chiamante può tornare al localStorage.
async function apiPost(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function registerUser({ username, name, password }) {
  username = (username || '').trim();
  if (!username) return { ok: false, error: 'Scegli un nome utente.' };
  if (!password || password.length < 4)
    return { ok: false, error: 'La password deve avere almeno 4 caratteri.' };
  // Prova il server (database SQLite). Se non risponde in modo sensato,
  // resta sul localStorage (modalità sviluppo / offline).
  try {
    const r = await apiPost('/api/auth/register', { username, name, password });
    const j = await r.json().catch(() => null);
    if (j && typeof j.ok === 'boolean') {
      if (j.ok) {
        setSession(username);
        return { ok: true };
      }
      return { ok: false, error: j.error || 'Registrazione non riuscita.' };
    }
    throw new Error('server'); // risposta non JSON (es. SPA fallback in dev) -> fallback
  } catch (e) {
    // Fallback: registrazione locale.
    if (userExists(username)) return { ok: false, error: 'Questo nome utente è già registrato.' };
    const salt = makeSalt();
    const hash = await hashPassword(password, salt);
    const reg = loadUsers();
    reg[username] = { name: (name || username).trim(), salt, hash };
    saveUsers(reg);
    setSession(username);
    return { ok: true };
  }
}

export async function verifyUser(username, password) {
  username = (username || '').trim();
  try {
    const r = await apiPost('/api/auth/login', { username, password });
    const j = await r.json().catch(() => null);
    if (j && typeof j.ok === 'boolean') return j.ok === true;
    throw new Error('server'); // risposta non JSON -> fallback localStorage
  } catch (e) {
    const u = loadUsers()[username];
    if (!u) return false;
    const hash = await hashPassword(password, u.salt);
    return hash === u.hash;
  }
}

// ---------- Profilo stabile (Q1-2: tempo + chi) ----------
export function loadProfile(username) {
  try {
    return JSON.parse(localStorage.getItem(K_PROF + username) || 'null');
  } catch {
    return null;
  }
}

export function saveProfile(username, prof) {
  if (prof) {
    try {
      localStorage.setItem(K_PROF + username, JSON.stringify(prof));
    } catch {
      /* ignora */
    }
  }
}

// ---------- Percorso (risultato del questionario, ricalcolato ogni giorno) ----------
export function loadPath(username) {
  try {
    return JSON.parse(localStorage.getItem(K_PATH + username) || 'null');
  } catch {
    return null;
  }
}

export function savePath(username, result) {
  if (result) {
    try {
      localStorage.setItem(K_PATH + username, JSON.stringify(result));
    } catch {
      /* ignora */
    }
  }
}

// ---------- Diario (per-utente) ----------
export function loadDiario(username) {
  try {
    return JSON.parse(localStorage.getItem(K_DIARIO + username) || '[]');
  } catch {
    return [];
  }
}

export function saveDiario(username, arr) {
  try {
    localStorage.setItem(K_DIARIO + username, JSON.stringify(arr));
  } catch {
    /* ignora */
  }
}

// ---------- Progressi del percorso (per-utente) ----------
export function loadProgress(username) {
  try {
    return JSON.parse(localStorage.getItem(K_PROGRESS + username) || '{}');
  } catch {
    return {};
  }
}

export function saveProgress(username, p) {
  try {
    localStorage.setItem(K_PROGRESS + username, JSON.stringify(p));
  } catch {
    /* ignora */
  }
}

// ---------- Tutorial visto (globale: una volta sola) ----------
export function loadTutorialSeen() {
  return localStorage.getItem(K_TUTORIAL) === '1';
}
export function saveTutorialSeen() {
  localStorage.setItem(K_TUTORIAL, '1');
}

// ---------- Memoria delle conversazioni con gli assistenti e guida AI (per utente + personaggio) ----------
export function loadChat(username, personaId) {
  try {
    return JSON.parse(localStorage.getItem(K_CHAT + username + ':' + personaId) || 'null');
  } catch {
    return null;
  }
}

export function saveChat(username, personaId, messages) {
  try {
    localStorage.setItem(K_CHAT + username + ':' + personaId, JSON.stringify(messages));
  } catch {
    /* quota piena: ignoriamo silenziosamente */
  }
}

export function loadMemoryProfile(username, personaId) {
  return localStorage.getItem(K_MEMPROF + username + ':' + personaId) || '';
}

export function saveMemoryProfile(username, personaId, text) {
  if (text && text.trim()) {
    try {
      localStorage.setItem(K_MEMPROF + username + ':' + personaId, text.trim());
    } catch {
      /* ignora */
    }
  }
}

export function clearMemory(username) {
  Object.keys(localStorage)
    .filter(
      (k) =>
        k.startsWith(K_CHAT + username + ':') || k.startsWith(K_MEMPROF + username + ':')
    )
    .forEach((k) => localStorage.removeItem(k));
}

// ---------- Questionario giornaliero + compiti (per-utente, per-data) ----------
// Il record giornaliero contiene sia le risposte del questionario sia lo stato
// di spunta dei compiti: { answers: {...}, done: { taskId: true } }.
export function loadDaily(username, dateKey) {
  try {
    return JSON.parse(localStorage.getItem(K_DAILY + username + ':' + dateKey) || 'null');
  } catch {
    return null;
  }
}

export function saveDaily(username, dateKey, obj) {
  try {
    localStorage.setItem(K_DAILY + username + ':' + dateKey, JSON.stringify(obj));
  } catch {
    /* ignora */
  }
}

export function lastDailyKey(username) {
  return localStorage.getItem(K_LASTDAILY + username) || null;
}

export function saveLastDaily(username, dateKey) {
  localStorage.setItem(K_LASTDAILY + username, dateKey);
}

// Vero quando il questionario di oggi è stato compilato (ha le risposte).
export function isTodayQuestionnaireDone(username, dateKey) {
  const o = loadDaily(username, dateKey);
  return !!(o && o.answers);
}

// ---------- Obiettivo personale (giorni di fila da dedicare a sé) ----------
export function loadObjective(username) {
  const v = localStorage.getItem(K_OBJECTIVE + username);
  const n = v ? Number(v) : 0;
  return [5, 15, 30].includes(n) ? n : 0;
}
export function saveObjective(username, days) {
  if ([5, 15, 30].includes(Number(days))) {
    try {
      localStorage.setItem(K_OBJECTIVE + username, String(days));
    } catch {
      /* ignora */
    }
  }
}

// ---------- Streak: giorni consecutivi con almeno un esercizio svolto ----------
const DAY_MS = 86400000;

function dateKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${g}`;
}

function dayActive(user, key) {
  const o = loadDaily(user, key);
  if (!o || !o.done) return false;
  return Object.values(o.done).some((v) => v);
}

// Numero di giorni consecutivi (fino a oggi, o ieri se oggi non ha ancora
// svolto nulla) in cui l'utente ha completato almeno un esercizio.
export function computeStreak(user) {
  if (!user) return 0;
  let cursor = new Date();
  cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
  if (!dayActive(user, dateKeyLocal(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  let streak = 0;
  while (dayActive(user, dateKeyLocal(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

// ---------- Tutorial chat (visto una volta) ----------
export function loadChatTutorialSeen() {
  return localStorage.getItem(K_CHAT_TUTORIAL) === '1';
}
export function saveChatTutorialSeen() {
  localStorage.setItem(K_CHAT_TUTORIAL, '1');
}

// ---------- Reset completo dei dati di un utente (mantiene l'account) ----------
export function clearAll(username) {
  if (!username) return;
  [
    K_PROF + username,
    K_PATH + username,
    K_LASTDAILY + username,
    K_DIARIO + username,
    K_PROGRESS + username,
  ].forEach((k) => localStorage.removeItem(k));
  Object.keys(localStorage)
    .filter(
      (k) =>
        k.startsWith(K_DAILY + username + ':') ||
        k.startsWith(K_CHAT + username + ':') ||
        k.startsWith(K_MEMPROF + username + ':')
    )
    .forEach((k) => localStorage.removeItem(k));
}
