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

## Layer 4: pivot, random events, sound

Start this section with a fresh game: click Reset and press OK.

### Pivot
1. The top bar says "Investors: 0 (+0%)" and there is no Pivot button.
2. Click "Add $10,000 (testing)". Still no Pivot button (testing money doesn't count toward pivoting).
3. Unlock Build a Feature, level Fix a Bug a few times and hire the Intern.
4. Click "Earn $1,000,000 (testing)". A purple "Pivot: +1 investors" button appears in the top bar.
5. Click it again. The button says "+2 investors".
6. Click Pivot, then Cancel. Nothing changes.
7. Click Pivot, then OK. Money is $0, only Fix a Bug is unlocked at level 1, nobody is hired (the Founder is back), and the Pivot button is gone. Top bar: "Investors: 2 (+20%)".
8. Fix a Bug now says "$12 every 10s" (10 x 1.2). Run it once: you get $12.
9. Open Achievements: everything you had before is still there. Open Stats: Total earned still includes the old money; it also shows "Investor points: 2 (payouts x1.2)" and "Earned since last pivot".
10. Reload the page. Investors are still 2.

### Random events
(The outage and the boost banner changed in Layer 5. See the Layer 5 section for outages.)
11. Play for about 2 minutes without clicking the testing buttons. A colored banner should appear under the top bar sometime between 1 and 2 minutes after opening the page. (Before you have earned $5,000 in total, it is always an Investor Meeting.)
12. Click "Start random event now (testing)" until you get a green "Investor Meeting!" banner with a "Take Meeting" button, a shrinking bar and "Time left: 15 s".
13. Click Take Meeting. A yellow "Investor Meeting: payouts x2" bar appears with "Time left: 30 s" and shrinks. Payouts in every row are doubled (Fix a Bug says $24 with 2 investors). After 30 seconds the bar goes away and the payouts go back.
14. Get another Investor Meeting and don't click it. After 15 seconds it disappears with the message "You missed the investor meeting."

### Sound
15. Click something on the page first (browsers block sound until you do). Finish a task: you hear a short high beep.
16. Level up, unlock or hire: a middle beep. An event starting: a low, longer beep.
17. Click "Sound: On". It changes to "Sound: Off" and there are no more beeps. Reload the page: it is still off. Click it again to turn sound back on.

## Layer 5: click fix, faster levels, team, outages, hacker breach

Start this section with a fresh game: click Reset and press OK.

### Click fix
1. Hover over the Level Up button, press the mouse down on its very top-left corner and let go. The level goes up (before the fix, the button moved away under the mouse and the click was lost).
2. Press any button. It loses its shadow but does not move.
3. Click Fix a Bug many times quickly. The first click starts it, and the text in the row doesn't get highlighted blue.
4. When it finishes, click once right away. It starts again on the first click.

### 4% shorter every 5 levels
5. Use "Add $10,000 (testing)". Fix a Bug at level 4 says "every 10s".
6. Level 5: "every 9.6s". Level 9: still 9.6s.
7. Level 10: "$100 every 4.61s" (10 x 0.5 x 0.96 x 0.96 = 4.608).
8. Level 15: 4.42s. Level 25: 2.04s. Level 50 and up: 1s (the minimum).

### Team: IT Support and Cybersecurity
9. With less than $10,000 earned in total, there is no Team section.
10. Click "Earn $1,000,000 (testing)" (this counts as earned money). A "Team" section appears under the tasks with IT Support and Cybersecurity, both faded and "(not hired)".
11. The buttons say "Hire IT Support $25,000" and "Hire Cybersecurity $50,000". They are grey if you can't afford them.
12. IT Support says "Server outages last 30s (max 30s)". Cybersecurity says "Hacker breach timer: 30s".
13. Hire IT Support. The row is no longer faded, it shows "IT Support  Lv 1", the teal-shirt character, a "Level Up $5,750" button, and "Server outages last 25.5s".
14. Hire Cybersecurity: black hoodie with green details, "Level Up $11,500", "Hacker breach timer: 33s, win = x1.5 for 60s".
15. Level IT Support up to 5: outages last 13.31s. Level 10: 5.91s.
16. Keep leveling to 15. The name says "Lv 15 MAX", the button says MAX and is grey, outages last 3s.
17. Click Save and reload. Both team members are still hired at the same levels.

### Server outage
18. Reset, then click "Earn $1,000,000 (testing)" and hire IT Support. Start Fix a Bug.
19. Click "Start outage (testing)". A red banner says "Server Outage! All tasks are paused." with a shrinking bar and "Time left: 26 s" (25.5s with IT level 1). There is no Fix It button.
20. The Fix a Bug row turns red and says "Paused: server outage!". Its bar stops and the character stops typing. No money comes in.
21. The IT Support row says "Fixing the servers!" and the IT character is typing.
22. Click Fix a Bug during the outage. A message says the servers are down.
23. When the time runs out: "The servers are back up." The Fix a Bug bar continues from where it stopped.
24. Without IT Support hired, an outage lasts the full 30 seconds.
25. On a fresh game (less than $5,000 earned), "Start random event now" never gives an outage, only meetings.

### Hacker breach: winning
26. With Cybersecurity hired, click "Start breach (testing)". A popup opens right away: "HACKER BREACH!", a hacker with green eyes typing, a math problem, a text box, Submit, "Problems left: 3", a bar and "Time left: 33 s".
27. Type a wrong answer and press Enter. It says "Wrong! -3 seconds", the time drops by 3, there is a new problem, and Problems left is still 3.
28. Answer 3 problems correctly (use both Enter and the Submit button). After each one it says "Correct!" and Problems left goes down.
29. After the third: the popup closes and "Hacker beaten!" appears. A "Security Boost: payouts x1.5" bar shows with "Time left: 60 s", and payouts in the rows are 1.5 times bigger.
30. During an Investor Meeting boost too, payouts are x2 x 1.5 = x3 (Fix a Bug level 1 with no investors: $30).
31. Without Cybersecurity hired, the timer starts at 30 s, and winning gives no boost.
32. The problems are always whole numbers: two 2-digit numbers added, a subtraction with a positive answer, a 1-digit times a 2-digit number, or a division that comes out even.

### Hacker breach: losing
33. Click "Start breach (testing)" and don't answer. Under 10 seconds the bar turns red.
34. When it runs out, a popup says "The start up was infiltrated :(" with a Start Over button. You can't close it any other way.
35. Click Start Over. Money is $0, only Fix a Bug is unlocked at level 1, nobody is hired, and IT Support and Cybersecurity are not hired. Investor points, achievements and Stats are the same as before.
36. Start another breach, then refresh the page (F5) before it ends. The "infiltrated" popup appears right away; refreshing doesn't escape. Refresh again: it is still there until you click Start Over.
37. Breaches only come from "Start random event now" once you have earned $100,000 in total, and about 1 in 5 events is a breach.
38. Close the game for a few minutes and come back: no event happened while you were away (only the welcome back money).
