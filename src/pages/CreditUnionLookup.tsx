import { useEffect, useState, type FormEvent } from 'react';
import {
  groupByCharter,
  searchByName,
  searchByZipPrefix,
  type CreditUnionGroup,
} from '../lib/hifldClient';
import { getCallReportEntry, type CallReportEntry } from '../lib/callReportData';
import { fetchIndustryNews, type NewsArticle } from '../lib/newsClient';
import {
  fetchComplaintsSummary,
  type ComplaintsSummary,
} from '../lib/complaintsClient';
import { fetchBranchRating, type BranchRating } from '../lib/placesClient';
import { fetchZipFromCoords } from '../lib/geocodeClient';

const numberFormat = new Intl.NumberFormat('en-US');
const currencyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const BRANCH_DISPLAY_LIMIT = 20;

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(2)}%`;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function branchAmenities(branch: CreditUnionGroup['branches'][number]): string[] {
  const amenities: string[] = [];
  if (branch.hasAtm) amenities.push('ATM');
  if (branch.driveThru) amenities.push('Drive-thru');
  if (branch.memberServices) amenities.push('Member services');
  if (branch.sharedServiceCenter) amenities.push('Shared service center');
  return amenities;
}

function StarRating({ rating, reviewCount }: BranchRating) {
  if (rating === null) {
    return <p className="mt-1 text-xs text-stone-400">No rating on file</p>;
  }
  const fullStars = Math.round(rating);
  return (
    <p className="mt-1 flex items-center gap-1 text-xs">
      <span aria-hidden="true" className="tracking-tight text-amber-500">
        {'★'.repeat(fullStars)}
        <span className="text-stone-300">{'★'.repeat(5 - fullStars)}</span>
      </span>
      <span className="text-stone-500">
        {rating.toFixed(1)}
        {reviewCount !== null &&
          ` (${numberFormat.format(reviewCount)} review${reviewCount === 1 ? '' : 's'})`}
      </span>
    </p>
  );
}

function BranchRatingBadge({ query }: { query: string }) {
  const [branchRating, setBranchRating] = useState<BranchRating | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setBranchRating(null);
    setError(false);
    fetchBranchRating(query)
      .then(setBranchRating)
      .catch(() => setError(true));
  }, [query]);

  if (error) return null;
  if (!branchRating) {
    return <p className="mt-1 text-xs text-stone-400">Loading rating…</p>;
  }
  return <StarRating {...branchRating} />;
}

function CreditUnionProfile({ group }: { group: CreditUnionGroup }) {
  const [callReport, setCallReport] = useState<CallReportEntry | null>(null);
  const [callReportError, setCallReportError] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<ComplaintsSummary | null>(null);
  const [complaintsError, setComplaintsError] = useState<string | null>(null);

  useEffect(() => {
    setCallReport(null);
    setCallReportError(null);
    getCallReportEntry(group.charterNumber)
      .then((entry) => {
        if (!entry) {
          setCallReportError('No Call Report data found for this charter.');
          return;
        }
        setCallReport(entry);
      })
      .catch(() => setCallReportError('Call Report data unavailable right now.'));
  }, [group.charterNumber]);

  useEffect(() => {
    setComplaints(null);
    setComplaintsError(null);
    fetchComplaintsSummary(group.name)
      .then(setComplaints)
      .catch(() => setComplaintsError('Complaint data unavailable right now.'));
  }, [group.name]);

  const main = group.branches[0];
  const badges: string[] = [];
  if (group.branches.some((b) => b.lowIncome)) badges.push('Low-income designated');
  if (group.branches.some((b) => b.minorityDepositoryInstitution))
    badges.push('Minority depository institution');
  if (group.branches.some((b) => b.fhlbMember)) badges.push('FHLB member');
  if (group.branches.some((b) => b.firstTimeHomebuyerProgram))
    badges.push('First-time homebuyer program');
  if (group.branches.some((b) => b.creditBuilderProgram))
    badges.push('Credit-builder loans');
  if (group.branches.some((b) => b.paydayAlternativeLoans))
    badges.push('Payday-alternative loans');
  if (group.branches.some((b) => b.financialCounseling))
    badges.push('Financial counseling');
  if (group.branches.some((b) => b.bilingualServices))
    badges.push('Bilingual services');
  if (group.branches.some((b) => b.noCostShareDrafts))
    badges.push('No-cost checking');
  if (group.branches.some((b) => b.noCostTaxPrep))
    badges.push('No-cost tax prep');
  if (group.branches.some((b) => b.lowCostWireTransfers))
    badges.push('Low-cost wire transfers');
  if (group.branches.some((b) => b.inSchoolBranch))
    badges.push('In-school branch program');

  return (
    <div className="space-y-6">
      <div className="border border-stone-200 bg-white p-6">
        <h2 className="text-2xl font-bold text-stone-900">{group.name}</h2>
        <p className="mt-1 text-sm text-stone-500">
          Charter #{group.charterNumber} · {group.branches.length} branch
          {group.branches.length === 1 ? '' : 'es'} on file
        </p>
        <p className="mt-1 text-sm text-stone-500">
          {main.siteType || 'Headquarters'} · {main.addressLine1}, {main.city},{' '}
          {main.state} {main.zip}
          {main.phone && ` · ${formatPhone(main.phone)}`}
        </p>
        {badges.length > 0 && (
          <p className="mt-4 text-xs uppercase tracking-wide text-red-800">
            {badges.join(' · ')}
          </p>
        )}
        <p className="mt-4 text-xs text-stone-400">
          Source:{' '}
          <a
            href="https://hifld-geoplatform.hub.arcgis.com/maps/geoplatform::ncua-insured-credit-unions"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-stone-900"
          >
            HIFLD / NCUA Insured Credit Unions
          </a>
        </p>
      </div>

      <div>
        <div className="border border-stone-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-stone-900">Size snapshot</h3>
          {callReportError && (
            <p className="mt-2 text-sm text-stone-500">{callReportError}</p>
          )}
          {!callReportError && !callReport && (
            <p className="mt-2 text-sm text-stone-500">Loading…</p>
          )}
          {callReport && (
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-xs text-stone-400">Total assets</dt>
                <dd className="text-lg font-semibold text-stone-900">
                  {currencyFormat.format(callReport.totalAssets)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-400">Members</dt>
                <dd className="text-lg font-semibold text-stone-900">
                  {numberFormat.format(callReport.numberOfMembers)}
                </dd>
              </div>
              <p className="text-xs text-stone-400">
                As of {callReport.reportDate.split(' ')[0]} — source:{' '}
                <a
                  href="https://ncua.gov/analysis/credit-union-corporate-call-report-data"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-stone-900"
                >
                  NCUA Call Report
                </a>
              </p>
            </dl>
          )}
        </div>
      </div>

      <div className="border border-stone-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-stone-900">Financial health</h3>
        <p className="mt-1 text-xs text-stone-500">
          From the same NCUA Call Report as the size snapshot above — the
          standard ratios examiners use to gauge a credit union's stability.
        </p>
        {callReportError && (
          <p className="mt-2 text-sm text-stone-500">{callReportError}</p>
        )}
        {!callReportError && !callReport && (
          <p className="mt-2 text-sm text-stone-500">Loading…</p>
        )}
        {callReport && (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-stone-400">Net worth ratio</dt>
              <dd className="text-lg font-semibold text-stone-900">
                {formatPercent(callReport.netWorthRatio)}
              </dd>
              <p className="mt-0.5 text-xs text-stone-500">
                Capital cushion against losses. NCUA considers 7%+
                well-capitalized.
              </p>
            </div>
            <div>
              <dt className="text-xs text-stone-400">Loan-to-share ratio</dt>
              <dd className="text-lg font-semibold text-stone-900">
                {formatPercent(callReport.loanToShareRatio)}
              </dd>
              <p className="mt-0.5 text-xs text-stone-500">
                How much of members' deposits are out as loans vs. held in
                reserve.
              </p>
            </div>
            <div>
              <dt className="text-xs text-stone-400">Delinquency rate</dt>
              <dd className="text-lg font-semibold text-stone-900">
                {formatPercent(callReport.delinquencyRatio)}
              </dd>
              <p className="mt-0.5 text-xs text-stone-500">
                Share of loans 2+ months past due.
              </p>
            </div>
            <div>
              <dt className="text-xs text-stone-400">Net income (YTD)</dt>
              <dd className="text-lg font-semibold text-stone-900">
                {formatPercent(callReport.netIncomeToAssetsYtd)}
              </dd>
              <p className="mt-0.5 text-xs text-stone-500">
                Year-to-date earnings as a share of assets (not annualized).
              </p>
            </div>
          </dl>
        )}
      </div>

      <div className="border border-stone-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-stone-900">
          Branches ({group.branches.length})
        </h3>
        <ul className="mt-3 divide-y divide-stone-200">
          {group.branches.slice(0, BRANCH_DISPLAY_LIMIT).map((branch, i) => {
            const amenities = branchAmenities(branch);
            const ratingQuery = `${group.name}, ${branch.addressLine1}, ${branch.city}, ${branch.state} ${branch.zip}`;
            return (
              <li key={i} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-stone-900">
                  {branch.siteType || 'Branch'}
                  {branch.addressLine2 && ` · ${branch.addressLine2}`}
                </p>
                <p className="mt-0.5 text-sm text-stone-500">
                  {branch.addressLine1}, {branch.city}, {branch.state}{' '}
                  {branch.zip}
                  {branch.phone && ` · ${formatPhone(branch.phone)}`}
                </p>
                {amenities.length > 0 && (
                  <p className="mt-1 text-xs uppercase tracking-wide text-stone-400">
                    {amenities.join(' · ')}
                  </p>
                )}
                <BranchRatingBadge query={ratingQuery} />
              </li>
            );
          })}
        </ul>
        {group.branches.length > BRANCH_DISPLAY_LIMIT && (
          <p className="mt-3 text-xs text-stone-400">
            + {group.branches.length - BRANCH_DISPLAY_LIMIT} more branches not
            shown.
          </p>
        )}
      </div>

      <div className="border border-stone-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-stone-900">
          Consumer complaints
        </h3>
        {complaintsError && (
          <p className="mt-2 text-sm text-stone-500">{complaintsError}</p>
        )}
        {!complaintsError && !complaints && (
          <p className="mt-2 text-sm text-stone-500">Loading…</p>
        )}
        {complaints && complaints.totalComplaints === 0 && (
          <p className="mt-2 text-sm text-stone-500">
            No complaints on file with the CFPB.
          </p>
        )}
        {complaints && complaints.totalComplaints > 0 && (
          <>
            <p className="mt-3 text-2xl font-bold text-stone-900">
              {numberFormat.format(complaints.totalComplaints)}
            </p>
            <p className="text-xs text-stone-400">
              total complaints on file since 2011
            </p>
            {complaints.topIssues.length > 0 && (
              <p className="mt-3 text-sm text-stone-600">
                Most common: {complaints.topIssues.join(', ')}
              </p>
            )}
            {complaints.reliefRate !== null && (
              <p className="mt-1 text-sm text-stone-600">
                {formatPercent(complaints.reliefRate)} of resolved complaints
                ended in some relief for the consumer.
              </p>
            )}
          </>
        )}
        {complaints && (
          <p className="mt-3 text-xs text-stone-400">
            Source:{' '}
            <a
              href={`https://www.consumerfinance.gov/data-research/consumer-complaints/search/?searchField=all&searchText=${encodeURIComponent(group.name)}`}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-stone-900"
            >
              CFPB Consumer Complaint Database
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

