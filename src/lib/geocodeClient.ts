// Calls our own /api/geocode proxy (see api/geocode.ts) to turn coordinates
// from the browser Geolocation API into a ZIP code.
export async function fetchZipFromCoords(lat: number, lng: number): Promise<string> {
  const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
  if (!res.ok) {
    throw new Error(`Geocode request failed: ${res.status}`);
  }
  const data = (await res.json()) as { zip: string };
  return data.zip;
}
