// Reverse-geocodes browser coordinates ("use my location") to a ZIP code via
// Google's Geocoding API, so GOOGLE_PLACES_API_KEY stays server-side. Reuses
// the same key as /api/branch-rating.ts — the Geocoding API just needs to be
// enabled on that Google Cloud project too.
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export async function GET(request: Request): Promise<Response> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Server is missing GOOGLE_PLACES_API_KEY' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url, 'http://localhost');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  if (!lat || !lng) {
    return Response.json(
      { error: 'Missing required "lat" and "lng" parameters' },
      { status: 400 }
    );
  }

  const url = new URL(GEOCODE_URL);
  url.searchParams.set('latlng', `${lat},${lng}`);
  url.searchParams.set('result_type', 'postal_code');
  url.searchParams.set('key', apiKey);

  const geocodeRes = await fetch(url);
  if (!geocodeRes.ok) {
    return Response.json({ error: 'Geocode request failed' }, { status: 502 });
  }

  const data = (await geocodeRes.json()) as {
    results?: { address_components: { types: string[]; long_name: string }[] }[];
  };
  const components = data.results?.[0]?.address_components ?? [];
  const zip =
    components.find((c) => c.types.includes('postal_code'))?.long_name ?? null;

  if (!zip) {
    return Response.json({ error: 'No ZIP code found for location' }, { status: 404 });
  }

  return Response.json({ zip });
}
