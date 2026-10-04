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
action('reset-feed'); query('GUITAR');
test('Search is case insensitive and reports a singular result',()=>{assert.deepEqual(ids(),['ev-guitar-1']); assert.equal(status.textContent,'1 event');});
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
  assert.equal((html.match(/class="cm-attendance-icon"/g)||[]).length,18);
});
test('Search exists only in All events and does not filter other tabs',()=>{
  action('category','all');query('guitar');assert.equal(ids().length,1);
  assert.ok(screens.community.render().includes('id="cm-search"'));
  action('category','for-you');assert.equal(ids().length,4);
  assert.ok(!screens.community.render().includes('id="cm-search"'));
  action('category','going');assert.ok(!screens.community.render().includes('id="cm-search"'));
  action('category','all');assert.equal(ids().length,1);
  query('');
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
