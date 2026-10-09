# Test Checklist

Open index.html in a browser (double-click it). Follow the steps in order and check that what happens matches. If a step fails, write down the step number and what happened instead.

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
