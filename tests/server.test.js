#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const {
  createServer, normalizeRequest, extractText, extractSources, validateResearch, researchHobby
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
