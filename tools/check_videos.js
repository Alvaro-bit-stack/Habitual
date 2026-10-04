#!/usr/bin/env node
// Checks every crash-course video in src/plans.js against YouTube (oEmbed) and its thumbnail.
// Run from the project folder: node tools/check_videos.js
"use strict";
global.window = global;
require("../src/plans.js");
(async () => {
  let bad = 0;
  for (const [hobby, plan] of Object.entries(global.SQ_PLANS)) {
    for (const v of plan.crashCourse || []) {
      const url = "https://www.youtube.com/watch?v=" + v.id;
      let line = `${hobby}  ${v.id}  `;
      try {
        const o = await fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(url));
        const t = await fetch(`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`, { method: "HEAD" });
        if (o.ok) { const j = await o.json(); line += `OK  "${j.title}" (${j.author_name})`; }
        else { bad++; line += `MISSING (oEmbed ${o.status})  expected "${v.title}"`; }
        line += `  thumbnail ${t.status}`;
      } catch (e) { bad++; line += "ERROR " + e.message; }
      console.log(line);
    }
  }
  console.log(bad ? `${bad} video(s) need replacing` : "All crash-course videos exist");
  process.exit(bad ? 1 : 0);
})();
