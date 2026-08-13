// Task giornalieri: ogni giorno BREAKAPP propone attività diverse, scelte in
// base alle risposte del questionario. Logica deterministica (stabile nell'arco
// della stessa giornata, cambia da un giorno all'altro) e offline: nessun AI.

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
// (calmiamo prima, poi elaboriamo, poi costruiamo), quindi i primi giorni
// propongono ciò che serve davvero; ruotando, nei giorni successivi cambia.
export function dailyTasksFor(result, d = new Date()) {
  const moduli = (result && result.moduli) || [];
  if (!moduli.length) return [];
  const dn = dayNumber(d);
  const count = Math.min(3, moduli.length);
  const out = [];
  for (let i = 0; i < count; i++) {
    const m = moduli[(dn + i) % moduli.length];
    const actIdx = (dn + i) % m.attivita.length;
    out.push({
      id: `${m.id}:${actIdx}`,
      text: m.attivita[actIdx],
      modulo: m.titolo,
      persona: m.persona,
    });
  }
  return out;
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
