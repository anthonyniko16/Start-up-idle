// The achievements the player can earn
var achievementList = [
  { id: "firstPaycheck", name: "First Paycheck", description: "Get paid for the first time" },
  { id: "smallBusiness", name: "Small Business", description: "Earn $1,000 in total" },
  { id: "firstHire", name: "First Hire", description: "Hire any character" },
  { id: "level10", name: "Level 10", description: "Get any task to level 10" },
  { id: "fullOffice", name: "Full Office", description: "Unlock all five tasks" },
  { id: "fullyAutomated", name: "Fully Automated", description: "Hire all five characters" }
];

// Remembers which sprite each row is showing, so it is only redrawn when it changes
var lastSprite = [];

// ---------- Numbers and formulas ----------

// How many seconds one run of a task takes (cut in half at each speed milestone, never under 1)
function getTaskTime(i) {
  var level = gameState.tasks[i].level;
  var milestonesReached = 0;
  for (var m = 0; m < speedMilestones.length; m++) {
    if (level >= speedMilestones[m]) {
      milestonesReached = milestonesReached + 1;
    }
  }
  return Math.max(1, taskList[i].time * Math.pow(0.5, milestonesReached));
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

// Turns a number of seconds into text like 2h 5m, 3m 10s or 45s
function formatTime(seconds) {
  seconds = Math.floor(seconds);
  var hours = Math.floor(seconds / 3600);
  var minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return hours + "h " + minutes + "m";
  }
  if (minutes > 0) {
    return minutes + "m " + (seconds % 60) + "s";
  }
  return seconds + "s";
}

// Counts how many tasks are unlocked
function countUnlocked() {
  var count = 0;
  for (var i = 0; i < taskList.length; i++) {
    if (gameState.tasks[i].unlocked) {
      count = count + 1;
    }
  }
  return count;
}

// Counts how many characters have been hired
function countHired() {
  var count = 0;
  for (var i = 0; i < taskList.length; i++) {
    if (gameState.tasks[i].hired) {
      count = count + 1;
    }
  }
  return count;
}

