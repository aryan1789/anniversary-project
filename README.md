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

## Customize your character

Click **🎨 Customize Yourself** on the title screen (or the 🎨 button in the
top-right during play) to change skin tone, hair color/style, outfit color,
and face expression. It's saved automatically in the browser, so it stays
between sessions.

## Build mode — decorate the rooms yourself

Click the **🛠️** button in the top-right during play to open Build Mode, a
little Sims-style catalog: pick an item (trees, bushes, flowers, benches,
lamps, gems, banners, and more), optionally pick a color, then click the
ground to place it. Click a placed item again to remove it. Everything you
add or remove is saved per-room in the browser automatically — the original
scenery can't be removed, only what you've personally added.

## Ask Claude for decoration ideas

Inside Build Mode there's a **💡 Ask Claude for an idea** button. It calls
the real Claude API directly from the browser using your *own* Anthropic API
key (get one at console.anthropic.com) — it asks for a small decoration idea
and offers to add it straight into the room. A few things worth knowing:

- The key is typed in once and saved only in this browser's local storage on
  this laptop — it's never sent anywhere except Anthropic's servers.
- It needs an internet connection to work (everything else in the game works
  fully offline).
- Using it spends a small amount of real money on whichever API key is
  entered, billed to whoever owns that key — it's optional and only runs
  when the "Ask" button is pressed.
