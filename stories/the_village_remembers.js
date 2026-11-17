registerStory({
  "id": "the_village_remembers",
  "title": "The Village Remembers",
  "synopsis": "In rain-soaked Brackenridge a bell rings before people disappear. Everyone you meet sees something different of you, and in a village this small, they talk.",
  "start": "arrival",
  "characters": {
    "mira": { "name": "Mira" },
    "tomas": { "name": "Tomas" },
    "anwen": { "name": "Sister Anwen" },
    "jory": { "name": "Jory" },
    "sefa": { "name": "Sefa" },
    "reeve": { "name": "The reeve" },
    "village": { "name": "Brackenridge" }
  },
  "traits": {
    "merciful": { "label": "merciful", "concepts": { "mercy": 1, "help": 1, "kindness": 0.7 } },
    "violent": { "label": "violent", "concepts": { "violence": 1.5, "threat": 1 } },
    "honest": { "label": "honest", "concepts": { "honesty": 1, "truth": 1, "confess": 1.5 } },
    "deceptive": { "label": "a liar", "concepts": { "deception": 1, "lie": 1 } },
    "greedy": { "label": "a thief", "concepts": { "greed": 1, "steal": 1.5, "bribe": 0.7 } },
    "defiant": { "label": "defiant", "concepts": { "defiance": 1, "accuse": 1 } },
    "trustworthy": { "label": "trustworthy", "concepts": { "mercy": 1, "help": 1, "honesty": 1, "confess": 1.5, "promise": 0.5 } },
    "dangerous": { "label": "dangerous", "concepts": { "violence": 1.5, "threat": 1, "deception": 1, "lie": 0.5, "steal": 1, "greed": 0.5 } }
  },
  "macros": {
    "miraAlly": { "tag": "Mira stands with you", "condition": { "type": "dominantTrait", "perspective": "mira", "among": ["trustworthy", "dangerous"], "is": "trustworthy" } },
    "anwenAlly": { "tag": "Anwen stands with you", "condition": { "type": "dominantTrait", "perspective": "anwen", "among": ["trustworthy", "dangerous"], "is": "trustworthy" } },
    "joryAlly": { "tag": "Jory stands with you", "condition": { "type": "dominantTrait", "perspective": "jory", "among": ["trustworthy", "dangerous"], "is": "trustworthy" } },
    "villageFears": { "tag": "fear", "condition": { "type": "dominantTrait", "perspective": "village", "among": ["trustworthy", "dangerous"], "is": "dangerous" } },
    "tomasDied": { "condition": { "type": "visited", "node": "river_aftermath" } },
    "tomasTrusts": { "tag": "Tomas trusts you", "condition": { "type": "trait", "perspective": "tomas", "trait": "merciful", "min": 1 } },
    "hasEvidence": { "condition": { "type": "any", "conditions": [
      { "type": "variable", "name": "has_key", "operator": "eq", "value": true },
      { "type": "variable", "name": "has_ledger", "operator": "eq", "value": true },
      { "type": "visited", "node": "traveller_reveal" }
    ] } }
  },
  "nodes": {
    "arrival": {
      "text": [{ "value": [
        "Rain follows you into Brackenridge. The village sits in a fold of land between a black forest and a river that has burst its banks and stayed burst. Smoke hangs low over forty roofs. In the middle of it all stands a bell tower with no rope, and as you reach the first house, the bell rings once.",
        "\n\n",
        "Nobody is near the tower. Nobody looks up. A woman pulling washing off a line goes very still, then carries on, faster.",
        { "if": { "type": "all", "conditions": [
            { "type": "knows", "perspective": "village", "about": { "concepts": ["player"] } },
            { "type": "macroCondition", "name": "villageFears" } ] },
          "tag": "Brackenridge remembers",
          "text": "Then she turns and sees you, and drops everything she is holding into the mud. 'It's them,' she says, to nobody, to the whole lane. 'It's them again.' Shutters close one after another all the way to the square." },
        { "if": { "type": "all", "conditions": [
            { "type": "knows", "perspective": "village", "about": { "concepts": ["player"] } },
            { "type": "not", "condition": { "type": "macroCondition", "name": "villageFears" } } ] },
          "tag": "Brackenridge remembers",
          "text": "Then she turns and sees you, and her hands stop on the pegs. 'You came back,' she says quietly, as if she isn't sure she's allowed to remember you. 'You came back.'" },
        "You have the feeling, which will not leave you, that from this moment on everything you do here will be seen by someone and repeated to someone else."
      ] }],
      "onEnter": [
        { "type": "remember", "concepts": ["brackenridge", "village", "rain", "bell", "forest", "river"] },
        { "type": "set", "variable": "visits", "value": 0 }
      ],
      "choices": [
        { "id": "market", "text": "Go to the market", "goto": "market" },
        { "id": "chapel", "text": "Visit the chapel", "goto": "chapel" },
        { "id": "river", "text": "Walk down to the river", "goto": "riverbank" },
        { "id": "inn", "text": "Find the inn", "goto": "inn" }
      ]
    },
    "crossroads": {
      "text": [
        { "if": { "type": "variable", "name": "visits", "operator": "gte", "value": 3 },
          "value": "The light is going. Somewhere ahead, in the square, a man is calling people together. There is no more time to wander." },
        { "value": "You stand where the village's four lanes meet, under the dripping eaves of a cooper's shop. The bell tower watches you over the rooftops. The afternoon is getting on." }
      ],
      "choices": [
        { "id": "x_market", "text": "Go to the market",
          "showIf": { "type": "all", "conditions": [{ "type": "not", "condition": { "type": "visited", "node": "market" } }, { "type": "variable", "name": "visits", "operator": "lt", "value": 3 }] },
          "goto": "market" },
        { "id": "x_chapel", "text": "Visit the chapel",
          "showIf": { "type": "all", "conditions": [{ "type": "not", "condition": { "type": "visited", "node": "chapel" } }, { "type": "variable", "name": "visits", "operator": "lt", "value": 3 }] },
          "goto": "chapel" },
        { "id": "x_river", "text": "Walk down to the river",
          "showIf": { "type": "all", "conditions": [{ "type": "not", "condition": { "type": "visited", "node": "riverbank" } }, { "type": "variable", "name": "visits", "operator": "lt", "value": 3 }] },
          "goto": "riverbank" },
        { "id": "x_inn", "text": "Find the inn",
          "showIf": { "type": "all", "conditions": [{ "type": "not", "condition": { "type": "visited", "node": "inn" } }, { "type": "variable", "name": "visits", "operator": "lt", "value": 3 }] },
          "goto": "inn" },
        { "id": "x_square", "text": "Go to the square", "goto": "square" }
      ]
    },
    "market": {
      "text": "The market is three stalls and a lot of mud. Mira, the baker, a broad woman with flour to the elbows, is arguing with one of the reeve's guards over a sack of flour. 'It's the tithe,' says the guard, Brannock, bored. 'It's my week's bread,' says Mira. 'It's my brother's supper.' Brannock has a hand on the sack. A few people are watching from doorways, the way people watch weather.",
      "onEnter": [{ "type": "inc", "variable": "visits" }, { "type": "remember", "concepts": ["market", "mira", "baker", "guard", "flour", "tithe"] }],
      "choices": [
        { "id": "help_mira", "text": "Help Mira carry the flour back into her shop before Brannock can take it",
          "do": [{ "type": "remember", "concepts": ["player", "help", "mercy", "kindness", "mira"], "witnesses": ["mira", "village"],
            "summary": "carried the baker's flour out of the guard's reach" }],
          "goto": "mira_thanks" },
        { "id": "steal_flour", "text": "Help yourself to a handful of flour while they argue",
          "do": [{ "type": "remember", "concepts": ["player", "steal", "greed", "flour"], "witnesses": ["village"],
            "summary": "stole flour off a stall while the baker was being robbed" }],
          "goto": "crossroads" },
        { "id": "accuse_guard", "text": "Tell Brannock, loudly, that this is extortion",
          "do": [{ "type": "remember", "concepts": ["player", "accuse", "defiance", "guard"], "witnesses": ["mira", "village", "reeve"],
            "summary": "called the reeve's guard an extortionist in the open market" }],
          "goto": "guard_warning" },
        { "id": "leave_market", "text": "It isn't your business. Walk on",
          "do": [{ "type": "remember", "concepts": ["player", "indifference", "market"], "witnesses": ["mira"],
            "summary": "watched the baker being robbed and walked on" }],
          "goto": "crossroads" }
      ]
    },
    "mira_thanks": {
      "text": "Inside the bakery it's warm and smells of yeast. Mira wipes her hands and looks at you properly for the first time. 'People here have stopped helping each other,' she says. 'Everyone's waiting to see who the bell wants next, and nobody wants to be standing near them when it decides. I won't forget this.' She means it as thanks. In Brackenridge it also sounds like a warning.",
      "choices": [
        { "id": "ask_afraid", "text": "Ask her why everyone is so afraid",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "mira", "bell"], "witnesses": ["mira"],
            "summary": "asked what the village was afraid of" }],
          "goto": "mira_secret" },
        { "id": "let_her_work", "text": "Let her get back to work",
          "goto": "crossroads" }
      ]
    },
    "mira_secret": {
      "text": "Mira lowers her voice, though there's no one else in the shop. 'The bell rings before someone goes. Not dies. Goes. One morning they're just not anyone's any more. Their family forgets the shape of their face.' She grips the edge of the counter. 'My brother Tomas heard it three nights ago. He came back. But he came back wrong. He sits at the river all day. He won't tell me what he did.'",
      "choices": [
        { "id": "promise_tomas", "text": "Promise her you'll find Tomas and help him",
          "do": [{ "type": "remember", "concepts": ["player", "promise", "help", "mira", "tomas"], "witnesses": ["mira"],
            "summary": "promised to help the baker's brother" }],
          "goto": "crossroads" },
        { "id": "superstition", "text": "Tell her it's superstition, and grief",
          "do": [{ "type": "remember", "concepts": ["player", "dismiss", "mira", "bell"], "witnesses": ["mira"],
            "summary": "called the bell a superstition" }],
          "goto": "crossroads" }
      ]
    },
    "guard_warning": {
      "text": "Brannock lets go of the sack and steps close enough that you can smell his breakfast. 'Careful, stranger,' he says pleasantly. 'The reeve dislikes questions. He dislikes them so much that people who ask them tend to stop.' Behind him, Mira has dragged the flour inside and is watching you through the bakery window with her mouth open.",
      "choices": [
        { "id": "back_down", "text": "Raise your hands and back away",
          "do": [{ "type": "remember", "concepts": ["player", "yield", "guard"], "witnesses": ["village"],
            "summary": "backed down from the reeve's guard" }],
          "goto": "crossroads" },
        { "id": "stand_ground", "text": "Stand your ground, and tell him you'll ask as many questions as you like",
          "do": [{ "type": "remember", "concepts": ["player", "defiance", "threat", "guard"], "witnesses": ["village", "reeve", "mira"],
            "summary": "squared up to the reeve's guard in the market" }],
          "goto": "crossroads" }
      ]
    },
    "chapel": {
      "text": "The chapel smells of wet stone and old candle smoke. Water drips somewhere behind the altar. Sister Anwen, a small, sharp woman in a habit gone grey at the hem, is binding a cracked statue of a saint with a strip of linen, as if setting a broken arm. The saint has no face; it's been worn smooth by hands.",
      "onEnter": [{ "type": "inc", "variable": "visits" }, { "type": "remember", "concepts": ["chapel", "anwen", "statue", "candles"] }],
      "choices": [
        { "id": "help_statue", "text": "Hold the statue steady while she binds it",
          "do": [{ "type": "remember", "concepts": ["player", "help", "kindness", "anwen"], "witnesses": ["anwen"],
            "summary": "held the broken saint steady while it was bound" }],
          "goto": "anwen_trust" },
        { "id": "ask_bell", "text": "Ask her about the bell",
          "goto": "anwen_bell" },
        { "id": "take_candle", "text": "Take a candle from the rack without asking, for the dark later",
          "do": [{ "type": "remember", "concepts": ["player", "steal", "greed", "candle", "anwen"], "witnesses": ["anwen"],
            "summary": "pocketed a chapel candle when you thought nobody was looking" }],
          "goto": "anwen_bell" }
      ]
    },
    "anwen_trust": {
      "text": "Anwen ties off the linen and studies you over it. 'Kindness is scarce here,' she says. 'It makes people suspicious. You'll learn.' She nods at the tower through the window. 'They'll tell you the bell is a warning. It isn't, exactly. It's an invitation. It asks you to give it something. Most people say yes eventually.'",
      "choices": [
        { "id": "invitation", "text": "Ask her: an invitation to what?", "goto": "anwen_bell" },
        { "id": "leave_pray", "text": "Leave her to her prayers", "goto": "chapel_exit" }
      ]
    },
    "anwen_bell": {
      "text": [
        { "value": [
          "'The bell takes names,' Anwen says. 'You give it a name, yours or someone else's, and in return it gives you what you want most. Bread in a famine. Forgetting, in grief. Then the person whose name you gave stops being anyone. And the bell keeps the name, and uses it to call the next one.'",
          "She looks at you steadily. 'It rings loudest for people who have broken a promise. It rings for the thing you most wish you hadn't done.'",
          { "if": { "type": "knows", "perspective": "anwen", "about": { "concepts": ["candle"] } },
            "text": "Her eyes go, briefly, to your coat pocket." }
        ] }
      ],
      "choices": [
        { "id": "confess_lie", "text": "Tell her about a lie you once told, and who it hurt",
          "do": [{ "type": "remember", "concepts": ["player", "confess", "honesty", "anwen"], "witnesses": ["anwen"],
            "summary": "confessed an old lie in the chapel without being asked" }],
          "goto": "chapel_exit" },
        { "id": "no_secrets", "text": "Tell her you have no secrets",
          "do": [{ "type": "remember", "concepts": ["player", "lie", "deception", "anwen"], "witnesses": ["anwen"],
            "summary": "claimed in the chapel that you had no secrets" }],
          "goto": "chapel_exit" }
      ]
    },
    "chapel_exit": {
      "text": "The chapel door closes softly behind you. Through the rain you can see Anwen at the window, already talking to an old woman who has come to light a candle. They both glance your way.",
      "onEnter": [{ "type": "gossip", "from": "anwen", "to": ["village"], "belief": 0.5 }],
      "choices": [{ "id": "chapel_on", "text": "Go back to the crossroads", "goto": "crossroads" }]
    },
    "riverbank": {
      "text": "The river has swallowed half the old footbridge. What's left juts out over the brown water like a broken jaw. A young man sits on a stone at the end of it, staring into the current. He's soaked through and doesn't seem to notice. His hands are trembling. On the far bank, two women stop beating laundry to watch you approach.",
      "onEnter": [{ "type": "inc", "variable": "visits" }, { "type": "remember", "concepts": ["river", "footbridge", "tomas"] }],
      "choices": [
        { "id": "sit_listen", "text": "Sit down beside him, and wait",
          "do": [{ "type": "remember", "concepts": ["player", "mercy", "kindness", "tomas"], "witnesses": ["tomas"],
            "summary": "sat beside a frightened man at the river and waited until he was ready" }],
          "goto": "tomas_story" },
        { "id": "demand", "text": "Demand to know what happened to him",
          "do": [{ "type": "remember", "concepts": ["player", "threat", "tomas"], "witnesses": ["tomas"],
            "summary": "stood over a frightened man at the river and demanded answers" }],
          "goto": "tomas_story" },
        { "id": "push", "text": "Push him into the river",
          "do": [{ "type": "remember", "concepts": ["player", "violence", "tomas", "death", "river"], "witnesses": ["village"], "strength": 3,
            "summary": "pushed the baker's brother into the flood" }],
          "goto": "river_aftermath" }
      ]
    },
    "tomas_story": {
      "text": [
        { "if": { "type": "macroCondition", "name": "tomasTrusts" },
          "value": "Tomas looks up when he's ready, which takes a long time. 'I heard my own voice from the bell tower,' he says. 'Three nights ago. It said: bring me a name, and you'll never be hungry again. We've been hungry since the tithe went up.' He watches your face for a flinch. When there isn't one, he keeps going. 'I gave it my mother's name. Elian. Now Mira can't remember her. I can. I'm the only one who can.'" },
        { "value": "Tomas looks up at last, wary as a kicked dog. 'I heard my own voice from the bell tower,' he says. 'It told me to bring it a name. I gave it my mother's.' He stops there. Your questions have got an answer out of him, but not his trust." }
      ],
      "choices": [
        { "id": "make_right", "text": "Tell him it isn't too late to make it right",
          "do": [{ "type": "remember", "concepts": ["player", "mercy", "truth", "tomas"], "witnesses": ["tomas"],
            "summary": "said it wasn't too late to make things right" }],
          "goto": "tomas_clue" },
        { "id": "ask_mother", "text": "Ask him about his mother",
          "do": [{ "type": "remember", "concepts": ["player", "kindness", "elian", "tomas"], "witnesses": ["tomas"],
            "summary": "asked about Elian, and listened" }],
          "goto": "tomas_clue" },
        { "id": "promise_silence", "text": "Promise him you won't tell a soul",
          "do": [{ "type": "remember", "concepts": ["player", "promise", "secret", "tomas"], "witnesses": ["tomas"],
            "summary": "promised to keep the baker's brother's secret" }],
          "goto": "tomas_clue" }
      ]
    },
    "tomas_clue": {
      "text": [
        { "if": { "type": "association", "a": "player", "b": "truth", "min": 1 }, "tag": "what you told Tomas",
          "value": "Tomas takes a small iron key from around his neck. 'The old records are under the tower. The reeve keeps the door locked. Every bargain's written down there.' He presses it into your palm. 'Telling the truth won't bring her back. But it might stop him using her name to call someone else.'" },
        { "if": { "type": "association", "a": "player", "b": "elian", "min": 1 }, "tag": "you asked about Elian",
          "value": "After a long silence, Tomas takes a small iron key from around his neck. 'Her name was Elian,' he says again, as if practising. 'She sang when she kneaded bread. The records are under the tower; this opens them. Put her name back in the book if you can. Don't let her be a rumour.'" },
        { "value": "Tomas takes a small iron key from around his neck and gives it to you. 'I trust you to keep this quiet,' he says. 'The records are under the tower.' You realise, as you pocket it, that a promise of silence protects the reeve as much as it protects Tomas." }
      ],
      "onEnter": [{ "type": "set", "variable": "has_key", "value": true }],
      "choices": [{ "id": "thank_tomas", "text": "Thank him, and go", "goto": "crossroads" }]
    },
    "river_aftermath": {
      "text": "Tomas goes under without a sound, which is somehow the worst thing. The river takes him and doesn't give him back. On the far bank the laundry women are screaming. One of them is already running up the lane toward the houses, shouting a description of you that is very accurate.\n\nBy evening, every person in Brackenridge will know what you did. In a village like this one, they will remember it for a hundred years.",
      "onEnter": [{ "type": "gossip", "from": "village", "to": ["mira", "anwen", "jory", "reeve"], "about": { "concepts": ["death"] }, "belief": 1 }],
      "choices": [{ "id": "flee_river", "text": "Get away from the river", "goto": "crossroads" }]
    },
    "inn": {
      "text": "The Drowned Hart is warm and crowded and nobody is talking above a mutter. The innkeeper, Jory, is a lean man with a dishcloth over his shoulder and the eyes of someone who has made a living from noticing things. In the corner, a traveller in a red scarf sits alone by the fire, with a full cup she hasn't touched. On the desk by the door sits a thick ledger bound in cracked leather.",
      "onEnter": [{ "type": "inc", "variable": "visits" }, { "type": "remember", "concepts": ["inn", "jory", "traveller", "ledger"] }],
      "choices": [
        { "id": "ask_jory", "text": "Ask Jory about the village", "goto": "jory_story" },
        { "id": "traveller", "text": "Sit down with the traveller", "goto": "traveller_story" },
        { "id": "steal_ledger", "text": "Slip the ledger under your coat while Jory's back is turned",
          "do": [{ "type": "remember", "concepts": ["player", "steal", "deception", "ledger"], "witnesses": ["sefa"],
            "summary": "stole the innkeeper's ledger off the desk" }, { "type": "set", "variable": "has_ledger", "value": true }],
          "goto": "inn_exit" }
      ]
    },
    "jory_story": {
      "text": "Jory polishes a cup that is already clean. 'The reeve's been buying names,' he says, without looking up. 'From desperate people. Bread for a name, rent for a name. He takes them to the tower. He calls it the tithe.' He sets the cup down. 'A name's worth more than gold in Brackenridge. Cheaper too, if you're the one buying.'",
      "choices": [
        { "id": "ask_ledger", "text": "Ask about the ledger on the desk",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "honesty", "jory"], "witnesses": ["jory"],
            "summary": "asked the innkeeper straight out about his ledger" }],
          "goto": "ledger_clue" },
        { "id": "bribe_jory", "text": "Put a coin on the bar and ask what else he knows",
          "do": [{ "type": "remember", "concepts": ["player", "bribe", "jory"], "witnesses": ["jory"],
            "summary": "tried to buy the innkeeper's secrets with a coin" }],
          "goto": "ledger_clue" }
      ]
    },
    "ledger_clue": {
      "text": [
        { "if": { "type": "knows", "perspective": "jory", "about": { "concepts": ["bribe"] } },
          "value": "Jory pockets the coin without comment. 'The ledger's a copy,' he says. 'Every bargain made at the tower, in my own hand, because somebody ought to keep count. I don't sell it. But I'll trade. My sign's been hanging off one hinge since the storm. Fix it, and I'll tell you something worth more than that coin.'" },
        { "value": "'It's a copy,' Jory says. 'Every bargain made at the tower, in my own hand, because somebody ought to keep count.' He looks at you for a long moment. 'I'll help you, if you help me first. My sign's been hanging off one hinge since the storm, and the reeve won't lend me a ladder.'" }
      ],
      "choices": [
        { "id": "fix_sign", "text": "Climb up in the rain and fix his sign",
          "do": [{ "type": "remember", "concepts": ["player", "help", "kindness", "jory"], "witnesses": ["jory", "village"],
            "summary": "climbed a ladder in the rain to fix the inn's sign" }],
          "goto": "jory_helped" },
        { "id": "refuse_jory", "text": "Refuse. You didn't come here to do odd jobs",
          "goto": "inn_exit" }
      ]
    },
    "jory_helped": {
      "text": "When you come back in, dripping, Jory slides a folded paper across the bar: a charcoal rubbing of a lock. 'The tower door,' he says. 'Took it last winter, the night the reeve was drunk. The key's old. The lock's older. A patient person could manage without either.' Then, quieter: 'I'll be in the square tonight. If it comes to it.'",
      "onEnter": [{ "type": "set", "variable": "has_rubbing", "value": true }],
      "choices": [{ "id": "thank_jory", "text": "Thank him", "goto": "inn_exit" }]
    },
    "traveller_story": {
      "text": "The traveller's name is Sefa. She came to Brackenridge, she says, to forget her sister. 'There's a story that the bell takes grief, if you give it a name. I had a name I wanted rid of.' She turns the cup in her hands. 'The bell made sure I remembered. Every night it rings, I remember more.'",
      "choices": [
        { "id": "share_memory", "text": "Tell her about someone you've lost",
          "do": [{ "type": "remember", "concepts": ["player", "honesty", "confess", "sefa"], "witnesses": ["sefa"],
            "summary": "told a stranger by the fire about someone you'd lost" }],
          "goto": "traveller_reveal" },
        { "id": "demand_name", "text": "Tell her you want her real name and her real business",
          "do": [{ "type": "remember", "concepts": ["player", "threat", "sefa"], "witnesses": ["sefa"],
            "summary": "interrogated a grieving stranger by the fire" }],
          "goto": "traveller_reveal" }
      ]
    },
    "traveller_reveal": {
      "text": [
        { "if": { "type": "trait", "perspective": "sefa", "trait": "honest", "min": 1 },
          "value": "Sefa is quiet for a long time. Then: 'My sister's name was Elsbet. She came here twelve years ago, in the famine, and married the reeve. She had a daughter. And then the bell had her name, and the daughter's, and nobody here remembers either of them except him. I found her in his ledger.' She looks at the fire. 'The bell doesn't steal people. People give them away. It just keeps them, and uses their names to call more.'" },
        { "value": "Sefa looks at you as if you've confirmed something. 'The bell doesn't steal people,' she says flatly. 'People give them away. It keeps the names it's given and uses them to call more. That's all you need to know.' She gets up and leaves her cup on the hearth, still full." }
      ],
      "choices": [{ "id": "how_tower", "text": "Ask her how to reach the tower", "goto": "inn_exit" }]
    },
    "inn_exit": {
      "text": "The fire sinks low. The red-scarfed traveller has gone. Jory is talking in a low voice to two farmers at the bar, and when you pass, all three of them stop.",
      "onEnter": [
        { "type": "gossip", "from": "jory", "to": ["village"], "belief": 0.6 },
        { "type": "gossip", "from": "sefa", "to": ["jory"], "about": { "concepts": ["ledger"] }, "belief": 1 }
      ],
      "choices": [{ "id": "inn_on", "text": "Go back out into the rain", "goto": "crossroads" }]
    },
    "square": {
      "text": [
        { "value": [
          "At dusk the reeve addresses a crowd in the square. He is a tall, tired man called Aldous Crane, in a good coat gone shabby at the cuffs, and he speaks about the tithe and the flood and patience in a voice like someone reading a will. The bell tower rises behind him, black against the last of the light.",
          "Then he sees you. 'Our visitor,' he says, and the crowd turns. 'I'm told you've been asking questions.'",
          { "if": { "type": "macroCondition", "name": "tomasDied" },
            "text": "Somebody in the crowd shouts the word murderer. Nobody tells them to be quiet." }
        ] }
      ],
      "onEnter": [{ "type": "gossip", "from": "mira", "to": ["village"], "belief": 0.7 }, { "type": "gossip", "from": "village", "to": ["reeve"], "belief": 0.8 }],
      "choices": [
        { "id": "tell_truth", "text": "Tell him, and all of them, what you've learned",
          "do": [{ "type": "remember", "concepts": ["player", "honesty", "truth", "reeve"], "witnesses": ["village", "reeve"],
            "summary": "told the whole square what you'd learned about the bell" }],
          "goto": "reeve_response" },
        { "id": "pretend", "text": "Smile, and say you're only a traveller passing through",
          "do": [{ "type": "remember", "concepts": ["player", "lie", "deception", "reeve"], "witnesses": ["village", "reeve"],
            "summary": "claimed in the square that you were only passing through" }],
          "goto": "reeve_response" },
        { "id": "accuse_reeve", "text": "Accuse him, in front of everyone, of selling their names",
          "do": [{ "type": "remember", "concepts": ["player", "accuse", "defiance", "reeve"], "witnesses": ["village", "reeve"],
            "summary": "accused the reeve in front of the whole village" }],
          "goto": "reeve_response" },
        { "id": "say_nothing", "text": "Say nothing at all",
          "do": [{ "type": "remember", "concepts": ["player", "silence", "reeve"], "witnesses": ["village", "reeve"],
            "summary": "stood silent in the square when the reeve asked" }],
          "goto": "reeve_response" }
      ]
    },
    "reeve_response": {
      "text": [
        { "value": [
          { "if": { "type": "macroCondition", "name": "tomasDied" },
            "text": "The reeve watches the crowd turn from you to him and back again. 'You see?' he says to them softly. 'This is what strangers bring.' Your choices have given him a warning, and they have also put your own hands into the story.",
            "else": "" },
          { "if": { "type": "all", "conditions": [{ "type": "not", "condition": { "type": "macroCondition", "name": "tomasDied" } }, { "type": "macroCondition", "name": "hasEvidence" }] },
            "text": "The reeve's eyes drop to your coat, as if he can see through it to what you're carrying. He falters. The crowd begins to murmur." },
          { "recall": { "perspective": "village", "among": ["merciful", "violent", "honest", "deceptive", "greedy", "defiant"] },
            "format": "Someone near the front says it out loud, the thing the village has already decided about you: this is the one who {summary}." },
          { "if": { "type": "macroCondition", "name": "villageFears" },
            "text": "People step back from you. Not far. Just enough.",
            "else": "Nobody steps back. A few people, you notice, have edged closer." },
          { "if": { "type": "trait", "perspective": "reeve", "trait": "deceptive", "min": 1 },
            "text": "The reeve studies your face. He recognises the careful shape of a lie; he's worn it himself for twelve years." }
        ] }
      ],
      "choices": [
        { "id": "to_tower", "text": "Turn your back on him and walk to the bell tower", "goto": "tower_gate" },
        { "id": "ask_crowd", "text": "Ask the villagers to stand with you", "goto": "crowd" },
        { "id": "alleys", "text": "Slip away into the alleys before his guards can move", "goto": "alleys" }
      ]
    },
    "crowd": {
      "text": [
        { "value": [
          "You ask them. For a long moment, nobody moves.",
          { "if": { "type": "macroCondition", "name": "miraAlly" },
            "text": "Then Mira pushes through from the back, flour still on her arms. 'This one helped me,' she says. 'When none of you would.'",
            "else": "Mira is there, near the bakery. She looks at you, and then down at her feet." },
          { "if": { "type": "macroCondition", "name": "anwenAlly" },
            "text": "Sister Anwen steps out from the chapel porch and comes to stand at your left shoulder without saying anything.",
            "else": "Sister Anwen stays in the chapel porch with her hands folded." },
          { "if": { "type": "macroCondition", "name": "joryAlly" },
            "text": "Jory leans in the door of the Drowned Hart, then sighs, tosses his dishcloth onto a barrel, and walks over. 'If it comes to it,' he says.",
            "else": "Jory shuts the door of the Drowned Hart, and you hear the bar go across." }
        ] }
      ],
      "choices": [
        { "id": "mira_speaks", "text": "Ask Mira to speak",
          "showIf": { "type": "macroCondition", "name": "miraAlly" },
          "do": [{ "type": "set", "variable": "ally", "value": "mira" }, { "type": "remember", "concepts": ["mira", "speaks", "elian", "village"], "witnesses": ["village", "reeve"] }],
          "goto": "ally_speaks" },
        { "id": "anwen_speaks", "text": "Ask Anwen to speak",
          "showIf": { "type": "macroCondition", "name": "anwenAlly" },
          "do": [{ "type": "set", "variable": "ally", "value": "anwen" }, { "type": "remember", "concepts": ["anwen", "speaks", "bell", "village"], "witnesses": ["village", "reeve"] }],
          "goto": "ally_speaks" },
        { "id": "jory_speaks", "text": "Ask Jory to speak",
          "showIf": { "type": "macroCondition", "name": "joryAlly" },
          "do": [{ "type": "set", "variable": "ally", "value": "jory" }, { "type": "remember", "concepts": ["jory", "speaks", "ledger", "village"], "witnesses": ["village", "reeve"] }],
          "goto": "ally_speaks" },
        { "id": "go_alone", "text": "Go to the tower alone",
          "do": [{ "type": "remember", "concepts": ["player", "alone", "tower"], "witnesses": ["village"],
            "summary": "walked to the tower alone" }],
          "goto": "tower_gate" }
      ]
    },
    "ally_speaks": {
      "text": [
        { "if": { "type": "variable", "name": "ally", "operator": "eq", "value": "mira" },
          "value": "Mira stands on the edge of the well so everyone can see her. 'My brother gave the bell our mother's name,' she says. 'Tomas told me tonight. I can't remember her face. Can any of you remember yours? Your sisters? Your children?' A sound goes through the crowd like wind through barley. Behind you, someone begins to cry, and then several people." },
        { "if": { "type": "variable", "name": "ally", "operator": "eq", "value": "anwen" },
          "value": "Anwen doesn't raise her voice; she doesn't need to. 'For twelve years I have buried people who were not dead,' she says. 'I have said prayers over empty beds because the families could not remember who had slept in them. I let you call it the tithe. I was afraid. I am finished being afraid.' The reeve takes a step back." },
        { "value": "Jory holds up his ledger, or the place where his ledger should be, and recites from memory. 'Hesketh, for rent. Old Alys, for medicine. Elian, for bread.' He goes on. He has every one. The reeve's face goes grey. People are saying names back to Jory now, names they didn't know they'd forgotten." }
      ],
      "onEnter": [{ "type": "set", "variable": "crowd_rose", "value": true }],
      "choices": [{ "id": "ally_tower", "text": "Go to the tower with them at your back", "goto": "tower_gate" }]
    },
    "alleys": {
      "text": [{ "value": [
        "You lose the guards in the alleys behind the tannery, in the smell of lye and rot. The bell rings again. This time, under the bronze, you hear a voice in it. It is saying your name. You've never told anyone in Brackenridge your name.",
        { "recall": { "among": ["violent", "deceptive", "greedy"] }, "tag": "the bell",
          "format": "Then, in your own voice, it says the thing you most wish you hadn't done, loud enough for every shuttered window to hear: 'You {summary}.'",
          "otherwise": "Then it stops, as if it had expected to have more to say about you, and was disappointed." }
      ] }],
      "choices": [
        { "id": "follow_sound", "text": "Follow the sound", "goto": "tower_gate" },
        { "id": "hide_dawn", "text": "Hide in a woodshed until dawn",
          "do": [{ "type": "remember", "concepts": ["player", "hide", "fear"], "summary": "hid in a woodshed while the bell called your name" }],
          "goto": "dawn" }
      ]
    },
    "dawn": {
      "text": "At dawn the village is quiet in a way that feels deliberate. Nobody has opened their shutters. When you come out of the woodshed, stiff with cold, you can see the bell tower from the end of the lane, and its iron door is standing open, as if it got tired of waiting for you.",
      "choices": [{ "id": "enter_dawn", "text": "Go in", "goto": "tower_inside" }]
    },
    "tower_gate": {
      "text": "The tower door is oak bound in iron, swollen with rain. In the middle is a lock as big as your two hands, with a narrow slot for a narrow, old key.",
      "choices": [
        { "id": "use_key", "text": "Use Tomas's iron key",
          "showIf": { "type": "variable", "name": "has_key", "operator": "eq", "value": true },
          "goto": "tower_inside" },
        { "id": "pick_lock", "text": "Use Jory's rubbing to work the lock",
          "showIf": { "type": "variable", "name": "has_rubbing", "operator": "eq", "value": true },
          "goto": "tower_inside" },
        { "id": "break_door", "text": "Break the door down",
          "do": [{ "type": "remember", "concepts": ["player", "violence", "tower", "door"], "witnesses": ["village", "reeve"],
            "summary": "broke down the tower door" }],
          "goto": "tower_inside" },
        { "id": "other_entrance", "text": "Search the base of the tower for another way in", "goto": "crypt" }
      ]
    },
    "crypt": {
      "text": "Round the back, half-hidden by nettles, steps lead down into a flooded crypt. You wade in up to the knee. The walls are carved with names, hundreds, the newest still pale in the stone. One of them is Elsbet. Beside it, small, a child's name: Wren. And near the end, so fresh the dust hasn't settled in the letters: Elian.",
      "onEnter": [{ "type": "remember", "concepts": ["crypt", "names", "elsbet", "elian"] }],
      "choices": [
        { "id": "copy_names", "text": "Copy every name into your notebook",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "names", "record"],
            "summary": "copied every name from the crypt wall" }, { "type": "set", "variable": "names_copied", "value": true }],
          "goto": "tower_inside" },
        { "id": "speak_names", "text": "Speak each name aloud, one by one",
          "do": [{ "type": "remember", "concepts": ["player", "mercy", "names", "release"],
            "summary": "stood in the crypt and spoke every name aloud" }, { "type": "set", "variable": "names_spoken", "value": true }],
          "goto": "tower_inside" }
      ]
    },
    "tower_inside": {
      "text": [
        { "value": [
          "Inside, the bell hangs over a mechanism of brass rings, dozens of them, nested like the inside of a clock. Each ring is engraved with a name. They turn very slowly, though nothing drives them. The reeve is standing beside a lectern with a book bound in black leather open on it.",
          { "if": { "type": "variable", "name": "crowd_rose", "operator": "eq", "value": true },
            "text": "Through the open door behind you, you can hear the crowd at the foot of the tower, saying names.",
            "else": "Behind you the door has swung shut. It's just the two of you, and the bell." },
          { "if": { "type": "variable", "name": "names_spoken", "operator": "eq", "value": true },
            "text": "Several of the rings have stopped turning." }
        ] }
      ],
      "choices": [
        { "id": "take_book", "text": "Take the book from the lectern",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "book", "reeve"], "witnesses": ["reeve"],
            "summary": "took the black book from the lectern" }],
          "goto": "reeve_confrontation" },
        { "id": "ask_why", "text": "Ask him why he did it",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "mercy", "reeve"], "witnesses": ["reeve"],
            "summary": "asked the reeve why, and listened to the whole answer" }],
          "goto": "reeve_confrontation" },
        { "id": "attack_reeve", "text": "Attack him",
          "do": [{ "type": "remember", "concepts": ["player", "violence", "reeve"], "witnesses": ["reeve"], "strength": 2,
            "summary": "attacked the reeve in the bell tower" }],
          "goto": "reeve_confrontation" },
        { "id": "touch_bell", "text": "Put your hand on the bell", "goto": "bell_vision" }
      ]
    },
    "bell_vision": {
      "text": "The bronze is warm, like skin. The bell shows you something that isn't yours. A famine winter, twelve years ago. A younger Aldous Crane kneeling in this room with his wife's hand in his, her name already on his lips, and their daughter asleep in a shawl on the floor. The village was eating bark. The bell promised bread. He said two names. The bread came. Every year since, the bell has needed more, and he has fed it, so that nobody will ever know what he paid first.",
      "onEnter": [{ "type": "remember", "concepts": ["player", "vision", "elsbet", "famine", "reeve"] }],
      "choices": [
        { "id": "understand_grief", "text": "Tell him you understand his grief",
          "do": [{ "type": "remember", "concepts": ["player", "mercy", "kindness", "reeve"], "witnesses": ["reeve"],
            "summary": "said you understood the reeve's grief" }],
          "goto": "reeve_confrontation" },
        { "id": "no_excuse", "text": "Tell him his grief doesn't excuse a single name",
          "do": [{ "type": "remember", "concepts": ["player", "honesty", "accuse", "reeve"], "witnesses": ["reeve"],
            "summary": "said grief excused nothing" }],
          "goto": "reeve_confrontation" }
      ]
    },
    "reeve_confrontation": {
      "text": [
        { "if": { "type": "macroCondition", "name": "tomasDied" },
          "value": "The reeve looks past you, out of the slit window, toward the square where people are still saying Tomas's name. 'You know what this village does to people who give it a name?' he says. 'They'll do it to you now. And they'll be right.' The truth is within your reach. So is the cost of how you got here." },
        { "if": { "type": "trait", "perspective": "reeve", "trait": "violent", "min": 2 },
          "value": "The reeve backs against the brass rings with blood at his mouth and reaches for the bell's clapper with both hands. He believes force is the only language left to him; you have just taught him that again." },
        { "if": { "type": "dominantTrait", "perspective": "reeve", "among": ["merciful", "violent", "honest", "deceptive"], "is": "merciful" },
          "value": "The reeve sits down on the steps of the lectern as if his legs have stopped working. 'You came here to stop me,' he says. 'Not to punish me. I didn't know there was a difference any more.' He looks up at the bell. 'Elsbet,' he says, very quietly, for the first time in twelve years." },
        { "if": { "type": "trait", "perspective": "reeve", "trait": "deceptive", "min": 1 },
          "value": "The reeve looks at you the way one liar looks at another: with a kind of tired recognition. 'Neither of us is what we told them,' he says. 'So. What do you want? Everyone who comes up here wants something.'" },
        { "value": "The reeve waits, his hand resting on the black book, for you to make the first move." }
      ],
      "choices": [
        { "id": "destroy_bell", "text": "Destroy the bell", "goto": "ending_destroy" },
        { "id": "release_names", "text": "Release every name", "goto": "ending_release" },
        { "id": "take_control", "text": "Take hold of the bell yourself", "goto": "ending_control" },
        { "id": "offer_name", "text": "Offer the bell your own name, in exchange for all of theirs", "goto": "ending_sacrifice" }
      ]
    },
    "ending_destroy": {
      "text": "You take a stone from the window ledge and bring it down on the bell's lip with everything you have. The sound cracks the clouds. Every name in the rings comes loose at once, a sound like a flock of birds leaving a field, and the tower begins to come apart around you, brass and timber and stone.",
      "choices": [
        { "id": "help_escape", "text": "Get everyone out: the reeve, the crowd at the door, anyone",
          "do": [{ "type": "remember", "concepts": ["player", "help", "mercy", "tower"], "witnesses": ["village", "reeve"],
            "summary": "went back into the falling tower for the people still inside" }],
          "goto": "final_free" },
        { "id": "save_self", "text": "Run",
          "do": [{ "type": "remember", "concepts": ["player", "flee", "tower"], "witnesses": ["village"],
            "summary": "ran from the falling tower and didn't look back" }],
          "goto": "final_cost" }
      ]
    },
    "ending_release": {
      "text": "You open the black book and read the names aloud, the way Jory would have, the way Elian would have wanted. One by one, the brass rings turn and stop and fall silent. Outside, at the foot of the tower, somebody gasps, and then somebody else, and then you hear a woman say 'Mother?' as if she's just remembered she had one. The bell grows quiet as the names return to the people who gave them away.",
      "choices": [
        { "id": "comfort_reeve", "text": "Sit down beside the reeve",
          "do": [{ "type": "remember", "concepts": ["player", "mercy", "kindness", "reeve"], "witnesses": ["reeve", "village"],
            "summary": "sat beside the reeve while the names came home" }],
          "goto": "final_reconcile" },
        { "id": "leave_reeve", "text": "Leave him to face the village",
          "do": [{ "type": "remember", "concepts": ["player", "justice", "reeve"], "witnesses": ["reeve"],
            "summary": "left the reeve to answer to the village" }],
          "goto": "final_free" }
      ]
    },
    "ending_control": {
      "text": "You put both hands on the bronze. The bell accepts you. You feel every name in Brackenridge at once, like knowing where every coin in your purse is. You could call any of them. You could call anyone. Below, the village has fallen absolutely silent, waiting to hear what you'll do.",
      "choices": [
        { "id": "rule", "text": "Keep it. Somebody has to, and you'll do it better than he did",
          "do": [{ "type": "remember", "concepts": ["player", "greed", "control", "bell"], "witnesses": ["village", "reeve"],
            "summary": "took the bell for yourself" }],
          "goto": "final_rule" },
        { "id": "ring_once", "text": "Ring it once, for all of them, and take your hands away",
          "do": [{ "type": "remember", "concepts": ["player", "mercy", "release", "bell"], "witnesses": ["village", "reeve"],
            "summary": "rang the bell once and let it go" }],
          "goto": "final_free" }
      ]
    },
    "ending_sacrifice": {
      "text": "You say your name to the bell. The bell takes it. For a moment you are nobody. The reeve looks at you and frowns slightly, the way you'd frown at a coat left on a chair. Then every ring in the mechanism spins loose at once, and the names pour out of the tower like water out of a broken dam.",
      "choices": [
        { "id": "accept_forgotten", "text": "Let them forget you",
          "do": [
            { "type": "remember", "concepts": ["player", "mercy", "sacrifice", "name"], "summary": "gave the bell your own name" },
            { "type": "doubt", "to": "all", "about": { "concepts": ["player"] }, "belief": 0.1 }
          ],
          "goto": "final_sacrifice" }
      ]
    },
    "final_free": {
      "ending": true,
      "text": [{ "value": [
        "Brackenridge wakes the next morning to a sky with no bell in it. People walk around touching doorframes and saying names. The tithe stops. It will take a generation for anyone to trust the quiet.",
        { "if": { "type": "macroCondition", "name": "tomasDied" },
          "text": "They let you leave. Nobody stops you, and nobody says goodbye. Tomas's name is carved on the new stone by the river, and under it, without a name, a line about the stranger who came the year the bell broke.",
          "else": "" },
        { "if": { "type": "all", "conditions": [{ "type": "not", "condition": { "type": "macroCondition", "name": "tomasDied" } }, { "type": "macroCondition", "name": "tomasTrusts" }] },
          "text": "Tomas walks you to the edge of the village. He has started singing when he works, he tells you, one of his mother's songs. He's not very good. He sings it anyway." },
        "\n\n",
        { "recall": { "perspective": "mira", "among": ["merciful", "violent", "honest", "deceptive", "greedy", "defiant"] },
          "format": "Mira tells the story at the bakery counter for the rest of her life. In her version, you're the one who {summary}." },
        { "recall": { "perspective": "jory", "among": ["merciful", "violent", "honest", "deceptive", "greedy", "defiant"] },
          "format": "Jory writes one last entry in his ledger: a stranger who {summary}." },
        { "recall": { "perspective": "village", "about": { "concepts": ["reeve"] } },
          "format": "The village will tell it differently for generations. Most versions agree on one thing: when it came to the reeve, you {summary}." }
      ] }]
    },
    "final_cost": {
      "ending": true,
      "text": [{ "value": [
        { "if": { "type": "variable", "name": "crowd_rose", "operator": "eq", "value": true },
          "text": "You get out. The tower doesn't, and neither do all of the people who followed you to its door. The names come home to Brackenridge on the same night that three families lose someone under the stones, and the village never quite separates the two in its memory.",
          "else": "You get out. The tower doesn't, and neither does the reeve. The names come home to Brackenridge on the same night its reeve dies under the stones, alone with his book, and the village never quite separates the two in its memory." },
        { "if": { "type": "variable", "name": "crowd_rose", "operator": "eq", "value": true },
          "text": "The people who stood with you at the foot of the tower were the ones closest to the door. You find out their names afterwards. You make yourself learn them." },
        "\n\n",
        { "recall": { "perspective": "anwen", "among": ["merciful", "violent", "honest", "deceptive", "greedy", "defiant"] },
          "format": "Sister Anwen says the funeral prayers. When someone asks her about the stranger, she says only that you {summary}, and lets them make of it what they will." },
        { "recall": { "perspective": "village", "about": { "concepts": ["reeve"] } },
          "format": "Your choices are remembered unevenly. But everyone agrees that when it came to the reeve, you {summary}." }
      ] }]
    },
    "final_reconcile": {
      "ending": true,
      "text": [{ "value": [
        "The reeve weeps, and keeps weeping, and nobody comes up the stairs to stop him. In the morning he walks down into the square and says his wife's name, and his daughter's, and then every other name in the book, in order, to the faces of the people he took them from. Brackenridge does not forgive him. It begins the harder, slower work of understanding what happened, and who let it.",
        "Mira opens the bakery at sunrise. She remembers her mother's face now, and she makes Elian's bread, the plaited kind, and gives it away all morning.",
        "\n\n",
        { "if": { "type": "variable", "name": "names_copied", "operator": "eq", "value": true },
          "text": "You leave your notebook with Anwen: every name from the crypt wall, in your handwriting. She puts it on the altar, where the faceless saint used to stand." },
        { "recall": { "perspective": "reeve", "among": ["merciful", "violent", "honest", "deceptive", "greedy", "defiant"] },
          "format": "Years later, an old man in a shabby coat tells a child about the stranger who {summary}. 'It was the first kind thing anyone had done for me in twelve years,' he says, 'and I didn't deserve it.'" },
        { "recall": { "perspective": "sefa", "among": ["merciful", "violent", "honest", "deceptive", "greedy", "defiant"] },
          "format": "Sefa writes to you once, from the coast. She remembers her sister now, she says, all of her. She remembers you too: the one who {summary}." }
      ] }]
    },
    "final_rule": {
      "ending": true,
      "text": [{ "value": [
        "You become the keeper of the bell. Brackenridge is safe, after a fashion: orderly, fed, and afraid. The names are no longer stolen. They are surrendered by permission, to you, and you keep a very fair ledger.",
        { "if": { "type": "macroCondition", "name": "villageFears" },
          "text": "Nobody is surprised. They had already decided what you were.",
          "else": "That's the part that hurts the people who stood with you most: they had believed you were different." },
        "\n\n",
        { "recall": { "perspective": "anwen", "among": ["merciful", "violent", "honest", "deceptive", "greedy", "defiant"] },
          "format": "Sister Anwen keeps praying for the stranger who {summary}. She does not pray for the keeper of the bell. She doesn't think they're the same person." },
        { "recall": { "perspective": "reeve", "among": ["merciful", "violent", "honest", "deceptive", "greedy", "defiant"] },
          "format": "Aldous Crane leaves the village on the first dry day. Before he goes he tells you he'll always remember that you {summary}. 'It starts there,' he says. 'Mine did.'" }
      ] }]
    },
    "final_sacrifice": {
      "ending": true,
      "text": [{ "value": [
        "Years later, a child in Brackenridge asks who saved the village. Nobody can tell her. There was a stranger, people say, the year of the flood; or there wasn't; or it was a saint. The bell is still there, cracked and silent in its tower, and it never rings again.",
        { "if": { "type": "dominantTrait", "perspective": "tomas", "among": ["merciful", "violent"], "is": "merciful" },
          "tag": "Tomas, almost",
          "text": "Tomas, alone of all of them, has the feeling of having forgotten someone. He carves a blank space on the stone by the river, beside his mother's name. He couldn't tell you why.",
          "else": "Nobody carves anything. There's nothing to carve." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "miraAlly" },
          "text": "Mira bakes an extra loaf every morning and leaves it on the windowsill. She tells her customers it's for luck. She doesn't remember who it's for." },
        { "if": { "type": "knows", "perspective": "jory", "about": { "concepts": ["help", "jory"] } },
          "text": "Jory's ledger has a page in it in his own handwriting about a stranger who fixed his sign in the rain. The name has been left blank. He reads that page sometimes, and it makes him unaccountably sad." },
        { "if": { "type": "macroCondition", "name": "tomasDied" },
          "text": "On the stone by the river, Tomas's name is carved with the others the bell gave back. Nobody in Brackenridge can say any longer who put him in the water. That was in the bargain too, and you didn't ask." },
        "Whatever Brackenridge thought of you, it thinks it faintly now, the way you remember a dream at noon."
      ] }]
    }
  }
});
