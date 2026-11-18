# Writing a story

A Memory Graph story is a plain text file. You can write it in any text
editor, and you don't need to know any code. This guide covers everything
you can put in one.

**Quickest start:** open `index.html` and choose **Upload story files** from
the story menu, then pick [`story-template.txt`](story-template.txt). Play
it, then copy the file and start changing it.

**Best way to work (Chrome or Edge):** choose **Open a story to edit** from
the story menu and pick your file. Every time you save it in your editor,
the page reloads the story and makes your choices again, so you stay at the
same point. If you save a mistake, the page tells you the line number and
keeps playing the last version that worked.

[*The Night Ferry*](../stories/the_night_ferry.txt) is a short built-in
story that uses every feature.

## 1. The shape of a story file

```
title: The Night Ferry
synopsis: One line that makes someone want to play it.

== characters
…

== traits
…

== macros
…

=== boarding
The first scene's text.

* A choice -> deck
* Another choice -> deck

=== deck
…
```

- The settings at the top: `title:` (required), `synopsis:`, and
  optionally `start:` (the first scene, if it isn't the first one in the
  file), `id:` (defaults to the file name) and `half-life:` (see
  section 4).
- `== characters`, `== traits` and `== macros` are sections. Each one is
  optional.
- `=== name` starts a scene. Scene names use letters, digits and
  underscores, such as `=== the_quay`. Mark an ending with
  `=== the_quay (ending)`.
- Lines starting with `//` are notes to yourself. Start one with
  `// TODO:` and it is listed in Writer tools, so you won't forget it.

## 2. Scenes and choices

```
=== harbour
The last ferry leaves at nine.

The wind is already up.

* Get on board -> deck
* Stay ashore -> home

=== home (ending)
You watch it go.
```

- Lines next to each other join into one paragraph. A blank line starts a
  new one.
- `*italics*` works in any text.
- Every scene that isn't an ending needs at least one choice. A choice
  starts with `*` and ends with `-> scene` to say where it goes.
- Branches can rejoin by going to the same scene. Every story needs at
  least one ending the player can reach.

When a choice does something, put that on the indented lines under it,
and put the `->` on its own line at the end:

```
* Pay your fare
  ~ coins -= 1
  -> deck
```

## 3. Remembering what happened

The story is driven by **memories**. `~ remember` records one:

```
* Lie to the captain about your ticket
  ~ remember lie, hale (seen by hale) "lied to the captain about your ticket"
  -> deck
```

- The words after `remember` are **concepts**: plain words that describe
  what happened, separated by commas. Spell them the same way every time.
- A remember is about **you**, the player, unless it says otherwise.
- `(seen by hale, ines)` lists the characters who saw it. Use
  `(seen by everyone)` or `(seen by no one)` if you need to. Nobody else
  knows unless they're told later.
- The text in quotes is the **summary**: how the event is described when
  someone remembers it. Write it so it completes "you …": "lied to the
  captain". Don't start it with "you", and don't end it with a full stop.
- If the line gets long, put the summary on the next line, indented
  further.

**Who's in the scene.** A `present:` line under the scene heading says who
is there:

```
=== theft
present: hale, jory, ines, lark
```

Players see this at the top of the scene ("Here: Captain Hale, Jory, …").
Any remember in the scene without `(seen by …)` is seen by everyone
present, so you only write `(seen by …)` for a private moment.

**Things other people do.** Start with their name and a colon. The summary
then completes "Jory …":

```
~ remember jory: suspected (seen by hale) "was accused of taking the brooch"
```

For something that just happens, with nobody's act behind it, start with
`world:`, as in `~ remember world: storm, harbour`.

**An act and its consequence.** Everyone in an event is linked to every
concept in it, so if you record `accuse, jory, suspected`, *you* count as
"suspected" too. Record the act and what it does to someone else
separately, with an `and` line underneath. The `and` line is seen by the
same people:

```
* Point at Jory
  ~ remember accuse, lie, jory "told the captain Jory must have taken it"
    and jory: suspected "was accused of taking the brooch"
  -> search
```

A remember can also have `(strength 2)` to make it count double.

## 4. Characters and traits

```
== characters
hale: Captain Hale
  Runs the night ferry, and runs it strictly.
grey: the man in the grey coat (hidden)
  Reads a newspaper by the luggage rack, and never turns the page.

== traits
honest: truth, admit +1.5, lie -1
deceptive (a liar): lie, cheat
thief (a thief) #9b2c4a: steal
```

**Characters** are written `id: Name`. Use the id everywhere else in the
story, and the name is what players see. The indented line under it is a
short description. Players see it when they hover over the character's
name, and in the **Who's who** panel, so they never lose track of who
someone is. To change the description as the story goes on (once the
player finds something out, say), use:

```
~ describe grey: The man who lifted the swallow brooch.
```

A **hidden** character's opinion of the player is never shown: they don't
appear in the "who saw" notes and they have no reputation bars. Use one for
a secret watcher. They still appear in scenes they're present in, with
their description.

