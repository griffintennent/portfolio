// One-time ETL: snapshots HIFLD's NCUA-insured credit union branch dataset
// into a static JSON asset the app reads at runtime, instead of the browser
// or our API querying HIFLD's ArcGIS service live on every request. That
// service is CORS-open and free, but it's an unauthenticated, unversioned
// ArcGIS Online item on what looks like a contractor's personal account —
// no SLA, no guarantee the URL survives a reorg. Branch locations don't
// change day-to-day, so there's little freshness cost to snapshotting.
// Re-run this manually every so often (e.g. before a demo) to pick up new
// branches/closures.
//
// Source: https://hifld-geoplatform.hub.arcgis.com/maps/geoplatform::ncua-insured-credit-unions
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const HIFLD_QUERY_URL =
  'https://services8.arcgis.com/DlJzJLOZpPXmMpWi/arcgis/rest/services/National_Credit_Union_Branches/FeatureServer/0/query';
const OUTPUT_PATH = 'data/branches.json';
const PAGE_SIZE = 1000; // the service's own maxRecordCount

const OUT_FIELDS = [
  'Charter_Number',
  'CU_Name',
  'Address_Line1',
  'Address_Line2',
  'City',
  'State',
  'Zip',
  'County',
  'Latitude',
  'Longitude',
  'Telephone',
  'Site_Type',
  'Low_Income',
  'Fhlb',
  'MDI',
  'Bilingual_Services',
  'Credit_Builder',
  'Financial_Counseling',
  'First_Time_Homebuyer',
  'PALS_I',
  'PALS_II',
  'NC_Share_Drafts',
  'NC_Tax_Prep',
  'Lowcost_wire_transfers',
  'In_School_Branch',
  'ATM',
  'Member_Services',
  'Drive_Thru',
  'Shared_Service_Center',
].join(',');

export type CreditUnionBranch = {
  charterNumber: number;
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  latitude: number;
  longitude: number;
  phone: string;
  siteType: string;
  lowIncome: boolean;
  fhlbMember: boolean;
  minorityDepositoryInstitution: boolean;
  bilingualServices: boolean;
  creditBuilderProgram: boolean;
  financialCounseling: boolean;
  firstTimeHomebuyerProgram: boolean;
  paydayAlternativeLoans: boolean;
  noCostShareDrafts: boolean;
  noCostTaxPrep: boolean;
  lowCostWireTransfers: boolean;
  inSchoolBranch: boolean;
  hasAtm: boolean;
  memberServices: boolean;
  driveThru: boolean;
  sharedServiceCenter: boolean;
};

type ArcgisAttributes = Record<string, string | number | null>;

function toBool(value: string | number | null): boolean {
  return value === '1' || value === 1;
}

// The dataset uses the literal string "N/A" for empty text fields instead of
// null — normalize those to an empty string so callers don't have to check.
function toText(value: string | number | null): string {
  const text = String(value ?? '').trim();
  return text === '' || text.toUpperCase() === 'N/A' ? '' : text;
}

// Source rows are inconsistently cased — some ALL CAPS, some Title Case.
// Normalize to Title Case for display, keeping common address abbreviations
// and unit numbers (e.g. "101A") uppercase rather than "Us"/"101a".
const KEEP_UPPER = new Set(['US', 'NE', 'NW', 'SE', 'SW']);

function toTitleCase(value: string | number | null): string {
  const text = toText(value);
  if (!text) return text;
  return text
    .split(' ')
    .map((word) => {
      if (word === '') return word;
      const upperWord = word.toUpperCase();
      if (KEEP_UPPER.has(upperWord)) return upperWord;
      const ordinal = /^(\d+)(ST|ND|RD|TH)$/i.exec(word);
      if (ordinal) return ordinal[1] + ordinal[2].toLowerCase();
      if (/\d/.test(word)) return upperWord;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function parseBranch(attributes: ArcgisAttributes): CreditUnionBranch {
  return {
    charterNumber: Number(attributes.Charter_Number),
    name: String(attributes.CU_Name ?? ''),
    addressLine1: toTitleCase(attributes.Address_Line1),
    addressLine2: toTitleCase(attributes.Address_Line2),
    city: toTitleCase(attributes.City),
    state: toText(attributes.State),
    zip: toText(attributes.Zip),
    county: toTitleCase(attributes.County),
    latitude: Number(attributes.Latitude),
    longitude: Number(attributes.Longitude),
    phone: toText(attributes.Telephone),
    siteType: toText(attributes.Site_Type),
    lowIncome: toBool(attributes.Low_Income),
    fhlbMember: toBool(attributes.Fhlb),
    minorityDepositoryInstitution: toBool(attributes.MDI),
    bilingualServices: toBool(attributes.Bilingual_Services),
    creditBuilderProgram: toBool(attributes.Credit_Builder),
    financialCounseling: toBool(attributes.Financial_Counseling),
    firstTimeHomebuyerProgram: toBool(attributes.First_Time_Homebuyer),
    paydayAlternativeLoans:
      toBool(attributes.PALS_I) || toBool(attributes.PALS_II),
    noCostShareDrafts: toBool(attributes.NC_Share_Drafts),
    noCostTaxPrep: toBool(attributes.NC_Tax_Prep),
    lowCostWireTransfers: toBool(attributes.Lowcost_wire_transfers),
    inSchoolBranch: toBool(attributes.In_School_Branch),
    hasAtm: toBool(attributes.ATM),
    memberServices: toBool(attributes.Member_Services),
    driveThru: toBool(attributes.Drive_Thru),
    sharedServiceCenter: toBool(attributes.Shared_Service_Center),
  };
}

async function fetchPage(offset: number): Promise<ArcgisAttributes[]> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: OUT_FIELDS,
    f: 'json',
    resultRecordCount: String(PAGE_SIZE),
    resultOffset: String(offset),
  });
  const res = await fetch(`${HIFLD_QUERY_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`HIFLD query failed at offset ${offset}: ${res.status}`);
  }
  const data = (await res.json()) as {
    error?: { message?: string };
    features?: { attributes: ArcgisAttributes }[];
  };
  if (data.error) {
    throw new Error(data.error.message ?? 'HIFLD query error');
  }
  const features = data.features ?? [];
  return features.map((f) => f.attributes);
}

async function main() {
  console.log(`Downloading branch data from ${HIFLD_QUERY_URL} ...`);
  const branches: CreditUnionBranch[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchPage(offset);
    if (page.length === 0) break;
    branches.push(...page.map(parseBranch));
    offset += page.length;
    console.log(`  fetched ${offset} branches so far...`);
    if (page.length < PAGE_SIZE) break;
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(branches));
  console.log(`Wrote ${branches.length} branches to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
