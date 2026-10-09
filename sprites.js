// Colors that are the same for every character.
// Each letter in a sprite picks one of these colors. "." means see-through.
var palette = {
  S: "#f2c6a0",
  E: "#1b1b2f",
  M: "#b5654d",
  L: "#c9c9de",
  W: "#ffffff",
  D: "#9c6b3c",
  F: "#5e3d1e"
};

// Colors that are different for each character:
// H = hair, T = shirt, S = skin, G = hoodie strings (same as the shirt unless they stand out),
// A = top of the head (hair, or the headset band),
// B = headset ear cup and microphone ("" means see-through, so no headset)
var characterColors = {
  "Founder": { H: "#3b2a1a", A: "#3b2a1a", B: "", T: "#4d96ff", G: "#4d96ff" },
  "Intern": { H: "#f9c74f", A: "#f9c74f", B: "", T: "#43aa8b", G: "#43aa8b" },
  "Junior Dev": { H: "#7a4a2a", A: "#7a4a2a", B: "", T: "#f8961e", G: "#f8961e", S: "#c68c5f" },
  "Designer": { H: "#ff70a6", A: "#ff70a6", B: "", T: "#9d4edd", G: "#9d4edd" },
  "QA Tester": { H: "#222222", A: "#222222", B: "", T: "#e63946", G: "#e63946", S: "#8d5a3b" },
  "DevOps Engineer": { H: "#555555", A: "#e0e0e0", B: "#e0e0e0", T: "#22223b", G: "#22223b" },
  "IT Support": { H: "#2b2b2b", A: "#2b2b2b", B: "", T: "#2ec4b6", G: "#2ec4b6", S: "#c68c5f" },
  "Cybersecurity": { H: "#111111", A: "#111111", B: "", T: "#111111", G: "#39ff14", W: "#39ff14" },
  "Hacker": { H: "#0b0b0b", A: "#0b0b0b", B: "", T: "#1a1a1a", G: "#1a1a1a", S: "#3a3a3a", E: "#39ff14", M: "#2a2a2a", W: "#39ff14" }
};

// The base person at a desk with a laptop. Frame 1 has the hands down on the keyboard.
var typingFrame1 = [
  "................",
  ".....AAAAAA.....",
  "....HHHHHHHH....",
  "...BHSSSSSSHB...",
  "...BSESSSSESB...",
  "...BSSSSSSSS....",
  "....BSSMMSS.....",
  "......SSSS......",
  "...TTTGTTGTTT...",
  "..TTTTGTTGTTTT..",
  "..TTTLLLLLLTTT..",
  "..TTLLLWWLLLTT..",
  "..SSLLLLLLLLSS..",
  "DDDDDDDDDDDDDDDD",
  ".FF..........FF.",
  ".FF..........FF."
];

// Frame 2 is the same, but the hands are lifted up (typing)
var typingFrame2 = [
  "................",
  ".....AAAAAA.....",
  "....HHHHHHHH....",
  "...BHSSSSSSHB...",
  "...BSESSSSESB...",
  "...BSSSSSSSS....",
  "....BSSMMSS.....",
  "......SSSS......",
  "...TTTGTTGTTT...",
  "..TTTTGTTGTTTT..",
  "..TTTLLLLLLTTT..",
  "..SSLLLWWLLLSS..",
  "..TTLLLLLLLLTT..",
  "DDDDDDDDDDDDDDDD",
  ".FF..........FF.",
  ".FF..........FF."
];

// Finds the color for one letter of a sprite. Returns "" for see-through.
function getSpriteColor(letter, characterName) {
  if (letter == ".") {
    return "";
  }
  var colors = characterColors[characterName];
  if (colors[letter] !== undefined) {
    return colors[letter];
  }
  return palette[letter];
}

// Draws a character onto a 16 by 16 canvas, one square at a time.
// frameNumber is 1 or 2.
function drawSprite(canvas, characterName, frameNumber) {
  var grid = typingFrame1;
  if (frameNumber == 2) {
    grid = typingFrame2;
  }
  var context = canvas.getContext("2d");
  context.clearRect(0, 0, 16, 16);
  for (var y = 0; y < 16; y++) {
    for (var x = 0; x < 16; x++) {
      var color = getSpriteColor(grid[y].charAt(x), characterName);
      if (color != "") {
        context.fillStyle = color;
        context.fillRect(x, y, 1, 1);
      }
    }
  }
}
