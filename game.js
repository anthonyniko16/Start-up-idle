// The achievements the player can earn
var achievementList = [
  { id: "firstPaycheck", name: "First Paycheck", description: "Get paid for the first time" },
  { id: "smallBusiness", name: "Small Business", description: "Earn $1,000 in total" },
  { id: "firstHire", name: "First Hire", description: "Hire any character" },
  { id: "level10", name: "Level 10", description: "Get any task to level 10" },
  { id: "fullOffice", name: "Full Office", description: "Unlock all five tasks" },
  { id: "fullyAutomated", name: "Fully Automated", description: "Hire all five characters" }
];

// DEBUG: counts game ticks so the console log only prints once a second
var tickCount = 0;

// Remembers which sprite each row is showing, so it is only redrawn when it changes
var lastSprite = [];

// Random events. These are not saved, so a reload ends any event.
var eventType = "";        // "", "meeting" or "outage"
var eventEndTime = 0;      // when the meeting offer or the outage runs out
var outageStartTime = 0;   // when the current outage started
var boostEndTime = 0;      // payouts are doubled until this time
var nextEventTime = Date.now() + randomEventDelay();

// Used to play beeps. It is made the first time a sound plays.
var audioContext = null;

// How much money earned in one run you need before you can pivot
var pivotGoal = 1000000;

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

// The payout multiplier: +10% for each investor point, and x2 during an investor meeting boost
function getBonus() {
  var bonus = 1 + 0.1 * gameState.investors;
  if (Date.now() < boostEndTime) {
    bonus = bonus * 2;
  }
  return bonus;
}

// How much one run of a task pays at its current level
function getPayout(i) {
  // the + 0.001 stops a number like 10.999999 from being rounded down to 10
  return Math.floor(taskList[i].payout * gameState.tasks[i].level * getBonus() + 0.001);
}

