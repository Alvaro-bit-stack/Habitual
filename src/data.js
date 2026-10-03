(function () {
  "use strict";

  var hobbies = [
    {
      id: "drawing",
      name: "Drawing",
      category: "creative",
      vibes: ["creative", "relaxing"],
      place: "either",
      social: "solo",
      minBudget: 0,
      time: "low",
      blurb: "Pencil, paper, and ten quiet minutes. You learn to see the world, not just look at it.",
      related: ["photography", "knitting", "cooking"],
      tinyWins: [
        { label: "Sketch your mug for 2 minutes", minutes: 2 },
        { label: "Draw 10 boxes in perspective", minutes: 5 },
        { label: "Draw your hand three different ways", minutes: 10 },
        { label: "Sketch the view from one window", minutes: 20 },
        { label: "Fill a full page with a still life", minutes: 30 }
      ],
      milestones: [
        { id: "lines", label: "Draw a page of confident straight lines and ellipses" },
        { id: "shapes", label: "Break a real object into simple shapes" },
        { id: "shading", label: "Shade a sphere with light, midtone, and shadow" },
        { id: "perspective", label: "Draw a street or room in two-point perspective" },
        { id: "sketchbook", label: "Fill a 30-page sketchbook" }
      ],
      starterPack: {
        whyLike: "It is the cheapest creative habit there is, and progress shows up on the page within weeks. Ten minutes is a real session.",
        firstMonth: "Draw everyday objects for 10 minutes a day: mugs, shoes, your hand. By week four, redraw your first sketch and compare.",
        tiers: {
          free: {
            items: [
              { name: "Any pencil and printer paper", price: [0, 0], reason: "Fundamentals do not care what you draw with." },
              { name: "Library drawing books", price: [0, 0], reason: "Beginner drawing guides are on most library shelves." },
              { name: "Free video drawing lessons", price: [0, 0], reason: "Structured beginner courses cost nothing online." }
            ]
          },
          budget: {
            items: [
              { name: "Graphite pencil set (2H to 6B)", price: [8, 15], reason: "Range of hardness for line and shading." },
              { name: "A5 sketchbook, 100 gsm", price: [8, 15], reason: "Small enough to carry everywhere." },
              { name: "Kneaded eraser", price: [2, 5], reason: "Lifts graphite without wrecking paper." },
              { name: "Handheld pencil sharpener", price: [2, 6], reason: "Sharp points mean cleaner lines." }
            ]
          },
          stepup: {
            items: [
              { name: "Charcoal and blending stump kit", price: [12, 25], reason: "Fast, expressive value studies." },
              { name: "A4 mixed-media sketchbook", price: [15, 30], reason: "Takes pencil, ink, and light wash." },
              { name: "Fineliner pen set, 4 widths", price: [12, 25], reason: "Commit to lines and draw faster." },
              { name: "Tabletop drawing easel", price: [25, 50], reason: "Better posture and proportions." }
            ]
          }
        },
        tryFirst: [
          "Draw on printer paper for two weeks before buying a sketchbook.",
          "Check the library for free adult drawing workshops.",
          "Join a free museum sketching day before buying supplies."
        ],
        firstSessions: [
          { title: "Lines and circles", detail: "Fill a page with straight lines, circles, and ellipses drawn from the shoulder.", tinyVersion: "Draw 10 circles in 2 minutes." },
          { title: "Draw your mug", detail: "Sketch your mug from three angles, looking more at the mug than the paper.", tinyVersion: "One quick mug sketch." },
          { title: "Light and shadow", detail: "Set an object under a lamp and shade its light side, shadow side, and cast shadow.", tinyVersion: "Shade one sphere." }
        ]
      }
    },
    {
      id: "running",
      name: "Running",
      category: "active",
      vibes: ["active", "relaxing", "social"],
      place: "outdoor",
      social: "either",
      minBudget: 0,
      time: "mid",
      blurb: "Shoes on, door open. The simplest way to clear your head and feel stronger every week.",
      related: ["hiking", "soccer", "tennis"],
      tinyWins: [
        { label: "Put on your shoes and walk 5 minutes", minutes: 5 },
        { label: "Walk 8 minutes, jog 2 minutes", minutes: 10 },
        { label: "Alternate 1 minute jog, 1 minute walk", minutes: 15 },
        { label: "Jog 5 minutes, walk 2, repeat three times", minutes: 21 },
        { label: "Run an easy 30 minutes at talking pace", minutes: 30 }
      ],
      milestones: [
        { id: "jog5", label: "Jog 5 minutes without stopping" },
        { id: "week3", label: "Run three times in one week" },
        { id: "mile", label: "Run one mile without walking" },
        { id: "jog20", label: "Jog 20 minutes at a talking pace" },
        { id: "5k", label: "Finish a 5K, any pace" }
      ],
      starterPack: {
        whyLike: "You can start today with nothing but shoes, and the first month brings fast, measurable gains. It is also excellent for stress.",
        firstMonth: "Three walk-run sessions a week, about 20 minutes each. Add one minute of jogging per interval each week.",
        tiers: {
          free: {
            items: [
              { name: "Sneakers you already own", price: [0, 0], reason: "Fine for walk-run intervals at first." },
              { name: "Phone interval timer", price: [0, 0], reason: "Free couch-to-5K style apps time your intervals." },
              { name: "Park loops and free group runs", price: [0, 0], reason: "Park paths and run clubs cost nothing." }
            ]
          },
          budget: {
            items: [
              { name: "Neutral road running shoes (prior season)", price: [50, 90], reason: "Last year's models cushion the same for less." },
              { name: "Moisture-wicking running socks, 3 pack", price: [12, 20], reason: "Prevents blisters better than cotton." },
              { name: "Reflective safety vest", price: [10, 18], reason: "Be seen on early or late runs." }
            ]
          },
          stepup: {
            items: [
              { name: "Fitted running shoes from a run shop", price: [120, 160], reason: "Gait check helps avoid aches." },
              { name: "Basic GPS running watch", price: [150, 250], reason: "Pace and distance without your phone." },
              { name: "Running belt or vest", price: [20, 40], reason: "Carry keys, phone, and water." }
            ]
          }
        },
        tryFirst: [
          "Join a free weekly group run before buying anything.",
          "Ask a run store for a free gait check, then buy last season's model.",
          "Run in your current sneakers for two weeks before upgrading."
        ],
        firstSessions: [
          { title: "Walk-run intro", detail: "Walk 5 minutes, then alternate 1 minute jogging with 2 minutes walking, six times.", tinyVersion: "Walk 5 minutes in your running shoes." },
          { title: "Find your easy pace", detail: "Jog slowly enough to speak full sentences. Walk whenever you cannot.", tinyVersion: "Jog 2 minutes at talking pace." },
          { title: "Park loop", detail: "Map a loop of about one mile in a nearby park and walk-run it twice.", tinyVersion: "Walk the loop once." }
        ]
      }
    },
    {
      id: "tennis",
      name: "Tennis",
      category: "active",
      vibes: ["active", "social"],
      place: "outdoor",
      social: "group",
      minBudget: 50,
      time: "mid",
      blurb: "Public courts, one partner, and a ball that keeps coming back. Fast exercise that feels like play.",
      related: ["running", "soccer", "bouldering"],
      tinyWins: [
        { label: "Shadow swing 20 forehands at home", minutes: 3 },
        { label: "Bounce a ball on your racket 50 times", minutes: 5 },
        { label: "Hit 30 balls against a practice wall", minutes: 10 },
        { label: "Rally mini-tennis in the service boxes", minutes: 20 },
        { label: "Play a full practice set", minutes: 45 }
      ],
      milestones: [
        { id: "rally10", label: "Rally 10 shots in a row with a partner" },
        { id: "serve", label: "Land 5 serves in a row" },
        { id: "backhand", label: "Hit a consistent backhand crosscourt" },
        { id: "volley", label: "Win a point at the net with a volley" },
        { id: "set", label: "Play and score a full set" }
      ],
      starterPack: {
        whyLike: "Every rally is a tiny game, so the workout sneaks up on you. Public courts make it cheap to play often.",
        firstMonth: "Two sessions a week: one against a wall, one with a partner on mini-tennis. Aim for a 10-ball rally by week four.",
        tiers: {
          free: {
            items: [
              { name: "Borrowed racket", price: [0, 0], reason: "Most people know someone with one in a closet." },
              { name: "Public park courts", price: [0, 0], reason: "City courts are free, first come first served." },
              { name: "Practice wall", price: [0, 0], reason: "Many parks have one, and it never misses." }
            ]
          },
          budget: {
            items: [
              { name: "Starter aluminum racket, 27 in", price: [25, 45], reason: "Light and forgiving for beginners." },
              { name: "Can of 3 pressurized tennis balls", price: [4, 7], reason: "Fresh balls bounce predictably." },
              { name: "Overgrip, 3 pack", price: [6, 10], reason: "Better grip on a cheap racket." }
            ]
          },
          stepup: {
            items: [
              { name: "Graphite intermediate racket, strung", price: [90, 160], reason: "More control as strokes improve." },
              { name: "Hard-court tennis shoes", price: [60, 110], reason: "Lateral support running shoes lack." },
              { name: "Group beginner clinic, 4 weeks", price: [80, 160], reason: "Fixes your grip before habits set in." }
            ]
          }
        },
        tryFirst: [
          "Borrow a racket for your first few sessions.",
          "Look for free intro clinics run by city parks programs.",
          "Buy a used racket and have it restrung for about $25."
        ],
        firstSessions: [
          { title: "Wall rally", detail: "Stand 15 feet from a practice wall and hit easy forehands, catching the ball when it gets away.", tinyVersion: "Hit 10 balls off the wall." },
          { title: "Mini-tennis", detail: "With a partner, rally softly inside the service boxes. Count your longest rally.", tinyVersion: "Rally for 5 minutes." },
          { title: "Serve basics", detail: "Practice a slow toss and swing from the baseline, aiming only to land it in.", tinyVersion: "Practice 10 tosses." }
        ]
      }
    },
    {
      id: "guitar",
      name: "Guitar",
      category: "technical",
      vibes: ["technical", "creative"],
      place: "indoor",
      social: "solo",
      minBudget: 150,
      time: "mid",
      blurb: "Four chords unlock hundreds of songs. Short daily practice turns into music you can actually play.",
      related: ["drawing", "chess", "photography"],
      tinyWins: [
        { label: "Tune all six strings", minutes: 2 },
        { label: "Play the G chord cleanly 10 times", minutes: 5 },
        { label: "Switch between G and C for 10 minutes", minutes: 10 },
        { label: "Strum a 4-chord loop with a metronome", minutes: 15 },
        { label: "Play through one full song slowly", minutes: 25 }
      ],
      milestones: [
        { id: "tune", label: "Tune the guitar by ear or tuner without help" },
        { id: "chords4", label: "Play G, C, D, and E minor cleanly" },
        { id: "switch", label: "Switch chords in time at 60 BPM" },
        { id: "strum", label: "Hold a down-down-up-up-down-up strum pattern" },
        { id: "song", label: "Play a full song start to finish" }
      ],
      starterPack: {
        whyLike: "Progress is easy to hear, and a handful of chords gets you playing real songs fast. It is a perfect 15-minute habit.",
        firstMonth: "Fifteen minutes a day: learn G, C, D, and E minor, then practice switching. By week four, strum a full song slowly.",
        tiers: {
          free: {
            items: [
              { name: "Borrowed acoustic guitar", price: [0, 0], reason: "Friends and family often have one gathering dust." },
              { name: "Free tuner app", price: [0, 0], reason: "Your phone mic tunes accurately." },
              { name: "Free beginner video lessons", price: [0, 0], reason: "Well-structured courses exist at no cost." }
            ]
          },
          budget: {
            items: [
              { name: "Used full-size acoustic guitar", price: [80, 150], reason: "Used guitars hold value and play well." },
              { name: "Clip-on tuner", price: [8, 15], reason: "Faster than an app in a noisy room." },
              { name: "Medium picks, 12 pack", price: [4, 8], reason: "You will lose them; buy a dozen." },
              { name: "Basic setup at a music shop", price: [40, 60], reason: "Lower strings make chords far easier." }
            ]
          },
          stepup: {
            items: [
              { name: "New solid-top acoustic guitar", price: [250, 450], reason: "Richer sound that rewards practice." },
              { name: "Padded gig bag", price: [30, 60], reason: "Protects it on the way to lessons." },
              { name: "Four private lessons", price: [140, 240], reason: "A teacher spots bad habits early." }
            ]
          }
        },
        tryFirst: [
          "Borrow or rent a guitar for a month before buying.",
          "Check the library for instrument lending or free music classes.",
          "Buy used and spend the savings on a professional setup."
        ],
        firstSessions: [
          { title: "Tune and hold", detail: "Tune with an app, learn how to hold the guitar and pick, and pluck each string cleanly.", tinyVersion: "Tune all six strings." },
          { title: "Your first chord", detail: "Learn E minor, then G. Press just behind the fret and check each string rings.", tinyVersion: "Play E minor five times." },
          { title: "First change", detail: "Switch between G and E minor slowly with four strums each.", tinyVersion: "Five slow switches." }
        ]
      }
    },
    {
      id: "photography",
      name: "Photography",
      category: "technical",
      vibes: ["technical", "creative"],
      place: "either",
      social: "solo",
      minBudget: 0,
      time: "low",
      blurb: "Your phone is already a camera. Learn light and framing and your walks start looking different.",
      related: ["drawing", "hiking", "gardening"],
      tinyWins: [
        { label: "Take 5 photos of one object from 5 angles", minutes: 3 },
        { label: "Shoot 10 photos using the rule of thirds", minutes: 5 },
        { label: "Photograph the same spot in window light", minutes: 10 },
        { label: "Take a 15-minute photo walk on your block", minutes: 15 },
        { label: "Shoot and edit a 5-photo set", minutes: 30 }
      ],
      milestones: [
        { id: "thirds", label: "Compose 10 shots using the rule of thirds" },
        { id: "light", label: "Shoot one subject in morning, noon, and evening light" },
        { id: "manual", label: "Take a photo with manual focus and exposure" },
        { id: "edit", label: "Edit a photo for exposure, color, and crop" },
        { id: "series", label: "Share a 10-photo series on one theme" }
      ],
      starterPack: {
        whyLike: "You can practice anywhere, in tiny moments, with a camera you already own. Every walk becomes a hunt for light.",
        firstMonth: "Shoot daily with your phone, one theme per week: light, lines, people, color. Edit and keep your best five each week.",
        tiers: {
          free: {
            items: [
              { name: "Your phone camera", price: [0, 0], reason: "Modern phones are excellent learning cameras." },
              { name: "Free photo editing app", price: [0, 0], reason: "Pro-level editing tools are free." },
              { name: "Library photography books", price: [0, 0], reason: "Composition basics have not changed in decades." }
            ]
          },
          budget: {
            items: [
              { name: "Small phone tripod", price: [15, 30], reason: "Sharp low-light shots and self portraits." },
              { name: "Clip-on phone lens kit", price: [15, 30], reason: "Try wide and macro without a new camera." },
              { name: "Lens cleaning cloth set", price: [5, 10], reason: "Most blurry phone photos are smudges." }
            ]
          },
          stepup: {
            items: [
              { name: "Used mirrorless camera with kit lens", price: [300, 550], reason: "Real manual controls and better low light." },
              { name: "Used 50mm prime lens", price: [80, 150], reason: "Blurry backgrounds and sharp portraits." },
              { name: "64 GB SD card", price: [12, 20], reason: "Room for a full day of shooting." }
            ]
          }
        },
        tryFirst: [
          "Use only your phone for a month before buying a camera.",
          "Rent a camera for a weekend to see what you would use.",
          "Buy used camera bodies; they lose value fast but work for years."
        ],
        firstSessions: [
          { title: "One object, ten angles", detail: "Pick a simple object and photograph it from ten positions. Pick your favorite and note why.", tinyVersion: "Three angles, one object." },
          { title: "Chase the light", detail: "Photograph the same window or street at three times of day and compare.", tinyVersion: "One photo in window light." },
          { title: "Block walk", detail: "Walk your block slowly and shoot only lines and shapes: fences, shadows, signs.", tinyVersion: "Five photos on your street." }
        ]
      }
    },
    {
      id: "cooking",
      name: "Cooking",
      category: "creative",
      vibes: ["creative", "relaxing", "social"],
      place: "indoor",
      social: "either",
      minBudget: 0,
      time: "mid",
      blurb: "A skill you use three times a day. Learn a few techniques and every meal becomes practice.",
      related: ["gardening", "drawing", "knitting"],
      tinyWins: [
        { label: "Dice one onion slowly and evenly", minutes: 5 },
        { label: "Make a perfect fried or scrambled egg", minutes: 8 },
        { label: "Make a vinaigrette from scratch", minutes: 10 },
        { label: "Cook a pot of rice or pasta to the right texture", minutes: 20 },
        { label: "Cook a full recipe you have never made", minutes: 45 }
      ],
      milestones: [
        { id: "knife", label: "Dice an onion with the claw grip" },
        { id: "eggs", label: "Cook eggs three ways: scrambled, fried, boiled" },
        { id: "sauce", label: "Make a pan sauce from the fond" },
        { id: "season", label: "Season a dish to taste without a recipe" },
        { id: "meal", label: "Cook a three-part dinner for someone else" }
      ],
      starterPack: {
        whyLike: "It pays you back immediately: you eat the results. It is creative, sensory, and easy to share with people.",
        firstMonth: "Learn one technique a week: knife skills, eggs, roasting vegetables, a pan sauce. Cook three dinners a week using them.",
        tiers: {
          free: {
            items: [
              { name: "Your current pots and knife", price: [0, 0], reason: "One pan and one knife cover most basics." },
              { name: "Library cookbooks", price: [0, 0], reason: "Borrow beginner technique books for free." },
              { name: "Free online recipe and technique videos", price: [0, 0], reason: "Watch a skill before you try it." }
            ]
          },
          budget: {
            items: [
              { name: "8 in chef's knife", price: [20, 40], reason: "A sharp knife makes prep faster and safer." },
              { name: "Large plastic cutting board", price: [10, 20], reason: "Room to work, dishwasher safe." },
              { name: "Instant-read thermometer", price: [12, 25], reason: "No more guessing if meat is done." }
            ]
          },
          stepup: {
            items: [
              { name: "10 in cast iron skillet", price: [25, 45], reason: "Great sear and lasts forever." },
              { name: "Enameled Dutch oven, 5 qt", price: [60, 120], reason: "Soups, braises, and bread." },
              { name: "Whetstone, 1000/6000 grit", price: [25, 45], reason: "Keep your knife sharp yourself." },
              { name: "Community cooking class", price: [40, 90], reason: "Hands-on technique with feedback." }
            ]
          }
        },
        tryFirst: [
          "Cook with what you have for two weeks and note what you actually miss.",
          "Look for free cooking demos at libraries and farmers markets.",
          "Thrift stores sell solid pots and cast iron cheaply."
        ],
        firstSessions: [
          { title: "Knife basics", detail: "Practice the claw grip and dice two onions and a carrot. Go slow.", tinyVersion: "Dice half an onion." },
          { title: "Eggs three ways", detail: "Scramble, fry, and boil an egg. Note what heat level worked best.", tinyVersion: "Scramble one egg on low heat." },
          { title: "Roast a sheet pan", detail: "Roast chopped vegetables at 425F with oil and salt until browned at the edges.", tinyVersion: "Roast one vegetable." }
        ]
      }
    },
    {
      id: "hiking",
      name: "Hiking",
      category: "active",
      vibes: ["active", "relaxing"],
      place: "outdoor",
      social: "either",
      minBudget: 0,
      time: "high",
      blurb: "Trails, trees, and a few hours with no notifications. Reservations near Newark are closer than you think.",
      related: ["running", "photography", "gardening"],
      tinyWins: [
        { label: "Walk to the nearest park and back", minutes: 5 },
        { label: "Take a 10-minute walk with a small hill", minutes: 10 },
        { label: "Map a 2-mile trail you want to try", minutes: 10 },
        { label: "Walk a 30-minute park loop", minutes: 30 },
        { label: "Hike a marked trail for an hour", minutes: 60 }
      ],
      milestones: [
        { id: "trail", label: "Finish a marked trail of 2 miles or more" },
        { id: "map", label: "Navigate a trail using a trail map" },
        { id: "elevation", label: "Hike a route with 500 feet of climbing" },
        { id: "pack", label: "Pack the ten essentials for a day hike" },
        { id: "fivemile", label: "Complete a 5-mile hike" }
      ],
      starterPack: {
        whyLike: "It is exercise that does not feel like exercise, and it resets your head like nothing else. It is also easy to do with friends.",
        firstMonth: "One longer weekend hike and one weekday park walk each week. Build from 2 miles to 4 by week four.",
        tiers: {
          free: {
            items: [
              { name: "Comfortable sneakers you own", price: [0, 0], reason: "Fine for well-maintained local trails." },
              { name: "Free trail map app", price: [0, 0], reason: "Download maps offline before you go." },
              { name: "County reservations and parks", price: [0, 0], reason: "Essex County trails are free to use." }
            ]
          },
          budget: {
            items: [
              { name: "Daypack, 20 liters", price: [20, 40], reason: "Water, snack, and layers in one place." },
              { name: "Reusable water bottle, 1 liter", price: [8, 20], reason: "Hydration is the first essential." },
              { name: "Wool hiking socks", price: [12, 20], reason: "Keeps feet dry and blister free." }
            ]
          },
          stepup: {
            items: [
              { name: "Trail running shoes or light hikers", price: [90, 150], reason: "Grip on roots, rocks, and mud." },
              { name: "Packable rain jacket", price: [50, 100], reason: "Weather changes fast on the ridge." },
              { name: "Adjustable trekking poles", price: [30, 60], reason: "Easier on knees going downhill." }
            ]
          }
        },
        tryFirst: [
          "Start on short, well-marked county trails in sneakers.",
          "Join a free guided hike from a parks or hiking club.",
          "Rent or borrow a pack before buying one."
        ],
        firstSessions: [
          { title: "Local loop", detail: "Walk a 1 to 2 mile park loop at an easy pace. Notice how your feet and back feel.", tinyVersion: "Walk 10 minutes in the park." },
          { title: "First real trail", detail: "Pick a marked 2-mile trail. Bring water, a snack, and tell someone your plan.", tinyVersion: "Walk the first half mile and turn back." },
          { title: "Add a hill", detail: "Choose a route with a steady climb and take short breaks at the top.", tinyVersion: "Climb one hill and enjoy the view." }
        ]
      }
    },
    {
      id: "soccer",
      name: "Soccer",
      category: "social",
      vibes: ["social", "active"],
      place: "outdoor",
      social: "group",
      minBudget: 50,
      time: "mid",
      blurb: "Pickup games run all week in Newark parks. Show up, get picked, and leave with new friends.",
      related: ["running", "tennis", "chess"],
      tinyWins: [
        { label: "Juggle the ball 10 times, any surface", minutes: 3 },
        { label: "Pass against a wall 50 times", minutes: 5 },
        { label: "Dribble around 5 cones and back", minutes: 10 },
        { label: "Shoot 20 shots at a target", minutes: 15 },
        { label: "Play a full pickup game", minutes: 60 }
      ],
      milestones: [
        { id: "juggle", label: "Juggle the ball 10 times in a row" },
        { id: "pass", label: "Complete 10 passes in a row" },
        { id: "weakfoot", label: "Pass accurately with your weaker foot" },
        { id: "firsttouch", label: "Control a lofted ball with one touch" },
        { id: "fullgame", label: "Play a full 90-minute pickup session" }
      ],
      starterPack: {
        whyLike: "It is a team sport you can join without a team: pickup games welcome new faces. You will be social and active at once.",
        firstMonth: "One solo touch session and one pickup game a week. Focus on passing and moving to open space.",
        tiers: {
          free: {
            items: [
              { name: "Sneakers you already own", price: [0, 0], reason: "Fine for pickup on turf or grass." },
              { name: "Public fields and pickup games", price: [0, 0], reason: "Most pickup is free, just show up." },
              { name: "Borrowed ball", price: [0, 0], reason: "Someone always brings one." }
            ]
          },
          budget: {
            items: [
              { name: "Size 5 training ball", price: [15, 25], reason: "Practice touches at home." },
              { name: "Slip-in shin guards", price: [10, 18], reason: "Protects you in tackles." },
              { name: "Long soccer socks", price: [8, 14], reason: "Hold shin guards in place." }
            ]
          },
          stepup: {
            items: [
              { name: "Firm-ground cleats or turf shoes", price: [60, 110], reason: "Grip and quick turns on grass." },
              { name: "Rec league season registration", price: [80, 150], reason: "Regular games and a real team." },
              { name: "Agility cone set with ladder", price: [20, 35], reason: "Structured footwork drills." }
            ]
          }
        },
        tryFirst: [
          "Show up to a pickup game before buying cleats.",
          "Ask local rec leagues about free trial nights.",
          "Buy used cleats; kids and adults outgrow or upgrade often."
        ],
        firstSessions: [
          { title: "Wall passing", detail: "Pass the ball against a wall with the inside of each foot, controlling each return.", tinyVersion: "Pass 20 times." },
          { title: "Dribble and turn", detail: "Set up cones 5 yards apart and dribble through, turning with both feet.", tinyVersion: "Dribble one lap." },
          { title: "First pickup", detail: "Join a pickup game. Your one job: pass quickly and find open space.", tinyVersion: "Watch 15 minutes, then ask to join." }
        ]
      }
    },
    {
      id: "knitting",
      name: "Knitting",
      category: "relaxing",
      vibes: ["relaxing", "creative"],
      place: "indoor",
      social: "either",
      minBudget: 50,
      time: "low",
      blurb: "Rhythmic, portable, and calming. Your hands stay busy and you end up with something warm.",
      related: ["drawing", "cooking", "gardening"],
      tinyWins: [
        { label: "Cast on 10 stitches", minutes: 3 },
        { label: "Knit two rows", minutes: 5 },
        { label: "Knit 10 rows of garter stitch", minutes: 15 },
        { label: "Practice purl stitch for one row", minutes: 20 },
        { label: "Knit 30 minutes on a project", minutes: 30 }
      ],
      milestones: [
        { id: "caston", label: "Cast on 20 stitches evenly" },
        { id: "garter", label: "Knit a garter stitch swatch" },
        { id: "purl", label: "Knit a stockinette swatch with purl rows" },
        { id: "bindoff", label: "Bind off and weave in ends" },
        { id: "scarf", label: "Finish a scarf or cowl" }
      ],
      starterPack: {
        whyLike: "The repetition is soothing, and you can do it on the couch or the train. Knitting circles make it easy to meet people too.",
        firstMonth: "Learn to cast on, knit, and purl in week one, then knit a simple garter-stitch scarf in short sessions.",
        tiers: {
          free: {
            items: [
              { name: "Borrowed needles and yarn", price: [0, 0], reason: "Knitters usually have spare supplies to share." },
              { name: "Library knitting circle", price: [0, 0], reason: "Many branches host free drop-in groups." },
              { name: "Free beginner pattern sites", price: [0, 0], reason: "Thousands of beginner patterns cost nothing." }
            ]
          },
          budget: {
            items: [
              { name: "US size 8 bamboo needles", price: [5, 10], reason: "Grippy, so stitches do not slide off." },
              { name: "Worsted weight yarn, 2 skeins", price: [10, 20], reason: "Light color, smooth, easy to see stitches." },
              { name: "Tapestry needle and stitch markers", price: [5, 10], reason: "For weaving in ends and tracking rows." }
            ]
          },
          stepup: {
            items: [
              { name: "Interchangeable circular needle set", price: [40, 80], reason: "Every size for hats and sweaters." },
              { name: "Wool blend yarn for a sweater", price: [60, 120], reason: "Your first big wearable project." },
              { name: "Project bag with pockets", price: [15, 30], reason: "Keeps your work tidy on the go." }
            ]
          }
        },
        tryFirst: [
          "Visit a free knitting circle at the library to learn hands-on.",
          "Ask a yarn shop about beginner nights.",
          "Thrift stores often sell needles and yarn by the bag."
        ],
        firstSessions: [
          { title: "Cast on", detail: "Learn the long-tail cast on and cast on 20 stitches, then pull them off and repeat.", tinyVersion: "Cast on 10 stitches." },
          { title: "Knit stitch", detail: "Knit 10 rows. Count stitches each row to catch drops early.", tinyVersion: "Knit one row." },
          { title: "Purl and bind off", detail: "Purl a few rows, then bind off your swatch. That is a finished piece.", tinyVersion: "Purl 5 stitches." }
        ]
      }
    },
    {
      id: "bouldering",
      name: "Bouldering",
      category: "active",
      vibes: ["active", "technical", "social"],
      place: "indoor",
      social: "either",
      minBudget: 150,
      time: "mid",
      blurb: "Short climbs, no ropes, big puzzles. Every route is a problem to solve with your whole body.",
      related: ["hiking", "tennis", "chess"],
      tinyWins: [
        { label: "Hang from a bar for 20 seconds", minutes: 2 },
        { label: "Do 5 minutes of wrist and finger warm-ups", minutes: 5 },
        { label: "Climb three of the easiest routes", minutes: 15 },
        { label: "Work one hard problem for 20 minutes", minutes: 20 },
        { label: "Climb a full 45-minute session", minutes: 45 }
      ],
      milestones: [
        { id: "v0", label: "Send three V0 problems" },
        { id: "fall", label: "Fall and land safely on purpose" },
        { id: "feet", label: "Climb a route with quiet, precise feet" },
        { id: "v2", label: "Send a V2" },
        { id: "project", label: "Finish a problem after multiple sessions" }
      ],
      starterPack: {
        whyLike: "Each route is a puzzle, so your brain works as hard as your arms. The gym crowd is famously welcoming to beginners.",
        firstMonth: "Two gym sessions a week. Climb all the easiest routes with silent feet, then pick one harder problem to project.",
        tiers: {
          free: {
            items: [
              { name: "Free first-visit or guest pass", price: [0, 0], reason: "Many gyms offer a free first climb or friend pass." },
              { name: "Playground or park pull-up bar", price: [0, 0], reason: "Build grip strength between visits." },
              { name: "Free technique videos", price: [0, 0], reason: "Learn footwork before your first session." }
            ]
          },
          budget: {
            items: [
              { name: "Day passes, 3 visits", price: [60, 90], reason: "Enough to know if you love it." },
              { name: "Shoe rentals, 3 visits", price: [15, 24], reason: "Skip buying shoes at first." },
              { name: "Chalk bag with loose chalk", price: [15, 25], reason: "Dry hands hold on better." }
            ]
          },
          stepup: {
            items: [
              { name: "Monthly gym membership", price: [70, 100], reason: "Climb as often as you like." },
              { name: "Neutral beginner climbing shoes", price: [80, 110], reason: "Comfortable fit, precise footwork." },
              { name: "Intro to bouldering class", price: [30, 60], reason: "Learn falling and technique safely." }
            ]
          }
        },
        tryFirst: [
          "Rent shoes for your first month before buying.",
          "Ask about free intro sessions or new-climber nights.",
          "Buy a 10-punch pass instead of a membership at first."
        ],
        firstSessions: [
          { title: "Safety and falling", detail: "Learn how to fall: bent knees, roll back, arms in. Practice from low holds.", tinyVersion: "Practice three low falls." },
          { title: "Easy circuit", detail: "Climb every V0 on one wall, focusing on placing each foot silently.", tinyVersion: "Climb two easy routes." },
          { title: "First project", detail: "Pick one route slightly too hard. Try it five times, resting between tries.", tinyVersion: "Try one hard route twice." }
        ]
      }
    },
    {
      id: "chess",
      name: "Chess",
      category: "social",
      vibes: ["social", "technical"],
      place: "either",
      social: "either",
      minBudget: 0,
      time: "low",
      blurb: "One board, endless puzzles. Play online in five minutes or across a park table with strangers.",
      related: ["guitar", "photography", "soccer"],
      tinyWins: [
        { label: "Solve one chess puzzle", minutes: 3 },
        { label: "Solve five tactics puzzles", minutes: 10 },
        { label: "Play one 10-minute game", minutes: 15 },
        { label: "Review your last game for mistakes", minutes: 20 },
        { label: "Play two games and study one opening", minutes: 45 }
      ],
      milestones: [
        { id: "rules", label: "Know castling, en passant, and promotion cold" },
        { id: "mate", label: "Checkmate with king and rook against king" },
        { id: "fork", label: "Win material with a fork in a real game" },
        { id: "opening", label: "Play one opening for white and black confidently" },
        { id: "otb", label: "Play a game against a stranger over the board" }
      ],
      starterPack: {
        whyLike: "Every game is a fresh puzzle, and it is easy to play in short bursts. Park tables and clubs make it surprisingly social.",
        firstMonth: "Five puzzles a day and three games a week. Review each loss to find the one move that turned it.",
        tiers: {
          free: {
            items: [
              { name: "Free online chess site or app", price: [0, 0], reason: "Puzzles, lessons, and opponents at any hour." },
              { name: "Park chess tables", price: [0, 0], reason: "Bring a board or join a game in progress." },
              { name: "Library chess books and clubs", price: [0, 0], reason: "Classic beginner books are always on loan." }
            ]
          },
          budget: {
            items: [
              { name: "Roll-up vinyl board with plastic pieces", price: [15, 25], reason: "Tournament size and fits a backpack." },
              { name: "Beginner tactics workbook", price: [12, 20], reason: "Hundreds of puzzles, no screen." },
              { name: "Basic digital chess clock", price: [20, 30], reason: "Play real timed games in person." }
            ]
          },
          stepup: {
            items: [
              { name: "Weighted wooden chess set", price: [60, 120], reason: "A satisfying board for home." },
              { name: "Club membership, one year", price: [40, 80], reason: "Weekly games and stronger players." },
              { name: "Online coaching, 4 sessions", price: [100, 200], reason: "Targeted feedback on your games." }
            ]
          }
        },
        tryFirst: [
          "Play free online for a month before buying anything.",
          "Visit a library chess club night, boards provided.",
          "Watch park games for a bit, then ask who has next."
        ],
        firstSessions: [
          { title: "Rules refresh", detail: "Review how each piece moves, plus castling, en passant, and promotion.", tinyVersion: "Set up the board correctly." },
          { title: "Puzzle sprint", detail: "Solve 10 mate-in-one and mate-in-two puzzles. Say your move out loud before playing it.", tinyVersion: "Solve one puzzle." },
          { title: "First real game", detail: "Play a 15-minute game, then find the biggest mistake for each side.", tinyVersion: "Play a 5-minute game." }
        ]
      }
    },
    {
      id: "gardening",
      name: "Gardening",
      category: "relaxing",
      vibes: ["relaxing", "active", "creative"],
      place: "outdoor",
      social: "solo",
      minBudget: 50,
      time: "mid",
      blurb: "Dirt under your nails and something growing on the sill. Slow, steady, and quietly rewarding.",
      related: ["cooking", "hiking", "photography"],
      tinyWins: [
        { label: "Water and check one plant", minutes: 2 },
        { label: "Plant one herb seed in a cup", minutes: 5 },
        { label: "Pull weeds in one small patch", minutes: 10 },
        { label: "Repot a plant into a bigger container", minutes: 20 },
        { label: "Plan and plant a small container bed", minutes: 45 }
      ],
      milestones: [
        { id: "sprout", label: "Grow a seed to a true-leaf sprout" },
        { id: "repot", label: "Repot a plant without shock" },
        { id: "herb", label: "Harvest herbs you grew" },
        { id: "compost", label: "Start a compost bin or bucket" },
        { id: "veg", label: "Harvest a vegetable you grew from seed" }
      ],
      starterPack: {
        whyLike: "It is calm, hands-on, and rewards patience. A few containers on a windowsill or fire escape is enough to start.",
        firstMonth: "Start three easy herbs from seed indoors, water on a schedule, and transplant the strongest seedlings.",
        tiers: {
          free: {
            items: [
              { name: "Library seed library", price: [0, 0], reason: "Many libraries lend free seeds each season." },
              { name: "Reused containers with drain holes", price: [0, 0], reason: "Yogurt cups and cans grow herbs fine." },
              { name: "Community garden volunteer days", price: [0, 0], reason: "Learn from experienced growers for free." }
            ]
          },
          budget: {
            items: [
              { name: "Bag of potting mix, 16 qt", price: [8, 15], reason: "Garden soil compacts in pots; mix drains." },
              { name: "Herb seed packets, 4 kinds", price: [8, 14], reason: "Basil, parsley, cilantro, and chives." },
              { name: "Three 8 in pots with saucers", price: [12, 25], reason: "Room for roots, no mess." },
              { name: "Hand trowel and gloves", price: [10, 18], reason: "The two tools you use every time." }
            ]
          },
          stepup: {
            items: [
              { name: "Raised bed or large grow bags", price: [40, 90], reason: "Real space for vegetables." },
              { name: "LED grow light", price: [30, 60], reason: "Start seeds strong indoors in winter." },
              { name: "Community garden plot, one season", price: [25, 75], reason: "Sunny ground and gardening neighbors." }
            ]
          }
        },
        tryFirst: [
          "Grow herbs from kitchen scraps or grocery store seeds first.",
          "Volunteer at a community garden before renting a plot.",
          "Ask the library about its free seed library."
        ],
        firstSessions: [
          { title: "Pick your spot", detail: "Find your sunniest window or outdoor spot and note how many hours of sun it gets.", tinyVersion: "Check the light at noon." },
          { title: "Sow seeds", detail: "Fill three pots with moist mix and sow basil, parsley, and chives. Label them.", tinyVersion: "Plant one seed." },
          { title: "Water and watch", detail: "Set a watering check every other day. Thin seedlings once they show true leaves.", tinyVersion: "Water and look for sprouts." }
        ]
      }
    }
  ];

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

  var groups = [
    {
      hobbyId: "drawing", name: "Drawing · Newark area", members: 214,
      posts: [
        { author: "Priya S.", text: "Did the mug sketch three times today. The third one finally looked like it could hold coffee.", daysAgo: 0, sessionLabel: "Tiny win · 5 min" },
        { author: "Marcus T.", text: "Sketched people at Military Park on my lunch break. Quick gesture drawings are humbling and fun.", daysAgo: 1, sessionLabel: "Regular session · 30 min" },
        { author: "Elena V.", text: "Back after a month off. Started with lines and circles again and it felt good.", daysAgo: 3, sessionLabel: "Comeback · 15 min" },
        { author: "Jordan K.", text: "Anyone want to do the museum sketch day together this weekend?", daysAgo: 4, sessionLabel: "Regular session · 45 min" }
      ]
    },
    {
      hobbyId: "running", name: "Running · Newark area", members: 486,
      posts: [
        { author: "Andre W.", text: "First full mile without walking around Branch Brook. Legs are jelly, very happy.", daysAgo: 0, sessionLabel: "Regular session · 25 min" },
        { author: "Sofia M.", text: "Easy recovery jog along Riverfront Park. Talking pace the whole way.", daysAgo: 1, sessionLabel: "Regular session · 35 min" },
        { author: "Dev P.", text: "Only had time to walk 5 minutes in my running shoes. Still counts.", daysAgo: 2, sessionLabel: "Tiny win · 5 min" },
        { author: "Tasha L.", text: "Long run done before the heat. See everyone at Saturday's group run.", daysAgo: 5, sessionLabel: "Big session · 70 min" }
      ]
    },
    {
      hobbyId: "tennis", name: "Tennis · Newark area", members: 178,
      posts: [
        { author: "Luis F.", text: "Got a 14-ball rally at Branch Brook courts tonight. New personal best.", daysAgo: 0, sessionLabel: "Regular session · 60 min" },
        { author: "Hannah C.", text: "Wall practice only today, working on a slower toss for my serve.", daysAgo: 2, sessionLabel: "Regular session · 30 min" },
        { author: "Kwame A.", text: "Looking for a beginner partner for weekday mornings. Happy to bring balls.", daysAgo: 3, sessionLabel: "Tiny win · 10 min" }
      ]
    },
    {
      hobbyId: "guitar", name: "Guitar · Newark area", members: 263,
      posts: [
        { author: "Ray D.", text: "G to C without looking at my hand. Took three weeks but it finally clicked.", daysAgo: 0, sessionLabel: "Regular session · 20 min" },
        { author: "Mia J.", text: "Tuned up and played E minor five times before work. Small streak going.", daysAgo: 1, sessionLabel: "Tiny win · 3 min" },
        { author: "Owen B.", text: "Got my used guitar set up at a shop and the action is so much lower. Huge difference.", daysAgo: 4, sessionLabel: "Regular session · 30 min" },
        { author: "Carmen R.", text: "Played my first full song for my kids. They asked for it twice.", daysAgo: 6, sessionLabel: "Big session · 50 min" }
      ]
    },
    {
      hobbyId: "photography", name: "Photography · Newark area", members: 301,
      posts: [
        { author: "Nina G.", text: "Golden hour on the Riverfront Park boardwalk. Phone only, no edits needed.", daysAgo: 0, sessionLabel: "Regular session · 40 min" },
        { author: "Tomas E.", text: "Shot one doorway in the Ironbound at three times of day. The evening one wins.", daysAgo: 2, sessionLabel: "Regular session · 30 min" },
        { author: "Aisha B.", text: "Five photos of my coffee cup from five angles. Rule of thirds is sneaky good.", daysAgo: 3, sessionLabel: "Tiny win · 3 min" }
      ]
    },
    {
      hobbyId: "cooking", name: "Cooking · Newark area", members: 392,
      posts: [
        { author: "Gabriel S.", text: "Made my first pan sauce from the fond. Did not burn it this time.", daysAgo: 0, sessionLabel: "Regular session · 40 min" },
        { author: "Leah W.", text: "Diced an onion slowly with the claw grip. Zero fingertip casualties.", daysAgo: 1, sessionLabel: "Tiny win · 5 min" },
        { author: "Ines P.", text: "Picked up peppers at the Ironbound market and roasted a whole tray.", daysAgo: 3, sessionLabel: "Regular session · 35 min" },
        { author: "Sam H.", text: "Cooked a three-part dinner for my roommates. They did the dishes, so it worked.", daysAgo: 5, sessionLabel: "Big session · 90 min" }
      ]
    },
    {
      hobbyId: "hiking", name: "Hiking · Newark area", members: 357,
      posts: [
        { author: "Rachel N.", text: "Lenape Trail section at South Mountain this morning. The leaves are turning.", daysAgo: 1, sessionLabel: "Big session · 2 hr" },
        { author: "Chris O.", text: "Quick loop at Eagle Rock after work. Clear view of the skyline.", daysAgo: 2, sessionLabel: "Regular session · 50 min" },
        { author: "Yara M.", text: "Planned a 2-mile trail for Saturday. Anyone want to join a slow-paced group?", daysAgo: 4, sessionLabel: "Tiny win · 10 min" }
      ]
    },
    {
      hobbyId: "soccer", name: "Soccer · Newark area", members: 522,
      posts: [
        { author: "Diego A.", text: "Great pickup run at Riverbank Park tonight. Plenty of new faces, all welcome.", daysAgo: 0, sessionLabel: "Big session · 90 min" },
        { author: "Ama K.", text: "Wall passes with my left foot. Ugly but getting better.", daysAgo: 1, sessionLabel: "Tiny win · 5 min" },
        { author: "Pedro L.", text: "Ten passes in a row in our small-sided game. Moving to open space really works.", daysAgo: 3, sessionLabel: "Regular session · 60 min" },
        { author: "Jess T.", text: "Juggled 12 in a row. My old record was 4.", daysAgo: 6, sessionLabel: "Tiny win · 3 min" }
      ]
    },
    {
      hobbyId: "knitting", name: "Knitting · Newark area", members: 146,
      posts: [
        { author: "Doris M.", text: "Finished my first garter scarf. A little wavy at the start, perfect at the end.", daysAgo: 0, sessionLabel: "Big session · 60 min" },
        { author: "Kim L.", text: "Two rows on the train ride home. That is my whole goal today.", daysAgo: 1, sessionLabel: "Tiny win · 5 min" },
        { author: "Faith O.", text: "Learned to purl at the library circle. Everyone there was so patient.", daysAgo: 4, sessionLabel: "Regular session · 45 min" }
      ]
    },
    {
      hobbyId: "bouldering", name: "Bouldering · Newark area", members: 198,
      posts: [
        { author: "Ben S.", text: "Sent my first V2 after four sessions on it. The trick was trusting my left foot.", daysAgo: 0, sessionLabel: "Regular session · 60 min" },
        { author: "Zoe C.", text: "Hung from the pull-up bar at the park for 20 seconds. Grip is slowly coming.", daysAgo: 2, sessionLabel: "Tiny win · 2 min" },
        { author: "Malik J.", text: "Silent-feet circuit on all the V0s. Way harder than it sounds.", daysAgo: 3, sessionLabel: "Regular session · 45 min" },
        { author: "Rosa T.", text: "Back on the wall after three weeks off. Kept it easy and had a blast.", daysAgo: 5, sessionLabel: "Comeback · 30 min" }
      ]
    },
    {
      hobbyId: "chess", name: "Chess · Newark area", members: 274,
      posts: [
        { author: "Walter H.", text: "Played three games at the Military Park tables. Won one with a knight fork.", daysAgo: 0, sessionLabel: "Regular session · 45 min" },
        { author: "Ana C.", text: "Five puzzles before coffee. Missed the back-rank mate, again.", daysAgo: 1, sessionLabel: "Tiny win · 10 min" },
        { author: "Jamal R.", text: "Reviewed last week's loss. One rushed pawn push lost the whole game.", daysAgo: 3, sessionLabel: "Regular session · 25 min" }
      ]
    },
    {
      hobbyId: "gardening", name: "Gardening · Newark area", members: 233,
      posts: [
        { author: "Grace E.", text: "Pulled the last tomatoes and planted garlic for spring at the community garden.", daysAgo: 1, sessionLabel: "Big session · 75 min" },
        { author: "Victor N.", text: "Basil on my windowsill finally has true leaves. Tiny but mighty.", daysAgo: 2, sessionLabel: "Tiny win · 2 min" },
        { author: "Lena F.", text: "Repotted two pothos and started a compost bucket. Balcony is getting crowded.", daysAgo: 4, sessionLabel: "Regular session · 30 min" },
        { author: "Omar Z.", text: "Volunteer morning at Branch Brook was great. Learned how to divide perennials.", daysAgo: 6, sessionLabel: "Regular session · 60 min" }
      ]
    }
  ];

  var events = [
    { id: "ev-running-1", hobbyId: "running", title: "Easy 5K walk-run loop", dayOffset: 0, time: "6:30 PM", place: "Branch Brook Park, Lake Street entrance", level: "Beginner friendly", spots: 30, going: 18, host: "Tasha L." },
    { id: "ev-chess-1", hobbyId: "chess", title: "Park tables open play", dayOffset: 0, time: "5:00 PM", place: "Military Park chess tables", level: "All levels", spots: 16, going: 9, host: "Walter H." },
    { id: "ev-tennis-1", hobbyId: "tennis", title: "Beginner rally hour", dayOffset: 0, time: "7:00 PM", place: "Branch Brook Park tennis courts", level: "Beginner friendly", spots: 12, going: 7, host: "Luis F." },
    { id: "ev-knitting-1", hobbyId: "knitting", title: "Drop-in knitting circle", dayOffset: 0, time: "6:00 PM", place: "Newark Public Library, Main Branch", level: "Beginner friendly", spots: 15, going: 8, host: "Doris M." },
    { id: "ev-soccer-1", hobbyId: "soccer", title: "Evening 7v7 pickup", dayOffset: 1, time: "6:30 PM", place: "Riverbank Park turf field, Ironbound", level: "All levels", spots: 22, going: 16, host: "Diego A." },
    { id: "ev-drawing-1", hobbyId: "drawing", title: "Sketch the sculpture garden", dayOffset: 2, time: "11:00 AM", place: "Newark Museum of Art, sculpture garden", level: "Beginner friendly", spots: 20, going: 11, host: "Jordan K." },
    { id: "ev-photography-1", hobbyId: "photography", title: "Golden hour phone photo walk", dayOffset: 2, time: "5:30 PM", place: "Riverfront Park boardwalk", level: "Beginner friendly", spots: 18, going: 10, host: "Nina G." },
    { id: "ev-cooking-1", hobbyId: "cooking", title: "Knife skills demo and tasting", dayOffset: 3, time: "12:00 PM", place: "Newark Public Library, Main Branch community room", level: "Beginner friendly", spots: 24, going: 19, host: "Gabriel S." },
    { id: "ev-hiking-1", hobbyId: "hiking", title: "Slow-paced Lenape Trail hike", dayOffset: 4, time: "9:00 AM", place: "South Mountain Reservation, Locust Grove trailhead", level: "Beginner friendly", spots: 20, going: 13, host: "Yara M." },
    { id: "ev-gardening-1", hobbyId: "gardening", title: "Fall bulb planting volunteer morning", dayOffset: 4, time: "10:00 AM", place: "Branch Brook Park, Cherry Blossom Welcome Center", level: "All levels", spots: 25, going: 14, host: "Grace E." },
    { id: "ev-bouldering-1", hobbyId: "bouldering", title: "New climber night", dayOffset: 5, time: "7:00 PM", place: "Indoor climbing gym, downtown Newark", level: "Beginner friendly", spots: 14, going: 9, host: "Ben S." },
    { id: "ev-guitar-1", hobbyId: "guitar", title: "Beginner chord circle", dayOffset: 6, time: "6:30 PM", place: "Newark Public Library, Main Branch", level: "Beginner friendly", spots: 12, going: 6, host: "Ray D." },
    { id: "ev-running-2", hobbyId: "running", title: "Saturday river run, 3 or 5 miles", dayOffset: 7, time: "8:00 AM", place: "Riverfront Park, main entrance", level: "All levels", spots: 40, going: 22, host: "Sofia M." },
    { id: "ev-soccer-2", hobbyId: "soccer", title: "Weekend small-sided games", dayOffset: 8, time: "10:00 AM", place: "Weequahic Park athletic fields", level: "All levels", spots: 24, going: 15, host: "Pedro L." },
    { id: "ev-chess-2", hobbyId: "chess", title: "Rapid chess night, 15 minute games", dayOffset: 9, time: "6:00 PM", place: "Newark Public Library, Main Branch", level: "Experienced", spots: 20, going: 12, host: "Jamal R." },
    { id: "ev-hiking-2", hobbyId: "hiking", title: "Eagle Rock sunset loop", dayOffset: 10, time: "4:30 PM", place: "Eagle Rock Reservation, main lot", level: "All levels", spots: 16, going: 8, host: "Chris O." },
    { id: "ev-tennis-2", hobbyId: "tennis", title: "Doubles round robin", dayOffset: 11, time: "9:00 AM", place: "Weequahic Park tennis courts", level: "Experienced", spots: 16, going: 11, host: "Hannah C." },
    { id: "ev-photography-2", hobbyId: "photography", title: "Ironbound street photo walk", dayOffset: 13, time: "10:00 AM", place: "Ironbound, Ferry Street at Penn Station", level: "All levels", spots: 15, going: 7, host: "Tomas E." }
  ];

  var quiz = [
    {
      id: "vibe",
      prompt: "What sounds most fun?",
      options: [
        { value: "creative", label: "Making something", hint: "Drawing, cooking, crafts" },
        { value: "active", label: "Moving my body", hint: "Running, climbing, sports" },
        { value: "technical", label: "Learning a skill", hint: "Instruments, cameras, strategy" },
        { value: "social", label: "Meeting people", hint: "Teams, clubs, pickup games" },
        { value: "relaxing", label: "Slowing down", hint: "Calm, hands-on, low pressure" }
      ]
    },
    {
      id: "place",
      prompt: "Where do you want to spend it?",
      options: [
        { value: "indoor", label: "Indoors", hint: "Home, library, studio" },
        { value: "outdoor", label: "Outdoors", hint: "Parks, trails, fields" },
        { value: "either", label: "Either is fine", hint: "Whatever fits the day" }
      ]
    },
    {
      id: "social",
      prompt: "Solo or with people?",
      options: [
        { value: "solo", label: "Solo", hint: "My own pace, my own time" },
        { value: "group", label: "With people", hint: "Partners, teams, groups" },
        { value: "either", label: "Either", hint: "A mix of both" }
      ]
    },
    {
      id: "budget",
      prompt: "Starting budget?",
      options: [
        { value: 0, label: "Free", hint: "Use what I have or borrow" },
        { value: 50, label: "Under $50", hint: "A few basics" },
        { value: 150, label: "Under $150", hint: "Decent starter gear" },
        { value: 999, label: "Flexible", hint: "Happy to invest if I like it" }
      ]
    },
    {
      id: "time",
      prompt: "Time per week?",
      options: [
        { value: "low", label: "Under 1 hr", hint: "Small pockets of time" },
        { value: "mid", label: "1–3 hrs", hint: "A few sessions a week" },
        { value: "high", label: "3+ hrs", hint: "Weekends and evenings" }
      ]
    }
  ];

  globalThis.SQ_DATA = {
    hobbies: hobbies,
    achievements: achievements,
    groups: groups,
    events: events,
    quiz: quiz
  };
})();
