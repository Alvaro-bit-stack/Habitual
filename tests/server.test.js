#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const {
  createServer, normalizeRequest, extractText, extractSources, validateResearch, researchHobby,
  hobbyGuide, youtubeId
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
      hobby: "Trail running", location: "United States", experience: "beginner", currency: "USD", budget: 250
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

  await test("hobby guide keeps verified videos and links, drops the rest", async () => {
    const raw = {
      hobby: "Bouldering", overview: "Start at a gym.",
      community: [
        { insight: "Footwork matters more than arm strength.", source: "r/bouldering", url: "https://www.reddit.com/r/bouldering/comments/real" },
        { insight: "Rent shoes first.", source: "Forum", url: "https://forum.example/fake" }
      ],
      gear: {
        entry: { label: "Entry level", products: [{ name: "Tarantulace", brand: "La Sportiva", price: 89, retailer: "REI", url: "https://shop.example/tarantulace", why: "Comfortable." }] },
        mid: { label: "Mid tier", products: [{ name: "Momentum", brand: "Black Diamond", price: 99, retailer: "", url: "https://made-up.example/x", why: "Popular." }] },
        high: { label: "High end", products: [] }
      },
      videos: [
        { title: "Model title", channel: "Model channel", url: "https://www.youtube.com/watch?v=AAAAAAAAAAA" },
        { title: "Hallucinated", channel: "Nobody", url: "https://www.youtube.com/watch?v=BBBBBBBBBBB" },
        { title: "Duplicate", channel: "X", url: "https://youtu.be/AAAAAAAAAAA" },
        { title: "Not YouTube", channel: "X", url: "https://vimeo.com/123" }
      ],
      firstSteps: [{ title: "Book an intro", details: "Most gyms run one." }]
    };
    let geminiCalls = 0;
    const fetchImpl = async (url, init) => {
      if (url.includes("generativelanguage.googleapis.com")) {
        geminiCalls++;
        const body = JSON.parse(init.body);
        assert.deepEqual(body.tools, [{ google_search: {} }]);
        if (geminiCalls === 2) {
          assert.match(body.contents[0].parts[0].text, /YouTube tutorial videos/);
          return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ videos: [{ title: "More", channel: "C", url: "https://www.youtube.com/watch?v=DDDDDDDDDDD" }] }) }] } }] }) };
        }
        assert.match(body.contents[0].parts[0].text, /Reddit/);
        return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "Here you go:\n```json\n" + JSON.stringify(raw) + "\n```" }] },
          groundingMetadata: { groundingChunks: [
            { web: { title: "reddit.com", uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc" } },
            { web: { title: "youtube.com", uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/yt" } }
          ] } }] }) };
      }
      if (url.startsWith("https://vertexaisearch.cloud.google.com/")) {
        assert.equal(init.redirect, "manual");
        const loc = url.endsWith("/yt") ? "https://www.youtube.com/watch?v=CCCCCCCCCCC" : "https://www.reddit.com/r/bouldering/comments/real";
        return { ok: false, status: 302, headers: { get: (h) => h === "location" ? loc : null } };
      }
      if (url.startsWith("https://www.youtube.com/oembed")) {
        const ok = /AAAAAAAAAAA|CCCCCCCCCCC|DDDDDDDDDDD/.test(url);
        return { ok, status: ok ? 200 : 404, json: async () => ({ title: "Real video title", author_name: "Real channel" }) };
      }
      if (url === "https://www.reddit.com/r/bouldering/comments/real" || url === "https://shop.example/tarantulace") return { ok: true, status: 200 };
      return { ok: false, status: 404 };
    };
    const out = await hobbyGuide({ hobby: "Bouldering" }, { apiKey: "k", fetchImpl, cache: new Map(), model: "m" });
    assert.equal(geminiCalls, 2);
    assert.deepEqual(out.videos.map((v) => v.id), ["AAAAAAAAAAA", "CCCCCCCCCCC", "DDDDDDDDDDD"]);
    assert.equal(out.videos[0].url, "https://www.youtube.com/watch?v=AAAAAAAAAAA");
    assert.equal(out.sources[0].url, "https://www.reddit.com/r/bouldering/comments/real");
    assert.equal(out.sources[0].publisher, "reddit.com");
    assert.equal(out.videos[0].title, "Real video title");
    assert.equal(out.videos[0].channel, "Real channel");
    assert.equal(out.gear.entry.products[0].url, "https://shop.example/tarantulace");
    assert.equal(out.gear.mid.products[0].url, null);
    assert.equal(out.gear.mid.products[0].name, "Momentum");
    assert.equal(out.community[0].url, "https://www.reddit.com/r/bouldering/comments/real");
    assert.equal(out.community[1].url, null);
    assert.equal(out.grounded, true);
    assert.equal("rawUrl" in out.gear.entry.products[0], false);
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

  if (!process.exitCode) console.log(`${passed} backend tests passed`);
})();
