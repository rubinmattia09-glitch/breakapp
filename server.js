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
//   OPENAI_BASE_URL endpoint base                (default https://api.openai.com/v1)
//   OPENAI_MODEL    nome del modello             (default gpt-4o-mini)
//
// Le variabili d'ambiente reali hanno la precedenza su quelle nel file .env.
// Avvia con:  node server.js   (oppure: npm start)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
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
    base: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  };
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

// --- /api/health : stato del server (non espone la chiave) ---
function handleHealth(res) {
  const { apiKey, base, model } = llmConfig();
  sendJson(res, 200, {
    ok: true,
    chatConfigured: Boolean(apiKey),
    base,
    model,
    dist: fs.existsSync(DIST),
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
  if (pathname === '/api/chat') return handleChat(req, res);
  if (pathname === '/api/memory') return handleMemory(req, res);
  if (pathname.startsWith('/api/')) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Endpoint API sconosciuto' }));
    return;
  }
  return serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  const { apiKey, base, model } = llmConfig();
  console.log(`\nBREAKAPP in esecuzione su http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Chat AI: ${apiKey ? 'CONFIGURATA' : 'NON configurata (manca OPENAI_API_KEY)'}`);
  console.log(`Modello: ${model}  ·  Endpoint: ${base}\n`);
});
