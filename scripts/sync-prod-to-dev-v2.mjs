#!/usr/bin/env node
// ============================================================================
// PZE Datensynchronisation V2: PROD -> DEV
// ============================================================================
// V2: Direkte PostgreSQL-Verbindung fuer DEV (umgeht REST-API-Limitierungen)
//     PROD wird weiterhin per Supabase REST-API gelesen.
//
// Voraussetzungen:
//   cd ~/Documents/Dev/pze
//   pnpm add pg        (einmalig installieren)
//   node scripts/sync-prod-to-dev-v2.mjs
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import readline from 'readline';

const { Client } = pg;

// ============================================================================
// KONFIGURATION
// ============================================================================
const PROD_URL = 'https://cnnuyioklhlrfygwticf.supabase.co';

// Tabellen in Abhaengigkeitsreihenfolge
const TABLES = [
  'v7_consultant_companies',
  'v7_client_companies',
  'v7_employees',
  'v7_projects',
  'v7_consultant_access',
  'v7_work_packages',
  'v7_project_assignments',
  'v7_timesheet_completions',
  'v7_zahlungsanforderungen',
  'v7_netzwerk_partner',
  'v7_netzwerk_eigenanteile',
  'v7_nwm_foerderzeitraeume',
  'v7_nwm_ap_planung',
  'v7_fzul_vorhaben',
  'v7_work_package_assignments',
  'v7_timesheets',
  'v7_timesheet_notes',
  'v7_fzul_timesheets',
  'v7_employee_hours_history',
  'v7_data_completion',
  'v7_archive',
];

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function log(msg) {
  const ts = new Date().toLocaleTimeString('de-DE');
  console.log(`[${ts}] ${msg}`);
}

async function askQuestion(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
  });
}

// PROD: Alle Zeilen per REST-API laden (mit Pagination)
async function fetchAllRows(supabase, table) {
  const PAGE_SIZE = 1000;
  let allRows = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id').range(from, from + PAGE_SIZE - 1);

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return { rows: [], exists: false };
      }
      throw new Error(`Fetch ${table}: ${error.message}`);
    }
    allRows = allRows.concat(data || []);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }
  return { rows: allRows, exists: true };
}

