/*
  ============================================================
  EDIT THIS FILE to personalize the game. Nothing else needs
  to change — game.js reads everything from here.
  Replace every TODO_ with your own words. Keep the quotes.
  ============================================================
*/

const GAME_CONTENT = {

  // ---- Names & basics ----
  playerName: "Aryan",
  girlfriendName: "Riddhi",
  nickname: "Sweetie", // used in a few lines of dialogue

  // Character look — pick any hex colors
  characterShirtColor: "#ff6f91",
  characterHairColor: "#3b2314",
  characterSkinColor: "#f2c9a0",

  // ---- Room 1: The Meeting Grounds ----
  room1: {
    name: "The Meeting Grounds",
    introDialogue: [
      "Hi sweetie, welcome to your anniversary present!",
      "One whole year of us, and I hid some of my favourite bits of it in here.",
      "Have a look around, something's hiding somewhere in this room..."
    ],
    memoryTitle: "Nando's & a Cookie Bowl",
    memoryText: "After being best friends and a whole lot of on and off (SORRYYYY), we finally got together a year ago today. we had our first proper date at Nando's, then went and got a ice cream cookie bowl. It was the perfect start, and it just felt so nice to finally be together.",
  },

  // ---- Room 2: The Riddle Garden ----
  room2: {
    name: "The Riddle Garden",
    riddleIntro: "",
    riddleQuestion: "I'm long and a bit wiggly, you'll find me in a bowl of soup, and you can see me in the mirror right now. I'm also the very last word of what you're saved as in my phone. What am I?",
    riddleAnswer: "noodle", // lowercase; checked case-insensitively
    riddleHint: "Beautiful... angel... princess... ?",
    correctResponse: "Correct, my beautiful angel princess noodle!",
  },

  // ---- Room 3: Memory Collector ----
  room3: {
    name: "Memory Collector",
    introText: "Four little moments from our year that I think about all the time.",
    milestones: [
      { title: "The Scenic Lookout", text: "We made it all the way up to the lookout together. The view was amazing, but I was way more interested in the person next to me." },
      { title: "Crab Headbands", text: "Two crabs squeezed into one tiny photobooth. Those photos are some of my favourite things I own." },
      { title: "Movie Night: Toppers", text: "We watched Toppers together. Honestly, any movie is better when I'm watching it with you." },
      { title: "The Sea Turtle", text: "At the maritime museum we stuck our faces through the sea turtle cutout. Easily the cutest turtle in the whole museum." },
    ],
  },

  // ---- Room 4: The Treasure Room (finale) ----
  finale: {
    chestPrompt: "Open the treasure chest",
    loveLetterTitle: "Happy One Year, Sweetie",
    loveLetterBody:
`Hi baby,

I love youu soooo muchhhhh. You've made the last two years so amazing, first as my best friend and then as my girlfriend, and I've had sooo much fun with you through all of it.

I love how kind you are. I love how much you care, about everyone, but especially about me. That letter you gave me is still one of the cutest things anyone has ever done for me. And I love how patient you are with me, even when I definitely don't make it easy.

You've made me a better person, baby. I really mean that. Being with you makes me want to be kinder and better, because that's what you are every single day.

It's been one year since that first Nando's date and the cookie bowl, and I'd do every single day of it again. I can't wait for all the moments we haven't had yet.

BAWPPPPPPPPPP, I LOVE YOU.

Mwahhhhhhh`,
    signOff: "Forever yours, Aryan",
  },
};
