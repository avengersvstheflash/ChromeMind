// ChromeMind Pure Activity Intelligence Utilities
// Pure functions only — no chrome.storage, no browser runtime globals.

export const MAX_DOMAINS = 50;
export const DEFAULT_RETENTION_DAYS = 14;

export const CATEGORY_LABELS = {
  'software-development': 'software development',
  research: 'research',
  communication: 'communication',
  shopping: 'shopping',
  general: 'browsing'
};

/**
 * Checks whether a domain matches sensitive keywords (banking, auth, checkout, etc.).
 * @param {string} domain
 * @returns {boolean}
 */
export function isSensitiveDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  return /bank|paypal|account|login|checkout|payment|auth/i.test(domain);
}

/**
 * Categorizes a domain into high-level categories.
 * @param {string} domain
 * @returns {'software-development' | 'research' | 'communication' | 'shopping' | 'general'}
 */
export function categorizeDomain(domain) {
  if (!domain || typeof domain !== 'string') return 'general';
  if (/developer|github|npmjs|stackoverflow|developer\.chrome/i.test(domain)) return 'software-development';
  if (/docs|wikipedia|medium|arxiv|research/i.test(domain)) return 'research';
  if (/mail|calendar|slack|discord/i.test(domain)) return 'communication';
  if (/amazon|ebay|shop|store/i.test(domain)) return 'shopping';
  return 'general';
}

/**
 * Prunes activity signals by retention window, sensitive domain filter, and cap limit.
 * @param {Record<string, object> | Array<object>} signals - Signal dictionary or array
 * @param {number} [retention=DEFAULT_RETENTION_DAYS] - Retention window in days
 * @param {number} [cap=MAX_DOMAINS] - Maximum number of domains to retain
 * @param {number} [now=Date.now()] - Current epoch timestamp
 * @returns {Record<string, object>} Pruned signals dictionary keyed by domain
 */
export function pruneSignals(signals, retention = DEFAULT_RETENTION_DAYS, cap = MAX_DOMAINS, now = Date.now()) {
  // Support shifting if cap was passed as a timestamp (legacy 3-arg call: signals, retention, timestamp)
  if (typeof cap === 'number' && cap > 1e11 && arguments.length === 3) {
    now = cap;
    cap = MAX_DOMAINS;
  }
  if (!signals || typeof signals !== 'object') return {};

  const retentionDays = typeof retention === 'number' ? retention : DEFAULT_RETENTION_DAYS;
  const maxCap = typeof cap === 'number' ? cap : MAX_DOMAINS;
  const currentTime = typeof now === 'number' ? now : Date.now();
  const cutoff = currentTime - Math.max(1, retentionDays) * 86400000;

  const signalList = Array.isArray(signals) ? signals : Object.values(signals);

  const pruned = signalList
    .filter(signal => signal && typeof signal === 'object' && signal.domain)
    .filter(signal => (signal.lastVisited ?? 0) >= cutoff && !isSensitiveDomain(signal.domain))
    .sort((a, b) => (b.lastVisited || 0) - (a.lastVisited || 0))
    .slice(0, maxCap);

  return Object.fromEntries(pruned.map(signal => [signal.domain, signal]));
}

/**
 * Builds proactive recommendations from activity signals and dismissed IDs.
 * Pure function without storage dependencies.
 * @param {Array<object> | Record<string, object>} signals
 * @param {Record<string, number>} [dismissed={}]
 * @returns {Array<{ id: string, category: string, title: string, description: string, reason: string, domains: string[] }>}
 */
export function buildRecommendations(signals = [], dismissed = {}) {
  const signalList = Array.isArray(signals) ? signals : Object.values(signals);

  const grouped = signalList.reduce((groups, signal) => {
    if (!signal || !signal.category) return groups;
    const group = groups[signal.category] || { category: signal.category, visits: 0, domains: [] };
    group.visits += (signal.visits || 0);
    if (signal.domain && !group.domains.includes(signal.domain)) {
      group.domains.push(signal.domain);
    }
    groups[signal.category] = group;
    return groups;
  }, {});

  return Object.values(grouped)
    .filter(group => group.visits >= 2 && group.category !== 'general')
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 3)
    .map(group => {
      const label = CATEGORY_LABELS[group.category] || group.category;
      return {
        id: `activity-${group.category}`,
        category: group.category,
        title: `Continue your ${label} thread`,
        description: `You visited ${group.domains.length} related ${label} site${group.domains.length === 1 ? '' : 's'}. Review or summarize what you learned?`,
        reason: `${group.visits} local visits across ${group.domains.length} domain${group.domains.length === 1 ? '' : 's'}`,
        domains: group.domains
      };
    })
    .filter(rec => !dismissed[rec.id]);
}
