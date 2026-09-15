// Official DHS-published open dataset of NCUA-insured credit union branches,
// sourced from NCUA's own Call Report filings. Standard, documented ArcGIS
// REST API, CORS-open — callable directly from the browser.
// https://hifld-geoplatform.hub.arcgis.com/maps/geoplatform::ncua-insured-credit-unions
const HIFLD_QUERY_URL =
  'https://services8.arcgis.com/DlJzJLOZpPXmMpWi/arcgis/rest/services/National_Credit_Union_Branches/FeatureServer/0/query';

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

export type CreditUnionGroup = {
  charterNumber: number;
  name: string;
  branches: CreditUnionBranch[];
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

// ArcGIS `where` clauses use SQL-92-style string literals; escape single
// quotes so user input can't break out of the literal.
function escapeForSql(value: string): string {
  return value.replace(/'/g, "''");
}

async function runQuery(
  where: string,
  limit: number
): Promise<CreditUnionBranch[]> {
  const params = new URLSearchParams({
    where,
    outFields: OUT_FIELDS,
    f: 'json',
    resultRecordCount: String(limit),
  });
  const res = await fetch(`${HIFLD_QUERY_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`HIFLD query failed: ${res.status}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message ?? 'HIFLD query error');
  }
  const features: { attributes: ArcgisAttributes }[] = data.features ?? [];
  return features.map((f) => parseBranch(f.attributes));
}

export function searchByName(
  query: string,
  limit = 100
): Promise<CreditUnionBranch[]> {
  const escaped = escapeForSql(query.trim().toUpperCase());
  return runQuery(`UPPER(CU_Name) LIKE '%${escaped}%'`, limit);
}

export function searchByZipPrefix(
  prefix: string,
  limit = 200
): Promise<CreditUnionBranch[]> {
  const escaped = escapeForSql(prefix.trim());
  return runQuery(`Zip LIKE '${escaped}%'`, limit);
}

// The layer is one row per physical branch; group by charter number to get
// one entry per credit union (with all of its matching branches attached).
export function groupByCharter(branches: CreditUnionBranch[]): CreditUnionGroup[] {
  const groups = new Map<number, CreditUnionGroup>();
  for (const branch of branches) {
    const existing = groups.get(branch.charterNumber);
    if (existing) {
      existing.branches.push(branch);
    } else {
      groups.set(branch.charterNumber, {
        charterNumber: branch.charterNumber,
        name: branch.name,
        branches: [branch],
      });
    }
  }
  for (const group of groups.values()) {
    // Surface the corporate/main office first, then sort the rest
    // geographically so nearby branches land next to each other.
    group.branches.sort((a, b) => {
      const aCorporate = a.siteType === 'Corporate Office' ? 0 : 1;
      const bCorporate = b.siteType === 'Corporate Office' ? 0 : 1;
      if (aCorporate !== bCorporate) return aCorporate - bCorporate;
      return (
        a.state.localeCompare(b.state) || a.city.localeCompare(b.city)
      );
    });
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
