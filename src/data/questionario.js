// Questionario breve (7 domande). `type` supportati dall'UI:
//  - single: una scelta
//  - multi:  più scelte
//  - scale:  scala numerica 1..5

export const DOMANDE = [
  {
    id: 'tempo',
    q: 'Da quanto tempo è finita la relazione?',
    type: 'single',
    options: [
      { value: '<1m', label: 'Meno di un mese' },
      { value: '1-3m', label: 'Tra 1 e 3 mesi' },
      { value: '3-6m', label: 'Tra 3 e 6 mesi' },
      { value: '>6m', label: 'Più di 6 mesi' },
    ],
  },
  {
    id: 'chi',
    q: 'Come è andata?',
    type: 'single',
    options: [
      { value: 'lasciato', label: "Mi ha lasciato l'altro/a" },
      { value: 'lasciato_io', label: 'Ho lasciato io' },
      { value: 'accordo', label: 'Accordo reciproco' },
    ],
  },
  {
    id: 'dolore',
    q: 'Quanto è intenso il dolore adesso?',
    type: 'scale',
    hint: '1 = sopportabile · 5 = insopportabile',
    options: [1, 2, 3, 4, 5],
  },
  {
    id: 'sintomi',
    q: 'Cosa provi di più? (più risposte possibili)',
    type: 'multi',
    options: [
      { value: 'tristezza', label: 'Tristezza profonda' },
      { value: 'ansia', label: 'Ansia / attacchi di panico' },
      { value: 'insonnia', label: 'Insonnia / sonno disturbato' },
      { value: 'rabbia', label: 'Rabbia / frustrazione' },
      { value: 'vuoto', label: 'Senso di vuoto' },
      { value: 'social', label: 'Controllo ossessivo dei suoi social' },
      { value: 'ossessione', label: 'Pensieri fissi su di lei/lui' },
    ],
  },
  {
    id: 'supporto',
    q: 'Hai persone con cui parlarne?',
    type: 'single',
    options: [
      { value: 'si', label: 'Sì, ho un buon supporto' },
      { value: 'poco', label: 'Poco' },
      { value: 'no', label: 'No, sono solo/a' },
    ],
  },
  {
    id: 'terapia',
    q: 'Stai già seguendo un percorso con uno psicologo?',
    type: 'single',
    options: [
      { value: 'si', label: 'Sì' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'crisi',
    q: 'Negli ultimi giorni hai avuto pensieri di farti del male?',
    type: 'single',
    options: [
      { value: 'no', label: 'No, mai' },
      { value: 'a_volte', label: 'A volte, ma non agirei' },
      { value: 'si', label: 'Sì, e mi spaventano' },
    ],
  },
];

// Domanda sull'obiettivo "no contact": si chiede solo la PRIMA volta (quando
// l'utente non ha ancora scelto un obiettivo). Va impostata nel primo
// questionario, non ogni giorno.
export const DOMANDA_OBIETTIVO = {
  id: 'obiettivo',
  q: 'No contact: qual è il tuo obiettivo?',
  hint: "Dopo la fine di una relazione, il no contact è importante: tagliare i contatti con l'ex aiuta a ritrovare te stesso/a e a smettere di soffrire per il passato. Inizia da piccoli obiettivi: anche solo 5 giorni fanno la differenza.",
  type: 'single',
  options: [
    { value: '5', label: '5 giorni' },
    { value: '10', label: '10 giorni' },
    { value: '30', label: '1 mese' },
  ],
};
