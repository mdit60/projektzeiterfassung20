// ============================================================================
// PZE V7 - Zentrale Utility fuer deutsche Feiertage
// ============================================================================
// Datei: src/lib/holidays/germanHolidays.ts
// Version: v7.4.6-1
// Datum: 20. April 2026
//
// Konsolidiert die zuvor in TimesheetForm, BerichtePage und StundennachweisMatrix
// dreifach duplizierte Feiertagslogik in eine einzige Utility.
//
// Zustaendig fuer:
// - Normalisierung Bundesland-Bezeichnung -> ISO-Code ("DE-BY")
// - Berechnung der gesetzlichen Feiertage pro Jahr + Bundesland
// - Beruecksichtigung kommunaler Sonderfaelle ueber holiday_region
//   (BY_KATH, BY_EVAN, BY_AUGSBURG, SN_SORB, TH_EICHSFELD)
// - Kalender-Sollarbeitstage (Werktage minus Feiertage)
//
// NICHT zustaendig fuer:
// - ZIM-Maximalstunden pro Monat (= WAZ x 52 / 12, siehe ZAPanel/TimesheetForm)
// - FZul-Jahresarbeitszeit (MA-spezifisch mit Urlaub/Ausfallzeiten-Abzug,
//   gehoert in separate Utility src/lib/fzul/ falls benoetigt)
// ============================================================================

// ---------------------------------------------------------------------------
// TYPEN
// ---------------------------------------------------------------------------

/**
 * ISO-Code eines deutschen Bundeslandes (DE-BW bis DE-TH) oder Leerstring.
 * Leerstring = unbekannt/nicht gesetzt -> nur bundesweite Feiertage.
 */
export type StateCode =
  | 'DE-BW' | 'DE-BY' | 'DE-BE' | 'DE-BB'
  | 'DE-HB' | 'DE-HH' | 'DE-HE' | 'DE-MV'
  | 'DE-NI' | 'DE-NW' | 'DE-RP' | 'DE-SL'
  | 'DE-SN' | 'DE-ST' | 'DE-SH' | 'DE-TH'
  | '';

/**
 * Optionaler Override fuer kommunale Feiertags-Sonderfaelle.
 * NULL / undefined = Standard-Regel gemaess Bundesland.
 */
export type HolidayRegion =
  | 'BY_KATH'        // Bayern, ueberw. katholisch (= Default fuer DE-BY)
  | 'BY_EVAN'        // Bayern, ueberw. evangelisch (KEIN 15.08.)
  | 'BY_AUGSBURG'    // Stadt Augsburg (15.08. + Friedensfest 08.08.)
  | 'SN_SORB'        // Sachsen, sorbisches Siedlungsgebiet (Fronleichnam)
  | 'TH_EICHSFELD'   // Thueringen, Eichsfeld-Region (Fronleichnam)
  | null
  | undefined;

/**
 * Liste aller gueltigen HolidayRegion-Werte fuer UI-Dropdowns und Validierung.
 */
export const HOLIDAY_REGION_VALUES: Array<Exclude<HolidayRegion, null | undefined>> = [
  'BY_KATH',
  'BY_EVAN',
  'BY_AUGSBURG',
  'SN_SORB',
  'TH_EICHSFELD',
];

/**
 * Lesbare Labels fuer UI-Dropdowns (Beschriftung in der FirmendatenCard).
 */
export const HOLIDAY_REGION_LABELS: Record<Exclude<HolidayRegion, null | undefined>, string> = {
  BY_KATH:      'Bayern - ueberwiegend katholische Gemeinde (Mariae Himmelfahrt = Feiertag)',
  BY_EVAN:      'Bayern - ueberwiegend evangelische Gemeinde (kein Mariae Himmelfahrt)',
  BY_AUGSBURG:  'Stadt Augsburg (zusaetzlich Friedensfest am 08.08.)',
  SN_SORB:      'Sachsen - sorbisches Siedlungsgebiet (mit Fronleichnam)',
  TH_EICHSFELD: 'Thueringen - Eichsfeld / Unstrut-Hainich / Wartburgkreis (mit Fronleichnam)',
};

