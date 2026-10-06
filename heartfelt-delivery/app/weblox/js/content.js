/*
  ============================================================
  EDIT THIS FILE to personalize the game. Nothing else needs
  to change — game.js reads everything from here.
  Replace every TODO_ with your own words. Keep the quotes.
  ============================================================
*/

const GAME_CONTENT = {

  // ---- Names & basics ----
  playerName: "TODO_YOUR_NAME",
  girlfriendName: "TODO_HER_NAME",
  nickname: "TODO_A_NICKNAME_YOU_CALL_HER", // used in a few lines of dialogue

  // Character look — pick any hex colors
  characterShirtColor: "#ff6f91",
  characterHairColor: "#3b2314",
  characterSkinColor: "#f2c9a0",

  // ---- Title screen ----
  titleScreen: {
    heading: "A Treasure Hunt For TODO_HER_NAME",
    subheading: "One year of us, turned into a little adventure.",
  },

  // ---- Room 1: The Meeting Grounds ----
  room1: {
    name: "The Meeting Grounds",
    introDialogue: [
      "TODO_: Write a short opening line, like how you want to greet her here.",
      "TODO_: A second line if you'd like — maybe hint she should look around.",
      "There's something hidden near that rock over there... find it, TODO_NICKNAME."
    ],
    memoryTitle: "TODO_: e.g. How We Met",
    memoryText: "TODO_: Write the memory of how you met / a milestone that belongs in room 1. A couple of sentences is perfect.",
  },

  // ---- Room 2: The Riddle Garden ----
  room2: {
    name: "The Riddle Garden",
    riddleIntro: "TODO_: A line of flavor text from the signpost/NPC before the riddle.",
    riddleQuestion: "TODO_: Write a riddle here, ideally based on an inside joke only she'd get.",
    riddleAnswer: "todo_answer", // lowercase; checked case-insensitively
    riddleHint: "TODO_: An optional hint if she gets stuck.",
    correctResponse: "TODO_: What the game says when she gets it right.",
  },

  // ---- Room 3: Memory Collector ----
  room3: {
    name: "Memory Collector",
    introText: "TODO_: A short line explaining she should collect the glowing hearts scattered around.",
    milestones: [
      { title: "TODO_ Milestone 1", text: "TODO_: describe this memory." },
      { title: "TODO_ Milestone 2", text: "TODO_: describe this memory." },
      { title: "TODO_ Milestone 3", text: "TODO_: describe this memory." },
      { title: "TODO_ Milestone 4", text: "TODO_: describe this memory." },
    ],
  },

  // ---- Room 4: The Treasure Room (finale) ----
  finale: {
    chestPrompt: "Open the treasure chest",
    loveLetterTitle: "TODO_: e.g. My Dearest TODO_HER_NAME,",
    loveLetterBody:
`TODO_: Write your full love letter here.

You can split it into a few paragraphs like this — just
leave a blank line between them and it'll format nicely.

This is the big finish, so take your time with it.`,
    signOff: "TODO_: e.g. Forever yours, TODO_YOUR_NAME",
  },
};
