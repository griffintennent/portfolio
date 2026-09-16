// Calls our own /api/complaints proxy (see api/complaints.ts), which queries
// the CFPB's public Consumer Complaint Database for a given credit union
// name. No API key needed, but CFPB restricts CORS to its own frontend, so
// this has to go through our own server.
export type ComplaintsSummary = {
  totalComplaints: number;
  topIssues: string[];
  reliefRate: number | null;
};

export async function fetchComplaintsSummary(
  companyName: string
): Promise<ComplaintsSummary> {
  const res = await fetch(`/api/complaints?company=${encodeURIComponent(companyName)}`);
  if (!res.ok) {
    throw new Error(`Complaints request failed: ${res.status}`);
  }
  return res.json();
}
