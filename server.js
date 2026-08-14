// server.js — Server di produzione autonomo per BREAKAPP (Dopo di Noi).
//
// Fa due cose, senza dipendenze esterne (solo moduli Node built-in):
//   1) Serve i file statici della build (dist/) — con fallback SPA e protezione
//      da path traversal.
//   2) Proxy lato server per le chiamate al modello: /api/chat e /api/memory.
//      La API key resta SEMPRE nel processo Node e non viene mai esposta al browser.
//
// Configurazione (variabili d'ambiente):
//   PORT            porta su cui ascoltare        (default 3000)
//   OPENAI_API_KEY  chiave dell'API compatibile   (obbligatoria per la chat)
//   OPENAI_BASE_URL endpoint base                (default https://api.groq.com/openai/v1)
//   OPENAI_MODEL    nome del modello Llama        (default llama-3.3-70b-versatile)
//
// Le variabili d'ambiente reali hanno la precedenza su quelle nel file .env.
// Avvia con:  node server.js   (oppure: npm start)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PERSONAS } from './src/data/personas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Piccolo loader di .env (senza dipendenze). NON sovrascrive le env reali. ---
function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const text = fs.readFileSync(envPath, 'utf8');
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* ignoriamo errori di lettura del .env */
  }
}
loadDotEnv();

const DIST = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// --- Configurazione LLM (da ambiente) ---
function llmConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY || '',
    base: (process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, ''),
    model: process.env.OPENAI_MODEL || 'llama-3.3-70b-versatile',
  };
}

// --- Database per gli ACCOUNT ---
// Tre backend, in ordine di preferenza:
//   1) Turso (SQLite nel cloud, gratis, persistenza reale anche dopo i deploy)
//      se sono impostate TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
//   2) SQLite locale su file (node:sqlite, built-in) se Turso non è configurato.
//   3) Memoria (Map) come ultimo fallback: gli account NON persistono.
const DB_PATH = process.env.SQLITE_DB || path.join(__dirname, 'data', 'app.db');
const TURSO_URL = process.env.TURSO_DATABASE_URL || '';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || '';
// Giorno della campagna di valutazione: la valutazione è aperta SOLO in questo
// giorno e una volta sola per utente. Cambia RATING_DAY (es. su Render) per
// aprire una nuova campagna in un'altra data.
const RATING_DAY = (process.env.RATING_DAY || '2026-08-14').trim();
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}
function ratingOpen() {
  return todayUTC() === RATING_DAY;
}
let db = null; // DatabaseSync (file) o client libSQL
let dbBackend = 'none'; // 'turso' | 'sqlite' | 'memory'
let memUsers = null; // fallback in memoria

const USERS_SCHEMA = `CREATE TABLE IF NOT EXISTS users (
  username   TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  salt       TEXT NOT NULL,
  hash       TEXT NOT NULL,
  created_at TEXT NOT NULL
)`;

const POSTS_SCHEMA = `CREATE TABLE IF NOT EXISTS posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  body         TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  delete_token TEXT
)`;

const RATINGS_SCHEMA = `CREATE TABLE IF NOT EXISTS ratings (
  username    TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  rating      INTEGER NOT NULL,
  created_at  TEXT NOT NULL
)`;

const PRESENCE_SCHEMA = `CREATE TABLE IF NOT EXISTS presence (
  username   TEXT PRIMARY KEY,
  last_seen  TEXT NOT NULL
)`;

// Le tabelle già esistenti (es. su Turso) non hanno delete_token: lo aggiungiamo
// in modo sicuro se manca, così gli autori possono ritirare i propri pensieri.
async function ensurePostsDeleteToken() {
  if (dbBackend === 'memory') return; // in memoria i post non persistono
  try {
    const rows = await dbAll('PRAGMA table_info(posts)');
    const has = Array.isArray(rows) && rows.some(
      (r) => r && (r.name || '').toLowerCase() === 'delete_token'
    );
    if (!has) {
      await dbRun('ALTER TABLE posts ADD COLUMN delete_token TEXT');
      console.log('Bacheca: aggiunta colonna delete_token alla tabella posts.');
    }
  } catch (e) {
    console.warn(
      'Bacheca: impossibile verificare/aggiornare posts (' +
        (e && e.message ? e.message : e) +
        ').'
    );
  }
}

