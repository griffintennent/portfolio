// Proxies the CFPB Consumer Complaint Database's public search API. No API
// key required, but CORS is restricted to CFPB's own frontend
// (access-control-allow-origin: https://cfpb.github.io), so this can't be
// called directly from the browser.
// Docs: https://cfpb.github.io/api/ccdb/
//
// Matching is exact on the company's name as CFPB has it on file, which is
// generally the same all-caps legal name HIFLD uses (verified against Navy
// Federal: 49,330 real complaints). Small or newly-chartered credit unions
// often have zero complaints on file — that's a real, meaningful result,
// not a matching failure (verified: both an exact-name and a free-text
// search returned zero for one such credit union).
const CFPB_URL =
  'https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/';

type Bucket = { key: string; doc_count: number };

// "Closed with relief" only appears in older records, before CFPB split it
// into monetary/non-monetary; treated the same as the split versions here.
const RELIEF_RESPONSES = new Set([
  'Closed with monetary relief',
  'Closed with non-monetary relief',
  'Closed with relief',
]);

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url, 'http://localhost');
  const company = searchParams.get('company');
  if (!company) {
    return Response.json(
      { error: 'Missing required "company" parameter' },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({ company, size: '0' });
  const cfpbRes = await fetch(`${CFPB_URL}?${params.toString()}`);
  if (!cfpbRes.ok) {
    return Response.json({ error: 'CFPB request failed' }, { status: 502 });
  }

  const data = (await cfpbRes.json()) as {
    hits?: { total?: { value?: number } };
    aggregations?: {
      issue?: { issue?: { buckets?: Bucket[] } };
      company_response?: { company_response?: { buckets?: Bucket[] } };
    };
  };

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
