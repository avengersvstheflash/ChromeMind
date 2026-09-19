const STORAGE_KEY = 'activitySignals';
const MAX_DOMAINS = 50;

export async function recordDomainVisit(domain, timestamp = Date.now()) {
  if (!domain || isSensitiveDomain(domain)) return;
  const data = await chrome.storage.local.get(['activityInsightsEnabled', STORAGE_KEY]);
  if (data.activityInsightsEnabled !== true) return;
  const signals = data[STORAGE_KEY] || {};
  const current = signals[domain] || { domain, visits: 0, firstSeen: timestamp, lastVisited: timestamp, category: categorizeDomain(domain) };
  current.visits += 1;
  current.lastVisited = timestamp;
  signals[domain] = current;
  const entries = Object.values(signals).sort((a, b) => b.lastVisited - a.lastVisited).slice(0, MAX_DOMAINS);
  await chrome.storage.local.set({ [STORAGE_KEY]: Object.fromEntries(entries.map(item => [item.domain, item])) });
}

export async function getActivitySignals() {
  const data = await chrome.storage.local.get([STORAGE_KEY]);
  return Object.values(data[STORAGE_KEY] || {});
}

export function categorizeDomain(domain) {
  if (/developer|github|npmjs|stackoverflow|developer.chrome/i.test(domain)) return 'software-development';
  if (/docs|wikipedia|medium|arxiv|research/i.test(domain)) return 'research';
  if (/mail|calendar|slack|discord/i.test(domain)) return 'communication';
  if (/amazon|ebay|shop|store/i.test(domain)) return 'shopping';
  return 'general';
}

function isSensitiveDomain(domain) {
  return /bank|paypal|account|login|checkout|payment/i.test(domain);
}
