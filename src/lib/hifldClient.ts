// Calls our own /api/branches proxy (see api/branches.ts), which serves a
// snapshot of HIFLD's NCUA-insured credit union branch dataset (see
// scripts/ingest-hifld.ts) instead of querying HIFLD's ArcGIS service live.
// https://hifld-geoplatform.hub.arcgis.com/maps/geoplatform::ncua-insured-credit-unions
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

async function fetchBranches(param: string, value: string): Promise<CreditUnionBranch[]> {
  const res = await fetch(`/api/branches?${param}=${encodeURIComponent(value)}`);
  if (!res.ok) {
    throw new Error(`Branch search failed: ${res.status}`);
  }
  return res.json();
}

export function searchByName(query: string): Promise<CreditUnionBranch[]> {
  return fetchBranches('name', query.trim());
}

export function searchByZipPrefix(prefix: string): Promise<CreditUnionBranch[]> {
  return fetchBranches('zip', prefix.trim());
}

// The dataset is one row per physical branch; group by charter number to get
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
