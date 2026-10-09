# Dev Notes

A short log of problems, changes, and surprises while building Start Up.

## Layer 1

- Started with only index.html, style.css and game.js. The one task (Fix a Bug) is written directly in game.js for now; it moves to tasks.js in Layer 2.
- The task row is written straight into index.html for Layer 1 because there is only one. In Layer 2 the rows will be built with JavaScript so all five tasks come from tasks.js.
- The timer checks `Date.now() - startTime` every 100 ms instead of counting ticks, so it stays correct even if the browser slows the interval down.
- Tested by opening the page in a headless browser with a fake clock: click starts the bar, clicking again while running does nothing, and $10 is paid after 10 seconds.