/**
 * Bundeslaender, bei denen im UI das holiday_region-Dropdown angeboten wird.
 * Andere Bundeslaender haben keine kommunalen Sonderregelungen.
 */
export const STATES_WITH_HOLIDAY_REGION: StateCode[] = ['DE-BY', 'DE-SN', 'DE-TH'];

// ---------------------------------------------------------------------------
// NORMALISIERUNG
// ---------------------------------------------------------------------------

/**
 * Wandelt jede bekannte Bundesland-Bezeichnung in den ISO-Code um.
 * Akzeptiert Langnamen ("Bayern"), englische Varianten ("Bavaria") und
 * bereits normalisierte ISO-Codes ("DE-BY"). Unbekannt -> Leerstring.
 */
export function normalizeStateCode(state: string | null | undefined): StateCode {
  if (!state) return '';
  const trimmed = state.trim();
  if (trimmed === '') return '';

  // Bereits ISO-Code (auch in Kleinbuchstaben)?
  const upper = trimmed.toUpperCase();
  if (upper.startsWith('DE-')) {
    return isValidIsoCode(upper) ? (upper as StateCode) : '';
  }

  // Langname -> ISO
  const map: Record<string, StateCode> = {
    'baden-wuerttemberg':     'DE-BW',
    'baden-wurttemberg':      'DE-BW',
    'baden-württemberg':      'DE-BW',
    'bayern':                 'DE-BY',
    'bavaria':                'DE-BY',
    'berlin':                 'DE-BE',
    'brandenburg':            'DE-BB',
    'bremen':                 'DE-HB',
    'hamburg':                'DE-HH',
    'hessen':                 'DE-HE',
    'hesse':                  'DE-HE',
    'mecklenburg-vorpommern': 'DE-MV',
    'niedersachsen':          'DE-NI',
    'lower saxony':           'DE-NI',
    'nordrhein-westfalen':    'DE-NW',
    'north rhine-westphalia': 'DE-NW',
    'rheinland-pfalz':        'DE-RP',
    'rhineland-palatinate':   'DE-RP',
    'saarland':               'DE-SL',
    'sachsen':                'DE-SN',
    'saxony':                 'DE-SN',
    'sachsen-anhalt':         'DE-ST',
    'saxony-anhalt':          'DE-ST',
    'schleswig-holstein':     'DE-SH',
    'thueringen':             'DE-TH',
    'thüringen':              'DE-TH',
    'thuringia':              'DE-TH',
  };

  const key = trimmed.toLowerCase();
  return map[key] ?? '';
}

function isValidIsoCode(code: string): boolean {
  return [
    'DE-BW','DE-BY','DE-BE','DE-BB','DE-HB','DE-HH','DE-HE','DE-MV',
    'DE-NI','DE-NW','DE-RP','DE-SL','DE-SN','DE-ST','DE-SH','DE-TH',
  ].includes(code);
}

// ---------------------------------------------------------------------------
// DATUM-HILFSFUNKTIONEN
// ---------------------------------------------------------------------------

/**
 * Gauss'sche Osterformel - gleiche Implementierung wie in den bisherigen
 * Duplikaten, damit keine Datumsverschiebung bei der Umstellung entsteht.
 */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(d.getDate() + days);
  return result;
}

// ---------------------------------------------------------------------------
// FEIERTAGS-BERECHNUNG
// ---------------------------------------------------------------------------

/**
 * Liefert alle gesetzlichen Feiertage fuer ein Jahr am angegebenen Arbeitsort.
 *
 * @param year      Kalenderjahr (z.B. 2026)
 * @param state     Bundesland als ISO-Code oder Langname (wird normalisiert)
 * @param region    Optional: kommunaler Sonderfall (BY_EVAN, BY_AUGSBURG, ...)
 * @returns         Map: "YYYY-MM-DD" -> Feiertagsbezeichnung
 */
