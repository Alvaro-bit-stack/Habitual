import {createRemoteJWKSet, jwtVerify} from 'jose';
import {createHash} from 'node:crypto';
import {ApiError} from './validation.js';
export function createAuthenticator(env = process.env, keys) {
  const issuer = env.AUTH_ISSUER, audience = env.AUTH_AUDIENCE;
  if (!issuer || !audience || !env.AUTH_JWKS_URI) throw new Error('Configure AUTH_ISSUER, AUTH_AUDIENCE and AUTH_JWKS_URI');
  if (!issuer.startsWith('https://') || !env.AUTH_JWKS_URI.startsWith('https://')) throw new Error('Identity endpoints must use HTTPS');
  const jwks = keys || createRemoteJWKSet(new URL(env.AUTH_JWKS_URI));
  return async request => {
    const header = request.headers.get('authorization') || '';
    if (!header.startsWith('Bearer ')) throw new ApiError(401, 'Sign in to continue');
    let payload;
    try { ({payload} = await jwtVerify(header.slice(7), jwks, {issuer, audience, algorithms:['RS256'], requiredClaims:['exp','iat','sub']})); }
    catch { throw new ApiError(401, 'Your sign-in has expired'); }
    if (!(payload.scp || '').split(' ').includes(env.AUTH_SCOPE || 'access_as_user')) throw new ApiError(403, 'Missing app permission');
    return {id:createHash('sha256').update(issuer + '\n' + payload.sub).digest('hex'), name:String(payload.name || 'Member').slice(0,100)};
  };
}
