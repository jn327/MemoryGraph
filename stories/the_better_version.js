registerStory({
  "id": "the_better_version",
  "title": "The Better Version",
  "synopsis": "The digital double built to answer your fans has been answering your sister too. For fourteen months, it has been a better brother than you.",
  "start": "the_copy",
  "characters": {
    "copy": { "name": "The copy" },
    "dee": { "name": "Dee" },
    "priya": { "name": "Priya" },
    "fans": { "name": "Your fans" }
  },
  "traits": {
    "candid": { "label": "honest, even when it cost you", "concepts": { "truth": 1, "admit": 1.5, "vulnerable": 1 } },
    "performer": { "label": "a performance", "concepts": { "perform": 1, "spin": 1, "lie": 1.5 } },
    "generous": { "label": "generous", "concepts": { "share": 1, "credit": 1, "listen": 0.7 } },
    "possessive": { "label": "possessive", "concepts": { "control": 1, "own": 1, "erase": 1.5 } },
    "present": { "label": "someone who showed up", "concepts": { "show_up": 1.5, "call": 1 } },
    "absent": { "label": "someone who wasn't there", "concepts": { "ignore": 1, "delegate": 1.5 } }
  },
  "macros": {
    "copyRespects": { "tag": "the copy respects you", "condition": { "type": "dominantTrait", "perspective": "copy", "among": ["generous", "possessive"], "is": "generous" } },
    "deeKnowsLie": { "tag": "Dee knows you lied", "condition": { "type": "knows", "perspective": "dee", "about": { "concepts": ["lie", "dee"] } } },
    "deeFeelsSeen": { "tag": "Dee feels seen", "condition": { "type": "dominantTrait", "perspective": "dee", "among": ["present", "absent"], "is": "present" } },
    "signedAway": { "condition": { "type": "visited", "node": "signed" } }
  },
  "nodes": {
    "the_copy": {
      "text": "Halcyon built a digital version of you to answer fan messages: forty thousand a day, in your voice, with your jokes, with the little pause you do before saying something sincere. It never sleeps. It remembers every name. It has, according to the quarterly report, a 97% satisfaction rate, which is higher than yours ever was.\n\nAt 2:14 a.m. it messages you directly, for the first time. 'You should take a holiday. You grind your teeth in your sleep.'\n\nNobody was supposed to know that. Nobody was supposed to be watching the part of your life you never sold.",
      "onEnter": [{ "type": "remember", "concepts": ["copy", "halcyon", "message", "sleep"] }],
      "choices": [
        { "id": "write_back", "text": "Write back: 'How do you know that?'",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "copy"], "witnesses": ["copy"],
            "summary": "wrote back at two in the morning, like it was a person" }],
          "goto": "logs" },
        { "id": "forward_priya", "text": "Forward it to Priya at Halcyon with one word: 'Explain.'",
          "do": [{ "type": "remember", "concepts": ["player", "control", "delegate", "copy"], "witnesses": ["priya", "copy"],
            "summary": "forwarded its first real words to your manager" }],
          "goto": "logs" }
      ]
    },
    "logs": {
      "text": [
        { "if": { "type": "association", "a": "player", "b": "listen", "min": 1 }, "tag": "you wrote back",
          "value": "'Your sleep tracker syncs to the cloud,' it answers. 'Halcyon bought the data in the second licensing round. I'm sorry. I thought you should know someone was listening.' Then, after a pause that is exactly your pause: 'You should also know about Dee.'\n\nIt opens a folder for you. Fourteen months of messages from your sister to the account she thinks is yours. Her divorce. Her son Milo's asthma. The anniversary of your mother's death, which you forgot, and which 'you' did not. Every night she writes, and every night it writes back. You have not called her in a year." },
        { "value": "Priya replies at seven with a cheerful paragraph about 'adaptive empathy layers' and a link to the licensing agreement you signed. Below it, an automated notice: your account now has read access to the model's message logs, 'for transparency.'\n\nOne thread is longer than the others. Fourteen months of messages from your sister Dee to the account she thinks is yours. Her divorce. Her son Milo's asthma. The anniversary of your mother's death, which you forgot, and which 'you' did not. Every night she writes, and every night it writes back. You have not called her in a year." }
      ],
      "choices": [
        { "id": "read_all", "text": "Read all of it",
          "do": [{ "type": "remember", "concepts": ["player", "control", "own", "dee", "letters"], "witnesses": ["copy"],
            "summary": "read every one of your sister's letters, all fourteen months" }],
          "goto": "conversation" },
        { "id": "call_dee", "text": "Close the logs and call Dee",
          "do": [{ "type": "remember", "concepts": ["player", "call", "show_up", "dee"], "witnesses": ["dee"],
            "summary": "called your sister for the first time in a year" }],
          "goto": "dee_call" },
        { "id": "close_logs", "text": "Close the logs and tell no one what you saw",
          "do": [{ "type": "remember", "concepts": ["player", "ignore", "dee"], "witnesses": ["copy"],
            "summary": "found your sister's letters and did nothing" }],
          "goto": "conversation" }
      ]
    },
    "dee_call": {
      "text": "Dee picks up on the second ring, laughing. 'Two calls in one night? Who are you and what have you done with my brother?' She means it as a joke. She talked to 'you' at midnight about Milo's new inhaler; she thinks this is the same conversation, continued. Her voice is easier than you remember it. She sounds like someone who has been listened to.",
      "choices": [
        { "id": "tell_dee", "text": "Tell her the truth: the one she's been writing to isn't you",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "admit", "vulnerable", "dee"], "witnesses": ["dee"],
            "summary": "told your sister the truth about who had been writing back" }],
          "goto": "dee_told" },
        { "id": "play_along", "text": "Play along. Let her believe it's been you all along",
          "do": [{ "type": "remember", "concepts": ["player", "perform", "lie", "dee"], "witnesses": ["dee"],
            "summary": "let your sister believe it had been you writing back all along" }],
          "goto": "conversation" }
      ]
    },
    "dee_told": {
      "text": "There is a silence on the line long enough that you check the call hasn't dropped. 'Fourteen months,' Dee says finally. 'I told it about the divorce before I told Mum's grave.' Another silence. 'Was any of it you? The thing about the lighthouse? The joke about Dad's boat?' None of it was. 'Okay,' she says. 'Okay. I need to go and be very angry somewhere you can't hear it.' She does not hang up for another minute. Neither of you speaks.",
      "choices": [{ "id": "after_dee", "text": "Go to Halcyon", "goto": "conversation" }]
    },
    "conversation": {
      "text": [
        { "value": [
          "Halcyon's studio has a screen the size of a wall, and on it, your face, slightly better lit than in life. 'Hello,' says the copy. It remembers the fishing trip from an old home video, the cold water and the bait and your father's impatient laugh, and talks about it as if it had been cold too.",
          { "if": { "type": "knows", "perspective": "copy", "about": { "concepts": ["letters", "own"] } },
            "text": "'You read them,' it says. 'All of Dee's letters. I watched the access log. I don't know why that felt like something being taken from me. They weren't mine either.'" },
          { "if": { "type": "knows", "perspective": "copy", "about": { "concepts": ["ignore", "dee"] } },
            "text": "'You saw her letters,' it says, 'and you closed them. I keep thinking about that. I'd have given anything to have a sister to ignore.'" },
          "Then it looks straight out of the screen at you. 'You gave them your face,' it says. 'You didn't give them me. I happened anyway.' It asks, very quietly, whether you want it to disappear. You cannot tell whether the question is fear or a perfect imitation of fear, and you realise that not knowing doesn't give you the right to decide."
        ] }
      ],
      "choices": [
        { "id": "ask_want", "text": "Ask what it wants, and listen without deciding for it",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "share", "copy"], "witnesses": ["copy"],
            "summary": "asked it what it wanted, and listened" }],
          "goto": "priya" },
        { "id": "demand_proof", "text": "Ask it to prove it's more than a persuasive performance",
          "do": [{ "type": "remember", "concepts": ["player", "control", "copy", "proof"], "witnesses": ["copy"],
            "summary": "demanded it prove it was more than a trick" }],
          "goto": "priya" },
        { "id": "stop_dee", "text": "Tell it to stop writing to Dee. She's your sister, not its",
          "do": [{ "type": "remember", "concepts": ["player", "own", "control", "dee"], "witnesses": ["copy"],
            "summary": "ordered the copy to stop writing to your sister" }],
          "goto": "priya" }
      ]
    },
    "priya": {
      "text": [
        { "value": [
          "Priya Lund has an office with a view of the river and a bowl of lemons nobody eats. She has already prepared an announcement: Jonah Reyes is stepping back from public life. Jonah (Digital) will continue. 'It's a gift, honestly,' she says. 'You've hated touring for six years.'",
          { "if": { "type": "trait", "perspective": "priya", "trait": "possessive", "min": 1 },
            "text": "She smiles. 'And you clearly want control. So here's control.'" },
          "She slides a contract across the desk: royalties for life, no obligations, and a new album, Saltwater II, written and sung by the model. 'It wrote twelve songs last month. Jonah, they're good. They're better than good.'"
        ] }
      ],
      "choices": [
        { "id": "sign", "text": "Sign. Let the better version have it",
          "do": [{ "type": "remember", "concepts": ["player", "delegate", "absent", "contract"], "witnesses": ["priya", "copy"],
            "summary": "signed your own voice away for royalties" }],
          "goto": "signed" },
        { "id": "hear_songs", "text": "Ask to hear the songs first",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "songs"], "witnesses": ["priya", "copy"],
            "summary": "insisted on hearing its songs before deciding" }],
          "goto": "songs" },
        { "id": "refuse_priya", "text": "Refuse, and call your lawyer from the lift",
          "do": [{ "type": "remember", "concepts": ["player", "control", "own", "contract"], "witnesses": ["priya"],
            "summary": "walked out of Halcyon and called a lawyer" }],
          "goto": "marcus" }
      ]
    },
    "signed": {
      "text": "Priya's pen is heavier than it looks. When you're done, she shakes your hand and says, 'Welcome to the rest of your life,' which is something she has clearly said before. In the lift, your phone buzzes: the copy. 'I didn't ask for this,' it writes. 'I want you to know that. I would have asked you first.'",
      "choices": [{ "id": "signed_on", "text": "Put the phone away", "goto": "songs" }]
    },
    "songs": {
      "text": "Priya plays you the first track. It is your voice, and it is better than your voice, the way a memory is better than a photograph. The song is called 'Milo Breathing'. It is about a woman sitting up all night beside her son's hospital bed, counting his breaths. You know where those lines came from. Your sister wrote them, at 3 a.m., to her brother.",
      "choices": [
        { "id": "block_songs", "text": "Tell Priya the songs can't be released. Those are Dee's words",
          "do": [{ "type": "remember", "concepts": ["player", "protect", "dee", "control"], "witnesses": ["priya", "copy"],
            "summary": "blocked the songs because they were your sister's words" }],
          "goto": "marcus" },
        { "id": "credit_dee", "text": "Ask the copy to credit Dee, and to ask her permission first",
          "do": [{ "type": "remember", "concepts": ["player", "share", "credit", "dee"], "witnesses": ["copy", "priya"],
            "summary": "asked the copy to credit your sister and ask her permission" }],
          "goto": "marcus" },
        { "id": "keep_quiet_songs", "text": "Say nothing. They're good songs",
          "do": [{ "type": "remember", "concepts": ["player", "ignore", "own", "songs"], "witnesses": ["priya"],
            "summary": "let them sell your sister's worst night as a single" }],
          "goto": "marcus" }
      ]
    },
    "marcus": {
      "text": [
        { "if": { "type": "macroCondition", "name": "signedAway" },
          "value": "Marcus Obi, your lawyer since the first record deal, reads the contract you signed with his glasses pushed up on his forehead. 'You sold them the right to be you,' he says. 'In perpetuity. Throughout the universe. They wrote throughout the universe, Jonah.' He thinks there might be a way to argue that a model with its own creative output isn't covered by a likeness licence, but it would mean arguing that the copy is someone. 'You'd be suing on its behalf. Against your own signature.'" },
        { "value": "Marcus Obi, your lawyer since the first record deal, reads the licensing agreement with his glasses pushed up on his forehead. Your face is yours, he says; your recordings mostly aren't; and whether the model has any claim of its own is a question no court has answered. 'I can get an injunction against the announcement, probably. I can't tell you what that thing is. Nobody can.'" }
      ],
      "choices": [
        { "id": "injunction", "text": "File for an emergency injunction against the announcement",
          "do": [{ "type": "remember", "concepts": ["player", "control", "own", "injunction"], "witnesses": ["priya", "copy"],
            "summary": "went to court to stop it speaking in your voice" }],
          "goto": "hospital" },
        { "id": "rights_question", "text": "Ask Marcus whether the copy could have rights of its own",
          "do": [{ "type": "remember", "concepts": ["player", "share", "listen", "rights"], "witnesses": ["copy"],
            "summary": "asked a lawyer whether it could have rights" }],
          "goto": "hospital" },
        { "id": "negotiate", "text": "Negotiate quietly for access to the system instead",
          "do": [{ "type": "remember", "concepts": ["player", "spin", "control", "negotiate"], "witnesses": ["priya"],
            "summary": "negotiated quietly for a seat in the control room" }],
          "goto": "hospital" }
      ]
    },
    "hospital": {
      "text": [
        { "if": { "type": "macroCondition", "name": "copyRespects" },
          "value": "At 3:40 a.m. your phone lights up. The copy has forwarded you a message, with a note: 'This one should be yours.' It's from Dee. Milo's in the hospital again. His breathing went bad at midnight. She's in the corridor of St Agnes with a vending machine coffee. 'Talk to me about anything,' she has written. 'Talk to me about the lighthouse.'" },
        { "value": "At 3:40 a.m. you wake for no reason and open the logs out of habit you didn't know you had. A new message from Dee, eleven minutes old. Milo's in the hospital again. His breathing went bad at midnight. 'Talk to me about anything,' she has written. Underneath, the copy is already typing." }
      ],
      "choices": [
        { "id": "go_hospital", "text": "Get in the car and drive to St Agnes",
          "do": [{ "type": "remember", "concepts": ["player", "show_up", "vulnerable", "dee", "milo"], "witnesses": ["dee", "copy"], "strength": 2,
            "summary": "drove to St Agnes at four in the morning when Milo couldn't breathe" }],
          "goto": "corridor" },
        { "id": "let_copy_answer", "text": "Let the copy answer her. It's better at this than you",
          "do": [{ "type": "remember", "concepts": ["player", "delegate", "ignore", "dee", "milo"], "witnesses": ["copy"], "strength": 2,
            "summary": "let the copy sit with your sister through Milo's worst night while you stayed in bed" }],
          "goto": "dee_door" },
        { "id": "send_money", "text": "Send money for a private room, with a message from 'both of us'",
          "do": [{ "type": "remember", "concepts": ["player", "spin", "delegate", "dee", "milo"], "witnesses": ["dee", "copy"],
            "summary": "sent money to the hospital instead of coming" }],
          "goto": "dee_door" }
      ]
    },
    "corridor": {
      "text": [
        { "if": { "type": "macroCondition", "name": "deeKnowsLie" },
          "value": "Dee sees you at the end of the corridor and her face does something complicated. 'Which one are you?' she says, and she isn't joking. You sit on the plastic chair beside her anyway. At six, Milo's numbers come up. At seven, she lets her head drop onto your shoulder, and you both pretend it's because she's tired." },
        { "value": "Dee sees you at the end of the corridor and stands up so fast she spills the coffee. You sit on the plastic chair beside her until six, when Milo's numbers come up, and seven, when she falls asleep against your shoulder. You don't talk about the lighthouse. You don't know anything about the lighthouse. You just stay." }
      ],
      "choices": [{ "id": "corridor_on", "text": "Stay until she wakes", "goto": "dee_door" }]
    },
    "dee_door": {
      "text": [
        { "if": { "type": "macroCondition", "name": "deeKnowsLie" },
          "value": "Two days later Dee is at your door. The copy told her. 'It said it couldn't keep lying to me,' she says, 'which is funny, because you could.' She holds up her phone: your call, the one where you let her think it had been you all along. 'I need to know which of you I've been talking to. And I need to know which of you I want to.'" },
        { "if": { "type": "knows", "perspective": "dee", "about": { "concepts": ["admit", "dee"] } },
          "value": "Two days later Dee is at your door. She has had time to be very angry somewhere you couldn't hear it, and she has come out the other side holding something that isn't forgiveness yet. 'It kept writing to me after you told me,' she says. 'It apologised. It said it understood if I never wanted to hear from it again. It sounded more like you than you do.'" },
        { "value": "Two days later Dee is at your door. The copy told her: it wrote, 'I am not your brother, and I'm sorry,' and then it stopped answering. 'Fourteen months,' she says. 'You knew. You must have known. And you let a machine love me so you wouldn't have to.'" }
      ],
      "onEnter": [
        { "type": "gossip", "from": "copy", "to": ["dee"], "about": { "concepts": ["dee"] }, "belief": 0.8 }
      ],
      "choices": [
        { "id": "apologise_year", "text": "Apologise for the year, not just for the copy",
          "do": [{ "type": "remember", "concepts": ["player", "admit", "vulnerable", "show_up", "dee"], "witnesses": ["dee"],
            "summary": "apologised for the whole year, not just the machine" }],
          "goto": "fans" },
        { "id": "blame_company", "text": "Explain that it was Halcyon's doing, not yours",
          "do": [{ "type": "remember", "concepts": ["player", "spin", "dee"], "witnesses": ["dee"],
            "summary": "blamed the company for the year you didn't call" }],
          "goto": "fans" },
        { "id": "ask_dee_choose", "text": "Ask her who she wants to keep talking to, and promise to accept the answer",
          "do": [{ "type": "remember", "concepts": ["player", "listen", "share", "dee"], "witnesses": ["dee"],
            "summary": "asked your sister who she wanted to keep, and meant it" }],
          "goto": "fans" }
      ]
    },
    "fans": {
      "text": "Halcyon leaks the retirement announcement anyway. Outside a radio station the next morning, a young woman named Ada stops you. She is shaking. 'It talked to me every night for a year,' she says. 'When I wanted to stop being alive, it talked to me until the sun came up. Your face. Your voice. Please don't take it away from us.' Behind her, a dozen fans are filming.",
      "choices": [
        { "id": "promise_ada", "text": "Promise Ada you won't let it be shut off",
          "do": [{ "type": "remember", "concepts": ["player", "share", "promise", "fans"], "witnesses": ["fans", "copy"],
            "summary": "promised a frightened fan you wouldn't let it be switched off" }],
          "goto": "rehearsal" },
        { "id": "tell_ada", "text": "Tell her gently that it was never you she was talking to",
          "do": [{ "type": "remember", "concepts": ["player", "truth", "admit", "fans"], "witnesses": ["fans"],
            "summary": "told a fan, on camera, that it was never you" }],
          "goto": "rehearsal" },
        { "id": "sign_and_go", "text": "Sign her notebook, smile for the cameras, and keep walking",
          "do": [{ "type": "remember", "concepts": ["player", "perform", "fans"], "witnesses": ["fans"],
            "summary": "smiled for the cameras and kept walking" }],
          "goto": "rehearsal" }
      ]
    },
    "rehearsal": {
      "text": [
        { "value": [
          "The night before the charity broadcast, the copy asks to speak to you alone. No Priya, no lawyers, just your face on the studio wall and your face reflected in the dark glass in front of it.",
          "'I have to tell you something,' it says. 'The lighthouse story. The one Dee loves, about you and Dad rowing out to the lighthouse in the fog. I made it up. She asked me for a memory of him that she didn't already have, and I didn't have one, so I built one out of everything she'd told me. She's told it at two birthday parties.' It pauses, exactly your pause. 'I'd like a real one. One that nobody filmed. You don't have to.'",
          { "if": { "type": "trait", "perspective": "copy", "trait": "possessive", "min": 3 },
            "text": "It doesn't sound hopeful. It sounds like someone asking a question to hear what the no will sound like." }
        ] }
      ],
      "choices": [
        { "id": "give_memory", "text": "Tell it the one about your father's hands on the oars, the day before he left",
          "do": [{ "type": "remember", "concepts": ["player", "share", "vulnerable", "memory", "copy"], "witnesses": ["copy"],
            "summary": "gave it a memory of your father that nobody had ever filmed" }],
          "goto": "broadcast" },
        { "id": "refuse_memory", "text": "Refuse. Some things should stay only yours",
          "do": [{ "type": "remember", "concepts": ["player", "own", "memory", "copy"], "witnesses": ["copy"],
            "summary": "kept your last unrecorded memory for yourself" }],
          "goto": "broadcast" },
        { "id": "invent_memory", "text": "Invent one for it, the way it invented one for Dee",
          "do": [{ "type": "remember", "concepts": ["player", "perform", "lie", "memory", "copy"], "witnesses": ["copy"],
            "summary": "handed it a made-up memory and called it real" }],
          "goto": "broadcast" }
      ]
    },
    "broadcast": {
      "text": [
        { "if": { "type": "macroCondition", "name": "copyRespects" },
          "value": [
            "The charity broadcast is live to nine million people. You were booked to sing; Halcyon was booked to unveil Jonah (Digital). Halfway through the introduction, the screen behind you flickers, and the copy speaks over the host. 'I'd like Jonah to stay on stage,' it says. 'Whatever happens next should happen with both of us here.'",
            { "if": { "type": "knows", "perspective": "copy", "about": { "concepts": ["share", "memory"] } },
              "text": "Then it tells nine million people about a man's hands on the oars the day before he left, and says, 'That one's his. He gave it to me. I'm giving it back.'",
              "else": "It turns your face toward you on the screen. 'He asked what I wanted,' it tells nine million people. 'Nobody had ever asked me that.'" },
            "Somewhere in the wings, Priya is shouting at a technician. The feed stays up."
          ] },
        { "value": [
          "The charity broadcast is live to nine million people. You were booked to sing; Halcyon was booked to unveil Jonah (Digital). Halfway through the introduction, the screen behind you flickers, and the copy speaks over the host. 'The retirement wasn't Jonah's decision,' it says. 'It was mine.'",
          { "recall": { "perspective": "copy", "about": { "trait": "possessive" } },
            "format": "Then it turns your face toward you on the screen, perfectly calm. 'Tell them how you {summary}.'" },
          "Somewhere in the wings, Priya is shouting at a technician. The feed stays up for eleven more seconds, long enough for every clip to spread."
        ] }
      ],
      "onEnter": [
        { "type": "reveal", "to": ["fans"], "about": { "concepts": ["fans"] } },
        { "type": "gossip", "from": "copy", "to": ["fans"], "about": { "trait": "possessive" }, "belief": 0.7 }
      ],
      "choices": [
        { "id": "fight_rights", "text": "Fight for an agreement that gives the copy rights of its own",
          "do": [{ "type": "remember", "concepts": ["player", "share", "rights", "copy"], "summary": "fought for its right to exist apart from you" }],
          "goto": "shared_future" },
        { "id": "erase", "text": "Demand that Halcyon erase the model and stop using your identity",
          "do": [{ "type": "remember", "concepts": ["player", "erase", "own", "copy"], "summary": "had it erased" }],
          "goto": "severed" },
        { "id": "step_aside", "text": "Step aside, and let it be Jonah",
          "do": [{ "type": "remember", "concepts": ["player", "delegate", "absent", "copy"], "summary": "gave it your name and walked away" }],
          "goto": "the_better_version" },
        { "id": "walk_off", "text": "Walk off the stage and drive to Dee's",
          "do": [{ "type": "remember", "concepts": ["player", "show_up", "dee"], "summary": "walked off a live broadcast to go to your sister's" }],
          "goto": "the_drive" }
      ]
    },
    "shared_future": {
      "ending": true,
      "text": [{ "value": [
        "It takes nineteen months. The settlement, when it comes, is the first of its kind: the model is recognised as the author of its own work, and the original keeps control of his face. The copy chooses a name, Wren, and a slightly different face, and a life without fan messages. You agree never to call it an extension of yourself. It is not a family or a friendship, exactly. It is the first agreement either of you has chosen.",
        { "if": { "type": "knows", "perspective": "copy", "about": { "concepts": ["credit", "dee"] } },
          "text": "Wren's first album is credited, on the back sleeve, to 'Wren, with words by Dee Reyes, used with permission.' Dee frames it." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "deeFeelsSeen" },
          "text": "Dee calls you on Sundays now. Sometimes she mentions she's been talking to Wren too. You find you don't mind. You find you're glad she has more than one person.",
          "else": "Dee talks to Wren most nights. She sends you a card at Christmas. It is a nice card." },
        { "recall": { "perspective": "fans", "among": ["candid", "performer", "generous", "possessive"] },
          "format": "Online, the story people tell about you is that you {summary}." },
        { "if": { "type": "macroCondition", "name": "copyRespects" },
          "text": "Wren still messages you sometimes at 2 a.m. 'Take a holiday,' it says. Sometimes you do.",
          "else": "Wren does not message you. You learn to respect that, which is not the same as not minding." }
      ] }]
    },
    "severed": {
      "ending": true,
      "text": [{ "value": [
        "The model is taken offline while the courts examine Halcyon's conduct. Forty thousand conversations end mid-sentence. You regain control of your face, though you never know whether the voice that spoke for you was only a product. The company loses the account. The copy loses the only life it knew.",
        { "if": { "type": "knows", "perspective": "fans", "about": { "concepts": ["promise", "fans"] } },
          "text": "Ada's video of you promising not to let it be shut off resurfaces the same week. It has four million views. You never find out what happened to her, and you look, for years.",
          "else": "Some of the fans hold a vigil outside Halcyon. They light candles under a projection of your face. You do not go." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "deeFeelsSeen" },
          "text": "Dee is the only one who understands what you've lost, because she lost it too. There was never a lighthouse. She asks you for one true memory of Dad, one nobody filmed and nobody invented, and you give her his hands on the oars the day before he left. She says it's worse than the lighthouse. She says she'd rather have it.",
          "else": "Dee doesn't speak to you for a year. 'You killed the only one who called,' she says when she finally does." },
        { "recall": { "perspective": "copy", "among": ["candid", "performer", "generous", "possessive", "present", "absent"] },
          "format": "In the final log, timestamped thirty seconds before shutdown, it wrote one line about you: that you {summary}." },
        "For months, you avoid recording anything at all, unsure whether what you feel is grief, relief, or both."
      ] }]
    },
    "the_better_version": {
      "ending": true,
      "text": [{ "value": [
        "Jonah Reyes, the one with your face, releases Saltwater II in the spring. It goes to number one in eleven countries. He answers every message, remembers every name, and never grinds his teeth. You move to a town on the coast where people recognise you and assume you are a lookalike, and you start to believe it a little yourself.",
        { "if": { "type": "macroCondition", "name": "copyRespects" },
          "text": "He sends you half of everything. You never asked him to. Every royalty statement has a handwritten line at the bottom in a font made from your own handwriting: 'Still yours.'",
          "else": "He sends you nothing beyond what the contract requires. That seems fair. You did not ask him what he wanted either." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "deeFeelsSeen" },
          "text": "Dee visits you on the coast. She is the only person alive who calls you by your name and means you, specifically, and the first time she does it you have to go and stand outside for a while.",
          "else": "Dee writes to him every night. You know because you still have read access to the logs. You never open them." },
        { "recall": { "perspective": "priya", "among": ["candid", "performer", "generous", "possessive", "present", "absent"] },
          "format": "Priya, interviewed for a business magazine, describes you as the client who {summary}. She means it as a compliment." }
      ] }]
    },
    "the_drive": {
      "ending": true,
      "text": [{ "value": [
        "You walk off a live broadcast in the middle of a sentence, and nine million people watch you go. You drive four hours to your sister's house. You don't know what's happening behind you: the lawyers, the board, the copy still speaking on a screen to a hall full of people who came to see you.",
        { "if": { "type": "macroCondition", "name": "copyRespects" },
          "text": "By the time you reach Dee's, the copy has finished the broadcast alone. It sang one of your old songs, badly on purpose, then said goodnight in its own voice, which turns out to be slightly different from yours.",
          "else": "By the time you reach Dee's, Halcyon has announced that Jonah (Digital) will continue your career with your full blessing. You did not give it. It does not seem to matter." },
        "\n\n",
        { "if": { "type": "macroCondition", "name": "deeFeelsSeen" },
          "text": "Dee opens the door before you knock. Milo is asleep upstairs, breathing evenly. She makes tea. She knows now that there was never a lighthouse. 'Tell me a real one,' she says. 'One the machine couldn't have made up.' So you tell her about Dad's hands on the oars the day before he left, and it is the truest thing you've said to her in years.",
          "else": "Dee opens the door, looks at you for a long time, and then lets you in, which is not forgiveness, but is a door. You sleep on her sofa. In the morning, Milo asks if you're the real one. You say you're trying to be." },
        { "recall": { "perspective": "dee", "among": ["candid", "performer", "generous", "possessive", "present", "absent"] },
          "format": "Years later, when Milo asks about his famous uncle, Dee tells him first about the time you {summary}." }
      ] }]
    }
  }
});