export function getGermanHolidays(
  year: number,
  state: string | null | undefined,
  region?: HolidayRegion,
): Map<string, string> {
  const stateCode = normalizeStateCode(state);
  const holidays = new Map<string, string>();
  const easter = getEasterSunday(year);

  // -------------------------------------------------------------------------
  // Bundesweite Feiertage
  // -------------------------------------------------------------------------
  holidays.set(`${year}-01-01`, 'Neujahr');
  holidays.set(formatDate(addDays(easter, -2)), 'Karfreitag');
  holidays.set(formatDate(addDays(easter, 1)), 'Ostermontag');
  holidays.set(`${year}-05-01`, 'Tag der Arbeit');
  holidays.set(formatDate(addDays(easter, 39)), 'Christi Himmelfahrt');
  holidays.set(formatDate(addDays(easter, 50)), 'Pfingstmontag');
  holidays.set(`${year}-10-03`, 'Tag der Deutschen Einheit');
  holidays.set(`${year}-12-25`, '1. Weihnachtstag');
  holidays.set(`${year}-12-26`, '2. Weihnachtstag');

  // -------------------------------------------------------------------------
  // Laenderspezifische Feiertage (Standard)
  // -------------------------------------------------------------------------

  // Heilige Drei Koenige (06.01.)
  if (['DE-BW', 'DE-BY', 'DE-ST'].includes(stateCode)) {
    holidays.set(`${year}-01-06`, 'Heilige Drei Koenige');
  }

  // Internationaler Frauentag (08.03.) - seit 2019 BE, seit 2023 MV
  if (['DE-BE', 'DE-MV'].includes(stateCode)) {
    holidays.set(`${year}-03-08`, 'Internationaler Frauentag');
  }

  // Fronleichnam: 60 Tage nach Ostern
  // Standard-Bundeslaender: BW, BY, HE, NW, RP, SL
  // Sonderfaelle ueber holiday_region: SN_SORB, TH_EICHSFELD
  const fronleichnam = formatDate(addDays(easter, 60));
  if (['DE-BW', 'DE-BY', 'DE-HE', 'DE-NW', 'DE-RP', 'DE-SL'].includes(stateCode)) {
    holidays.set(fronleichnam, 'Fronleichnam');
  } else if (region === 'SN_SORB' && stateCode === 'DE-SN') {
    holidays.set(fronleichnam, 'Fronleichnam');
  } else if (region === 'TH_EICHSFELD' && stateCode === 'DE-TH') {
    holidays.set(fronleichnam, 'Fronleichnam');
  }

  // Augsburger Hohes Friedensfest (08.08.) - nur Stadtgebiet Augsburg
  if (region === 'BY_AUGSBURG' && stateCode === 'DE-BY') {
    holidays.set(`${year}-08-08`, 'Augsburger Friedensfest');
  }

  // Mariae Himmelfahrt (15.08.)
  // Saarland: landesweit
  // Bayern: nur in ueberwiegend katholischen Gemeinden
  //   BY_KATH oder BY_AUGSBURG -> JA
  //   BY_EVAN                  -> NEIN
  //   kein region gesetzt      -> historisch JA (Default fuer alle bayerischen Firmen);
  //                                Admins koennen BY_EVAN setzen um abzuwaehlen
  if (stateCode === 'DE-SL') {
    holidays.set(`${year}-08-15`, 'Mariae Himmelfahrt');
  } else if (stateCode === 'DE-BY') {
    if (region === 'BY_EVAN') {
      // explizit kein Feiertag
    } else {
      // BY_KATH, BY_AUGSBURG oder undefined -> Feiertag
      holidays.set(`${year}-08-15`, 'Mariae Himmelfahrt');
    }
  }

  // Weltkindertag (20.09.) - nur Thueringen seit 2019
  if (stateCode === 'DE-TH') {
    holidays.set(`${year}-09-20`, 'Weltkindertag');
  }

  // Reformationstag (31.10.) - alle neuen BL + HB/HH/NI/SH
  if (['DE-BB','DE-HB','DE-HH','DE-MV','DE-NI','DE-SN','DE-ST','DE-SH','DE-TH'].includes(stateCode)) {
    holidays.set(`${year}-10-31`, 'Reformationstag');
  }

  // Allerheiligen (01.11.)
  if (['DE-BW', 'DE-BY', 'DE-NW', 'DE-RP', 'DE-SL'].includes(stateCode)) {
    holidays.set(`${year}-11-01`, 'Allerheiligen');
  }

  // Buss- und Bettag (Mittwoch vor dem 23. November) - nur Sachsen
  if (stateCode === 'DE-SN') {
    holidays.set(formatDate(getBussUndBettag(year)), 'Buss- und Bettag');
  }

  return holidays;
}

