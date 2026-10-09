START UP - an idle clicker game about a tech startup
CS 401 class project

HOW TO RUN
  Double-click index.html (or drag it into Chrome, Firefox or Edge).
  Nothing needs to be installed. There is no build step, no server and no
  internet connection needed.

HOW TO PLAY
  Click a task (the left part of its row) to start it. The bar fills up and
  the time left counts down next to the payout. When it reaches 0 you get
  paid. Use the money to unlock new tasks and level them up.
  Leveling up makes a task pay more (payout = base payout x level). Every
  5 levels a task gets 4% faster, and at levels 10, 25, 50 and 100 it gets
  twice as fast (never faster than 1 second).
  Hire a task's character and the task runs by itself (the row says Auto),
  even while the game is closed (up to 8 hours of offline earnings).
  The Stats button shows total earned, tasks completed, characters hired
  and the highest level.

FILES
  index.html   The page: top bar, the place for the task rows, the Stats and
               Save buttons, and the popup. Loads style.css and game.js.
  style.css    Colors and layout.
  game.js      Everything else: the task list (names, times, payouts,
               costs), the character sprite, the formulas, clicking and
               buying, the game loop, saving/loading with offline progress,
               and updating the screen.
  readme.txt   This file.
  dev-notes.md A log of problems and design changes while building the game.
  test-checklist.md  Step-by-step manual tests.

SAVING
  The game saves by itself every 10 seconds and when the page is closed.
  The Save button saves right away. The save is kept in the browser's
  localStorage under the name "startUpSave".

STARTING OVER
  There is no Reset button. To start a new game, clear the site data in the
  browser, or open the console (F12) and type: localStorage.clear()
  then close the page without saving (or reload twice).

BEFORE TURNING IN
  Delete the block in index.html marked "TESTING ONLY" (the
  "Add $10,000 (testing)" button).
