// Proxies the NYT Article Search API so the API key stays server-side.
// https://developer.nytimes.com/docs/articlesearch-product/1/overview
//
// This is scoped to a fixed "credit union industry" feed rather than a
// per-institution search: NYT's relevance ranking on generic two-word
// phrases like "credit union" is dominated by unrelated articles that
// happen to contain "credit" or "union" separately (credit cards, labor
// unions, etc.) — verified by comparing hit counts and top results across
// several query shapes. Searching the regulator's own acronym instead
// returns genuinely on-topic coverage.
const QUERY = 'NCUA';

type NytDoc = {
  headline?: { main?: string };
  web_url?: string;
  pub_date?: string;
  snippet?: string;
};

export default async function handler(): Promise<Response> {
  const apiKey = process.env.NYT_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Server is missing NYT_API_KEY' }, { status: 500 });
  }

  const params = new URLSearchParams({
    q: QUERY,
    sort: 'newest',
    'api-key': apiKey,
  });
  const nytRes = await fetch(
    `https://api.nytimes.com/svc/search/v2/articlesearch.json?${params.toString()}`
  );
  if (!nytRes.ok) {
    return Response.json({ error: 'NYT request failed' }, { status: 502 });
  }

  const data = (await nytRes.json()) as { response?: { docs?: NytDoc[] } };
  const docs: NytDoc[] = data?.response?.docs ?? [];
  const articles = docs.slice(0, 5).map((doc) => ({
    headline: doc.headline?.main ?? '',
    url: doc.web_url ?? '',
    publishedDate: doc.pub_date ?? '',
    snippet: doc.snippet ?? '',
  }));

  return Response.json(articles, {
    headers: { 'Cache-Control': 's-maxage=3600' },
  });
}