async function initDb() {
  // 1) Turso (SQLite nel cloud)
  if (TURSO_URL && TURSO_TOKEN) {
    try {
      const { createClient } = await import('@libsql/client');
      db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
      await db.execute(USERS_SCHEMA);
      await db.execute(POSTS_SCHEMA);
      await db.execute(RATINGS_SCHEMA);
      await db.execute(PRESENCE_SCHEMA);
      dbBackend = 'turso';
      console.log('Database: Turso (' + TURSO_URL + ')');
      return;
    } catch (e) {
      console.warn(
        'Turso non raggiungibile (' +
          (e && e.message ? e.message : e) +
          '). Provo il SQLite locale come fallback.'
      );
    }
  }
  // 2) SQLite locale (node:sqlite, built-in, nessuna dipendenza)
  try {
    const sqlite = await import('node:sqlite');
    const { DatabaseSync } = sqlite;
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec(USERS_SCHEMA);
    db.exec(POSTS_SCHEMA);
    db.exec(RATINGS_SCHEMA);
    db.exec(PRESENCE_SCHEMA);
    dbBackend = 'sqlite';
    console.log('Database: SQLite locale (' + DB_PATH + ')');
    return;
  } catch (e) {
    db = null;
    dbBackend = 'memory';
    memUsers = new Map();
    console.warn(
      'SQLite non disponibile (' +
        (e && e.message ? e.message : e) +
        '). Uso memoria: gli account non persistono tra i riavvii.'
    );
  }
}

function sha256hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}
function serverHash(password, salt) {
  return sha256hex(password + ':' + salt);
}

// Registra un utente. Ritorna { status, body }.
async function dbRegister({ username, name, password }) {
  username = (username || '').trim();
  if (username.length < 3)
    return { status: 400, body: { ok: false, error: 'Scegli un nome utente di almeno 3 caratteri.' } };
  if (!/^[a-zA-Z0-9_.-]+$/.test(username))
    return { status: 400, body: { ok: false, error: 'Nome utente: solo lettere, numeri e . _ -' } };
  if (!password || password.length < 4)
    return { status: 400, body: { ok: false, error: 'La password deve avere almeno 4 caratteri.' } };
  const finalName = (name || username).trim();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = serverHash(password, salt);
  const created = new Date().toISOString();
  if (dbBackend === 'turso') {
    const ex = await db.execute({ sql: 'SELECT 1 FROM users WHERE username = ?', args: [username] });
    if (ex.rows.length)
      return { status: 409, body: { ok: false, error: 'Questo nome utente è già registrato.' } };
    await db.execute({
      sql: 'INSERT INTO users (username, name, salt, hash, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [username, finalName, salt, hash, created],
    });
    return { status: 200, body: { ok: true } };
  }
  if (dbBackend === 'sqlite') {
    const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
    if (exists) return { status: 409, body: { ok: false, error: 'Questo nome utente è già registrato.' } };
    db.prepare('INSERT INTO users (username, name, salt, hash, created_at) VALUES (?, ?, ?, ?, ?)').run(
      username,
      finalName,
      salt,
      hash,
      created
    );
    return { status: 200, body: { ok: true } };
  }
  if (memUsers.has(username))
    return { status: 409, body: { ok: false, error: 'Questo nome utente è già registrato.' } };
  memUsers.set(username, { name: finalName, salt, hash });
  return { status: 200, body: { ok: true } };
}

