// Used to hide the message box after a few seconds
var messageTimer = null;

// ---------- Numbers and formulas ----------

// How many seconds one run of a task takes right now
function getTaskTime(i) {
  return taskList[i].time;
}

// The payout multiplier (always 1 for now)
function getBonus() {
  return 1;
}

// How much one run of a task pays at its current level
function getPayout(i) {
  return Math.floor(taskList[i].payout * gameState.tasks[i].level * getBonus());
}

// The cost to go from the task's current level to the next level
function getLevelCost(i) {
  var level = gameState.tasks[i].level;
  // the + 0.001 stops a number like 114.99999 from being rounded down to 114
  return Math.floor(taskList[i].levelCostBase * Math.pow(1.15, level) + 0.001);
}

// Turns a number into money text like $1,234 or $1.2M
function formatMoney(amount) {
  if (amount >= 1000000000000) {
    return "$" + (Math.floor(amount / 100000000000) / 10).toFixed(1) + "T";
  }
  if (amount >= 1000000000) {
    return "$" + (Math.floor(amount / 100000000) / 10).toFixed(1) + "B";
  }
  if (amount >= 1000000) {
    return "$" + (Math.floor(amount / 100000) / 10).toFixed(1) + "M";
  }
  return "$" + Math.floor(amount).toLocaleString("en-US");
}

// ---------- Player actions ----------

// Adds money to the player and to the total earned
function earnMoney(amount) {
  gameState.money = gameState.money + amount;
  gameState.totalEarned = gameState.totalEarned + amount;
}

// Starts a task when the player clicks it (only if it is unlocked and not running)
function clickTask(i) {
  var task = gameState.tasks[i];
  if (task.unlocked && !task.running) {
    task.running = true;
    task.startTime = Date.now();
    updateScreen();
  }
}

// Buys a locked task so it can be used
function unlockTask(i) {
  var cost = taskList[i].unlockCost;
  if (!gameState.tasks[i].unlocked && gameState.money >= cost) {
    gameState.money = gameState.money - cost;
    gameState.tasks[i].unlocked = true;
    gameState.tasks[i].level = 1;
    updateScreen();
  }
}

// Buys one level for a task
function levelUpTask(i) {
  var cost = getLevelCost(i);
  if (gameState.tasks[i].unlocked && gameState.money >= cost) {
    gameState.money = gameState.money - cost;
    gameState.tasks[i].level = gameState.tasks[i].level + 1;
    updateScreen();
  }
}

// Saves when the Save button is clicked and tells the player
function clickSave() {
  saveGame();
  showMessage("Game saved");
}

// ---------- The game loop ----------

// Checks one running task and pays the player if its timer is done
function checkTask(i) {
  var task = gameState.tasks[i];
  if (!task.running) {
    return;
  }
  var secondsPassed = (Date.now() - task.startTime) / 1000;
  if (secondsPassed >= getTaskTime(i)) {
    earnMoney(getPayout(i));
    gameState.tasksCompleted = gameState.tasksCompleted + 1;
    task.running = false;
  }
}

// Runs 10 times a second: checks every task, then redraws the screen
function gameTick() {
  for (var i = 0; i < taskList.length; i++) {
    checkTask(i);
  }
  updateScreen();
}

// ---------- Building the page ----------

// Makes a button with an id and a function to run when it is clicked
function makeButton(id, whenClicked) {
  var button = document.createElement("button");
  button.id = id;
  button.onclick = whenClicked;
  return button;
}

// Makes a div with a class name and an id
function makeDiv(className, id) {
  var div = document.createElement("div");
  div.className = className;
  div.id = id;
  return div;
}

// Makes the clickable part of a row: character, name, progress bar and status
function makeWorkArea(i) {
  var workArea = makeDiv("work-area", "work-" + i);
  workArea.onclick = function () {
    clickTask(i);
  };
  workArea.appendChild(makeDiv("character-box", "character-" + i));

  var info = makeDiv("task-info", "info-" + i);
  info.appendChild(makeDiv("task-name", "name-" + i));
  var barOuter = makeDiv("progress-outer", "bar-outer-" + i);
  barOuter.appendChild(makeDiv("progress-inner", "bar-" + i));
  info.appendChild(barOuter);
  info.appendChild(makeDiv("task-status", "status-" + i));
  workArea.appendChild(info);
  return workArea;
}

