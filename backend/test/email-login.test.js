import test from 'node:test';
import assert from 'node:assert/strict';
import {SignJWT} from 'jose';
import {createApi} from '../src/api.js';
import {FileStore} from '../src/file-store.js';
import {createEmailLogin, normalizeEmail} from '../src/email-login.js';
const SECRET = 'x'.repeat(48);
function setup() {
  let t = 1_000_000, sent = [];
  const login = createEmailLogin({secret:SECRET, now:() => t, send:async (to, code) => { sent.push({to, code}); }});
  const api = createApi(new FileStore(), login.authenticate, {login});
  const call = (path, method = 'GET', value, headers = {}) => api(new Request('https://hobitual.test/api/' + path, {method, headers:{'x-client-ip':'1.2.3.4', ...headers}, ...(value === undefined ? {} : {body:JSON.stringify(value)})}));
  return {login, api, call, sent, tick:ms => { t += ms; }};
}
const lastCode = sent => sent[sent.length - 1].code;

test('any email can sign in with the emailed code; the session reaches private routes', async () => {
  const {call, sent} = setup();
  assert.equal((await call('auth/start', 'POST', {email:' Maya@Example.COM '})).status, 202);
  assert.equal(sent[0].to, 'maya@example.com');
  assert.match(sent[0].code, /^\d{6}$/);
  const r = await call('auth/verify', 'POST', {email:'maya@example.com', code:sent[0].code});
  assert.equal(r.status, 200);
  const me = await call('me', 'GET', undefined, {Authorization:'Bearer ' + r.jsonBody.token});
  assert.equal(me.status, 200);
  assert.equal(me.jsonBody.email, 'maya@example.com');
  assert.equal((await call('me')).status, 401);
});

test('codes are single use, expire after 10 minutes and lock after 5 wrong guesses', async () => {
  const {call, sent, tick} = setup();
  await call('auth/start', 'POST', {email:'a@b.co'});
  const code = lastCode(sent);
  assert.equal((await call('auth/verify', 'POST', {email:'a@b.co', code})).status, 200);
  assert.equal((await call('auth/verify', 'POST', {email:'a@b.co', code})).status, 401);   // used
  await call('auth/start', 'POST', {email:'a@b.co'}); tick(10 * 60 * 1000 + 1);
  assert.equal((await call('auth/verify', 'POST', {email:'a@b.co', code:lastCode(sent)})).status, 401); // expired
  await call('auth/start', 'POST', {email:'a@b.co'});
  const good = lastCode(sent), wrong = good === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) assert.equal((await call('auth/verify', 'POST', {email:'a@b.co', code:wrong})).status, 401);
  assert.equal((await call('auth/verify', 'POST', {email:'a@b.co', code:good})).status, 401);  // locked out
});

test('rate limits per address and per network, and bad input is rejected', async () => {
  const {call} = setup();
  for (let i = 0; i < 5; i++) assert.equal((await call('auth/start', 'POST', {email:'spam@target.com'})).status, 202);
  assert.equal((await call('auth/start', 'POST', {email:'spam@target.com'})).status, 429);
  for (let i = 0; i < 14; i++) await call('auth/start', 'POST', {email:'x' + i + '@ok.com'});
  assert.equal((await call('auth/start', 'POST', {email:'fresh@ok.com'})).status, 202);  // 20th from this network
  assert.equal((await call('auth/start', 'POST', {email:'fresh2@ok.com'})).status, 429);
  for (const bad of ['', 'nope', 'a@b', 'a b@c.com', '<x>@y.com', 'a@'.padEnd(300, 'x') + '.com']) assert.throws(() => normalizeEmail(bad));
});

test('forged, wrong-audience and expired tokens are refused', async () => {
  const {call, sent, tick} = setup();
  const forged = await new SignJWT({email:'x@y.com'}).setProtectedHeader({alg:'HS256'}).setSubject('x').setIssuer('hobitual').setAudience('hobitual-api').setExpirationTime('1h').sign(new TextEncoder().encode('y'.repeat(48)));
  assert.equal((await call('me', 'GET', undefined, {Authorization:'Bearer ' + forged})).status, 401);
  assert.equal((await call('me', 'GET', undefined, {Authorization:'Bearer none.none.none'})).status, 401);
  await call('auth/start', 'POST', {email:'old@x.com'});
  const {token} = (await call('auth/verify', 'POST', {email:'old@x.com', code:lastCode(sent)})).jsonBody;
  tick(31 * 86400 * 1000);
  assert.equal((await call('me', 'GET', undefined, {Authorization:'Bearer ' + token})).status, 401);
  assert.throws(() => createEmailLogin({secret:'short', send:async () => {}}));
});

test('a failed email send does not leave a usable code behind', async () => {
  const login = createEmailLogin({secret:SECRET, send:async () => { throw new Error('smtp down'); }});
  await assert.rejects(login.start('z@z.com'), e => e.status === 502);
  await assert.rejects(login.verify('z@z.com', '123456'), e => e.status === 401);
});
