# Test Checklist

Open index.html in a browser (double-click it). Follow the steps in order and check that what happens matches. If a step fails, write down the step number and what happened instead.

## Before you start: did everything load?

1. Open index.html. If a red box at the top says a file did not load, the game won't run. Put the named file in the same folder as index.html with exactly that name.
2. Press F12 and open the Console tab. While the DEBUG lines are still in the code, you should see "DEBUG startGame: game loaded and the 100 ms tick timer is running" and no red errors.

## Layer 1: one task

1. Open index.html. The top bar says "Start Up" and money shows $0.
2. The "Fix a Bug" row has a colored square on the left and an empty progress bar. It says "Click to start: $10 every 10s".
3. Click the left part of the row. The bar starts filling and the text says "Working...". The row border turns yellow.
4. While it is filling, click the row again. Nothing changes (the bar does not restart).
5. Wait about 10 seconds. The bar finishes, money goes to $10, and the row goes back to "Click to start".
6. Click it again and wait. Money goes to $20.
7. Click it, then switch to another tab for 15 seconds and come back. You were paid $10 only once, and the task is waiting for a click again.

## Layer 2: all tasks, leveling, saving

Start this section with a fresh game: click Reset and press OK.

1. There are five rows. Only Fix a Bug is unlocked. The other four are greyed out, say "Locked" and only have an Unlock button: $400, $3,000, $20,000, $150,000.
2. With $0, all Unlock buttons and the Level Up $17 button are grey and clicking them does nothing.
3. Click a locked row's name area. Nothing happens.
4. Click Fix a Bug twice (waiting 10 seconds each time) until you have $20. Level Up $17 turns yellow once you have $17 or more.
5. Click Level Up. Money drops by $17, the row says "Lv 2", it now pays $20, and the button now says Level Up $19.
6. Click "Add $10,000 (testing)". Money goes up by $10,000. Unlock $400 and Unlock $3,000 turn yellow.
7. Click Unlock $400 on Build a Feature. Money drops by $400. The row is no longer grey, shows "Lv 1", "$75 every 30s" and a Level Up $115 button.
8. Click Build a Feature and wait 30 seconds. You get $75.
9. Level Fix a Bug up to level 5. Its Level Up button should say $30. (Level 10 should say $60.)
10. Click Save. A "Game saved" message appears at the bottom for a moment.
11. Start Build a Feature, then reload the page (F5) right away. Money, levels and unlocks are the same as before. Build a Feature is still filling from where it was and pays when it finishes.
12. Close the tab, open index.html again. Everything is still there.
13. Click Reset and press Cancel. Nothing changes.
14. Click Reset and press OK. Money is $0, only Fix a Bug is unlocked at level 1.
15. Reload the page. It is still the fresh game (the old save is gone).
16. Make the browser window narrow (or use phone view in dev tools). The buttons move under each task and nothing is cut off sideways.

## Layer 3: hiring, sprites, speed, offline, achievements

Start this section with a fresh game: click Reset and press OK.

### Sprites
1. Every row shows a little pixel person at a desk with a laptop (the Founder, blue hoodie). The edges are sharp, not blurry.
2. Click Fix a Bug. While the bar fills, the Founder's hands move up and down (typing) about 3 times a second. When it finishes, the hands stop in the "down" position.
3. Locked rows show a faded Founder.

### Achievements and stats
4. Finish one Fix a Bug run. A message "Achievement: First Paycheck" appears at the bottom.
5. Click Achievements. First Paycheck has [X] and is green. The other five have [ ] and are grey. Click Close.
6. Click Stats. It shows Total earned $10, Tasks completed 1, Characters hired 0 / 5, Highest level 1. Click Close.

### Hiring
7. The Fix a Bug row has a grey "Hire Intern $150" button. Locked rows have no Hire button.
8. Click "Add $10,000 (testing)". Hire Intern turns yellow. Click it.
9. Money drops by $150. The Founder changes to the Intern (yellow hair, green shirt). The row border turns green, the status says "Auto (Intern): $10 every 10s", and the Hire button is gone. Messages say "You hired the Intern!" and "Achievement: First Hire".
10. The bar starts by itself and the Intern types. Every 10 seconds you get $10 and the bar starts again without clicking.
11. Click the Fix a Bug row while it runs. Nothing happens.
12. Switch to another tab for about 1 minute, then come back. Money went up by about $60 (6 runs) for the Intern.

### Speed milestones
13. Level Fix a Bug up to level 9. It still says "every 10s".
14. Level it to 10. It now says "$100 every 5s" (twice as fast). Message: "Achievement: Level 10". The Level Up button says $60 (the cost to go from level 10 to 11).
15. Keep leveling (use the testing button for money). Level 25: "every 2.5s". Level 50: "every 1.25s". Level 100: "every 1s". Level 101 and higher stay at 1s.

### Other characters
16. Unlock all four other tasks. Message: "Achievement: Full Office".
17. Hire each one when you can afford it (use the testing button many times; DevOps costs $750,000). Check each picture: Junior Dev (orange shirt, brown hair), Designer (pink hair, purple shirt), QA Tester (red shirt), DevOps Engineer (dark clothes, white headset with a microphone).
18. When all five are hired: "Achievement: Fully Automated". Stats says Characters hired 5 / 5.

### Saving and offline progress
19. Note your money and which characters are hired. Close the tab. Wait 2 minutes. Open index.html again.
20. A "Welcome back!" popup says you were away about 2m and how much your company earned. It should be about 2 minutes of what your hired characters make (for example, the Intern alone at level 1 makes $120 in 2 minutes). Click OK.
21. Money went up by the amount in the popup. Hired tasks are running again.
22. Reset, then start Fix a Bug by hand (no one hired). Close the tab right away, wait 30 seconds, open it again. The popup says it earned $10 (one run only), and Fix a Bug is waiting for a click.
23. Reload the page quickly (F5) with nothing finished. No welcome popup appears.
24. Optional (8 hour limit): open the browser's developer console (F12) and paste:
    `gameState.lastSaved = Date.now() - 20 * 3600 * 1000; window.onbeforeunload = null; localStorage.setItem("startUpSave", JSON.stringify(gameState)); location.reload();`
    The popup says you were away 8 hours or more and you only get 8 hours of earnings.
25. Make the window narrow. The welcome, Stats and Achievements popups still fit on the screen.
