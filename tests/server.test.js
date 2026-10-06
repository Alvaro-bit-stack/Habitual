#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const {
  createServer, normalizeRequest, extractText, extractSources, validateResearch, researchHobby,
  hobbyGuide, youtubeId, firstJsonObject, hobbyAssistant, mentionsProduct, pageText, siteOf
} = require("../server.js");

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; }
  catch (error) { console.error("FAIL", name, error); process.exitCode = 1; }
}

function sampleRaw() {
  return {
    hobby: "Running", category: "active", overview: "Start with short, easy sessions.",
    equipment: [{ name: "Running shoes", essential: true, costLow: 60, costHigh: 160, why: "Comfort and traction.", buyingTip: "Try them on.", suggestedOptions: ["Daily trainer"] }],
    totalCost: { low: 60, high: 180 },
    firstSteps: [{ title: "Walk-run", details: "Alternate walking and easy running.", minutes: 20 }],
    tutorials: [{ title: "Running form basics", format: "video", provider: "A running coach", searchQuery: "beginner running form", whatYouLearn: "Relaxed posture." }],
    safety: ["Increase gradually."], notes: ["Fit matters more than hype."]
  };
}

(async () => {
  await test("request normalization and validation", () => {
    assert.deepEqual(normalizeRequest({ hobby: "  Trail   running ", budget: "250", currency: "USD" }), {
      hobby: "Trail running", location: "United States", experience: "beginner", currency: "USD", budget: 250, level: "beginner"
    });
    assert.throws(() => normalizeRequest({ hobby: "!" }), /recognizable|at least/);
    assert.throws(() => normalizeRequest({ hobby: "Running", budget: 20000 }), /Budget/);
  });

  await test("grounded text and HTTPS sources are extracted", () => {
    const payload = { candidates: [{ content: { parts: [{ text: "{\"ok\":true}" }] }, groundingMetadata: { groundingChunks: [
      { web: { title: "Guide", uri: "https://example.com/guide" } },
      { web: { title: "Unsafe", uri: "http://example.com/no" } },
      { web: { title: "Duplicate", uri: "https://example.com/guide" } }
    ] } }] };
    assert.equal(extractText(payload), '{"ok":true}');
    assert.deepEqual(extractSources(payload), [{ title: "Guide", url: "https://example.com/guide", publisher: "example.com" }]);
  });

  await test("research documents are bounded and normalized", () => {
    const out = validateResearch(sampleRaw(), normalizeRequest({ hobby: "Running" }), []);
    assert.equal(out.category, "active");
    assert.equal(out.equipment[0].costHigh, 160);
    assert.equal(out.currency, "USD");
    assert.match(out.researchedAt, /^\d{4}-\d{2}-\d{2}T/);
  });

  await test("Gemini key stays in the request header and results are cached", async () => {
    let calls = 0;
    const fetchImpl = async (url, init) => {
      calls++;
      assert(!url.includes("secret-test-key"));
      assert.equal(init.headers["x-goog-api-key"], "secret-test-key");
      return {
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(sampleRaw()) }] }, groundingMetadata: {
          groundingChunks: [{ web: { title: "Running guide", uri: "https://example.org/running" } }]
        } }] })
      };
    };
    const testCache = new Map();
    const opts = { apiKey: "secret-test-key", fetchImpl, cache: testCache, model: "test-model" };
    const one = await researchHobby({ hobby: "Running" }, opts);
    const two = await researchHobby({ hobby: "Running" }, opts);
    assert.equal(calls, 1);
    assert.equal(one.cached, false);
    assert.equal(two.cached, true);
    assert.equal(one.sources[0].url, "https://example.org/running");
    assert.equal(one.grounded, true);
  });

  await test("search-quota failures fall back to a clearly ungrounded Gemini guide", async () => {
    let calls = 0;
    const fetchImpl = async (_url, init) => {
      calls++;
      if (calls === 1) return { ok: false, status: 429 };
      const body = JSON.parse(init.body);
      assert.equal(body.tools, undefined);
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(sampleRaw()) }] } }] }) };
    };
    const out = await researchHobby({ hobby: "Running" }, {
      apiKey: "secret-test-key", fetchImpl, cache: new Map(), model: "test-model"
    });
    assert.equal(calls, 2);
    assert.equal(out.grounded, false);
    assert.deepEqual(out.sources, []);
  });

  await test("YouTube ids are parsed only from real YouTube URLs", () => {
    assert.equal(youtubeId("https://www.youtube.com/watch?v=abcdefghijk&t=3"), "abcdefghijk");
    assert.equal(youtubeId("https://youtu.be/abcdefghijk"), "abcdefghijk");
    assert.equal(youtubeId("https://m.youtube.com/shorts/abcdefghijk"), "abcdefghijk");
    assert.equal(youtubeId("https://evil.example/watch?v=abcdefghijk"), null);
    assert.equal(youtubeId("http://www.youtube.com/watch?v=abcdefghijk"), null);
    assert.equal(youtubeId("https://www.youtube.com/watch?v=short"), null);
  });

  await test("beginner guide: crash course of real videos and tasks with checked sources", async () => {
    const plan = {
      hobby: "Bouldering", overview: "Start at a gym.",
      tasks: [
        { title: "Climb ten easy problems with quiet feet", details: "Place each foot silently.", minutes: 30, why: "r/bouldering says footwork first.",
          sources: [{ site: "r/bouldering", url: "https://www.reddit.com/r/bouldering/comments/real" }, { site: "Made up", url: "https://forum.example/fake" }] },
        { title: "Rest between attempts", details: "", minutes: 500, why: "", sources: [] }
      ],
      crashCourse: [
        { title: "Model title", channel: "Model channel", url: "https://www.youtube.com/watch?v=AAAAAAAAAAA" },
        { title: "Hallucinated", channel: "Nobody", url: "https://www.youtube.com/watch?v=BBBBBBBBBBB" },
        { title: "Duplicate", channel: "X", url: "https://youtu.be/AAAAAAAAAAA" },
        { title: "Not YouTube", channel: "X", url: "https://vimeo.com/123" }
      ]
    };
    const kits = { hobby: "Bouldering", gear: { budget: { products: [{ name: "Tarantulace", brand: "La Sportiva", price: 89, retailer: "REI", url: "https://shop.example/tarantulace", why: "Comfortable." }] }, premium: { products: [] } } };
    const prompts = [];
    const fetchImpl = async (url, init) => {
      if (url.includes("generativelanguage.googleapis.com")) {
        const body = JSON.parse(init.body);
        const prompt = body.contents[0].parts[0].text;
        prompts.push(prompt);
        assert.deepEqual(body.tools, [{ google_search: {} }]);
        if (/Skip video ids/.test(prompt)) {
          assert.match(prompt, /crash-course/);
          return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ videos: [{ title: "More", channel: "C", url: "https://www.youtube.com/watch?v=DDDDDDDDDDD" }] }) }] } }] }) };
        }
        const out = /starter kits/.test(prompt) ? kits : plan;
        return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "Here you go:\n```json\n" + JSON.stringify(out) + "\n```" }] },
          groundingMetadata: { groundingChunks: [
            { web: { title: "reddit.com", uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc" } },
            { web: { title: "youtube.com", uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/yt" } }
          ] } }] }) };
      }
      if (url.startsWith("https://vertexaisearch.cloud.google.com/")) {
        const loc = url.endsWith("/yt") ? "https://www.youtube.com/watch?v=CCCCCCCCCCC" : "https://www.reddit.com/r/bouldering/comments/real";
        return { ok: false, status: 302, headers: { get: (h) => h === "location" ? loc : null } };
      }
      if (url.startsWith("https://www.youtube.com/oembed")) {
        const ok = /AAAAAAAAAAA|CCCCCCCCCCC|DDDDDDDDDDD/.test(url);
        return { ok, status: ok ? 200 : 404, json: async () => ({ title: "Real video title", author_name: "Real channel" }) };
      }
      if (url === "https://shop.example/tarantulace") return { ok: true, status: 200 };
      if (url === "https://www.reddit.com/r/bouldering/comments/real") return { ok: false, status: 403 };
      return { ok: false, status: 404 };
    };
    const out = await hobbyGuide({ hobby: "Bouldering", level: "beginner" }, { apiKey: "k", fetchImpl, cache: new Map(), model: "m" });
    assert.equal(prompts.length, 3, "kits and plan in parallel, then one search for more videos");
    assert.ok(prompts.some((p) => /starter kits/.test(p) && /budget/.test(p) && /premium/.test(p)));
    assert.ok(prompts.some((p) => /crashCourse/.test(p) && /complete beginner/.test(p)));
    assert.equal(out.level, "beginner");
    assert.deepEqual(out.crashCourse.map((v) => v.id), ["AAAAAAAAAAA", "CCCCCCCCCCC", "DDDDDDDDDDD"]);
    assert.equal(out.crashCourse[0].title, "Real video title");
    assert.equal(out.gear.budget.label, "Budget start");
    assert.equal(out.gear.budget.products[0].url, "https://shop.example/tarantulace");
    assert.equal(out.gear.premium.label, "Premium start");
    assert.equal(out.tasks.length, 2);
    assert.deepEqual(out.tasks[0].sources.map((x) => x.url), ["https://www.reddit.com/r/bouldering/comments/real"], "a blocked page Gemini searched is kept; a made-up page is dropped");
    assert.equal(out.tasks[1].minutes, 120);
    assert.equal("videos" in out || "community" in out || "firstSteps" in out, false);
  });

  await test("intermediate and advanced guides are tasks only", async () => {
    const prompts = [];
    const fetchImpl = async (url, init) => {
      if (!url.includes("generativelanguage.googleapis.com")) return { ok: false, status: 404 };
      const prompt = JSON.parse(init.body).contents[0].parts[0].text;
      prompts.push(prompt);
      const raw = { hobby: "Guitar", overview: "x", tasks: [{ title: "Learn a barre chord transition", details: "F to Bb", minutes: 20, why: "w", sources: [] }],
        crashCourse: [{ url: "https://www.youtube.com/watch?v=AAAAAAAAAAA" }], gear: { budget: { products: [{ name: "Should be ignored", price: 1 }] } } };
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(raw) }] } }] }) };
    };
    const out = await hobbyGuide({ hobby: "Guitar", level: "intermediate" }, { apiKey: "k", fetchImpl, cache: new Map(), model: "m" });
    assert.equal(prompts.length, 1, "no kits request");
    assert.match(prompts[0], /intermediate hobbyist/);
    assert.doesNotMatch(prompts[0], /crashCourse|starter kits/);
    assert.equal(out.level, "intermediate");
    assert.deepEqual(out.gear, {});
    assert.deepEqual(out.crashCourse, []);
    assert.equal(out.tasks[0].title, "Learn a barre chord transition");
  });

  await test("almost-JSON from Gemini is cleaned up or salvaged", () => {
    const cited = '{"tasks":[{"title":"Learn Em [x]","why":"Reddit says so"} [1], {"title":"Learn G","why":"ok" [cite: 2, 3]},],"overview":"a"} trailing words';
    const a = firstJsonObject("Sure!\n```json\n" + cited + "\n```");
    assert.deepEqual(a.tasks.map((t) => t.title), ["Learn Em [x]", "Learn G"]);
    assert.equal(a.overview, "a");
    const cut = '{"hobby":"Guitar","tasks":[{"title":"One","minutes":10},{"title":"Two","minutes":15},{"title":"Thr';
    const b = firstJsonObject(cut);
    assert.deepEqual(b.tasks.map((t) => t.title), ["One", "Two"], "a cut-off answer keeps its complete items");
    assert.equal(b.hobby, "Guitar");
    const newline = '{"why":"line one\nline two"}';
    assert.equal(firstJsonObject(newline).why, "line one line two");
    assert.throws(() => firstJsonObject("no json here"), /No JSON object/);
  });

  await test("assistant answers with checked product links and optional tasks", async () => {
    let sent;
    const fetchImpl = async (url, init) => {
      if (url.includes("generativelanguage.googleapis.com")) {
        sent = JSON.parse(init.body);
        const raw = { reply: "Try these cheaper picks [1].", products: [
            { brand: "Yamaha", name: "FG800", price: 199, retailer: "Store", url: "https://shop.example/fg800", why: "Solid top." },
            { brand: "Fender", name: "CD-60S", price: 199, retailer: "", url: "https://made-up.example/x", why: "" }],
          tasks: [{ title: "One minute changes", details: "", minutes: 3, why: "" }] };
        return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "```json\n" + JSON.stringify(raw) + "\n```" }] } }] }) };
      }
      if (url === "https://shop.example/fg800") return { ok: true, status: 200, text: async () => "<title>Yamaha FG800 Acoustic</title>" };
      return { ok: false, status: 404 };
    };
    const out = await hobbyAssistant({ hobby: "Guitar", level: "beginner", question: "Anything cheaper?",
      history: [{ role: "user", text: "hi" }, { role: "assistant", text: "Hello!" }],
      context: { products: ["Yamaha FG800J"], tasks: ["Do One Minute Changes"] } }, { apiKey: "k", fetchImpl, model: "m" });
    assert.equal(out.reply, "Try these cheaper picks [1].");
    assert.equal(out.products[0].url, "https://shop.example/fg800");
    assert.equal(out.products[1].linkType, "search");
    assert.equal(out.tasks[0].minutes, 5);
    assert.deepEqual(sent.contents.map((c) => c.role), ["user", "model", "user"]);
    assert.match(sent.contents[2].parts[0].text, /Yamaha FG800J/);
    assert.match(sent.contents[2].parts[0].text, /Anything cheaper\?/);
    await assert.rejects(() => hobbyAssistant({ hobby: "Guitar", question: "" }, { apiKey: "k", fetchImpl, model: "m" }), /Ask a question/);
  });

  await test("product names are matched by brand and model words", () => {
    const p = { brand: "La Sportiva", name: "Tarantulace climbing shoe" };
    assert.equal(mentionsProduct(pageText("<p>I started in the <b>La Sportiva Tarantulace</b>, great shoe</p>"), p), true);
    assert.equal(mentionsProduct(pageText("<p>Get the Tarantulace from La&nbsp;Sportiva</p>"), p), true);
    assert.equal(mentionsProduct(pageText("<p>La Sportiva makes good shoes</p>"), p), false);
    assert.equal(mentionsProduct(pageText("<p>Scarpa Origin is the best first shoe</p>"), p), false);
    assert.equal(mentionsProduct(pageText("<script>Tarantulace La Sportiva</script><p>nothing</p>"), p), false);
    assert.equal(mentionsProduct(pageText("Yamaha FG800 acoustic"), { brand: "Yamaha", name: "FG800" }), true);
    assert.equal(mentionsProduct(pageText("Yamaha FG830 acoustic"), { brand: "Yamaha", name: "FG800" }), false);
    assert.equal(siteOf("https://old.reddit.com/r/x"), "reddit.com");
    assert.equal(siteOf("https://www.rei.co.uk/p"), "rei.co.uk");
    assert.equal(siteOf("https://forum.example.org/t/1"), "example.org");
  });

  await test("starter kits: cross-verified products need two independent sites that name them", async () => {
    const raw = {
      hobby: "Bouldering", overview: "Start at a gym.", community: [],
      gear: {
        budget: { label: "whatever", products: [
          { name: "Tarantulace", brand: "La Sportiva", price: 89, retailer: "REI", url: "https://www.rei.com/product/tarantulace", why: "Comfy.",
            sources: [{ site: "Reddit", url: "https://www.reddit.com/r/bouldering/comments/shoes" }, { site: "Review", url: "https://www.outdoorgearlab.com/shoes" }, { site: "REI", url: "https://www.rei.com/learn/shoes" }] },
          { name: "Momentum", brand: "Black Diamond", price: 99, retailer: "Store", url: "https://store.example/wrong-page", why: "Popular.",
            sources: [{ site: "Blog", url: "https://blog.example/nothing-about-it" }, { site: "Made up", url: "https://made-up.example/x" }] }
        ] },
        premium: { products: [{ name: "Chalk bag 2", brand: "Metolius", price: 25, retailer: "", url: "", why: "Classic.", sources: [] }] }
      },
      videos: [], firstSteps: []
    };
    const text = JSON.stringify(raw);
    const payload = { candidates: [{ content: { parts: [{ text }] }, groundingMetadata: {
      groundingChunks: [{ web: { title: "mountainproject.com", uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/mp" } }],
      groundingSupports: [{ segment: { text: '"name":"Chalk bag 2","brand":"Metolius"' }, groundingChunkIndices: [0] },
                          { segment: { text: '"name":"Tarantulace"' }, groundingChunkIndices: [0] }]
    } }] };
    const pages = {
      "https://www.rei.com/product/tarantulace": "<title>La Sportiva Tarantulace Climbing Shoes | REI</title>",
      "https://www.reddit.com/r/bouldering/comments/shoes": "<p>Everyone here starts in the La Sportiva Tarantulace</p>",
      "https://www.outdoorgearlab.com/shoes": "<h2>La Sportiva Tarantulace review</h2>",
      "https://www.rei.com/learn/shoes": "<p>Our pick: La Sportiva Tarantulace</p>",
      "https://store.example/wrong-page": "<title>Black Diamond Solution harness</title>",
      "https://blog.example/nothing-about-it": "<p>Climbing is fun</p>"
    };
    const fetchImpl = async (url, init) => {
      if (url.includes("generativelanguage.googleapis.com")) {
        const body = JSON.parse(init.body);
        if (/Skip video ids/.test(body.contents[0].parts[0].text)) return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "{\"videos\":[]}" }] } }] }) };
        const prompt = body.contents[0].parts[0].text;
        assert.deepEqual(body.generationConfig.thinkingConfig, { thinkingLevel: "low" });
        if (/starter kits/.test(prompt)) { assert.match(prompt, /different websites/); assert.doesNotMatch(prompt, /crashCourse/); }
        else { assert.match(prompt, /tasks/); assert.doesNotMatch(prompt, /starter kits/); }
        return { ok: true, json: async () => payload };
      }
      if (url.endsWith("/grounding-api-redirect/mp")) return { ok: false, status: 302, headers: { get: (h) => h === "location" ? "https://www.mountainproject.com/forum/topic/123" : null } };
      if (url === "https://www.mountainproject.com/forum/topic/123") return { ok: false, status: 403 };
      if (pages[url]) return { ok: true, status: 200, text: async () => pages[url] };
      return { ok: false, status: 404 };
    };
    const out = await hobbyGuide({ hobby: "Bouldering" }, { apiKey: "k", fetchImpl, cache: new Map(), model: "m" });
    const [shoe, harness] = out.gear.budget.products;
    assert.equal(out.gear.budget.label, "Budget start");
    assert.equal(out.gear.premium.label, "Premium start");
    assert.equal(out.gear.budget.total, 188);
    assert.equal(shoe.url, "https://www.rei.com/product/tarantulace");
    assert.equal(shoe.linkType, "product");
    assert.equal(shoe.buyUrl, shoe.url);
    assert.deepEqual(shoe.sources.map((x) => [x.site, x.how]).sort(), [["mountainproject.com", "search"], ["outdoorgearlab.com", "page"], ["reddit.com", "page"]]);
    assert.equal(shoe.verified, true, "Reddit + OutdoorGearLab + Mountain Project, not the store's own blog");
    assert.equal(shoe.sourceCount, 3);
    assert.equal(harness.url, null, "a store page for a different product is not linked");
    assert.equal(harness.linkType, "search");
    assert.match(harness.buyUrl, /^https:\/\/www\.google\.com\/search\?tbm=shop&q=Black%20Diamond%20Momentum$/);
    assert.deepEqual(harness.sources, [], "pages that do not name it, or do not exist, are not sources");
    assert.equal(harness.verified, false);
    const chalk = out.gear.premium.products[0];
    assert.equal(chalk.sourceCount, 1);
    assert.equal(chalk.verified, false, "one grounded site is a source, not cross-verification");
    assert.equal("rawSources" in shoe, false);
  });

  await test("an unavailable or exhausted model falls through to the next one", async () => {
    const tried = [];
    const fetchImpl = async (url) => {
      const m = /models\/([^:]+):generateContent/.exec(url);
      if (m) {
        tried.push(decodeURIComponent(m[1]));
        if (tried.length === 1) return { ok: false, status: 404 };
        if (tried.length === 2) return { ok: false, status: 429 };
        return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(sampleRaw()) }] } }] }) };
      }
      return { ok: false, status: 404 };
    };
    const out = await researchHobby({ hobby: "Running" }, { apiKey: "k", fetchImpl, cache: new Map() });
    assert.equal(tried.length, 3);
    assert.equal(new Set(tried).size, 3);
    assert.equal(out.hobby, "Running");
  });

  await test("a model that rejects thinkingLevel is asked again without it", async () => {
    const seen = [];
    const fetchImpl = async (url, init) => {
      if (!url.includes("generativelanguage.googleapis.com")) return { ok: false, status: 404 };
      const body = JSON.parse(init.body);
      seen.push(!!(body.generationConfig && body.generationConfig.thinkingConfig));
      if (body.generationConfig && body.generationConfig.thinkingConfig) return { ok: false, status: 400, json: async () => ({ error: { message: "thinking_level is not supported" } }) };
      const raw = { hobby: "Chess", gear: { budget: { products: [{ name: "Tournament set", brand: "", price: 30 }] } }, tasks: [] };
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(raw) }] } }] }) };
    };
    const out = await hobbyGuide({ hobby: "Chess" }, { apiKey: "k", fetchImpl, cache: new Map(), model: undefined, quiet: true });
    assert.equal(out.gear.budget.products[0].name, "Tournament set");
    assert.ok(seen.indexOf(true) >= 0 && seen.indexOf(false) >= 0);
  });

  await test("character scripts are allowlisted and the Three.js CDN is permitted", async () => {
    const server = createServer();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      const home = await fetch(base + "/", { method: "HEAD" });
      assert.equal(home.status, 200);
      const csp = home.headers.get("content-security-policy") || "";
      assert.match(csp, /script-src[^;]*https:\/\/cdn\.jsdelivr\.net/);

      const model = await fetch(base + "/models/neo.js", { method: "HEAD" });
      assert.equal(model.status, 200);
      assert.match(model.headers.get("content-type") || "", /^application\/javascript/);

      const unknown = await fetch(base + "/models/unknown.js", { method: "HEAD" });
      assert.equal(unknown.status, 404);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("link previews: share tags sit in <head> and og.png is served", async () => {
    const server = createServer();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      const html = await (await fetch(base + "/")).text();
      const head = html.slice(0, html.indexOf("</head>"));
      assert.match(head, /<meta property="og:image" content="https:\/\/hobitual\.club\/og\.png">/);
      assert.match(head, /<title>Hobitual<\/title>/);
      const bot = await (await fetch(base + "/", { headers: { "user-agent": "LinkedInBot/1.0" } })).text();
      assert.ok(bot.length < 8192, "preview bots get only the head");
      assert.match(bot, /og:image/);
      const image = await fetch(base + "/og.png", { method: "HEAD" });
      assert.equal(image.status, 200);
      assert.equal(image.headers.get("content-type"), "image/png");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  if (!process.exitCode) console.log(`${passed} backend tests passed`);
})();
