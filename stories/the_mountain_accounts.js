registerStory({
  "id": "the_mountain_accounts",
  "title": "The Mountain's Accounts",
  "synopsis": "A mountain town has paid its taxes for eighty years but appears on no map. As an archivist, you can bring its history into the light, or become one more person who came to count it.",
  "start": "records",
  "characters": {
    "rosa": { "name": "Mama Rosa" },
    "arce": { "name": "Deputy Arce" },
    "tupaq": { "name": "Elder Tupaq" },
    "kusi": { "name": "Kusi" },
    "sela": { "name": "Sela Ortiz" }
  },
  "traits": {
    "respectful": { "label": "someone who asked first", "concepts": { "ask_permission": 1.5, "return": 1, "listen": 1 } },
    "extractive": { "label": "one more census-taker", "concepts": { "take": 1, "copy": 0.7, "publish_names": 1.5 } },
    "lawful": { "label": "a creature of procedure", "concepts": { "procedure": 1, "obey": 1 } },
    "defiant": { "label": "defiant", "concepts": { "defy": 1, "smuggle": 1.5 } },
    "honest": { "label": "honest", "concepts": { "truth": 1, "admit": 1, "lie": -1.5 } }
  },
  "macros": {
    "townTrusts": { "tag": "the town trusts you", "condition": { "type": "dominantTrait", "perspective": "tupaq", "among": ["respectful", "extractive"], "is": "respectful" } },
    "rosaHurt": { "tag": "Mama Rosa saw", "condition": { "type": "knows", "perspective": "rosa", "about": { "concepts": ["take", "khipu"] } } },
    "arceKnowsLie": { "tag": "Arce knows you lied", "condition": { "type": "knows", "perspective": "arce", "about": { "concepts": ["lie", "arce"] } } },
    "hasCopies": { "tag": "your copies", "condition": { "type": "association", "a": "player", "b": "copy", "min": 1 } }
  },
  "nodes": {
    "records": {
      "text": "The Confederation Archive says the conquest ended four centuries ago. Your grandmother says it never quite ended; it just learned to do paperwork. You are a junior archivist in the Office of Fiscal Continuity, correcting old tax ledgers for digitisation, and on a Tuesday in the cold season you find a town that has paid its dues for eighty years and appears on no map.\n\nQhapaq Pampa. Payments every quarter since 1944. No census entry. No road. No coordinates. Someone has been very careful to keep receiving the money without ever writing down where it came from.",
      "onEnter": [{ "type": "remember", "concepts": ["archive", "qhapaq_pampa", "ledger", "missing_town"] }],
      "choices": [
        { "id": "trace_properly", "text": "Log the anomaly and trace it through the proper request system",
          "do": [{ "type": "remember", "concepts": ["player", "procedure", "law", "ledger"], "witnesses": ["arce"],
            "summary": "logged the missing town through the proper channels" }],
          "goto": "ledger" },
        { "id": "copy_home", "text": "Quietly photocopy the file and take it home tonight",
          "do": [{ "type": "remember", "concepts": ["player", "take", "copy", "defy", "ledger"],
            "summary": "smuggled copies of the file out of the archive" }],
          "goto": "ledger" }
      ]
    },
    "ledger": {
      "text": [
        { "value": [
          "The payments change form over the decades: maize, then copper, then, after 1961, a line that just says 'energy offset'. The year the Wiñay dam was built. After that the file is stamped CLASSIFIED in violet ink, and the stamp is signed by someone whose name has been cut out with a razor.",
          "Deputy Director Benedikt Arce appears at your desk in the late afternoon, which he has never done. He is a soft-spoken man with a fountain pen and thirty years in the building. 'Some files are closed for good reasons,' he says. 'Most of the reasons are other people's.'",
          { "if": { "type": "knows", "perspective": "arce", "about": { "concepts": ["procedure", "ledger"] } },
            "text": "He taps the edge of your desk. 'I saw your request. It was very correctly filed. I am asking you, as a courtesy, to let it be lost.'" }
        ] }
      ],
      "choices": [
        { "id": "tell_arce", "text": "Tell him the truth: there's a town out there owed something",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "arce"], "witnesses": ["arce"],
            "summary": "told your superior plainly that the town was owed something" }],
          "goto": "khipu" },
        { "id": "promise_drop", "text": "Promise him you'll drop it",
          "do": [{ "type": "remember", "concepts": ["player", "lie", "arce"], "witnesses": ["arce"],
            "summary": "promised your superior you'd drop it, and didn't" }],
          "goto": "khipu" },
        { "id": "formal_hearing", "text": "File a formal demand for declassification, and copy him on it",
          "do": [{ "type": "remember", "concepts": ["player", "procedure", "defy", "law", "arce"], "witnesses": ["arce"],
            "summary": "filed a formal demand to open the file, with his name on it" }],
          "goto": "khipu" }
      ]
    },
    "khipu": {
      "text": "Your grandmother, Mama Rosa, lives above a hardware shop with three hundred houseplants and a radio that only gets one station. When you say the name Qhapaq Pampa she goes to the back room and returns with a bundle wrapped in a cloth that smells of cedar.\n\nShe unrolls khipu across the table: knotted cords in brown and red and a dark green that's nearly black. She reads them with her fingers. A settlement by a river. A promise of shared water. A family line that walked out of an imperial census rather than be counted. 'Ours,' she says. 'We carried these out so we would not be written down by people who wanted to own us. Do not carry them into another census.'",
      "choices": [
        { "id": "ask_cords", "text": "Ask her permission to take the cords to Qhapaq Pampa",
          "do": [{ "type": "remember", "concepts": ["player", "ask_permission", "listen", "khipu", "rosa"], "witnesses": ["rosa"],
            "summary": "asked your grandmother's permission before touching the cords" }],
          "goto": "rosa_answer" },
        { "id": "photo_cords", "text": "Photograph the cords while she makes tea",
          "do": [{ "type": "remember", "concepts": ["player", "take", "copy", "khipu"], "witnesses": ["rosa"],
            "summary": "photographed the family khipu while your grandmother's back was turned" }],
          "goto": "journey" },
        { "id": "leave_cords", "text": "Leave them where they are, and carry only the story",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "return", "khipu", "rosa"], "witnesses": ["rosa"],
            "summary": "left the cords with your grandmother and carried only the story" }],
          "goto": "journey" }
      ]
    },
    "rosa_answer": {
      "text": "Mama Rosa looks at you for a long moment, and then at the cords. 'You asked,' she says, as if this is the important part. She rewraps them in the cedar cloth with hands that have done it a thousand times. 'Show them. Don't give them. If the people there say they are theirs, then they are theirs, and you come home without them.'",
      "onEnter": [{ "type": "set", "variable": "carrying_khipu", "value": true }],
      "choices": [{ "id": "rosa_on", "text": "Promise, and pack for the mountains", "goto": "journey" }]
    },
    "journey": {
      "text": "The bus to the high valleys leaves at four in the morning and climbs for eleven hours. The woman in the seat beside you is in her forties, in a HydroAndina fleece, with an engineer's tablet and a thermos she offers you without asking. 'Sela,' she says. 'I do the turbine inspections at Wiñay. Nobody goes up this road for fun. What's your reason?'",
      "choices": [
        { "id": "tell_sela", "text": "Tell her the truth: you're looking for a town that isn't on any map",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "sela", "qhapaq_pampa"], "witnesses": ["sela"],
            "summary": "told a company engineer exactly where you were going and why" }],
          "goto": "arrival" },
        { "id": "lie_sela", "text": "Tell her you're a tourist, photographing churches",
          "do": [{ "type": "remember", "concepts": ["player", "lie", "sela"], "witnesses": ["sela"],
            "summary": "claimed to be a tourist on the mountain bus" }],
          "goto": "arrival" },
        { "id": "ask_sela", "text": "Ask her about the dam instead, and listen",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "sela", "dam"], "witnesses": ["sela"],
            "summary": "asked about the dam and let the engineer talk" }],
          "goto": "arrival" }
      ]
    },
    "arrival": {
      "text": [
        { "value": [
          "Qhapaq Pampa sits in the shadow of the Wiñay dam like a dog under a table. Forty houses, a school, a clinic with a generator that runs four hours a day. Above them, the dam's power lines hum toward the cities. A girl of about twelve meets you at the bus stop as if she's been told to. 'I'm Kusi,' she says. 'I'm learning the cords. The elder says to bring you.'",
          "Elder Tupaq is very old and very upright, in a room with a clay floor and a calendar from 1998. He asks you to sit. 'People come up from the archive every forty years,' he says. 'They count us and go away. What did you bring, and what will you take?'"
        ] }
      ],
      "choices": [
        { "id": "show_khipu", "text": "Lay Mama Rosa's cords on the table, and say they are only to be shown",
          "showIf": { "type": "variable", "name": "carrying_khipu", "operator": "eq", "value": true },
          "do": [{ "type": "remember", "concepts": ["player", "return", "ask_permission", "khipu", "tupaq"], "witnesses": ["tupaq", "kusi"],
            "summary": "laid your grandmother's cords on the elder's table and asked nothing for them" }],
          "goto": "matching_cords" },
        { "id": "show_copies", "text": "Show him the photocopies from the archive",
          "showIf": { "type": "macroCondition", "name": "hasCopies" },
          "do": [{ "type": "remember", "concepts": ["player", "take", "copy", "tupaq"], "witnesses": ["tupaq", "kusi"],
            "summary": "arrived with the archive's copies of the town already in your bag" }],
          "goto": "town_books" },
        { "id": "ask_books", "text": "Bring nothing out. Ask whether you may see the town's own records",
          "do": [{ "type": "remember", "concepts": ["player", "ask_permission", "listen", "tupaq"], "witnesses": ["tupaq", "kusi"],
            "summary": "asked whether you could see the town's records, and waited for the answer" }],
          "goto": "town_books" }
      ]
    },
    "matching_cords": {
      "text": "Tupaq doesn't touch the cords. He sends Kusi to the back of the house and she returns with a bundle of her own: brown and red and green so dark it's nearly black. Kusi lays them alongside your grandmother's. The knots match for forty cords and then diverge, as though two families had been telling the same story until one of them had to run.\n\n'Your grandmother's grandmother,' Tupaq says, 'or someone who loved her.' He is quiet for a while. 'Thank you for not giving them to me.'",
      "onEnter": [{ "type": "remember", "concepts": ["khipu", "tupaq", "rosa", "kin", "shared_history"], "witnesses": ["tupaq", "kusi"] }],
      "choices": [{ "id": "matching_on", "text": "Ask him to show you the rest", "goto": "town_books" }]
    },
    "town_books": {
      "text": [
        { "value": [
          { "if": { "type": "macroCondition", "name": "townTrusts" },
            "text": "Tupaq takes you to the schoolhouse, where the town's records live in tin trunks under the children's desks.",
            "else": "Tupaq lets you see the records, but Kusi stands beside every trunk you open, the way you'd watch a stranger near a baby." },
          "Three centuries of cords and ledgers. And a contract from 1961, signed by the Confederation, HydroAndina and the elders of Qhapaq Pampa: in exchange for flooding the lower valley, thirty percent of the dam's revenue would go to the town, in perpetuity. They paid their taxes every quarter in electricity they never received. HydroAndina never paid them once. The Confederation classified the town so that nobody would ever add it up."
        ] }
      ],
      "choices": [
        { "id": "photograph_all", "text": "Photograph everything, quickly, before anyone changes their mind",
          "do": [{ "type": "remember", "concepts": ["player", "take", "copy", "town_books"], "witnesses": ["tupaq", "kusi"],
            "summary": "photographed every page in the trunks before anyone could say no" }],
          "goto": "sela_visit" },
        { "id": "ask_share", "text": "Ask what the town wants shared and what it wants kept",
          "do": [{ "type": "remember", "concepts": ["player", "ask_permission", "listen", "town_books"], "witnesses": ["tupaq", "kusi"],
            "summary": "asked which pages the town wanted shared and which it wanted kept" }],
          "goto": "sela_visit" },
        { "id": "help_kusi", "text": "Help Kusi re-tie a cord that's come apart",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "return", "kusi"], "witnesses": ["kusi", "tupaq"],
            "summary": "sat on the schoolhouse floor and helped a child re-tie a broken cord" }],
          "goto": "sela_visit" }
      ]
    },
    "sela_visit": {
      "text": [
        { "if": { "type": "knows", "perspective": "sela", "about": { "concepts": ["truth", "qhapaq_pampa"] } },
          "value": "Two days later Sela Ortiz walks into the square in her HydroAndina fleece. 'You told me where you were going,' she says to you, not unkindly. 'I told my boss. I'm sorry. He told me to come and make an offer.' She has a folder: a 'community development fund', a new generator, a school roof. In exchange, the town signs a release, and the archive file is lost. Her father, she says, poured concrete for the dam. 'I grew up on its money. I didn't know whose it was.'" },
        { "value": "Two days later Sela Ortiz walks into the square in her HydroAndina fleece. The company has found out about the archive file. It doesn't matter how; companies always do. She has a folder: a 'community development fund', a new generator, a school roof. In exchange, the town signs a release, and the archive file is lost. Her father, she says, poured concrete for the dam. 'I grew up on its money. I didn't know whose it was.'" }
      ],
      "onEnter": [{ "type": "gossip", "from": "sela", "to": ["arce"], "belief": 0.8 }],
      "choices": [
        { "id": "refuse_publicly", "text": "Refuse the offer loudly, in front of everyone in the square",
          "do": [{ "type": "remember", "concepts": ["player", "defy", "truth", "sela"], "witnesses": ["sela", "tupaq", "kusi"],
            "summary": "refused the company's offer in the square before the town could answer it" }],
          "goto": "arce_call" },
        { "id": "negotiate_alone", "text": "Take Sela aside and negotiate a better number for them",
          "do": [{ "type": "remember", "concepts": ["player", "take", "sela", "negotiate"], "witnesses": ["sela"],
            "summary": "negotiated on the town's behalf without asking it" }],
          "goto": "arce_call" },
        { "id": "bring_to_tupaq", "text": "Bring Sela to Elder Tupaq, and step back",
          "do": [{ "type": "remember", "concepts": ["player", "ask_permission", "listen", "sela"], "witnesses": ["sela", "tupaq"],
            "summary": "brought the company to the elder and stepped back" }],
          "goto": "arce_call" }
      ]
    },
    "arce_call": {
      "text": [
        { "value": [
          "That night the clinic's phone rings and it's for you. Arce. His voice down the line is tired.",
          { "if": { "type": "macroCondition", "name": "arceKnowsLie" },
            "text": "'You told me you'd drop it,' he says. 'I believed you. I'm old enough to know better, and I believed you.'" },
          "'HydroAndina has called the Minister. The Qhapaq Pampa file is being deaccessioned on Friday. That means burned, in case they didn't teach you the word. I can't stop it. I'm telling you because I'm sixty-one and I have never once told anyone anything.' A pause. 'If you come back by Thursday and say you were on holiday, you keep your job.'"
        ] }
      ],
      "choices": [
        { "id": "go_back", "text": "Go back, and fight it through the proper channels",
          "do": [{ "type": "remember", "concepts": ["player", "procedure", "obey", "arce"], "witnesses": ["arce", "tupaq"],
            "summary": "went back down the mountain to fight it from inside the archive" }],
          "goto": "kusi_night" },
        { "id": "stay_defy", "text": "Tell him you're staying, and he can tell the Minister so",
          "do": [{ "type": "remember", "concepts": ["player", "defy", "truth", "arce"], "witnesses": ["arce"],
            "summary": "told the Archive you weren't coming back" }],
          "goto": "kusi_night" },
        { "id": "ask_arce_smuggle", "text": "Ask Arce to get the original file out before Friday",
          "do": [{ "type": "remember", "concepts": ["player", "smuggle", "defy", "arce"], "witnesses": ["arce"],
            "summary": "asked an old man to risk his pension smuggling the file out" }],
          "goto": "kusi_night" }
      ]
    },
    "kusi_night": {
      "text": [
        { "value": [
          "Kusi finds you on the schoolhouse step under more stars than you have ever seen. She has a question she has obviously practised. 'If it goes in the newspapers,' she says, 'will you put our names in? My grandfather's name is in the 1961 contract. The census people took his brother away in 1970 for not being on the list. My mother says names are how they find you.'",
          { "if": { "type": "trait", "perspective": "kusi", "trait": "extractive", "min": 2 },
            "text": "She sits at the far end of the step. She has seen you with your camera." }
        ] }
      ],
      "choices": [
        { "id": "promise_kusi", "text": "Promise her no name goes anywhere without the family's consent",
          "do": [{ "type": "remember", "concepts": ["player", "ask_permission", "promise", "kusi"], "witnesses": ["kusi"],
            "summary": "promised no name would leave the valley without consent" }],
          "goto": "assembly" },
        { "id": "names_real", "text": "Tell her that names are what make the story real to people in the city",
          "do": [{ "type": "remember", "concepts": ["player", "publish_names", "truth", "kusi"], "witnesses": ["kusi"],
            "summary": "said that names were what made the story real" }],
          "goto": "assembly" },
        { "id": "elders_decide", "text": "Tell her it's for the elders and the families to decide, not you",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "return", "kusi"], "witnesses": ["kusi"],
            "summary": "said it wasn't your decision to make" }],
          "goto": "assembly" }
      ]
    },
    "assembly": {
      "text": [
        { "if": { "type": "macroCondition", "name": "townTrusts" },
          "value": "The town assembly meets in the schoolhouse with the children's drawings still on the walls. Every family sends someone. Elder Tupaq asks you to sit in the circle, not outside it. 'This one asked,' he tells them, and some of the older women nod as if that settles a great deal. They will decide what to do. They want to know what you think." },
        { "value": "The town assembly meets in the schoolhouse with the children's drawings still on the walls. Every family sends someone. You are asked to wait by the door. Through it you hear your name several times, and the word for census, which you know from your grandmother. Eventually Tupaq comes out. 'They will decide,' he says. 'But you have a part to play in it, whatever they think of you. Tell me what you will do.'" }
      ],
      "onEnter": [{ "type": "gossip", "from": "kusi", "to": ["tupaq"], "belief": 1 }],
      "choices": [
        { "id": "publish", "text": "Publish the 1961 contract and let the country argue in daylight",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "defy", "publish"], "summary": "published the contract" }],
          "goto": "public_hearing" },
        { "id": "settle", "text": "Help the town negotiate with HydroAndina for what it can get now",
          "do": [{ "type": "remember", "concepts": ["player", "negotiate", "listen"], "summary": "helped the town bargain with the company" }],
          "goto": "settlement" },
        { "id": "stay_archive", "text": "Stay, and help the town build an archive of its own",
          "do": [{ "type": "remember", "concepts": ["player", "return", "listen", "stay"], "summary": "stayed to help the town keep its own record" }],
          "goto": "living_archive" },
        { "id": "go_home_quiet", "text": "Go home. Keep your job. Fight it, slowly, from your desk",
          "do": [{ "type": "remember", "concepts": ["player", "procedure", "obey"], "summary": "went back to your desk" }],
          "goto": "the_closed_file" }
      ]
    },
    "public_hearing": {
      "ending": true,
      "text": [{ "value": [
        "The 1961 contract runs on the front page of two national papers. HydroAndina contests every clause. The Confederation's water council is forced to open a hearing it cannot hold in private. Qhapaq Pampa wins no apology and no electricity, not yet. It wins the right to make its case where everyone can hear it.",
        { "if": { "type": "knows", "perspective": "kusi", "about": { "concepts": ["promise", "kusi"] } },
          "text": "The elders choose which names are printed. Kusi's grandfather's name is one of them; her family chose it. The rest are left as blanks, and the blanks are the most-quoted part of the coverage.",
          "else": "The names go out with the documents. You did not choose which; a sub-editor did, at midnight. Two families in Qhapaq Pampa receive visits from men in good shoes in the weeks after. Nobody is taken. Everybody remembers the visits." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "rosaHurt" },
          "text": "The photographs of Mama Rosa's khipu appear in one article, uncredited. You don't know how. She doesn't speak to you until the spring, and when she does, she only says: 'You see? This is how it happens. Even with us.'",
          "else": "Mama Rosa cuts the article out and pins it above her radio, next to a photograph of her mother." },
        { "recall": { "perspective": "tupaq", "among": ["respectful", "extractive", "honest", "defiant"] },
          "format": "At the hearing, Elder Tupaq is asked about the archivist. 'You mean the one who {summary}?' he says, and declines to say more." }
      ] }]
    },
    "settlement": {
      "ending": true,
      "text": [{ "value": [
        "HydroAndina agrees to pay twelve percent of revenue into a town trust while the larger claim proceeds. Some families call it an insult. Others point to the clinic refrigerator that now runs all night, and the school lights, and a child who no longer has to be carried down the mountain for insulin. You helped secure an immediate, imperfect remedy instead of a reckoning. The dispute remains, now written in a contract the town helped shape.",
        { "if": { "type": "knows", "perspective": "tupaq", "about": { "concepts": ["take", "negotiate"] } },
          "text": "Tupaq never quite forgives you for negotiating before you were asked. 'You got us a good number,' he says. 'You got it the way they get things.'" },
        "\n\n",
        { "if": { "type": "knows", "perspective": "arce", "about": { "concepts": ["smuggle", "arce"] } },
          "text": "Arce gets the original file out on Thursday night in a box of retirement cards. He's dismissed in December. He sends you a postcard of the archive's front steps: 'Worth it. Probably.'",
          "else": "The original file is burned on Friday, as scheduled. The settlement makes no reference to 1961." },
        { "recall": { "perspective": "sela", "among": ["respectful", "extractive", "honest", "defiant", "lawful"] },
          "format": "Sela Ortiz resigns from HydroAndina a year later. In her exit interview she mentions the archivist who {summary}." }
      ] }]
    },
    "living_archive": {
      "ending": true,
      "text": [{ "value": [
        "You stay. The children record the elders' accounts beside the engineers' maps; Kusi teaches you more about the cords in a month than the Archive taught you in six years. The town is still contested and still owed. But it is no longer absent. It keeps its own record now, in tin trunks under the school desks, in a place where nobody else can decide to burn it.",
        { "if": { "type": "macroCondition", "name": "townTrusts" },
          "text": "In your second year, they give you a cord of your own to tie. It records that you came, and asked, and stayed.",
          "else": "In your second year, Tupaq tells you that the town has decided you may stay. It is not the same as being trusted. You understand the difference better than anyone." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "rosaHurt" },
          "text": "You write to Mama Rosa and tell her you deleted the photographs. It's true. It takes her a year to write back.",
          "else": "Mama Rosa visits in the dry season, on the four o'clock bus, and sits with Tupaq in the clay-floored room comparing cords until it's dark. 'Kin,' she says, when you ask what they talked about. 'Kin.'" },
        { "recall": { "perspective": "kusi", "among": ["respectful", "extractive", "honest", "defiant"] },
          "format": "Kusi, who is the record-keeper now, ties one more knot for you on the day you finally leave. It records that you {summary}." }
      ] }]
    },
    "the_closed_file": {
      "ending": true,
      "text": [{ "value": [
        "You go back on Thursday and say you were on holiday. On Friday the file is burned in the archive's basement incinerator, as scheduled, and you sign the destruction log because that is your job. You spend the next nine years filing correct, polite requests, every one of them denied for a new reason. You are very good at procedure. It is a slow and lonely kind of courage, and sometimes you are not sure it is courage at all.",
        { "if": { "type": "macroCondition", "name": "hasCopies" },
          "text": "The photocopies you smuggled out in your first week are in a shoebox under your bed. Every year you take them out and look at them, and every year you put them back.",
          "else": "There is no copy of anything. You made sure of that, in the beginning, because it was the rule." },
        "\n\n",
        { "recall": { "perspective": "arce", "among": ["lawful", "defiant", "honest"] },
          "format": "When Arce retires, he leaves you his fountain pen and a note: he remembers that you {summary}." },
        { "recall": { "perspective": "tupaq", "among": ["respectful", "extractive", "honest"] },
          "format": "In Qhapaq Pampa, Kusi ties a knot for the archivist who {summary}, and then went away like all the others." }
      ] }]
    }
  }
});
