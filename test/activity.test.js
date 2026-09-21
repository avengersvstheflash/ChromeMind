import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSensitiveDomain,
  categorizeDomain,
  pruneSignals,
  buildRecommendations,
  MAX_DOMAINS,
  DEFAULT_RETENTION_DAYS
} from '../src/activity/activity-utils.js';

test('isSensitiveDomain flags banking, payment, and authentication domains', () => {
  const sensitiveDomains = [
    'chasebank.com',
    'paypal.com',
    'checkout.stripe.com',
    'auth.github.com',
    'login.live.com',
    'accounts.google.com',
    'payment.shopify.com'
  ];

  for (const domain of sensitiveDomains) {
    assert.equal(isSensitiveDomain(domain), true, `Expected sensitive domain: ${domain}`);
  }
});

test('isSensitiveDomain permits non-sensitive content and platform domains', () => {
  const safeDomains = [
    'github.com',
    'developer.chrome.com',
    'wikipedia.org',
    'stackoverflow.com',
    'arxiv.org',
    'docs.python.org'
  ];

  for (const domain of safeDomains) {
    assert.equal(isSensitiveDomain(domain), false, `Expected safe domain: ${domain}`);
  }
});

test('isSensitiveDomain handles invalid and boundary inputs', () => {
  assert.equal(isSensitiveDomain(''), false);
  assert.equal(isSensitiveDomain(null), false);
  assert.equal(isSensitiveDomain(undefined), false);
  assert.equal(isSensitiveDomain(123), false);
});

test('categorizeDomain accurately classifies supported domains', () => {
  // Software development
  assert.equal(categorizeDomain('developer.chrome.com'), 'software-development');
  assert.equal(categorizeDomain('github.com'), 'software-development');
  assert.equal(categorizeDomain('npmjs.com'), 'software-development');
  assert.equal(categorizeDomain('stackoverflow.com'), 'software-development');

  // Research
  assert.equal(categorizeDomain('docs.python.org'), 'research');
  assert.equal(categorizeDomain('en.wikipedia.org'), 'research');
  assert.equal(categorizeDomain('medium.com'), 'research');
  assert.equal(categorizeDomain('arxiv.org'), 'research');
  assert.equal(categorizeDomain('researchgate.net'), 'research');

  // Communication
  assert.equal(categorizeDomain('mail.google.com'), 'communication');
  assert.equal(categorizeDomain('calendar.google.com'), 'communication');
  assert.equal(categorizeDomain('slack.com'), 'communication');
  assert.equal(categorizeDomain('discord.com'), 'communication');

  // Shopping
  assert.equal(categorizeDomain('amazon.com'), 'shopping');
  assert.equal(categorizeDomain('ebay.com'), 'shopping');
  assert.equal(categorizeDomain('myshop.com'), 'shopping');
  assert.equal(categorizeDomain('store.steampowered.com'), 'shopping');

  // General / Fallback
  assert.equal(categorizeDomain('news.ycombinator.com'), 'general');
  assert.equal(categorizeDomain('example.com'), 'general');
  assert.equal(categorizeDomain(''), 'general');
  assert.equal(categorizeDomain(null), 'general');
});

test('pruneSignals filters expired records beyond retention window', () => {
  const ONE_DAY_MS = 86400000;
  const now = 1700000000000;
  const retentionDays = 14;

  const signals = {
    'fresh.com': { domain: 'fresh.com', visits: 3, lastVisited: now - (2 * ONE_DAY_MS), category: 'general' },
    'boundary.com': { domain: 'boundary.com', visits: 1, lastVisited: now - (13 * ONE_DAY_MS), category: 'general' },
    'expired.com': { domain: 'expired.com', visits: 10, lastVisited: now - (15 * ONE_DAY_MS), category: 'general' }
  };

  const pruned = pruneSignals(signals, retentionDays, MAX_DOMAINS, now);

  assert.ok(pruned['fresh.com']);
  assert.ok(pruned['boundary.com']);
  assert.equal(pruned['expired.com'], undefined);
});

test('pruneSignals strips sensitive domains even if recent', () => {
  const now = 1700000000000;
  const signals = {
    'safe-dev.com': { domain: 'safe-dev.com', visits: 5, lastVisited: now, category: 'software-development' },
    'mybank.com': { domain: 'mybank.com', visits: 2, lastVisited: now, category: 'general' },
    'paypal.com': { domain: 'paypal.com', visits: 1, lastVisited: now, category: 'general' }
  };

  const pruned = pruneSignals(signals, DEFAULT_RETENTION_DAYS, MAX_DOMAINS, now);

  assert.ok(pruned['safe-dev.com']);
  assert.equal(pruned['mybank.com'], undefined);
  assert.equal(pruned['paypal.com'], undefined);
});

test('pruneSignals enforces maximum domain capacity', () => {
  const now = 1700000000000;
  const signals = {};

  // Create 6 domains with different lastVisited times
  for (let i = 1; i <= 6; i++) {
    signals[`site${i}.org`] = {
      domain: `site${i}.org`,
      visits: i,
      lastVisited: now - ((10 - i) * 1000), // site6 is newest, site1 is oldest
      category: 'software-development'
    };
  }

  // Cap at 3 domains
  const pruned = pruneSignals(signals, 14, 3, now);
  const retainedKeys = Object.keys(pruned);

  assert.equal(retainedKeys.length, 3);
  assert.deepEqual(retainedKeys, ['site6.org', 'site5.org', 'site4.org']);
});

test('buildRecommendations groups by category, filters general, and requires visits >= 2', () => {
  const signals = [
    { domain: 'github.com', category: 'software-development', visits: 3 },
    { domain: 'stackoverflow.com', category: 'software-development', visits: 2 },
    { domain: 'arxiv.org', category: 'research', visits: 4 },
    { domain: 'low-visit.com', category: 'shopping', visits: 1 }, // visits < 2 excluded
    { domain: 'random.com', category: 'general', visits: 10 } // general excluded
  ];

  const recommendations = buildRecommendations(signals);

  // Expected 2 recommendations: software-development (5 total visits) and research (4 visits)
  assert.equal(recommendations.length, 2);

  // Top category by total visits
  assert.equal(recommendations[0].id, 'activity-software-development');
  assert.equal(recommendations[0].category, 'software-development');
  assert.equal(recommendations[0].title, 'Continue your software development thread');
  assert.ok(recommendations[0].domains.includes('github.com'));
  assert.ok(recommendations[0].domains.includes('stackoverflow.com'));
  assert.equal(recommendations[0].reason, '5 local visits across 2 domains');

  // Second category
  assert.equal(recommendations[1].id, 'activity-research');
  assert.equal(recommendations[1].category, 'research');
  assert.equal(recommendations[1].reason, '4 local visits across 1 domain');
});

test('buildRecommendations excludes dismissed recommendation IDs', () => {
  const signals = [
    { domain: 'github.com', category: 'software-development', visits: 5 },
    { domain: 'arxiv.org', category: 'research', visits: 4 }
  ];

  const dismissed = {
    'activity-software-development': Date.now()
  };

  const recommendations = buildRecommendations(signals, dismissed);

  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].id, 'activity-research');
});
