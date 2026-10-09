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

// Remembers which sprite each canvas is showing, so it is only redrawn when it changes
var lastSprite = {};

// Random events. These are not saved, so a reload ends a meeting, an outage or a boost.
var eventType = "";            // "", "meeting" or "outage"
var eventStartTime = 0;        // when the current meeting offer or outage started
var eventEndTime = 0;          // when the meeting offer or outage runs out
var meetingBoostEndTime = 0;   // payouts are x2 until this time
var securityBoostEndTime = 0;  // payouts are x1.5 until this time
var nextEventTime = Date.now() + randomEventDelay();

// Event lengths in seconds
var meetingOfferSeconds = 15;
var meetingBoostSeconds = 30;
var outageMaxSeconds = 30;
var breachBaseSeconds = 30;
var securityBoostSeconds = 60;

// The hacker breach. gameState.breachActive is saved so a reload can't escape it.
var breachEndTime = 0;         // 0 means the breach timer is not running
var breachTotalSeconds = 0;    // how long the timer was at the start (for the bar)
var problemsLeft = 0;
var problemAnswer = 0;

// Used to play beeps. It is made the first time a sound plays.
var audioContext = null;

// How much money earned in one run you need before you can pivot
var pivotGoal = 1000000;

// ---------- Small helpers for changing the page ----------
// They only change the page if the value is different. Rewriting the same text
// 10 times a second can make the browser lose clicks (see dev-notes.md).

// Sets the text of an element
function setText(id, text) {
  var element = document.getElementById(id);
  if (element.textContent != text) {
    element.textContent = text;
  }
}

// Sets the CSS class of an element
function setClass(id, className) {
  var element = document.getElementById(id);
  if (element.className != className) {
    element.className = className;
  }
}

// Shows or hides an element
function setShown(id, isShown) {
  var element = document.getElementById(id);
  var display = "none";
  if (isShown) {
    display = "block";
  }
  if (element.style.display != display) {
    element.style.display = display;
  }
}

// Greys out a button or makes it clickable
function setDisabled(id, isDisabled) {
  var element = document.getElementById(id);
  if (element.disabled != isDisabled) {
    element.disabled = isDisabled;
  }
}

// Sets how full a bar is (0 to 100)
function setBarWidth(id, percent) {
  if (percent < 0) {
    percent = 0;
  }
  if (percent > 100) {
    percent = 100;
  }
  var element = document.getElementById(id);
  var width = percent + "%";
  if (element.style.width != width) {
    element.style.width = width;
  }
}

// Draws a character on a canvas, but only if it isn't already showing that frame
function showSprite(canvasId, characterName, frameNumber) {
  var spriteName = characterName + frameNumber;
  if (lastSprite[canvasId] != spriteName) {
    drawSprite(document.getElementById(canvasId), characterName, frameNumber);
    lastSprite[canvasId] = spriteName;
  }
}

// The typing frame (1 or 2) for a character that is working. It switches every 300 ms.
function getTypingFrame() {
  return Math.floor(Date.now() / 300) % 2 + 1;
}

// ---------- Numbers and formulas ----------

// How many seconds one run of a task takes.
// Cut in half at each speed milestone, 4% shorter every 5 levels, never under 1 second.
function getTaskTime(i) {
  var level = gameState.tasks[i].level;
  var halvings = 0;
  for (var m = 0; m < speedMilestones.length; m++) {
    if (level >= speedMilestones[m]) {
      halvings = halvings + 1;
    }
  }
  var time = taskList[i].time * Math.pow(0.5, halvings) * Math.pow(fiveLevelSpeedUp, Math.floor(level / 5));
  return Math.max(1, time);
}

// Turns seconds into text with at most 2 decimals, like 10s, 9.6s or 4.61s
function formatSeconds(seconds) {
  return Math.round(seconds * 100) / 100 + "s";
}

// The multiplier from events: x2 during an investor meeting boost, x1.5 during a security boost
function getEventBonus() {
  var bonus = 1;
  if (Date.now() < meetingBoostEndTime) {
    bonus = bonus * 2;
  }
  if (Date.now() < securityBoostEndTime) {
    bonus = bonus * 1.5;
  }
  return bonus;
}