// Verifica le credenziali. Ritorna { status, body }.
async function dbLogin({ username, password }) {
  username = (username || '').trim();
  let rec = null;
  if (dbBackend === 'turso') {
    const r = await db.execute({
      sql: 'SELECT name, salt, hash FROM users WHERE username = ?',
      args: [username],
    });
    rec = r.rows[0] || null;
  } else if (dbBackend === 'sqlite') {
    rec = db.prepare('SELECT name, salt, hash FROM users WHERE username = ?').get(username);
  } else {
    rec = memUsers ? memUsers.get(username) : null;
  }
  if (!rec) return { status: 401, body: { ok: false, error: 'Utente non trovato.' } };
  if (serverHash(password, rec.salt) !== rec.hash)
    return { status: 401, body: { ok: false, error: 'Password errata.' } };
  return { status: 200, body: { ok: true, name: rec.name } };
}

// --- Helper generici per la bacheca (stesso backend di users) ---
async function dbAll(sql, args = []) {
  if (dbBackend === 'turso') {
    const r = await db.execute({ sql, args });
    return r.rows;
  }
  if (dbBackend === 'sqlite') {
    return db.prepare(sql).all(...args);
  }
  return [];
}

async function dbRun(sql, args = []) {
  if (dbBackend === 'turso') {
    await db.execute({ sql, args });
  } else if (dbBackend === 'sqlite') {
    db.prepare(sql).run(...args);
  }
}

// --- Valutazioni (0-5 stelle): una per utente, solo nel giorno della campagna ---
async function dbRatingExists(username) {
  if (dbBackend === 'turso') {
    const r = await db.execute({ sql: 'SELECT 1 FROM ratings WHERE username = ?', args: [username] });
    return r.rows.length > 0;
  }
  if (dbBackend === 'sqlite') {
    return !!db.prepare('SELECT 1 FROM ratings WHERE username = ?').get(username);
  }
  return false;
}

async function dbSubmitRating({ username, name, rating }) {
  const created = new Date().toISOString();
  if (dbBackend === 'turso') {
    await db.execute({
      sql: 'INSERT INTO ratings (username, name, rating, created_at) VALUES (?, ?, ?, ?)',
      args: [username, name, rating, created],
    });
  } else if (dbBackend === 'sqlite') {
    db.prepare('INSERT INTO ratings (username, name, rating, created_at) VALUES (?, ?, ?, ?)').run(
      username, name, rating, created
    );
  }
}

async function dbAllRatings() {
  if (dbBackend === 'turso') {
    const r = await db.execute(
      'SELECT username, name, rating, created_at FROM ratings ORDER BY created_at DESC'
    );
    return r.rows;
  }
  if (dbBackend === 'sqlite') {
    return db.prepare('SELECT username, name, rating, created_at FROM ratings ORDER BY created_at DESC').all();
  }
  return [];
}

// --- Presenza / ultimo accesso ---
const ONLINE_MS = 3 * 60 * 1000; // entro 3 min dall'ultimo battito = "online"
function isOnlineWithin(ts, ms = ONLINE_MS) {
  const t = new Date(ts).getTime();
  if (isNaN(t)) return false;
  return Date.now() - t < ms;
}
async function dbTouchPresence(username) {
  const now = new Date().toISOString();
  if (dbBackend === 'turso') {
    await db.execute({
      sql: 'INSERT INTO presence (username, last_seen) VALUES (?, ?) ON CONFLICT(username) DO UPDATE SET last_seen = excluded.last_seen',
      args: [username, now],
    });
  } else if (dbBackend === 'sqlite') {
    db.prepare(
      'INSERT INTO presence (username, last_seen) VALUES (?, ?) ON CONFLICT(username) DO UPDATE SET last_seen = excluded.last_seen'
    ).run(username, now);
  }
}
async function dbAllPresence() {
  const sql = `SELECT p.username AS username, COALESCE(u.name, p.username) AS name, p.last_seen AS last_seen
               FROM presence p LEFT JOIN users u ON u.username = p.username
               ORDER BY p.last_seen DESC`;
  if (dbBackend === 'turso') {
    const r = await db.execute(sql);
    return r.rows;
  }
  if (dbBackend === 'sqlite') {
    return db.prepare(sql).all();
  }
  return [];
}

