// The name the save is stored under in localStorage
var saveName = "startUpSave";

// The most time away that still earns money (8 hours, in seconds)
var maxOfflineSeconds = 8 * 60 * 60;

// Everything that changes while playing is kept in this one object
var gameState = null;

// Makes a brand new game: $0 and only the first task unlocked
function makeNewGame() {
  var newGame = {
    money: 0,
    totalEarned: 0,
    tasksCompleted: 0,
    runEarned: 0,
    soundOn: true,
    tasks: [],
    achievements: {},
    investors: 0,
    lastSaved: Date.now()
  };
  for (var i = 0; i < taskList.length; i++) {
    newGame.tasks.push({ level: 1, unlocked: false, hired: false, running: false, startTime: 0 });
  }
  newGame.tasks[0].unlocked = true;
  return newGame;
}

// Saves the game to localStorage as JSON text
function saveGame() {
  gameState.lastSaved = Date.now();
  localStorage.setItem(saveName, JSON.stringify(gameState));
}

// Loads the saved game, or starts a new game if there is no save
function loadGame() {
  var savedText = localStorage.getItem(saveName);
  if (savedText == null) {
    gameState = makeNewGame();
    return;
  }
  try {
    gameState = JSON.parse(savedText);
  } catch (error) {
    // the save was broken, so start over
    gameState = makeNewGame();
    return;
  }
  fixMissingData();
  applyOfflineProgress();
}

// Fills in anything an older save is missing (for example after adding a new feature)
function fixMissingData() {
  var newGame = makeNewGame();
  for (var key in newGame) {
    if (gameState[key] === undefined) {
      gameState[key] = newGame[key];
    }
  }
  for (var i = 0; i < taskList.length; i++) {
    if (gameState.tasks[i] === undefined) {
      gameState.tasks.push(newGame.tasks[i]);
    }
    fixTaskData(gameState.tasks[i]);
  }
  if (typeof gameState.money != "number" || isNaN(gameState.money)) {
    gameState.money = 0;
  }
  gameState.tasks[0].unlocked = true;
}

// Repairs one task from a save so a bad value can't leave it stuck
function fixTaskData(task) {
  if (typeof task.level != "number" || isNaN(task.level) || task.level < 1) {
    task.level = 1;
  }
  task.unlocked = task.unlocked == true;
  task.hired = task.hired == true;
  task.running = task.running == true;
  if (typeof task.startTime != "number" || isNaN(task.startTime)) {
    // a running task with no real start time starts its run over now
    task.startTime = Date.now();
  }
}

// Works out how much one task earned while the player was away
function getOfflineEarnings(i, secondsAway) {
  var task = gameState.tasks[i];
  var now = Date.now();
  if (task.startTime > now) {
    // the computer's clock went backwards, so start this run over
    task.startTime = now;
  }
  if (task.hired) {
    var runs = Math.floor(secondsAway / getTaskTime(i));
    if (runs > 0) {
      // only restart the timer if a run finished, so a quick reload keeps the progress
      gameState.tasksCompleted = gameState.tasksCompleted + runs;
      task.startTime = now;
    }
    task.running = true;
    return runs * getPayout(i);
  }
  if (task.running && (now - task.startTime) / 1000 >= getTaskTime(i)) {
    // a task started by hand finishes once and then waits for a click
    gameState.tasksCompleted = gameState.tasksCompleted + 1;
    task.running = false;
    return getPayout(i);
  }
  return 0;
}

// Pays the player for the time since the last save and shows a welcome back message
function applyOfflineProgress() {
  var secondsAway = (Date.now() - gameState.lastSaved) / 1000;
  if (secondsAway < 0) {
    secondsAway = 0;
  }
  if (secondsAway > maxOfflineSeconds) {
    secondsAway = maxOfflineSeconds;
  }
  var earned = 0;
  for (var i = 0; i < taskList.length; i++) {
    earned = earned + getOfflineEarnings(i, secondsAway);
  }
  if (earned > 0) {
    earnMoney(earned);
    showWelcomeBack(earned, secondsAway);
  }
}

// Deletes the save and starts over, after asking the player first
function resetGame() {
  if (confirm("Delete your save and start over? This cannot be undone.")) {
    localStorage.removeItem(saveName);
    gameState = makeNewGame();
    clearEvents();
    updateScreen();
    showMessage("Game reset");
  }
}
