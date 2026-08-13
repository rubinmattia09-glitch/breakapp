// Estrae i parametri di respirazione da un testo di attività, se quest'ultimo
// descrive un esercizio di respiro guidato. Ritorna null se il testo non è un
// esercizio di respirazione.
//
// Formato atteso (es. nel modulo "grounding" di pathway.js):
//   "Fai un respiro guidato: inspira 4 secondi, trattieni 2, espira 6.
//    Ripeti il ciclo per 5 volte ..."
// I valori sono cercati per parola chiave, quindi l'ordine non importa.
export function parseBreathing(text) {
  if (!text || typeof text !== 'string') return null;
  const s = text.toLowerCase();
  if (!/respir/i.test(s)) return null; // deve parlare di respiro

  // Prova in ordine diverse regex: prima "parola NUMERO" (es. "inspira 4"),
  // poi "NUMERO per parola" (es. "3 per inspirare"), così regge entrambi gli
  // ordini in cui può essere scritta l'attività.
  const grab = (...regexes) => {
    for (const re of regexes) {
      const m = s.match(re);
      if (m) return parseInt(m[1], 10);
    }
    return 0;
  };

  const inhale = grab(/inspira\s+(\d+)/, /(\d+)\s*(?:secondi?)?\s*per\s+inspira/) * 1000;
  const hold = grab(/trattieni\s+(\d+)/) * 1000;
  const exhale = grab(/espira\s+(\d+)/, /(\d+)\s*(?:secondi?)?\s*per\s+espira/) * 1000;
  // "per 5 volte" oppure "5 volte" oppure "4 respiri"
  const cycles = grab(/per\s+(\d+)\s*volte/, /(\d+)\s*volte/, /(\d+)\s*respiri/);

  return {
    inhale: inhale || 4000,
    hold: hold || 0,
    exhale: exhale || 6000,
    rest: 0, // pausa dopo l'espiro (non presente nei testi attuali)
    cycles: cycles || 0, // 0 = illimitato (calmo classico)
  };
}

// Costruisce la sequenza di fasi (con scala del cerchio) a partire da un pattern.
// Le fasi con durata 0 vengono saltate. `scale: 1` = cerchio grande (inspiro),
// `scale: 0.55` = cerchio piccolo (espiro).
export function buildPhases(pattern) {
  const p = pattern || {};
  const inhale = p.inhale || 4000;
  const hold = p.hold || 0;
  const exhale = p.exhale || 6000;
  const rest = p.rest || 0;

  const phases = [];
  if (inhale > 0) phases.push({ key: 'inspira', label: 'Inspira', dur: inhale, scale: 1 });
  if (hold > 0) phases.push({ key: 'trattieni', label: 'Trattieni', dur: hold, scale: 1 });
  if (exhale > 0) phases.push({ key: 'espira', label: 'Espira', dur: exhale, scale: 0.55 });
  if (rest > 0) phases.push({ key: 'riposa', label: 'Riposa', dur: rest, scale: 0.55 });
  return phases;
}

// Ritmo "calmante" di default (quello storico dell'app): inspira 4s, trattieni
// 2s, espira 6s, riposa 1s, in loop illimitato.
export const DEFAULT_PATTERN = {
  inhale: 4000,
  hold: 2000,
  exhale: 6000,
  rest: 1000,
  cycles: 0,
};

// Frase riassuntiva del ritmo, es. "Inspira 4s · Trattieni 2s · Espira 6s · 5 volte".
export function describePattern(pattern) {
  const p = pattern || DEFAULT_PATTERN;
  const parts = [`Inspira ${p.inhale / 1000}s`];
  if (p.hold) parts.push(`Trattieni ${p.hold / 1000}s`);
  parts.push(`Espira ${p.exhale / 1000}s`);
  if (p.rest) parts.push(`Riposa ${p.rest / 1000}s`);
  if (p.cycles) parts.push(`${p.cycles} volte`);
  return parts.join(' · ');
}