// DEV: Zeilen per direktem SQL einfuegen
async function insertRowsSQL(pgClient, table, rows) {
  if (rows.length === 0) return 0;

  // Spaltennamen aus erstem Datensatz
  const columns = Object.keys(rows[0]);
  const colList = columns.map(c => `"${c}"`).join(', ');

  let inserted = 0;
  const BATCH = 100; // Kleinere Batches fuer SQL

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const values = [];
    const params = [];
    let paramIdx = 1;

    for (const row of batch) {
      const placeholders = columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) {
          paramIdx++;
          return `$${paramIdx - 1}`;
        }
        params.push(typeof val === 'object' ? JSON.stringify(val) : val);
        return `$${paramIdx++}`;
      });
      // Handle nulls: push null for null values
      const rowParams = columns.map(col => {
        const val = row[col];
        return val === null || val === undefined ? null : (typeof val === 'object' ? JSON.stringify(val) : val);
      });
      // Reset and use simple approach
    }

    // Simpler approach: one INSERT per row for reliability
    for (const row of batch) {
      const vals = columns.map(col => {
        const v = row[col];
        if (v === null || v === undefined) return null;
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      });
      const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
      const sql = `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      try {
        await pgClient.query(sql, vals);
        inserted++;
      } catch (err) {
        // Bei Fehler: loggen und weitermachen
        if (i === 0 && batch.indexOf(row) === 0) {
          console.error(`  [WARN] ${table} Insert-Fehler: ${err.message.substring(0, 100)}`);
        }
      }
    }
  }
  return inserted;
}

// ============================================================================
// HAUPTPROGRAMM
// ============================================================================

async function main() {
  console.log('');
  console.log('============================================================');
  console.log('  PZE Datensynchronisation V2: PROD -> DEV');
  console.log('  (Direkte PostgreSQL-Verbindung fuer DEV)');
  console.log('============================================================');
  console.log('');

  // Keys abfragen
  console.log('Benoetigte Zugangsdaten:');
  console.log('  1. PROD: Supabase Service-Role-Key (wie bisher)');
  console.log('  2. DEV:  PostgreSQL Connection-String');
  console.log('     (Supabase Dashboard > Settings > Database > Connection string > URI)');
  console.log('');

  const prodKey = await askQuestion('PROD Service-Role-Key: ');
  if (!prodKey || prodKey.length < 20) {
    console.error('Kein gueltiger Key. Abbruch.');
    process.exit(1);
  }

  console.log('');
  console.log('DEV Connection-String finden:');
  console.log('  Supabase Dashboard > projektzeiterfassung20 > Settings > Database');
  console.log('  > Connection string > URI  (Tab "URI" waehlen)');
  console.log('  Sieht aus wie: postgresql://postgres.[ref]:[password]@...:6543/postgres');
  console.log('');

  const devConnStr = await askQuestion('DEV PostgreSQL Connection-String: ');
  if (!devConnStr || !devConnStr.includes('postgres')) {
    console.error('Kein gueltiger Connection-String. Abbruch.');
    process.exit(1);
  }

  const confirm = await askQuestion('\nAlle DEV-Daten werden durch PROD ersetzt. Weiter? (ja/nein): ');
  if (confirm.toLowerCase() !== 'ja') {
    log('Abbruch.'); process.exit(0);
  }

  // PROD Supabase-Client
  const prodSupabase = createClient(PROD_URL, prodKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // DEV direkte PostgreSQL-Verbindung
  log('Verbinde mit DEV PostgreSQL...');
  const pgClient = new Client({ connectionString: devConnStr, ssl: { rejectUnauthorized: false } });
  await pgClient.connect();
  log('DEV PostgreSQL verbunden.');

  // ================================================================
  // PHASE 1: PROD laden
  // ================================================================
  console.log('');
  log('=== PHASE 1: Daten aus PROD laden ===');

  const prodData = {};
  let totalRows = 0;

  for (const table of TABLES) {
    try {
      const { rows, exists } = await fetchAllRows(prodSupabase, table);
      if (!exists) { log(`  ${table}: uebersprungen (existiert nicht)`); continue; }
      prodData[table] = rows;
      totalRows += rows.length;
      log(`  ${table}: ${rows.length} Zeilen`);
    } catch (err) {
      console.error(`  [ERROR] ${table}: ${err.message}`);
    }
  }
  log(`PROD gesamt: ${totalRows} Zeilen aus ${Object.keys(prodData).length} Tabellen`);

  // ================================================================
  // PHASE 2+3: DEV leeren + PROD einfuegen (in EINER Transaktion!)
  // ================================================================
  console.log('');
  log('=== PHASE 2+3: DEV leeren + PROD einfuegen (mit FK-Bypass) ===');

  await pgClient.query('BEGIN');
  await pgClient.query("SET LOCAL session_replication_role = 'replica'");
  log('FK-Checks deaktiviert (session_replication_role = replica)');

  // Loeschen: umgekehrte Reihenfolge
  const reverseTables = [...TABLES].reverse();
  for (const table of reverseTables) {
    if (!prodData[table]) continue;
    try {
      await pgClient.query(`DELETE FROM ${table}`);
      log(`  ${table}: geloescht`);
    } catch (err) {
      log(`  ${table}: Skip (${err.message.substring(0, 60)})`);
    }
  }

  // Einfuegen: normale Reihenfolge
  console.log('');
  let totalInserted = 0;
  for (const table of TABLES) {
    const rows = prodData[table];
    if (!rows || rows.length === 0) continue;
    try {
      const count = await insertRowsSQL(pgClient, table, rows);
      totalInserted += count;
      log(`  ${table}: ${count} / ${rows.length} Zeilen eingefuegt`);
    } catch (err) {
      console.error(`  [ERROR] ${table}: ${err.message.substring(0, 100)}`);
    }
  }

  await pgClient.query("SET LOCAL session_replication_role = 'origin'");
  await pgClient.query('COMMIT');
  log('FK-Checks reaktiviert, Transaktion committed.');

  await pgClient.end();

  console.log('');
  log('============================================================');
  log(`  FERTIG! ${totalInserted} von ${totalRows} Zeilen kopiert.`);
  log('============================================================');
  console.log('');
  log('Naechste Schritte:');
  log('  1. pnpm dev starten');
  log('  2. Auf localhost:3000 einloggen');
  log('  3. Pruefen: AS System, HEATS, Stundendaten vorhanden?');
  console.log('');
}

main().catch(err => {
  console.error(`Fehler: ${err.message}`);
  process.exit(1);
});
