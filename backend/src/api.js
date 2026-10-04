import {ApiError, validateState, validateEvent, characters} from './validation.js';
import {generatePath, validatePathRequest} from './paths.js';
const DAY = 86400000, AI_DAILY = Number(process.env.AI_DAILY_LIMIT) || 10;
const response = (status, data) => ({status, jsonBody:data, headers:{'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'}});
export function createApi(store, authenticate, {makePath = generatePath} = {}) {
  return async (request, context = {error:()=>{}}) => {
    try {
      const path = new URL(request.url).pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
      const method = request.method.toUpperCase();
      if (path === 'health' && method === 'GET') return response(200, {ok:true});
      const user = await authenticate(request);
      async function body() {
        if (Number(request.headers.get('content-length')) > 1100000) throw new ApiError(413,'Request too large');
        const text = await request.text();
        if (Buffer.byteLength(text) > 1100000) throw new ApiError(413,'Request too large');
        try { return JSON.parse(text); } catch { throw new ApiError(400,'Invalid JSON'); }
      }
      if (path === 'me' && method === 'GET') return response(200, user);
      if (path === 'me/state' && method === 'GET') return response(200, await store.getState(user.id));
      if (path === 'me/state' && method === 'PUT') {
        const tag = request.headers.get('if-match');
        if (!/^"\d+"$/.test(tag || '')) throw new ApiError(428,'A saved version is required');
        const version = Number(tag.slice(1,-1));
        if (!Number.isSafeInteger(version)) throw new ApiError(400,'Invalid version');
        const data = validateState(await body());
        const saved = await store.putState(user.id, version, data);
        if (!saved) return response(409, {error:'Progress changed on another device', remote:await store.getState(user.id)});
        // What friends see. Best effort: the progress is already saved, and the next save retries this.
        try { await store.profile(user, {name:data.user.name.trim().slice(0,100) || 'Member', character:characters.includes(data.user.character) ? data.user.character : null, xp:Math.min(2147483647, Math.floor(data.user.xp))}); }
        catch (e) { context.error('Profile sync failed', e.name); }
        return response(200, saved);
      }
      if (path === 'friends' && method === 'GET') return response(200, {code:(await store.profile(user)).code, ...await store.friends(user.id)});
      if (path === 'friends' && method === 'POST') {
        const value = await body();
        await store.profile(user);
        return response(200, await store.requestFriend(user.id, value?.code));
      }
      const friend = /^friends\/([A-Za-z0-9]{8})$/.exec(path);
      if (friend && method === 'PUT') {
        const value = await body();
        if (typeof value?.accept !== 'boolean') throw new ApiError(400,'Choose accept or decline');
        return response(200, await store.answerFriend(user.id, friend[1], value.accept));
      }
      if (friend && method === 'DELETE') return response(200, await store.removeFriend(user.id, friend[1]));
      if (path === 'path' && method === 'POST') {
        const req = validatePathRequest(await body());
        const hit = req.key && await store.cachedPath(req.key, 14 * DAY);
        if (hit) return response(200, {...hit, cached:true});
        await store.useAi(user.id, AI_DAILY); // counted before the call, so failures still spend budget
        const made = await makePath(req);
        if (req.key) await store.savePath(req.key, made);
        return response(200, {...made, cached:false});
      }
      if (path === 'events' && method === 'GET') return response(200, {events:await store.events(user.id)});
      if (path === 'events' && method === 'POST') return response(201, await store.createEvent(user, validateEvent(await body())));
      const match = /^events\/([0-9a-f-]{36})\/attendance$/.exec(path);
      if (match && method === 'PUT') {
        const value = await body();
        if (typeof value?.going !== 'boolean') throw new ApiError(400,'Choose going or not going');
        return response(200, await store.attend(user.id, match[1], value.going));
      }
      throw new ApiError(404, 'Not found');
    } catch (error) {
      if (!error.status) context.error('Habitual API failure', error.name); // No user data/tokens in logs.
      return response(error.status || 500, {error:error.status ? error.message : 'Could not save right now. Please retry.'});
    }
  };
}
