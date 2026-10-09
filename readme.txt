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
  Leveling up makes a task pay more. Every 5 levels a task gets 4% faster,
  and at levels 10, 25, 50 and 100 it gets twice as fast (never faster than
  1 second).
  Hire a character for a task and they will run it for you, even while the
  game is closed (up to 8 hours of offline earnings).
  Stats and Achievements are at the bottom of the page.
  Once you have earned $1,000,000 since your last pivot, you can Pivot: you
  start over, but get investor points that give +10% payouts each.
  Every 1 to 2 minutes a random event happens:
    - Investor Meeting: click it within 15 seconds for double payouts for
      30 seconds.
    - Server Outage (after $5,000 earned): all tasks pause for up to 30
      seconds. Hire and level IT Support to make outages shorter.
    - Hacker Breach (after $100,000 earned, rarer): answer 3 math problems
      before the timer runs out. Cybersecurity gives more time and a x1.5
      payout boost for 60 seconds when you win. If you lose, you start over
      (you keep investors, achievements and stats). Refreshing the page
      during a breach counts as losing.
  The Team section (IT Support and Cybersecurity) appears after $10,000
  earned. Both can be leveled up to 15.
  The Sound button at the bottom turns the beeps on and off.

FILES
  index.html   The page. Loads the font, style.css and the scripts in this
               order: tasks.js, sprites.js, save.js, game.js.
  style.css    Colors, layout and the pixel look.
  tasks.js     The list of tasks and all their numbers (time, payout,
               unlock cost, level cost base, hire cost). Change numbers here
               to tune the game. Also the speed-up rules, the team (IT
               Support and Cybersecurity) and when events unlock.
  sprites.js   The pixel art. Each character is a 16x16 grid of letters,
               each letter is a color. Also the function that draws a
               sprite onto a canvas.
  save.js      gameState (everything that changes while playing), making a
               new game, saving and loading with localStorage, offline
               progress, and Reset.
  game.js      The game itself: formulas, clicking tasks, buying and hiring,
               the team, pivoting, the game loop that pays the player, random
               events and the hacker breach, sound, achievements, the stats
               and achievements popups, and drawing the screen.
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
  "Add $10,000", "Earn $1,000,000", "Start random event now",
  "Start outage" and "Start breach" testing buttons.
