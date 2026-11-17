# Writing a story

This guide covers everything you need to write a Memory Graph story. You
write stories in JSON, and no JavaScript is needed. The full reference is
the [project specification](../agents/ProjectDesign.md).

**Quickest start:** open `index.html`, choose **Upload JSON files** from the
story menu, and pick [`story-template.json`](story-template.json). Play it,
then copy it and start changing things.

## 1. Scenes and choices

A story is a set of **nodes** (scenes). Each node has `text` and either
`choices` or `"ending": true`.

```json
"nodes": {
  "harbour": {
    "text": "The last ferry leaves at nine.",
    "choices": [
      { "id": "board", "text": "Get on board", "goto": "deck" },
      { "id": "stay",  "text": "Stay ashore",  "goto": "home" }
    ]
  },
  "home": { "text": "You watch it go.", "ending": true }
}
```

The story begins at `start`. Branches can rejoin by pointing at the same
node. Every story needs at least one reachable ending.

## 2. Remembering what happened

The story is driven by **memories**. A choice's `do` list can remember an
event:

```json
{ "type": "remember",
  "concepts": ["player", "lie", "hale"],
  "witnesses": ["hale"],
  "summary": "lied to the captain about your ticket" }
```

- **`concepts`** are plain words that describe the event. Include
  `"player"` when the event is something *you* did. Leave it out for
  things that just happen in the world. Spell concepts the same way every
  time.
- **`witnesses`** are the characters who saw it, or `"all"`. Nobody else
  knows unless they're told later.
- **`summary`** is how the event is described when someone remembers it.
  Write it so it completes "you …": "lied to the captain". Don't start it
  with "you", and don't end it with a full stop.
- **`subject`** says whose act the summary describes, if it isn't the
  player's: `"subject": "jory"` with the summary "was seen near the luggage".

**One subject per event.** Everyone in an event is linked to every concept
in it. So if you record `["player", "accuse", "jory", "suspected"]`, *you*
count as "suspected" too. Record the act and its consequence separately:

```json
{ "type": "remember", "concepts": ["player", "accuse", "jory"], "witnesses": ["hale"],
  "summary": "told the captain Jory took it" },
{ "type": "remember", "concepts": ["jory", "suspected"], "subject": "jory", "witnesses": ["hale"],
  "summary": "was accused of taking the brooch" }
```

## 3. Characters and traits

```json
"characters": {
  "hale": { "name": "Captain Hale" },
  "grey": { "name": "the man in the grey coat", "hidden": true }
},
"traits": {
  "honest":    { "label": "honest",  "concepts": { "truth": 1, "admit": 1.5, "lie": -1 } },
  "deceptive": { "label": "a liar",  "concepts": { "lie": 1, "cheat": 1 } }
}
```

A **trait** turns specific acts into a general judgement. A character's
score for a trait adds up, over every event they know about you, the
weights of that event's concepts. A negative weight counts *against* the
trait, which makes redemption possible. Two opposing traits (honest and
deceptive, kind and selfish) give the clearest results.

A **hidden** character never appears in the "who saw" notes or the "How
you're seen" panel. Use one for a secret watcher who only shows up at the
end.

Reputations aren't only about the player. Add `"subject": "jory"` to a
`trait` or `dominantTrait` condition, or a recall, to ask what someone
thinks of Jory.

## 4. Who knows what

| Operation | What it does |
|---|---|
| `{ "type": "gossip", "from": "lark", "to": ["ines"], "about": { "trait": "deceptive" } }` | Lark tells Ines what she knows. Hearsay counts at half belief by default (`"belief": 0.8` to change it). |
| `{ "type": "reveal", "to": "all", "about": { "concepts": ["brooch"] } }` | Everyone learns matching events at full belief: evidence, a confession, a public record. |
| `{ "type": "doubt", "to": ["hale"], "about": { "concepts": ["jory", "suspected"] } }` | Hale is talked out of it. Belief drops to 0 (forgotten), or to `"belief": 0.25` if they only half believe you. |

`about` picks which events: `{ "trait": "kind" }` matches any event with
one of that trait's concepts, and `{ "concepts": [...] }` matches events
that contain all of them. Leaving `about` out of `gossip` or `reveal` passes
on everything.

Add `"memory": { "halfLife": 12 }` to make old events fade: an event counts
half as much after 12 more have happened.

## 5. Reacting to memory

Use these conditions in a choice's `showIf`, in text, or in routes:

