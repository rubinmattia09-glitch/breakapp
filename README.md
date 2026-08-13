# Dopo di Noi

App di compagnia e cura di sé dopo la fine di una relazione sentimentale.
Dopo un breve questionario crea un **percorso personalizzato** (non uguale per tutti) e
mette a disposizione tre **psicologi AI** con cui conversare.

> ⚠️ Non è terapia. È uno strumento di auto-cura, non sostituisce uno psicologo, uno
> psichiatra o il pronto soccorso. In caso di emergenza: **112 / 118**.

## Stack
- Vite + React (interfaccia)
- Un piccolo **server Node autonomo** (`server.js`, solo moduli built-in) che:
  - serve la build statica (`dist/`)
  - fa da proxy lato server per le chat verso il tuo modello **OpenAI-compatibile**
    (la API key resta sul server, mai esposta al browser)
- In sviluppo locale le stesse route `/api/chat` e `/api/memory` sono gestite dal proxy
  interno di Vite (`vite.config.js`); in produzione le gestisce `server.js`.

## Come avviarla

1. Installa le dipendenze:
   ```bash
   npm install
   ```
2. Crea il file `.env` partendo dall'esempio e inserisci la tua chiave:
   ```bash
   cp .env.example .env
   ```
   Poi compila `OPENAI_API_KEY`, `OPENAI_BASE_URL` e `OPENAI_MODEL`.
   Funziona con OpenAI, Groq, Together, Ollama (gateway `/v1`), LocalAI, ecc.
3. Avvia:
   ```bash
   npm run dev
   ```
4. Apri `http://localhost:5173`.

Se non imposti la chiave, l'app funziona comunque (questionario + percorso); la chat
risponderà con un errore gentile che ti ricorda di configurare la chiave.

## Metterla online (deploy con chat funzionante)
Per condividere l'app con altre persone **e far funzionare anche la chat** serve un server
che ospiti sia i file statici sia il proxy: ecco fatto da `server.js`. Non serve nessuna
dipendenza esterna (solo Node ≥ 18).

Variabili d'ambiente da impostare **nell'hosting** (mai nel repo):
| Variabile | Cosa fa | Default |
| --- | --- | --- |
| `PORT` | porta di ascolto | `3000` |
| `OPENAI_API_KEY` | chiave del modello (obbligatoria per la chat) | — |
| `OPENAI_BASE_URL` | endpoint base OpenAI-compatibile | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | modello da usare | `gpt-4o-mini` |

### Opzione A — Render.com (semplice, free)
1. Crea un repo Git e pusha questo progetto (senza `.env`).
2. Su Render collega il repo: verrà usato `render.yaml` (Web Service, runtime Docker).
3. Nella dashboard imposta `OPENAI_API_KEY` (le altre sono preimpostate).
4. Al termine della build ottieni un URL pubblico: la chat funziona per tutti.

### Opzione B — Docker / Railway / Fly.io / VPS tuo
```bash
docker build -t breakapp .
docker run -d -p 3000:3000 \
  -e OPENAI_API_KEY=sk-... \
  -e OPENAI_BASE_URL=https://api.openai.com/v1 \
  -e OPENAI_MODEL=gpt-4o-mini \
  breakapp
```
Oppure su Railway/Heroku basta il `Procfile` (`web: node server.js`) + le env var.

In locale puoi comunque provare il server di produzione con:
```bash
npm run build
npm start          # poi apri http://localhost:3000
```

### Verifica
`GET /api/health` risponde con lo stato del server (es. `{"ok":true,"chatConfigured":true}`)
senza mai esporre la chiave.

## Struttura
```
src/
  data/questionario.js   # le 7 domande
  data/personas.js       # i 3 psicologi AI (system prompt)
  lib/pathway.js         # logica di personalizzazione + risorse di crisi
  components/            # Welcome, Questionario, Percorso, Chat
  App.jsx                # navigazione tra schermate
vite.config.js           # dev server + proxy /api/chat (solo sviluppo)
server.js               # server di produzione: statici + proxy /api/chat, /api/memory
```

## Privacy
Le risposte del questionario, il diario e la cronologia chat restano **nel browser**
di ciascun utente (localStorage, per-utente), e non vengono salvate sul server. I messaggi
della chat vengono inviati solo al modello che configuri (tramite il proxy lato server).
