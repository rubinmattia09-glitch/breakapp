// Esercizi a corpo libero (senza attrezzi) per BREAKAPP.
// Genera un circuito full-body con riscaldamento e defaticamento, che cambia
// in base alla "voglia" dell'utente di muoversi quel giorno e alla difficoltà.

export const VOGLIA = [
  { id: 'poca', label: 'Poca voglia', emoji: '😴', note: 'Tranquillo, solo per sciogliere' },
  { id: 'media', label: 'Così così', emoji: '🙂', note: 'Un po’ di movimento ci sta' },
  { id: 'tanta', label: 'Tanta voglia', emoji: '🔥', note: 'Dai, sudiamo un po’!' },
];

export const DIFFICOLTA = [
  { id: 'facile', label: 'Facile', emoji: '🌿' },
  { id: 'intermedio', label: 'Intermedio', emoji: '⚡' },
  { id: 'difficile', label: 'Difficile', emoji: '🔥' },
];

const WARMUP = [
  'Marcia sul posto 1 minuto, braccia che oscillano avanti e indietro',
  'Cerchi con le braccia: 10 per senso, per sciogliere le spalle',
  'Rotazioni lente del collo e delle spalle, senza forzare',
  'Cerchi con i fianchi: 8 per lato',
  'Saliscendi sui talloni 20 volte, per svegliare le gambe',
  'Twist del busto: 10 rotazioni dolci da seduti o in piedi',
];

const LEGS = [
  'Squat: 10-12, scendi come se ti sedessi su una sedia immaginaria',
  'Affondi alternati: 8 per gamba',
  'Ponte glutei: 12, solleva il bacino da terra',
  'Wall sit: tieni la posizione 30 sec contro il muro',
  'Sollevamenti tallone: 20, per tonificare i polpacci',
];

const PUSH = [
  'Flessioni a terra o contro il muro: 8-10',
  'Dip sulla sedia: 10, braccia ai lati del sedere',
  'Plank sulle braccia: 20-30 sec',
  'Pike push-up: 6-8, per le spalle',
];

const CORE = [
  'Plank: 30 sec, pancia ben dura',
  'Crunch: 12, solleva le spalle da terra',
  'Sollevamenti gambe: 10, da sdraiati',
  'Bicicletta: 20, ginocchia alternate',
  'Mountain climber: 20 (scorre anche come cardio)',
];

const CARDIO = [
  'Jumping jacks: 30 sec',
  'Corri sul posto: 30 sec, ginocchia alte',
  'High knees: 30 sec',
  'Saltelli laterali: 20 per lato',
  'Burpees: 6, se ne hai voglia',
];

const COOLDOWN = [
  'Piegati in avanti e lascia penzolare la testa, 30 sec',
  'Child’s pose: 30 sec, respira nelle spalle',
  'Cat-cow: 5 ripetizioni lente',
  'Abbraccia te stesso e apri le braccia: stretching spalle',
  '3 inspirazioni profonde, mani sull’addome',
];

// Numero di esercizi nel circuito, giri (in base alla voglia) e impegno.
const CONFIG = {
  facile: { n: 4, rounds: [2, 2, 3], workSec: 30, work: '30 sec o 8-10 ripetizioni', rest: 20 },
  intermedio: { n: 6, rounds: [2, 3, 4], workSec: 40, work: '40 sec o 12-15 ripetizioni', rest: 15 },
  difficile: { n: 8, rounds: [3, 4, 5], workSec: 50, work: '50 sec o 15-20 ripetizioni', rest: 10 },
};

// RNG deterministico (mulberry32) così un dato seed dà sempre lo stesso giro:
// serve per rigenerare circuiti diversi con il bottone "Un altro giro".
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickN(arr, n, rng) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// Se la voglia è "poca", togliamo i burpees (troppo impegnativi).
function poolsFor(voglia) {
  if (voglia !== 'poca') return { legs: LEGS, push: PUSH, core: CORE, cardio: CARDIO };
  const noBurpee = (a) => a.filter((s) => !/burpees/i.test(s));
  return { legs: noBurpee(LEGS), push: noBurpee(PUSH), core: noBurpee(CORE), cardio: noBurpee(CARDIO) };
}

export function buildCircuit({ difficolta = 'facile', voglia = 'media', seed = 1 } = {}) {
  const cfg = CONFIG[difficolta] || CONFIG.facile;
  const vi = Math.max(0, VOGLIA.findIndex((v) => v.id === voglia));
  const rng = mulberry32(((seed >>> 0) ^ hashStr(difficolta + '|' + voglia)) >>> 0);

  const pools = poolsFor(voglia);
  const warmup = pickN(WARMUP, 3, rng);
  const cooldown = pickN(COOLDOWN, 3, rng);

  // Garantisce che il circuito tocchi tutto il corpo: almeno un esercizio per
  // categoria (gambe, spinta, core, cardio), poi riempie con altri a caso.
  const cats = [pools.legs, pools.push, pools.core, pools.cardio];
  let circuit = cats.map((c) => pickN(c, 1, rng)[0]);
  const allenati = [...pools.legs, ...pools.push, ...pools.core, ...pools.cardio];
  const restanti = Math.max(0, cfg.n - circuit.length);
  for (let i = 0; i < restanti; i++) circuit.push(pickN(allenati, 1, rng)[0]);
  circuit = pickN(circuit, circuit.length, rng); // mescola l'ordine

  const rounds = cfg.rounds[vi];
  const rest = `${cfg.rest} sec di pausa`;
  const totalSec = rounds * cfg.n * (cfg.workSec + cfg.rest);
  const durata = totalSec < 90 ? `~1 min` : `~${Math.max(1, Math.round(totalSec / 60))} min`;

  return { difficolta, voglia, warmup, circuit, cooldown, rounds, work: cfg.work, rest, durata };
}
