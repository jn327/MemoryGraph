registerStory({
  "id": "the_distance_between_us",
  "title": "The Distance Between Us",
  "synopsis": "A commuter's pocket mind-scanner caught a bus driver imagining a crash. You are his lawyer, and someone has just offered you a scanner of your own.",
  "start": "the_scan",
  "characters": {
    "ellis": { "name": "Ellis" },
    "june": { "name": "June" },
    "jury": { "name": "The jury" },
    "calloway": { "name": "Calloway" },
    "ravi": { "name": "Ravi Sallis" },
    "clearview": { "name": "Clearview's file on you", "hidden": true }
  },
  "traits": {
    "principled": { "label": "principled", "concepts": { "consent": 1, "privacy": 1, "truth": 1 } },
    "ruthless": { "label": "ruthless", "concepts": { "scan": 1.5, "expose": 1, "humiliate": 1 } },
    "manipulative": { "label": "manipulative", "concepts": { "coach": 1.5, "lie": 1.5, "trick": 1 } },
    "kind": { "label": "kind", "concepts": { "listen": 1, "comfort": 1, "protect": 0.7 } },
    "dangerous": { "label": "dangerous", "concepts": { "danger": 1, "deceit": 1.5, "doubt": -1 } },
    "careful": { "label": "careful", "concepts": { "careful": 1 } }
  },
  "macros": {
    "juryTrustsEllis": { "tag": "the jury believes Ellis", "condition": { "type": "dominantTrait", "perspective": "jury", "subject": "ellis", "among": ["careful", "dangerous"], "is": "careful" } },
    "misconduct": { "tag": "your scan", "condition": { "type": "knows", "perspective": "calloway", "about": { "concepts": ["scan", "player"] } } },
    "ellisTrustsYou": { "tag": "Ellis trusts you", "condition": { "type": "all", "conditions": [
      { "type": "trait", "perspective": "ellis", "trait": "manipulative", "max": 1 },
      { "type": "not", "condition": { "type": "knows", "perspective": "ellis", "about": { "concepts": ["expose", "june"] } } }
    ] } }
  },
  "nodes": {
    "the_scan": {
      "text": [{ "value": [
        "Lenses cost forty dollars now. You point one at a stranger on the train and it shows you, for a few seconds, what is passing through their mind. Some courts admit the recordings. This one does.",
        "\n\n",
        "Your client, Ellis Varga, has driven the 41 bus for nineteen years. A commuter named Ravi Sallis scanned him at a red light by the market and caught an image: the bus mounting the pavement, the stalls going under the wheels. Ellis is charged with planning a vehicular attack.",
        "\n\n",
        "'It comes every time I pass the market,' Ellis tells you in the holding room. His hands are folded so tightly the knuckles are white. 'Since I was nine. I saw a lorry go into a crowd. Every time, the picture comes, and then I think: slow down. Check the mirror. Every time.' He looks at the table. 'My daughter doesn't know. Nobody knows. Now strangers know me better than June does.'",
        { "if": { "type": "knows", "perspective": "ellis", "about": { "concepts": ["player", "ellis"] } }, "tag": "Ellis remembers you",
          "text": "Then he looks up and studies your face. 'Have we done this before?' he says. 'I feel like I've already told you all of this, and I can't remember how it went.'" }
      ] }],
      "onEnter": [{ "type": "remember", "concepts": ["ellis", "scan", "market", "lens"] }],
      "choices": [
        { "id": "tell_june_advice", "text": "Tell him June should hear it from him before she hears it in court",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "truth", "ellis", "june"], "witnesses": ["ellis"],
            "summary": "told your client his daughter deserved to hear it from him" }],
          "goto": "june" },
        { "id": "say_nothing_advice", "text": "Tell him to say nothing to anyone, June included",
          "do": [{ "type": "remember", "concepts": ["player", "protect", "privacy", "ellis"], "witnesses": ["ellis"],
            "summary": "told your client to keep it from everyone, even his daughter" }],
          "goto": "june" }
      ]
    },
    "june": {
      "text": "June Varga is fifteen and waiting for you on the courthouse steps with her school bag on both shoulders. Kids at school have started pointing Lenses at her in the corridor to see if she's 'like her dad'. She has stopped thinking in lessons. 'Is it true?' she says. 'Does he think about killing people? You've talked to him. You know.'",
      "choices": [
        { "id": "tell_june_secret", "text": "Tell her what he told you",
          "do": [{ "type": "remember", "concepts": ["player", "expose", "truth", "june", "ellis"], "witnesses": ["june"],
            "summary": "told a fifteen-year-old her father's secret before he could" }],
          "goto": "discovery" },
        { "id": "his_to_tell", "text": "Tell her it's his story, and he should be the one to tell it",
          "do": [{ "type": "remember", "concepts": ["player", "privacy", "consent", "june"], "witnesses": ["june"],
            "summary": "told a frightened girl it was her father's story to tell" }],
          "goto": "discovery" },
        { "id": "lie_to_june", "text": "Tell her the scan is fake, doctored by the company",
          "do": [{ "type": "remember", "concepts": ["player", "lie", "comfort", "june"], "witnesses": ["june"],
            "summary": "told a frightened girl the scan was faked" }],
          "goto": "discovery" }
      ]
    },
    "discovery": {
      "text": "Your investigator brings you three things. First: Ravi Sallis isn't a concerned citizen. He's a contractor for Clearview Risk, which pays four hundred dollars for every flagged 'threat thought' it can sell to insurers. He has flagged sixty-one people this year. Second: Clearview sold the court a trimmed recording; the original is longer.\n\nThird, she puts on your desk, without comment, a Lens of your own. 'Everyone on the other side has one,' she says. 'Calloway's office scans witnesses in the lifts. I'm just saying.'",
      "choices": [
        { "id": "scan_ravi", "text": "Scan Ravi Sallis in the corridor before the hearing",
          "do": [{ "type": "remember", "concepts": ["player", "scan", "ravi", "secret"], "witnesses": ["clearview"],
            "summary": "scanned the witness yourself, without his consent" }],
          "goto": "scan_ravi" },
        { "id": "scan_juror", "text": "Scan juror four, the one who won't look at Ellis",
          "do": [{ "type": "remember", "concepts": ["player", "scan", "trick", "juror"], "witnesses": ["clearview"],
            "summary": "scanned a juror to find out what she was thinking" }],
          "goto": "scan_juror" },
        { "id": "refuse_lens", "text": "Put the Lens in a drawer and lock it",
          "do": [{ "type": "remember", "concepts": ["player", "consent", "privacy", "lens"], "witnesses": ["clearview"],
            "summary": "locked away the scanner you were offered" }],
          "goto": "hearing" }
      ]
    },
    "scan_ravi": {
      "text": "You point it at him from behind a pillar and it takes three seconds. Ravi Sallis is thinking about a bank letter: FINAL NOTICE in red. Then his daughter's face in a hospital bed. Then four hundred dollars, written out like a prayer. You know exactly how to break him on the stand. You also know you just did to him what he did to Ellis.",
      "onEnter": [{ "type": "set", "variable": "ravi_scanned", "value": true }],
      "choices": [{ "id": "scan_ravi_on", "text": "Pocket the Lens and go in", "goto": "hearing" }]
    },
    "scan_juror": {
      "text": "Juror four is a woman in a green cardigan. Three seconds: a boy on a bicycle. A bus. A hospital corridor with the lights too bright. Her son. She lied in jury selection, or she was never asked. If the court knew, she'd be removed. But the only way the court could know is if you told them how you know.",
      "onEnter": [{ "type": "set", "variable": "juror_scanned", "value": true }],
      "choices": [{ "id": "scan_juror_on", "text": "Pocket the Lens and go in", "goto": "hearing" }]
    },
    "hearing": {
      "text": "The prosecutor, Hal Calloway, is a pleasant man with a rugby player's neck and he does not waste the jury's time. He plays the scan on a screen the size of a wall: the 41 bus, from the driver's seat, rising onto the pavement, the market stalls going under. It lasts four seconds. Two jurors gasp. Juror four closes her eyes.\n\nEllis watches the screen, not the jury. He's seen it a thousand times. He's never seen it from outside.",
      "onEnter": [{ "type": "remember", "concepts": ["ellis", "danger", "market"], "strength": 3, "witnesses": ["jury", "june"] }],
      "choices": [
        { "id": "demand_full", "text": "Object: the scan is trimmed. Demand the full recording",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "consent", "full_record"], "witnesses": ["jury", "calloway"],
            "summary": "demanded the court see the whole recording" }],
          "goto": "full_record" },
        { "id": "recess", "text": "Ask for a recess, and get Ellis out of the room",
          "do": [{ "type": "remember", "concepts": ["player", "protect", "comfort", "ellis"], "witnesses": ["jury", "ellis"],
            "summary": "got your client out of the room before he had to watch it again" }],
          "goto": "cross" },
        { "id": "own_thoughts", "text": "Ask the court's permission to scan yourself, here, in front of the jury",
          "do": [
            { "type": "remember", "concepts": ["player", "truth", "consent", "vulnerable"], "witnesses": ["jury", "calloway", "ellis", "june", "clearview"],
              "summary": "let the jury scan your own mind to show them what an unchosen thought looks like" },
            { "type": "remember", "concepts": ["ellis", "doubt"], "strength": 1.5, "witnesses": ["jury"] }
          ],
          "goto": "own_scan" }
      ]
    },
    "own_scan": {
      "text": "The judge allows it, mostly out of curiosity. Calloway shrugs: rope, hanging. You hold the Lens to your own temple and the screen fills with what is in your head. Ellis's face. A wall. Your own car on the motorway, drifting, deliberately, toward the barrier. You have never told anyone that one either.\n\nThe courtroom is very quiet. 'I've never done it,' you say. 'I never will. I don't know why it comes. Nobody does. That is the point.'",
      "choices": [{ "id": "own_scan_on", "text": "Turn off the screen and call the witness", "goto": "cross" }]
    },
    "full_record": {
      "text": "The judge grants the order over Calloway's objection, and the next morning the full recording plays. The bus, the pavement, the stalls going under: four seconds. Then eight more that the jury has never seen. Ellis's hands tighten on the wheel. His eyes go to the mirror. In his head, in his own voice, steady as a prayer: Slow down. Check the mirror. Slow down. The bus in the recording brakes. A girl with a pushchair crosses safely in front of it.\n\nClearview cut those eight seconds before they sold the clip.",
      "onEnter": [
        { "type": "remember", "concepts": ["ellis", "careful", "mirror"], "strength": 2, "witnesses": ["jury", "june", "calloway"] },
        { "type": "doubt", "to": ["jury", "june"], "about": { "concepts": ["ellis", "danger", "market"] }, "belief": 0.4 }
      ],
      "choices": [{ "id": "full_on", "text": "Call Ravi Sallis to the stand", "goto": "cross" }]
    },
    "cross": {
      "text": [
        { "value": [
          "Ravi Sallis is thin and very polite, and he calls the judge 'sir' twice in the first minute. He says he saw a frightening image and did his civic duty.",
          { "if": { "type": "variable", "name": "ravi_scanned", "operator": "eq", "value": true },
            "text": "The Lens in your pocket weighs about as much as a stone. You know what he's afraid of. You could open him up like a tin." }
        ] }
      ],
      "choices": [
        { "id": "use_his_mind", "text": "Confront him with what you saw in his head: the debt, the bounty, his daughter",
          "showIf": { "type": "variable", "name": "ravi_scanned", "operator": "eq", "value": true },
          "do": [{ "type": "remember", "concepts": ["player", "scan", "expose", "humiliate", "ravi"], "witnesses": ["jury", "calloway", "ravi", "ellis", "june", "clearview"],
            "summary": "used a man's own stolen thoughts against him on the stand" }],
          "goto": "calloway_objects" },
        { "id": "ask_bounty", "text": "Ask him, on the record, how much Clearview pays per flag",
          "do": [
            { "type": "remember", "concepts": ["player", "truth", "ravi", "bounty"], "witnesses": ["jury", "ravi", "calloway"],
              "summary": "made the witness say his price out loud" },
            { "type": "remember", "concepts": ["ellis", "doubt"], "witnesses": ["jury"] }
          ],
          "goto": "hallway" },
        { "id": "ask_shame", "text": "Ask him whether he's ever had a thought he was ashamed of",
          "do": [
            { "type": "remember", "concepts": ["player", "listen", "ravi"], "witnesses": ["jury", "ravi"],
              "summary": "asked the witness about his own shameful thoughts, and waited" },
            { "type": "remember", "concepts": ["ellis", "doubt"], "witnesses": ["jury"] }
          ],
          "goto": "hallway" }
      ]
    },
    "calloway_objects": {
      "text": "Ravi goes white. Then Calloway is on his feet. 'Your Honour, how does counsel know what the witness's daughter looks like?' Nobody in the room breathes. You could lie. You could say your investigator found medical records. Ellis is staring at you as if he's never seen you before.",
      "choices": [
        { "id": "admit_scan", "text": "Admit it: you scanned him in the corridor",
          "do": [{ "type": "remember", "concepts": ["player", "admit", "truth", "scan"], "witnesses": ["jury", "calloway", "ellis", "june"],
            "summary": "admitted in open court that you scanned the witness" }],
          "goto": "verdict" },
        { "id": "lie_records", "text": "Say your investigator found the medical records",
          "do": [{ "type": "remember", "concepts": ["player", "lie", "trick", "scan"], "witnesses": ["jury", "calloway", "ellis"],
            "summary": "lied to a judge about how you knew what you knew" }],
          "goto": "verdict" }
      ]
    },
    "hallway": {
      "text": "At the lunch break Ravi Sallis finds you by the vending machines. His hands are shaking. 'I want to take it back,' he says. 'All of it. I've flagged sixty-one people. Clearview says if I recant they'll sue me for breach. I have a daughter. She has a heart thing.' He looks at you like a man looking for a door.",
      "choices": [
        { "id": "protect_ravi", "text": "Give him the number of a lawyer who'll take Clearview on for free",
          "do": [{ "type": "remember", "concepts": ["player", "protect", "comfort", "ravi"], "witnesses": ["ravi"],
            "summary": "found him a lawyer when he was afraid" }],
          "goto": "preparation" },
        { "id": "threaten_ravi", "text": "Tell him to recant on the stand, or you'll make sure his sixty-one find out who he is",
          "do": [{ "type": "remember", "concepts": ["player", "humiliate", "expose", "ravi"], "witnesses": ["ravi"],
            "summary": "threatened him with his own sixty-one victims" }],
          "goto": "preparation" },
        { "id": "record_ravi", "text": "Keep him talking while your phone records in your pocket",
          "do": [{ "type": "remember", "concepts": ["player", "trick", "ravi"],
            "summary": "secretly recorded a frightened man" }],
          "goto": "preparation" }
      ]
    },
    "preparation": {
      "text": [
        { "value": [
          "The night before Ellis testifies, you sit with him in a meeting room that smells of instant coffee. He wants to take the stand. He wants to say it himself. The risk is that Calloway will ask how often the image comes, and the true answer is every single day.",
          { "if": { "type": "knows", "perspective": "ellis", "about": { "concepts": ["expose", "june"] } },
            "text": "Before you can begin, he says: 'June told me you told her.' He doesn't say anything else for a while. When he does, it's: 'Let's just get on with it.'" },
          { "if": { "type": "knows", "perspective": "ellis", "about": { "concepts": ["lie", "june"] } },
            "text": "'June thinks it's fake,' he says. 'She says you told her. I don't know how to tell her it isn't.'" }
        ] }
      ],
      "onEnter": [{ "type": "gossip", "from": "june", "to": ["ellis"], "about": { "concepts": ["june"] }, "belief": 1 }],
      "choices": [
        { "id": "coach_ellis", "text": "Coach him: say it comes rarely, only on bad days",
          "do": [{ "type": "remember", "concepts": ["player", "coach", "lie", "ellis"], "witnesses": ["ellis"],
            "summary": "coached your client to lie about how often the picture comes" },
            { "type": "remember", "concepts": ["ellis", "deceit"], "strength": 2, "witnesses": ["jury", "june"] },
            { "type": "set", "variable": "testimony", "value": "coached" }],
          "goto": "testimony" },
        { "id": "truth_ellis", "text": "Tell him to tell the truth, all of it, and you'll stand beside it",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "consent", "ellis"], "witnesses": ["ellis"],
            "summary": "told your client to tell the whole truth and promised to stand by it" },
            { "type": "remember", "concepts": ["ellis", "careful", "grief"], "strength": 2.5, "witnesses": ["jury", "june"] },
            { "type": "set", "variable": "testimony", "value": "truth" }],
          "goto": "testimony" },
        { "id": "keep_off", "text": "Overrule him. He stays off the stand",
          "do": [{ "type": "remember", "concepts": ["player", "protect", "ellis"], "witnesses": ["ellis"],
            "summary": "kept your client off the stand when he wanted to speak" },
            { "type": "remember", "concepts": ["ellis", "danger", "silence"], "strength": 0.5, "witnesses": ["jury"] },
            { "type": "set", "variable": "testimony", "value": "silent" }],
          "goto": "testimony" }
      ]
    },
    "testimony": {
      "text": [
        { "if": { "type": "variable", "name": "testimony", "operator": "eq", "value": "coached" },
          "value": "Ellis says it comes rarely. Only on bad days. Calloway nods sympathetically, then plays a Clearview log: six scans of Ellis in eight weeks, from six different commuters, each with the same image. 'Rarely, Mr Varga?' Ellis looks at you. Every juror sees him look at you." },
        { "if": { "type": "variable", "name": "testimony", "operator": "eq", "value": "silent" },
          "value": "Ellis does not testify. He sits beside you through the rest of the prosecution case with his hands folded, and the jury watches him the way you'd watch a dog that's never bitten anyone yet." },
        { "value": "Ellis tells them all of it. The lorry in the market when he was nine. A man under the wheels in a red coat. The picture that comes every day since, at the same corner. 'And then I check the mirror,' he says. 'Nineteen years. Every time. I'm the most careful driver on that route because I can't stop seeing what happens if I'm not.' Juror four is crying, very quietly." }
      ],
      "choices": [{ "id": "to_gallery", "text": "Rest the defence", "goto": "gallery" }]
    },
    "gallery": {
      "text": [
        { "value": [
          "In the corridor June is waiting for her father. She has been in the gallery every day.",
          { "if": { "type": "knows", "perspective": "june", "about": { "concepts": ["lie", "june"] } },
            "text": "She walks straight past him to you. 'You said it was fake,' she says. 'You said they made it up.' She has heard enough in that courtroom now to know it wasn't, and she is fifteen, and she does not know who to be angriest with.",
            "else": "She goes to him. She doesn't say anything. She puts her forehead on his chest the way she did when she was small, and Ellis puts one hand on the back of her head, and the court officer looks away." }
        ] }
      ],
      "choices": [
        { "id": "let_them_be", "text": "Leave them alone and write your closing",
          "do": [{ "type": "remember", "concepts": ["player", "privacy", "consent", "corridor"], "witnesses": ["june", "ellis"],
            "summary": "left them alone in the corridor" }],
          "goto": "closing" },
        { "id": "apologise_june", "text": "Apologise to June for whatever you got wrong",
          "do": [{ "type": "remember", "concepts": ["player", "admit", "comfort", "june"], "witnesses": ["june", "ellis"],
            "summary": "apologised to a fifteen-year-old outside the courtroom" }],
          "goto": "closing" }
      ]
    },
    "closing": {
      "text": "Closing arguments. The jury has seen four seconds of a bus mounting a pavement, and everything you've managed to put beside it. Calloway's closing is short and terrible: 'You saw what was in his head. Ask yourselves whether you'd put your children on that bus.'",
      "choices": [
        { "id": "close_deeds", "text": "Ask them to judge what Ellis did, nineteen years of it, not what he saw",
          "do": [
            { "type": "remember", "concepts": ["player", "truth", "consent", "closing"], "witnesses": ["jury", "ellis"],
              "summary": "asked the jury to judge him by what he did" },
            { "type": "remember", "concepts": ["ellis", "doubt"], "witnesses": ["jury"] }
          ],
          "goto": "verdict" },
        { "id": "close_company", "text": "Put Clearview on trial: a company that sells fear by the second",
          "do": [
            { "type": "remember", "concepts": ["player", "expose", "clearview", "closing"], "witnesses": ["jury", "calloway", "clearview"],
              "summary": "turned the closing into a war on Clearview" },
            { "type": "remember", "concepts": ["ellis", "doubt"], "strength": 0.5, "witnesses": ["jury"] }
          ],
          "goto": "verdict" },
        { "id": "close_juror", "text": "Address juror four directly: 'You know what it is to see something you can't stop seeing'",
          "showIf": { "type": "variable", "name": "juror_scanned", "operator": "eq", "value": true },
          "do": [{ "type": "remember", "concepts": ["player", "scan", "expose", "trick", "juror"], "witnesses": ["jury", "calloway", "ellis", "clearview"],
            "summary": "used a juror's stolen grief in your closing" }],
          "goto": "verdict" },
        { "id": "close_recording", "text": "Play the jury what Ravi said at the vending machines: 'I want to take it back'",
          "showIf": { "type": "association", "a": "trick", "b": "ravi", "min": 1 }, "tag": "your recording",
          "do": [
            { "type": "remember", "concepts": ["player", "trick", "expose", "ravi", "closing"], "witnesses": ["jury", "calloway", "ravi", "ellis"],
              "summary": "played the jury a frightened man's words that you'd recorded in secret" },
            { "type": "remember", "concepts": ["ellis", "doubt"], "strength": 1.5, "witnesses": ["jury"] }
          ],
          "goto": "verdict" }
      ]
    },
    "verdict": {
      "text": [
        { "if": { "type": "macroCondition", "name": "misconduct" },
          "value": "The judge clears the jury. In chambers, Calloway is almost gentle about it: unauthorised scanning of a witness or juror by counsel is a crime, and everything after it is poisoned. Mistrial. Ellis will be tried again, with a new lawyer, before a new jury who will see the four seconds fresh. You are referred to the bar. Ellis watches them take your name down. He doesn't say anything at all." },
        { "if": { "type": "macroCondition", "name": "juryTrustsEllis" },
          "value": "The jury is out for five hours. When they come back the foreperson, a retired electrician, reads 'not guilty' without looking at the paper. Ellis doesn't move. You have to touch his arm to tell him he's allowed to stand up." },
        { "value": "The jury is out for two days. When they come back, none of them look at Ellis. Guilty of conspiracy to commit a vehicular attack. Ellis nods as if this is something he has been expecting since he was nine. In the gallery June makes a sound you will hear for the rest of your career." }
      ],
      "choices": [
        { "id": "after_verdict", "text": "Walk out with him",
          "goto": [
            { "if": { "type": "macroCondition", "name": "misconduct" }, "node": "mistrial" },
            { "if": { "type": "macroCondition", "name": "juryTrustsEllis" }, "node": "outside" },
            { "node": "convicted" }
          ] }
      ]
    },
    "outside": {
      "text": "Outside, the reporters have Lenses in their hands like microphones. 'Ellis! What were you thinking when you heard the verdict?' A dozen little lights point at his head. He looks at you before deciding whether to answer.",
      "choices": [
        { "id": "step_between", "text": "Step between Ellis and the scanners. He owes them no thought",
          "do": [{ "type": "remember", "concepts": ["player", "protect", "privacy", "ellis"], "witnesses": ["ellis", "june"],
            "summary": "stood between your client and the cameras" }],
          "goto": "the_route" },
        { "id": "help_explain", "text": "Help him explain the difference between a thought and a plan",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "consent", "ellis"], "witnesses": ["ellis", "june"],
            "summary": "helped your client explain himself in his own words" }],
          "goto": "a_new_rule" },
        { "id": "take_mic", "text": "Take the microphones yourself and announce a campaign against Clearview",
          "do": [{ "type": "remember", "concepts": ["player", "expose", "clearview"], "witnesses": ["ellis", "june", "clearview"],
            "summary": "turned your client's acquittal into your own press conference" }],
          "goto": "a_new_rule" }
      ]
    },
    "convicted": {
      "text": "At sentencing, Ellis is given six years. He's allowed ten minutes with June in a room with a table bolted to the floor. Afterwards he asks to see you. 'Will you keep going?' he says. 'With the appeal. Not for me. For the next one.'",
      "choices": [
        { "id": "appeal", "text": "Promise him you'll take it all the way up",
          "do": [{ "type": "remember", "concepts": ["player", "promise", "protect", "ellis"], "witnesses": ["ellis", "june"],
            "summary": "promised to take his appeal all the way up" }],
          "goto": "the_appeal" },
        { "id": "honest_odds", "text": "Tell him honestly what the odds are",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "ellis"], "witnesses": ["ellis"],
            "summary": "told him the truth about the odds" }],
          "goto": "the_appeal" }
      ]
    },
    "mistrial": {
      "text": [
        { "if": { "type": "variable", "name": "ravi_scanned", "operator": "eq", "value": true },
          "value": "On the courthouse steps Ravi Sallis is waiting, not for Ellis, for you. 'You did the same thing to me that I did to him,' he says. 'I wanted you to know I know.' Then he goes down the steps, past the reporters, and points his own Lens at nobody at all." },
        { "value": "On the courthouse steps a woman in a green cardigan is waiting, not for Ellis, for you. Juror four. 'They told us why,' she says. 'You went into my head and took my son out of it and used him.' She doesn't raise her voice. 'I was going to vote for your client.' Then she goes down the steps, past the reporters, and doesn't look back." }
      ],
      "choices": [{ "id": "mistrial_on", "text": "Go home", "goto": "the_bar" }]
    },
    "a_new_rule": {
      "ending": true,
      "text": [{ "value": [
        "Eighteen months later the Mental Privacy Act passes: no scanning without consent, and no scan admitted in court without its full context. Enforcement is patchy and the market cameras stay up. But the next driver who sees something terrible at a red light will have a law to point to, and somewhere in the record of the debate, the name Ellis Varga is spelled correctly.",
        { "if": { "type": "knows", "perspective": "ravi", "about": { "concepts": ["protect", "ravi"] } },
          "text": "Ravi Sallis testifies in favour. He reads out the sixty-one names he flagged and apologises to each one by name. Two of them are in the gallery.",
          "else": "Ravi Sallis moves to another city. Clearview's lawyers make sure the sixty-one never learn his name." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "ellisTrustsYou" },
          "text": "Ellis sends you a photograph each Christmas of the 41 bus at the market corner. On the back, every year, the same three words: Checked the mirror.",
          "else": "Ellis never calls you again. You learn later that he told a reporter you were 'good at your job,' and that he said it the way you'd describe a surgeon who left a scar." },
        { "recall": { "perspective": "june", "among": ["principled", "ruthless", "manipulative", "kind"] },
          "format": "June, who becomes a lawyer, tells her students about the first one she ever watched, who {summary}." },
        { "recall": { "perspective": "clearview", "among": ["principled", "ruthless", "manipulative", "kind"] },
          "format": "The week before the Act takes effect, Clearview sells its last profiles to an insurer. Your Lens had been reporting home the whole time. Your profile, you find out years later, describes a lawyer who {summary}." }
      ] }]
    },
    "the_route": {
      "ending": true,
      "text": [{ "value": [
        "Ellis drives again in the spring. He still sees the bus mount the pavement at the market, and he still checks his mirror. The scan has changed nothing about what passes through his head. Your defence changed what the court could claim to know about him. The law is unsettled, and the next person scanned will have to start from nothing, but his route is his again.",
        "\n\n",
        { "if": { "type": "macroCondition", "name": "ellisTrustsYou" },
          "text": "The first week, June rides the whole route with him, front seat. At the market corner he says, out loud, 'Slow down. Check the mirror,' and she says it with him.",
          "else": "June doesn't ride the 41. Ellis tells you she will, one day. He doesn't sound sure, and he doesn't sound like he blames her." },
        { "recall": { "perspective": "ellis", "among": ["principled", "ruthless", "manipulative", "kind"] },
          "format": "When people ask Ellis about the trial, he tells them about the day you {summary}, and then he changes the subject." }
      ] }]
    },
    "the_appeal": {
      "ending": true,
      "text": [{ "value": [
        "The appeal takes three years. You lose at the first level and win at the second, on the ground that a fragment of a thought is not evidence of an intention. Ellis comes out of prison at fifty-one with a bus pass he is no longer allowed to use as a driver. The ruling bears his name. Law students will read it for decades without knowing what his hands looked like on the table.",
        "\n\n",
        { "if": { "type": "macroCondition", "name": "ellisTrustsYou" },
          "text": "He shakes your hand at the gate, then hugs you, awkwardly, like a man who has forgotten how. June is there. She's taller. She says thank you as if it costs her something, and it does.",
          "else": "He shakes your hand at the gate. June waits in the car and doesn't get out." },
        { "recall": { "perspective": "jury", "among": ["principled", "ruthless", "manipulative", "kind"] },
          "format": "Years later, one of the jurors writes to you. She still thinks about the trial, she says, and mostly about the lawyer who {summary}." }
      ] }]
    },
    "the_bar": {
      "ending": true,
      "text": [{ "value": [
        "You are suspended for two years. Ellis is retried with a new lawyer, a careful woman who keeps her Lens locked in a drawer, and the second jury sees the full recording. He is acquitted. You read about it in the newspaper, in a café, and you sit very still for a long time.",
        { "if": { "type": "knows", "perspective": "ellis", "about": { "concepts": ["lie", "scan"] } },
          "text": "He would have forgiven the scan, he tells the reporter. It was the lie to the judge he couldn't watch.",
          "else": "He tells the reporter that you made a terrible mistake for him, and that he doesn't know whether that makes it better or worse." },
        "\n\n",
        { "recall": { "perspective": "ravi", "among": ["principled", "ruthless", "manipulative", "kind"] },
          "format": "Ravi Sallis, it turns out, tells everyone who will listen about the lawyer who {summary}." },
        { "recall": { "perspective": "clearview", "about": { "trait": "ruthless" } },
          "format": "The bar's evidence against you comes from Clearview. Your Lens logged every use and sent it home, and the report is very thorough. Page one notes that you {summary}." },
        { "if": { "type": "visited", "node": "own_scan" },
          "text": "Your Lens is still in the drawer where you should have left it. Some nights you take it out and point it at the mirror, and you see a wall, and your own car drifting toward it, and you think: slow down. Check the mirror.",
          "else": "Your Lens is still in the drawer where you should have left it. Some nights you take it out and point it at the mirror. You never turn it on. You are afraid of what it would show you." }
      ] }]
    }
  }
});
