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

## Layer 3

- Hiring: a hired task restarts by itself. If the tab was in the background, the game loop finds that more than one run has finished, so it pays `floor(secondsPassed / time)` runs at once and moves `startTime` forward by that many runs (not to "now"), so the leftover part of the current run is kept. Tested by jumping a fake clock forward 55 seconds with the Intern hired: it paid 5 runs ($50) in one tick.
- Speed milestones: the levels (10, 25, 50, 100) are a list in tasks.js so they can be tuned with the other numbers. Checked Fix a Bug: level 10 takes 5s and pays $100 (matches the plan), level 25 is 2.5s, level 50 is 1.25s, level 100 hits the 1 second minimum. Launch a Product only gets down to 18.75s at level 100 because 300 / 16 is still above 1.
- Times like 2.5 and 1.25 seconds show with decimals in the row ("$250 every 2.5s"). I left them like that because rounding them would show the wrong speed.
- If a level up passes a milestone while the task is running, the bar jumps forward because the same elapsed time is now a bigger part of a shorter run. I left this as is; it pays correctly.
- Sprites: to give the DevOps Engineer a headset without making a second sprite, the base sprite uses two extra letters. "A" is the top row of the head and "B" is the ear cup and microphone. For everyone else A is their hair color and B is "" (see-through), so the headset only shows for DevOps. I also gave two characters a different skin color, which wasn't in the plan.
- Each sprite is only redrawn when the character or animation frame changes (`lastSprite` in game.js) instead of 10 times a second for every row.
- Locked rows show the Founder, faded like the rest of the left side of the row.
- Messages: in Layer 2 the message box showed one message and the next one replaced it. With hiring added, "You hired the Intern!" is followed one tick later by the First Hire achievement message, so the first message would vanish almost right away. Changed `showMessage` to add a new line for each message and remove each line after 3 seconds.
- Offline progress: hired tasks earn `floor(secondsAway / taskTime)` runs, as planned. Changed one thing while writing it: at first I always restarted a hired task's timer at load time, but that means a quick reload throws away the current run (bad for Launch a Product at 300 seconds). Now the timer is only restarted if at least one run finished while away; otherwise the run just continues. Part of a run that was in progress when the game was saved is not counted when the player was away a long time, so offline earnings can be up to one run lower than "real" time would give. I kept the simple formula.
- Offline time is worked out from `lastSaved`, which is set when saving. Since the game saves when the page closes, this is close to the real time the player left.
- If the computer clock went backwards (time away is negative), offline time is treated as 0, and any task whose `startTime` is now in the future starts its run again, so the bar doesn't get stuck below 0%.
- The welcome back popup only shows if something was earned, so a quick reload with nothing finished doesn't show "you earned $0".
- Tested offline progress by changing `lastSaved` in the save by hand: 1 hour away with the Intern hired at level 10 (5s, $100) plus a Build a Feature run started by hand gave $72,075 = 720 runs x $100 + one $75 run. 20 hours away gave exactly 8 hours' worth ($576,000) and said it hit the 8 hour limit. A save from 1 hour "in the future" gave $0 and no popup.
- Achievements are kept in `gameState.achievements` as `{ firstPaycheck: true, ... }`. They're checked every tick in `checkAchievements()`. First Paycheck uses `tasksCompleted >= 1`.
