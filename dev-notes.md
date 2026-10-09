# Dev Notes

A short log of problems, changes, and surprises while building Start Up.

## Layer 1

- Started with only index.html, style.css and game.js. The one task (Fix a Bug) is written directly in game.js for now; it moves to tasks.js in Layer 2.
- The task row is written straight into index.html for Layer 1 because there is only one. In Layer 2 the rows will be built with JavaScript so all five tasks come from tasks.js.
- The timer checks `Date.now() - startTime` every 100 ms instead of counting ticks, so it stays correct even if the browser slows the interval down.
- Tested by opening the page in a headless browser with a fake clock: click starts the bar, clicking again while running does nothing, and $10 is paid after 10 seconds.

## Layer 2

- Moved the task numbers into tasks.js (`taskList`) and the save code into save.js. The task row is no longer written in index.html; `buildTaskRows()` creates one row per task with `document.createElement`, so changing tasks.js changes the page.
- Problem: the level cost formula gave the wrong answer for Build a Feature. `100 * 1.15` is `114.99999999999999` in JavaScript because of floating point, so `Math.floor` gave $114 instead of $115. The same happens for Test a Release and Launch a Product at levels 1 and 2. Fixed by adding 0.001 before `Math.floor`. Checked that Fix a Bug still gives the examples from the plan: $17, $30, $60, $493, $16,254 for levels 1, 5, 10, 25, 50.
- The button click functions are made inside `makeWorkArea(i)` and `makeButtonArea(i)` instead of directly inside the `for` loop. With `var i` in a loop, every button would remember the last value of `i` (5), so every button would act on a task that doesn't exist. Passing `i` into a separate function gives each button its own copy.
- Each row is split into a clickable "work area" (character, name, bar) and a separate button area. If the whole row was clickable, clicking Level Up would also start the task.
- Design decision: locked rows still show the task name (greyed out) next to the Unlock button so the player knows what they are buying. The plan said "only an Unlock button"; I read that as "no Level Up/Hire buttons and no progress bar".
- At first the whole locked row was faded with `opacity`, which also faded the Unlock button so it looked greyed out even when the player could afford it. Changed it to fade only the left part of the row.
- `gameState` now has all the fields from the plan (money, totalEarned, tasksCompleted, tasks, achievements, investors, lastSaved), even the ones Layer 3 and 4 will use, so old saves don't need converting later. `fixMissingData()` still fills in anything missing from an older save, just in case.
- If the save text is broken and `JSON.parse` fails, the game starts a new game instead of crashing (try/catch in `loadGame()`).
- A task the player started by hand keeps its `startTime` in the save. If the page is reloaded while it's running, it simply finishes (or finishes right away if enough time passed) and pays once.
- The "Add $10,000 (testing)" button is in index.html inside a comment block marked TESTING ONLY. All of its code is in its `onclick`, so deleting that one block removes it completely. It only adds to money, not to totalEarned, so it doesn't count toward achievements.
