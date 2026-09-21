import { getActivitySignals } from './activity-store.js';
import { buildRecommendations } from './activity-utils.js';

const DISMISSED_KEY = 'dismissedRecommendations';

export async function generateRecommendations() {
  const data = await chrome.storage.local.get([DISMISSED_KEY, 'activityInsightsEnabled']);
  if (data.activityInsightsEnabled !== true) return [];
  const dismissed = data[DISMISSED_KEY] || {};
  const signals = await getActivitySignals();
  return buildRecommendations(signals, dismissed);
}

export async function dismissRecommendation(id) {
  const data = await chrome.storage.local.get([DISMISSED_KEY]);
  await chrome.storage.local.set({ [DISMISSED_KEY]: { ...(data[DISMISSED_KEY] || {}), [id]: Date.now() } });
}

export async function clearDismissedRecommendations() {
  await chrome.storage.local.remove([DISMISSED_KEY]);
}
