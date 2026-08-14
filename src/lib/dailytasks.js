// Task giornalieri: ogni giorno BREAKAPP propone attività diverse, scelte in
// base alle risposte del questionario. Logica deterministica (stabile nell'arco
// della stessa giornata, cambia da un giorno all'altro) e offline: nessun AI.

// Quante attività si propongono al giorno e quante bastano per "completare".
// L'utente è libero di farne di più: il minimo per considerare il giorno fatto è
// DAILY_REQUIRED, ma ne vengono proposte DAILY_COUNT (più scelta, più campi).
export const DAILY_COUNT = 5;
export const DAILY_REQUIRED = 3;

const DAY_MS = 86400000;

// Chiave data in ora locale (YYYY-MM-DD), così il "giorno" non slitta per fuso.
export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${g}`;
}

// Numero intero del giorno (da mezzanotte locale), usato per ruotare i task.
function dayNumber(d = new Date()) {
  const k = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(k.getTime() / DAY_MS);
}

// Seleziona i task del giorno. `result.moduli` è già ordinato per rilevanza
// (calmiamo prima, poi elaboriamo, poi costruiamo). Ogni giorno proponiamo
// DAILY_COUNT attività, privilegiando moduli/campi diversi e facendo ruotare
// sia il modulo di partenza sia l'attività in base al numero del giorno, così
// i compiti cambiano di giorno in giorno e coprono aree differenti.
export function dailyTasksFor(result, d = new Date()) {
  const moduli = (result && result.moduli) || [];
  if (!moduli.length) return [];
  const dn = dayNumber(d);
  const n = moduli.length;

  // Ordine di modulo ruotato in base al giorno: parte da un modulo diverso
  // ogni giorno, così la sequenza proposta cambia nel tempo.
  const start = ((dn % n) + n) % n;
  const order = [];
  for (let k = 0; k < n; k++) order.push((start + k) % n);

  // Passo 1: una sola attività per modulo (massima varietà di campi), finché
  // non raggiungiamo DAILY_COUNT o esauriamo i moduli.
  const usedPerModule = new Array(n).fill(0);
  const chosen = [];
  for (const mi of order) {
    if (chosen.length >= DAILY_COUNT) break;
    const m = moduli[mi];
    const ai = (dn + usedPerModule[mi]) % m.attivita.length;
    chosen.push({ mi, ai });
    usedPerModule[mi]++;
  }

  // Passo 2: se servono ancora attività (pochi moduli), riprendiamo i moduli
  // già usati con un'attività diversa, fino a DAILY_COUNT.
  let k = 0;
  while (chosen.length < DAILY_COUNT) {
    const mi = order[k % n];
    const m = moduli[mi];
    if (usedPerModule[mi] < m.attivita.length) {
      const ai = (dn + usedPerModule[mi]) % m.attivita.length;
      chosen.push({ mi, ai });
      usedPerModule[mi]++;
    }
    k++;
    if (k > n * 4 + DAILY_COUNT) break; // sicurezza anti-loop
  }

  return chosen.map(({ mi, ai }) => {
    const m = moduli[mi];
    return {
      id: `${m.id}:${ai}:${dn}`,
      text: m.attivita[ai],
      modulo: m.titolo,
      campo: m.campo,
      persona: m.persona,
    };
  });
}

// Completamento dei task, persistito per utente + data in localStorage.
// Il record contiene { answers, done } dove `answers` sono le risposte del
// questionario di quel giorno e `done` le spunte dei compiti.
const KEY = 'dn_daily_';
export function loadDaily(user, key) {
  try {
    return JSON.parse(localStorage.getItem(KEY + user + ':' + key) || 'null');
  } catch {
    return null;
  }
}
export function saveDaily(user, key, obj) {
  try {
    localStorage.setItem(KEY + user + ':' + key, JSON.stringify(obj));
  } catch {
    /* ignora */
  }
}
