// Calls our own /api/call-report proxy (see api/call-report.ts), which
// serves NCUA's officially published quarterly Call Report figures, keyed
// by charter number.
export type CallReportEntry = {
  totalAssets: number;
  numberOfMembers: number;
  reportDate: string;
  netWorthRatio: number | null;
  loanToShareRatio: number | null;
  delinquencyRatio: number | null;
  netIncomeToAssetsYtd: number | null;
};

export async function getCallReportEntry(
  charterNumber: number
): Promise<CallReportEntry | null> {
  const res = await fetch(`/api/call-report?charter=${charterNumber}`);
  if (!res.ok) {
    throw new Error(`Call Report request failed: ${res.status}`);
  }
  return res.json();
}
