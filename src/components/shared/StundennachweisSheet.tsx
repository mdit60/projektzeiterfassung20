// src/components/shared/StundennachweisSheet.tsx
// ============================================================================
// PZE V7 - Shared Component: Stundennachweis-Blatt (Anzeige/Druck)
// ============================================================================
// Version: 1.0.0
// Datum: 11. Juni 2026
// Zweck: Reine Anzeige-Komponente fuer EIN Stundennachweis-Blatt. Rendert das
//   offizielle Layout statisch (keine Eingabefelder, keine DB, kein State) aus
//   einem vorberechneten Anzeigemodell (buildStundennachweisSheetData).
//   Verwendet im Sammeldruck (StundennachweisMatrix) und perspektivisch als
//   gemeinsame Druckdarstellung des Einzeldrucks.
//
// Layout 1:1 uebernommen aus TimesheetForm v7.4.6-29 (printRef-Bereich):
//   Kopf-Tabelle, Hinweistext, Kalender (AP-Zeilen + Summen), nicht
//   zuschussfaehige Arbeiten, Fehlzeiten (U/K/S), Fussnoten, Unterschriften.
//
// Die globale Druck-CSS (@page A4 quer, Farb-Druck exakt, 8px) wird vom
//   umgebenden Druck-Container EINMAL gesetzt (nicht hier, um Duplikate bei
//   N Blaettern zu vermeiden). Diese Komponente steuert nur den Seitenumbruch.
//
// HINWEIS Zahlenformat: bewusst identisch zum bestehenden Einzeldruck --
//   Tageswerte mit Komma, Summen-/Gesamtzellen mit toFixed(2) (Punkt). So
//   sieht das Sammel-PDF exakt aus wie der gewohnte Einzelausdruck.
// ============================================================================

'use client';

import React from 'react';
import type { StundennachweisSheetData } from '@/lib/stundennachweisSheetData';

const HEADER_ORANGE = '#F5D9C0';

interface StundennachweisSheetProps {
  data: StundennachweisSheetData;
  // Seitenumbruch nach diesem Blatt erzwingen (fuer gestapelten Sammeldruck).
  pageBreakAfter?: boolean;
}

// Tageswert: leer bei 0, sonst gerundet mit deutschem Komma (ohne Nachnullen).
function fmtCell(h: number | undefined): string {
  if (!h || h <= 0) return '';
  return (Math.round(h * 100) / 100).toString().replace('.', ',');
}

// Summe (Zeile/Fehlzeit): >0 -> toFixed(2) (Punkt), sonst "0,00" -- wie Einzeldruck.
function fmtSum0(h: number): string {
  return h > 0 ? h.toFixed(2) : '0,00';
}

// DS-Tagessumme: >0 -> toFixed(2), sonst leer -- wie Einzeldruck.
function fmtSumE(h: number): string {
  return h > 0 ? h.toFixed(2) : '';
}