// Makes the Unlock and Level Up buttons for a row
function makeButtonArea(i) {
  var buttonArea = makeDiv("task-buttons", "buttons-" + i);
  buttonArea.appendChild(makeButton("unlock-" + i, function () {
    unlockTask(i);
  }));
  buttonArea.appendChild(makeButton("level-" + i, function () {
    levelUpTask(i);
  }));
  return buttonArea;
}

// Creates all the task rows on the page, one for each task in tasks.js
function buildTaskRows() {
  var taskListDiv = document.getElementById("task-list");
  for (var i = 0; i < taskList.length; i++) {
    var row = makeDiv("task-row", "row-" + i);
    row.appendChild(makeWorkArea(i));
    row.appendChild(makeButtonArea(i));
    taskListDiv.appendChild(row);
  }
}

// ---------- Updating the page ----------

// Shows a short message at the bottom of the screen for a few seconds
function showMessage(text) {
  var box = document.getElementById("message");
  box.textContent = text;
  box.style.display = "block";
  clearTimeout(messageTimer);
  messageTimer = setTimeout(function () {
    box.style.display = "none";
  }, 2500);
}

// Shows a row that has not been bought yet: greyed out with only an Unlock button
function showLockedRow(i) {
  var cost = taskList[i].unlockCost;
  document.getElementById("row-" + i).className = "task-row locked";
  document.getElementById("name-" + i).textContent = taskList[i].name;
  document.getElementById("status-" + i).textContent = "Locked";
  document.getElementById("bar-outer-" + i).style.display = "none";

  var unlockButton = document.getElementById("unlock-" + i);
  unlockButton.style.display = "block";
  unlockButton.textContent = "Unlock " + formatMoney(cost);
  unlockButton.disabled = gameState.money < cost;
  document.getElementById("level-" + i).style.display = "none";
}

// Shows a row that is unlocked: level, progress bar, payout and Level Up button
function showUnlockedRow(i) {
  var task = gameState.tasks[i];
  var time = getTaskTime(i);
  var payText = formatMoney(getPayout(i)) + " every " + time + "s";

  document.getElementById("name-" + i).textContent = taskList[i].name + "  Lv " + task.level;
  document.getElementById("bar-outer-" + i).style.display = "block";
  document.getElementById("unlock-" + i).style.display = "none";

  var percent = 0;
  if (task.running) {
    percent = (Date.now() - task.startTime) / 1000 / time * 100;
    if (percent > 100) {
      percent = 100;
    }
    document.getElementById("row-" + i).className = "task-row working";
    document.getElementById("status-" + i).textContent = "Working... " + payText;
  } else {
    document.getElementById("row-" + i).className = "task-row ready";
    document.getElementById("status-" + i).textContent = "Click to start: " + payText;
  }
  document.getElementById("bar-" + i).style.width = percent + "%";

  var levelButton = document.getElementById("level-" + i);
  levelButton.style.display = "block";
  levelButton.textContent = "Level Up " + formatMoney(getLevelCost(i));
  levelButton.disabled = gameState.money < getLevelCost(i);
}

// Redraws the money and every task row
function updateScreen() {
  document.getElementById("money-display").textContent = formatMoney(gameState.money);
  document.getElementById("investor-display").textContent = "Investors: " + gameState.investors;
  for (var i = 0; i < taskList.length; i++) {
    if (gameState.tasks[i].unlocked) {
      showUnlockedRow(i);
    } else {
      showLockedRow(i);
    }
  }
}

// ---------- Starting the game ----------

// Loads the save, builds the page and starts the timers
function startGame() {
  loadGame();
  buildTaskRows();
  updateScreen();
  setInterval(gameTick, 100);
  setInterval(saveGame, 10000);
  window.onbeforeunload = saveGame;
}

startGame();