| Condition | True when |
|---|---|
| `{ "type": "knows", "perspective": "hale", "about": { "concepts": ["lie"] } }` | Hale knows of a matching event. |
| `{ "type": "trait", "trait": "honest", "perspective": "hale", "min": 1 }` | Hale's score is at least `min` (or at most `max`). |
| `{ "type": "dominantTrait", "perspective": "hale", "among": ["honest", "deceptive"], "is": "honest" }` | That trait leads the others for Hale. |
| `{ "type": "association", "a": "player", "b": "grey", "min": 1 }` | The two concepts have appeared together at least `min` times. |
| `{ "type": "variable", "name": "coins", "operator": "gte", "value": 2 }` | Compares a variable (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`). |
| `{ "type": "visited", "node": "deck" }` | That node has been entered this run. |
| `not`, `all`, `any` | Combine conditions. |

Leave out `perspective` to use the world's view, which knows everything.

A **macro** names a condition so you can reuse it, and its `tag` is shown to
players whenever it shapes the story:

```json
"macros": {
  "haleTrustsYou": { "tag": "Hale trusts you",
    "condition": { "type": "dominantTrait", "perspective": "hale", "among": ["honest", "deceptive"], "is": "honest" } }
}
```

Use it with `{ "type": "macroCondition", "name": "haleTrustsYou" }`.

**Earlier runs.** **Begin again · keep memory** keeps every character's
knowledge, so a character can recognise the player on a replay. In the
opening scene, test for something they can only know from last time, such
as `{ "type": "knows", "perspective": "jory", "about": { "concepts": ["accuse", "jory"] } }`.
Put these reactions in text parts, not routes. **Check story** starts every
run with empty memory, so it will list them as never shown, and a node only
reachable on a replay would fail the built-in story tests.

## 6. Text that adapts

**Variants** pick the first matching text, and must end with a fallback:

```json
"text": [
  { "if": { "type": "macroCondition", "name": "haleTrustsYou" }, "value": "Hale nods you aboard." },
  { "value": "Hale checks your ticket twice." }
]
```

**Parts** build a passage from pieces, so endings don't multiply into
dozens of variants. Pieces are joined with spaces, and `"\n\n"` starts a
new paragraph:

```json
{ "value": [
  "The ferry docks at dawn.",
  { "if": { "type": "knows", "perspective": "jory", "about": { "concepts": ["share"] } },
    "text": "Jory gives you back your coin.", "else": "Jory doesn't look up." },
  "\n\n",
  { "recall": { "perspective": "ines", "among": ["kind", "honest", "deceptive"] },
    "format": "Mrs Duarte remembers you as the one who {summary}.",
    "otherwise": "Mrs Duarte has already forgotten you." }
] }
```

A **recall** finds the memory that best fits, and puts its summary in
place of `{summary}`. With `among`, it picks the act behind whichever of
those traits defines you to that character. Use `about` for a specific
topic, and `rank: 2` for the second-best memory.

**Placeholders** work in any text, choice, or summary: `{name:hale}` gives a
character's name, and `{var:coins}` gives a variable's current value.

**Tags.** When memory shapes the text, the player sees a small tag such as
*(Hale trusts you)*, and can hover over it to see which choices caused it.
Set `"tag"` on a text part, variant, choice, or route to word it yourself.
Short, in-world tags work best.

## 7. Variables

`set`, `inc`, and `dec` change variables. Use them for plain facts the
story needs to track, such as coins or whether a promise was made:

```json
{ "type": "set", "variable": "promised", "value": true },
{ "type": "dec", "variable": "coins", "amount": 2 }
```

Use memories for anything a character should *know* about, and variables
for everything else.

## 8. Checking your story

- **When a story loads**, the player lists anything that looks like a
  mistake: a concept you check for but never remember (usually a typo), a
  trait that can never score, a character who never learns anything, a
  summary in the wrong form, a variable that's never set, or a macro that's
  never used. Open **Graph State** (the `i` button) to see the list.
- **Check story** in the same panel plays your story 300 times at random.
  It reports any crashes and dead ends, how often each ending came up, and
  any node or text that never appeared. Text that never appears is usually
  a condition that can't come true on that path.
- For a built-in story, `node --test` does the same check with 1,500 runs,
  and fails on errors, unreached nodes, or warnings.

## 9. Adding a built-in story

Save the story as `stories/<name>.js`, wrapped like this:

```js
registerStory({ "id": "my_story", ... });
```

Then add `<name>` to `STORY_FILES` at the top of `scripts/storyPlayer.js`.
For an example that uses every feature, see
[`stories/the_night_ferry.js`](../stories/the_night_ferry.js).