function IndustryNewsSection() {
  const [news, setNews] = useState<NewsArticle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIndustryNews()
      .then(setNews)
      .catch(() => setError('News unavailable right now.'));
  }, []);

  return (
    <div className="mt-16 border-t border-stone-200 pt-10">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400">
        Credit Union Industry News
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-stone-500">
        Recent New York Times coverage of the NCUA, the federal agency that
        charters, regulates, and insures credit unions nationwide.
      </p>
      <div className="mt-5 border border-stone-200 bg-white p-6">
        {error && <p className="text-sm text-stone-500">{error}</p>}
        {!error && !news && <p className="text-sm text-stone-500">Loading…</p>}
        {news && news.length === 0 && (
          <p className="text-sm text-stone-500">No recent coverage found.</p>
        )}
        {news && news.length > 0 && (
          <ul className="divide-y divide-stone-200">
            {news.map((article) => (
              <li key={article.url} className="py-4 first:pt-0 last:pb-0">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-stone-900 underline decoration-stone-300 underline-offset-2 hover:text-red-800 hover:decoration-red-800"
                >
                  {article.headline}
                </a>
                <p className="mt-0.5 text-xs text-stone-400">
                  {article.publishedDate.split('T')[0]}
                </p>
                <p className="mt-1 text-sm text-stone-500">{article.snippet}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CreditUnionLookup() {
  const [nameQuery, setNameQuery] = useState('');
  const [zipQuery, setZipQuery] = useState('');
  const [results, setResults] = useState<CreditUnionGroup[]>([]);
  const [selected, setSelected] = useState<CreditUnionGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [locating, setLocating] = useState(false);

  async function runSearch(kind: 'name' | 'zip', zipOverride?: string) {
    setLoading(true);
    setError(null);
    setSelected(null);
    setHasSearched(true);
    try {
      // The dataset only covers a subset of physical branches, so an exact
      // 5-digit ZIP match frequently returns nothing; a 3-digit prefix
      // covers a metro-sized area instead. This is a known v1 simplification
      // (see roadmap) — a real radius search would geocode the ZIP first.
      const branches =
        kind === 'name'
          ? await searchByName(nameQuery)
          : await searchByZipPrefix((zipOverride ?? zipQuery).trim().slice(0, 3));
      setResults(groupByCharter(branches));
    } catch {
      setError('Search failed — the credit union data source may be unavailable.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    if (nameQuery.trim().length < 2) return;
    runSearch('name');
  }

  function handleZipSubmit(e: FormEvent) {
    e.preventDefault();
    if (zipQuery.trim().length < 3) return;
    runSearch('zip');
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setError('Location is not supported by this browser.');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const zip = await fetchZipFromCoords(
            position.coords.latitude,
            position.coords.longitude
          );
          setZipQuery(zip);
          await runSearch('zip', zip);
        } catch {
          setError('Could not determine a ZIP code for your location.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setError('Location access was denied.');
        setLocating(false);
      }
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-stone-900">Credit Union Lookup</h1>
      <p className="mt-2 max-w-2xl text-stone-600">
        Search for a federally insured credit union by name, or browse ones
        near a ZIP code, to see its official NCUA profile, size, service
        offerings, and recent news in one place.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <form onSubmit={handleNameSubmit} className="flex gap-2">
          <input
            type="text"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Search by name (e.g. Navy Federal)"
            className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-50 hover:bg-stone-700"
          >
            Search
          </button>
        </form>
        <form onSubmit={handleZipSubmit} className="flex gap-2">
          <input
            type="text"
            value={zipQuery}
            onChange={(e) => setZipQuery(e.target.value)}
            placeholder="Browse near ZIP code"
            className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={locating}
            title="Use my location"
            aria-label="Use my location"
            className="shrink-0 border border-stone-300 px-3 py-2 text-sm text-stone-600 hover:border-stone-900 hover:text-stone-900 disabled:opacity-50"
          >
            {locating ? '…' : '📍'}
          </button>
          <button
            type="submit"
            className="shrink-0 border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 hover:border-stone-900"
          >
            Browse
          </button>
        </form>
      </div>

      {loading && <p className="mt-6 text-sm text-stone-500">Searching…</p>}
      {error && <p className="mt-6 text-sm text-red-700">{error}</p>}
      {!loading && !error && hasSearched && results.length === 0 && (
        <p className="mt-6 text-sm text-stone-500">
          No credit unions found. Try a different name or ZIP code.
        </p>
      )}

      {!selected && results.length > 0 && (
        <ul className="mt-8 divide-y divide-stone-200 border border-stone-200 bg-white">
          {results.map((group) => (
            <li key={group.charterNumber}>
              <button
                onClick={() => setSelected(group)}
                className="group block w-full px-5 py-4 text-left transition-colors hover:bg-stone-100"
              >
                <p className="text-xs uppercase tracking-wide text-stone-400">
                  Charter #{group.charterNumber} · {group.branches.length}{' '}
                  branch
                  {group.branches.length === 1 ? '' : 'es'}
                </p>
                <p className="mt-1 font-semibold text-stone-900 group-hover:text-red-800">
                  {group.name}
                </p>
                <p className="mt-0.5 text-sm text-stone-500">
                  {group.branches[0].city}, {group.branches[0].state}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="mt-8">
          <button
            onClick={() => setSelected(null)}
            className="mb-4 text-sm text-stone-500 underline hover:text-stone-900"
          >
            ← Back to results
          </button>
          <CreditUnionProfile group={selected} />
        </div>
      )}

      <IndustryNewsSection />
    </section>
  );
}

export default CreditUnionLookup;
