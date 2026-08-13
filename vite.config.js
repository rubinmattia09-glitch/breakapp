import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import { PERSONAS } from './src/data/personas.js';

dotenv.config();

// Proxy server-side per le chiamate al modello: la API key resta nel processo
// Node (mai esposta al browser). Legge OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL da .env.
function chatProxyPlugin() {
  return {
    name: 'chat-proxy',
    configureServer(server) {
      server.middlewares.use('/api/chat', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { messages, persona, memory } = JSON.parse(body || '{}');
            const apiKey = process.env.OPENAI_API_KEY;
            const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
            const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

            if (!apiKey) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: 'API key mancante. Copia .env.example in .env e imposta OPENAI_API_KEY.',
              }));
              return;
            }

            let system = PERSONAS[persona] && PERSONAS[persona].system
              ? PERSONAS[persona].system
              : 'Sei un ascoltatore empatico e prudente. Rispondi in italiano, in poche frasi.';

            // Memoria a lungo termine: se il frontend ha passato il profilo
            // riassuntivo delle sessioni precedenti, lo reiniettiamo nel system.
            if (memory && String(memory).trim()) {
              system += `\n\nMEMORIA DELLE SESSIONI PRECEDENTI (cosa hai imparato su questa persona; usala per essere coerente e più empatico, senza ripeterla pediscentemente a parole):\n${String(memory).trim()}`;
            }

            const payload = {
              model,
              messages: [{ role: 'system', content: system }, ...(Array.isArray(messages) ? messages : [])],
              temperature: 0.8,
            };

            const r = await fetch(base + '/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + apiKey,
              },
              body: JSON.stringify(payload),
            });

            const data = await r.json();
            res.statusCode = r.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });

      // Aggiorna il profilo riassuntivo dell'utente a partire dalla cronologia.
      server.middlewares.use('/api/memory', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { messages, persona, profile } = JSON.parse(body || '{}');
            const apiKey = process.env.OPENAI_API_KEY;
            const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
            const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
            if (!apiKey) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'API key mancante.' }));
              return;
            }

            const MEMORY_PROMPT =
              'Sei un assistente che mantiene la memoria a lungo termine di una persona seguita in un percorso di superamento di una rottura sentimentale. ' +
              'Ti verranno dati la MEMORIA ATTUALE (se esiste) e la TRASCRIZIONE dell\'ultima sessione. ' +
              'Aggiorna la memoria in modo conciso (massimo 6-8 frasi, in italiano, alla terza persona), concentrandoti su: stato d\'animo attuale, temi ricorrenti, progressione o regressione, cosa è utile per il proseguo. ' +
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

            const r = await fetch(base + '/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
              body: JSON.stringify(payload),
            });
            const data = await r.json();

            // estrazione robusta del testo generato
            let profileOut = '';
            const choice = data && data.choices && data.choices[0];
            const m = choice && choice.message;
            if (m) {
              const c = m.content;
              if (typeof c === 'string') profileOut = c;
              else if (Array.isArray(c)) {
                profileOut = c
                  .map((p) => (p && (p.text || p.content) && typeof (p.text || p.content) === 'string' ? p.text || p.content : ''))
                  .join('')
                  .trim();
              } else if (c && typeof c === 'object') {
                profileOut = (c.text || c.content) || '';
              }
            }
            // in caso di errore, restituisci la memoria precedente così il client non la perde
            if (!profileOut) profileOut = profile && profile.trim() ? profile.trim() : '';

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ profile: profileOut }));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), chatProxyPlugin()],
  server: {
    host: true,
    port: 5173,
  },
});
