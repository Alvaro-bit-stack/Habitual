import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT} from 'jose';
import {createAuthenticator} from '../src/auth.js';
const env={AUTH_ISSUER:'https://tenant.ciamlogin.com/tenant/v2.0',AUTH_AUDIENCE:'api-client',AUTH_JWKS_URI:'https://tenant.ciamlogin.com/keys',AUTH_SCOPE:'access_as_user'};
const keys=await generateKeyPair('RS256');
async function token(overrides={},key=keys.privateKey){return new SignJWT({sub:'user-1',scp:'access_as_user',name:'Alice',...overrides}).setProtectedHeader({alg:'RS256'}).setIssuer(overrides.iss||env.AUTH_ISSUER).setAudience(overrides.aud||env.AUTH_AUDIENCE).setIssuedAt().setExpirationTime(overrides.exp||'5m').sign(key);}
const request=value=>new Request('https://api.test/api/me',{headers:{Authorization:'Bearer '+value}});
const auth=createAuthenticator(env,keys.publicKey);
test('valid scoped token produces stable opaque identity',async()=>{const one=await auth(request(await token()));const two=await auth(request(await token()));assert.equal(one.id,two.id);assert.match(one.id,/^[a-f0-9]{64}$/);});
test('bad signatures, issuer, audience and expired tokens are rejected',async()=>{
  const other=await generateKeyPair('RS256');for(const t of [await token({},other.privateKey),await token({iss:'https://attacker.test'}),await token({aud:'other-app'}),await token({exp:1})])await assert.rejects(auth(request(t)),e=>e.status===401);
});
test('ID tokens without API scope cannot access the API',async()=>{await assert.rejects(auth(request(await token({scp:''}))),e=>e.status===403);});
test('spoofed identity headers do not replace a bearer token',async()=>{await assert.rejects(auth(new Request('https://api.test/api/me',{headers:{'x-ms-client-principal-id':'alice'}})),e=>e.status===401);});
test('missing identity configuration fails closed',()=>{assert.throws(()=>createAuthenticator({}),/Configure/);});
