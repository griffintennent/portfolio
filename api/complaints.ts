// Proxies the CFPB Consumer Complaint Database's public search API. No API
// key required, but CORS is restricted to CFPB's own frontend
// (access-control-allow-origin: https://cfpb.github.io), so this can't be
// called directly from the browser.
// Docs: https://cfpb.github.io/api/ccdb/
//
// Matching is exact on the company's name as CFPB has it on file, which
// often differs from HIFLD's CU_Name even for real matches: CFPB moves a
// leading "The" to a trailing ", THE" (Golden 1 Credit Union is filed as
// "GOLDEN 1 CREDIT UNION, THE"), and sometimes uses a different apostrophe
// character (State Employees' Credit Union is filed with a curly '). So an
// exact match is tried first, and if it comes back empty, we fall back to
// CFPB's free-text search and match the returned company names against the
// input with punctuation/"the" normalized. Legal-name rebrands (e.g. BECU,
// filed under its old name "Boeing Employees' Credit Union") aren't caught
// by this and will still show zero. Small or newly-chartered credit unions
// genuinely have zero complaints on file — that's a real result, not a
// matching failure.
const CFPB_URL =
  'https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/';

type Bucket = { key: string; doc_count: number };
type CfpbAggregations = {
  issue?: { issue?: { buckets?: Bucket[] } };
  company_response?: { company_response?: { buckets?: Bucket[] } };
  company?: { company?: { buckets?: Bucket[] } };
};
type CfpbResponse = {
  hits?: { total?: { value?: number } };
  aggregations?: CfpbAggregations;
};

// "Closed with relief" only appears in older records, before CFPB split it
// into monetary/non-monetary; treated the same as the split versions here.
const RELIEF_RESPONSES = new Set([
  'Closed with monetary relief',
  'Closed with non-monetary relief',
  'Closed with relief',
]);

// Strips punctuation and the word "the" so names that differ only by
// CFPB's "X, THE" reordering or apostrophe style compare equal.
function normalizeCompanyName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && word !== 'THE')
    .join(' ');
}

async function fetchCfpb(params: URLSearchParams): Promise<CfpbResponse | null> {
  const res = await fetch(`${CFPB_URL}?${params.toString()}`);
  if (!res.ok) return null;
  return (await res.json()) as CfpbResponse;
}

// Finds the exact CFPB company string for a name that didn't match
// directly, via free-text search plus normalized comparison against the
// returned company aggregation.
async function findCfpbCompanyName(company: string): Promise<string | null> {
  const data = await fetchCfpb(new URLSearchParams({ search_term: company, size: '0' }));
  const buckets = data?.aggregations?.company?.company?.buckets ?? [];
  const target = normalizeCompanyName(company);
  const match = buckets.find((b) => normalizeCompanyName(b.key) === target);
  return match?.key ?? null;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url, 'http://localhost');
  const company = searchParams.get('company');
  if (!company) {
    return Response.json(
      { error: 'Missing required "company" parameter' },
      { status: 400 }
    );
  }

  let data = await fetchCfpb(new URLSearchParams({ company, size: '0' }));
  if (!data) {
    return Response.json({ error: 'CFPB request failed' }, { status: 502 });
  }

  if ((data.hits?.total?.value ?? 0) === 0) {
    const matchedName = await findCfpbCompanyName(company);
    if (matchedName) {
      const rematch = await fetchCfpb(
        new URLSearchParams({ company: matchedName, size: '0' })
      );
      if (rematch) data = rematch;
    }
  }

  const totalComplaints = data.hits?.total?.value ?? 0;
  const issueBuckets = data.aggregations?.issue?.issue?.buckets ?? [];
  const responseBuckets =
    data.aggregations?.company_response?.company_response?.buckets ?? [];
  const respondedCount = responseBuckets.reduce((sum, b) => sum + b.doc_count, 0);
  const reliefCount = responseBuckets
    .filter((b) => RELIEF_RESPONSES.has(b.key))
    .reduce((sum, b) => sum + b.doc_count, 0);

  return Response.json(
    {
      totalComplaints,
      topIssues: issueBuckets.slice(0, 3).map((b) => b.key),
      reliefRate: respondedCount > 0 ? (reliefCount / respondedCount) * 100 : null,
    },
    { headers: { 'Cache-Control': 's-maxage=86400' } }
  );
}