A **trait** turns specific acts into a general judgement. Write the
concepts that count toward it, with an optional weight (it's 1 if you
leave it out). A negative weight counts *against* the trait, which makes
redemption possible. The label in brackets is how players see it ("Mira:
a liar"), and `#rrggbb` picks its colour. Two opposing traits (honest and
deceptive, kind and selfish) give the clearest results.

`half-life: 12` at the top makes old events fade: an event counts half as
much after 12 more have happened.

## 5. Who knows what

| Action | What it does |
|---|---|
| `~ gossip lark to ines about trait deceptive` | Lark tells Ines what she knows. Hearsay counts at half belief, or add `(belief 0.8)`. |
| `~ reveal to everyone about brooch` | Everyone learns the matching events at full belief: evidence, a confession, a public record. |
| `~ doubt hale about jory, suspected` | Hale is talked out of it and forgets it, or add `(belief 0.25)` if they only half believe you. |

After `to`, list characters separated by commas, or write `everyone`.
`about trait kind` matches any event with one of that trait's concepts.
`about brooch, gold` matches events that contain all of those concepts.
Leave `about` off `gossip` or `reveal` to pass on everything.

## 6. Reacting to memory

Conditions are written in words. You can use them in choices, in text and
in routes:

| Condition | True when |
|---|---|
| `hale knows lie` | Hale knows of an event with that concept (list several with commas). |
| `hale knows trait thief` | Hale knows of an event with any of that trait's concepts. |
| `hale sees you as honest >= 1` | Hale's honest score for you is at least 1 (or `<= 0` for at most). |
| `hale sees jory as suspect >= 0.5` | The same, about Jory instead of you. |
| `hale sees you as more honest than deceptive` | That trait leads the others for Hale (list more with commas). |
| `player with grey >= 1` | The two concepts have appeared together at least once. |
| `coins >= 2` | Compares a variable: `==`, `!=`, `>`, `>=`, `<`, `<=`. Text goes in double quotes. |
| `visited deck` | That scene has been visited this run. |
| `visited deck >= 2` | That scene has been visited at least twice (any comparison works). The current visit counts. |
| `first visit` | This is the player's first time in the scene they're in now. |
| `not …`, `… and …`, `… or …`, `( … )` | Combine conditions. |

Use `world` instead of a character to ask what's true overall, for example
`world sees you as kind >= 2`.

**Choices** that only appear sometimes put the condition in braces:

```
* {noticedGrey} Say the man in the grey coat was standing right behind her
```

**Routes** send the player somewhere depending on memory. They are tried in
order, and the last one has no condition:

```
* Go ashore
  -> the_swallow if greyCaught
  -> the_chain_locker if jorySuspected
  -> the_quay
```

**Macros** give a condition a name so you can reuse it. The part after
`#` is the tag players see whenever the macro shapes the story:

```
== macros
haleTrustsYou: hale sees you as more honest than deceptive # Hale trusts you
```

Then just write `haleTrustsYou` wherever a condition goes. A macro can also
be a list of actions you reuse with `~ do name`:

```
== macros
rememberHelp:
  ~ remember help
```

**Earlier runs.** **Begin again · keep memory** keeps every character's
knowledge, so a character can recognise the player on a replay. In the
opening scene, check for something they can only know from last time,
such as `{jory knows accuse, jory: …}`. Put these reactions in text, not
routes. **Check story** starts every run with empty memory, so it will list
them as never shown, and a scene only reachable on a replay would fail the
built-in story tests.

**Scenes you come back to.** A choice can go back to the scene it's in,
or to any earlier scene, which gives you a shop, a hub to explore from, or
a room to search. Three things make loops easier:

```
=== shop
{
- first visit:
A cramped shop that smells of lamp oil. The shopkeeper doesn't look up.
- visited shop >= 4:
'Anything else?' The shopkeeper has started counting the till.
- else:
'Anything else?'
}

* (once) {coins >= 2} Buy the lamp
  ~ coins -= 2
  ~ remember buy, lamp "bought the shopkeeper's last lamp"
  -> shop
* (once) Ask about the lighthouse -> shop
* Leave -> street
```

- `first visit` and `visited shop >= 2` let the scene say something
  shorter when the player comes back. Every visit is added to the story
  so far, so a scene that repeats its whole description gets tiresome.
- `(once)` before a choice's text hides it after the player has picked it.
  It goes in the same brackets as a label: `(lamp, once)`.
- Give the player a way out that isn't `(once)`. Writer tools warns you if
  every choice in a scene that loops back to itself is `(once)`.
  `{visited shop < 3}` on the looping choices is a simple time limit.
- Lines under the scene's heading run again on every visit, and every
  choice's `~ remember` records a new event each time. Doing something
  three times counts three times, which is usually what you want: it's how
  repetition becomes part of who you are.
- To show what the last pick turned up, set a variable in the choice
  (`~ found = "lamp"`) and check it in the text:
  `{found == "lamp": The lamp is heavier than it looks.}`

*The House With Two Kitchens* (`sorting`) and *Anywhere* (`crime_scene`)
use this.

## 7. Text that adapts

**Conditional text** goes in braces inside a passage. It appears only when
its condition is true. After `|` is what to show instead:

