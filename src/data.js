(function () {
  "use strict";

  var achievements = [
    { id: "first_hobby", name: "First Step", desc: "Track your first hobby.", category: "starter" },
    { id: "first_session", name: "Off the Couch", desc: "Log your first session.", category: "starter" },
    { id: "starter_pack", name: "Packed and Ready", desc: "Start a hobby from a starter pack.", category: "starter" },
    { id: "tiny_five", name: "Small but Mighty", desc: "Log 5 tiny wins.", category: "consistency" },
    { id: "three_hobbies", name: "Well Rounded", desc: "Track 3 hobbies at once.", category: "starter" },
    { id: "goal_week_1", name: "Goal Getter", desc: "Hit a weekly goal for any hobby.", category: "consistency" },
    { id: "goal_week_4", name: "Four Strong Weeks", desc: "Reach a 4-week goal streak on one hobby.", category: "consistency" },
    { id: "comeback", name: "Welcome Back", desc: "Log a session after 14 or more days away.", category: "comeback" },
    { id: "milestone_1", name: "Skill Unlocked", desc: "Tick your first skill milestone.", category: "skill" },
    { id: "milestone_5", name: "Getting Good", desc: "Tick 5 skill milestones in total.", category: "skill" },
    { id: "event_1", name: "Showed Up", desc: "Check in at your first local event.", category: "social" },
    { id: "event_5", name: "Regular Face", desc: "Check in at 5 local events.", category: "social" },
    { id: "level_5", name: "Level 5", desc: "Reach player level 5.", category: "starter" }
  ];

  function gear(items, reason) {
    return items.map(function (item) {
      return { name: item[0], price: item[1], reason: reason };
    });
  }

  function hobby(config) {
    var freeItems = gear(config.free.map(function (name) { return [name, [0, 0]]; }), "Free way to try it.");
    var budgetItems = gear(config.gear, "Basic starter equipment.");
    var stepupItems = gear(config.gear, "A practical upgrade after the first few sessions.");
    return {
      id: config.id,
      name: config.name,
      category: config.category,
      vibes: [config.category],
      place: config.place,
      social: config.social,
      minBudget: 0,
      time: "mid",
      blurb: "",
      related: config.related,
      tinyWins: [2, 5, 10, 20, 30].map(function (minutes, index) {
        return { label: (index ? "Practice " : "Try ") + config.name.toLowerCase() + " for " + minutes + " minutes", minutes: minutes };
      }),
      milestones: [1, 2, 3, 4, 5].map(function (number) {
        return { id: "step" + number, label: "Complete beginner step " + number };
      }),
      tutorials: config.tutorials.map(function (tutorial) {
        return { title: tutorial[0], searchQuery: tutorial[1], format: "video" };
      }),
      starterPack: {
        whyLike: "",
        firstMonth: "",
        tiers: {
          free: { items: freeItems },
          budget: { items: budgetItems },
          stepup: { items: stepupItems }
        },
        tryFirst: config.free,
        firstSessions: config.tutorials.map(function (tutorial, index) {
          return {
            title: tutorial[0],
            detail: "Follow the introductory tutorial.",
            tinyVersion: "Try the first " + ((index + 1) * 5) + " minutes."
          };
        })
      }
    };
  }

  var hobbies = [
    hobby({
      id: "guitar", name: "Guitar", category: "creative", place: "indoor", social: "solo", related: ["piano", "journaling"],
      free: ["Borrow a guitar", "Use a free tuner app"], gear: [["Beginner acoustic guitar", [90, 180]], ["Picks and tuner", [10, 25]]],
      tutorials: [["Hold and tune a guitar", "beginner guitar how to hold and tune guitar"], ["First three guitar chords", "beginner guitar first three chords lesson"], ["Play a first easy song", "beginner guitar first easy song tutorial"]]
    }),
    hobby({
      id: "soccer", name: "Soccer", category: "active", place: "outdoor", social: "group", related: ["running", "basketball"],
      free: ["Join a free pickup game", "Borrow a ball"], gear: [["Size 5 soccer ball", [15, 30]], ["Shin guards", [10, 20]], ["Soccer socks", [8, 15]]],
      tutorials: [["Basic dribbling", "beginner soccer dribbling tutorial"], ["Passing technique", "beginner soccer passing technique"], ["Soccer rules", "soccer rules for complete beginners"]]
    }),
    hobby({
      id: "tennis", name: "Tennis", category: "active", place: "outdoor", social: "group", related: ["running", "basketball"],
      free: ["Borrow a racket", "Use a public court"], gear: [["Beginner tennis racket", [25, 55]], ["Tennis balls", [4, 8]]],
      tutorials: [["Forehand basics", "beginner tennis forehand tutorial"], ["Serve basics", "beginner tennis serve tutorial"], ["Tennis scoring", "tennis scoring explained for beginners"]]
    }),
    hobby({
      id: "painting", name: "Painting", category: "creative", place: "indoor", social: "solo", related: ["photography", "journaling"],
      free: ["Use paper and supplies already at home", "Borrow art supplies"], gear: [["Student paint set", [12, 30]], ["Brush set", [8, 20]], ["Paper or canvas pad", [8, 18]]],
      tutorials: [["Color mixing basics", "painting color mixing basics beginner"], ["First still life", "beginner painting simple still life tutorial"], ["Brush control", "painting brush control exercises beginner"]]
    }),
    hobby({
      id: "photography", name: "Photography", category: "creative", place: "either", social: "solo", related: ["painting", "journaling"],
      free: ["Use your phone camera", "Use a free editing app"], gear: [["Phone tripod", [15, 30]], ["Lens cleaning cloth", [5, 10]]],
      tutorials: [["Composition basics", "photography composition basics beginner"], ["Use natural light", "beginner photography natural light tutorial"], ["Edit a first photo", "beginner photo editing tutorial phone"]]
    }),
    hobby({
      id: "running", name: "Running", category: "active", place: "outdoor", social: "either", related: ["soccer", "basketball"],
      free: ["Start with comfortable shoes you own", "Use a free walk-run timer"], gear: [["Entry-level running shoes", [60, 130]], ["Running socks", [10, 20]]],
      tutorials: [["Walk-run method", "beginner walk run method tutorial"], ["Running form basics", "beginner running form tutorial"], ["Warm-up routine", "beginner running warm up routine"]]
    }),
    hobby({
      id: "sewing", name: "Sewing", category: "creative", place: "indoor", social: "solo", related: ["painting", "journaling"],
      free: ["Borrow a sewing machine", "Practice with old fabric"], gear: [["Basic hand-sewing kit", [8, 20]], ["Fabric scissors", [10, 25]], ["Starter fabric", [8, 20]]],
      tutorials: [["Thread a needle and sew a seam", "hand sewing basic seam beginner tutorial"], ["Sew on a button", "how to sew on a button beginner"], ["First machine stitches", "sewing machine first stitches beginner tutorial"]]
    }),
    hobby({
      id: "journaling", name: "Journaling", category: "relaxing", place: "either", social: "solo", related: ["painting", "photography"],
      free: ["Use paper and a pen you own", "Use a free notes app"], gear: [["Notebook", [5, 18]], ["Pen", [2, 8]]],
      tutorials: [["Start a journaling habit", "how to start journaling for beginners"], ["Five-minute journal prompt", "five minute journaling prompts beginner"], ["Weekly reflection", "weekly reflection journaling tutorial"]]
    }),
    hobby({
      id: "piano", name: "Piano", category: "creative", place: "indoor", social: "solo", related: ["guitar", "journaling"],
      free: ["Use a library or community piano", "Use a free keyboard-learning app"], gear: [["Used beginner keyboard", [70, 180]], ["Keyboard stand", [20, 45]]],
      tutorials: [["Keyboard layout and posture", "beginner piano keyboard layout posture"], ["First five notes", "beginner piano first five notes tutorial"], ["First easy melody", "beginner piano first easy melody tutorial"]]
    }),
    hobby({
      id: "basketball", name: "Basketball", category: "active", place: "either", social: "group", related: ["soccer", "running"],
      free: ["Use a public court", "Borrow a basketball"], gear: [["Indoor-outdoor basketball", [18, 35]], ["Ball pump", [8, 15]]],
      tutorials: [["Dribbling basics", "beginner basketball dribbling tutorial"], ["Shooting form", "beginner basketball shooting form tutorial"], ["Basketball rules", "basketball rules for complete beginners"]]
    })
  ];

  var groups = hobbies.map(function (item, index) {
    return {
      hobbyId: item.id, name: item.name + " · Newark area", members: 120 + index * 29,
      posts: [
        { author: "Maya R.", text: "Beginner meetup this week.", daysAgo: 1, sessionLabel: "Regular session · 30 min" },
        { author: "Jordan K.", text: "Practiced the basics today.", daysAgo: 2, sessionLabel: "Tiny win · 10 min" },
        { author: "Alex T.", text: "Looking for other beginners.", daysAgo: 4, sessionLabel: "Regular session · 40 min" }
      ]
    };
  });

  var events = [
    { id: "ev-running-1", hobbyId: "running", title: "Easy 5K walk-run loop", dayOffset: 0, time: "6:30 PM", place: "Branch Brook Park, Lake Street entrance", level: "Beginner friendly", spots: 30, going: 18, host: "Tasha L." },
    { id: "ev-chess-1", hobbyId: "journaling", title: "Quiet park journaling hour", dayOffset: 0, time: "5:00 PM", place: "Military Park chess tables", level: "All levels", spots: 16, going: 9, host: "Walter H." },
    { id: "ev-tennis-1", hobbyId: "tennis", title: "Beginner rally hour", dayOffset: 0, time: "7:00 PM", place: "Branch Brook Park tennis courts", level: "Beginner friendly", spots: 12, going: 7, host: "Luis F." },
    { id: "ev-knitting-1", hobbyId: "sewing", title: "Drop-in sewing circle", dayOffset: 0, time: "6:00 PM", place: "Newark Public Library, Main Branch", level: "Beginner friendly", spots: 15, going: 8, host: "Doris M." },
    { id: "ev-soccer-1", hobbyId: "soccer", title: "Evening 7v7 pickup", dayOffset: 1, time: "6:30 PM", place: "Riverbank Park turf field, Ironbound", level: "All levels", spots: 22, going: 16, host: "Diego A." },
    { id: "ev-drawing-1", hobbyId: "painting", title: "Paint the sculpture garden", dayOffset: 2, time: "11:00 AM", place: "Newark Museum of Art, sculpture garden", level: "Beginner friendly", spots: 20, going: 11, host: "Jordan K." },
    { id: "ev-photography-1", hobbyId: "photography", title: "Golden hour phone photo walk", dayOffset: 2, time: "5:30 PM", place: "Riverfront Park boardwalk", level: "Beginner friendly", spots: 18, going: 10, host: "Nina G." },
    { id: "ev-cooking-1", hobbyId: "piano", title: "Beginner keyboard workshop", dayOffset: 3, time: "12:00 PM", place: "Newark Public Library, Main Branch community room", level: "Beginner friendly", spots: 24, going: 19, host: "Gabriel S." },
    { id: "ev-hiking-1", hobbyId: "running", title: "Slow-paced trail run and walk", dayOffset: 4, time: "9:00 AM", place: "South Mountain Reservation, Locust Grove trailhead", level: "Beginner friendly", spots: 20, going: 13, host: "Yara M." },
    { id: "ev-gardening-1", hobbyId: "journaling", title: "Nature journaling morning", dayOffset: 4, time: "10:00 AM", place: "Branch Brook Park, Cherry Blossom Welcome Center", level: "All levels", spots: 25, going: 14, host: "Grace E." },
    { id: "ev-bouldering-1", hobbyId: "basketball", title: "Beginner conditioning night", dayOffset: 5, time: "7:00 PM", place: "Indoor climbing gym, downtown Newark", level: "Beginner friendly", spots: 14, going: 9, host: "Ben S." },
    { id: "ev-guitar-1", hobbyId: "guitar", title: "Beginner chord circle", dayOffset: 6, time: "6:30 PM", place: "Newark Public Library, Main Branch", level: "Beginner friendly", spots: 12, going: 6, host: "Ray D." },
    { id: "ev-running-2", hobbyId: "running", title: "Saturday river run, 3 or 5 miles", dayOffset: 7, time: "8:00 AM", place: "Riverfront Park, main entrance", level: "Intermediate", spots: 40, going: 22, host: "Sofia M." },
    { id: "ev-soccer-2", hobbyId: "soccer", title: "Weekend small-sided games", dayOffset: 8, time: "10:00 AM", place: "Weequahic Park athletic fields", level: "Intermediate", spots: 24, going: 15, host: "Pedro L." },
    { id: "ev-chess-2", hobbyId: "journaling", title: "Guided reflection night", dayOffset: 9, time: "6:00 PM", place: "Newark Public Library, Main Branch", level: "Experienced", spots: 20, going: 12, host: "Jamal R." },
    { id: "ev-hiking-2", hobbyId: "running", title: "Eagle Rock sunset trail run", dayOffset: 10, time: "4:30 PM", place: "Eagle Rock Reservation, main lot", level: "Intermediate", spots: 16, going: 8, host: "Chris O." },
    { id: "ev-tennis-2", hobbyId: "tennis", title: "Doubles round robin", dayOffset: 11, time: "9:00 AM", place: "Weequahic Park tennis courts", level: "Experienced", spots: 16, going: 11, host: "Hannah C." },
    { id: "ev-photography-2", hobbyId: "photography", title: "Ironbound street photo walk", dayOffset: 13, time: "10:00 AM", place: "Ironbound, Ferry Street at Penn Station", level: "All levels", spots: 15, going: 7, host: "Tomas E." }
  ];

  var quiz = [{
    id: "place", prompt: "Where would you like to do your hobby?",
    options: [
      { value: "indoor", label: "Indoors", hint: "At home or inside" },
      { value: "outdoor", label: "Outdoors", hint: "Fresh air and open space" },
      { value: "either", label: "A mix of both", hint: "Indoor or outdoor works" }
    ]
  }];

  globalThis.SQ_DATA = { hobbies: hobbies, achievements: achievements, groups: groups, events: events, quiz: quiz };
})();
