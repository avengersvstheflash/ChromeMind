const STORAGE_KEY = 'activitySignals';
const MAX_DOMAINS = 50;
const DEFAULT_RETENTION_DAYS = 14;

export async function recordDomainVisit(domain, timestamp = Date.now()) {
  if (!domain || isSensitiveDomain(domain)) return;
  const data = await chrome.storage.local.get(['activityInsightsEnabled', STORAGE_KEY, 'activityRetentionDays']);
  if (data.activityInsightsEnabled !== true) return;
  const signals = pruneSignals(data[STORAGE_KEY] || {}, data.activityRetentionDays || DEFAULT_RETENTION_DAYS, timestamp);
  const current = signals[domain] || { domain, visits: 0, firstSeen: timestamp, lastVisited: timestamp, category: categorizeDomain(domain) };
  current.visits += 1;
  current.lastVisited = timestamp;
  signals[domain] = current;
  await chrome.storage.local.set({ [STORAGE_KEY]: pruneSignals(signals, data.activityRetentionDays || DEFAULT_RETENTION_DAYS, timestamp) });
}

export async function getActivitySignals() {
  const data = await chrome.storage.local.get([STORAGE_KEY, 'activityRetentionDays']);
  return Object.values(pruneSignals(data[STORAGE_KEY] || {}, data.activityRetentionDays || DEFAULT_RETENTION_DAYS));
}

export async function clearActivitySignals() { await chrome.storage.local.remove([STORAGE_KEY]); }

export function categorizeDomain(domain) {
  if (/developer|github|npmjs|stackoverflow|developer\.chrome/i.test(domain)) return 'software-development';
  if (/docs|wikipedia|medium|arxiv|research/i.test(domain)) return 'research';
  if (/mail|calendar|slack|discord/i.test(domain)) return 'communication';
  if (/amazon|ebay|shop|store/i.test(domain)) return 'shopping';
  return 'general';
}

export function isSensitiveDomain(domain) { return /bank|paypal|account|login|checkout|payment|auth/i.test(domain); }

function pruneSignals(signals, retentionDays, now) {
  const cutoff = now - Math.max(1, retentionDays) * 86400000;
  return Object.fromEntries(Object.values(signals)
    .filter(signal => signal.lastVisited >= cutoff && !isSensitiveDomain(signal.domain))
    .sort((a, b) => b.lastVisited - a.lastVisited)
    .slice(0, MAX_DOMAINS)
    .map(signal => [signal.domain, signal]));
}
