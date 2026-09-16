// Proxies Google's Places API (New) Text Search so the API key stays
// server-side. Looks up a single physical branch by name + address — this
// matches on location rather than company name, so it sidesteps the
// fuzzy-name-matching problems /api/complaints.ts has to work around.
//
// Unlike the other API keys this project uses, Places isn't free — it needs
// a billing-enabled Google Cloud project (a monthly free credit covers light
// use). Responses are cached hard (a week) since branch ratings move slowly
// and this is called once per branch shown.
const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';

export async function GET(request: Request): Promise<Response> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Server is missing GOOGLE_PLACES_API_KEY' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url, 'http://localhost');
  const query = searchParams.get('query');
  if (!query) {
    return Response.json(
      { error: 'Missing required "query" parameter' },
      { status: 400 }
    );
  }

  const placesRes = await fetch(PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.rating,places.userRatingCount',
    },
    body: JSON.stringify({ textQuery: query, pageSize: 1 }),
  });
  if (!placesRes.ok) {
    return Response.json({ error: 'Places request failed' }, { status: 502 });
  }

  const data = (await placesRes.json()) as {
    places?: { rating?: number; userRatingCount?: number }[];
  };
  const place = data.places?.[0];

  return Response.json(
    {
      rating: place?.rating ?? null,
      reviewCount: place?.userRatingCount ?? null,
    },
    { headers: { 'Cache-Control': 's-maxage=604800' } }
  );
}