export default function StundennachweisSheet({
  data,
  pageBreakAfter = true,
}: StundennachweisSheetProps) {
  const {
    companyName, projectName, fundingReference, employeeName, monthLabel,
    daysInMonth, isNetzwerk, isDurchfuehrbarkeitsstudie, days, apRows,
    nonBillableByDay, nonBillableSum, absenceByDay, absenceSums,
    daySumBillable, totalBillable, techDaySum, ntDaySum, techTotal, ntTotal,
    signatureDate,
  } = data;

  const labelCols = isDurchfuehrbarkeitsstudie ? 4 : 3;
  const sectionColSpan = labelCols + daysInMonth + 1;
  const dayList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div
      className="bg-white text-gray-900"
      style={{ breakAfter: pageBreakAfter ? 'page' : 'auto' }}
    >
      <div className="overflow-x-auto">
        {/* Header-Bereich */}
        <table className="w-full border-collapse text-xs" style={{ minWidth: '1000px', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td className="border p-2 print:p-1.5" style={{ width: '50%' }}>
                <div className="text-[10px] print:text-[8px] text-gray-900">Zuwendungsempfaenger (Firmenstempel)</div>
                <div className="font-bold text-lg print:text-base text-center py-2">{companyName}</div>
              </td>
              <td className="border p-2 print:p-1.5 text-center" style={{ width: '50%', backgroundColor: HEADER_ORANGE }}>
                <div className="font-bold text-xl print:text-lg">Stundennachweis</div>
                <div className="text-[10px] print:text-[8px] text-gray-900 mt-1">
                  Der Stundennachweis verbleibt beim Zuwendungsempfaenger und ist nur nach Aufforderung vorzulegen.
                </div>
              </td>
            </tr>
            <tr>
              <td className="border p-2 print:p-1">
                <div className="text-[10px] print:text-[8px] text-gray-900">Vorhabenthema</div>
                <div className="font-semibold text-base print:text-sm text-center py-1">{projectName || '-'}</div>
              </td>
              <td className="border p-2 print:p-1" style={{ backgroundColor: HEADER_ORANGE }}>
                <div className="text-[10px] print:text-[8px] text-gray-900">Foerderkennzeichen</div>
                <div className="font-bold text-lg print:text-base text-center py-1">{fundingReference || '-'}</div>
              </td>
            </tr>
            <tr>
              <td className="border p-2 print:p-1">
                <div className="text-[10px] print:text-[8px] text-gray-900">Monat</div>
                <div className="font-semibold text-base print:text-sm text-center py-1">{monthLabel}</div>
              </td>
              <td className="border p-2 print:p-1">
                <div className="text-[10px] print:text-[8px] text-gray-900">Mitarbeiter(in): [Name, Vorname]</div>
                <div className="font-semibold text-base print:text-sm text-center py-1">{employeeName || '-'}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Hinweistext */}
        <div className="px-2 py-1 print:px-1 print:py-0.5 text-[8px] print:text-[6px] text-gray-900 border-x">
          Die zu Lasten des Vorhabens abzurechnenden Personalstunden sind taeglich eigenhaendig von der betreffenden Person zu erfassen. Nur die produktiven, fuer das Vorhaben geleisteten Stunden sind zuwendungsfaehig.
        </div>

        {/* Kalender-Tabelle */}
        <table className="w-full border-collapse text-xs" style={{ minWidth: '1000px' }}>
          <thead>
            <tr style={{ backgroundColor: HEADER_ORANGE }}>
              <th className="border p-1 text-left" style={{ width: '30px' }}>lfd. Nr.</th>
              <th className="border p-1 text-left" style={{ width: '55px' }}>AP</th>
              <th className="border p-1 text-left" style={{ width: '180px' }}>Kurzbezeichnung des Arbeitspakets</th>
              {isDurchfuehrbarkeitsstudie && (
                <th className="border p-1 text-center" style={{ width: '28px' }}>T/NT</th>
              )}
              {dayList.map(day => {
                const d = days[day - 1];
                const weekend = d?.weekend;
                const holiday = d?.holiday;
                return (
                  <th
                    key={day}
                    className={`border p-0 text-center ${weekend ? 'bg-gray-300' : holiday ? 'bg-orange-200' : ''}`}
                    style={{ width: '24px', minWidth: '24px' }}
                    title={holiday || undefined}
                  >
                    {day.toString().padStart(2, '0')}
                  </th>
                );
              })}
              <th className="border p-1 text-center" style={{ width: '25px' }}>S</th>
            </tr>
          </thead>
          <tbody>
            {/* Abschnitt 1: Foerderbare Arbeiten */}
            <tr>
              <td className="border p-1 font-semibold" colSpan={sectionColSpan} style={{ backgroundColor: '#FFF9E6' }}>
                {isNetzwerk ? '1. f\u00f6rderbare Management-Arbeiten (1)' : '1. f\u00f6rderbare Projektarbeiten (1)'}
              </td>
            </tr>

            {/* AP-Zeilen */}
            {apRows.map((row, rowIndex) => (
              <tr key={row.workPackageId}>
                <td className="border p-1 text-center">{rowIndex + 1}.</td>
                <td className="border p-1 text-center">{row.apCodeDisplay}</td>
                <td className="border p-1 text-[10px] leading-tight">
                  <div title={row.name}>{row.name}</div>
                </td>
                {isDurchfuehrbarkeitsstudie && (
                  <td className="border p-1 text-center">
                    {row.isTechnical
                      ? <span className="text-green-700 font-bold text-xs">T</span>
                      : <span className="text-blue-700 font-bold text-xs">NT</span>}
                  </td>
                )}
                {dayList.map(day => {
                  const d = days[day - 1];
                  const weekend = d?.weekend;
                  const holiday = d?.holiday;
                  return (
                    <td
                      key={day}
                      className={`border p-1 text-center text-[10px] ${weekend ? 'bg-gray-200' : holiday ? 'bg-orange-100' : ''}`}
                      style={{ minWidth: '24px' }}
                    >
                      {fmtCell(row.hoursByDay[day])}
                    </td>
                  );
                })}
                <td className="border p-1 text-center font-semibold bg-gray-50">
                  {fmtSum0(row.rowSum)}
                </td>
              </tr>
            ))}

            {/* Summe foerderbare Stunden */}
            {isDurchfuehrbarkeitsstudie ? (
              <>
                <tr className="font-semibold" style={{ backgroundColor: '#E8F5E9' }}>
                  <td className="border p-1 text-[10px]" colSpan={4}>Summe foerderbare Stunden - technisch (T)</td>
                  {dayList.map(day => (
                    <td key={day} className="border p-1 text-center text-[10px]">{fmtSumE(techDaySum[day] || 0)}</td>
                  ))}
                  <td className="border p-1 text-center bg-green-200">{techTotal.toFixed(2)}</td>
                </tr>
                <tr className="font-semibold" style={{ backgroundColor: '#E3F2FD' }}>
                  <td className="border p-1 text-[10px]" colSpan={4}>Summe foerderbare Stunden - nicht-technisch (NT)</td>
                  {dayList.map(day => (
                    <td key={day} className="border p-1 text-center text-[10px]">{fmtSumE(ntDaySum[day] || 0)}</td>
                  ))}
                  <td className="border p-1 text-center bg-blue-200">{ntTotal.toFixed(2)}</td>
                </tr>
                <tr className="font-bold" style={{ backgroundColor: '#C8E6C9' }}>
                  <td className="border p-1" colSpan={4}>Summe foerderbare Stunden gesamt (2)</td>
                  {dayList.map(day => (
                    <td key={day} className="border p-1 text-center text-[10px]">{fmtSumE(daySumBillable[day] || 0)}</td>
                  ))}
                  <td className="border p-1 text-center bg-green-300">{totalBillable.toFixed(2)}</td>
                </tr>
              </>
            ) : (
              <tr className="font-semibold" style={{ backgroundColor: '#E8F5E9' }}>
                <td className="border p-1" colSpan={3}>Summe der foerderbaren Stunden (2)</td>
                {dayList.map(day => (
                  <td key={day} className="border p-1 text-center text-[10px]">{fmtSum0(daySumBillable[day] || 0)}</td>
                ))}
                <td className="border p-1 text-center bg-green-200">{totalBillable.toFixed(2)}</td>
              </tr>
            )}

            {/* Abschnitt 2: Nicht zuschussfaehig */}
            <tr>
              <td className="border p-1 font-semibold" colSpan={sectionColSpan} style={{ backgroundColor: '#FFF3E0' }}>
                2. Nicht zuschussfaehige Arbeiten
              </td>
            </tr>
            <tr>
              <td className="border p-1" colSpan={labelCols}>sonstige Arbeiten</td>
              {dayList.map(day => {
                const d = days[day - 1];
                const weekend = d?.weekend;
                const holiday = d?.holiday;
                return (
                  <td key={day} className={`border p-1 text-center text-[10px] ${weekend ? 'bg-gray-200' : holiday ? 'bg-orange-100' : ''}`}>
                    {fmtCell(nonBillableByDay[day])}
                  </td>
                );
              })}
              <td className="border p-1 text-center font-semibold bg-yellow-50">{nonBillableSum.toFixed(2)}</td>
            </tr>

            {/* Abschnitt 3: Fehlzeiten */}
            <tr>
              <td className="border p-1 font-semibold" colSpan={sectionColSpan} style={{ backgroundColor: '#E3F2FD' }}>
                3. Fehlzeiten
              </td>
            </tr>
            {/* Urlaub */}
            <tr>
              <td className="border p-1 text-[10px]" colSpan={labelCols}>Urlaub (nur bezahlten Urlaub auffuehren)</td>
              {dayList.map(day => {
                const d = days[day - 1];
                const weekend = d?.weekend;
                return (
                  <td key={day} className={`border p-1 text-center text-[10px] ${weekend ? 'bg-gray-100' : 'bg-white'}`}>
                    {weekend ? '' : fmtCell(absenceByDay.U[day])}
                  </td>
                );
              })}
              <td className="border p-1 text-center font-semibold bg-blue-100">{fmtSum0(absenceSums.U)}</td>
            </tr>
            {/* Krankheit */}
            <tr>
              <td className="border p-1 text-[10px]" colSpan={labelCols}>Krankheit (nur bei Lohn- und Gehaltsfortzahlung)</td>
              {dayList.map(day => {
                const d = days[day - 1];
                const weekend = d?.weekend;
                return (
                  <td key={day} className={`border p-1 text-center text-[10px] ${weekend ? 'bg-gray-100' : 'bg-white'}`}>
                    {weekend ? '' : fmtCell(absenceByDay.K[day])}
                  </td>
                );
              })}
              <td className="border p-1 text-center font-semibold bg-red-100">{fmtSum0(absenceSums.K)}</td>
            </tr>
            {/* Sonstige bezahlte Ausfallzeiten */}
            <tr>
              <td className="border p-1 text-[10px]" colSpan={labelCols}>Sonstige bezahlte Ausfallzeiten (z. B. Feiertage)</td>
              {dayList.map(day => {
                const d = days[day - 1];
                const weekend = d?.weekend;
                const holiday = d?.holiday;
                return (
                  <td key={day} className={`border p-1 text-center text-[10px] ${weekend ? 'bg-gray-100' : holiday ? 'bg-orange-100' : 'bg-white'}`}>
                    {weekend ? '' : fmtCell(absenceByDay.S[day])}
                  </td>
                );
              })}
              <td className="border p-1 text-center font-semibold bg-purple-100">{fmtSum0(absenceSums.S)}</td>
            </tr>
          </tbody>
        </table>

        {/* Hinweistexte / Fussnoten */}
        <div className="px-2 py-1 print:px-1 print:py-0.5 text-[7px] print:text-[5px] text-gray-900 border-x border-b">
          <p>
            <strong>(1)</strong> Die geleisteten Projektbearbeitungsstunden sind fuer den gesamten Bewilligungszeitraum <strong>eigenhaendig und zeitnah</strong>, d. h. mindestens innerhalb einer Woche zu erfassen. Die Angaben sind subventionserheblich im Sinne des Paragraph 264 Strafgesetzbuch.
          </p>
          <p>
            <strong>(2)</strong> Foerderbar pro Monat sind die tatsaechlich fuer das Projekt geleisteten Stunden, jedoch nicht mehr als arbeitsvertraglich, betrieblich oder tariflich vereinbart, <strong>maximal in Hoehe von 52 (Wochen) / 12 (Monate) x Wochenarbeitszeit. Ueberstunden sind nicht foerderbar.</strong>
          </p>
        </div>

        {/* Unterschriften */}
        <div className="border-x border-b flex">
          <div className="flex-1 p-3 print:p-2 border-r border-gray-400">
            <div className="text-[9px] print:text-[7px] text-gray-900 mb-8 print:mb-6">Datum / Unterschrift des Mitarbeiters</div>
            <div className="text-sm print:text-xs border-b border-gray-300 print:border-gray-400 w-28 pb-0.5">{signatureDate}</div>
          </div>
          <div className="flex-1 p-3 print:p-2">
            <div className="text-[9px] print:text-[7px] text-gray-900 mb-8 print:mb-6">Datum / Unterschrift Geschaeftsfuehrer bzw. FuE-Verantwortlicher</div>
            <div className="text-sm print:text-xs border-b border-gray-300 print:border-gray-400 w-28 pb-0.5">{signatureDate}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
