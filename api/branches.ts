// Serves our own snapshot of HIFLD's NCUA-insured credit union branch
// dataset (see scripts/ingest-hifld.ts) instead of querying HIFLD's ArcGIS
// service live — that service is CORS-open and free, but it's an
// unauthenticated, unversioned ArcGIS Online item with no SLA, so we own a
// copy instead of depending on it staying up during a demo.
import data from '../data/branches.json' with { type: 'json' };

type CreditUnionBranch = {
  charterNumber: number;
  name: string;
  zip: string;
  [key: string]: unknown;
};

const branches = data as CreditUnionBranch[];

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url, 'http://localhost');
  const name = searchParams.get('name');
  const zip = searchParams.get('zip');

  let results: CreditUnionBranch[];
  let limit: number;
  if (name) {
    const target = name.trim().toUpperCase();
    results = branches.filter((b) => b.name.toUpperCase().includes(target));
    limit = 100;
  } else if (zip) {
    const prefix = zip.trim();
    results = branches.filter((b) => b.zip.startsWith(prefix));
    limit = 200;
  } else {
    return Response.json(
      { error: 'Provide either a "name" or "zip" parameter' },
      { status: 400 }
    );
  }

  return Response.json(results.slice(0, limit), {
    headers: { 'Cache-Control': 's-maxage=86400' },
  });
}