// How many investor points the player would get for pivoting right now
function getPivotPoints() {
  return Math.floor(gameState.runEarned / pivotGoal);
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

// Adds money to the player, the total earned, and the money earned since the last pivot
function earnMoney(amount) {
  gameState.money = gameState.money + amount;
  gameState.totalEarned = gameState.totalEarned + amount;
  gameState.runEarned = gameState.runEarned + amount;
}

// Starts a task when the player clicks it (only if it is unlocked and not running)
function clickTask(i) {
  var task = gameState.tasks[i];
  if (isOutage()) {
    showMessage("The servers are down! Click Fix It first.");
    return;
  }
  if (task.unlocked && !task.running) {
    task.running = true;
    task.startTime = Date.now();
    console.log("DEBUG clickTask: " + taskList[i].name + " started, running = " + task.running + ", startTime = " + task.startTime);
    updateScreen();
  } else {
    console.log("DEBUG clickTask: " + taskList[i].name + " not started (unlocked = " + task.unlocked + ", running = " + task.running + ")");
  }
}

// Buys a locked task so it can be used
function unlockTask(i) {
  var cost = taskList[i].unlockCost;
  if (!gameState.tasks[i].unlocked && gameState.money >= cost) {
    gameState.money = gameState.money - cost;
    gameState.tasks[i].unlocked = true;
    gameState.tasks[i].level = 1;
    playSound("buy");
    updateScreen();
  }
}

// Buys one level for a task
function levelUpTask(i) {
  var cost = getLevelCost(i);
  if (gameState.tasks[i].unlocked && gameState.money >= cost) {
    gameState.money = gameState.money - cost;
    gameState.tasks[i].level = gameState.tasks[i].level + 1;
    playSound("buy");
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
    // checkTask() starts a hired task on the next tick if it isn't running
    playSound("buy");
    showMessage("You hired the " + taskList[i].character + "!");
    updateScreen();
  }
}

// Starts over with investor points: money, levels, unlocks and hires reset,
// but achievements, investors and stats are kept
function pivot() {
  var points = getPivotPoints();
  if (points < 1) {
    return;
  }
  var question = "Pivot the company? You get " + points + " investor point(s) (+10% payouts each). " +
    "Your money, levels, unlocks and hires go back to the start.";
  if (!confirm(question)) {
    return;
  }
  gameState.investors = gameState.investors + points;
  gameState.money = 0;
  gameState.runEarned = 0;
  gameState.tasks = makeNewGame().tasks;
  playSound("buy");
  showMessage("Pivoted! You now have " + gameState.investors + " investor points.");
  saveGame();
  updateScreen();
}

// Turns sound on or off
function toggleSound() {
  gameState.soundOn = !gameState.soundOn;
  updateScreen();
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
  if (isOutage()) {
    return;
  }
  if (task.hired && !task.running) {
    task.running = true;
    task.startTime = Date.now();
  }
  if (!task.running) {
    return;
  }
  var time = getTaskTime(i);
  var secondsPassed = (Date.now() - task.startTime) / 1000;
  if (tickCount % 10 == 0) {
    console.log("DEBUG tick: " + taskList[i].name + " running, " + secondsPassed.toFixed(1) + " of " + time + " seconds");
  }
  if (secondsPassed < time) {
    return;
  }
  if (task.hired) {
    var runs = Math.floor(secondsPassed / time);
    earnMoney(getPayout(i) * runs);
    gameState.tasksCompleted = gameState.tasksCompleted + runs;
    task.startTime = task.startTime + runs * time * 1000;
    console.log("DEBUG payout: " + taskList[i].name + " paid " + formatMoney(getPayout(i) * runs) + " for " + runs + " run(s), restarting by itself");
    playSound("payout");
  } else {
    earnMoney(getPayout(i));
    gameState.tasksCompleted = gameState.tasksCompleted + 1;
    task.running = false;
    console.log("DEBUG payout: " + taskList[i].name + " paid " + formatMoney(getPayout(i)) + ", stopped and waiting for a click");
    playSound("payout");
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

// Runs 10 times a second: checks events, every task and achievements, then redraws the screen
function gameTick() {
  tickCount = tickCount + 1;
  checkEvents();
  for (var i = 0; i < taskList.length; i++) {
    checkTask(i);
  }
  checkAchievements();
  updateScreen();
}

// ---------- Random events ----------

// Picks a random wait between 60 and 120 seconds (in milliseconds)
function randomEventDelay() {
  return (60 + Math.random() * 60) * 1000;
}

// Returns true while a server outage is pausing the tasks
function isOutage() {
  return eventType == "outage";
}

// Starts an Investor Meeting or a Server Outage (50/50 chance)
function startRandomEvent() {
  var now = Date.now();
  if (Math.random() < 0.5) {
    eventType = "meeting";
    eventEndTime = now + 15000;
  } else {
    eventType = "outage";
    outageStartTime = now;
    eventEndTime = now + 10000;
  }
  nextEventTime = now + randomEventDelay();
  playSound("event");
}

// Ends a server outage. Running tasks get the paused time back so they don't jump ahead.
function endOutage() {
  var pausedTime = Date.now() - outageStartTime;
  for (var i = 0; i < taskList.length; i++) {
    if (gameState.tasks[i].running) {
      gameState.tasks[i].startTime = gameState.tasks[i].startTime + pausedTime;
    }
  }
  eventType = "";
}

// Starts a new event when it's time, and ends events that ran out
function checkEvents() {
  var now = Date.now();
  // events only start while the player is looking at the page
  if (eventType == "" && now >= nextEventTime && !document.hidden) {
    startRandomEvent();
  }
  if (eventType == "meeting" && now >= eventEndTime) {
    eventType = "";
    showMessage("You missed the investor meeting.");
  }
  if (eventType == "outage" && now >= eventEndTime) {
    endOutage();
    showMessage("The servers are back up.");
  }
}

// Runs when the button on the event banner is clicked
function clickEventButton() {
  if (eventType == "meeting") {
    eventType = "";
    boostEndTime = Date.now() + 30000;
    playSound("buy");
    showMessage("The investors loved it! Payouts x2 for 30 seconds.");
  } else if (eventType == "outage") {
    endOutage();
    playSound("buy");
    showMessage("Fixed it! Back to work.");
  }
  updateScreen();
}

// Ends any event and boost (used by Reset)
function clearEvents() {
  if (isOutage()) {
    endOutage();
  }
  eventType = "";
  boostEndTime = 0;
  nextEventTime = Date.now() + randomEventDelay();
}

// ---------- Sound ----------

// Plays one short beep. frequency is the pitch in Hz and seconds is how long it lasts.
function playBeep(frequency, seconds) {
  if (typeof AudioContext == "undefined") {
    return;
  }
  if (audioContext == null) {
    audioContext = new AudioContext();
  }
  var oscillator = audioContext.createOscillator();
  var volume = audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  volume.gain.value = 0.05;
  oscillator.connect(volume);
  volume.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + seconds);
}

// Plays the sound for "payout", "buy" or "event" (unless sound is turned off)
function playSound(name) {
  if (!gameState.soundOn) {
    return;
  }
  if (name == "payout") {
    playBeep(880, 0.08);
  } else if (name == "buy") {
    playBeep(520, 0.12);
  } else if (name == "event") {
    playBeep(330, 0.3);
  }
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
  addPanelLine("Investor points: " + gameState.investors + " (payouts x" + (1 + 0.1 * gameState.investors).toFixed(1) + ")", "");
  addPanelLine("Earned since last pivot: " + formatMoney(gameState.runEarned), "");
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
  if (task.running && !isOutage()) {
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

  if (isOutage() && task.running) {
    row.className = "task-row paused";
    status.textContent = "Paused: server outage!";
  } else if (task.hired) {
    row.className = "task-row auto";
    status.textContent = "Auto (" + taskList[i].character + "): " + payText;
  } else if (task.running) {
    row.className = "task-row working";
    status.textContent = "Working... " + payText;
  } else {
    row.className = "task-row ready";
    status.textContent = "Click to start: " + payText;
  }

  // during an outage the bar stays where it was when the outage started
  var now = Date.now();
  if (isOutage()) {
    now = outageStartTime;
  }
  var percent = 0;
  if (task.running) {
    percent = (now - task.startTime) / 1000 / time * 100;
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

// Shows the event banner with the right text and button, or hides it
function updateEventBanner() {
  var banner = document.getElementById("event-banner");
  var text = document.getElementById("event-text");
  var button = document.getElementById("event-button");
  var now = Date.now();
  banner.style.display = "block";
  button.style.display = "inline-block";
  if (eventType == "meeting") {
    banner.className = "meeting";
    text.textContent = "Investor Meeting! Take it in " + Math.ceil((eventEndTime - now) / 1000) + "s to double all payouts for 30s.";
    button.textContent = "Take Meeting";
  } else if (eventType == "outage") {
    banner.className = "outage";
    text.textContent = "Server Outage! All tasks are paused for " + Math.ceil((eventEndTime - now) / 1000) + "s.";
    button.textContent = "Fix It";
  } else if (now < boostEndTime) {
    banner.className = "meeting";
    text.textContent = "Payouts x2! " + Math.ceil((boostEndTime - now) / 1000) + "s left.";
    button.style.display = "none";
  } else {
    banner.style.display = "none";
  }
}

// Shows the Pivot button (with how many points it gives) once the player has earned enough
function updatePivotButton() {
  var pivotButton = document.getElementById("pivot-button");
  var points = getPivotPoints();
  if (points >= 1) {
    pivotButton.style.display = "inline-block";
    pivotButton.textContent = "Pivot: +" + points + " investors";
  } else {
    pivotButton.style.display = "none";
  }
}

// Redraws the top bar, the event banner and every task row
function updateScreen() {
  document.getElementById("money-display").textContent = formatMoney(gameState.money);
  document.getElementById("investor-display").textContent = "Investors: " + gameState.investors + " (+" + gameState.investors * 10 + "%)";
  updatePivotButton();
  updateEventBanner();
  if (gameState.soundOn) {
    document.getElementById("sound-button").textContent = "Sound: On";
  } else {
    document.getElementById("sound-button").textContent = "Sound: Off";
  }
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

// Checks that the other script files loaded. If one is missing, shows a warning on the page.
function checkFilesLoaded() {
  var missing = "";
  if (typeof taskList == "undefined") {
    missing = missing + " tasks.js";
  }
  if (typeof drawSprite == "undefined") {
    missing = missing + " sprites.js";
  }
  if (typeof loadGame == "undefined") {
    missing = missing + " save.js";
  }
  if (missing == "") {
    return true;
  }
  var errorBox = document.getElementById("error-box");
  errorBox.textContent = "The game can't start because these files did not load:" + missing +
    ". Check that they are in the same folder as index.html and that the names match the script tags.";
  errorBox.style.display = "block";
  return false;
}

// Loads the save, builds the page and starts the timers
function startGame() {
  if (!checkFilesLoaded()) {
    return;
  }
  loadGame();
  buildTaskRows();
  setInterval(gameTick, 100);
  setInterval(saveGame, 10000);
  window.onbeforeunload = saveGame;
  console.log("DEBUG startGame: game loaded and the 100 ms tick timer is running");
  updateScreen();
}

startGame();
