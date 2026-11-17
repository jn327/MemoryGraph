registerStory({
  "id": "the_quiet_ministry",
  "title": "The Quiet Ministry",
  "synopsis": "Danubia, 1936. You are a clerk at the Ministry of Continuity, where nothing is ever forbidden, only delayed. Your brother has applied to hold a meeting, and somewhere a file is being kept on you.",
  "start": "application",
  "characters": {
    "laszlo": { "name": "Laszlo" },
    "father": { "name": "Your father" },
    "erzsi": { "name": "Erzsi" },
    "halmi": { "name": "Director Halmi" },
    "file": { "name": "Your file", "hidden": true }
  },
  "traits": {
    "loyal": { "label": "loyal to the Ministry", "concepts": { "comply": 1, "obey": 1, "report": 1.5 } },
    "subversive": { "label": "subversive", "concepts": { "copy": 1, "warn": 1, "leak": 1.5 } },
    "brave": { "label": "brave", "concepts": { "stand": 1, "speak": 1 } },
    "careful": { "label": "careful", "concepts": { "wait": 1, "verify": 1, "conceal": 0.7 } },
    "treacherous": { "label": "an informer", "concepts": { "inform": 2, "betray": 1.5 } },
    "trusting": { "label": "someone who trusted them", "concepts": { "confide": 1, "forgive": 1.5 } }
  },
  "macros": {
    "fileSuspects": { "tag": "your file", "condition": { "type": "any", "conditions": [{ "type": "trait", "perspective": "file", "trait": "subversive", "min": 1.5 }, { "type": "trait", "perspective": "file", "trait": "brave", "min": 2 }] } },
    "informed": { "tag": "what you told Halmi", "condition": { "type": "association", "a": "player", "b": "inform", "min": 1 } },
    "laszloTrusts": { "tag": "Laszlo trusts you", "condition": { "type": "all", "conditions": [
      { "type": "trait", "perspective": "laszlo", "trait": "treacherous", "max": 0 },
      { "type": "trait", "perspective": "laszlo", "trait": "loyal", "max": 1 }
    ] } }
  },
  "nodes": {
    "application": {
      "text": "In 1936 the revolution in the East has failed, and the old governments of the Danube survived it by promising order. They speak of continuity now, never of fear. You are Anna Kovacs, a third-grade clerk in the Ministry of Continuity's Office of Assemblies. You review applications for public gatherings. Nothing is ever refused here. Things are only postponed, relocated, referred.\n\nOn your desk this morning: an application from Laszlo Kovacs, your brother, to hold a meeting of teachers about the dismissal of Professor Gábor Kovacs, your father. The file is thin enough to fit in one hand. Clipped to it, in Director Halmi's green ink: Kovacs matters to me personally. H.",
      "onEnter": [{ "type": "remember", "concepts": ["ministry", "application", "laszlo", "father", "dismissal"] }],
      "choices": [
        { "id": "approve", "text": "Approve it yourself, before Halmi sees it",
          "do": [{ "type": "remember", "concepts": ["player", "stand", "speak", "laszlo", "permit"], "witnesses": ["laszlo", "halmi", "file"],
            "summary": "approved your brother's meeting over the Director's instruction" }, { "type": "set", "variable": "path", "value": "approved" }],
          "goto": "erzsi_lunch" },
        { "id": "warn_laszlo", "text": "Send it to Halmi as instructed, then warn Laszlo what's coming",
          "do": [{ "type": "remember", "concepts": ["player", "warn", "comply", "laszlo"], "witnesses": ["laszlo"],
            "summary": "passed the file upstairs and warned your brother that night" }, { "type": "set", "variable": "path", "value": "warned" }],
          "goto": "erzsi_lunch" },
        { "id": "refer", "text": "Refer it to Halmi and say nothing to anyone",
          "do": [{ "type": "remember", "concepts": ["player", "comply", "obey", "wait", "laszlo"], "witnesses": ["halmi", "file"],
            "summary": "sent your brother's application upstairs and said nothing" }, { "type": "set", "variable": "path", "value": "referred" }],
          "goto": "erzsi_lunch" }
      ]
    },
    "erzsi_lunch": {
      "text": "Erzsi Tóth has the desk opposite yours and has been your closest friend since your first week, when she showed you which drawer of the ladies' lavatory had the good soap. At lunch in the courtyard she asks, too casually, about your brother. She has been asking a lot of questions lately. She is also thinner than she was in the spring, and she keeps looking at the windows.",
      "choices": [
        { "id": "confide", "text": "Tell her everything: Laszlo, Father, the meeting",
          "do": [{ "type": "remember", "concepts": ["player", "confide", "laszlo", "erzsi"], "witnesses": ["erzsi"],
            "summary": "talked about your brother's plans over lunch as if the walls had no ears" }],
          "goto": "consequence" },
        { "id": "say_nothing", "text": "Change the subject and tell her nothing",
          "do": [{ "type": "remember", "concepts": ["player", "conceal", "wait", "erzsi"], "witnesses": ["erzsi"],
            "summary": "changed the subject whenever anyone asked about your family" }],
          "goto": "consequence" },
        { "id": "ask_erzsi", "text": "Ask her what's wrong",
          "do": [{ "type": "remember", "concepts": ["player", "confide", "verify", "erzsi"], "witnesses": ["erzsi"],
            "summary": "asked what was wrong, and waited for the answer" }],
          "goto": "erzsi_mother" }
      ]
    },
    "erzsi_mother": {
      "text": "Erzsi looks at her soup for a long time. Her mother's widow's pension was suspended in May, 'pending review'. No reason given. Her mother is sixty-eight and has a bad chest. 'They said these things can be reviewed favourably,' Erzsi says, 'for families who show continuity.' She doesn't explain the word. She doesn't need to. She squeezes your hand under the table, hard, and then lets go.",
      "choices": [{ "id": "erzsi_on", "text": "Go back to your desk", "goto": "consequence" }]
    },
    "consequence": {
      "text": [
        { "if": { "type": "variable", "name": "path", "operator": "eq", "value": "approved" },
          "value": "Your stamp holds for two days. Then the hall is declared structurally unsafe by a building inspector nobody has heard of. On the evening of the meeting, police stand outside the locked doors and copy down the names of everyone who arrives to find them shut. Laszlo comes to your flat afterwards, soaked. 'They found a way round it,' he says. 'But your signature's on the permit. They can't pretend nobody said yes.'" },
        { "if": { "type": "variable", "name": "path", "operator": "eq", "value": "warned" },
          "value": "Laszlo changes the venue three times. Each new application is refused for a new and reasonable reason: a railway line nearby, a school nearby, too many people expected for the fire regulations. Nobody forbids anything. The rules are written as if nobody is forbidding anything. Laszlo brings you the refusals in a biscuit tin. 'You knew,' he says. 'Thank you for telling me you knew.'" },
        { "value": "The application comes back down from Halmi's office a week later stamped REFERRED FOR FURTHER CONSIDERATION, which is how the Ministry says never. Laszlo finds out, of course; your initials are on the routing slip. He doesn't come to Sunday dinner. Your father sets his place anyway." }
      ],
      "choices": [{ "id": "go_laszlo", "text": "Meet Laszlo at the café on Szent Street", "goto": "laszlo_ask" }]
    },
    "laszlo_ask": {
      "text": [
        { "value": [
          "The Café Mandula has a pianist who only knows waltzes and a waiter who used to be a schoolmaster. Laszlo orders two coffees and doesn't drink his. He is twenty-six and looks forty this month.",
          { "if": { "type": "variable", "name": "path", "operator": "eq", "value": "referred" },
            "text": "'I saw your initials on the slip,' he says first. 'I'm not here about that. I'm here because I haven't got anyone else.'" },
          "Two of his teachers, a married couple, have been told their names are 'under review'. They need to get to Vienna. They need travel permits. The Ministry of Continuity keeps blank permits in a cabinet on the second floor, and you have the key, because you file them."
        ] }
      ],
      "choices": [
        { "id": "steal_permits", "text": "Take two blank permits from the cabinet tomorrow",
          "do": [{ "type": "remember", "concepts": ["player", "copy", "stand", "permits", "laszlo"], "witnesses": ["laszlo"],
            "summary": "stole blank travel permits for two teachers" }, { "type": "set", "variable": "permits", "value": true }],
          "goto": "father" },
        { "id": "refuse_permits", "text": "Refuse. If they count the permits, it ends with you",
          "do": [{ "type": "remember", "concepts": ["player", "careful", "wait", "permits", "laszlo"], "witnesses": ["laszlo"],
            "summary": "refused to steal the permits your brother asked for" }],
          "goto": "father" },
        { "id": "report_request", "text": "Tell him no, and mention the request to Halmi in passing, to protect yourself",
          "do": [{ "type": "remember", "concepts": ["player", "report", "inform", "permits"], "witnesses": ["halmi", "file"],
            "summary": "told the Director your brother had asked you for permits" }],
          "goto": "father" }
      ]
    },
    "father": {
      "text": [
        { "value": [
          "Your father taught literature at the Lyceum for twenty-six years until he read his final-year class a poem about a river that refuses to be dammed. He is sixty, and he has started ironing his shirts every morning although he has nowhere to go.",
          "He shows you a letter. The Ministry of Education will reinstate him at full salary if he signs a statement that his dismissal was 'a misunderstanding arising from an ambiguous text'. 'Your mother would have told me to sign it,' he says. 'Your brother will never forgive me if I do. What do you say, Anna?'",
          { "if": { "type": "knows", "perspective": "father", "about": { "concepts": ["obey", "laszlo"] } },
            "text": "He doesn't mention the routing slip. He doesn't need to." }
        ] }
      ],
      "onEnter": [{ "type": "gossip", "from": "laszlo", "to": ["father"], "belief": 0.9 }],
      "choices": [
        { "id": "refuse_sign", "text": "Tell him not to sign. The poem was not a misunderstanding",
          "do": [{ "type": "remember", "concepts": ["player", "stand", "speak", "father"], "witnesses": ["father"],
            "summary": "told your father not to sign" }],
          "goto": "halmi" },
        { "id": "sign_safe", "text": "Tell him to sign. Pride won't pay for his medicine",
          "do": [{ "type": "remember", "concepts": ["player", "comply", "careful", "wait", "father"], "witnesses": ["father"],
            "summary": "told your father to sign the statement" }],
          "goto": "halmi" },
        { "id": "his_choice", "text": "Tell him it's his name, and his decision",
          "do": [{ "type": "remember", "concepts": ["player", "confide", "verify", "father"], "witnesses": ["father"],
            "summary": "told your father the decision was his alone" }],
          "goto": "halmi" }
      ]
    },
    "halmi": {
      "text": [
        { "value": [
          "Director Halmi's office has a rubber plant and a portrait of the Regent and a silver tray with a coffee pot that is always full. He pours you a cup himself, which he has never done.",
          { "if": { "type": "knows", "perspective": "halmi", "about": { "concepts": ["permit", "laszlo"] } }, "tag": "Halmi saw your stamp",
            "text": "He sets your brother's permit on the blotter between you, with your stamp on it. 'You approved this over my note,' he says mildly. 'I've decided to call it family feeling. I can only call it that once.'",
            "else": "" },
          { "if": { "type": "macroCondition", "name": "fileSuspects" },
            "text": "He has a buff folder open on his blotter. Your name is on the tab. 'I'm told you've been keeping some interesting company,' he says, and turns a page you can't see.",
            "else": "'You're a careful worker, Miss Kovacs,' he says. 'I've always said so.'" },
          "Then he leans back. 'Your brother is a worry to me. Not to the Ministry, you understand. To me, personally.' He sets down the pot. 'If I knew where his teachers met, and who came, I would be able to reassure people. And when people are reassured, pensions are reviewed favourably. Your father's, for instance.'"
        ] }
      ],
      "onEnter": [{ "type": "gossip", "from": "erzsi", "to": ["file"], "belief": 0.7 }],
      "choices": [
        { "id": "agree_inform", "text": "Agree to report on Laszlo's meetings",
          "do": [{ "type": "remember", "concepts": ["player", "inform", "report", "laszlo"], "witnesses": ["halmi", "file"],
            "summary": "agreed to report on your own brother" }],
          "goto": "the_list" },
        { "id": "refuse_halmi", "text": "Refuse him, politely, to his face",
          "do": [{ "type": "remember", "concepts": ["player", "stand", "speak", "halmi"], "witnesses": ["halmi", "file"],
            "summary": "refused the Director to his face" }],
          "goto": "the_list" },
        { "id": "false_reports", "text": "Agree, and plan to feed him harmless lies",
          "do": [
            { "type": "remember", "concepts": ["player", "report", "comply", "halmi"], "witnesses": ["halmi", "file"],
              "summary": "agreed to report on your brother's meetings" },
            { "type": "remember", "concepts": ["player", "conceal", "subterfuge", "laszlo"],
              "summary": "fed the Director harmless lies to keep him satisfied" }
          ],
          "goto": "the_list" }
      ]
    },
    "the_list": {
      "text": [
        { "value": [
          "At your father's kitchen table, the family begins a list. Every meeting blocked anywhere in the city; every reason given; every name on every routing slip. Laszlo's teachers bring entries. So do railwaymen, and a choir, and a society of amateur astronomers who wanted to look at a comet.",
          { "if": { "type": "macroCondition", "name": "informed" },
            "text": "You sit at the table and help write the list, and you remember every name, because on Thursday you will have to decide which of them to give to Halmi." },
          "The list is in pencil. It will never be complete without the Ministry's own records, which are three floors under your desk."
        ] }
      ],
      "choices": [
        { "id": "copy_records", "text": "Stay late and copy the Ministry's own refusals, one by one",
          "do": [{ "type": "remember", "concepts": ["player", "copy", "leak", "records"], "witnesses": ["erzsi"],
            "summary": "stayed late copying the Ministry's refusals" }],
          "goto": "erzsi_truth" },
        { "id": "verify_list", "text": "Keep the list in the family, and verify each entry before anything else",
          "do": [{ "type": "remember", "concepts": ["player", "verify", "wait", "conceal", "records"], "witnesses": ["laszlo", "father"],
            "summary": "kept the list at home and checked every entry twice" }],
          "goto": "erzsi_truth" },
        { "id": "give_harmless", "text": "Give Halmi a copy with the dangerous names left out",
          "showIf": { "type": "macroCondition", "name": "informed" },
          "do": [{ "type": "remember", "concepts": ["player", "inform", "conceal", "records"], "witnesses": ["halmi", "file"],
            "summary": "gave the Director a version of the list with the dangerous names left out" }],
          "goto": "erzsi_truth" },
        { "id": "give_full", "text": "Give Halmi the whole list. Your father's pension, your brother's safety",
          "showIf": { "type": "macroCondition", "name": "informed" },
          "do": [{ "type": "remember", "concepts": ["player", "inform", "betray", "records", "laszlo"], "witnesses": ["halmi", "file"], "strength": 2,
            "summary": "handed the Director every name on the family's list" }],
          "goto": "erzsi_truth" }
      ]
    },
    "erzsi_truth": {
      "onEnter": [{ "type": "gossip", "from": "erzsi", "to": ["file"], "belief": 0.7 }],
      "text": [
        { "value": [
          "Erzsi waits for you after work under the lime trees by the tram stop, in the rain, without an umbrella.",
          "'I've been reporting on you,' she says. 'Since May. Every Friday. Since my mother's pension.' She is shaking.",
          { "recall": { "perspective": "erzsi", "among": ["subversive", "brave", "careful", "trusting"] },
            "format": "'The last thing I told them was that you {summary}. I made it sound smaller than it was. I always tried to make it sound smaller.'",
            "otherwise": "'I never had anything to tell them. You never gave me anything. I think I hated you for it.'" },
          "She wipes her face with the back of her hand and looks at you properly. 'I'm telling you because I can't sleep. I'm telling you because you're the only person I've got.'"
        ] }
      ],
      "choices": [
        { "id": "forgive_erzsi", "text": "Forgive her, and ask her to keep reporting, but only what you give her",
          "do": [{ "type": "remember", "concepts": ["player", "forgive", "confide", "erzsi"], "witnesses": ["erzsi"],
            "summary": "forgave an informer under the lime trees and made her your ally" }],
          "goto": "the_raid" },
        { "id": "report_erzsi", "text": "Report her to Halmi for indiscretion. It will make you look loyal",
          "do": [{ "type": "remember", "concepts": ["player", "inform", "betray", "erzsi"], "witnesses": ["halmi", "file", "erzsi"],
            "summary": "reported your closest friend to the Director" }],
          "goto": "the_raid" },
        { "id": "walk_away", "text": "Walk away, and never speak to her again",
          "do": [{ "type": "remember", "concepts": ["player", "conceal", "wait", "erzsi"], "witnesses": ["erzsi"],
            "summary": "walked away from your closest friend in the rain" }],
          "goto": "the_gathering" }
      ]
    },
    "the_gathering": {
      "text": [
        { "value": [
          "On Thursday night forty people meet in the cellar of a bookbinder's on Kígyó Street, among stacks of unbound pages and the smell of glue. No permit. No application. Laszlo has asked your father to read.",
          { "if": { "type": "knows", "perspective": "father", "about": { "concepts": ["comply", "father"] } },
            "text": "He signed the statement in the end. He tells you so at the cellar door, quietly, as though confessing. 'And then I found I still wanted to read the poem. Isn't that ridiculous?'" },
          "The poem is about a river that will not be dammed. When he gets to the line about the water remembering its old course, an old railwayman at the back starts to cry, and then someone hears boots on the cobbles outside, and every head turns toward the stairs."
        ] }
      ],
      "choices": [
        { "id": "stand_front", "text": "Stand at the front, beside your father, where anyone coming down the stairs will see you first",
          "do": [{ "type": "remember", "concepts": ["player", "stand", "speak", "father", "gathering"], "witnesses": ["father", "laszlo"],
            "summary": "stood in front of your father in the cellar when the boots came" }],
          "goto": "the_raid" },
        { "id": "keep_watch", "text": "Go up and keep watch at the street door",
          "do": [{ "type": "remember", "concepts": ["player", "careful", "wait", "gathering"], "witnesses": ["laszlo"],
            "summary": "kept watch at the cellar door" }],
          "goto": "the_raid" },
        { "id": "slip_out", "text": "Slip out the back. A Ministry clerk cannot be found here",
          "do": [{ "type": "remember", "concepts": ["player", "conceal", "wait", "gathering"], "witnesses": ["father", "laszlo"],
            "summary": "slipped out the back of the cellar before the poem was finished" }],
          "goto": "the_raid" }
      ]
    },
    "the_raid": {
      "text": [
        { "if": { "type": "macroCondition", "name": "fileSuspects" },
          "value": "They come for your father's flat at four in the morning, two men in good coats and a third in uniform who waits on the landing. They are very polite. They are looking for 'unauthorised copies of administrative documents'. Your father makes them coffee. They take his typewriter, three boxes of letters, and his reading glasses, by accident or not. They do not find the list, because Laszlo took it to his lodgings yesterday. They will go there next." },
        { "if": { "type": "macroCondition", "name": "informed" },
          "value": "They come for the astronomers at four in the morning. You know it was the astronomers because you gave Halmi their names. Nobody is arrested; the society is merely dissolved, and its telescope impounded pending review. On Sunday Laszlo tells the story at dinner, furious, and asks how they could possibly have known." },
        { "value": "They come for a choir at four in the morning, three streets away. Nobody you know. The choir's conductor is held for two days and released without explanation, and when he comes home he cannot remember the words to anything. Laszlo brings the news on Sunday. 'They're getting closer,' he says. 'The list has to go somewhere, soon.'" }
      ],
      "choices": [
        { "id": "to_newspaper", "text": "Take the list to the independent newspapers tonight",
          "do": [{ "type": "remember", "concepts": ["player", "leak", "speak", "list"], "witnesses": ["laszlo", "father"],
            "summary": "carried the list to the newspapers yourself" }],
          "goto": "the_circles" },
        { "id": "hide_in_ministry", "text": "Hide the list in the one place they will never search: the Ministry's own archive",
          "do": [{ "type": "remember", "concepts": ["player", "conceal", "copy", "list"], "witnesses": ["laszlo"],
            "summary": "hid the family's list inside the Ministry's own archive" }],
          "goto": "the_circles" },
        { "id": "burn_list", "text": "Burn it. Names on paper are how they find people",
          "do": [{ "type": "remember", "concepts": ["player", "careful", "wait", "list"], "witnesses": ["laszlo", "father"],
            "summary": "burned the list in your father's stove" }],
          "goto": "the_circles" }
      ]
    },
    "the_circles": {
      "text": [
        { "value": [
          "The list, or its ashes, has taught you this much: no single law forbids anything in Danubia. A hundred small decisions make everything impossible. People are meeting anyway, in kitchens and workshops and the back rooms of cafés. They are asking what comes next. Laszlo asks you.",
          { "if": { "type": "macroCondition", "name": "laszloTrusts" },
            "text": "He asks you the way he used to ask you about homework, as if you'll know.",
            "else": "He asks you warily, the way you'd ask a stranger for directions." }
        ] }
      ],
      "onEnter": [{ "type": "gossip", "from": "halmi", "to": ["file"], "belief": 1 }],
      "choices": [
        { "id": "publish_record", "text": "Make it public. Let everyone see the pattern, whatever it costs",
          "do": [{ "type": "remember", "concepts": ["player", "speak", "leak", "public"], "summary": "chose to make the pattern public" }],
          "goto": "open_record" },
        { "id": "small_circles", "text": "Build a quiet network: shared rooms, shared care, information passed hand to hand",
          "do": [{ "type": "remember", "concepts": ["player", "careful", "confide", "circles"], "summary": "built the quiet network" }],
          "goto": "small_circles" },
        { "id": "become_informer", "text": "Go to Halmi. Tell him everything. Save what you can",
          "do": [{ "type": "remember", "concepts": ["player", "inform", "betray", "report"], "strength": 2, "summary": "told Halmi everything" }],
          "goto": "the_informer" },
        { "id": "cross_border", "text": "Get your father and brother on the night train to Vienna",
          "do": [{ "type": "remember", "concepts": ["player", "stand", "careful", "border"], "summary": "took your family over the border" }],
          "goto": "the_border" }
      ]
    },
    "open_record": {
      "ending": true,
      "text": [{ "value": [
        "The newspapers publish the pattern in October: four hundred and twelve gatherings refused in eighteen months, each for a reasonable reason. The Ministry insists every decision was proper. It can no longer pretend each case was isolated. The response is harsher for a while. The argument about what the government is doing has begun in public, and it does not stop.",
        { "if": { "type": "macroCondition", "name": "fileSuspects" },
          "text": "You are dismissed from the Ministry on the morning the third article runs. Halmi signs the letter himself, in green ink.",
          "else": "Nobody at the Ministry suspects you. You sit at your desk while the scandal breaks around you and stamp REFERRED on the applications, and every one you stamp, you remember." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "laszloTrusts" },
          "text": "Laszlo frames the first front page and hangs it in your father's kitchen.",
          "else": "Laszlo reads the articles and does not call you. Someone tells him, later, who the source was. He still doesn't call." },
        { "recall": { "perspective": "file", "among": ["subversive", "loyal", "brave", "careful", "treacherous"] },
          "format": "In 1990, when the Ministry's archives are opened, you request your file. The last entry, in a hand you don't recognise, notes that you {summary}." }
      ] }]
    },
    "small_circles": {
      "ending": true,
      "text": [{ "value": [
        "Meetings move between kitchens and workshops, smaller than the hall your brother wanted, with copies of the list carried only by people the families trust. People keep showing up. Your father teaches again, in a borrowed room above a tailor's, without a Ministry seal on the door. He reads them the poem about the river.",
        { "if": { "type": "knows", "perspective": "erzsi", "about": { "concepts": ["forgive", "erzsi"] } },
          "text": "Every Friday Erzsi reports to the Ministry exactly what you've told her to. Her mother's pension is reviewed favourably in the spring. Your file, she tells you, now describes a clerk of exemplary dullness.",
          "else": "Erzsi transfers to the Ministry of Transport in the new year. You see her once on a tram, years later. She looks at you, and then out of the window." },
        "\n\n",
        { "recall": { "perspective": "father", "among": ["brave", "careful", "loyal", "trusting", "treacherous"] },
          "format": "Your father lives to see the war end. Near the end he tells you he is proudest of the day you {summary}." },
        { "recall": { "perspective": "file", "among": ["subversive", "loyal", "brave", "careful", "treacherous"] },
          "format": "In 1990, when the Ministry's archives are opened, your file is four pages long. It records that you {summary}, and nothing else of what you did." }
      ] }]
    },
    "the_informer": {
      "ending": true,
      "text": [{ "value": [
        "Halmi listens to everything you tell him, writes none of it down in front of you, and pours you another cup of coffee. Your father's pension is restored in a fortnight. Laszlo's teachers are dissolved, then dispersed, then forgotten. Laszlo himself is not arrested. You made sure of that. He is only watched, for the rest of his life, and he never finds out why the watchers always knew where to stand.",
        { "if": { "type": "knows", "perspective": "laszlo", "about": { "concepts": ["inform", "laszlo"] } },
          "text": "He finds out in 1990. The archives open and he reads his file, and your initials are on forty pages of it. He sends you a single sheet of paper with one of them photocopied. Nothing else.",
          "else": "He dies in 1978 without ever knowing. You carry it for both of you." },
        "\n\n",
        { "if": { "type": "knows", "perspective": "erzsi", "about": { "concepts": ["inform", "erzsi"] } },
          "text": "Erzsi is dismissed for indiscretion in November. Her mother's pension is never reviewed." },
        { "recall": { "perspective": "halmi", "among": ["loyal", "treacherous", "careful", "brave"] },
          "format": "Halmi's recommendation for your promotion praises the clerk who {summary}." }
      ] }]
    },
    "the_border": {
      "ending": true,
      "text": [{ "value": [
        "You buy three tickets with your savings and a forged travel permit made on the Ministry's own paper, stamped with a stamp you have used ten thousand times. On the night train to Vienna your father sits by the window and doesn't sleep. At the frontier a guard reads your permit for a long time, then hands it back and says, 'Continuity,' with a little smile, as if it's a joke between you.",
        { "if": { "type": "macroCondition", "name": "laszloTrusts" },
          "text": "Laszlo holds your hand across the compartment the whole way through the frontier, like he did when you were children and the trains were terrifying.",
          "else": "Laszlo comes, but he sits in another carriage. When you reach Vienna he shakes your hand on the platform, and goes his own way." },
        { "if": { "type": "variable", "name": "permits", "operator": "eq", "value": true },
          "text": "On the platform at Vienna Westbahnhof, a married couple are waiting with a cardboard sign that says KOVACS. They crossed in September on two permits that went missing from a cabinet on the second floor. The wife holds your face in both hands and doesn't say anything at all." },
        "\n\n",
        { "if": { "type": "knows", "perspective": "erzsi", "about": { "concepts": ["forgive", "erzsi"] } },
          "text": "Erzsi files a report the next morning saying you went to visit an aunt in the country. It buys you three days. You never get to thank her." },
        { "recall": { "perspective": "file", "among": ["subversive", "loyal", "brave", "careful", "treacherous"] },
          "format": "Your file, opened in 1990, ends mid-page. The last entry records that you {summary}. Under it, someone has written: Whereabouts unknown." }
      ] }]
    }
  }
});
