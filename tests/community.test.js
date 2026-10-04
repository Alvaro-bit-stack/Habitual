// Community filtering and character-profile integration. No browser dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.argv[2] || path.resolve(__dirname, '..');
const screens = {};
let lastRoute;
const context = vm.createContext({console});
context.window = {SQUI: {
  screens,
  register: (name, screen) => { screens[name] = screen; },
  esc: value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  icon: () => '', hobbyIcon: () => '',
  refresh: () => {}, toast: () => {},
  go: (name, params) => { lastRoute = {name, params}; },
  showReward: () => Promise.resolve()
}};
for (const file of ['data.js', 'engine.js', 'community.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'src', file), 'utf8'), context, {filename:file});
}
context.SQ_VENUES = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/venues/manifest.json'), 'utf8'));
for (const photo of Object.values(context.SQ_VENUES)) {
  assert.ok(fs.readFileSync(path.join(root,'src/assets/venues',photo.file)).subarray(0,2).equals(Buffer.from([255,216])));
  photo.src = 'data:image/jpeg;base64,' + Buffer.from(photo.file).toString('base64');
}
const SQ = context.SQ;
SQ.init();
SQ._now = new Date(2026, 9, 3, 12);
SQ.addHobby('running'); SQ.addHobby('drawing'); SQ.addHobby('guitar');
let click, imageError;
const inputHandlers = {};
const search = {value:'', addEventListener:(name, fn) => { inputHandlers[name] = fn; }};
const result = {innerHTML:''}, status = {textContent:''};
const host = {contains:()=>true, querySelector:selector => ({'#cm-search':search,'[data-feed-results]':result,'[data-feed-status]':status}[selector]), addEventListener:(name, fn) => { if(name==='click') click=fn; if(name==='error') imageError=fn; }};
screens.community.mount({querySelector:()=>host});
function action(name, value, id) {
  const el = {disabled:false, getAttribute:key=>({'data-action':name,'data-v':value,'data-id':id}[key] || null)};
  click({target:{closest:()=>el}});
}
function ids() {
  return [...screens.community.render().matchAll(/class="cm-event-photo" data-action="open-event" data-id="([^"]+)"/g)].map(m=>m[1]).sort();
}
function query(value) { search.value=value; inputHandlers.input(); }
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS ' + name); }
test('Going is the first tab and the default',()=>{const html=screens.community.render();assert.ok(/data-action="category" data-v="going" aria-pressed="true"/.test(html));assert.ok(html.indexOf('data-v="going"')<html.indexOf('data-v="for-you"'));assert.ok(html.includes('Your plans start here'));});
action('category','for-you');
test('For you shows tracked hobbies',()=>assert.deepEqual(ids(), ['ev-drawing-1','ev-guitar-1','ev-running-1','ev-running-2']));
action('category','all');
test('All events exposes the full catalog',()=>assert.equal(ids().length,18));
action('date-filter','tomorrow');
test('Tomorrow uses the local calendar date',()=>assert.deepEqual(ids(),['ev-soccer-1']));
action('date-filter','weekend');
test('Saturday weekend includes this Saturday and Sunday only',()=>assert.deepEqual(ids(),['ev-chess-1','ev-knitting-1','ev-running-1','ev-soccer-1','ev-tennis-1']));
SQ._now = new Date(2026, 9, 4, 12);
test('Sunday weekend excludes the next weekend',()=>assert.deepEqual(ids(),['ev-chess-1','ev-knitting-1','ev-running-1','ev-tennis-1']));
SQ._now = new Date(2026, 9, 2, 12);
test('Friday weekend finds the next two days',()=>assert.deepEqual(ids(),['ev-drawing-1','ev-photography-1','ev-soccer-1']));
action('reset-feed'); query('MILITARY PARK');
test('Search is by location, case insensitive, and reports a singular result',()=>{assert.deepEqual(ids(),['ev-chess-1']); assert.equal(status.textContent,'1 event');});
query('guitar');
test('Search ignores event titles and hobbies (location only)',()=>assert.deepEqual(ids(),[]));
query('ironbound');
test('A neighborhood finds every event there',()=>assert.deepEqual(ids(),['ev-photography-2','ev-soccer-1']));
query('<script>alert(1)</script>');
test('Empty search has a reset action and escapes input',()=>{const html=screens.community.render(); assert.ok(html.includes('No events found')); assert.ok(html.includes('data-action="reset-feed"')); assert.ok(!html.includes('<script>'));});
action('reset-feed'); action('category','going');
test('Going has a useful empty state',()=>assert.ok(screens.community.render().includes('Your plans start here')));
action('rsvp',null,'ev-guitar-1');
test('RSVP appears in Going',()=>assert.deepEqual(ids(),['ev-guitar-1']));
action('rsvp',null,'ev-guitar-1');
test('Removing RSVP updates Going',()=>assert.equal(ids().length,0));
action('category','groups');
test('Group listings ignore the All events search',()=>{
  const html=screens.community.render();assert.ok(html.includes('Drawing · Newark area'));
  assert.ok(html.includes('Guitar · Newark area'));assert.ok(!html.includes('id="cm-search"'));
});
action('open-member',null,'ev-guitar-1');
test('Host action opens the character profile',()=>{assert.equal(lastRoute.name,'member');assert.equal(lastRoute.params.id,'ev-guitar-1');const html=screens.member.render(lastRoute.params);assert.ok(html.includes('Ray D.'));assert.ok(html.includes('cm-mii'));assert.ok(html.includes('data-action="open-group"'));});
test('Characters are deterministic and use no remote images',()=>{const a=screens.member.render({id:'ev-guitar-1'});assert.equal(a,screens.member.render({id:'ev-guitar-1'}));assert.ok(!a.includes('<img'));});
action('reset-feed');
test('Known venues cover 17 events while the unnamed gym has an honest fallback',()=>{
  const html=screens.community.render();
  assert.equal((html.match(/class="cm-venue-image"/g)||[]).length,17);
  const gym=screens.event.render({id:'ev-bouldering-1'});
  assert.ok(gym.includes('Venue photo unavailable'));assert.ok(!gym.includes('<img'));
});
test('Different hobbies at the Main Library share the same venue photo',()=>{
  const photo=id=>screens.event.render({id}).match(/<img[^>]+src="([^"]+)"/)[1];
  assert.equal(photo('ev-guitar-1'),photo('ev-knitting-1'));
  assert.equal(photo('ev-guitar-1'),photo('ev-cooking-1'));
  assert.notEqual(photo('ev-guitar-1'),photo('ev-running-1'));
});
test('Photos include accessible descriptions and source credits',()=>{
  const html=screens.event.render({id:'ev-guitar-1'});
  assert.ok(html.includes('alt="Exterior of the Newark Public Library Main Branch"'));
  assert.ok(html.includes('Kenneth C. Zirkel'));assert.ok(html.includes('CC BY-SA 4.0'));
  assert.ok(html.includes('commons.wikimedia.org/wiki/File:'));
});
test('Changing a location cannot silently retain the old venue photo',()=>{
  const event=context.SQ_DATA.events.find(e=>e.id==='ev-guitar-1');
  const place=event.place;event.place='Unknown library across town';
  assert.ok(!screens.event.render({id:event.id}).includes('<img'));
  event.place='  '+place.toUpperCase()+'  ';
  assert.ok(screens.event.render({id:event.id}).includes('<img'));
  event.place=place;
});
test('Broken photos reveal the location fallback',()=>{
  let removed=false;
  imageError({target:{classList:{contains:()=>true},remove:()=>{removed=true;}}});
  assert.ok(removed);
});
test('Event thumbnails no longer contain character scenes; host avatars remain',()=>{
  const html=screens.community.render();assert.ok(!html.includes('cm-scene-cast'));
  assert.equal((html.match(/class="cm-crowd"/g)||[]).length,18);
});
test('Search exists only in All events and does not filter other tabs',()=>{
  action('category','all');query('military');assert.equal(ids().length,1);
  assert.ok(screens.community.render().includes('id="cm-search"'));
  action('category','for-you');assert.equal(ids().length,4);
  assert.ok(!screens.community.render().includes('id="cm-search"'));
  action('category','going');assert.ok(!screens.community.render().includes('id="cm-search"'));
  action('category','all');assert.equal(ids().length,1);
  query('');
});
test('Hobby filter narrows events and groups, and resets with the feed',()=>{
  action('category','all');action('hobby-filter','running');
  assert.deepEqual(ids(),['ev-running-1','ev-running-2']);
  assert.ok(/id="cm-hobby"[^>]*value="Running"/.test(screens.community.render()));
  action('category','groups');const g=screens.community.render();assert.ok(g.includes('Running · Newark area'));assert.ok(!g.includes('Guitar · Newark area'));
  assert.ok(!g.includes('id="cm-when"'));assert.ok(g.includes('id="cm-hobby"'));
  action('reset-feed');assert.equal(ids().length,18);
});
test('Your tabs list only your hobbies; All events lists every hobby to discover',()=>{
  const opts=()=>[...screens.community.render().matchAll(/id="cm-hobby-opt-\d+" role="option" data-v="([^"]*)"/g)].map(m=>m[1]);
  action('category','going');assert.deepEqual(opts(),['','running','drawing','guitar']);
  action('category','for-you');assert.deepEqual(opts(),['','running','drawing','guitar']);
  action('category','all');const all=opts();assert.deepEqual(all.slice(0,4),['','running','drawing','guitar']);assert.ok(all.includes('tennis')&&all.includes('chess'));
  action('hobby-filter','tennis');assert.ok(ids().every(id=>id.startsWith('ev-tennis')));
  action('category','going');assert.ok(/id="cm-hobby"[^>]*value=""/.test(screens.community.render()),'a hobby you do not track is dropped when switching to Going');
  action('reset-feed');
});
test('Hobby filter is a type-to-search combobox',()=>{
  const html=screens.community.render();
  assert.ok(html.includes('role="combobox"'));assert.ok(html.includes('aria-controls="cm-hobby-list"'));
  assert.ok(html.includes('role="listbox"'));assert.ok(!html.includes('<select id="cm-hobby"'));
});
test('Dates are one dropdown, not a row of buttons',()=>{
  const html=screens.community.render();assert.ok(/id="cm-when" class="cm-menu-btn" data-menu="date-filter" aria-haspopup="listbox"/.test(html));
  assert.ok(html.includes('<span>This weekend</span>'));assert.ok(!html.includes('class="cm-dates"'));
  assert.ok(!html.includes('<select'),'all three filters share the same custom list style');
  assert.equal((html.match(/class="cm-combo-list" role="listbox"/g)||[]).length,3);
});
test('More people going shows more heads (1 to 5), host in front',()=>{
  const html=screens.community.render();
  const heads=[...html.matchAll(/class="cm-crowd" data-heads="(\d)"[^]*?<strong>(\d+) going/g)].map(m=>[+m[1],+m[2]]);
  assert.ok(heads.length===18);
  heads.forEach(([h,n])=>assert.equal(h, n<=1?1:n<=3?2:n<=7?3:n<=14?4:5));
});
test('Header: location eyebrow, title, and a huddle of neighbors with one person in front',()=>{
  const html=screens.community.render();assert.ok(!html.includes('cm-self-avatar'));
  assert.ok(/<span class="cm-hd-eyebrow">[^]*?Newark, NJ<\/span><h1>Community<\/h1>/.test(html),'location sits above the title');
  const hud=html.match(/class="cm-huddle" data-heads="(\d)"[^]*?<\/span><\/span><span>/);assert.ok(hud,'header shows the huddle');
  assert.equal((html.match(/cm-gp-front/g)||[]).length,1,'exactly one person in front');
  assert.ok(/neighbors going<\/strong>/.test(html));
});
test('Level filter shows on For you and All events only; All levels events count for every level',()=>{
  action('category','going');assert.ok(!screens.community.render().includes('id="cm-level"'));
  action('category','groups');assert.ok(!screens.community.render().includes('id="cm-level"'));
  action('category','for-you');assert.ok(screens.community.render().includes('id="cm-level"'));
  action('category','all');assert.ok(screens.community.render().includes('id="cm-level"'));
  const lv=id=>context.SQ_DATA.events.find(e=>e.id===id).level;
  action('level-filter','experienced');assert.ok(ids().length>0&&ids().every(id=>['Experienced','All levels'].includes(lv(id))));assert.ok(ids().includes('ev-tennis-2'));
  action('level-filter','intermediate');assert.deepEqual(ids().filter(id=>lv(id)==='Intermediate'),['ev-hiking-2','ev-running-2','ev-soccer-2']);assert.ok(ids().every(id=>['Intermediate','All levels'].includes(lv(id))));assert.ok(!ids().includes('ev-tennis-2')&&!ids().includes('ev-running-1'));
  action('level-filter','beginner');assert.ok(!ids().includes('ev-running-2'));assert.ok(ids().every(id=>['Beginner friendly','All levels'].includes(lv(id))));assert.ok(!ids().includes('ev-tennis-2'));
  action('category','going');action('rsvp',null,'ev-tennis-2');assert.ok(ids().includes('ev-tennis-2'),'Going ignores the level filter');action('rsvp',null,'ev-tennis-2');
  action('reset-feed');assert.equal(ids().length,18);
});
test('Every event card and the event screen can be shared',()=>{
  const html=screens.community.render();
  assert.equal((html.match(/data-action="share-event"/g)||[]).length,18);
  assert.ok(screens.event.render({id:'ev-guitar-1'}).includes('Share this event'));
  assert.ok(!html.includes('data-action="share" data-id="ev-'),'does not reuse the group "share a session" action');
});
test('Community uses a page title instead of the Habitual wordmark',()=>{
  const html=screens.community.render();assert.ok(html.includes('<h1>Community</h1>'));
  assert.ok(!html.includes('cm-wordmark'));assert.ok(!html.includes('Find your people.'));
});
test('RSVP adds the selected Showcase avatar exactly once',()=>{
  action('reset-feed');SQ.state.user.character='alvaro';
  action('rsvp',null,'ev-running-2');
  const html=screens.event.render({id:'ev-running-2'});
  assert.ok(html.includes('class="cm-person cm-you cm-arriving"'));
  assert.ok(/cm-you cm-arriving[^]*?data-character="alvaro"/.test(html));
  assert.equal((html.match(/class="cm-person cm-you/g)||[]).length,1);
  assert.ok(html.includes('Your avatar has joined the group'));
  const other=screens.event.render({id:'ev-tennis-1'});assert.ok(!other.includes('cm-arriving'));
});
test('Arrival is consumed on mount and never replays on ordinary refresh',()=>{
  screens.event.mount({querySelector:()=>({querySelector:()=>null,addEventListener:()=>{}})});
  assert.ok(!screens.event.render({id:'ev-running-2'}).includes('cm-arriving'));
  assert.ok(screens.event.render({id:'ev-running-2'}).includes('cm-person cm-you'));
});
test('Changing the Showcase choice updates joined event characters',()=>{
  SQ.state.user.character='adrian';
  assert.ok(/cm-person cm-you[^]*?data-character="adrian"/.test(screens.event.render({id:'ev-running-2'})));
  SQ.state.user.character='invalid';
  assert.ok(/cm-person cm-you[^]*?data-character="neo"/.test(screens.event.render({id:'ev-running-2'})));
});
test('Canceling RSVP removes the character and restores the attendee count',()=>{
  action('rsvp',null,'ev-running-2');
  const html=screens.event.render({id:'ev-running-2'});
  assert.ok(!html.includes('cm-person cm-you'));assert.ok(!html.includes('cm-arriving'));
  assert.ok(!html.includes('including you'));
});
test('Group previews combine their real next venue with the new character cast',()=>{
  action('category','groups');const html=screens.community.render();
  assert.ok(html.includes('cm-gathering'));assert.ok(html.includes('cm-group-scene'));
  assert.ok(html.includes('cm-venue-image'));assert.ok(html.includes('cm-venue-cast'));
  assert.ok(!html.includes('cm-scene-cast'));assert.ok(html.includes('Wikimedia Commons'));
  assert.ok(screens.group.render({hobbyId:'running'}).includes('cm-venue-cast'));
});
console.log(`${checks} community tests passed`);
