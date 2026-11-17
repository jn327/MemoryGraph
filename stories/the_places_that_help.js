registerStory({
  "id": "the_places_that_help",
  "title": "The Places That Help",
  "synopsis": "On the road north, people who were needed badly enough became places: a bridge, a spring, a tree. The river carries word of how you treat them. So do the roots.",
  "start": "the_bridge",
  "characters": {
    "mara": { "name": "Mara" },
    "ansel": { "name": "Ansel" },
    "wren": { "name": "Wren" },
    "corin": { "name": "Corin" },
    "ilse": { "name": "Surveyor Brandt" }
  },
  "traits": {
    "kind": { "label": "kind", "concepts": { "help": 1, "listen": 1, "stay": 1 } },
    "user": { "label": "someone who used them", "concepts": { "use": 1, "take": 1.5, "hurry": 0.5 } },
    "faithful": { "label": "someone who kept their word", "concepts": { "keep_promise": 1.5, "return": 1, "name": 1 } },
    "faithless": { "label": "someone who broke their word", "concepts": { "break_promise": 1.5, "lie": 1 } }
  },
  "macros": {
    "maraTrustsFaith": { "tag": "Mara's faith", "condition": { "type": "dominantTrait", "perspective": "mara", "among": ["kind", "user", "faithful", "faithless"], "is": "faithful" } },
    "rooting": { "tag": "taking root", "condition": { "type": "association", "a": "player", "b": "rooted", "min": 3 } },
    "ilseWithYou": { "condition": { "type": "variable", "name": "with_ilse", "operator": "eq", "value": true } },
    "familyKnows": { "condition": { "type": "any", "conditions": [{ "type": "visited", "node": "corin_hears" }, { "type": "visited", "node": "corin_late" }] } },
    "saidName": { "tag": "Mara's name", "condition": { "type": "knows", "perspective": "corin", "about": { "concepts": ["name", "mara"] } } }
  },
  "nodes": {
    "the_bridge": {
      "text": "On the road north, where the old flood came through, there is a bridge that used to be a woman. Her name was Mara. When the river rose thirty years ago her brother was on the wrong bank, and she lay down across the water so he could cross, and he did. Then other people needed to cross. Then carts. Then a mail coach every Thursday. She never got up.\n\nHer voice comes up through the planks when you step on them: low, worn, like wood that has been rained on for a long time. 'Traveller. Are you going north? Past Bell Orchard?' A pause. 'Are the pear trees still standing?'\n\nYou don't know. You've never been there.",
      "onEnter": [{ "type": "remember", "concepts": ["mara", "bridge", "river", "flood"] }],
      "choices": [
        { "id": "say_three_trees", "text": "Tell her yes, three pear trees, still standing",
          "do": [{ "type": "remember", "concepts": ["player", "lie", "comfort", "mara"], "witnesses": ["mara"],
            "summary": "told the bridge the pear trees were standing when you didn't know" }],
          "goto": "surveyor" },
        { "id": "ask_human", "text": "Tell her you don't know, and ask what she remembers of being a person",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "stay", "mara"], "witnesses": ["mara"],
            "summary": "asked the bridge what she remembered of being a person" }],
          "goto": "mara_memory" },
        { "id": "cross_quickly", "text": "Say you're in a hurry, and cross",
          "do": [{ "type": "remember", "concepts": ["player", "use", "hurry", "mara"], "witnesses": ["mara"],
            "summary": "walked across the bridge without stopping to talk" }],
          "goto": "surveyor" }
      ]
    },
    "mara_memory": {
      "text": "It takes her a long time. She remembers pears, the yellow ones that bruise if you look at them. A song about a goose that her brother Tam hated. The smell of a kitchen with bread in it. She doesn't remember her own face. 'Nobody has said my name since the flood,' she says. 'Travellers say \"the bridge.\" If you get to Bell, would you tell them? Tell them Mara is still here. Say the name. That's all.'",
      "choices": [
        { "id": "promise_name", "text": "Promise you'll say her name at Bell",
          "do": [{ "type": "remember", "concepts": ["player", "promise", "mara", "name"], "witnesses": ["mara"],
            "summary": "promised to carry the bridge's name to Bell Orchard" }, { "type": "set", "variable": "promised_mara", "value": true }],
          "goto": "surveyor" },
        { "id": "try_name", "text": "Tell her you'll try, but you can't promise anything",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "listen", "mara"], "witnesses": ["mara"],
            "summary": "said honestly that you could only try to carry her name" }, { "type": "set", "variable": "promised_mara", "value": true }],
          "goto": "surveyor" }
      ]
    },
    "surveyor": {
      "text": "On the far bank a woman in an oilskin coat is setting up a brass theodolite. Surveyor Ilse Brandt, Ministry of Works. She is cataloguing what the Ministry calls persons of utility: bridges, springs, wells, waystones, anything on the north road that used to be someone. 'Requisition,' she explains, cheerfully. 'They'll be maintained, protected, tolled. Bound to the Crown in perpetuity. Better than rotting.' She looks at you. 'You've got honest eyes. Walk with me as far as Bell. Point out anything I'd miss. The Ministry pays a shilling a place.'",
      "choices": [
        { "id": "guide_ilse", "text": "Agree. A shilling a place, and company on the road",
          "do": [{ "type": "remember", "concepts": ["player", "use", "take", "ilse"], "witnesses": ["ilse", "mara"],
            "summary": "agreed to lead the surveyor to every place on the road" }, { "type": "set", "variable": "with_ilse", "value": true }],
          "goto": "the_spring" },
        { "id": "walk_lie", "text": "Walk with her, but plan to point out nothing",
          "do": [{ "type": "remember", "concepts": ["player", "lie", "help", "ilse"], "witnesses": ["mara"],
            "summary": "walked with the surveyor meaning to hide every place from her" }, { "type": "set", "variable": "with_ilse", "value": true }],
          "goto": "the_spring" },
        { "id": "refuse_ilse", "text": "Refuse, and walk on alone",
          "do": [{ "type": "remember", "concepts": ["player", "help", "refuse", "ilse"], "witnesses": ["ilse", "mara"],
            "summary": "refused to sell the road's people to the surveyor" }],
          "goto": "the_spring" }
      ]
    },
    "the_spring": {
      "text": [
        { "value": [
          "Half a day north, a man has become a spring. His name, he says, is Ansel; he was a well-digger, and when the drought came he went down into the dry well and didn't come up, and the water did. Now stones have washed into his mouth and the water is slowing. Below him, in the lower fields, it's pooling against a wall. If it backs up much further it'll flood the low end of Bell Orchard. 'Clear them,' he gurgles, 'and I'll tell you which mountain path is still open. You'll need to know.'",
          { "if": { "type": "macroCondition", "name": "ilseWithYou" },
            "text": "Ilse is already writing in her ledger. 'Spring, sound, minor obstruction,' she murmurs. 'Toll potential: moderate.'" }
        ] }
      ],
      "choices": [
        { "id": "clear_stones", "text": "Kneel in the cold water and clear the stones, however long it takes",
          "do": [{ "type": "remember", "concepts": ["player", "help", "stay", "ansel", "rooted"], "witnesses": ["ansel"],
            "summary": "knelt in the cold for hours clearing stones from the spring" }],
          "goto": "ansel_after" },
        { "id": "route_first", "text": "Ask for the path first, and promise to come back and clear them",
          "do": [{ "type": "remember", "concepts": ["player", "promise", "use", "ansel"], "witnesses": ["ansel"],
            "summary": "promised the spring you'd come back to clear the stones" }, { "type": "set", "variable": "owes_ansel", "value": true }],
          "goto": "the_ash_tree" },
        { "id": "route_leave", "text": "Take the path he offers and keep moving",
          "do": [{ "type": "remember", "concepts": ["player", "use", "hurry", "take", "ansel"], "witnesses": ["ansel"],
            "summary": "took the spring's directions and left the stones in his mouth" }],
          "goto": "the_ash_tree" }
      ]
    },
    "ansel_after": {
      "text": "By the time the last stone is out, your hands are blue and you can't feel your fingers. The spring runs clear and loud. 'The river goes past Mara,' Ansel says, in a voice like a man who has been holding his breath for a year. 'I'll tell her about you. Water talks.' Then, more quietly: 'That cold in your hands. It'll pass. But be careful how often you let yourself be needed out here. That's how it starts. That's how it started for all of us.'",
      "onEnter": [{ "type": "gossip", "from": "ansel", "to": ["mara"], "belief": 0.8 }],
      "choices": [{ "id": "ansel_on", "text": "Flex your fingers and walk north", "goto": "the_ash_tree" }]
    },
    "the_ash_tree": {
      "text": [
        { "value": [
          "On the ridge stands an ash tree that is also a woman called Wren. Birds nest in what used to be her hair. She has forgotten the sound of her own voice; she speaks in the sound of leaves, and you have to stand very close to understand. She has three seeds she wants carried down to the valley, where the soil is soft and they might take. She doesn't ask you to stay. She asks whether you'll remember her when you've gone.",
          { "if": { "type": "macroCondition", "name": "ilseWithYou" },
            "text": "Ilse paces out the ash's shadow and notes it down. 'Shade-giver. Timber value considerable, if it ever came to that.'" }
        ] }
      ],
      "choices": [
        { "id": "take_seeds", "text": "Take the seeds, and promise to plant them",
          "do": [{ "type": "remember", "concepts": ["player", "promise", "help", "wren", "seeds"], "witnesses": ["wren"],
            "summary": "carried the ash tree's seeds and promised to plant them" }, { "type": "set", "variable": "seeds", "value": true }],
          "goto": "night_roots" },
        { "id": "stay_evening", "text": "Sit against her trunk until evening, listening to the birds",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "stay", "wren", "rooted"], "witnesses": ["wren"],
            "summary": "sat under the ash until evening and listened" }],
          "goto": "night_roots" },
        { "id": "take_branch", "text": "Cut a straight branch for a walking staff. She has hundreds",
          "do": [{ "type": "remember", "concepts": ["player", "take", "use", "wren"], "witnesses": ["wren"],
            "summary": "cut a branch from the ash without asking" }],
          "goto": "night_roots" }
      ]
    },
    "night_roots": {
      "text": [
        { "value": [
          "You sleep under the trees at the edge of the orchard country. In the dark, the roots creak and murmur. You can't make out words, but you can tell the difference between a sound that is talking about you and one that isn't.",
          { "if": { "type": "trait", "perspective": "wren", "trait": "user", "min": 1 },
            "text": "The murmur stops when you roll over. All night you have the feeling of being watched by something that has decided you are the kind of person who cuts branches." },
          { "if": { "type": "association", "a": "player", "b": "rooted", "min": 1 }, "tag": "taking root",
            "text": "When you wake your boots are wet, and there are fine white threads around your ankles, like the roots of a seedling, which come away when you pull them. You decide not to think about it." },
          { "if": { "type": "macroCondition", "name": "ilseWithYou" },
            "text": "By lantern light Ilse unrolls her map. 'The ash,' she says. 'I need a mark for the ash. Did you see any others? There's a shilling in it.'" }
        ] }
      ],
      "onEnter": [{ "type": "gossip", "from": "wren", "to": ["corin"], "belief": 0.6 }],
      "choices": [
        { "id": "mark_wren", "text": "Help her mark the ash, and the spring, and the bridge",
          "showIf": { "type": "macroCondition", "name": "ilseWithYou" },
          "do": [{ "type": "remember", "concepts": ["player", "use", "take", "map", "wren", "mara"], "witnesses": ["ilse"],
            "summary": "marked the bridge, the spring and the ash on the Ministry's map" }, { "type": "set", "variable": "marked", "value": true }],
          "goto": "bell_orchard" },
        { "id": "smudge_map", "text": "Tell her the ash is just an ash, and smudge the bridge off the map while she sleeps",
          "showIf": { "type": "macroCondition", "name": "ilseWithYou" },
          "do": [{ "type": "remember", "concepts": ["player", "lie", "help", "map"],
            "summary": "smudged the bridge off the surveyor's map while she slept" }],
          "goto": "bell_orchard" },
        { "id": "sleep_on", "text": "Go back to sleep",
          "goto": "bell_orchard" }
      ]
    },
    "bell_orchard": {
      "text": [
        { "value": [
          "Bell Orchard is a farmhouse, a ruined wall, and one pear tree. One. Its fruit is small and yellow and bruised. An old man is sitting under it in a chair that's been mended with wire. His name is Corin. His granddaughter Lys, who is about sixteen and has opinions, brings you water.",
          { "if": { "type": "trait", "perspective": "corin", "trait": "kind", "min": 0.5 },
            "text": "'The roots said someone decent was coming,' Corin says, and laughs at himself. 'Old men hear things.'" },
          { "if": { "type": "trait", "perspective": "corin", "trait": "user", "min": 0.5 },
            "text": "Corin looks at your walking staff, or your hands, for a long time. 'The trees have been restless all night,' he says." }
        ] }
      ],
      "choices": [
        { "id": "say_mara", "text": "Say her name: tell him Mara is still at the river",
          "showIf": { "type": "variable", "name": "promised_mara", "operator": "eq", "value": true },
          "do": [{ "type": "remember", "concepts": ["player", "keep_promise", "name", "mara", "corin"], "witnesses": ["corin"],
            "summary": "said the bridge's name aloud at Bell Orchard, as you'd promised" }],
          "goto": "corin_hears" },
        { "id": "mention_bridge", "text": "Mention the bridge at the river, and see if it means anything to him",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "mara", "corin"], "witnesses": ["corin"],
            "summary": "told the old man at Bell about the bridge at the river" }],
          "goto": "corin_hears" },
        { "id": "rest_leave", "text": "Rest, fill your water, and say nothing about the river",
          "do": [{ "type": "remember", "concepts": ["player", "hurry", "break_promise", "corin"],
            "summary": "sat under the last pear tree and said nothing about the bridge" }],
          "goto": "orchard_wall" }
      ]
    },
    "corin_hears": {
      "text": [
        { "if": { "type": "macroCondition", "name": "saidName" },
          "value": "When you say Mara, the old man's face goes very still. 'My father's sister,' he says. 'Tam's sister. We were told she drowned in the flood. My father never crossed that river again in his life. He said he couldn't bear to.' He stands up, too fast for his age. Lys catches his arm. 'Thirty years,' he says. 'She's been there thirty years and we went the long way round.'" },
        { "value": "Corin listens to you describe the bridge. At 'used to be a woman' he looks up sharply, and at 'her brother was on the wrong bank' he puts his hand over his mouth. 'Tam,' he says. 'My father. His sister drowned in the flood, he always said. He never crossed that river again in his life.' He stands up, too fast for his age. Lys catches his arm." }
      ],
      "onEnter": [{ "type": "remember", "concepts": ["corin", "mara", "kin", "tam"], "witnesses": ["corin"] }],
      "choices": [{ "id": "to_wall", "text": "Help Lys find the cart", "goto": "orchard_wall" }]
    },
    "orchard_wall": {
      "text": [
        { "value": [
          "By the ruined orchard wall the soil is soft and dark, the best you've seen since the river.",
          { "if": { "type": "variable", "name": "seeds", "operator": "eq", "value": true },
            "text": "Wren's three seeds are in your pocket.",
            "else": "You have nothing to plant here. The wall seems to be waiting for something anyway." },
          { "if": { "type": "macroCondition", "name": "ilseWithYou" },
            "text": "Ilse is sitting on the wall, writing up her report. 'Requisition order for the bridge at the old flood goes in tonight,' she says. 'Does she have a name? The remarks column likes a name.'" }
        ] }
      ],
      "choices": [
        { "id": "plant_seeds", "text": "Plant the seeds along the wall",
          "showIf": { "type": "variable", "name": "seeds", "operator": "eq", "value": true },
          "do": [{ "type": "remember", "concepts": ["player", "keep_promise", "help", "seeds", "wren"], "witnesses": ["wren", "corin"],
            "summary": "planted the ash's seeds by the orchard wall" }],
          "goto": "ilse_order" },
        { "id": "keep_seeds", "text": "Keep the seeds. There'll be better soil further north",
          "showIf": { "type": "variable", "name": "seeds", "operator": "eq", "value": true },
          "do": [{ "type": "remember", "concepts": ["player", "break_promise", "hurry", "seeds"],
            "summary": "kept the ash's seeds in your pocket instead of planting them" }],
          "goto": "ilse_order" },
        { "id": "go_back_ansel", "text": "Go back south to clear the spring, as you promised, before the low field floods",
          "showIf": { "type": "variable", "name": "owes_ansel", "operator": "eq", "value": true },
          "do": [{ "type": "remember", "concepts": ["player", "keep_promise", "help", "ansel", "rooted"], "witnesses": ["ansel"],
            "summary": "walked a day back south to keep your promise to the spring" }, { "type": "gossip", "from": "ansel", "to": ["mara"], "belief": 0.8 }],
          "goto": "ilse_order" },
        { "id": "wall_on", "text": "Move on",
          "goto": "ilse_order" }
      ]
    },
    "ilse_order": {
      "text": [
        { "if": { "type": "macroCondition", "name": "ilseWithYou" },
          "value": "Ilse holds out her requisition order for the bridge. It needs a witness signature from someone who has crossed it. 'Bound to the Crown,' she reads, 'in perpetuity. Maintained, tolled, protected. She'd never be a person again, of course. But she hasn't been one for thirty years.'" },
        { "value": "On the road out of Bell you meet Ilse Brandt again, coming the other way with her theodolite on her back. 'Requisition order for the bridge,' she says, holding it up. 'I need a witness who's crossed it. Bound to the Crown in perpetuity. She'd never be a person again, of course. But she hasn't been one for thirty years.'" }
      ],
      "choices": [
        { "id": "sign_order", "text": "Sign as witness. At least she'll be looked after",
          "do": [{ "type": "remember", "concepts": ["player", "use", "take", "requisition", "mara"], "witnesses": ["ilse"],
            "summary": "signed the order binding the bridge to the Crown forever" }, { "type": "set", "variable": "requisitioned", "value": true }],
          "goto": [{ "if": { "type": "macroCondition", "name": "familyKnows" }, "node": "the_return" }, { "node": "the_return_alone" }] },
        { "id": "tear_order", "text": "Take the order out of her hand and tear it in half",
          "do": [{ "type": "remember", "concepts": ["player", "help", "refuse", "ilse"], "witnesses": ["ilse"],
            "summary": "tore up the surveyor's order in front of her" }],
          "goto": [{ "if": { "type": "macroCondition", "name": "familyKnows" }, "node": "the_return" }, { "node": "the_return_alone" }] },
        { "id": "list_as_person", "text": "Ask her to write Mara down as a person, not a place, and see what the Ministry does with that",
          "do": [{ "type": "remember", "concepts": ["player", "name", "listen", "ilse", "mara"], "witnesses": ["ilse"],
            "summary": "asked for the bridge to be written down as a person" }],
          "goto": [{ "if": { "type": "macroCondition", "name": "familyKnows" }, "node": "the_return" }, { "node": "the_return_alone" }] }
      ]
    },
    "the_return_alone": {
      "text": [
        { "value": [
          "You come back to the river alone. The bridge feels you step onto her planks and holds very still, listening for a second set of feet. There isn't one.",
          { "if": { "type": "variable", "name": "promised_mara", "operator": "eq", "value": true },
            "text": "'Did you say it?' Mara asks. 'At Bell. Did you say my name?'",
            "else": "'Is there anyone at Bell?' Mara asks. 'Anyone left who'd know me?'" },
          { "if": { "type": "variable", "name": "requisitioned", "operator": "eq", "value": true },
            "text": "Nailed to her first plank is a brass plate: PROPERTY OF THE CROWN. TOLL ONE PENNY. She can't read it. You can." }
        ] }
      ],
      "choices": [
        { "id": "go_back_bell", "text": "Turn round, walk back to Bell, and bring her family",
          "do": [{ "type": "remember", "concepts": ["player", "keep_promise", "return", "mara"], "witnesses": ["mara"],
            "summary": "walked all the way back to Bell to fetch the bridge's family" }],
          "goto": "corin_late" },
        { "id": "tell_truth_alone", "text": "Tell her the truth: you didn't",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "break_promise", "mara"], "witnesses": ["mara"],
            "summary": "admitted to the bridge that you never said her name" }],
          "goto": [
            { "if": { "type": "variable", "name": "requisitioned", "operator": "eq", "value": true }, "node": "the_survey" },
            { "node": "the_road" }
          ] },
        { "id": "lie_coming", "text": "Tell her they're coming. They'll be here any day",
          "do": [{ "type": "remember", "concepts": ["player", "lie", "break_promise", "mara"], "witnesses": ["mara"],
            "summary": "told the bridge her family was on its way when nobody was coming" }],
          "goto": [
            { "if": { "type": "variable", "name": "requisitioned", "operator": "eq", "value": true }, "node": "the_survey" },
            { "node": "the_road" }
          ] }
      ]
    },
    "corin_late": {
      "text": "It takes you a day and a half to walk back to Bell Orchard, and you have time to think about why you didn't say it the first time. Corin is under the pear tree. When you tell him there's a woman at the river who was once called Mara, he puts his hand over his mouth. 'Tam's sister,' he says. 'My father always said she drowned.' Lys has the cart out before he's finished standing up.",
      "onEnter": [{ "type": "remember", "concepts": ["player", "name", "mara", "corin", "keep_promise"], "witnesses": ["corin"],
        "summary": "came back to Bell a second time to say the bridge's name" }],
      "choices": [{ "id": "late_return", "text": "Ride back to the river with them", "goto": "the_return" }]
    },
    "the_return": {
      "text": [
        { "value": [
          "You walk back to the river with Corin in the cart and Lys at the reins. Mara recognises her nephew's voice before he reaches the bank; you feel the whole bridge tremble under your feet. They talk across the water. His father, her brother, died eleven years ago; he never stopped going the long way round. Mara laughs, and then she doesn't.",
          { "if": { "type": "knows", "perspective": "mara", "about": { "concepts": ["help", "ansel"] } },
            "text": "'The river told me about you,' she says, when you step onto her planks. 'The spring was singing about your hands for two days.'" },
          { "if": { "type": "knows", "perspective": "mara", "about": { "concepts": ["lie", "comfort", "mara"] } },
            "text": "She asks Corin about the three pear trees. 'There's one, Aunt Mara,' he says, puzzled. 'Just one.' The bridge goes quiet under you." },
          { "if": { "type": "knows", "perspective": "mara", "about": { "concepts": ["take", "ansel"] } },
            "text": "The water under her is low and brown. 'Ansel's choking,' she says, to nobody in particular. 'The river's been telling me.'" },
          { "if": { "type": "variable", "name": "requisitioned", "operator": "eq", "value": true },
            "text": "Nailed to her first plank is a brass plate: PROPERTY OF THE CROWN. TOLL ONE PENNY. Lys reads it twice." },
          { "if": { "type": "association", "a": "player", "b": "rooted", "min": 2 }, "tag": "taking root",
            "text": "Standing on her planks, you notice your feet have gone cold and heavy, the way your hands did at the spring, and that they don't want to move." },
          "Then Mara asks you something nobody has asked anyone in thirty years. 'Would you take my place? Just for one night. So I can stand on the bank and hold my nephew. I'll lie back down at dawn. I promise.'"
        ] }
      ],
      "choices": [
        { "id": "take_place", "text": "Lie down across the river, and let her stand",
          "do": [{ "type": "remember", "concepts": ["player", "help", "stay", "rooted", "mara"], "witnesses": ["mara", "corin"], "strength": 2,
            "summary": "lay down across the river so the bridge could hold her nephew" }],
          "goto": [
            { "if": { "type": "macroCondition", "name": "rooting" }, "node": "the_waystone" },
            { "node": "the_crossing" }
          ] },
        { "id": "clear_branches", "text": "Say no gently, and stay to clear the branches caught beneath her instead",
          "do": [{ "type": "remember", "concepts": ["player", "help", "stay", "mara"], "witnesses": ["mara", "corin"],
            "summary": "stayed to clear the branches from under the bridge" }],
          "goto": "the_crossing" },
        { "id": "continue_north", "text": "Tell her you can't, and continue north with their stories",
          "do": [{ "type": "remember", "concepts": ["player", "hurry", "mara"], "witnesses": ["mara"],
            "summary": "said no, and walked north" }],
          "goto": [
            { "if": { "type": "variable", "name": "requisitioned", "operator": "eq", "value": true }, "node": "the_survey" },
            { "node": "the_road" }
          ] }
      ]
    },
    "the_crossing": {
      "ending": true,
      "text": [{ "value": [
        { "if": { "type": "knows", "perspective": "mara", "about": { "concepts": ["rooted", "mara"] } },
          "text": "You lie across the water all night. It is the coldest, heaviest thing you've ever done; the river leans on you like a tired animal. On the bank Mara, a woman again for eight hours, sits with her nephew and his granddaughter under a blanket and doesn't sleep at all. At dawn she lies back down, as she promised. You stand up. Your legs work. Mostly.",
          "else": "You spend the evening knee-deep in the river, pulling branches out from under her. Travellers cross while Mara and her family talk, and some of them stop to help without being asked." },
        { "if": { "type": "macroCondition", "name": "maraTrustsFaith" },
          "text": "Corin promises to come every Sunday. He does. After a year the village starts calling it Mara's Bridge on the signpost, and people say her name when they cross, the way you'd greet someone.",
          "else": "Corin promises to come every Sunday. He comes most of them." },
        "\n\n",
        { "if": { "type": "variable", "name": "requisitioned", "operator": "eq", "value": true },
          "text": "The Crown's toll-keeper arrives in the autumn. Corin pays Mara's penny every Sunday, and makes a point of saying her name to the toll-keeper each time." },
        { "if": { "type": "knows", "perspective": "wren", "about": { "concepts": ["keep_promise", "seeds"] } },
          "text": "By the orchard wall, three ash seedlings come up in the spring. Lys waters them through the dry weeks without anyone asking her.",
          "else": "Up on the ridge, an ash tree waits for the birds to come back each evening, and remembers a traveller, or doesn't." },
        { "recall": { "perspective": "mara", "among": ["kind", "user", "faithful", "faithless"] },
          "format": "Under the planks, when the water is high, the bridge hums a song about a goose, and a story about the traveller who {summary}." }
      ] }]
    },
    "the_road": {
      "ending": true,
      "text": [{ "value": [
        "You walk north with the stories of the people you met.",
        { "if": { "type": "macroCondition", "name": "familyKnows" }, "text": "Behind you, a bridge hears her family laugh.", "else": "Behind you, a bridge is still waiting to hear her name." },
        "Ahead, the road bends out of sight. Every so often, out here, you pass a waystone or a well or a lone tree, and you stop and ask its name, and you say it back.",
        { "if": { "type": "variable", "name": "seeds", "operator": "eq", "value": true },
          "text": "Wren's seeds are still in your pocket. The soil never seems quite good enough. You'll know the right place when you see it, you tell yourself. You've been telling yourself that for a long time." },
        "\n\n",
        { "if": { "type": "knows", "perspective": "ansel", "about": { "concepts": ["take", "ansel"] } },
          "text": "You hear, much later, that the low end of Bell Orchard flooded that spring, and the last pear tree went with it. Nobody blames you. Nobody knows to.",
          "else": "You hear, much later, that the spring runs clear all year, and that the low field at Bell Orchard has never flooded since." },
        { "recall": { "perspective": "corin", "among": ["kind", "user", "faithful", "faithless"] },
          "format": "At Bell Orchard Corin tells the story of the stranger who {summary}, and Lys rolls her eyes, because she has heard it so many times." }
      ] }]
    },
    "the_waystone": {
      "ending": true,
      "text": [{ "value": [
        "You lie down across the river and the cold comes up through your back, and it is the same cold you felt at the spring, and under the ash tree, and in the orchard grass with white threads round your ankles. You had been needed too many times, too far from home. At dawn, Mara lies back down beside you, as she promised. You try to stand, and find you have become something you can't stand up from.",
        "Two bridges now cross the river at the old flood place, side by side. Travellers call them the Pair. Your voice, when you find it, comes up through your planks low and worn, and you find you can feel every footstep: who hurries, who stops.",
        "\n\n",
        { "recall": { "perspective": "mara", "among": ["kind", "faithful"] },
          "format": "On quiet nights Mara talks to you across the gap. She likes to remind you of the day you {summary}." },
        { "if": { "type": "macroCondition", "name": "saidName" },
          "text": "Corin comes every Sunday. He says both your names. Lys carves yours into the rail, so travellers will know.",
          "else": "Corin comes every Sunday. He says Mara's name, and then, after a while, he asks you yours. You are surprised how long it takes you to remember it." },
        { "if": { "type": "knows", "perspective": "ilse", "about": { "concepts": ["refuse", "ilse"] } },
          "text": "Surveyor Brandt passes the river in the spring. She stops, and looks at the Pair for a long time, and does not take out her ledger." }
      ] }]
    },
    "the_survey": {
      "ending": true,
      "text": [{ "value": [
        "You walk north. Behind you, the Ministry of Works is very efficient. By midsummer there's a toll-house at the river, a brass plate on the first plank, and a penny for every crossing. Mara is maintained. Her planks are tarred and her rails are painted. The Ministry's brochure lists her under 'Crossings (Animate), North Road, No. 14.'",
        { "if": { "type": "variable", "name": "marked", "operator": "eq", "value": true },
          "text": "The spring has a pump-house over it now. The ash on the ridge has a number painted on her trunk, and a timber assessment, filed for later." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "saidName" },
          "text": "Corin pays his penny every Sunday and sits on the bank, and says her name, and the toll-keeper, who is a decent man, has started saying it too.",
          "else": "The family at Bell Orchard learns about the bridge from the Ministry brochure, years later. By then nobody is quite sure what she was called." },
        { "recall": { "perspective": "ilse", "among": ["kind", "user", "faithful", "faithless"] },
          "format": "Ilse Brandt's report to the Ministry thanks the traveller who {summary}. It is filed, and nobody reads it again." }
      ] }]
    }
  }
});