```
The ferry docks at dawn.
{jory knows share: Jory gives you back your coin. | Jory doesn't look up.}
```

Conditional text is joined to the text around it with a space, except
before punctuation, so `Hale looks up{trusted: , smiling}.` works.

**Recall** puts a character's memory of you into the text. `{summary}` is
replaced by the summary of the memory that fits best:

```
{recall ines among kind, honest, deceptive: Mrs Duarte remembers you as the one who {summary}. | Mrs Duarte has already forgotten you.}
```

- `among kind, honest, deceptive` picks the act behind whichever of those
  traits defines you to that character.
- `about trait kind`, or `about brooch`, picks a memory on one topic.
- Add `rank 2` for the second-best memory, `of jory` to recall what Jory
  did instead of you, and `if condition` to recall only sometimes.
- After `|` is what to show if nothing fits.

**Alternatives** give a scene completely different text depending on memory.
The block must be the scene's whole text, and must end with `- else:`:

```
=== galley
{
- greyCaught:
The brooch was in the lining of the grey man's seat.
- else:
Later, in the galley, Mrs Duarte sits with a cup of tea she isn't drinking.
{ines knows cheat: 'Lark tells me you didn't pay,' she says.}
}
```

**Placeholders.** `{hale}` gives a character's name, and `{coins}` gives a
variable's current value. They work in any text, choice or summary.

**Tags.** When memory shapes the text, the player sees a small tag such as
*(Hale trusts you)*, and can hover over it to see which choices caused it.
To word a tag yourself, add `# your tag` at the end of the braces, the
route line or the macro line:

```
{jory knows accuse, jory: He looks at you for a long moment. # Jory remembers your face}
* {noticedGrey # you were watching him} Follow the man in the grey coat -> the_grey_coat
-> the_swallow if greyCaught # Hale knows the truth
```

Short, in-world tags work best.

**Special characters.** Inside text, put a backslash before `{`, `}`, `|`
or `#` to show it as it is: `\{`.

## 8. Variables

`~ coins = 3`, `~ coins += 1`, `~ coins -= 2` and `~ promised = true` change
variables. Text values go in double quotes: `~ mood = "calm"`. Use
variables for plain facts the story needs to track. Use memories for
anything a character should *know* about.

A `~` line directly under a scene's heading (not under a choice) runs as
soon as the player arrives in the scene.

## 9. Checking your story

- **Mistakes in the file**, such as a scene name that doesn't exist or a
  missing `->`, stop the story loading. The page tells you the line number,
  and usually suggests what you meant: *line 42: there is no character
  called 'jroy' (did you mean 'jory'?)*.
**Writer tools** (in the **⋯** menu) fills the screen and has four tabs:
**Overview**, **Story map**, **Who's in each scene** and **Memory graph**.
Press Escape or × to go back to your story.

- **Likely mistakes** are listed on the **Overview** tab with
  their line numbers. These include a concept you check for but never
  remember (usually a typo, so it suggests the closest one), a trait that
  can never score, a character who never learns anything, a summary in
  the wrong form, a variable that's never set, and a macro that's never
  used.
- **Check story**, also on Overview, plays your story 300 times at random.
  It reports any crashes and dead ends, how often each ending came up, and
  any scene or text that never appeared.
- **Start from a scene**, also on Overview, jumps straight to any scene.
  Tick the memories and variables that should already be in place, such as
  "you lied to the captain" or "coins = 3", so you can test a late scene
  without playing the whole story to reach it.
- **Story at a glance**, at the top of Overview, gives your story's
  size: scenes, endings, choices, words, how much of the text depends on
  memory, and the shortest route to an ending. After **Check story** it
  also says how long a playthrough usually is.
- **Story map** draws every scene as a box and every choice as an arrow, from the start
  at the top to the endings at the bottom. Dashed arrows are choices that
  are only sometimes offered or taken, and purple arrows loop back. The bar
  under each scene shows how much you've written there. Select a scene to
  see its choices, who's there, what it remembers, its line number, and a
  shortcut to **Start from a scene**. Drag the background to move around a
  big map. Colour the map by:
  - **Structure:** scenes no choice leads to, scenes with no way to an
    ending, and scenes *every route* passes through.
  - **Reach:** how often Story check's random runs reached each scene and
    took each route.
  - **Your path:** the scenes the run you're playing has been through.
  - **Memory:** pick a trait or concept to see where it's set up (green) and
    where the story checks it (blue). It points out a check nothing earlier
    in the run can make true, which then only works after **Begin again ·
    keep memory**, and a check about someone who never witnesses or hears
    about the thing it asks about.

  The **Who's in each scene** tab lists every character against every scene,
  and marks anyone who witnesses something in a scene whose `present:` line
  leaves them out.
- **Memory graph** shows what the run you're playing has remembered so far:
  each concept, and how strongly memories link them.

## 10. Adding a built-in story

Save the story as `stories/<name>.txt`, then run:

```sh
node tools/build-stories.js
```

The page can't read `.txt` files from your disk by itself, so this wraps
each story in a small file in `stories/built/` that it can load, and adds
the story to the picker. Run it again whenever you change a built-in
story. The tests fail if you forget.
