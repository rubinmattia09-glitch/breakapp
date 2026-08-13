// Logica di personalizzazione del percorso.
// Riceve le risposte del questionario e restituisce:
//  { profilo, crisi, livelloCrisi, moduli[] }

export const CRISI = [
  { nome: 'Emergenza sanitaria', numero: '112 / 118' },
  { nome: 'Telefono Amico (ascolto)', numero: '199 284 284' },
  { nome: 'Samaritans Onlus', numero: '06 7720 8977' },
  { nome: 'Centro di ascolto', numero: '800 274 274' },
];

const MODULI = {
  grounding: {
    id: 'grounding',
    titolo: 'Respiro e radicamento',
    descrizione: 'Un esercizio breve da fare ogni giorno per calmare il sistema nervoso quando arriva la vampata di emozione.',
    durata: '~5 min',
    attivita: [
      'Fai un respiro guidato: inspira 4 secondi, trattieni 2, espira 6. Ripeti il ciclo per 5 volte, sentendo le spalle che si abbassano a ogni espiro.',
      'Prova il grounding 5-4-3-2-1: guardati intorno e nomina 5 cose che vedi, 4 che tocchi, 3 che senti, 2 che annusi e 1 che assapori, per riportare i sensi al presente.',
    ],
    persona: 'sofia',
  },
  elaborare: {
    id: 'elaborare',
    titolo: 'Elaborare la fine',
    descrizione: 'Lasciare che il lutto della relazione si faccia sentire, senza correre a rimuoverlo.',
    durata: '~10 min',
    attivita: [
      'Scrivi una lettera che non invierai mai: metti dentro tutto quello che avresti voluto dire, senza filtri né giudizio, poi lasciala lì.',
      'Dai un nome al sentimento di oggi (tristezza, paura, sollievo?) e accoglilo per due minuti, senza cercare di cambiarlo.',
    ],
    persona: 'elena',
  },
  rifiuto: {
    id: 'rifiuto',
    titolo: 'Accogliere il rifiuto',
    descrizione: 'Quando è l’altro ad andarsene, il "non ero abbastanza" è una trappola. Lavoriamoci.',
    durata: '~10 min',
    attivita: [
      'Elenca 3 qualità di cui sei fiero/a e che esistono indipendentemente da quella relazione.',
      'Scrivi e rileggi: "La sua scelta dice di lui/lei, non del mio valore". Ripetilo quando torna la voce del "non ero abbastanza".',
    ],
    persona: 'elena',
  },
  colpa: {
    id: 'colpa',
    titolo: 'Liberarsi dal senso di colpa',
    descrizione: 'Se hai lasciato tu, il rimorso può restare. Riconoscerlo senza punirti.',
    durata: '~8 min',
    attivita: [
      'Qual era il motivo più onesto per andartene? Scrivilo e rileggilo domani, quando la testa è più lucida.',
      'Ricorda che chiudere può essere un atto di cura, non solo di abbandono: sei libero/a di volerti bene.',
    ],
    persona: 'marco',
  },
  chiusura: {
    id: 'chiusura',
    titolo: 'Chiudere con serenità',
    descrizione: 'Una fine condivisa merita un rito, non un vuoto.',
    durata: '~8 min',
    attivita: [
      'Scegli un piccolo gesto di chiusura: riporre un oggetto, cancellare una foto, o scrivere una frase finale che chiude il cerchio.',
      'Scrivi cosa porterai di positivo di questa relazione: una lezione, un gusto ritrovato, un lato di te che hai imparato a conoscere.',
    ],
    persona: 'elena',
  },
  ansia: {
    id: 'ansia',
    titolo: 'Regolare l’ansia',
    descrizione: 'Quando la mente corre, serve rallentare i pensieri automatici.',
    durata: '~12 min',
    attivita: [
      'Cattura il pensiero ricorrente e chiediti: "È un fatto oppure una paura?". Separa le due cose e guardale per quello che sono.',
      'Sfida il pensiero catastrofico con una prova contraria concreta: cosa dice la realtà, non il peggior scenario possibile.',
    ],
    persona: 'marco',
  },
  sonno: {
    id: 'sonno',
    titolo: 'Ritrovare il sonno',
    descrizione: 'Il dolore ruba il riposo. Una routine minima aiuta.',
    durata: '~15 min',
    attivita: [
      'Niente schermi 30 minuti prima di dormire, e cerca di andare a letto alla stessa ora ogni sera, anche nel weekend.',
      'Se la notte ti sveglia, appunta su un foglio ciò che ti preoccupa e chiudi il quaderno: così lo lasci fuori dalla testa.',
    ],
    persona: 'sofia',
  },
  digitale: {
    id: 'digitale',
    titolo: 'Slegarsi dal digitale',
    descrizione: 'Spiare i social alimenta la ferita. Ridurne l’accesso è un atto di cura.',
    durata: '~10 min',
    attivita: [
      'Disattiva le notifiche e silenzia i profili dell’ex per 7 giorni: ridurre l’accesso è cura, non debolezza.',
      'Ogni volta che vorresti controllare, fai 10 respiri prima e segna quante volte ci hai pensato oggi.',
    ],
    persona: 'marco',
  },
  rabbia: {
    id: 'rabbia',
    titolo: 'Lasciare andare la rabbia',
    descrizione: 'La rabbia trattenuta pesa. Darle una forma sana.',
    durata: '~10 min',
    attivita: [
      'Scrivi la lettera della rabbia, poi strappala: dare forma alla rabbia la alleggerisce.',
      'Muoviti 10 minuti, anche solo una camminata veloce, per scaricare la tensione dal corpo.',
    ],
    persona: 'marco',
  },
  vuoto: {
    id: 'vuoto',
    titolo: 'Ritrovare i propri spazi',
    descrizione: 'Dopo una relazione il "chi sono io" va ritrovato.',
    durata: '~12 min',
    attivita: [
      'Scegli un’attività solo per te, anche piccola, e falla oggi: ritrovare i propri spazi parte dal qui e ora.',
      'Scrivi 3 cose che ti piacevano prima e che vorresti riprendere: la persona che eri c’è ancora.',
    ],
    persona: 'elena',
  },
  rete: {
    id: 'rete',
    titolo: 'Costruire una rete',
    descrizione: 'Il silenzio intorno amplifica il dolore. Un contatto conta.',
    durata: '~10 min',
    attivita: [
      'Scrivi 2 nomi di persone a cui potresti mandare un messaggio oggi, anche solo per dirti "ci sono".',
      'Cerca un gruppo di mutuo aiuto vicino a te: il silenzio intorno amplifica il dolore, un contatto conta.',
    ],
    persona: 'elena',
  },
  complemento: {
    id: 'complemento',
    titolo: 'L’app accanto alla tua terapia',
    descrizione: 'Stai già con un professionista: usiamo l’app come ponte tra un incontro e l’altro.',
    durata: 'continuo',
    attivita: [
      'Appunta qui cosa vorresti portare al prossimo appuntamento con il/la tuo/a professionista.',
      'Usa il diario dell’app per notare i cambiamenti tra una seduta e l’altra: il ponte più utile è quello che vedi tu.',
    ],
    persona: 'marco',
  },
};