// Inserisce un post e ritorna l'id appena creato (o null in modalità memoria).
async function dbInsertPost(body, created, token) {
  if (dbBackend === 'turso') {
    const r = await db.execute({
      sql: 'INSERT INTO posts (body, created_at, delete_token) VALUES (?, ?, ?)',
      args: [body, created, token],
    });
    return r.lastInsertRowid != null ? Number(r.lastInsertRowid) : null;
  }
  if (dbBackend === 'sqlite') {
    const info = db
      .prepare('INSERT INTO posts (body, created_at, delete_token) VALUES (?, ?, ?)')
      .run(body, created, token);
    return info.lastInsertRowid != null ? Number(info.lastInsertRowid) : null;
  }
  return null;
}

async function handleAuthRegister(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }
  let p;
  try {
    p = await readJson(req);
  } catch (e) {
    return sendJson(res, 400, { error: e.message });
  }
  const r = await dbRegister(p);
  return sendJson(res, r.status, r.body);
}

async function handleAuthLogin(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }
  let p;
  try {
    p = await readJson(req);
  } catch (e) {
    return sendJson(res, 400, { error: e.message });
  }
  const r = await dbLogin(p);
  return sendJson(res, r.status, r.body);
}

// --- Helper: leggi il body JSON della richiesta ---
function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooBig = false;
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        tooBig = true;
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooBig) return reject(new Error('Body troppo grande'));
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('JSON non valido'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  const data = JSON.stringify(obj);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(data);
}

// Estrae il testo della risposta in modo robusto (stringa, array di parti o oggetto).
function extractText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (p && (typeof p.text === 'string'
        ? p.text
        : typeof p.content === 'string' ? p.content : '')) || '')
      .join('')
      .trim();
  }
  if (content && typeof content === 'object') {
    const t = content.text || content.content;
    if (typeof t === 'string') return t;
  }
  return '';
}

// --- /api/chat : inoltra la conversazione al modello, iniettando la "persona" ---
async function handleChat(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }
  let parsed;
  try {
    parsed = await readJson(req);
  } catch (e) {
    sendJson(res, 400, { error: e.message });
    return;
  }
  const { messages, persona, memory } = parsed;
  const { apiKey, base, model } = llmConfig();

  if (!apiKey) {
    sendJson(res, 400, {
      error: 'API key mancante. Imposta la variabile d\'ambiente OPENAI_API_KEY sul server.',
    });
    return;
  }

  const system = PERSONAS[persona] && PERSONAS[persona].system
    ? PERSONAS[persona].system
    : 'Sei un ascoltatore empatico e prudente. Rispondi in italiano, in poche frasi.';

  let sysContent = system;
  if (memory && String(memory).trim()) {
    sysContent +=
      '\n\nMEMORIA DELLE SESSIONI PRECEDENTI (cosa hai imparato su questa persona; usala per essere coerente e più empatico, senza ripeterla pediscentemente a parole):\n' +
      String(memory).trim();
  }

  const payload = {
    model,
    messages: [{ role: 'system', content: sysContent }, ...(Array.isArray(messages) ? messages : [])],
    temperature: 0.8,
  };

  try {
    const r = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    res.statusCode = r.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
  } catch (e) {
    sendJson(res, 502, { error: 'Impossibile raggiungere il modello: ' + e.message });
  }
}

