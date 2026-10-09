// The achievements the player can earn. reward is the payout bonus in percent.
// Earned achievements are kept forever (also after a pivot or losing to a hacker).
var achievementList = [
  { id: "firstPaycheck", name: "First Paycheck", description: "Get paid for the first time", reward: 1 },
  { id: "smallBusiness", name: "Small Business", description: "Earn $1,000 in total", reward: 2 },
  { id: "firstHire", name: "First Hire", description: "Hire any task character", reward: 2 },
  { id: "level10", name: "Level 10", description: "Get any task to level 10", reward: 2 },
  { id: "fullOffice", name: "Full Office", description: "Unlock all five tasks", reward: 3 },
  { id: "fullyAutomated", name: "Fully Automated", description: "Hire all five task characters", reward: 5 },
  { id: "millionaire", name: "Millionaire", description: "Earn $1,000,000 in total", reward: 5 },
  { id: "level50", name: "Level 50", description: "Get any task to level 50", reward: 3 },
  { id: "techSupport", name: "Tech Support", description: "Hire IT Support", reward: 2 },
  { id: "lockedDown", name: "Locked Down", description: "Hire Cybersecurity", reward: 2 },
  { id: "hackerBeaten", name: "Hacker Beaten", description: "Win a Hacker Breach", reward: 5 },
  { id: "officeUpgrader", name: "Office Upgrader", description: "Own 4 office upgrades at once", reward: 3 },
  { id: "dreamOffice", name: "Dream Office", description: "Own all 8 office upgrades at once", reward: 5 }
];

// The achievement bonus can never go above this
var maxAchievementBonus = 1.40;

// How often the game loop runs, in milliseconds (fast so the 2-decimal countdowns look smooth)
var tickMilliseconds = 50;

// DEBUG: counts game ticks so the console log only prints once a second
var tickCount = 0;

// Remembers which sprite each canvas is showing, so it is only redrawn when it changes
var lastSprite = {};

// Random events. These are not saved, so a reload ends a meeting, an outage or a boost.
var eventType = "";            // "", "meeting" or "outage"
var eventStartTime = 0;        // when the current meeting offer or outage started
var eventEndTime = 0;          // when the meeting offer or outage runs out
var meetingBoostEndTime = 0;   // payouts are x2 until this time
var securityBoostEndTime = 0;  // payouts are x5 (securityBoostMultiplier) until this time
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
var lastProblemText = "";     // so the same problem is never given twice in a row

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

