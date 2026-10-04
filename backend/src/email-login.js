// Sign in with any email: we email a 6-digit code, the code buys a 30-day signed session token.
// Codes are stored hashed, expire in 10 minutes and allow 5 guesses. Responses never reveal
// whether an address has an account, so this can't be used to discover who uses the app.
import {createHash, createHmac, randomInt, timingSafeEqual} from 'node:crypto';
import {SignJWT, jwtVerify} from 'jose';
import {ApiError} from './validation.js';

const CODE_TTL = 10 * 60 * 1000, MAX_TRIES = 5, SESSION_DAYS = 30, HOUR = 3600 * 1000;
const LIMITS = {email: 5, ip: 20, all: 300}; // codes per hour; "all" caps email cost if someone scripts it
const ISS = 'hobitual', AUD = 'hobitual-api';
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function normalizeEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !EMAIL.test(email)) throw new ApiError(400, 'Enter a valid email address');
  return email;
}
export const userIdFor = email => createHash('sha256').update('email\n' + email).digest('hex');

export function createEmailLogin({secret, send, now = Date.now}) {
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('SESSION_SECRET must be at least 32 bytes');
  const key = new TextEncoder().encode(secret);
  const hash = (email, code) => createHmac('sha256', key).update(email + '\n' + code).digest();
  // ponytail: in-memory codes and counters assume one app instance (B1); move to SQL before scaling out.
  const codes = new Map(), hits = new Map();
  function recent(bucket) { const t = now(), list = (hits.get(bucket) || []).filter(x => t - x < HOUR); hits.set(bucket, list); return list; }
  // All buckets must have room before any is charged, so a refused request costs nothing.
  function take(limits) {
    if (limits.some(([bucket, limit]) => recent(bucket).length >= limit)) return false;
    limits.forEach(([bucket]) => hits.get(bucket).push(now())); return true;
  }

  async function start(value, ip = 'unknown') {
    const email = normalizeEmail(value);
    if (recent('all').length >= LIMITS.all) throw new ApiError(503, 'Sign-in is busy. Try again soon.');
    if (!take([['ip:' + ip, LIMITS.ip], ['email:' + email, LIMITS.email], ['all', LIMITS.all]])) throw new ApiError(429, 'Too many codes requested. Try again in an hour.');
    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    codes.set(email, {hash:hash(email, code), exp:now() + CODE_TTL, tries:0});
    try { await send(email, code); }
    catch { codes.delete(email); throw new ApiError(502, 'Could not send the email. Try again.'); }
    return {sent:true};
  }

  async function verify(value, code) {
    const email = normalizeEmail(value), entry = codes.get(email);
    if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) throw new ApiError(400, 'Enter the 6-digit code');
    if (!entry || entry.exp < now()) { codes.delete(email); throw new ApiError(401, 'That code expired. Request a new one.'); }
    if (++entry.tries > MAX_TRIES) { codes.delete(email); throw new ApiError(401, 'Too many tries. Request a new code.'); }
    if (!timingSafeEqual(entry.hash, hash(email, code.trim()))) throw new ApiError(401, 'That code is not right');
    codes.delete(email); // one use
    const exp = Math.floor(now() / 1000) + SESSION_DAYS * 86400;
    const token = await new SignJWT({email}).setProtectedHeader({alg:'HS256'}).setSubject(userIdFor(email))
      .setIssuer(ISS).setAudience(AUD).setIssuedAt(Math.floor(now() / 1000)).setExpirationTime(exp).sign(key);
    return {token, email, expiresAt:new Date(exp * 1000).toISOString()};
  }

  async function authenticate(request) {
    const header = request.headers.get('authorization') || '';
    if (!header.startsWith('Bearer ')) throw new ApiError(401, 'Sign in to continue');
    let payload;
    try { ({payload} = await jwtVerify(header.slice(7), key, {issuer:ISS, audience:AUD, algorithms:['HS256'], requiredClaims:['exp','sub'], currentDate:new Date(now())})); }
    catch { throw new ApiError(401, 'Your sign-in has expired'); }
    // 'Member' is the public fallback name; the player's chosen name comes from their saved profile.
    return {id:payload.sub, name:'Member', email:payload.email};
  }

  return {start, verify, authenticate};
}

// Azure Communication Services email. connection = the ACS connection string (from Key Vault).
export function acsMailer(connection, from) {
  let client;
  return async (to, code) => {
    if (!client) { const {EmailClient} = await import('@azure/communication-email'); client = new EmailClient(connection); }
    await client.beginSend({senderAddress:from, recipients:{to:[{address:to}]}, content:{
      subject:'Your Hobitual code: ' + code,
      plainText:'Your Hobitual sign-in code is ' + code + '.\n\nIt expires in 10 minutes. If you did not ask for it, ignore this email.',
      html:'<p>Your Hobitual sign-in code is</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">' + code + '</p><p>It expires in 10 minutes. If you did not ask for it, ignore this email.</p>'}});
  };
}