// --- /api/memory : aggiorna il profilo riassuntivo dell'utente a partire dalla cronologia ---
async function handleMemory(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }
  let parsed;
  try {
    parsed = await readJson(req);
  } catch (e) {
    sendJson(res, 400, { error: e.message });
    return;
  }
  const { messages, profile } = parsed;
  const { apiKey, base, model } = llmConfig();

  if (!apiKey) {
    sendJson(res, 400, { error: 'API key mancante.' });
    return;
  }

  const MEMORY_PROMPT =
    'Sei un assistente che mantiene la memoria a lungo termine di una persona seguita in un percorso di superamento di una rottura sentimentale. ' +
    'Ti verranno dati la MEMORIA ATTUALE (se esiste) e la TRASCRIZIONE dell\'ultima sessione. ' +
    'Aggiorna la memoria in modo conciso (massimo 6-8 frasi, in italiano, alla terza persona), concentrandoti su: stato d\'animo attuale, temi ricorrenti, progressione o regressione, cosa è utile per il proseguio. ' +
    'NON includere numeri di crisi né istruzioni. Rispondi SOLO con il testo aggiornato della memoria, senza introduzioni né virgolette.';

  const transcript = (Array.isArray(messages) ? messages : [])
    .slice(-30)
    .map((m) => {
      const c = m && m.content;
      const t = typeof c === 'string'
        ? c
        : c && (typeof c.text === 'string' ? c.text : (typeof c.content === 'string' ? c.content : ''));
      return `${m && m.role ? m.role : '?'}: "${t}"`;
    })
    .join('\n');

  const userContent =
    `MEMORIA ATTUALE:\n${profile && profile.trim() ? profile : '(nessuna)'}\n\n` +
    `TRASCRIZIONE ULTIMA SESSIONE:\n${transcript}\n\nMEMORIA AGGIORNATA:`;

  const payload = {
    model,
    messages: [
      { role: 'system', content: MEMORY_PROMPT },
      { role: 'user', content: userContent },
    ],
    temperature: 0.3,
    max_tokens: 400,
  };

  try {
    const r = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    let profileOut = extractText(data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content);
    if (!profileOut) profileOut = profile && profile.trim() ? profile.trim() : '';
    sendJson(res, 200, { profile: profileOut });
  } catch (e) {
    sendJson(res, 502, { error: 'Impossibile aggiornare la memoria: ' + e.message });
  }
}

// --- /api/board : bacheca anonima di pensieri/lettere ---
async function handleBoardGet(res) {
  try {
    const posts = await dbAll(
      'SELECT id, body, created_at FROM posts ORDER BY created_at DESC LIMIT 50'
    );
    sendJson(res, 200, { posts });
  } catch (e) {
    sendJson(res, 500, { error: 'Impossibile leggere la bacheca: ' + (e && e.message ? e.message : e) });
  }
}

async function handleBoardPost(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }
  let p;
  try {
    p = await readJson(req);
  } catch (e) {
    return sendJson(res, 400, { error: e.message });
  }
  const body = (p && p.body ? String(p.body) : '').trim();
  if (!body) return sendJson(res, 400, { error: 'Il messaggio è vuoto.' });
  const created = new Date().toISOString();
  // Token segreto mostrato una sola volta: serve all'autore per ritirare il post.
  const deleteToken = crypto.randomBytes(24).toString('hex');
  try {
    const id = await dbInsertPost(body, created, deleteToken);
    sendJson(res, 200, { ok: true, id, deleteToken });
  } catch (e) {
    sendJson(res, 500, { error: 'Impossibile salvare il messaggio: ' + (e && e.message ? e.message : e) });
  }
}

// Ritira un pensiero: richiede l'id e il token segreto ricevuto alla pubblicazione.
async function handleBoardDelete(req, res) {
  if (req.method !== 'DELETE') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }
  let p;
  try {
    p = await readJson(req);
  } catch (e) {
    return sendJson(res, 400, { error: e.message });
  }
  const id = Number(p && p.id);
  const token = (p && p.token ? String(p.token) : '').trim();
  if (!Number.isInteger(id) || !token) {
    return sendJson(res, 400, { ok: false, error: 'Richiesta non valida.' });
  }
  try {
    const rows = await dbAll('SELECT delete_token FROM posts WHERE id = ?', [id]);
    if (!rows.length) {
      return sendJson(res, 404, { ok: false, error: 'Messaggio non trovato.' });
    }
    const stored = (rows[0].delete_token || '').trim();
    if (stored !== token) {
      return sendJson(res, 403, { ok: false, error: 'Non sei autorizzato a ritirare questo messaggio.' });
    }
    await dbRun('DELETE FROM posts WHERE id = ?', [id]);
    sendJson(res, 200, { ok: true });
  } catch (e) {
    sendJson(res, 500, { error: 'Impossibile ritirare il messaggio: ' + (e && e.message ? e.message : e) });
  }
}

