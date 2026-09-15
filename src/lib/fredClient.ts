// Calls our own /api/rates proxy (see api/rates.ts), which holds the FRED
// API key server-side. Used only as ambient market context, not a calculator.
export type RateInfo = {
  rate: number;
  date: string;
  seriesId: string;
  seriesTitle: string;
};

export async function fetchAutoLoanRate(): Promise<RateInfo> {
  const res = await fetch('/api/rates');
  if (!res.ok) {
    throw new Error(`Rate request failed: ${res.status}`);
  }
  return res.json();
}
