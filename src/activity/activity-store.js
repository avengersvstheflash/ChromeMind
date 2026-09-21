import {
  isSensitiveDomain,
  categorizeDomain,
  pruneSignals,
  MAX_DOMAINS,
  DEFAULT_RETENTION_DAYS
} from './activity-utils.js';

export {
  isSensitiveDomain,
  categorizeDomain,
  pruneSignals,
  MAX_DOMAINS,
  DEFAULT_RETENTION_DAYS
};

const STORAGE_KEY = 'activitySignals';

export async function recordDomainVisit(domain, timestamp = Date.now()) {
  if (!domain || isSensitiveDomain(domain)) return;
  const data = await chrome.storage.local.get(['activityInsightsEnabled', STORAGE_KEY, 'activityRetentionDays']);
  if (data.activityInsightsEnabled !== true) return;
  const retentionDays = data.activityRetentionDays || DEFAULT_RETENTION_DAYS;
  const signals = pruneSignals(data[STORAGE_KEY] || {}, retentionDays, MAX_DOMAINS, timestamp);
  const current = signals[domain] || { domain, visits: 0, firstSeen: timestamp, lastVisited: timestamp, category: categorizeDomain(domain) };
  current.visits += 1;
  current.lastVisited = timestamp;
  signals[domain] = current;
  await chrome.storage.local.set({ [STORAGE_KEY]: pruneSignals(signals, retentionDays, MAX_DOMAINS, timestamp) });
}

export async function getActivitySignals() {
  const data = await chrome.storage.local.get([STORAGE_KEY, 'activityRetentionDays']);
  return Object.values(pruneSignals(data[STORAGE_KEY] || {}, data.activityRetentionDays || DEFAULT_RETENTION_DAYS, MAX_DOMAINS));
}

export async function clearActivitySignals() {
  await chrome.storage.local.remove([STORAGE_KEY]);
}
