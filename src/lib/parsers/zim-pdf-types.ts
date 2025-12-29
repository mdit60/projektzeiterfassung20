// src/lib/parsers/zim-pdf-types.ts
// Typen für ZIM-PDF-Parser

export interface ZimProjekt {
  name: string
  kurzname: string
  fkz: string
  start: string
  ende: string
  foerderquote: number
  gesamtkosten: number
  zuwendung: number
  gesamt_pm: number
  gesamt_pk: number
}

export interface ZimAntragsteller {
  firma: string
  rechtsform: string
  strasse: string
  plz: string
  ort: string
  bundesland: string
  website: string
  ansprechpartner_name: string
  ansprechpartner_funktion: string
  ansprechpartner_telefon: string
  ansprechpartner_email: string
}

export interface ZimMitarbeiter {
  ma_nr: number
  nachname: string
  vorname: string
  qualifikation: string
  qualifikation_gruppe: number // 1-4
  geburtsdatum: string
  funktion: string
  angestellt_seit: string
  jahresbrutto: number
  stundensatz: number
  wochenstunden: number
  teilzeitfaktor: number
  pm_gesamt: number
  kosten_gesamt: number
  pm_pro_jahr: Record<number, number> // {2023: 5.5, 2024: 6.0}
}

export interface ZimArbeitspaket {
  ap_nr: string
  beschreibung: string
  von: string
  bis: string
  ma_nr: number
  pm: number
}

export interface ZimAntrag {
  projekt: ZimProjekt
  antragsteller: ZimAntragsteller
  mitarbeiter: ZimMitarbeiter[]
  arbeitspakete: ZimArbeitspaket[]
  parse_datum: string
  quell_datei: string
}

export interface ParseResult {
  success: boolean
  data?: ZimAntrag
  error?: string
  warnings?: string[]
}

// Qualifikationsgruppen
export const QUALIFIKATIONSGRUPPEN: Record<number, string> = {
  1: 'Gruppe 1 (Hochschulabschluss)',
  2: 'Gruppe 2 (FH/Techniker)',
  3: 'Gruppe 3 (Facharbeiter)',
  4: 'Gruppe 4 (Sonstige)',
}

// Bundesländer-Mapping
export const BUNDESLAENDER: Record<string, string> = {
  'BW': 'Baden-Württemberg',
  'BY': 'Bayern',
  'BE': 'Berlin',
  'BB': 'Brandenburg',
  'HB': 'Bremen',
  'HH': 'Hamburg',
  'HE': 'Hessen',
  'MV': 'Mecklenburg-Vorpommern',
  'NI': 'Niedersachsen',
  'NW': 'Nordrhein-Westfalen',
  'RP': 'Rheinland-Pfalz',
  'SL': 'Saarland',
  'SN': 'Sachsen',
  'ST': 'Sachsen-Anhalt',
  'SH': 'Schleswig-Holstein',
  'TH': 'Thüringen',
}