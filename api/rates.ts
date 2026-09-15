// Proxies the FRED (Federal Reserve Bank of St. Louis) API so the API key
// stays server-side. Used as a small "market context" reference figure, not
// a calculator input.
// Series: RIFLPBCIANM60NM — Finance Rate on Consumer Installment Loans at
// Commercial Banks, New Autos 60 Month Loan.
// https://fred.stlouisfed.org/series/RIFLPBCIANM60NM
const SERIES_ID = 'RIFLPBCIANM60NM';
const SERIES_TITLE = 'New auto loan rate, commercial banks, 60-month (national average)';

export default async function handler(): Promise<Response> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Server is missing FRED_API_KEY' }, { status: 500 });
  }

  const params = new URLSearchParams({
    series_id: SERIES_ID,
    api_key: apiKey,
    file_type: 'json',
    sort_order: 'desc',
    limit: '1',
  });
  const fredRes = await fetch(
    `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`
  );
  if (!fredRes.ok) {
    return Response.json({ error: 'FRED request failed' }, { status: 502 });
  }

  const data = (await fredRes.json()) as {
    observations?: { date: string; value: string }[];
  };
  const observation = data?.observations?.[0];
  if (!observation) {
    return Response.json({ error: 'No FRED data available' }, { status: 502 });
  }

  return Response.json(
    {
      rate: Number(observation.value),
      date: observation.date,
      seriesId: SERIES_ID,
      seriesTitle: SERIES_TITLE,
    },
    { headers: { 'Cache-Control': 's-maxage=3600' } }
  );
}
