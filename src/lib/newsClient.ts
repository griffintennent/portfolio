// Calls our own /api/news proxy (see api/news.ts), which holds the NYT
// Article Search API key server-side. Returns a fixed "credit union
// industry" feed rather than taking a search term — see api/news.ts for why.
export type NewsArticle = {
  headline: string;
  url: string;
  publishedDate: string;
  snippet: string;
};

export async function fetchIndustryNews(): Promise<NewsArticle[]> {
  const res = await fetch('/api/news');
  if (!res.ok) {
    throw new Error(`News request failed: ${res.status}`);
  }
  return res.json();
}
