// Calls our own /api/branch-rating proxy (see api/branch-rating.ts), which
// looks up a physical branch's Google rating by name + address.
export type BranchRating = {
  rating: number | null;
  reviewCount: number | null;
};

export async function fetchBranchRating(query: string): Promise<BranchRating> {
  const res = await fetch(`/api/branch-rating?query=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error(`Branch rating request failed: ${res.status}`);
  }
  return res.json();
}