export function computePathway(answers) {
  const moduli = [];
  const visto = new Set();

  const push = (key) => {
    if (!visto.has(key) && MODULI[key]) {
      visto.add(key);
      moduli.push(MODULI[key]);
    }
  };

  // Base per tutti
  push('grounding');

  if (answers.tempo === '<1m' || answers.tempo === '1-3m') push('elaborare');
  if (answers.tempo === '>6m') push('vuoto');

  if (answers.chi === 'lasciato') push('rifiuto');
  if (answers.chi === 'lasciato_io') push('colpa');
  if (answers.chi === 'accordo') push('chiusura');

  const sintomi = Array.isArray(answers.sintomi) ? answers.sintomi : [];
  if (sintomi.includes('ansia')) push('ansia');
  if (sintomi.includes('insonnia')) push('sonno');
  if (sintomi.includes('social') || sintomi.includes('ossessione')) push('digitale');
  if (sintomi.includes('rabbia')) push('rabbia');
  if (sintomi.includes('vuoto') || sintomi.includes('tristezza')) push('vuoto');

  if (answers.supporto === 'no' || answers.supporto === 'poco') push('rete');
  if (answers.terapia === 'si') push('complemento');

  // Ordine sensato: prima calmare, poi elaborare, poi costruire
  const ordine = ['grounding', 'elaborare', 'rifiuto', 'colpa', 'chiusura', 'ansia', 'sonno', 'digitale', 'rabbia', 'vuoto', 'rete', 'complemento'];
  moduli.sort((a, b) => ordine.indexOf(a.id) - ordine.indexOf(b.id));

  const dolore = Number(answers.dolore) || 3;
  const livelloCrisi = answers.crisi === 'si' ? 'alto' : answers.crisi === 'a_volte' ? 'medio' : 'basso';

  let profilo = '';
  if (answers.chi === 'lasciato') profilo += 'Hai subìto la fine e ora stai rimettendo insieme il senso del tuo valore. ';
  if (answers.chi === 'lasciato_io') profilo += 'Hai scelto di chiudere, e convivi con il rimorso oltre che con la liberazione. ';
  if (answers.chi === 'accordo') profilo += 'È finita di comune accordo: serve un rito, non un vuoto. ';
  if (dolore >= 4) profilo += 'Il dolore ora è molto intenso: il percorso procede per piccoli passi, senza fretta. ';
  else if (dolore <= 2) profilo += 'Il dolore è presente ma gestibile: possiamo già costruire. ';
  if (livelloCrisi !== 'basso') profilo += 'Hai segnalato pensieri difficili: per questo il percorso mette la sicurezza al primo posto. ';

  return { profilo: profilo.trim(), crisi: livelloCrisi !== 'basso', livelloCrisi, moduli };
}