// --- /api/rating/status : dice al frontend se può valutare e se l'ha già fatto ---
async function handleRatingStatus(req, res) {
  const u = new URL(req.url, 'http://localhost').searchParams.get('username') || '';
  const open = ratingOpen();
  let already = false;
  if (open && u) {
    try { already = await dbRatingExists(u); } catch { /* ignora */ }
  }
  sendJson(res, 200, { open, alreadyRated: already, day: RATING_DAY });
}

// --- /api/rating : salva la valutazione (una volta, solo oggi) ---
async function handleRatingSubmit(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }
  let p;
  try { p = await readJson(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
  if (!ratingOpen()) {
    return sendJson(res, 403, { ok: false, error: 'La valutazione è aperta solo il ' + RATING_DAY + '.' });
  }
  const username = (p.username || '').trim();
  const rating = Number(p.rating);
  if (!username) return sendJson(res, 400, { ok: false, error: 'Utente mancante.' });
  if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
    return sendJson(res, 400, {
      ok: false,
      error: 'La valutazione deve essere un numero intero da 0 a 5.',
    });
  }
  try {
    if (await dbRatingExists(username)) {
      return sendJson(res, 409, { ok: false, error: 'Hai già inviato la tua valutazione.' });
    }
    let name = username;
    try {
      const nr = await dbAll('SELECT name FROM users WHERE username = ?', [username]);
      if (nr.length) name = nr[0].name || username;
    } catch { /* ignora */ }
    await dbSubmitRating({ username, name, rating });
    sendJson(res, 200, { ok: true });
  } catch (e) {
    sendJson(res, 500, {
      ok: false,
      error: 'Impossibile salvare la valutazione: ' + (e && e.message ? e.message : e),
    });
  }
}

// --- /api/ratings : elenco JSON (per il proprietario) ---
async function handleRatingsList(res) {
  try {
    const rows = await dbAllRatings();
    sendJson(res, 200, { ratings: rows, day: RATING_DAY });
  } catch (e) {
    sendJson(res, 500, {
      error: 'Impossibile leggere le valutazioni: ' + (e && e.message ? e.message : e),
    });
  }
}

