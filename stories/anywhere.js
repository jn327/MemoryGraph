registerStory({
  "id": "anywhere",
  "title": "Anywhere",
  "synopsis": "Since the Shift, anyone who can picture a room can arrive in it. You design rooms no one can picture, until a man dies inside one of them.",
  "start": "intrusion",
  "characters": {
    "dalia": { "name": "Dalia" },
    "pim": { "name": "Pim" },
    "abara": { "name": "Inspector Abara" },
    "saul": { "name": "Saul Vey" },
    "teo": { "name": "Teo" }
  },
  "traits": {
    "honest": { "label": "honest", "concepts": { "truth": 1, "admit": 1.5 } },
    "deceptive": { "label": "a liar", "concepts": { "lie": 1, "conceal": 0.7 } },
    "guarded": { "label": "someone who shuts doors", "concepts": { "lock": 1, "exclude": 1, "hide": 0.7 } },
    "open": { "label": "someone who opens doors", "concepts": { "welcome": 1, "share": 1, "trust": 0.7 } },
    "fair": { "label": "fair", "concepts": { "evidence": 1, "restraint": 1 } },
    "suspicious": { "label": "quick to suspect", "concepts": { "accuse": 1, "surveil": 1, "rumor": 0.7 } }
  },
  "macros": {
    "pimTrusts": { "tag": "Pim trusts you", "condition": { "type": "any", "conditions": [
      { "type": "dominantTrait", "perspective": "pim", "among": ["open", "guarded"], "is": "open" },
      { "type": "trait", "perspective": "pim", "trait": "honest", "min": 1 }
    ] } },
    "abaraKnowsLie": { "tag": "Abara knows you lied", "condition": { "type": "knows", "perspective": "abara", "about": { "concepts": ["lie", "portfolio"] } } },
    "teoCaught": { "tag": "what Abara knows", "condition": { "type": "knows", "perspective": "abara", "about": { "concepts": ["teo_clue"] } } },
    "corwinBlamed": { "tag": "your accusation", "condition": { "type": "all", "conditions": [
      { "type": "not", "condition": { "type": "macroCondition", "name": "teoCaught" } },
      { "type": "knows", "perspective": "abara", "about": { "concepts": ["accuse", "corwin"] } }
    ] } },
    "saulCleared": { "tag": "what Abara knows", "condition": { "type": "any", "conditions": [
      { "type": "macroCondition", "name": "teoCaught" },
      { "type": "macroCondition", "name": "corwinBlamed" },
      { "type": "knows", "perspective": "abara", "about": { "concepts": ["stale_photo"] } }
    ] } }
  },
  "nodes": {
    "intrusion": {
      "text": "It has been three years since the Shift, since the morning people discovered that anyone who could picture a room clearly enough could simply be in it. Locks became ornaments. Your trade became rooms nobody can picture: crooked walls, shifting panels, light that never falls the same way twice.\n\nAt 6:40 a.m. a man appears at the foot of your bed holding a birthday cake, nine candles still lit, wax running onto his wrist. 'Oh no,' he says. 'Oh no, no. I pictured my niece's room. Your flat is the mirror of theirs.' Through the wall you can hear a child next door start to cry.",
      "onEnter": [
        { "type": "remember", "concepts": ["shift", "arrival", "oren", "cake"] },
        { "type": "set", "variable": "hours", "value": 0 }
      ],
      "choices": [
        { "id": "walk_him", "text": "Laugh, find him a plate, and walk him next door yourself",
          "do": [{ "type": "remember", "concepts": ["player", "welcome", "oren", "brenners"], "witnesses": ["dalia"],
            "summary": "walked a lost stranger to the Brenners' door with his cake still lit" }],
          "goto": "next_door" },
        { "id": "report_him", "text": "Order him out and report the arrival to the neighborhood Watch",
          "do": [{ "type": "remember", "concepts": ["player", "exclude", "surveil", "oren"], "witnesses": ["dalia", "teo"],
            "summary": "reported a lost uncle with a birthday cake to the Watch" }],
          "goto": "next_door" },
        { "id": "pretend", "text": "Tell him you were expecting him, so he doesn't feel like an intruder",
          "do": [{ "type": "remember", "concepts": ["player", "lie", "welcome", "oren"], "witnesses": ["dalia"],
            "summary": "told a frightened man you'd been expecting him" }],
          "goto": "next_door" }
      ]
    },
    "next_door": {
      "text": [
        { "if": { "type": "trait", "perspective": "dalia", "trait": "suspicious", "min": 1 },
          "value": "Dalia Brenner opens the door before you knock. The Watch has already messaged her: an arrival reported at your address, an Oren Brenner, her brother. 'You were right to report him,' she says, and her voice says she is not sure. Behind her, Pim, turning nine today, is sitting inside the wardrobe with the door pulled shut.\n\n'Third arrival this month,' Dalia says quietly. 'Last week a man stood over Pim's bed. He said he was looking for the previous tenant. I need a room nobody can picture. You do that.' From the wardrobe, a small voice: 'If nobody can picture my room, how will I find it?'" },
        { "if": { "type": "trait", "perspective": "dalia", "trait": "deceptive", "min": 1 },
          "value": "Oren tells everyone you were expecting him. Dalia Brenner raises an eyebrow at you over his shoulder, but she lets the kindness stand. Behind her, Pim, turning nine today, is sitting inside the wardrobe with the door pulled shut.\n\n'Third arrival this month,' Dalia says once Oren is busy with candles. 'Last week a man stood over Pim's bed. He said he was looking for the previous tenant. I need a room nobody can picture. You do that.' From the wardrobe, a small voice: 'If nobody can picture my room, how will I find it?'" },
        { "value": "Dalia Brenner takes the cake from her brother and the measure of you in the same glance. 'You were kind to him,' she says. 'I need you to be much less kind to everyone else.' Behind her, Pim, turning nine today, is sitting inside the wardrobe with the door pulled shut.\n\n'Third arrival this month. Last week a man stood over Pim's bed. He said he was looking for the previous tenant. I need a room nobody can picture.' From the wardrobe, a small voice: 'If nobody can picture my room, how will I find it?'" }
      ],
      "choices": [
        { "id": "design_with_pim", "text": "Take the commission, and ask Pim to help you design it",
          "do": [{ "type": "remember", "concepts": ["player", "share", "trust", "pim"], "witnesses": ["pim", "dalia"],
            "summary": "asked a nine-year-old to help design their own room" }],
          "goto": "studio" },
        { "id": "design_secret", "text": "Take the commission, but keep the design secret, even from Pim",
          "do": [{ "type": "remember", "concepts": ["player", "hide", "lock", "pim"], "witnesses": ["pim", "dalia"],
            "summary": "kept a child's own room secret from them" }],
          "goto": "studio" }
      ]
    },
    "studio": {
      "text": "You are sketching impossible corners when Inspector Ruth Abara knocks on your studio door. She always uses doors; she says it is a courtesy nobody bothers with anymore. She does not sit.\n\n'Hollis Fenn is dead,' she says. 'In his study. In Fenn House.' You designed Fenn House. It was your proof that a home could be unimaginable. 'No forced entry, because there's no such thing now. Somebody pictured that room.' She lays a printout on your drafting table: the study, the yellow chair, the blue rug, the crooked wall. It was found on a forum for people who trade pictures of rooms.\n\nYou know the photograph. It ran in a magazine profile of your work. You took it.",
      "choices": [
        { "id": "admit_portfolio", "text": "Admit the photograph is yours, from your own portfolio",
          "do": [{ "type": "remember", "concepts": ["player", "admit", "truth", "portfolio"], "witnesses": ["abara"],
            "summary": "admitted your own portfolio had leaked the Fenn study" }],
          "goto": "crime_scene" },
        { "id": "deny_portfolio", "text": "Tell her you have never seen it before",
          "do": [{ "type": "remember", "concepts": ["player", "lie", "conceal", "portfolio"], "witnesses": ["abara"],
            "summary": "swore you'd never seen the photograph of the study" }],
          "goto": "crime_scene" }
      ]
    },
    "crime_scene": {
      "text": [
        { "if": { "type": "trait", "perspective": "abara", "trait": "honest", "min": 1 },
          "value": "'Thank you,' Abara says, folding the printout. 'Most people lie about the small things first.' She takes you to Fenn House in a car, like it's the old days.\n\nThe study is taped off. Hollis Fenn's chair is turned to the window. And you see at once what she can't: the crooked wall is not where the photograph puts it. Eight months ago you renovated this room. The wall moved a metre to the left; the blue rug went to storage. Anyone who pictured the photograph would have pictured a room that no longer exists. Arrival doesn't work like that. You only land where the picture is true." },
        { "value": "Abara studies you a beat longer than is comfortable, then drives you to Fenn House in a car, like it's the old days.\n\nThe study is taped off. Hollis Fenn's chair is turned to the window. And you see at once what she can't: the crooked wall is not where the photograph puts it. Eight months ago you renovated this room. The wall moved a metre to the left; the blue rug went to storage. Anyone who pictured the photograph would have pictured a room that no longer exists. Arrival doesn't work like that. You only land where the picture is true." }
      ],
      "choices": [
        { "id": "tell_stale", "text": "Tell Abara the photograph is out of date: whoever came here had seen the new room",
          "do": [{ "type": "remember", "concepts": ["player", "evidence", "truth", "stale_photo"], "witnesses": ["abara"],
            "summary": "pointed out that the photograph of the study was out of date" }],
          "goto": "saul" },
        { "id": "keep_stale", "text": "Say nothing about the renovation. The photo already points away from you",
          "do": [{ "type": "remember", "concepts": ["player", "conceal", "renovation"],
            "summary": "kept quiet about the renovation while someone else was charged" }],
          "goto": "saul" }
      ]
    },
    "saul": {
      "text": [
        { "if": { "type": "knows", "perspective": "abara", "about": { "concepts": ["stale_photo"] } },
          "value": "Saul Vey, Hollis's business partner, is in an interview room with a cold coffee and the face of a man rehearsing his own defence. The photograph was on his laptop. 'Everyone in our industry has that picture,' he says. 'It's famous. I paid for that house to be unimaginable, I've never been able to picture it in my life.'\n\nAbara leans on the table. 'Our architect says the photo is stale. The room changed. So who saw the new study?' Saul blinks, then lists them: the reopening party eight months ago. You. Hollis. His nephew Corwin. Caterers. And the neighborhood Watch, who did a safety walk-through the week before. 'Teo Lindqvist brought a kid with him. Said kids remember rooms better.'" },
        { "value": "Saul Vey, Hollis's business partner, is in an interview room with a cold coffee and the face of a man rehearsing his own defence. The photograph was on his laptop. 'Everyone in our industry has that picture,' he says. 'It's famous. I paid for that house to be unimaginable, I've never been able to picture it in my life.'\n\nAbara is unmoved. 'The prosecutor likes the laptop.' Saul looks at you, the architect, as if you might be able to say something that would matter. When nobody does, he talks anyway: the reopening party eight months ago, Hollis's nephew Corwin, the caterers, the neighborhood Watch walk-through. 'Teo Lindqvist brought a kid with him. Said kids remember rooms better.'" }
      ],
      "choices": [
        { "id": "ask_evidence", "text": "Ask for the guest list and party photos before anyone else is named",
          "do": [{ "type": "remember", "concepts": ["player", "evidence", "restraint", "saul"], "witnesses": ["abara", "saul"],
            "summary": "asked for evidence before anyone was named" }],
          "goto": "afternoon" },
        { "id": "name_corwin", "text": "Tell Abara it was probably Corwin. Everyone knew he hated his uncle",
          "do": [{ "type": "remember", "concepts": ["player", "accuse", "rumor", "corwin"], "witnesses": ["abara", "saul"],
            "summary": "named Corwin Fenn on a hunch" }],
          "goto": "afternoon" },
        { "id": "promise_saul", "text": "Promise Saul you'll get him out",
          "do": [{ "type": "remember", "concepts": ["player", "trust", "promise", "saul"], "witnesses": ["saul"],
            "summary": "promised the accused man you'd get him out" }],
          "goto": "afternoon" }
      ]
    },
    "afternoon": {
      "text": [
        { "if": { "type": "variable", "name": "hours", "operator": "gte", "value": 1 },
          "value": "The light is going amber. There is time for one more thing before the Watch meeting tonight, where Teo is presenting something he calls the Registry." },
        { "value": "You have the afternoon before the Watch meeting tonight, where Teo is presenting something he calls the Registry. Enough time for two errands, not three." }
      ],
      "choices": [
        { "id": "visit_corwin", "text": "Visit Corwin Fenn",
          "showIf": { "type": "all", "conditions": [
            { "type": "not", "condition": { "type": "visited", "node": "corwin" } },
            { "type": "variable", "name": "hours", "operator": "lt", "value": 2 }
          ] },
          "do": [{ "type": "inc", "variable": "hours" }], "goto": "corwin" },
        { "id": "call_magazine", "text": "Call the magazine about your portfolio",
          "showIf": { "type": "all", "conditions": [
            { "type": "not", "condition": { "type": "visited", "node": "magazine" } },
            { "type": "variable", "name": "hours", "operator": "lt", "value": 2 }
          ] },
          "do": [{ "type": "inc", "variable": "hours" }], "goto": "magazine" },
        { "id": "join_patrol", "text": "Join Teo's afternoon Watch patrol",
          "showIf": { "type": "all", "conditions": [
            { "type": "not", "condition": { "type": "visited", "node": "patrol" } },
            { "type": "variable", "name": "hours", "operator": "lt", "value": 2 }
          ] },
          "do": [{ "type": "inc", "variable": "hours" }], "goto": "patrol" },
        { "id": "to_meeting", "text": "Go to the Watch meeting", "goto": "watch_meeting" }
      ]
    },
    "corwin": {
      "text": "Corwin Fenn lives in a flat with no art on the walls. 'Pictures are maps now,' he says. He is younger than you expected and he has not slept. He knows what people say about him and his uncle. 'We fought about money. We fought about everything. I loved him in the way you love weather.'",
      "choices": [
        { "id": "corwin_gentle", "text": "Tell him you're sorry, and ask what Hollis was afraid of",
          "do": [{ "type": "remember", "concepts": ["player", "restraint", "evidence", "teo_clue"],
            "summary": "listened to Corwin instead of accusing him" }],
          "goto": "corwin_answer" },
        { "id": "corwin_press", "text": "Ask him straight out where he was that night",
          "do": [{ "type": "remember", "concepts": ["player", "accuse", "corwin"],
            "summary": "interrogated a grieving man in his own kitchen" }],
          "goto": "corwin_answer" }
      ]
    },
    "corwin_answer": {
      "text": [
        { "if": { "type": "association", "a": "player", "b": "teo_clue", "min": 1 }, "tag": "you listened",
          "value": "Corwin is quiet for a long time. 'A week before he died, he called me. He'd found someone standing in his study at two in the morning. Just standing, looking. The man apologised and said he was the Watch, checking the arrival points were secure. Hollis thought it was funny.' Corwin's mouth twists. 'He thought it was funny.'" },
        { "value": "'At home,' Corwin says. 'Alone. Which I understand is the worst possible answer.' He opens the door for you, which these days is a pointed thing to do. 'You built him a house nobody could imagine. Somebody imagined it anyway. Maybe start there.'" }
      ],
      "choices": [{ "id": "corwin_leave", "text": "Leave", "goto": "afternoon" }]
    },
    "magazine": {
      "text": "The magazine's editor remembers you fondly. Your profile is still their most-read piece: 'The Architect Who Unbuilt the Map'. The study photograph has been viewed four hundred thousand times. Every photograph in the spread shows a room in a home you built, and every one of them is an invitation.",
      "choices": [
        { "id": "pull_quietly", "text": "Have the pictures taken down quietly, with no statement",
          "do": [{ "type": "remember", "concepts": ["player", "conceal", "hide", "portfolio"],
            "summary": "had your portfolio quietly erased" }],
          "goto": "afternoon" },
        { "id": "publish_warning", "text": "Publish a warning: these photos are maps, and your clients should change their rooms",
          "do": [{ "type": "remember", "concepts": ["player", "admit", "truth", "share", "portfolio"], "witnesses": "all",
            "summary": "publicly warned everyone your portfolio was a map into their homes" }],
          "goto": "afternoon" }
      ]
    },
    "patrol": {
      "text": "Teo Lindqvist leads the patrol like a scoutmaster, warm and organised, with a clipboard of addresses. Pim is with him, holding his sleeve, because Dalia works late on Tuesdays. At each house Teo asks the owners about their arrival points and makes notes, then he crouches beside Pim. 'Close your eyes. Tell me the room. Every detail.' Pim describes it perfectly. Teo writes it all down.",
      "choices": [
        { "id": "patrol_watch", "text": "Say nothing, and watch what he writes",
          "do": [{ "type": "remember", "concepts": ["player", "surveil", "teo_clue", "teo"],
            "summary": "watched the Watch captain copy down every room a child described" }],
          "goto": "afternoon" },
        { "id": "patrol_ask", "text": "Ask Teo, lightly, why the Watch needs such detail",
          "do": [{ "type": "remember", "concepts": ["player", "evidence", "restraint", "teo"], "witnesses": ["teo", "pim"],
            "summary": "asked the Watch captain why he needed every detail of every room" }],
          "goto": "patrol_answer" }
      ]
    },
    "patrol_answer": {
      "text": "'So we can get there first,' Teo says, smiling, 'when something goes wrong.' Pim is watching you, not him. When Teo turns to knock on the next door, Pim whispers: 'He asked me about Mr Fenn's study too. After the party. I'm good at rooms.'",
      "onEnter": [{ "type": "remember", "concepts": ["pim", "teo", "teo_clue", "fenn_study"], "witnesses": ["pim"] }],
      "choices": [{ "id": "patrol_leave", "text": "Squeeze Pim's hand and finish the patrol", "goto": "afternoon" }]
    },
    "watch_meeting": {
      "text": [
        { "value": [
          "The community hall smells of urns and wet coats. Teo stands beside a projected slide: THE REGISTRY. Every household lists which rooms its members can picture, so when an arrival happens the Watch knows who could have made it. 'Hollis Fenn might be alive,' he says, 'if we'd known who could see his study.'",
          { "if": { "type": "trait", "perspective": "teo", "trait": "suspicious", "min": 1 },
            "text": "He finds you in the crowd. 'And thanks to our neighbour here, who was first to report this morning.' A little applause. At the back, Oren Brenner does not clap." },
          { "if": { "type": "trait", "perspective": "dalia", "trait": "open", "min": 1.5 },
            "text": "Dalia sits beside you and murmurs, 'Pim keeps asking when you'll come back to finish their room.'" },
          { "if": { "type": "knows", "perspective": "teo", "about": { "concepts": ["share", "portfolio"] } },
            "text": "Several people glance at you: they read your warning about the magazine photographs. One woman mouths thank you. Another looks at you as if you had drawn a map of her house yourself." }
        ] }
      ],
      "onEnter": [
        { "type": "gossip", "from": "dalia", "to": ["teo"], "belief": 0.6 },
        { "type": "gossip", "from": "teo", "to": ["dalia"], "belief": 0.6 }
      ],
      "choices": [
        { "id": "back_registry", "text": "Stand up for the Registry. It might have saved Hollis",
          "do": [{ "type": "remember", "concepts": ["player", "surveil", "lock", "registry"], "witnesses": ["teo", "dalia", "pim"],
            "summary": "stood up for the Registry in front of the whole street" }],
          "goto": "pims_room" },
        { "id": "oppose_registry", "text": "Speak against it: a list of who can picture what is a map for whoever holds it",
          "do": [{ "type": "remember", "concepts": ["player", "welcome", "restraint", "registry"], "witnesses": ["teo", "dalia", "pim"],
            "summary": "argued against the Registry in front of everyone" }],
          "goto": "pims_room" },
        { "id": "watch_signing", "text": "Stay quiet and watch who signs first",
          "do": [{ "type": "remember", "concepts": ["player", "restraint", "teo_clue", "teo"],
            "summary": "noticed the Watch captain leave Fenn House off his own Registry entry" }],
          "goto": "pims_room" }
      ]
    },
    "pims_room": {
      "text": [
        { "if": { "type": "macroCondition", "name": "pimTrusts" },
          "value": "You work on Pim's room over the next two days with Pim cross-legged on the floor, issuing instructions. 'Make it so only I can picture it,' Pim says. 'Put something in it that only I know.' It is better than anything you have drawn in years: a room keyed to a private memory, unpicturable to anyone who doesn't share it." },
        { "value": "You work on Pim's room over the next two days while Pim watches from the doorway, arms folded. Pim asks once what the room will look like. When you don't answer, Pim stops asking. Dalia brings tea and says nothing about the silence." }
      ],
      "choices": [
        { "id": "secret_room", "text": "Build the room around a secret only Pim knows",
          "do": [{ "type": "remember", "concepts": ["player", "share", "trust", "pim"], "witnesses": ["pim"],
            "summary": "built a room around a secret only one child knew" }],
          "goto": "second_arrival" },
        { "id": "labyrinth_room", "text": "Build a true labyrinth: shifting panels, no fixed landmarks",
          "do": [{ "type": "remember", "concepts": ["player", "lock", "hide", "pim"], "witnesses": ["pim", "dalia"],
            "summary": "built a child a room so strange they got lost in it" }],
          "goto": "second_arrival" },
        { "id": "bright_room", "text": "Build it simple and bright, with a real bolt on the inside",
          "do": [{ "type": "remember", "concepts": ["player", "welcome", "trust", "pim"], "witnesses": ["pim", "dalia"],
            "summary": "built a child a bright room they could find in the dark" }],
          "goto": "second_arrival" }
      ]
    },
    "second_arrival": {
      "text": "Two nights later Dalia hammers on your door in her coat and nightdress. Pim is gone. The window is shut, the bolt is drawn from the inside, the bed is still warm. Nobody arrived. Pim left. Children are better at picturing than adults, everyone knows that, and Pim has had a great deal of practice.\n\nOn the pillow is a drawing in crayon.",
      "choices": [
        { "id": "look_drawing", "text": "Look at the drawing",
          "goto": [
            { "if": { "type": "macroCondition", "name": "pimTrusts" }, "node": "studio_found" },
            { "node": "hall_found" }
          ] }
      ]
    },
    "studio_found": {
      "text": [
        { "value": [
          "It is your studio. You know before you've finished looking. You run, Dalia behind you, and find Pim under the drafting table with their knees up. 'It was the only room I knew that wasn't scared,' Pim says.",
          "\n\n",
          "Then, before you can say anything kind, it all comes out in a rush. Teo takes Pim on walk-throughs. Teo asks Pim to describe rooms with their eyes closed. Pim described Mr Fenn's new study for him, every detail, the week after the party. 'And then Mr Fenn died. And I think it was because of me.'"
        ] }
      ],
      "onEnter": [{ "type": "remember", "concepts": ["pim", "teo", "teo_clue", "confession", "fenn_study"], "witnesses": ["pim", "dalia"] }],
      "choices": [
        { "id": "not_your_fault", "text": "Tell Pim it isn't their fault, and that you'll tell their mum the rest together",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "trust", "pim"], "witnesses": ["pim", "dalia"],
            "summary": "told a frightened child it wasn't their fault, and told the truth beside them" }],
          "goto": "dalia_truth" },
        { "id": "keep_pims_secret", "text": "Promise Pim you'll keep this between the two of you",
          "do": [{ "type": "remember", "concepts": ["player", "hide", "conceal", "pim"], "witnesses": ["pim"],
            "summary": "promised to keep a child's secret, even from their mother" }],
          "goto": "abara_choice" }
      ]
    },
    "hall_found": {
      "text": [
        { "value": [
          "It is the community hall, drawn in black crayon, with a tall figure beside a small one. You find them there: Pim wrapped in Teo's coat, Teo making cocoa on the urn. 'Kid's a natural,' Teo says warmly. 'Turned up here at midnight. This is why we need the Registry.' Pim will not look at you.",
          { "if": { "type": "association", "a": "player", "b": "teo_clue", "min": 1 }, "tag": "what you noticed",
            "text": "You watch Teo's hands on the cups and think about everything he writes down." },
          { "if": { "type": "trait", "perspective": "pim", "trait": "honest", "min": 0.5 },
            "text": "As Dalia lifts Pim, Pim whispers into her shoulder, loud enough for you: 'Ask him about Mr Fenn's chair.'" }
        ] }
      ],
      "choices": [
        { "id": "take_home", "text": "Take Pim home and ask, gently, what they meant",
          "do": [{ "type": "remember", "concepts": ["player", "trust", "restraint", "pim"], "witnesses": ["pim", "dalia"],
            "summary": "took a lost child home and listened before doing anything else" }],
          "goto": "dalia_truth" },
        { "id": "confront_teo", "text": "Confront Teo here, in front of Pim and Dalia",
          "do": [{ "type": "remember", "concepts": ["player", "accuse", "teo"], "witnesses": ["teo", "dalia", "pim"],
            "summary": "accused the Watch captain to his face in the hall" }],
          "goto": "teo_flees" },
        { "id": "thank_teo", "text": "Thank Teo, and say nothing",
          "do": [{ "type": "remember", "concepts": ["player", "restraint", "conceal", "teo"], "witnesses": ["teo", "pim"],
            "summary": "thanked the Watch captain and let him keep his coat around the child" }],
          "goto": "abara_choice" }
      ]
    },
    "dalia_truth": {
      "text": [
        { "if": { "type": "dominantTrait", "perspective": "dalia", "among": ["open", "guarded"], "is": "guarded" },
          "value": "At Dalia's kitchen table, Pim tells it all again. Teo, the walk-throughs, the study. Dalia listens with both hands flat on the wood. When Pim is finished she turns to you. 'You have built walls around my child since the day you met us,' she says. 'And still a man walked straight in through Pim's mouth.' She is not wrong, and she is not finished being angry, but she does not ask you to leave." },
        { "value": "At Dalia's kitchen table, Pim tells it all again. Teo, the walk-throughs, the study. Dalia listens with both hands flat on the wood, then pulls Pim into her lap even though Pim is too big for it. Over Pim's head, she looks at you. 'Thank you for bringing this to me instead of around me.'" }
      ],
      "onEnter": [{ "type": "reveal", "to": ["dalia"], "about": { "concepts": ["teo_clue"] } }],
      "choices": [
        { "id": "go_with_permission", "text": "Ask Dalia whether Pim's account can go to the inspector",
          "do": [{ "type": "remember", "concepts": ["player", "evidence", "truth", "share"], "witnesses": ["dalia", "pim"],
            "summary": "asked a mother's permission before taking her child's words to the police" }],
          "goto": "abara_choice" },
        { "id": "shield_pim", "text": "Keep Pim out of it entirely, and look for other proof",
          "do": [{ "type": "remember", "concepts": ["player", "hide", "restraint", "pim"], "witnesses": ["dalia", "pim"],
            "summary": "kept the child's name out of the case" }],
          "goto": "abara_choice" }
      ]
    },
    "teo_flees": {
      "text": "'Careful,' Teo says, still smiling. 'People round here remember who points fingers.' Then he closes his eyes, and the cocoa cup falls into the space where he was. He could be anywhere. He has spent three years memorising everywhere.\n\nDalia holds Pim so tightly Pim squeaks. By morning, half the street has heard that you drove the Watch captain away in the middle of the night, and nobody agrees on why.",
      "onEnter": [
        { "type": "set", "variable": "teo_fled", "value": true },
        { "type": "remember", "concepts": ["teo", "flight", "teo_clue"], "witnesses": "all" }
      ],
      "choices": [{ "id": "to_abara", "text": "Go to Inspector Abara at first light", "goto": "abara_choice" }]
    },
    "abara_choice": {
      "text": [
        { "value": [
          "Abara's office is the only one in the station with a door that locks, which she says is sentimental.",
          { "if": { "type": "macroCondition", "name": "abaraKnowsLie" },
            "text": "On her desk is the magazine with your photo credit circled in red. 'You told me you'd never seen it,' she says. 'So now I have to wonder what else you've never seen.'",
            "else": "On her desk is the magazine with your photo credit circled in red. 'You told me the truth when it cost you,' she says. 'It's why I'm still listening.'" },
          { "if": { "type": "macroCondition", "name": "saulCleared" },
            "text": "",
            "else": "She taps the file. 'The prosecutor wants to charge Saul Vey by Friday. If you have something, it has to be now.'" },
          { "if": { "type": "variable", "name": "teo_fled", "operator": "eq", "value": true },
            "text": "She almost smiles. 'And I hear our Watch captain has vanished. Into thin air, as people still insist on saying.'" }
        ] }
      ],
      "onEnter": [{ "type": "reveal", "to": ["abara"], "about": { "concepts": ["portfolio"] } }],
      "choices": [
        { "id": "give_everything", "text": "Give her everything you know, including the parts that cost you",
          "do": [
            { "type": "remember", "concepts": ["player", "truth", "evidence", "admit"], "witnesses": ["abara"],
              "summary": "handed over everything, including the parts that made you look bad" },
            { "type": "reveal", "to": ["abara"], "about": { "concepts": ["teo_clue"] } },
            { "type": "reveal", "to": ["abara"], "about": { "concepts": ["renovation"] } }
          ],
          "goto": "arrest" },
        { "id": "give_photo_only", "text": "Give her the stale photograph, and nothing about Pim",
          "do": [
            { "type": "remember", "concepts": ["player", "evidence", "conceal", "stale_photo"], "witnesses": ["abara"],
              "summary": "handed over the stale photograph and nothing else" }
          ],
          "goto": "arrest" },
        { "id": "blame_corwin", "text": "Tell her you're sure it was Corwin, and you can help make it stick",
          "do": [{ "type": "remember", "concepts": ["player", "accuse", "lie", "corwin"], "witnesses": ["abara"],
            "summary": "offered to help the police frame Corwin Fenn" }],
          "goto": "arrest" }
      ]
    },
    "arrest": {
      "text": [
        { "if": { "type": "all", "conditions": [
            { "type": "macroCondition", "name": "teoCaught" },
            { "type": "variable", "name": "teo_fled", "operator": "eq", "value": true } ] },
          "value": "It takes Abara four days to find Teo, and she does it by thinking like him: he will go where he cannot stop picturing. They arrest him in the Fenn study, standing at the window where Hollis died. His notebooks list eleven hundred rooms, half of them described by children. Saul Vey walks out of the station blinking at the daylight." },
        { "if": { "type": "macroCondition", "name": "teoCaught" },
          "value": "They arrest Teo Lindqvist at his kitchen table, mid-breakfast; he does not try to vanish, because he has never once imagined being caught. His notebooks list eleven hundred rooms, half of them described by children. Hollis Fenn had found him in the study and laughed at him. Saul Vey walks out of the station blinking at the daylight." },
        { "if": { "type": "macroCondition", "name": "corwinBlamed" },
          "value": "Corwin Fenn is charged on Thursday. Your hunch, and the motive everyone already believed, are enough for a prosecutor who wants a name. Saul goes home. Corwin's flat with no pictures on the walls is photographed for the evening news, every corner of it, until anyone in the city could stand in his kitchen." },
        { "if": { "type": "knows", "perspective": "abara", "about": { "concepts": ["stale_photo"] } },
          "value": "The stale photograph is enough to free Saul Vey, but not enough to name anyone else. The case goes quiet. On the street, the Watch patrols continue, and Teo still crouches beside children with his clipboard, saying, 'Close your eyes. Tell me the room.'" },
        { "value": "Saul Vey is charged on Friday. The photograph on his laptop is the whole case, and nobody who knows better says so. You read about it on the same page as an advertisement for Teo's Registry: SAFER STREETS START WITH KNOWING WHO SEES." }
      ],
      "choices": [{ "id": "to_hearing", "text": "Answer the summons from the city council", "goto": "hearing" }]
    },
    "hearing": {
      "text": [
        { "value": [
          "A month later the city council meets to decide what a home is now. On the agenda: the Picture Laws, the Registry, and a proposal to license architects like you. They want you to testify. You are, after all, the person who unbuilt the map.",
          { "if": { "type": "trait", "trait": "deceptive", "min": 1.5 },
            "text": "Walking in, you realise how many small untruths it took to get here, and how many people in this room have heard one of them." },
          { "if": { "type": "knows", "perspective": "abara", "about": { "concepts": ["accuse", "lie", "corwin"] } }, "tag": "Abara remembers",
            "text": "Inspector Abara is in the second row. When you meet her eyes she looks away, the way you would from someone who once offered to help you frame an innocent man.",
            "else": "" },
          { "if": { "type": "all", "conditions": [{ "type": "trait", "trait": "fair", "min": 2 }, { "type": "not", "condition": { "type": "knows", "perspective": "abara", "about": { "concepts": ["accuse", "lie", "corwin"] } } }] },
            "text": "Inspector Abara is in the second row. She nods at you once, the way she would at a colleague." },
          "What will you tell them a city should do when every door is already open?"
        ] }
      ],
      "choices": [
        { "id": "testify_consent", "text": "Argue for consent: no one may arrive uninvited, and no one may be mapped",
          "do": [{ "type": "remember", "concepts": ["player", "restraint", "welcome", "consent"],
            "summary": "argued that nobody should be mapped without consent" }],
          "goto": "ending_consent" },
        { "id": "testify_registry", "text": "Argue for the Registry: the city must know who can picture what",
          "do": [{ "type": "remember", "concepts": ["player", "surveil", "lock", "registry"],
            "summary": "argued for a city that knows who can picture every room" }],
          "goto": "ending_registry" },
        { "id": "testify_shelter", "text": "Decline to testify. Go back to building hidden rooms for whoever can pay",
          "do": [{ "type": "remember", "concepts": ["player", "hide", "exclude", "commission"],
            "summary": "walked out of the hearing to sell hiding places" }],
          "goto": "ending_shelter" },
        { "id": "testify_neighbours", "text": "Tell them there is no lock for this, only neighbours worth trusting",
          "do": [{ "type": "remember", "concepts": ["player", "trust", "welcome", "share"],
            "summary": "told the council the only lock left is each other" }],
          "goto": "ending_open" }
      ]
    },
    "ending_consent": {
      "ending": true,
      "text": [{ "value": [
        "The Picture Laws pass by two votes. Arriving uninvited becomes a crime; so does trading pictures of other people's rooms. Nobody can enforce either rule perfectly. But consent stops being something a family has to argue for after the fact, and becomes something the city owes them before.",
        { "if": { "type": "macroCondition", "name": "teoCaught" },
          "text": "Teo's notebooks are the first evidence burned under the new law, eleven hundred rooms going up in a council furnace, and half the city comes to watch." },
        { "if": { "type": "macroCondition", "name": "corwinBlamed" },
          "text": "Corwin Fenn's appeal cites the new law. It will take years. You testify for him, which helps less than you had hoped." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "pimTrusts" },
          "text": "Pim draws your studio on every birthday card after that, always with a small figure under the table, always with the door open.",
          "else": "Pim grows up careful. They never describe a room to anyone again, including you, and you are never sure whether that is the lesson you meant to teach." },
        { "recall": { "perspective": "dalia", "among": ["open", "guarded", "honest", "deceptive", "fair", "suspicious"] }, "format": "When people ask Dalia about you, she tells them first that you {summary}." },
        { "if": { "type": "dominantTrait", "perspective": "abara", "among": ["honest", "deceptive"], "is": "honest" },
          "text": "Abara sends you a postcard of a door every Christmas. No message. You keep all of them.",
          "else": "Abara never calls again. When your name comes up in her office, she says only that you were useful." }
      ] }]
    },
    "ending_registry": {
      "ending": true,
      "text": [{ "value": [
        "The Registry passes. Every resident lists the rooms they can picture; the list is kept by the Watch, in a building with no windows. Arrivals fall by half in the first year. Nobody can say exactly how many of the remaining arrivals were made by people who had read the list.",
        { "if": { "type": "macroCondition", "name": "teoCaught" },
          "text": "The Watch has a new captain. She is very sincere. She asks children to close their eyes and describe rooms, for safety, and she writes everything down.",
          "else": "Teo Lindqvist is appointed Registrar. He thanks you, in his acceptance speech, by name." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "pimTrusts" },
          "text": "Pim refuses to register. At nine, it is the first law they ever break, and they do it looking straight at you.",
          "else": "Pim is registered with the rest. Under 'rooms I can picture' they write, in careful capitals: ALL OF THEM." },
        { "recall": { "perspective": "saul", "among": ["open", "guarded", "fair", "suspicious", "honest", "deceptive"] }, "format": "Saul Vey sends a single line: he will not forget that you {summary}." },
        { "recall": { "perspective": "dalia", "among": ["open", "guarded", "honest", "deceptive", "fair", "suspicious"] }, "format": "Dalia remembers, mostly, that you {summary}. She moves across the river in the spring." }
      ] }]
    },
    "ending_shelter": {
      "ending": true,
      "text": [{ "value": [
        "Your waiting list is two years long. You build rooms that cannot be pictured by anyone who has not been carried through them blindfolded: vaults with sofas in them. Your clients sleep well. Their children have to be led to breakfast. A quiet new inequality settles over the city, between homes that can hide and homes that cannot, and you are its most famous architect.",
        { "if": { "type": "not", "condition": { "type": "macroCondition", "name": "teoCaught" } },
          "text": "The one client you turn away is Teo Lindqvist, and you never fully explain to yourself why." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "pimTrusts" },
          "text": "Pim's room, the one with the secret in it, is the only one you never put in a portfolio. Sometimes you picture it, just to check you still can't.",
          "else": "Pim's room is still the strangest thing you ever built. Dalia tells you Pim sleeps on the sofa." },
        { "recall": { "perspective": "abara", "among": ["honest", "deceptive", "fair", "suspicious"] }, "format": "Inspector Abara closes the Fenn file. Her last note on it records that you {summary}." }
      ] }]
    },
    "ending_open": {
      "ending": true,
      "text": [{ "value": [
        "The council laughs, then stops laughing. Nothing passes that night. But on your street a different kind of watch begins: no clipboards, no lists, just a rota of people who check on each other and who knock, out of courtesy, even though they don't have to. One neighbour refuses to join, remembering how quickly a watch becomes a list of strangers to suspect. You keep knocking on her door anyway.",
        { "if": { "type": "variable", "name": "teo_fled", "operator": "eq", "value": true },
          "text": "Somewhere, Teo is standing in a room he memorised. Some nights you wonder whether it is yours." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "pimTrusts" },
          "text": "Pim runs the rota by the time they're twelve. They are very strict about knocking.",
          "else": "Pim keeps their distance from you for a long time. When they finally knock on your door, years later, you almost don't believe it." },
        { "recall": { "perspective": "dalia", "among": ["open", "guarded", "honest", "deceptive", "fair", "suspicious"] }, "format": "Dalia tells the story of the Shift years to anyone who asks, and in her telling you are the one who {summary}." },
        { "recall": { "perspective": "teo", "about": { "trait": "suspicious" } }, "format": "Teo, wherever he is, would tell it differently: you are the one who {summary}." }
      ] }]
    }
  }
});
