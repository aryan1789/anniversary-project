# A Treasure Hunt For Her

A little browser-based 3D treasure hunt game, built as a one-year anniversary gift.
Blocky, Roblox-inspired world, four rooms, a riddle, hidden collectibles, and a
love letter finale.

## How to play it

Just open `index.html` in a browser (Chrome or Edge work best). No install,
no server needed — everything runs locally, including the 3D engine (it's
vendored in `js/vendor/`, so it works even without internet).

**Controls:** WASD to move, drag the mouse to look around, `E` to interact.

## How to personalize it (do this before the big day!)

Open **`js/content.js`** in any text editor. Every value marked `TODO_` is
meant to be replaced with your own words — her name, your names, the four
memories/milestones, your inside-joke riddle, and the final love letter.
Nothing else in the game needs to change; `game.js` reads everything from
that one file.

A few tips:
- `room1.introDialogue` / `room3.milestones` / etc. can be as short as one
  sentence each — it's the specificity that makes it feel personal, not length.
- `room2.riddleAnswer` is checked case-insensitively, so don't worry about
  capitalization when writing it.
- `finale.loveLetterBody` supports multiple paragraphs — just leave a blank
  line between them.
- `characterShirtColor` / `characterHairColor` / `characterSkinColor` control
  how the in-game character looks, if you want to customize that too.

## The four rooms

1. **The Meeting Grounds** — talk to the signpost, then find the hidden glowing key to unlock the way forward.
2. **The Riddle Garden** — solve a riddle to open the portal.
3. **Memory Collector** — run around and collect four floating memory hearts.
4. **The Treasure Room** — open the chest to reveal the final love letter.
