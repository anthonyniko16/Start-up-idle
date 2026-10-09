// For now there is only one task, written right here
var fixBug = { name: "Fix a Bug", time: 10, payout: 10 };

// Everything that changes while playing
var gameState = {
  money: 0,
  running: false,
  startTime: 0
};

// Starts the task when the player clicks it (does nothing if it is already running)
function clickTask() {
  if (!gameState.running) {
    gameState.running = true;
    gameState.startTime = Date.now();
    updateScreen();
  }
}

// Runs many times a second: pays the player when the task's timer is done
function gameTick() {
  if (gameState.running) {
    var secondsPassed = (Date.now() - gameState.startTime) / 1000;
    if (secondsPassed >= fixBug.time) {
      gameState.money = gameState.money + fixBug.payout;
      gameState.running = false;
    }
  }
  updateScreen();
}

// Shows the current money, progress bar and status on the page
function updateScreen() {
  document.getElementById("money-display").textContent = "$" + gameState.money;

  var row = document.getElementById("task-row");
  var bar = document.getElementById("progress-bar");
  var status = document.getElementById("task-status");

  if (gameState.running) {
    var secondsPassed = (Date.now() - gameState.startTime) / 1000;
    var percent = secondsPassed / fixBug.time * 100;
    if (percent > 100) {
      percent = 100;
    }
    bar.style.width = percent + "%";
    row.className = "task-row working";
    status.textContent = "Working... pays $" + fixBug.payout;
  } else {
    bar.style.width = "0%";
    row.className = "task-row ready";
    status.textContent = "Click to start - pays $" + fixBug.payout;
  }
}

document.getElementById("task-row").onclick = clickTask;
updateScreen();
setInterval(gameTick, 100);
