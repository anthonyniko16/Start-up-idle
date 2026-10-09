# Test Checklist

Open index.html in a browser (double-click it). Follow the steps in order and check that what happens matches. If a step fails, write down the step number and what happened instead.

**Starting with a fresh game:** there is no Reset button. Press F12, open the Console, type `window.onbeforeunload = null; localStorage.clear(); location.reload();` and press Enter.

## Basics

1. Open index.html. The top bar says "Start Up" and money shows $0. Press F12: the Console has no red errors.
2. There are five rows: Fix a Bug, Build a Feature, Design a Screen, Test a Release, Launch a Product. Each shows its own pixel character at a desk. The edges are sharp, not blurry. Nothing is animated.
3. Fix a Bug says "Lv 1" and "Click to start: $10 per run, 10.00s".
4. The other four are faded, say "Locked", and only have an Unlock button: $400, $3,000, $20,000, $150,000.
5. Fix a Bug has "Level Up $17" and "Hire Intern $150", both grey (you can't afford them).

## Timer and countdown

6. Click Fix a Bug. The row border turns yellow, the text says "Working:", the bar fills and the time counts down with two decimals: 9.99s, 9.98s ...
7. When the bar is half full, the time says about 5.00s. Text and bar always agree.
8. Click the row again while it runs. Nothing changes.
9. At 0.00s the bar is full, money goes to $10, and the row goes back to "Click to start: ... 10.00s".
10. Click a locked row. Nothing happens.

## Buying

11. Click "Add $10,000 (testing)". Money goes up by $10,000. Buttons you can now afford turn yellow.
12. Unlock Build a Feature ($400). The row is no longer faded. It shows "Lv 1", "$75 per run, 30s", "Level Up $115" and "Hire Junior Dev $2,000".
13. Click Build a Feature. The time counts down in whole seconds (30s, 29s ...) and switches to two decimals below 10 (9.99s ... 0.00s). You get $75.
14. Level Fix a Bug up: the cost goes $17, $19 ... At level 5 the button says $30 and the time is 9.60s. At level 10 the button says $60, it pays $100 per run, and the time is 4.61s.
15. Start Fix a Bug at level 9 and level it to 10 while it runs. The countdown jumps down and runs faster, and the bar jumps with it.
16. Keep leveling (more testing money). Level 25: 2.04s. Level 50 and higher: 1.00s (the minimum).

## Hiring

17. Hire the Intern. Money drops by $150. The button now says "Hired" (grey). The character does not change.
18. The row border turns green and the text says "Auto:". The task starts by itself and restarts after every run without clicking.
19. Switch to another tab for 1 minute and come back. The hired task was paid for every run that finished while you were away.

## Stats

20. Click Stats. A popup shows Total earned, Tasks completed, Characters hired (x / 5) and Highest level. Click OK.

## Saving and offline progress

21. Click Save. A popup says "Game saved." Click OK.
22. Reload the page. Money, levels, unlocks and hires are the same.
23. Start a task by hand (not hired) and reload right away. It is still running from where it was.
24. With a character hired, close the tab, wait 2 minutes, open index.html again. A "Welcome back!" popup says how long you were away and how much your team earned. Money went up by that amount.
25. Start a task by hand, close the tab, wait longer than its time, open the game again. It paid once and is waiting for a click.
26. 8 hour limit: press F12 and run `state.lastSaved = Date.now() - 20 * 3600 * 1000; window.onbeforeunload = null; localStorage.setItem("startUpSave", JSON.stringify(state)); location.reload();` The popup says you were away 480 minutes: only 8 hours count.

## Layout

27. Make the window narrow. The buttons move under the task and nothing is cut off sideways.