// The payout multiplier: +10% for each investor point, times the event bonus
function getBonus() {
  return (1 + 0.1 * gameState.investors) * getEventBonus();
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

// A team member's level, or 0 if they are not hired (t is 0 for IT Support, 1 for Cybersecurity)
function getTeamLevel(t) {
  if (!gameState.team[t].hired) {
    return 0;
  }
  return gameState.team[t].level;
}

// The cost to go from a team member's current level to the next level
function getTeamLevelCost(t) {
  return Math.floor(teamList[t].levelCostBase * Math.pow(1.15, gameState.team[t].level) + 0.001);
}

// How many seconds a server outage lasts (shorter with IT Support, never under 3)
function getOutageSeconds() {
  var itLevel = getTeamLevel(0);
  if (itLevel == 0) {
    return outageMaxSeconds;
  }
  return Math.max(3, outageMaxSeconds * Math.pow(0.85, itLevel));
}

// How many seconds the player gets to beat a hacker (3 more per Cybersecurity level)
function getBreachSeconds() {
  return breachBaseSeconds + 3 * getTeamLevel(1);
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

// Counts how many task characters have been hired
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
    showMessage("The servers are down! Tasks are paused.");
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

// Hires a team member (IT Support or Cybersecurity) at level 1
function hireTeam(t) {
  var cost = teamList[t].hireCost;
  if (!gameState.team[t].hired && gameState.money >= cost) {
    gameState.money = gameState.money - cost;
    gameState.team[t].hired = true;
    gameState.team[t].level = 1;
    playSound("buy");
    showMessage("You hired " + teamList[t].name + "!");
    updateScreen();
  }
}

// Buys one level for a team member (up to their max level)
function levelUpTeam(t) {
  var member = gameState.team[t];
  var cost = getTeamLevelCost(t);
  if (member.hired && member.level < teamList[t].maxLevel && gameState.money >= cost) {
    gameState.money = gameState.money - cost;
    member.level = member.level + 1;
    playSound("buy");
    updateScreen();
  }
}

// Resets money, tasks and the team to the start. Achievements, investors and stats are kept.
// Used by Pivot and by losing to a hacker.
function startOverRun() {
  var newGame = makeNewGame();
  gameState.money = 0;
  gameState.runEarned = 0;
  gameState.tasks = newGame.tasks;
  gameState.team = newGame.team;
}

// Starts over with investor points
function pivot() {
  var points = getPivotPoints();
  if (points < 1) {
    return;
  }
  var question = "Pivot the company? You get " + points + " investor point(s) (+10% payouts each). " +
    "Your money, levels, unlocks and hires (including your team) go back to the start.";
  if (!confirm(question)) {
    return;
  }
  gameState.investors = gameState.investors + points;
  startOverRun();
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

// Returns true while the hacker breach timer is running
function isBreachRunning() {
  return gameState.breachActive && breachEndTime > 0;
}

// Picks a random event. Outages and breaches only happen once enough money has been earned.
// When all three can happen: breach 20%, outage 40%, meeting 40%.
function startRandomEvent() {
  var roll = Math.random();
  if (gameState.totalEarned >= breachUnlockEarned && roll < 0.2) {
    startBreach();
  } else if (gameState.totalEarned >= outageUnlockEarned && roll < 0.6) {
    startOutage();
  } else {
    startMeeting();
  }
  nextEventTime = Date.now() + randomEventDelay();
}

// Starts an Investor Meeting offer (click it within 15 seconds)
function startMeeting() {
  eventType = "meeting";
  eventStartTime = Date.now();
  eventEndTime = eventStartTime + meetingOfferSeconds * 1000;
  playSound("event");
}

// Starts a Server Outage. All tasks pause until it ends.
function startOutage() {
  eventType = "outage";
  eventStartTime = Date.now();
  eventEndTime = eventStartTime + getOutageSeconds() * 1000;
  playSound("event");
}

// Ends a server outage. Running tasks get the paused time back so they continue where they were.
function endOutage() {
  var pausedTime = Date.now() - eventStartTime;
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
  // events only start while the player is looking at the page and no breach is going on
  if (eventType == "" && !gameState.breachActive && now >= nextEventTime && !document.hidden) {
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
  if (isBreachRunning() && now >= breachEndTime) {
    loseBreach();
  }
}

// Runs when the Take Meeting button is clicked
function clickEventButton() {
  if (eventType == "meeting") {
    eventType = "";
    meetingBoostEndTime = Date.now() + meetingBoostSeconds * 1000;
    playSound("buy");
    showMessage("The investors loved it! Payouts x2 for 30 seconds.");
    updateScreen();
  }
}

// Ends every event and boost (used by Reset)
function clearEvents() {
  if (isOutage()) {
    endOutage();
  }
  eventType = "";
  meetingBoostEndTime = 0;
  securityBoostEndTime = 0;
  breachEndTime = 0;
  nextEventTime = Date.now() + randomEventDelay();
  document.getElementById("breach-popup").style.display = "none";
  document.getElementById("lost-popup").style.display = "none";
}

// ---------- Hacker breach ----------

// Picks a random whole number from min to max (both included)
function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Makes a new random math problem, shows it, and remembers the answer
function newProblem() {
  var type = randomInt(1, 4);
  var a = 0;
  var b = 0;
  var text = "";
  if (type == 1) {
    a = randomInt(10, 99);
    b = randomInt(10, 99);
    text = a + " + " + b;
    problemAnswer = a + b;
  } else if (type == 2) {
    a = randomInt(30, 99);
    b = randomInt(10, a - 1);
    text = a + " - " + b;
    problemAnswer = a - b;
  } else if (type == 3) {
    a = randomInt(3, 9);
    b = randomInt(11, 25);
    text = a + " x " + b;
    problemAnswer = a * b;
  } else {
    // pick the answer first so the division always comes out even
    b = randomInt(3, 9);
    problemAnswer = randomInt(6, 20);
    a = b * problemAnswer;
    text = a + " / " + b;
  }
  setText("breach-problem", text + " = ?");
  document.getElementById("breach-answer").value = "";
}

// Starts a hacker breach: opens the popup and starts the timer
function startBreach() {
  gameState.breachActive = true;
  breachTotalSeconds = getBreachSeconds();
  breachEndTime = Date.now() + breachTotalSeconds * 1000;
  problemsLeft = 3;
  newProblem();
  setText("breach-feedback", "");
  document.getElementById("breach-popup").style.display = "block";
  document.getElementById("breach-answer").focus();
  playSound("event");
  // save right away so refreshing the page can't be used to escape
  saveGame();
  updateScreen();
}

// Checks the answer typed in the breach popup (Submit button or the Enter key)
function submitBreachAnswer() {
  if (!isBreachRunning()) {
    return;
  }
  var input = document.getElementById("breach-answer");
  var guess = parseInt(input.value, 10);
  if (isNaN(guess)) {
    setText("breach-feedback", "Type a number first.");
    input.focus();
    return;
  }
  if (guess == problemAnswer) {
    problemsLeft = problemsLeft - 1;
    if (problemsLeft == 0) {
      winBreach();
      return;
    }
    setText("breach-feedback", "Correct!");
    playSound("buy");
  } else {
    breachEndTime = breachEndTime - 3000;
    setText("breach-feedback", "Wrong! -3 seconds");
    playSound("event");
  }
  newProblem();
  input.focus();
  updateScreen();
}

// The player answered all 3 problems in time
function winBreach() {
  gameState.breachActive = false;
  breachEndTime = 0;
  document.getElementById("breach-popup").style.display = "none";
  showMessage("Hacker beaten!");
  if (gameState.team[1].hired) {
    securityBoostEndTime = Date.now() + securityBoostSeconds * 1000;
    showMessage("Security Boost! Payouts x1.5 for 60 seconds.");
  }
  playSound("buy");
  saveGame();
  updateScreen();
}

// The timer ran out (or the page was reloaded during a breach): show the "infiltrated" popup.
// gameState.breachActive stays true until the player clicks Start Over.
function loseBreach() {
  breachEndTime = 0;
  document.getElementById("breach-popup").style.display = "none";
  document.getElementById("lost-popup").style.display = "block";
  playSound("event");
}

// Runs when Start Over is clicked after losing to a hacker
function clickStartOver() {
  startOverRun();
  gameState.breachActive = false;
  document.getElementById("lost-popup").style.display = "none";
  saveGame();
  showMessage("Starting over. Investors, achievements and stats were kept.");
  updateScreen();
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

// ---------- Building the page (done once at the start) ----------

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

// Makes a small 16 by 16 canvas that a character is drawn on
function makeCharacterCanvas(id) {
  var canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  canvas.className = "character";
  canvas.id = id;
  return canvas;
}

// Makes the clickable part of a task row: character, name, progress bar and status
function makeWorkArea(i) {
  var workArea = makeDiv("work-area", "work-" + i);
  workArea.onclick = function () {
    clickTask(i);
  };
  workArea.appendChild(makeCharacterCanvas("character-" + i));

  var info = makeDiv("task-info", "info-" + i);
  info.appendChild(makeDiv("task-name", "name-" + i));
  var barOuter = makeDiv("progress-outer", "bar-outer-" + i);
  barOuter.appendChild(makeDiv("progress-inner", "bar-" + i));
  info.appendChild(barOuter);
  info.appendChild(makeDiv("task-status", "status-" + i));
  workArea.appendChild(info);
  return workArea;
}

// Makes the Unlock, Level Up and Hire buttons for a task row
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

// Creates one row of the Team section (IT Support or Cybersecurity)
function makeTeamRow(t) {
  var row = makeDiv("task-row", "team-row-" + t);
  var infoArea = makeDiv("team-area", "team-area-" + t);
  infoArea.appendChild(makeCharacterCanvas("team-character-" + t));
  var info = makeDiv("task-info", "team-info-" + t);
  info.appendChild(makeDiv("task-name", "team-name-" + t));
  info.appendChild(makeDiv("task-status", "team-status-" + t));
  infoArea.appendChild(info);
  row.appendChild(infoArea);

  var buttonArea = makeDiv("task-buttons", "team-buttons-" + t);
  buttonArea.appendChild(makeButton("team-hire-" + t, function () {
    hireTeam(t);
  }));
  buttonArea.appendChild(makeButton("team-level-" + t, function () {
    levelUpTeam(t);
  }));
  row.appendChild(buttonArea);
  return row;
}

// Creates the Team section rows, one for each member in tasks.js
function buildTeamRows() {
  var teamListDiv = document.getElementById("team-list");
  for (var t = 0; t < teamList.length; t++) {
    teamListDiv.appendChild(makeTeamRow(t));
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
  addPanelLine("IT Support level: " + getTeamLevel(0) + ", Cybersecurity level: " + getTeamLevel(1), "");
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

// ---------- Updating the page (10 times a second) ----------

// Draws the right character and animation frame for a task row
function updateSprite(i) {
  var task = gameState.tasks[i];
  var characterName = "Founder";
  if (task.hired) {
    characterName = taskList[i].character;
  }
  var frameNumber = 1;
  if (task.running && !isOutage()) {
    frameNumber = getTypingFrame();
  }
  showSprite("character-" + i, characterName, frameNumber);
}

// Shows a row that has not been bought yet: greyed out with only an Unlock button
function showLockedRow(i) {
  var cost = taskList[i].unlockCost;
  setClass("row-" + i, "task-row locked");
  setText("name-" + i, taskList[i].name);
  setText("status-" + i, "Locked");
  setShown("bar-outer-" + i, false);
  setShown("unlock-" + i, true);
  setText("unlock-" + i, "Unlock " + formatMoney(cost));
  setDisabled("unlock-" + i, gameState.money < cost);
  setShown("level-" + i, false);
  setShown("hire-" + i, false);
}

// Sets the row's look (ready, working, auto or paused), its status text and progress bar
function showRowState(i) {
  var task = gameState.tasks[i];
  var time = getTaskTime(i);
  var payText = formatMoney(getPayout(i)) + " every " + formatSeconds(time);

  if (isOutage() && task.running) {
    setClass("row-" + i, "task-row paused");
    setText("status-" + i, "Paused: server outage!");
  } else if (task.hired) {
    setClass("row-" + i, "task-row auto");
    setText("status-" + i, "Auto (" + taskList[i].character + "): " + payText);
  } else if (task.running) {
    setClass("row-" + i, "task-row working");
    setText("status-" + i, "Working... " + payText);
  } else {
    setClass("row-" + i, "task-row ready");
    setText("status-" + i, "Click to start: " + payText);
  }

  // during an outage the bar stays where it was when the outage started
  var now = Date.now();
  if (isOutage()) {
    now = eventStartTime;
  }
  var percent = 0;
  if (task.running) {
    percent = (now - task.startTime) / 1000 / time * 100;
  }
  setBarWidth("bar-" + i, percent);
}

// Shows the Level Up and Hire buttons with their costs (greyed out if too expensive)
function showRowButtons(i) {
  var levelCost = getLevelCost(i);
  setShown("level-" + i, true);
  setText("level-" + i, "Level Up " + formatMoney(levelCost));
  setDisabled("level-" + i, gameState.money < levelCost);

  var hireCost = taskList[i].hireCost;
  if (gameState.tasks[i].hired) {
    setShown("hire-" + i, false);
  } else {
    setShown("hire-" + i, true);
    setText("hire-" + i, "Hire " + taskList[i].character + " " + formatMoney(hireCost));
    setDisabled("hire-" + i, gameState.money < hireCost);
  }
}

// Shows a task row that is unlocked
function showUnlockedRow(i) {
  setText("name-" + i, taskList[i].name + "  Lv " + gameState.tasks[i].level);
  setShown("bar-outer-" + i, true);
  setShown("unlock-" + i, false);
  showRowState(i);
  showRowButtons(i);
}

// The text under a team member's name that says what they do right now
function getTeamStatus(t) {
  if (t == 0) {
    if (isOutage() && gameState.team[0].hired) {
      return "Fixing the servers!";
    }
    return "Server outages last " + formatSeconds(getOutageSeconds()) + " (max 30s)";
  }
  if (isBreachRunning() && gameState.team[1].hired) {
    return "Fighting the hacker!";
  }
  var text = "Hacker breach timer: " + getBreachSeconds() + "s";
  if (gameState.team[1].hired) {
    text = text + ", win = x1.5 for 60s";
  }
  return text;
}

// Updates one Team row: name, level, status, buttons and sprite
function updateTeamRow(t) {
  var member = gameState.team[t];
  var isWorking = (t == 0 && isOutage()) || (t == 1 && isBreachRunning());

  if (!member.hired) {
    setClass("team-row-" + t, "task-row locked");
    setText("team-name-" + t, teamList[t].name + " (not hired)");
    setShown("team-hire-" + t, true);
    setText("team-hire-" + t, "Hire " + teamList[t].name + " " + formatMoney(teamList[t].hireCost));
    setDisabled("team-hire-" + t, gameState.money < teamList[t].hireCost);
    setShown("team-level-" + t, false);
  } else {
    if (isWorking) {
      setClass("team-row-" + t, "task-row working");
    } else {
      setClass("team-row-" + t, "task-row auto");
    }
    setShown("team-hire-" + t, false);
    setShown("team-level-" + t, true);
    if (member.level >= teamList[t].maxLevel) {
      setText("team-name-" + t, teamList[t].name + "  Lv " + member.level + " MAX");
      setText("team-level-" + t, "MAX");
      setDisabled("team-level-" + t, true);
    } else {
      setText("team-name-" + t, teamList[t].name + "  Lv " + member.level);
      setText("team-level-" + t, "Level Up " + formatMoney(getTeamLevelCost(t)));
      setDisabled("team-level-" + t, gameState.money < getTeamLevelCost(t));
    }
  }
  setText("team-status-" + t, getTeamStatus(t));

  var frameNumber = 1;
  if (member.hired && isWorking) {
    frameNumber = getTypingFrame();
  }
  showSprite("team-character-" + t, teamList[t].name, frameNumber);
}

// Shows the Team section once enough money has been earned
function updateTeamSection() {
  if (gameState.totalEarned < teamUnlockEarned) {
    setShown("team-section", false);
    return;
  }
  setShown("team-section", true);
  for (var t = 0; t < teamList.length; t++) {
    updateTeamRow(t);
  }
}

// Shows the event banner for an Investor Meeting offer or a Server Outage, or hides it
function updateEventBanner() {
  var now = Date.now();
  if (eventType == "") {
    setShown("event-banner", false);
    return;
  }
  setShown("event-banner", true);
  var secondsLeft = (eventEndTime - now) / 1000;
  var totalSeconds = (eventEndTime - eventStartTime) / 1000;
  if (eventType == "meeting") {
    setClass("event-banner", "meeting");
    setText("event-text", "Investor Meeting! Take it to double all payouts for 30s.");
    setShown("event-button", true);
  } else {
    setClass("event-banner", "outage");
    setText("event-text", "Server Outage! All tasks are paused.");
    setShown("event-button", false);
  }
  setText("event-time-text", "Time left: " + Math.ceil(secondsLeft) + " s");
  setBarWidth("event-timer", secondsLeft / totalSeconds * 100);
}

// Shows or hides one boost bar (x2 meeting or x1.5 security) with its countdown
function updateBoost(name, endTime, totalSeconds) {
  var secondsLeft = (endTime - Date.now()) / 1000;
  if (secondsLeft <= 0) {
    setShown(name + "-boost", false);
    return;
  }
  setShown(name + "-boost", true);
  setText(name + "-time-text", "Time left: " + Math.ceil(secondsLeft) + " s");
  setBarWidth(name + "-timer", secondsLeft / totalSeconds * 100);
}

// Updates the breach popup: problems left, the countdown bar and the hacker sprite
function updateBreachPopup() {
  if (!isBreachRunning()) {
    return;
  }
  var secondsLeft = (breachEndTime - Date.now()) / 1000;
  setText("breach-left", "Problems left: " + problemsLeft);
  setText("breach-time-text", "Time left: " + Math.max(0, Math.ceil(secondsLeft)) + " s");
  setBarWidth("breach-timer", secondsLeft / breachTotalSeconds * 100);
  if (secondsLeft < 10) {
    setClass("breach-timer", "timer-inner danger");
  } else {
    setClass("breach-timer", "timer-inner");
  }
  showSprite("hacker-canvas", "Hacker", getTypingFrame());
}

// Shows the Pivot button (with how many points it gives) once the player has earned enough
function updatePivotButton() {
  var points = getPivotPoints();
  setShown("pivot-button", points >= 1);
  if (points >= 1) {
    setText("pivot-button", "Pivot: +" + points + " investors");
  }
}

// Redraws everything that can change: top bar, events, task rows and the team
function updateScreen() {
  setText("money-display", formatMoney(gameState.money));
  setText("investor-display", "Investors: " + gameState.investors + " (+" + gameState.investors * 10 + "%)");
  updatePivotButton();
  updateEventBanner();
  updateBoost("meeting", meetingBoostEndTime, meetingBoostSeconds);
  updateBoost("security", securityBoostEndTime, securityBoostSeconds);
  updateBreachPopup();
  if (gameState.soundOn) {
    setText("sound-button", "Sound: On");
  } else {
    setText("sound-button", "Sound: Off");
  }
  for (var i = 0; i < taskList.length; i++) {
    if (gameState.tasks[i].unlocked) {
      showUnlockedRow(i);
    } else {
      showLockedRow(i);
    }
    updateSprite(i);
  }
  updateTeamSection();
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
  buildTeamRows();
  setInterval(gameTick, 100);
  setInterval(saveGame, 10000);
  window.onbeforeunload = saveGame;
  console.log("DEBUG startGame: game loaded and the 100 ms tick timer is running");
  // a breach was going on when the page was closed or refreshed, so it counts as a loss
  if (gameState.breachActive) {
    loseBreach();
  }
  updateScreen();
}

startGame();