// Finds the highest level of any unlocked task
function getHighestLevel() {
  var highest = 0;
  for (var i = 0; i < taskList.length; i++) {
    if (gameState.tasks[i].unlocked && gameState.tasks[i].level > highest) {
      highest = gameState.tasks[i].level;
    }
  }
  return highest;
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

// Hires the character for a task, who then runs it automatically forever
function hireTask(i) {
  var cost = taskList[i].hireCost;
  var task = gameState.tasks[i];
  if (task.unlocked && !task.hired && gameState.money >= cost) {
    gameState.money = gameState.money - cost;
    task.hired = true;
    if (!task.running) {
      task.running = true;
      task.startTime = Date.now();
    }
    showMessage("You hired the " + taskList[i].character + "!");
    updateScreen();
  }
}

// Saves when the Save button is clicked and tells the player
function clickSave() {
  saveGame();
  showMessage("Game saved");
}

// ---------- The game loop ----------

// Checks one task and pays the player if its timer is done.
// A hired task can finish several runs at once if the tab was in the background.
function checkTask(i) {
  var task = gameState.tasks[i];
  if (task.hired && !task.running) {
    task.running = true;
    task.startTime = Date.now();
  }
  if (!task.running) {
    return;
  }
  var time = getTaskTime(i);
  var secondsPassed = (Date.now() - task.startTime) / 1000;
  if (secondsPassed < time) {
    return;
  }
  if (task.hired) {
    var runs = Math.floor(secondsPassed / time);
    earnMoney(getPayout(i) * runs);
    gameState.tasksCompleted = gameState.tasksCompleted + runs;
    task.startTime = task.startTime + runs * time * 1000;
  } else {
    earnMoney(getPayout(i));
    gameState.tasksCompleted = gameState.tasksCompleted + 1;
    task.running = false;
  }
}

// Returns true if the player has reached the goal for an achievement
function isAchievementDone(id) {
  if (id == "firstPaycheck") {
    return gameState.tasksCompleted >= 1;
  }
  if (id == "smallBusiness") {
    return gameState.totalEarned >= 1000;
  }
  if (id == "firstHire") {
    return countHired() >= 1;
  }
  if (id == "level10") {
    return getHighestLevel() >= 10;
  }
  if (id == "fullOffice") {
    return countUnlocked() == taskList.length;
  }
  if (id == "fullyAutomated") {
    return countHired() == taskList.length;
  }
  return false;
}

// Gives the player any achievements they have just earned
function checkAchievements() {
  for (var a = 0; a < achievementList.length; a++) {
    var id = achievementList[a].id;
    if (!gameState.achievements[id] && isAchievementDone(id)) {
      gameState.achievements[id] = true;
      showMessage("Achievement: " + achievementList[a].name);
    }
  }
}

// Runs 10 times a second: checks every task and achievement, then redraws the screen
function gameTick() {
  for (var i = 0; i < taskList.length; i++) {
    checkTask(i);
  }
  checkAchievements();
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

// Makes the small 16 by 16 canvas that a character is drawn on
function makeCharacterCanvas(i) {
  var canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  canvas.className = "character";
  canvas.id = "character-" + i;
  return canvas;
}

// Makes the clickable part of a row: character, name, progress bar and status
function makeWorkArea(i) {
  var workArea = makeDiv("work-area", "work-" + i);
  workArea.onclick = function () {
    clickTask(i);
  };
  workArea.appendChild(makeCharacterCanvas(i));

  var info = makeDiv("task-info", "info-" + i);
  info.appendChild(makeDiv("task-name", "name-" + i));
  var barOuter = makeDiv("progress-outer", "bar-outer-" + i);
  barOuter.appendChild(makeDiv("progress-inner", "bar-" + i));
  info.appendChild(barOuter);
  info.appendChild(makeDiv("task-status", "status-" + i));
  workArea.appendChild(info);
  return workArea;
}

// Makes the Unlock, Level Up and Hire buttons for a row
function makeButtonArea(i) {
  var buttonArea = makeDiv("task-buttons", "buttons-" + i);
  buttonArea.appendChild(makeButton("unlock-" + i, function () {
    unlockTask(i);
  }));
  buttonArea.appendChild(makeButton("level-" + i, function () {
    levelUpTask(i);
  }));
  buttonArea.appendChild(makeButton("hire-" + i, function () {
    hireTask(i);
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

// ---------- Popups and messages ----------

// Shows a short message at the bottom of the screen that goes away after 3 seconds
function showMessage(text) {
  var line = document.createElement("div");
  line.className = "message";
  line.textContent = text;
  document.getElementById("message-area").appendChild(line);
  setTimeout(function () {
    line.remove();
  }, 3000);
}

// Shows the welcome back popup with the money earned while away
function showWelcomeBack(earned, secondsAway) {
  var text = "You were away for " + formatTime(secondsAway) + ". ";
  if (secondsAway >= maxOfflineSeconds) {
    text = "You were away for 8 hours or more (the most that counts). ";
  }
  text = text + "Your company earned " + formatMoney(earned) + " while you were gone.";
  document.getElementById("welcome-text").textContent = text;
  document.getElementById("welcome-popup").style.display = "block";
}

// Hides the welcome back popup
function closeWelcomeBack() {
  document.getElementById("welcome-popup").style.display = "none";
}

// Adds one line of text to the Stats/Achievements popup
function addPanelLine(text, className) {
  var line = document.createElement("p");
  line.textContent = text;
  line.className = className;
  document.getElementById("panel-content").appendChild(line);
}

// Clears the popup, sets its title and shows it
function openPanel(title) {
  document.getElementById("panel-title").textContent = title;
  document.getElementById("panel-content").textContent = "";
  document.getElementById("panel-popup").style.display = "block";
}

// Hides the Stats/Achievements popup
function closePanel() {
  document.getElementById("panel-popup").style.display = "none";
}

// Opens the popup with the player's stats
function showStats() {
  openPanel("Stats");
  addPanelLine("Total earned: " + formatMoney(gameState.totalEarned), "");
  addPanelLine("Tasks completed: " + gameState.tasksCompleted.toLocaleString("en-US"), "");
  addPanelLine("Characters hired: " + countHired() + " / " + taskList.length, "");
  addPanelLine("Highest level: " + getHighestLevel(), "");
}

// Opens the popup with the list of achievements
function showAchievements() {
  openPanel("Achievements");
  for (var a = 0; a < achievementList.length; a++) {
    var achievement = achievementList[a];
    if (gameState.achievements[achievement.id]) {
      addPanelLine("[X] " + achievement.name + " - " + achievement.description, "done");
    } else {
      addPanelLine("[ ] " + achievement.name + " - " + achievement.description, "not-done");
    }
  }
}

// ---------- Updating the page ----------

// Draws the right character and animation frame for a row (only when it changed)
function updateSprite(i) {
  var task = gameState.tasks[i];
  var characterName = "Founder";
  if (task.hired) {
    characterName = taskList[i].character;
  }
  var frameNumber = 1;
  if (task.running) {
    // switches between frame 1 and 2 every 300 milliseconds
    frameNumber = Math.floor(Date.now() / 300) % 2 + 1;
  }
  var spriteName = characterName + frameNumber;
  if (lastSprite[i] != spriteName) {
    drawSprite(document.getElementById("character-" + i), characterName, frameNumber);
    lastSprite[i] = spriteName;
  }
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
  document.getElementById("hire-" + i).style.display = "none";
}

// Sets the row's look (ready, working or auto), its status text and progress bar
function showRowState(i) {
  var task = gameState.tasks[i];
  var time = getTaskTime(i);
  var payText = formatMoney(getPayout(i)) + " every " + time + "s";
  var row = document.getElementById("row-" + i);
  var status = document.getElementById("status-" + i);

  if (task.hired) {
    row.className = "task-row auto";
    status.textContent = "Auto (" + taskList[i].character + "): " + payText;
  } else if (task.running) {
    row.className = "task-row working";
    status.textContent = "Working... " + payText;
  } else {
    row.className = "task-row ready";
    status.textContent = "Click to start: " + payText;
  }

  var percent = 0;
  if (task.running) {
    percent = (Date.now() - task.startTime) / 1000 / time * 100;
    if (percent > 100) {
      percent = 100;
    }
  }
  document.getElementById("bar-" + i).style.width = percent + "%";
}

// Shows the Level Up and Hire buttons with their costs (greyed out if too expensive)
function showRowButtons(i) {
  var levelCost = getLevelCost(i);
  var levelButton = document.getElementById("level-" + i);
  levelButton.style.display = "block";
  levelButton.textContent = "Level Up " + formatMoney(levelCost);
  levelButton.disabled = gameState.money < levelCost;

  var hireCost = taskList[i].hireCost;
  var hireButton = document.getElementById("hire-" + i);
  if (gameState.tasks[i].hired) {
    hireButton.style.display = "none";
  } else {
    hireButton.style.display = "block";
    hireButton.textContent = "Hire " + taskList[i].character + " " + formatMoney(hireCost);
    hireButton.disabled = gameState.money < hireCost;
  }
}

// Shows a row that is unlocked
function showUnlockedRow(i) {
  document.getElementById("name-" + i).textContent = taskList[i].name + "  Lv " + gameState.tasks[i].level;
  document.getElementById("bar-outer-" + i).style.display = "block";
  document.getElementById("unlock-" + i).style.display = "none";
  showRowState(i);
  showRowButtons(i);
}

// Redraws the money, investors and every task row
function updateScreen() {
  document.getElementById("money-display").textContent = formatMoney(gameState.money);
  document.getElementById("investor-display").textContent = "Investors: " + gameState.investors;
  for (var i = 0; i < taskList.length; i++) {
    if (gameState.tasks[i].unlocked) {
      showUnlockedRow(i);
    } else {
      showLockedRow(i);
    }
    updateSprite(i);
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
