// Serves NCUA's official quarterly Call Report data, keyed by charter
// number. The underlying dataset is a one-time ETL snapshot (see
// scripts/ingest-call-report.ts) because NCUA only distributes this data as
// a quarterly bulk download — there's no live per-institution API for it.
// This endpoint still fetches on demand and returns only the one credit
// union asked for, rather than shipping the whole ~4,300-row file to the
// browser as a static asset.
import data from '../data/call-report.json';

type CallReportEntry = {
  totalAssets: number;
  numberOfMembers: number;
  reportDate: string;
  netWorthRatio: number | null;
  loanToShareRatio: number | null;
  delinquencyRatio: number | null;
  netIncomeToAssetsYtd: number | null;
};

const callReportData = data as Record<string, CallReportEntry>;

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url, 'http://localhost');
  const charter = searchParams.get('charter');
  if (!charter) {
    return Response.json(
      { error: 'Missing required "charter" parameter' },
      { status: 400 }
    );
  }

  const entry = callReportData[charter] ?? null;
  return Response.json(entry, {
    headers: { 'Cache-Control': 's-maxage=86400' },
  });
}
