registerStory({
  "id": "the_house_with_two_kitchens",
  "title": "The House With Two Kitchens",
  "synopsis": "Since your father died, a blue kitchen appears when you're overtired, and he's in it, peeling an orange. Your family is selling his house, and your mother is hiding something about the first one.",
  "start": "blue_room",
  "characters": {
    "halina": { "name": "Your mother" },
    "mattie": { "name": "Mattie" },
    "osei": { "name": "Dr Osei" },
    "father": { "name": "Dad" }
  },
  "traits": {
    "present": { "label": "someone who stayed present", "concepts": { "rest": 1, "routine": 1, "here": 1.5 } },
    "searching": { "label": "someone chasing a ghost", "concepts": { "chase": 1, "overtired": 1, "decode": 1 } },
    "tender": { "label": "tender", "concepts": { "listen": 1, "comfort": 1, "share": 1 } },
    "closed": { "label": "closed off", "concepts": { "avoid": 1, "refuse": 1, "conceal": 1 } },
    "honest": { "label": "honest", "concepts": { "truth": 1, "admit": 1.5, "lie": -1.5 } }
  },
  "memory": { "halfLife": 10 },
  "macros": {
    "fatherKnows": { "tag": "what you know now", "condition": { "type": "knows", "perspective": "father", "about": { "concepts": ["dad_left"] } } },
    "worn": { "tag": "exhaustion", "condition": { "type": "dominantTrait", "among": ["present", "searching"], "is": "searching" } },
    "mumTrusts": { "tag": "Mum trusts you", "condition": { "type": "dominantTrait", "perspective": "halina", "among": ["tender", "closed"], "is": "tender" } },
    "mattieClose": { "tag": "your brother", "condition": { "type": "trait", "perspective": "mattie", "trait": "tender", "min": 1 } }
  },
  "nodes": {
    "blue_room": {
      "text": [{ "value": [
        "You have narcolepsy. Your brain doesn't keep a clean border between waking and dreaming; sometimes it lets the dream through while your eyes are open. Dr Osei calls these hypnagogic episodes and helps you manage them with medication, a strict bedtime, and a diary.",
        "\n\n",
        "Since your father died in March, the episodes have a setting. A kitchen with blue tiles, a straight cupboard door, sun on the table. Your father at the table, peeling an orange in one long spiral the way he always did. You miss him so much your teeth hurt. You do not want grief to turn every symptom into a message you have to decode.",
        "\n\n",
        "Tonight, at the end of a sixteen-hour day, he looks up from the orange. 'You left the gas on, Cassie.' You go to check. You did.",
        { "if": { "type": "macroCondition", "name": "fatherKnows" },
          "text": "When you come back he is still looking at you, the way he never quite did in life. 'You know about the winter,' he says. 'You knew last time, too. You always find out.'" }
      ] }],
      "onEnter": [{ "type": "remember", "concepts": ["father", "blue_kitchen", "orange", "episode"] }],
      "choices": [
        { "id": "diary", "text": "Write it in the sleep diary for Dr Osei, and go to bed",
          "do": [{ "type": "remember", "concepts": ["player", "routine", "truth", "diary"], "witnesses": ["osei"],
            "summary": "wrote the episode down and went to bed on time" }],
          "goto": "sorting" },
        { "id": "stay_dream", "text": "Sit back down and close your eyes, to see if he's still there",
          "do": [{ "type": "remember", "concepts": ["player", "chase", "overtired", "father"], "witnesses": ["father"],
            "summary": "closed your eyes on purpose to go back to him" }],
          "goto": "sorting" }
      ]
    },
    "sorting": {
      "text": "Your father's house is a bungalow full of fifty years of everything. On Saturday you go through it with your mother and your brother Mattie. Mattie has a developer's offer on his phone that expires at the end of the month, and a spreadsheet with tabs. Your mother picks up a mug, puts it down, and picks it up again. Nobody has said the word 'sell' out loud, but Mattie has typed it eleven times.",
      "choices": [
        { "id": "side_mattie", "text": "Back Mattie: take the offer, keep a few things, let the rest go",
          "do": [{ "type": "remember", "concepts": ["player", "here", "decide", "house"], "witnesses": ["mattie", "halina"],
            "summary": "sided with your brother about selling the house" }],
          "goto": "photograph" },
        { "id": "every_box", "text": "Insist on going through every box yourself, however long it takes",
          "do": [{ "type": "remember", "concepts": ["player", "chase", "overtired", "house"], "witnesses": ["mattie", "halina"],
            "summary": "insisted on opening every box, however late it got" }],
          "goto": "photograph" },
        { "id": "ask_mum", "text": "Ask your mother, gently, what she actually wants",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "halina"], "witnesses": ["halina", "mattie"],
            "summary": "asked your mother what she wanted before anyone decided" }],
          "goto": "photograph" }
      ]
    },
    "photograph": {
      "text": "In a shoebox in the wardrobe your mother finds a photograph of your first house, the one you left when you were five. The kitchen has blue tiles. A straight cupboard door. Sun on the table. On the back, in her handwriting: Sunday after the flood. He finally fixed the sink.\n\nYou don't remember that house at all. You know that kitchen better than your own.\n\nYour mother looks at the photograph for a long time. Then she puts it face-down on the bed and says she needs some air.",
      "onEnter": [{ "type": "remember", "concepts": ["photograph", "first_house", "blue_kitchen", "flood", "sink"], "witnesses": ["halina", "mattie"] }],
      "choices": [
        { "id": "follow_mum", "text": "Follow her into the garden and ask about the first house",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "share", "halina", "first_house"], "witnesses": ["halina"],
            "summary": "followed your mother into the garden and asked about the first house" }],
          "goto": "garden" },
        { "id": "photo_to_osei", "text": "Pocket the photograph to show Dr Osei",
          "do": [{ "type": "remember", "concepts": ["player", "routine", "truth", "photograph"], "witnesses": ["osei"],
            "summary": "brought the photograph to your appointment instead of to your dreams" }],
          "goto": "osei" },
        { "id": "photo_to_bed", "text": "Put it under your pillow tonight, and see what the kitchen does",
          "do": [
            { "type": "remember", "concepts": ["player", "chase", "decode", "photograph"], "witnesses": ["father"],
              "summary": "slept with the photograph under your pillow" },
            { "type": "reveal", "to": ["father"], "about": { "concepts": ["flood"] } }
          ],
          "goto": "osei" }
      ]
    },
    "garden": {
      "text": [
        { "if": { "type": "knows", "perspective": "halina", "about": { "concepts": ["chase", "house"] } }, "tag": "the boxes",
          "value": "She is standing by the dead hydrangeas. 'You've been through every box in this house,' she says, not unkindly. 'You don't need to go through me as well.' Then, like someone reading from a card: 'It was a long time ago. The street flooded. He fixed the sink. That's all there is.' She goes back inside to help Mattie with the loft." },
        { "value": "She is standing by the dead hydrangeas. 'He was so proud of that sink,' she says. 'It was the only thing he ever fixed properly. The whole street flooded and he fixed the sink.' She laughs, and the laugh turns into something else halfway. 'There's more to it. I'll tell you. Not today. Let me get through today.'" }
      ],
      "choices": [
        { "id": "let_her_be", "text": "Tell her that whenever she's ready is fine",
          "do": [{ "type": "remember", "concepts": ["player", "comfort", "listen", "halina"], "witnesses": ["halina"],
            "summary": "told your mother she could tell you whenever she was ready" }],
          "goto": "osei" },
        { "id": "press_mum", "text": "Press her. You can see there's something",
          "do": [{ "type": "remember", "concepts": ["player", "chase", "decode", "halina"], "witnesses": ["halina"],
            "summary": "pushed your mother for the story in the garden" }],
          "goto": "osei" }
      ]
    },
    "osei": {
      "text": [
        { "value": [
          "Dr Osei has a plant on her desk she calls Gerald and a habit of letting silences go on longer than is comfortable. She reads your diary, two weeks of it.",
          { "if": { "type": "macroCondition", "name": "worn" },
            "text": "'You're sleeping four hours,' she says. 'Five on a good night. The episodes are clustering around the evenings you're at the house. Are you driving there?'",
            "else": "'Your routine's holding,' she says. 'Mostly. The episodes cluster around the evenings you spend at the house. Are you driving there?'" },
          { "if": { "type": "knows", "perspective": "osei", "about": { "concepts": ["photograph"] } },
            "text": "She studies the photograph you brought. 'Memory is a strange organ,' she says. 'An image can make a room feel remembered without proving you remember it. Your mother might have described this kitchen to you a hundred times before you could talk.'" }
        ] }
      ],
      "choices": [
        { "id": "admit_driving", "text": "Tell her the truth: you've been driving there exhausted",
          "do": [{ "type": "remember", "concepts": ["player", "admit", "truth", "driving"], "witnesses": ["osei"],
            "summary": "admitted you'd been driving when you shouldn't" }],
          "goto": "dream_two" },
        { "id": "lie_routine", "text": "Tell her you're keeping to your routine",
          "do": [{ "type": "remember", "concepts": ["player", "lie", "conceal", "driving"], "witnesses": ["osei"],
            "summary": "claimed you were keeping your routine when you weren't" }],
          "goto": "dream_two" },
        { "id": "ask_dream", "text": "Ask her whether a dream can hold a memory you don't have",
          "do": [{ "type": "remember", "concepts": ["player", "decode", "chase", "father"], "witnesses": ["osei"],
            "summary": "asked whether the dream could be a real memory" }],
          "goto": "dream_two" }
      ]
    },
    "dream_two": {
      "text": [
        { "value": [
          "It happens at the bungalow, on the sofa, at five in the afternoon. You're awake and then the light changes and you're at the blue table. Your father is peeling an orange in one long spiral.",
          { "if": { "type": "knows", "perspective": "father", "about": { "concepts": ["flood"] } },
            "text": "'The whole street flooded,' he says, as though you've been talking about it for hours. 'Water to the second stair. But I fixed the sink.' He seems proud, and something under the pride that you can't read.",
            "else": "'You look tired, love,' he says. He holds out a segment of orange. He always held out the first segment." },
          { "if": { "type": "macroCondition", "name": "worn" },
            "text": "The kitchen is very bright, brighter than the bungalow's front room. It's getting harder to tell which one is real for the first few seconds." }
        ] }
      ],
      "choices": [
        { "id": "ask_orange", "text": "Ask him why he's always peeling an orange",
          "do": [{ "type": "remember", "concepts": ["player", "decode", "chase", "father"], "witnesses": ["father"],
            "summary": "asked him why it was always an orange" }],
          "goto": "orange_answer" },
        { "id": "wake_self", "text": "Tell him you have to go, and pinch your hand until the room comes back",
          "do": [{ "type": "remember", "concepts": ["player", "here", "rest", "father"], "witnesses": ["father"],
            "summary": "told him you had to go and made yourself wake up" }],
          "goto": "mattie_garage" },
        { "id": "angry_died", "text": "Tell him you're angry with him for dying",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "share", "father"], "witnesses": ["father"],
            "summary": "told him you were angry with him for dying" }],
          "goto": "orange_answer" }
      ]
    },
    "orange_answer": {
      "text": [
        { "if": { "type": "knows", "perspective": "father", "about": { "concepts": ["flood"] } }, "tag": "the photograph under your pillow",
          "value": "'Because of the sink,' he says. 'The Sunday after the flood. I sat at this table and peeled an orange, and your mother watched me and didn't say anything, and I thought, if I can just get the peel off in one piece, she'll let me...' He stops, as if he's walked to the edge of a room and found no more floor. 'I don't know the rest, love. You don't either. Not yet.'" },
        { "value": "He looks at the orange in his hands as if he's only just noticed it. 'I don't know, love,' he says. 'You'd have to ask someone who remembers.' The kitchen holds very still. You realise he can only know what you know." }
      ],
      "choices": [{ "id": "orange_wake", "text": "Wake up", "goto": "mattie_garage" }]
    },
    "mattie_garage": {
      "text": [
        { "value": [
          "Mattie finds you in the garage, sitting in Dad's deckchair with a box of fuse wire on your knee.",
          { "if": { "type": "trait", "perspective": "mattie", "trait": "searching", "min": 1 },
            "text": "'You're sleeping in his chair,' he says. 'You're up till three opening boxes. Mum's hiding something and you're making it worse by digging.'",
            "else": "'Mum's hiding something,' he says. 'You've noticed, right? Don't tell me you haven't noticed.'" },
          "He sits on an upturned crate. He's three years older than you; he was eight that winter in the first house. 'I remember the flood,' he says. 'And I remember that Dad wasn't there for it. He wasn't there all winter. I used to hear Mum crying through the wall.'"
        ] }
      ],
      "choices": [
        { "id": "hear_mattie", "text": "Ask him to tell you everything he remembers",
          "do": [
            { "type": "remember", "concepts": ["player", "listen", "share", "mattie", "dad_left"], "witnesses": ["mattie"],
              "summary": "sat in the garage and listened to everything your brother remembered" },
            { "type": "reveal", "to": ["father"], "about": { "concepts": ["dad_left"] } }
          ],
          "goto": "mum_table" },
        { "id": "stop_mattie", "text": "Tell him to stop. You don't want to know",
          "do": [{ "type": "remember", "concepts": ["player", "avoid", "refuse", "mattie"], "witnesses": ["mattie"],
            "summary": "told your brother to stop before he'd finished" }],
          "goto": "mum_table" },
        { "id": "dream_proof", "text": "Tell him you've seen Dad, and Dad says everything was fine",
          "do": [{ "type": "remember", "concepts": ["player", "chase", "decode", "lie", "mattie"], "witnesses": ["mattie"],
            "summary": "insisted a dream was proof that Dad never left" }],
          "goto": "mum_table" }
      ]
    },
    "mum_table": {
      "text": [
        { "if": { "type": "macroCondition", "name": "mumTrusts" },
          "value": "Your mother tells you on Wednesday night at her own kitchen table, without being asked. She has made tea neither of you drinks. When you were five, your father left. Three months. He'd met someone at the depot; it didn't last. The street flooded in February and she bailed water out of the kitchen with a saucepan and Mattie held a torch. The Sunday after, he came back before anyone woke and fixed the sink, and peeled an orange at the table, and she let him stay.\n\n'You adored him,' she says. 'You were five. I wasn't going to take that away from you to make myself feel honest.'" },
        { "value": "You ask your mother on Wednesday night at her kitchen table, and for a long time she doesn't answer. Then it comes out of her flatly, as if she's reading a statement. When you were five, your father left. Three months. The street flooded in February and she bailed water out with a saucepan. The Sunday after, he came back before anyone woke and fixed the sink, and she let him stay.\n\n'I've kept it for thirty years,' she says. 'I didn't plan to be made to give it up at a table.'" }
      ],
      "onEnter": [
        { "type": "remember", "concepts": ["halina", "dad_left", "flood", "sink", "first_house"], "witnesses": ["halina"] }
      ],
      "choices": [
        { "id": "hold_hand", "text": "Hold her hand and let her tell all of it",
          "do": [
            { "type": "remember", "concepts": ["player", "comfort", "listen", "halina"], "witnesses": ["halina"],
              "summary": "held her hand and let her tell all of it" },
            { "type": "reveal", "to": ["father"], "about": { "concepts": ["dad_left"] } }
          ],
          "goto": "the_drive" },
        { "id": "why_lie", "text": "Ask her why she let you believe a story for thirty years",
          "do": [
            { "type": "remember", "concepts": ["player", "truth", "refuse", "halina"], "witnesses": ["halina"],
              "summary": "asked her why she'd lied for thirty years" },
            { "type": "reveal", "to": ["father"], "about": { "concepts": ["dad_left"] } }
          ],
          "goto": "the_drive" },
        { "id": "leave_table", "text": "Say you need to sleep, and leave. You don't have to let it in",
          "do": [
            { "type": "remember", "concepts": ["player", "avoid", "halina"], "witnesses": ["halina"],
              "summary": "left the table before she'd finished" },
            { "type": "doubt", "to": ["father"], "about": { "concepts": ["dad_left"] } }
          ],
          "goto": "the_drive" }
      ]
    },
    "the_drive": {
      "text": [
        { "value": [
          "It's past midnight when you drive home from your mother's. The roads are empty and orange under the streetlights.",
          { "if": { "type": "macroCondition", "name": "worn" },
            "text": "You've slept nine hours in three days. Your hands feel far away on the wheel.",
            "else": "You're tired, but it's an ordinary tired. You took your evening dose on time." }
        ] }
      ],
      "choices": [
        { "id": "keep_driving", "text": "Keep driving",
          "goto": [
            { "if": { "type": "macroCondition", "name": "worn" }, "node": "junction" },
            { "node": "lay_by" }
          ] },
        { "id": "pull_over", "text": "Pull into a lay-by and sleep for twenty minutes",
          "do": [{ "type": "remember", "concepts": ["player", "rest", "routine", "driving"],
            "summary": "pulled over to sleep instead of risking the road" }],
          "goto": "lay_by" }
      ]
    },
    "junction": {
      "text": "The blue kitchen arrives at the Marsh Road junction. You're at the table and your father is peeling an orange and someone is hammering on glass. When you come back the car is stopped across both lanes with the engine running. A man is knocking on your window. In the other car, stopped a metre from your door, a little girl is crying in a car seat. Nobody is hurt. Nobody is hurt. You keep saying it after the man has stopped asking if you're all right.",
      "onEnter": [{ "type": "set", "variable": "junction", "value": true }],
      "choices": [
        { "id": "tell_osei_junction", "text": "Call Dr Osei in the morning, and hand in your licence",
          "do": [{ "type": "remember", "concepts": ["player", "admit", "truth", "here", "junction"], "witnesses": ["osei", "halina", "mattie"], "strength": 2,
            "summary": "handed in your licence after the junction" }],
          "goto": "dream_three" },
        { "id": "hide_junction", "text": "Tell no one. Nobody was hurt",
          "do": [{ "type": "remember", "concepts": ["player", "conceal", "lie", "junction"], "strength": 2,
            "summary": "told no one about the junction" }],
          "goto": "dream_three" }
      ]
    },
    "lay_by": {
      "text": "You sleep in a lay-by with the seat tipped back and the engine off. The blue kitchen comes, as you knew it would, but you're parked and safe and it can have you for twenty minutes. When you wake, a lorry is passing and the sky has gone the colour of weak tea. You drive home at thirty miles an hour with the window down.",
      "choices": [{ "id": "lay_by_home", "text": "Go home to bed", "goto": "dream_three" }]
    },
    "dream_three": {
      "text": [
        { "if": { "type": "macroCondition", "name": "fatherKnows" },
          "value": "The last time it happens, you know before it starts. The blue table. The sun. Your father with an orange, peel coming away in one long spiral. He doesn't look up this time. 'I came back,' he says. 'I fixed the sink. I thought that would be enough.' He puts the orange down. 'I'm only what you know about me, love. You know more now. I'm sorry it's worse.'" },
        { "value": "The last time it happens, you know before it starts. The blue table. The sun. Your father with an orange, peel coming away in one long spiral. He looks exactly the way you need him to: kind, a bit useless, proud of a sink. 'You can stay as long as you like,' he says. There is nothing behind him but blue tiles. There's nothing in him you didn't bring." }
      ],
      "choices": [
        { "id": "forgive_him", "text": "Take the segment of orange he's holding out",
          "do": [{ "type": "remember", "concepts": ["player", "comfort", "share", "father"], "witnesses": ["father"],
            "summary": "took the orange from him in the last dream" }],
          "goto": "the_house" },
        { "id": "only_memory", "text": "Tell him he's only made of your memories, and you have to go and live in the other kitchen",
          "do": [{ "type": "remember", "concepts": ["player", "here", "truth", "father"], "witnesses": ["father"],
            "summary": "told him he was made of your memories, and left" }],
          "goto": "the_house" },
        { "id": "stay_kitchen", "text": "Sit down at the table and stay",
          "do": [{ "type": "remember", "concepts": ["player", "chase", "avoid", "father"], "witnesses": ["father"], "strength": 2,
            "summary": "sat down at the blue table and stayed" }],
          "goto": "the_house" }
      ]
    },
    "the_house": {
      "text": [
        { "value": [
          "The developer's offer expires on Friday. On Thursday the three of you stand in the empty bungalow, which echoes now.",
          { "if": { "type": "macroCondition", "name": "mattieClose" },
            "text": "Mattie bumps your shoulder with his. 'Whatever you want,' he says, and means it.",
            "else": "Mattie stands by the door with his car keys in his hand." },
          { "if": { "type": "variable", "name": "junction", "operator": "eq", "value": true },
            "text": "Your mother drove you here. She knows about the junction, or she doesn't; either way she watches you the whole time like you might fall." },
          { "if": { "type": "knows", "perspective": "father", "about": { "concepts": ["chase", "photograph"] } },
            "text": "The photograph of the first kitchen is in your coat pocket, soft at the corners from a week under your pillow. Your mother looks at the pocket, and then at you. 'Well,' she says. 'What now?'",
            "else": "Your mother holds the photograph of the first kitchen. 'Well,' she says. 'What now?'" }
        ] }
      ],
      "choices": [
        { "id": "go_home_orange", "text": "Sell it. Go home, and peel an orange in your own kitchen",
          "do": [{ "type": "remember", "concepts": ["player", "here", "rest", "house"], "summary": "let the house go and went home" }],
          "goto": [
            { "if": { "type": "all", "conditions": [{ "type": "macroCondition", "name": "worn" }, { "type": "knows", "perspective": "father", "about": { "concepts": ["chase", "avoid"] } }] }, "node": "blue_kitchen" },
            { "node": "yellow_tiles" }
          ] },
        { "id": "first_house", "text": "Ask your mother to take you past the first house",
          "do": [{ "type": "remember", "concepts": ["player", "share", "listen", "first_house"], "summary": "asked your mother to take you to the first house" }],
          "goto": [
            { "if": { "type": "all", "conditions": [{ "type": "macroCondition", "name": "worn" }, { "type": "knows", "perspective": "father", "about": { "concepts": ["chase", "avoid"] } }] }, "node": "blue_kitchen" },
            { "node": "old_door" }
          ] },
        { "id": "keep_house", "text": "Refuse to sell. Move in, and keep his rooms the way they were",
          "do": [{ "type": "remember", "concepts": ["player", "chase", "refuse", "house"], "summary": "moved into his house and kept it the way it was" }],
          "goto": "blue_kitchen" },
        { "id": "mattie_choose", "text": "Give Mattie the casting vote. He's carried this too",
          "do": [{ "type": "remember", "concepts": ["player", "share", "listen", "mattie"], "summary": "gave your brother the casting vote" }],
          "goto": "the_sale" }
      ]
    },
    "yellow_tiles": {
      "ending": true,
      "text": [{ "value": [
        "Your own kitchen is yellow. The cupboard door is crooked; it's been crooked since you moved in. You peel an orange and it comes away in four bad pieces and your fingers are sticky and the kitchen stays exactly where it is.",
        { "if": { "type": "macroCondition", "name": "mumTrusts" },
          "text": "Your mother comes on Sundays now. She tells the flood story, the whole one, the leaving and the coming back, and she tells it a little differently each time, and by the fourth time she's laughing about him trying to fix a sink with a soup spoon.",
          "else": "Your mother doesn't talk about the first house again. Once, at Christmas, she puts an orange beside your plate without saying anything." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "fatherKnows" },
          "text": "You miss him, the real one, the one who left and came back and fixed the sink as an apology because he didn't know how to say it. He was more complicated than the man at the blue table. You're glad you got to meet him, even late.",
          "else": "You miss him. You'll never know what that winter was. Some days that feels like a mercy and some days like a door you walked past." },
        { "recall": { "perspective": "osei", "among": ["present", "searching", "honest"] },
          "format": "At your six-month review Dr Osei writes in your file that you {summary}. She underlines it, which she never does." }
      ] }]
    },
    "old_door": {
      "ending": true,
      "text": [{ "value": [
        "The first house has been repainted green. Somebody's bicycle is chained to the gate. Your mother points to the window on the left, the kitchen, and says that's where your father used to wave from when she came up the path, before, and after. You don't recover the blue kitchen. It isn't in there. It was never a place you could go back to.",
        { "if": { "type": "macroCondition", "name": "mumTrusts" },
          "text": "She takes your arm on the walk back to the car. 'I'm glad you know,' she says. 'I'm glad it's not only mine any more.'",
          "else": "On the walk back to the car she says, 'I hope that was worth it,' and you're not sure which of you she's asking." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "mattieClose" },
          "text": "Mattie is waiting in the car with the engine off. He's been crying and pretends he hasn't. You let him pretend.",
          "else": "Mattie didn't come. He sends a thumbs-up when you text him a photo of the green door." },
        { "recall": { "perspective": "halina", "among": ["tender", "closed", "honest", "searching"] },
          "format": "Years later, your mother tells your niece about the day you {summary}. She tells it like it was the day something got mended." }
      ] }]
    },
    "blue_kitchen": {
      "ending": true,
      "text": [{ "value": [
        "You stop fighting the episodes. You stop writing them down. Each evening, when the light changes, you let the blue kitchen have you, and your father is there with the orange, saying whatever you need him to say. You lose your licence in the spring and your job in the summer. You don't mind as much as you should.",
        { "if": { "type": "macroCondition", "name": "fatherKnows" },
          "text": "Some nights he tries to tell you about the winter he left. You change the subject. In the blue kitchen, you can do that.",
          "else": "He never once mentions the winter he left. He doesn't know about it. Neither, by now, do you, quite." },
        "\n\n",
        { "recall": { "perspective": "mattie", "among": ["tender", "closed", "searching", "present"] },
          "format": "Mattie comes round on Thursdays and does your shopping. He remembers, mostly, that you {summary}. He doesn't say it. He puts the oranges in the fruit bowl, in a pile, the way Dad used to." },
        { "recall": { "perspective": "osei", "among": ["present", "searching", "honest"] },
          "format": "Dr Osei's last letter to you notes that you {summary}. It ends: 'My door remains open.'" }
      ] }]
    },
    "the_sale": {
      "ending": true,
      "text": [{ "value": [
        "Mattie takes the offer. He also takes the deckchair, and the fuse wire, and, after a long time standing in the kitchen, the tap from the sink, which he unscrews himself with Dad's wrench while you hold the torch. 'It's stupid,' he says. 'He fixed a different sink.' It isn't stupid. You both know which sink he means.",
        { "if": { "type": "macroCondition", "name": "mattieClose" },
          "text": "He mounts the tap on a board in his hallway like a trophy. Every time you visit, he turns it on and nothing comes out, and every time you both laugh.",
          "else": "You don't see the tap again. You hope it's somewhere. You don't ask." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "worn" },
          "text": "The blue kitchen still comes, more often than it should. Dr Osei adjusts the dose again. You're learning that some doors don't close, they just get further away.",
          "else": "The blue kitchen comes less now. When it does, you sit at the table for a minute and then you say, out loud, 'I have to go,' and you go." },
        { "recall": { "perspective": "halina", "among": ["tender", "closed", "honest", "searching"] },
          "format": "Your mother, sorting her own things years later, finds a note she wrote after the sale: the day you {summary}." }
      ] }]
    }
  }
});
