// The name the save is stored under in localStorage
var saveName = "startUpSave";

// Everything that changes while playing is kept in this one object
var gameState = null;

// Makes a brand new game: $0 and only the first task unlocked
function makeNewGame() {
  var newGame = {
    money: 0,
    totalEarned: 0,
    tasksCompleted: 0,
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
  }
}

// Deletes the save and starts over, after asking the player first
function resetGame() {
  if (confirm("Delete your save and start over? This cannot be undone.")) {
    localStorage.removeItem(saveName);
    gameState = makeNewGame();
    updateScreen();
    showMessage("Game reset");
  }
}
