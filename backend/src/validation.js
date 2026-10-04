export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const hobbies = ['drawing','running','tennis','guitar','photography','cooking','hiking','soccer','knitting','bouldering','chess','gardening'];
const object = x => x && typeof x === 'object' && !Array.isArray(x);
export function validateState(s) {
  if (!object(s) || s.version !== 1 || !object(s.user) || typeof s.onboarded !== 'boolean') throw new ApiError(400, 'Invalid progress format');
  for (const name of ['tracked','custom','sessions','rsvps','checkins']) if (!Array.isArray(s[name])) throw new ApiError(400, 'Invalid progress lists');
  if (!object(s.achievements) || s.tracked.length > 200 || s.custom.length > 200 || s.sessions.length > 10000) throw new ApiError(400, 'Progress exceeds supported limits');
  for (const h of s.tracked) if (!object(h) || typeof h.hobbyId !== 'string' || h.hobbyId.length > 100 || !Number.isInteger(h.goal) || h.goal < 1 || h.goal > 7 || !Number.isFinite(h.xp) || !Array.isArray(h.milestones)) throw new ApiError(400, 'Invalid tracked hobby');
  for (const h of s.custom) if (!object(h) || typeof h.id !== 'string' || typeof h.name !== 'string') throw new ApiError(400, 'Invalid custom hobby');
  for (const x of s.sessions) if (!object(x) || typeof x.id !== 'string' || typeof x.hobbyId !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.date) || !['tiny','regular','big'].includes(x.size)) throw new ApiError(400, 'Invalid session');
  if (typeof s.user.name !== 'string' || s.user.name.length > 100 || !Number.isFinite(s.user.xp) || s.user.xp < 0) throw new ApiError(400, 'Invalid profile');
  if (s.user.character && !['neo','adrian','alvaro'].includes(s.user.character)) throw new ApiError(400, 'Unknown avatar');
  const text = JSON.stringify(s);
  if (Buffer.byteLength(text) > 1024 * 1024) throw new ApiError(413, 'Progress is too large');
  return JSON.parse(text); // Private backup only; never use client XP to authorize or rank users.
}
export function validateEvent(e) {
  if (!object(e) || !hobbies.includes(e.hobbyId)) throw new ApiError(400, 'Choose a supported hobby');
  for (const k of ['title','place']) if (typeof e[k] !== 'string' || !e[k].trim() || e[k].length > 200) throw new ApiError(400, 'Invalid event ' + k);
  if (!['Beginner friendly','Intermediate','Experienced','All levels'].includes(e.level)) throw new ApiError(400, 'Invalid skill level');
  if (!Number.isInteger(e.spots) || e.spots < 2 || e.spots > 500) throw new ApiError(400, 'Capacity must be 2–500');
  const date = Date.parse(e.startsAt);
  if (!Number.isFinite(date) || date <= Date.now() || date > Date.now() + 366 * 86400000 || !/(Z|[+-]\d\d:\d\d)$/.test(e.startsAt)) throw new ApiError(400, 'Use a future date with a time zone');
  return {hobbyId:e.hobbyId, title:e.title.trim(), place:e.place.trim(), level:e.level, spots:e.spots, startsAt:new Date(date).toISOString()};
}
