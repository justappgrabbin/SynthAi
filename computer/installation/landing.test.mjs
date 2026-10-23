import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, 'page must include inline client-side behavior');
const script = match[1];

function render({ url = 'https://synth.example/?via=ABC123', live = false } = {}) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, { href: '', textContent: '', hidden: true });
    return elements.get(id);
  };
  const document = {
    getElementById: element,
    querySelectorAll: () => [],
  };
  const source = live
    ? script.replace(
      'const RELEASE={published:false,packageId:null};',
      'const RELEASE={published:true,packageId:"org.synthai.computer"};'
    )
    : script;
  if (live) assert.notEqual(source, script, 'test must modify real release gate');
  runInNewContext(source, {
    URL, URLSearchParams,
    location: new URL(url),
    document,
    navigator: {},
    clearTimeout: () => {}, setTimeout: () => 0,
  });
  return { elements, element };
}

test('the prelaunch landing page never claims an install link exists', () => {
  const { element } = render();
  assert.match(html, /id="install" href="#discover"/);
  assert.equal(element('install').href, '');
  assert.equal(element('installBottom').href, '');
  assert.match(html, /Public launch in development/);
  assert.match(html, /Google Play listing/);
});

test('a published release gets an official Google Play URL with an opaque invitation', () => {
  const { element } = render({ live: true });
  const play = new URL(element('install').href);
  assert.equal(play.origin, 'https://play.google.com');
  assert.equal(play.pathname, '/store/apps/details');
  assert.equal(play.searchParams.get('id'), 'org.synthai.computer');
  const referral = new URLSearchParams(play.searchParams.get('referrer'));
  assert.equal(referral.get('utm_source'), 'synth_share');
  assert.equal(referral.get('invitation'), 'ABC123');
  assert.equal(element('installBottom').href, play.href);
});

test('invalid invitations do not propagate to Google Play', () => {
  for (const code of ['long'.repeat(16), 'bob%40email.com', '%3Cscript%3E']) {
    const { element } = render({ url: 'https://synth.example/?via=' + code, live: true });
    const url = new URL(element('install').href);
    assert.equal(url.searchParams.get('referrer'), null);
  }
});

test('page offers sharing and distinguishes research from proven outcomes', () => {
  assert.match(html, /data-share/);
  assert.match(html, /scientific parallels/i);
  assert.match(html, /test ideas/i);
  assert.match(html, /personal data/i);
  assert.match(html, /@media\(max-width:780px\)/);
});
