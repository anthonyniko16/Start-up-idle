START UP - an idle clicker game about a tech startup
CS 401 class project

HOW TO RUN
  Double-click index.html (or drag it into Chrome, Firefox or Edge).
  Nothing needs to be installed. There is no build step and no server.
  An internet connection is only used to load the pixel font from Google
  Fonts. Without it the game still works and uses a plain fallback font.

HOW TO PLAY
  Click a task (the left part of its row) to start it. When the bar fills
  up you get paid. Use the money to unlock new tasks and level them up.

FILES
  index.html   The page. Loads the font, style.css and the scripts in this
               order: tasks.js, save.js, game.js.
  style.css    Colors, layout and the pixel look.
  tasks.js     The list of tasks and all their numbers (time, payout,
               unlock cost, level cost base, hire cost). Change numbers here
               to tune the game.
  save.js      gameState (everything that changes while playing), making a
               new game, saving and loading with localStorage, and Reset.
  game.js      The game itself: formulas, clicking tasks, buying things, the
               game loop that pays the player, and drawing the screen.
  readme.txt   This file.
  dev-notes.md A log of problems and design changes while building the game.
  test-checklist.md  Step-by-step manual tests for each layer.

SAVING
  The game saves by itself every 10 seconds and when the page is closed.
  The Save button saves right away. The save is kept in the browser's
  localStorage under the name "startUpSave", so it only exists in the
  browser you played in.

RESETTING THE SAVE
  Click Reset at the bottom of the page and press OK. This deletes the save
  and starts a new game. (Clearing the browser's site data also deletes it.)

BEFORE TURNING IN
  Delete the block in index.html marked "TESTING ONLY". It holds the
  "Add $10,000 (testing)" button.