// Shows or hides an element. "" means "use the normal display from style.css".
function setShown(id, isShown) {
  var element = document.getElementById(id);
  var display = "none";
  if (isShown) {
    display = "";
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

// Turns seconds left into countdown text: whole seconds (rounded up) above 10, like "59s",
// and two decimals from 10 down, like "9.89s". Never below 0.
function formatCountdown(secondsLeft) {
  if (secondsLeft < 0) {
    secondsLeft = 0;
  }
  if (secondsLeft > 10) {
    return Math.ceil(secondsLeft) + "s";
  }
  return secondsLeft.toFixed(2) + "s";
}

// Shows a countdown: the bar and the "Time left" text both come from the same secondsLeft number
function showCountdown(barId, textId, secondsLeft, totalSeconds) {
  setBarWidth(barId, secondsLeft / totalSeconds * 100);
  setText(textId, "Time left: " + formatCountdown(secondsLeft));
}

// ---------- Numbers and formulas ----------

// ---------- Formulas (all in one place) ----------
//
// payout = basePayout * level * investorBonus * achievementBonus * allPayoutPerks * taskPerk * eventBonus
// time   = max(1, baseTime * 0.5 ^ halvings * 0.96 ^ floor(level / 5) * standingDesks)

// How many seconds one run of a task takes.
// Cut in half at each speed milestone, 4% shorter every 5 levels, 5% shorter with Standing Desks.
function getTaskTime(i) {
  var level = gameState.tasks[i].level;
  var halvings = 0;
  for (var m = 0; m < speedMilestones.length; m++) {
    if (level >= speedMilestones[m]) {
      halvings = halvings + 1;
    }
  }
  var standingDesks = 1;
  if (hasPerk("desks")) {
    standingDesks = getPerk("desks").value;
  }
  var time = taskList[i].time * Math.pow(0.5, halvings) * Math.pow(fiveLevelSpeedUp, Math.floor(level / 5)) * standingDesks;
  return Math.max(1, time);
}

// Turns seconds into text with at most 2 decimals, like 10s, 9.6s or 4.61s
function formatSeconds(seconds) {
  return Math.round(seconds * 100) / 100 + "s";
}

// +10% for each investor point
function getInvestorBonus() {
  return 1 + 0.1 * gameState.investors;
}

// Adds up the rewards of every earned achievement, in percent (for example 7 means +7%)
function getAchievementPercent() {
  var percent = 0;
  for (var a = 0; a < achievementList.length; a++) {
    if (gameState.achievements[achievementList[a].id]) {
      percent = percent + achievementList[a].reward;
    }
  }
  return percent;
}

// 1 plus the achievement rewards as a decimal (1.07 for +7%), at most 1.40
function getAchievementBonus() {
  return Math.min(maxAchievementBonus, 1 + getAchievementPercent() / 100);
}

// Upgrades that boost every task: Coffee Machine and Corner Office
function getAllPayoutPerks() {
  var bonus = 1;
  if (hasPerk("coffee")) {
    bonus = bonus * getPerk("coffee").value;
  }
  if (hasPerk("corner")) {
    bonus = bonus * getPerk("corner").value;
  }
  return bonus;
}

// Returns true if the number i is in the list
function listHas(list, i) {
  for (var k = 0; k < list.length; k++) {
    if (list[k] == i) {
      return true;
    }
  }
  return false;
}

// Upgrades that boost only some tasks: Second Monitor and Ergonomic Chairs
function getTaskPerk(i) {
  if (hasPerk("monitor") && listHas(monitorTasks, i)) {
    return getPerk("monitor").value;
  }
  if (hasPerk("chairs") && listHas(chairsTasks, i)) {
    return getPerk("chairs").value;
  }
  return 1;
}

// The multiplier from events: x2 during an investor meeting boost, x5 during a security boost
function getEventBonus() {
  var bonus = 1;
  if (Date.now() < meetingBoostEndTime) {
    bonus = bonus * 2;
  }
  if (Date.now() < securityBoostEndTime) {
    bonus = bonus * securityBoostMultiplier;
  }
  return bonus;
}

// Everything that multiplies a payout, except the task's own base payout and level
function getBonus(i) {
  return getInvestorBonus() * getAchievementBonus() * getAllPayoutPerks() * getTaskPerk(i) * getEventBonus();
}

// How much one run of a task pays right now
function getPayout(i) {
  // the + 0.001 stops a number like 10.999999 from being rounded down to 10
  return Math.floor(taskList[i].payout * gameState.tasks[i].level * getBonus(i) + 0.001);
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

// How many seconds a server outage lasts.
// 30 seconds, shorter with IT Support (never under 3), and 25% shorter with the Server Rack.
function getOutageSeconds() {
  var serverRack = 1;
  if (hasPerk("rack")) {
    serverRack = getPerk("rack").value;
  }
  var itLevel = getTeamLevel(0);
  if (itLevel == 0) {
    return outageMaxSeconds * serverRack;
  }
  return Math.max(3, outageMaxSeconds * Math.pow(0.85, itLevel) * serverRack);
}

// How many seconds the player gets to beat a hacker
// (3 more per Cybersecurity level, 10 more with Security Cameras)
function getBreachSeconds() {
  var seconds = breachBaseSeconds + 3 * getTeamLevel(1);
  if (hasPerk("cameras")) {
    seconds = seconds + getPerk("cameras").value;
  }
  return seconds;
}

// ---------- Office Upgrades ----------

// Finds an upgrade in perkList by its id
function getPerk(id) {
  for (var k = 0; k < perkList.length; k++) {
    if (perkList[k].id == id) {
      return perkList[k];
    }
  }
  return null;
}

// Returns true if the player owns an upgrade
function hasPerk(id) {
  return gameState.perks[id] == true;
}

// Counts how many upgrades the player owns
function countPerks() {
  var count = 0;
  for (var k = 0; k < perkList.length; k++) {
    if (hasPerk(perkList[k].id)) {
      count = count + 1;
    }
  }
  return count;
}

// Buys an upgrade (k is its number in perkList)
function buyPerk(k) {
  var perk = perkList[k];
  if (!hasPerk(perk.id) && gameState.money >= perk.cost) {
    gameState.money = gameState.money - perk.cost;
    gameState.perks[perk.id] = true;
    playSound("buy");
    showMessage("Bought " + perk.name + "!");
    checkAchievements();
    updateScreen();
  }
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
    checkAchievements();
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
    checkAchievements();
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
    checkAchievements();
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

// Resets money, tasks, the team and office upgrades to the start. Achievements, investors and stats are kept.
// Used by Pivot and by losing to a hacker.
function startOverRun() {
  var newGame = makeNewGame();
  gameState.money = 0;
  gameState.runEarned = 0;
  gameState.tasks = newGame.tasks;
  gameState.team = newGame.team;
  gameState.perks = {};
}

// Starts over with investor points
function pivot() {
  var points = getPivotPoints();
  if (points < 1) {
    return;
  }
  var question = "Pivot the company? You get " + points + " investor point(s) (+10% payouts each). " +
    "Your money, levels, unlocks, hires (including your team) and office upgrades go back to the start.";
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
  if (tickCount % 20 == 0) {
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
  if (id == "millionaire") {
    return gameState.totalEarned >= 1000000;
  }
  if (id == "level50") {
    return getHighestLevel() >= 50;
  }
  if (id == "techSupport") {
    return gameState.team[0].hired;
  }
  if (id == "lockedDown") {
    return gameState.team[1].hired;
  }
  if (id == "hackerBeaten") {
    return gameState.breachesWon >= 1;
  }
  if (id == "officeUpgrader") {
    return countPerks() >= 4;
  }
  if (id == "dreamOffice") {
    return countPerks() == perkList.length;
  }
  return false;
}

// Gives the player any achievements they have just earned
function checkAchievements() {
  for (var a = 0; a < achievementList.length; a++) {
    var id = achievementList[a].id;
    if (!gameState.achievements[id] && isAchievementDone(id)) {
      gameState.achievements[id] = true;
      showMessage("Achievement unlocked: " + achievementList[a].name + " (+" + achievementList[a].reward + "% payouts)");
    }
  }
}

// Runs every 50 ms: checks events, every task and achievements, then redraws the screen
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

// Makes a random easy math problem. Sets problemAnswer and returns the text, like "6 x 7".
function makeProblemText() {
  var type = randomInt(1, 4);
  var a = 0;
  var b = 0;
  if (type == 1) {
    a = randomInt(1, 20);
    b = randomInt(1, 20);
    problemAnswer = a + b;
    return a + " + " + b;
  }
  if (type == 2) {
    a = randomInt(10, 30);
    b = randomInt(1, 9);
    problemAnswer = a - b;
    return a + " - " + b;
  }
  if (type == 3) {
    a = randomInt(2, 9);
    b = randomInt(2, 9);
    problemAnswer = a * b;
    return a + " x " + b;
  }
  // division: pick the answer first so it always comes out even
  b = randomInt(2, 9);
  problemAnswer = randomInt(2, 9);
  a = b * problemAnswer;
  return a + " / " + b;
}

// Shows a new problem that is different from the last one, and clears the answer box
function newProblem() {
  var text = makeProblemText();
  while (text == lastProblemText) {
    text = makeProblemText();
  }
  lastProblemText = text;
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

// Closes the breach popup and stops the breach timer (used when winning and losing)
function closeBreachPopup() {
  breachEndTime = 0;
  var input = document.getElementById("breach-answer");
  input.value = "";
  input.blur();
  document.getElementById("breach-popup").style.display = "none";
}

// The player answered all 3 problems in time: the breach is over and the game goes on
function winBreach() {
  closeBreachPopup();
  gameState.breachActive = false;
  gameState.breachesWon = gameState.breachesWon + 1;
  showMessage("Hacker beaten!");
  if (gameState.team[1].hired) {
    securityBoostEndTime = Date.now() + securityBoostSeconds * 1000;
    showMessage("Security Boost! Payouts x" + securityBoostMultiplier + " for 60 seconds.");
  }
  // the next event comes 60-120 seconds from now, like after any other event
  nextEventTime = Date.now() + randomEventDelay();
  playSound("buy");
  checkAchievements();
  // save right away so a refresh after winning is not counted as a loss
  saveGame();
  updateScreen();
}

// The timer ran out (or the page was reloaded during a breach): show the "infiltrated" popup.
// gameState.breachActive stays true until the player clicks Start Over.
function loseBreach() {
  closeBreachPopup();
  document.getElementById("lost-popup").style.display = "block";
  playSound("event");
}

// ===== TESTING ONLY: used by the testing buttons in index.html =====

// Ends a server outage right away (tasks continue where they stopped)
function testEndOutage() {
  if (isOutage()) {
    endOutage();
    showMessage("Outage ended (testing)");
    updateScreen();
  }
}

// Ends a hacker breach as if the player won
function testEndBreach() {
  if (isBreachRunning()) {
    winBreach();
  }
}

// Ends a hacker breach as if the timer ran out
function testFailBreach() {
  if (isBreachRunning()) {
    loseBreach();
  }
}

// ===== END OF TESTING ONLY =====

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
  var barRow = makeDiv("bar-row", "bar-outer-" + i);
  var barOuter = makeDiv("progress-outer", "bar-box-" + i);
  barOuter.appendChild(makeDiv("progress-inner", "bar-" + i));
  barRow.appendChild(barOuter);
  barRow.appendChild(makeDiv("task-time", "time-" + i));
  info.appendChild(barRow);
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

// Creates one Office Upgrade card: name, effect, cost and a Buy button
function makePerkCard(k) {
  var card = makeDiv("perk-card", "perk-card-" + k);
  var name = makeDiv("perk-name", "perk-name-" + k);
  name.textContent = perkList[k].name;
  card.appendChild(name);
  var effect = makeDiv("perk-effect", "perk-effect-" + k);
  effect.textContent = perkList[k].effect;
  card.appendChild(effect);
  card.appendChild(makeButton("perk-buy-" + k, function () {
    buyPerk(k);
  }));
  return card;
}

// Creates the Office Upgrades cards and the small colored squares for owned upgrades
function buildPerks() {
  var perkListDiv = document.getElementById("perk-list");
  var ownedDiv = document.getElementById("owned-perks");
  for (var k = 0; k < perkList.length; k++) {
    perkListDiv.appendChild(makePerkCard(k));
    var square = makeDiv("owned-square", "owned-" + k);
    square.style.backgroundColor = perkList[k].color;
    square.title = perkList[k].name + ": " + perkList[k].effect;
    ownedDiv.appendChild(square);
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
  if (secondsAway >= getOfflineCapSeconds()) {
    text = "You were away for " + getOfflineCapSeconds() / 3600 + " hours or more (the most that counts). ";
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
  addPanelLine("Hackers beaten: " + gameState.breachesWon, "");
  addPanelLine("Office upgrades owned: " + countPerks() + " / " + perkList.length, "");
  addPanelLine("Achievement bonus: +" + Math.round((getAchievementBonus() - 1) * 100) + "% payouts", "");
  addPanelLine("Investor points: " + gameState.investors + " (payouts x" + (1 + 0.1 * gameState.investors).toFixed(1) + ")", "");
  addPanelLine("Earned since last pivot: " + formatMoney(gameState.runEarned), "");
}

// Opens the popup with the list of achievements
function showAchievements() {
  openPanel("Achievements");
  addPanelLine("Achievement bonus: +" + Math.round((getAchievementBonus() - 1) * 100) + "% payouts", "bonus-line");
  for (var a = 0; a < achievementList.length; a++) {
    var achievement = achievementList[a];
    var text = achievement.name + " - " + achievement.description + " (+" + achievement.reward + "% payouts)";
    if (gameState.achievements[achievement.id]) {
      addPanelLine("[X] " + text, "done");
    } else {
      addPanelLine("[ ] " + text, "not-done");
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

// How many seconds are left on a task's run (the full time if it isn't running).
// The bar and the countdown text both come from this one number.
function getTimeLeft(i) {
  var task = gameState.tasks[i];
  var time = getTaskTime(i);
  if (!task.running) {
    return time;
  }
  // during an outage the clock is frozen at the moment the outage started
  var now = Date.now();
  if (isOutage()) {
    now = eventStartTime;
  }
  var timeLeft = time - (now - task.startTime) / 1000;
  if (timeLeft < 0) {
    timeLeft = 0;
  }
  return timeLeft;
}

// Sets the row's look (ready, working, auto or paused), its status text, progress bar and countdown
function showRowState(i) {
  var task = gameState.tasks[i];
  var payText = formatMoney(getPayout(i)) + " per run";

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

  var time = getTaskTime(i);
  var timeLeft = getTimeLeft(i);
  var percent = 0;
  if (task.running) {
    percent = (time - timeLeft) / time * 100;
  }
  setBarWidth("bar-" + i, percent);
  setText("time-" + i, formatCountdown(timeLeft));
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
    text = text + ", win = x" + securityBoostMultiplier + " for 60s";
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

// Shows the Office Upgrades section and the row of owned upgrades
function updatePerks() {
  setShown("perk-section", gameState.totalEarned >= perksUnlockEarned);
  setShown("owned-row", countPerks() > 0);
  for (var k = 0; k < perkList.length; k++) {
    var perk = perkList[k];
    setShown("owned-" + k, hasPerk(perk.id));
    if (hasPerk(perk.id)) {
      setClass("perk-card-" + k, "perk-card owned");
      setText("perk-buy-" + k, "Owned");
      setDisabled("perk-buy-" + k, true);
    } else {
      setClass("perk-card-" + k, "perk-card");
      setText("perk-buy-" + k, "Buy " + formatMoney(perk.cost));
      setDisabled("perk-buy-" + k, gameState.money < perk.cost);
    }
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
  showCountdown("event-timer", "event-time-text", secondsLeft, totalSeconds);
}

// Shows or hides one boost bar (x2 meeting or x5 security) with its countdown
function updateBoost(name, endTime, totalSeconds) {
  var secondsLeft = (endTime - Date.now()) / 1000;
  if (secondsLeft <= 0) {
    setShown(name + "-boost", false);
    return;
  }
  setShown(name + "-boost", true);
  showCountdown(name + "-timer", name + "-time-text", secondsLeft, totalSeconds);
}

// Updates the breach popup: problems left, the countdown bar and the hacker sprite
function updateBreachPopup() {
  if (!isBreachRunning()) {
    return;
  }
  var secondsLeft = (breachEndTime - Date.now()) / 1000;
  setText("breach-left", "Problems left: " + problemsLeft);
  showCountdown("breach-timer", "breach-time-text", secondsLeft, breachTotalSeconds);
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
  updatePerks();
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
  buildPerks();
  setInterval(gameTick, tickMilliseconds);
  setInterval(saveGame, 10000);
  window.onbeforeunload = saveGame;
  console.log("DEBUG startGame: game loaded and the " + tickMilliseconds + " ms tick timer is running");
  // a breach was going on when the page was closed or refreshed, so it counts as a loss
  if (gameState.breachActive) {
    loseBreach();
  }
  // gives old saves any achievements they already qualify for
  checkAchievements();
  updateScreen();
}

startGame();
