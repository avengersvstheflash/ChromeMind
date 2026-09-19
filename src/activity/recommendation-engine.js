import { getActivitySignals } from './activity-store.js';

const LABELS = { 'software-development': 'software development', research: 'research', communication: 'communication', shopping: 'shopping', general: 'browsing' };
const DISMISSED_KEY = 'dismissedRecommendations';

export async function generateRecommendations() {
  const data = await chrome.storage.local.get([DISMISSED_KEY, 'activityInsightsEnabled']);
  if (data.activityInsightsEnabled !== true) return [];
  const dismissed = data[DISMISSED_KEY] || {};
  const signals = await getActivitySignals();
  const grouped = signals.reduce((groups, signal) => {
    const group = groups[signal.category] || { category: signal.category, visits: 0, domains: [] };
    group.visits += signal.visits;
    group.domains.push(signal.domain);
    groups[signal.category] = group;
    return groups;
  }, {});
  return Object.values(grouped).filter(group => group.visits >= 2 && group.category !== 'general')
    .sort((a, b) => b.visits - a.visits).slice(0, 3)
    .map(group => ({ id: `activity-${group.category}`, category: group.category, title: `Continue your ${LABELS[group.category]} thread`, description: `You visited ${group.domains.length} related ${LABELS[group.category]} site${group.domains.length === 1 ? '' : 's'}. Review or summarize what you learned?`, reason: `${group.visits} local visits across ${group.domains.length} domain${group.domains.length === 1 ? '' : 's'}`, domains: group.domains }))
    .filter(recommendation => !dismissed[recommendation.id]);
}

export async function dismissRecommendation(id) {
  const data = await chrome.storage.local.get([DISMISSED_KEY]);
  await chrome.storage.local.set({ [DISMISSED_KEY]: { ...(data[DISMISSED_KEY] || {}), [id]: Date.now() } });
}

export async function clearDismissedRecommendations() { await chrome.storage.local.remove([DISMISSED_KEY]); }
