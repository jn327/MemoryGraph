registerStory({
  "id": "the_night_ferry",
  "title": "The Night Ferry",
  "synopsis": "A short showcase. On the last crossing of the night a brooch goes missing, and everyone aboard decides who took it. Including you.",
  "start": "boarding",
  "characters": {
    "hale": { "name": "Captain Hale" },
    "jory": { "name": "Jory" },
    "ines": { "name": "Mrs Duarte" },
    "lark": { "name": "Lark" },
    "grey": { "name": "the man in the grey coat", "hidden": true }
  },
  "traits": {
    "honest": { "label": "honest", "concepts": { "truth": 1, "admit": 1.5, "lie": -1 } },
    "deceptive": { "label": "a liar", "concepts": { "lie": 1, "cheat": 1 } },
    "kind": { "label": "kind", "concepts": { "help": 1, "share": 1, "defend": 1 } },
    "accusing": { "label": "quick to accuse", "concepts": { "accuse": 1, "search": 0.5 } },
    "suspect": { "label": "under suspicion", "concepts": { "suspected": 1, "cleared": -1.5 } },
    "thief": { "label": "a thief", "color": "#9b2c4a", "concepts": { "steal": 1 } }
  },
  "memory": { "halfLife": 20 },
  "macros": {
    "noticedGrey": { "tag": "you were watching him",
      "condition": { "type": "association", "a": "player", "b": "grey", "min": 1 } },
    "jorySuspected": { "tag": "Hale suspects Jory",
      "condition": { "type": "trait", "trait": "suspect", "subject": "jory", "perspective": "hale", "min": 0.5 } },
    "greySuspected": { "tag": "Hale suspects him",
      "condition": { "type": "trait", "trait": "suspect", "subject": "grey", "perspective": "hale", "min": 0.5 } },
    "greyCaught": { "tag": "Hale knows the truth",
      "condition": { "type": "trait", "trait": "thief", "subject": "grey", "perspective": "hale", "min": 0.5 } },
    "haleTrustsYou": { "tag": "Hale trusts you",
      "condition": { "type": "dominantTrait", "perspective": "hale", "among": ["honest", "deceptive"], "is": "honest" } }
  },
  "nodes": {
    "boarding": {
      "text": [{ "value": [
        "The last ferry across the strait leaves at nine, and the wind is already pulling the tops off the waves. You have {var:coins} coins in your pocket and no ticket. {name:jory}, the deckhand, is taking fares at the gangway with a lantern and a tin box.",
        { "if": { "type": "knows", "perspective": "jory", "about": { "concepts": ["accuse", "jory"] } },
          "tag": "Jory remembers your face",
          "text": "He looks at you for a long moment before he holds out the tin. Deckhands have good memories for faces, and he doesn't like yours." },
        { "if": { "type": "knows", "perspective": "grey", "about": { "concepts": ["player"] } },
          "tag": "someone remembers you",
          "text": "Somewhere behind you in the queue, a man laughs softly, as if at an old joke." },
        "\n\n",
        "Behind you an old woman, {name:ines}, is fighting a suitcase nearly as big as she is. A girl of about ten is travelling alone with a label pinned to her coat that says LARK, and she is watching everyone with great interest."
      ] }],
      "onEnter": [{ "type": "set", "variable": "coins", "value": 3 }],
      "choices": [
        { "id": "pay_and_help", "text": "Pay your fare, then carry Mrs Duarte's case up the gangway",
          "do": [
            { "type": "dec", "variable": "coins" },
            { "type": "remember", "concepts": ["player", "help", "ines"], "witnesses": ["ines", "jory", "lark"],
              "summary": "carried Mrs Duarte's case up the gangway" }
          ],
          "goto": "deck" },
        { "id": "slip_aboard", "text": "Slip aboard behind a cargo cart without paying",
          "do": [{ "type": "remember", "concepts": ["player", "cheat", "jory"], "witnesses": ["lark", "grey"],
            "summary": "slipped aboard without paying your fare" }],
          "goto": "deck" },
        { "id": "tip_jory", "text": "Pay, and give Jory an extra coin for the weather",
          "do": [
            { "type": "dec", "variable": "coins", "amount": 2 },
            { "type": "remember", "concepts": ["player", "share", "jory"], "witnesses": ["jory"],
              "summary": "gave the deckhand an extra coin for the weather" }
          ],
          "goto": "deck" }
      ]
    },
    "deck": {
      "text": [{ "value": [
        "The ferry clears the harbour wall and the whole boat leans into the dark. The passengers crowd into the saloon. {name:hale} stands by the wheelhouse door with her arms folded, counting heads.",
        { "if": { "type": "knows", "perspective": "jory", "about": { "concepts": ["share", "jory"] } },
          "tag": "Jory remembers the coin",
          "text": "Jory catches your eye across the saloon and nods. He hasn't forgotten the coin." },
        "Near the luggage rack a man in a grey coat is reading a newspaper. He never turns the page."
      ] }],
      "choices": [
        { "id": "watch_grey", "text": "Keep an eye on the man in the grey coat",
          "do": [{ "type": "remember", "concepts": ["player", "search", "grey"], "witnesses": ["grey"],
            "summary": "watched the man in the grey coat all evening" }],
          "goto": "theft" },
        { "id": "coat_for_lark", "text": "Lark is shivering. Give her your coat",
          "do": [{ "type": "remember", "concepts": ["player", "share", "lark"], "witnesses": ["lark", "ines"],
            "summary": "gave Lark your coat when the cold came in" }],
          "goto": "theft" },
        { "id": "admit_fear", "text": "Tell the captain you've never crossed in weather like this",
          "do": [{ "type": "remember", "concepts": ["player", "admit", "hale"], "witnesses": ["hale"],
            "summary": "admitted to the captain that the crossing frightened you" }],
          "goto": "theft" }
      ]
    },
    "theft": {
      "text": "Halfway across, Mrs Duarte cries out. The brooch her husband gave her, a gold swallow, is gone from her coat.\n\n{name:hale} shuts the saloon doors. 'Nobody leaves this room,' she says, which on a boat in a storm is a very short sentence. 'Who saw anything?'",
      "onEnter": [{ "type": "remember", "concepts": ["grey", "steal", "brooch"], "subject": "grey", "witnesses": ["grey"],
        "summary": "lifted the swallow brooch from Mrs Duarte's coat" }],
      "choices": [
        { "id": "accuse_jory", "text": "Point at Jory. He was the one handling the luggage",
          "do": [
            { "type": "remember", "concepts": ["player", "accuse", "lie", "jory"],
              "witnesses": ["hale", "ines", "jory", "lark"], "summary": "told the captain Jory must have taken it" },
            { "type": "remember", "concepts": ["jory", "suspected"], "subject": "jory",
              "witnesses": ["hale", "ines", "jory", "lark"], "summary": "was accused of taking the brooch" }
          ],
          "goto": "search" },
        { "id": "name_grey", "text": "Say the man in the grey coat was standing right behind her",
          "showIf": { "type": "macroCondition", "name": "noticedGrey" },
          "do": [
            { "type": "remember", "concepts": ["player", "truth", "accuse", "grey"],
              "witnesses": ["hale", "ines", "grey"], "summary": "told the captain about the man in the grey coat" },
            { "type": "remember", "concepts": ["grey", "suspected"], "subject": "grey",
              "witnesses": ["hale", "ines", "grey"], "summary": "was seen standing right behind Mrs Duarte" }
          ],
          "goto": "search" },
        { "id": "turn_out_pockets", "text": "Turn out your own pockets before anyone asks",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "admit"], "witnesses": "all",
            "summary": "turned out your own pockets before anyone asked" }],
          "goto": "search" },
        { "id": "say_nothing", "text": "Say nothing", "goto": "search" }
      ]
    },
    "search": {
      "text": [{ "value": [
        "{name:hale} searches the saloon by lantern light, row by row, bag by bag.",
        { "if": { "type": "macroCondition", "name": "jorySuspected" },
          "text": "She starts with Jory. He stands very still while she goes through his oilskin and the tin fare box. She finds nothing, and locks him in the chain locker anyway. 'Until we dock,' she says.",
          "else": "Jory holds the lantern for her, which is the only reason anyone can see." },
        { "if": { "type": "macroCondition", "name": "greySuspected" },
          "text": "When she reaches the man in the grey coat he smiles and holds his coat open. There is nothing in it at all. He opened it a little too wide, and a little too quickly." }
      ] }],
      "choices": [
        { "id": "defend_jory", "text": "Tell Hale that Jory never went near Mrs Duarte",
          "showIf": { "type": "macroCondition", "name": "jorySuspected" },
          "do": [
            { "type": "remember", "concepts": ["player", "defend", "truth", "jory"], "witnesses": ["hale", "jory"],
              "summary": "spoke up for Jory when he was locked in the chain locker" },
            { "type": "doubt", "to": ["hale"], "about": { "concepts": ["jory", "suspected"] }, "belief": 0.25 },
            { "type": "remember", "concepts": ["jory", "cleared"], "subject": "jory", "witnesses": ["hale"],
              "summary": "had someone vouch for him" }
          ],
          "goto": "galley" },
        { "id": "search_seat", "text": "Ask her to search his seat, not just his coat",
          "showIf": { "type": "macroCondition", "name": "greySuspected" },
          "do": [
            { "type": "remember", "concepts": ["player", "search", "accuse", "grey"], "witnesses": ["hale", "grey"],
              "summary": "made the captain search the grey man's seat" },
            { "type": "reveal", "to": "all", "about": { "concepts": ["brooch"] } }
          ],
          "goto": "galley" },
        { "id": "let_her_work", "text": "Let the captain do her job", "goto": "galley" }
      ]
    },
    "galley": {
      "onEnter": [
        { "type": "gossip", "from": "lark", "to": ["ines"], "about": { "trait": "deceptive" }, "belief": 0.8 },
        { "type": "gossip", "from": "jory", "to": ["hale"], "about": { "trait": "kind" } }
      ],
      "text": [
        { "if": { "type": "macroCondition", "name": "greyCaught" },
          "value": "The brooch was in the lining of the grey man's seat, wrapped in a page of the newspaper he never turned. Hale has him sitting in the galley with his hands on the table where she can see them. Mrs Duarte holds the swallow in her lap as if it might fly off." },
        { "value": [
          "Later, in the galley, Mrs Duarte sits with a cup of tea she isn't drinking. Lark is beside her, swinging her feet.",
          { "if": { "type": "knows", "perspective": "ines", "about": { "concepts": ["cheat"] } },
            "text": "'Lark tells me you didn't pay for your passage,' Mrs Duarte says. She doesn't sound angry. She sounds like someone taking notes.",
            "else": "'You're kind to sit with an old woman,' Mrs Duarte says. 'Everyone else has decided the brooch is gone.'" },
          { "if": { "type": "trait", "trait": "kind", "perspective": "ines", "min": 0.5 },
            "text": "She pats your hand. She remembers who was kind to her tonight." }
        ] }
      ],
      "choices": [
        { "id": "admit_fare", "text": "Admit it, and put the fare in Jory's tin",
          "showIf": { "type": "knows", "perspective": "ines", "about": { "concepts": ["cheat"] } },
          "do": [
            { "type": "dec", "variable": "coins" },
            { "type": "remember", "concepts": ["player", "admit", "truth", "ines"], "witnesses": ["ines", "lark", "jory"],
              "summary": "owned up to dodging your fare and paid it" }
          ],
          "goto": "dawn" },
        { "id": "deny_fare", "text": "Tell her Lark must be mistaken",
          "showIf": { "type": "knows", "perspective": "ines", "about": { "concepts": ["cheat"] } },
          "do": [
            { "type": "remember", "concepts": ["player", "lie", "lark"], "witnesses": ["lark"],
              "summary": "told Mrs Duarte that Lark was making things up" },
            { "type": "doubt", "to": ["ines"], "about": { "concepts": ["cheat"] }, "belief": 0.2 }
          ],
          "goto": "dawn" },
        { "id": "promise_brooch", "text": "Promise her you'll find the brooch",
          "showIf": { "type": "not", "condition": { "type": "macroCondition", "name": "greyCaught" } },
          "do": [
            { "type": "set", "variable": "promised", "value": true },
            { "type": "remember", "concepts": ["player", "help", "ines"], "witnesses": ["ines", "lark"],
              "summary": "promised Mrs Duarte you would find her brooch" }
          ],
          "goto": "dawn" },
        { "id": "sit_quietly", "text": "Sit with them until the lights of the harbour show", "goto": "dawn" }
      ]
    },
    "dawn": {
      "text": "Dawn comes up the colour of dishwater. The ferry noses in against the quay and the gangway goes down with a bang. {name:hale} stands at the top of it with the passenger list. You step ashore with {var:coins} coins and a great deal less sleep.",
      "choices": [
        { "id": "go_ashore", "text": "Go ashore",
          "goto": [
            { "if": { "type": "macroCondition", "name": "greyCaught" }, "node": "the_swallow" },
            { "if": { "type": "macroCondition", "name": "jorySuspected" }, "node": "the_chain_locker" },
            { "node": "the_quay" }
          ] },
        { "id": "follow_grey", "text": "Follow the man in the grey coat down the gangway",
          "showIf": { "type": "all", "conditions": [
            { "type": "macroCondition", "name": "noticedGrey" },
            { "type": "not", "condition": { "type": "macroCondition", "name": "greyCaught" } }
          ] },
          "do": [{ "type": "remember", "concepts": ["player", "search", "grey"], "witnesses": ["grey"],
            "summary": "followed the man in the grey coat off the boat" }],
          "goto": "the_grey_coat" }
      ]
    },
    "the_swallow": {
      "ending": true,
      "text": [{ "value": [
        "The man in the grey coat goes ashore between two harbour police, still smiling, as if the whole night had been very interesting. Mrs Duarte pins the swallow back on her coat at the top of the gangway.",
        { "if": { "type": "knows", "perspective": "jory", "about": { "concepts": ["share", "jory"] } },
          "text": "Jory finds you on the quay and presses your extra coin back into your hand. 'Didn't need it,' he says. 'Good to know someone thought I might.'",
          "else": "Jory coils the mooring rope and doesn't look at anyone." },
        "\n\n",
        { "recall": { "perspective": "ines", "among": ["kind", "honest", "deceptive", "accusing"] },
          "format": "'I'll remember you,' Mrs Duarte says, 'as the one who {summary}.'" },
        { "recall": { "perspective": "lark", "among": ["kind", "honest", "deceptive", "accusing"] },
          "format": "Lark waves from her aunt's car. Years from now she will still be telling people about the passenger who {summary}." }
      ] }]
    },
    "the_chain_locker": {
      "ending": true,
      "text": [{ "value": [
        "Jory is taken off the boat between two harbour police. He looks back once, not at Hale but at the passengers, as if he wants to remember their faces. The brooch is never found.",
        { "if": { "type": "knows", "perspective": "jory", "about": { "concepts": ["accuse", "jory"] } },
          "tag": "Jory knows",
          "text": "His eyes find yours and stay there. He knows exactly who pointed at him." },
        { "if": { "type": "knows", "perspective": "hale", "about": { "concepts": ["admit"] } },
          "tag": "Hale remembers you were straight with her",
          "text": "Hale takes your name before you go. 'You were straight with me last night,' she says. 'If this goes to court, I'll want you to be straight with them.'",
          "else": "Hale doesn't ask for your name. She has already decided what kind of witness you'd make." },
        "\n\n",
        { "recall": { "perspective": "grey", "among": ["kind", "honest", "deceptive", "accusing"] },
          "format": "On the quay, the man in the grey coat tips his hat to you as he passes. He'll remember you as the one who {summary}. The swallow is in his pocket.",
          "otherwise": "On the quay, the man in the grey coat walks away whistling. The swallow is in his pocket." }
      ] }]
    },
    "the_quay": {
      "ending": true,
      "text": [{ "value": [
        "Nobody is arrested. The brooch is not found. The passengers go ashore in ones and twos, glad of ground that stays still, and by the time the sun is properly up the ferry is just a boat again.",
        { "if": { "type": "macroCondition", "name": "haleTrustsYou" },
          "text": "Hale nods to you at the gangway: the nod of one person who did their job to another.",
          "else": "Hale watches you go down the gangway the way she watched the luggage rack all night." },
        { "if": { "type": "variable", "name": "promised", "operator": "eq", "value": true },
          "text": "You promised Mrs Duarte you'd find her swallow. You didn't." },
        "\n\n",
        { "recall": { "perspective": "ines", "about": { "trait": "kind" } },
          "format": "Mrs Duarte will tell her sister about the passenger who {summary}.",
          "otherwise": "Mrs Duarte won't mention you to anyone." },
        { "recall": { "perspective": "ines", "about": { "trait": "kind" }, "rank": 2 },
          "format": "She'll mention, too, that you {summary}." }
      ] }]
    },
    "the_grey_coat": {
      "ending": true,
      "text": [{ "value": [
        "You follow the grey coat through the harbour market, past the fish stalls and the money changers, until it turns into an alley that ends at a wall. He is waiting for you there. 'You watched me all night,' he says. 'Nobody watches. That's the whole trick.'",
        { "if": { "type": "trait", "trait": "deceptive", "perspective": "grey", "min": 0.5 },
          "tag": "he saw you at the gangway",
          "text": "'You're like me,' he says, and puts the swallow in your hand. 'Sell it or give it back. Either way, you'll know what you are.'",
          "else": "He holds the swallow out on his palm. 'Give it back to her, then,' he says, 'since you're that sort.' He's gone before you can close your hand." },
        "\n\n",
        { "recall": { "perspective": "grey", "about": { "trait": "deceptive" } },
          "format": "Walking back to the quay, you realise he had been watching you as well. He knows you are the one who {summary}.",
          "otherwise": "Walking back to the quay, you realise he had been watching you as well, and found nothing he could use." }
      ] }]
    }
  }
});
