// One-time ETL: pulls NCUA's official quarterly Call Report bulk data and
// extracts key figures per credit union (keyed by charter number) into a
// small static JSON asset the app reads at runtime. Not part of the
// deployed app — re-run this manually each quarter to refresh the data
// (update CALL_REPORT_URL to the new period).
//
// Source: https://ncua.gov/analysis/credit-union-corporate-call-report-data/quarterly-data
//
// Account codes verified against NCUA's own AcctDesc.txt, and the resulting
// ratios spot-checked against Navy Federal's known public figures:
//   FS220.txt:  ACCT_010 = "TOTAL ASSETS"
//               ACCT_083 = "Number of current members"
//               ACCT_013 = "Total Amount of Shares"
//               ACCT_025B = "Total amount of Loans and Leases"
//               ACCT_041B = "Total Amount of Delinquent Loans & Leases (Two or more months)"
//   FS220A.txt: Acct_997 = "Total Net Worth"
//               Acct_661A = "Net Income (Loss)" (year-to-date)
// FS220A is a separate schedule file from the same quarterly filing, joined
// here by CU_NUMBER.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';

const CALL_REPORT_URL =
  'https://ncua.gov/files/publications/analysis/call-report-data-2026-06.zip';
const OUTPUT_PATH = 'data/call-report.json';

type CallReportEntry = {
  totalAssets: number;
  numberOfMembers: number;
  reportDate: string;
  // Percentages (e.g. 11.65 means 11.65%), computed from the raw dollar
  // figures above rather than shipped as separate raw fields, so the app
  // doesn't have to re-derive them.
  netWorthRatio: number | null;
  loanToShareRatio: number | null;
  delinquencyRatio: number | null;
  // Year-to-date net income as a % of assets — not an annualized ROA
  // (that would need average assets and a quarter-aware annualization
  // factor NCUA doesn't hand you directly), labeled as such in the UI.
  netIncomeToAssetsYtd: number | null;
};

function extractFile(zip: AdmZip, name: string): Record<string, string>[] {
  const entry = zip.getEntry(name);
  if (!entry) {
    throw new Error(`${name} not found in the downloaded archive`);
  }
  const csvText = entry.getData().toString('utf-8');
  return parse(csvText, { columns: true, skip_empty_lines: true });
}

// Guards against dividing by zero/missing data for small or newly-chartered
// credit unions that don't report every field.
function ratio(numerator: number, denominator: number): number | null {
  if (!denominator || Number.isNaN(numerator) || Number.isNaN(denominator)) {
    return null;
  }
  return (numerator / denominator) * 100;
}

async function main() {
  console.log(`Downloading ${CALL_REPORT_URL} ...`);
  const res = await fetch(CALL_REPORT_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buffer);

  const fs220 = extractFile(zip, 'FS220.txt');
  const fs220a = extractFile(zip, 'FS220A.txt');

  const netWorthByCharter = new Map<string, number>();
  const netIncomeByCharter = new Map<string, number>();
  for (const row of fs220a) {
    if (!row.CU_NUMBER) continue;
    if (row.Acct_997) netWorthByCharter.set(row.CU_NUMBER, Number(row.Acct_997));
    if (row.Acct_661A) netIncomeByCharter.set(row.CU_NUMBER, Number(row.Acct_661A));
  }

  const byCharter: Record<string, CallReportEntry> = {};
  for (const row of fs220) {
    const charter = row.CU_NUMBER;
    const totalAssets = Number(row.ACCT_010);
    const numberOfMembers = Number(row.ACCT_083);
    if (!charter || Number.isNaN(totalAssets) || Number.isNaN(numberOfMembers)) {
      continue;
    }

    const totalShares = Number(row.ACCT_013);
    const totalLoans = Number(row.ACCT_025B);
    const delinquentLoans = Number(row.ACCT_041B);
    const netWorth = netWorthByCharter.get(charter);
    const netIncome = netIncomeByCharter.get(charter);

    byCharter[charter] = {
      totalAssets,
      numberOfMembers,
      reportDate: row.CYCLE_DATE,
      netWorthRatio: netWorth !== undefined ? ratio(netWorth, totalAssets) : null,
      loanToShareRatio: ratio(totalLoans, totalShares),
      delinquencyRatio: ratio(delinquentLoans, totalLoans),
      netIncomeToAssetsYtd:
        netIncome !== undefined ? ratio(netIncome, totalAssets) : null,
    };
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(byCharter));
  console.log(
    `Wrote ${Object.keys(byCharter).length} credit unions to ${OUTPUT_PATH}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