// --- /ratings : pagina HTML leggibile dal proprietario (username + nome + voto) ---
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function renderRatingsHtml(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const total = list.length;
  const sum = list.reduce((a, r) => a + (Number(r.rating) || 0), 0);
  const avg = total ? (sum / total).toFixed(2) : '—';
  const body = list.length
    ? list
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.username)}</td><td>${escapeHtml(r.name)}</td>` +
            `<td><strong>${Number(r.rating)}</strong> / 5</td><td>${escapeHtml(r.created_at)}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="4" style="text-align:center">Nessuna valutazione ancora inviata.</td></tr>';
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Valutazioni BREAKAPP</title>
<style>
  body{font-family:system-ui,Segoe UI,Arial,sans-serif;background:#fff5f6;color:#222;margin:0;padding:24px}
  .box{background:#fff;border:1px solid #f0d2d6;border-radius:12px;padding:16px 20px;max-width:780px;margin:0 auto;box-shadow:0 6px 20px rgba(189,31,51,.08)}
  h1{color:#bd1f33;margin-top:6px}
  .stat{display:flex;gap:16px;margin:8px 0 16px;flex-wrap:wrap}
  .stat div{background:#fdeef0;border-radius:10px;padding:10px 16px}
  .stat b{display:block;font-size:22px;color:#bd1f33}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #f1e2e4}
  th{color:#8a5560;font-size:12px;text-transform:uppercase;letter-spacing:.03em}
  .foot{margin-top:14px;font-size:12px;color:#a07}
</style></head>
<body><div class="box">
  <h1>&#11088; Valutazioni BREAKAPP</h1>
  <p>Campagna del <strong>${escapeHtml(RATING_DAY)}</strong> &mdash; una valutazione per persona.</p>
  <div class="stat">
    <div>Valutazioni<b>${total}</b></div>
    <div>Media<b>${avg}</b></div>
  </div>
  <table><thead><tr><th>Username</th><th>Nome</th><th>Voto</th><th>Data</th></tr></thead>
  <tbody>${body}</tbody></table>
  <p class="foot">Pagina riservata al proprietario dell'app.</p>
</div></body></html>`;
}
async function handleRatingsPage(res) {
  try {
    const rows = await dbAllRatings();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(renderRatingsHtml(rows));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<p>Errore: ' + escapeHtml(e && e.message ? e.message : e) + '</p>');
  }
}

// --- /api/ping : heartbeat "ultimo accesso" (l'app è aperta) ---
async function handlePing(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }
  let p;
  try { p = await readJson(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
  const username = (p.username || '').trim();
  if (!username) return sendJson(res, 400, { ok: false, error: 'Utente mancante.' });
  try {
    await dbTouchPresence(username);
    sendJson(res, 200, { ok: true });
  } catch (e) {
    sendJson(res, 500, {
      ok: false,
      error: 'Impossibile aggiornare la presenza: ' + (e && e.message ? e.message : e),
    });
  }
}

// --- /api/presence : elenco JSON (per il proprietario) ---
async function handlePresenceList(res) {
  try {
    const rows = await dbAllPresence();
    const presence = rows.map((r) => ({ ...r, online: isOnlineWithin(r.last_seen) }));
    sendJson(res, 200, { presence });
  } catch (e) {
    sendJson(res, 500, {
      error: 'Impossibile leggere la presenza: ' + (e && e.message ? e.message : e),
    });
  }
}

// --- /presence : pagina HTML leggibile dal proprietario (ultimo accesso) ---
function fmtIt(ts) {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts || '');
  return d.toLocaleString('it-IT', {
    timeZone: 'Europe/Rome',
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function renderPresenceHtml(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const onlineNow = list.filter((r) => isOnlineWithin(r.last_seen)).length;
  const body = list.length
    ? list
        .map((r) => {
          const on = isOnlineWithin(r.last_seen);
          const dot = on ? '#3a9e6f' : '#c4b9bd';
          const stato = on ? 'Online ora' : 'Visto il ' + fmtIt(r.last_seen);
          return `<tr><td>${escapeHtml(r.username)}</td><td>${escapeHtml(r.name)}</td>` +
            `<td><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${dot};margin-right:7px"></span>${stato}</td></tr>`;
        })
        .join('')
    : '<tr><td colspan="3" style="text-align:center">Nessun accesso registrato.</td></tr>';
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Presenza BREAKAPP</title>
<style>
  body{font-family:system-ui,Segoe UI,Arial,sans-serif;background:#fff5f6;color:#222;margin:0;padding:24px}
  .box{background:#fff;border:1px solid #f0d2d6;border-radius:12px;padding:16px 20px;max-width:780px;margin:0 auto;box-shadow:0 6px 20px rgba(189,31,51,.08)}
  h1{color:#bd1f33;margin-top:6px}
  .stat{background:#fdeef0;border-radius:10px;padding:10px 16px;display:inline-block;margin:8px 0 16px}
  .stat b{display:block;font-size:22px;color:#bd1f33}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #f1e2e4}
  th{color:#8a5560;font-size:12px;text-transform:uppercase;letter-spacing:.03em}
  .foot{margin-top:14px;font-size:12px;color:#a07}
</style></head>
<body><div class="box">
  <h1>&#128308; Presenza BREAKAPP</h1>
  <p>Quando un utente apre l'app, questa segnala il passaggio (ogni minuto) per mostrarti l'ultimo accesso.</p>
  <div class="stat">Online ora<b>${onlineNow}</b></div>
  <table><thead><tr><th>Username</th><th>Nome</th><th>Stato</th></tr></thead>
  <tbody>${body}</tbody></table>
  <p class="foot">Pagina riservata al proprietario dell'app.</p>
</div></body></html>`;
}
async function handlePresencePage(res) {
  try {
    const rows = await dbAllPresence();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(renderPresenceHtml(rows));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<p>Errore: ' + escapeHtml(e && e.message ? e.message : e) + '</p>');
  }
}

// --- /api/health : stato del server (non espone la chiave) ---
function handleHealth(res) {
  const { apiKey, base, model } = llmConfig();
  sendJson(res, 200, {
    ok: true,
    chatConfigured: Boolean(apiKey),
    base,
    model,
    dist: fs.existsSync(DIST),
    db: dbBackend,
  });
}

// --- Servizio file statici ---
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function serveStatic(req, res) {
  if (!fs.existsSync(DIST)) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Cartella dist/ non trovata. Esegui prima: npm run build');
    return;
  }
  // Rimuovi query string e decodifica; protezione da path traversal.
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = path.join(DIST, rel);
  if (!filePath.startsWith(DIST)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.statusCode = 200;
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'public, max-age=3600');
      fs.createReadStream(filePath).pipe(res);
      return;
    }
    // Fallback SPA: qualsiasi percorso non-file viene servito come index.html
    // (l'app usa lo stato dello schermo, ma così i refresh diretti funzionano).
    const indexPath = path.join(DIST, 'index.html');
    fs.readFile(indexPath, (e, buf) => {
      if (e) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.end(buf);
    });
  });
}

// --- Router ---
const server = http.createServer((req, res) => {
  const pathname = (req.url || '/').split('?')[0];
  if (pathname === '/api/health') return handleHealth(res);
  if (pathname === '/api/auth/register') return handleAuthRegister(req, res);
  if (pathname === '/api/auth/login') return handleAuthLogin(req, res);
  if (pathname === '/api/chat') return handleChat(req, res);
  if (pathname === '/api/memory') return handleMemory(req, res);
  if (pathname === '/api/board') {
    if (req.method === 'GET') return handleBoardGet(res);
    if (req.method === 'POST') return handleBoardPost(req, res);
    if (req.method === 'DELETE') return handleBoardDelete(req, res);
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }
  if (pathname === '/api/rating/status') return handleRatingStatus(req, res);
  if (pathname === '/api/rating') return handleRatingSubmit(req, res);
  if (pathname === '/api/ratings') return handleRatingsList(res);
  if (pathname === '/ratings') return handleRatingsPage(res);
  if (pathname === '/api/ping') return handlePing(req, res);
  if (pathname === '/api/presence') return handlePresenceList(res);
  if (pathname === '/presence') return handlePresencePage(res);
  if (pathname.startsWith('/api/')) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Endpoint API sconosciuto' }));
    return;
  }
  return serveStatic(req, res);
});

async function main() {
  await initDb();
  await ensurePostsDeleteToken();
  server.listen(PORT, HOST, () => {
    const { apiKey, base, model } = llmConfig();
    console.log(`\nBREAKAPP in esecuzione su http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`Chat AI: ${apiKey ? 'CONFIGURATA' : 'NON configurata (manca OPENAI_API_KEY)'}`);
    console.log(
      `Database account: ${
        dbBackend === 'turso'
          ? 'Turso (cloud, persistente)'
          : dbBackend === 'sqlite'
            ? 'SQLite locale (' + DB_PATH + ')'
            : 'memoria (non persistente)'
      }`
    );
    console.log(`Modello: ${model}  ·  Endpoint: ${base}\n`);
  });
}
main();