/**
 * Buss- und Bettag: letzter Mittwoch vor dem Ewigkeitssonntag,
 * rechnerisch: der Mittwoch vor dem 23. November.
 */
function getBussUndBettag(year: number): Date {
  const nov23 = new Date(year, 10, 23);
  const dow = nov23.getDay(); // 0=So, 3=Mi
  // Anzahl Tage zurueck zum Mittwoch. Wenn der 23. selbst Mi ist, gehen wir
  // 7 Tage zurueck (der Mittwoch VOR dem 23.11.).
  let back = dow - 3;
  if (back <= 0) back += 7;
  return addDays(nov23, -back);
}

// ---------------------------------------------------------------------------
// ARBEITSTAGE / FEIERTAGS-ABFRAGEN
// ---------------------------------------------------------------------------

/**
 * Prueft, ob ein Datum ein gesetzlicher Feiertag am Arbeitsort ist.
 * @returns  Name des Feiertags oder null.
 */
export function isHoliday(
  date: Date,
  state: string | null | undefined,
  region?: HolidayRegion,
): string | null {
  const year = date.getFullYear();
  const holidays = getGermanHolidays(year, state, region);
  return holidays.get(formatDate(date)) ?? null;
}

/**
 * Prueft, ob ein Datum ein Arbeitstag ist (Montag-Freitag, kein Feiertag).
 */
export function isWorkday(
  date: Date,
  state: string | null | undefined,
  region?: HolidayRegion,
): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false; // Sa/So
  return isHoliday(date, state, region) === null;
}

/**
 * Zaehlt die Kalender-Sollarbeitstage im Zeitraum (inklusive beider Grenzen).
 * Sollarbeitstag = Mo-Fr und kein gesetzlicher Feiertag am Arbeitsort.
 *
 * Achtung: Diese Funktion beruecksichtigt NICHT individuelle Ausfallzeiten
 * (Urlaub, Krankheit) eines Mitarbeiters. Fuer die FZul-Jahresarbeitszeit
 * muessen diese aus v7_timesheets separat abgezogen werden.
 *
 * @param von    Startdatum (inklusive)
 * @param bis    Enddatum (inklusive)
 * @param state  Bundesland (Langname oder ISO-Code)
 * @param region Optional: kommunaler Sonderfall
 */
export function countWorkdays(
  von: Date,
  bis: Date,
  state: string | null | undefined,
  region?: HolidayRegion,
): number {
  if (bis < von) return 0;

  // Pro Kalenderjahr nur einmal die Feiertagsmap berechnen (Performance).
  const holidayMapCache = new Map<number, Map<string, string>>();

  let count = 0;
  const cursor = new Date(von.getFullYear(), von.getMonth(), von.getDate());
  const endMidnight = new Date(bis.getFullYear(), bis.getMonth(), bis.getDate());

  while (cursor <= endMidnight) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      const year = cursor.getFullYear();
      let map = holidayMapCache.get(year);
      if (!map) {
        map = getGermanHolidays(year, state, region);
        holidayMapCache.set(year, map);
      }
      if (!map.has(formatDate(cursor))) {
        count++;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Zaehlt die Sollarbeitstage eines einzelnen Kalendermonats.
 * Convenience-Wrapper fuer countWorkdays.
 */
export function countWorkdaysInMonth(
  year: number,
  month: number, // 1-12
  state: string | null | undefined,
  region?: HolidayRegion,
): number {
  const von = new Date(year, month - 1, 1);
  const bis = new Date(year, month, 0); // letzter Tag des Monats
  return countWorkdays(von, bis, state, region);
}
