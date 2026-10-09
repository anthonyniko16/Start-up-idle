var tasks = [
  { name: "Fix a Bug", who: "Intern", time: 10, pay: 10, unlock: 0, levelBase: 15, hire: 150, hair: "#f9c74f", shirt: "#43aa8b" },
  { name: "Build a Feature", who: "Junior Dev", time: 30, pay: 75, unlock: 400, levelBase: 100, hire: 2000, hair: "#7a4a2a", shirt: "#f8961e" },
  { name: "Design a Screen", who: "Designer", time: 60, pay: 200, unlock: 3000, levelBase: 750, hire: 15000, hair: "#ff70a6", shirt: "#9d4edd" },
  { name: "Test a Release", who: "QA Tester", time: 120, pay: 600, unlock: 20000, levelBase: 6000, hire: 100000, hair: "#222222", shirt: "#e63946" },
  { name: "Launch a Product", who: "DevOps Engineer", time: 300, pay: 2500, unlock: 150000, levelBase: 50000, hire: 750000, hair: "#777777", shirt: "#22223b" }
];

// H = hair, T = shirt, the other letters use the colors below, "." is see-through
var sprite = [
  "................",
  ".....HHHHHH.....",
  "....HHHHHHHH....",
  "....HSSSSSSH....",
  "....SESSSSES....",
  "....SSSSSSSS....",
  ".....SSSSSS.....",
  "......SSSS......",
  "...TTTTTTTTTT...",
  "..TTTTTTTTTTTT..",
  "..TTTLLLLLLTTT..",
  "..TTLLLLLLLLTT..",
  "..SSLLLLLLLLSS..",
  "DDDDDDDDDDDDDDDD",
  ".DD..........DD.",
  ".DD..........DD."
];
var colors = { S: "#f2c6a0", E: "#1b1b2f", L: "#c9c9de", D: "#9c6b3c" };

var state;

function newGame() {
  var game = { money: 0, totalEarned: 0, tasksCompleted: 0, lastSaved: Date.now(), tasks: [] };
  for (var i = 0; i < tasks.length; i++) {
    game.tasks.push({ level: 1, unlocked: i == 0, hired: false, running: false, startTime: 0 });
  }
  return game;
}

function taskTime(i) {
  var level = state.tasks[i].level;
  var milestones = [10, 25, 50, 100];
  var halves = 0;
  for (var m = 0; m < milestones.length; m++) {
    if (level >= milestones[m]) {
      halves++;
    }
  }
  return Math.max(1, tasks[i].time * Math.pow(0.5, halves) * Math.pow(0.96, Math.floor(level / 5)));
}

function payout(i) {
  return tasks[i].pay * state.tasks[i].level;
}

function levelCost(i) {
  // + 0.001 because 100 * 1.15 is 114.99999 in JavaScript
  return Math.floor(tasks[i].levelBase * Math.pow(1.15, state.tasks[i].level) + 0.001);
}

function money(amount) {
  return "$" + Math.floor(amount).toLocaleString("en-US");
}

function timeText(seconds) {
  if (seconds > 10) {
    return Math.ceil(seconds) + "s";
  }
  return seconds.toFixed(2) + "s";
}

function earn(amount, runs) {
  state.money += amount;
  state.totalEarned += amount;
  state.tasksCompleted += runs;
}

function clickTask(i) {
  var t = state.tasks[i];
  if (t.unlocked && !t.running) {
    t.running = true;
    t.startTime = Date.now();
    update();
  }
}

function buy(i, what) {
  var t = state.tasks[i];
  var cost = tasks[i].hire;
  if (what == "unlock") {
    cost = tasks[i].unlock;
  }
  if (what == "level") {
    cost = levelCost(i);
  }
  if (state.money < cost) {
    return;
  }
  state.money -= cost;
  if (what == "unlock") {
    t.unlocked = true;
  }
  if (what == "level") {
    t.level++;
  }
  if (what == "hire") {
    t.hired = true;
  }
  update();
}

// Time is measured with Date.now() instead of counting ticks,
// because browsers slow down timers in background tabs.
function tick() {
  var now = Date.now();
  for (var i = 0; i < tasks.length; i++) {
    var t = state.tasks[i];
    if (t.hired && !t.running) {
      t.running = true;
      t.startTime = now;
    }
    var time = taskTime(i);
    var passed = (now - t.startTime) / 1000;
    if (!t.running || passed < time) {
      continue;
    }
    if (t.hired) {
      var runs = Math.floor(passed / time);
      earn(payout(i) * runs, runs);
      t.startTime += runs * time * 1000;
    } else {
      earn(payout(i), 1);
      t.running = false;
    }
  }
  update();
}

function save() {
  state.lastSaved = Date.now();
  localStorage.setItem("startUpSave", JSON.stringify(state));
}

function load() {
  var text = localStorage.getItem("startUpSave");
  if (text == null) {
    state = newGame();
    return;
  }
  state = JSON.parse(text);
  var now = Date.now();
  var away = Math.min((now - state.lastSaved) / 1000, 8 * 60 * 60);
  var earned = 0;
  for (var i = 0; i < tasks.length; i++) {
    var t = state.tasks[i];
    var time = taskTime(i);
    if (t.hired) {
      var runs = Math.floor(away / time);
      if (runs > 0) {
        earn(payout(i) * runs, runs);
        earned += payout(i) * runs;
        t.startTime = now;
      }
    } else if (t.running && now - t.startTime >= time * 1000) {
      earn(payout(i), 1);
      earned += payout(i);
      t.running = false;
    }
  }
  if (earned > 0) {
    showPopup("Welcome back!\nYou were away for " + Math.floor(away / 60) + " minutes.\nYour team earned " + money(earned) + ".");
  }
}

function showPopup(text) {
  document.getElementById("popupText").textContent = text;
  document.getElementById("popup").style.display = "block";
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}

function showStats() {
  var hired = 0;
  var highest = 0;
  for (var i = 0; i < tasks.length; i++) {
    if (state.tasks[i].hired) {
      hired++;
    }
    if (state.tasks[i].unlocked && state.tasks[i].level > highest) {
      highest = state.tasks[i].level;
    }
  }
  showPopup("Stats\nTotal earned: " + money(state.totalEarned) + "\nTasks completed: " + state.tasksCompleted +
    "\nCharacters hired: " + hired + " / " + tasks.length + "\nHighest level: " + highest);
}

function add(parent, tag, id) {
  var element = document.createElement(tag);
  element.id = id;
  parent.appendChild(element);
  return element;
}

function drawSprite(canvas, i) {
  var context = canvas.getContext("2d");
  for (var y = 0; y < 16; y++) {
    for (var x = 0; x < 16; x++) {
      var letter = sprite[y].charAt(x);
      var color = colors[letter];
      if (letter == "H") {
        color = tasks[i].hair;
      }
      if (letter == "T") {
        color = tasks[i].shirt;
      }
      if (letter != ".") {
        context.fillStyle = color;
        context.fillRect(x, y, 1, 1);
      }
    }
  }
}

function buildRow(i) {
  var row = add(document.getElementById("rows"), "div", "row" + i);
  var canvas = add(row, "canvas", "pic" + i);
  canvas.width = 16;
  canvas.height = 16;
  drawSprite(canvas, i);
  var info = add(row, "div", "info" + i);
  info.className = "info";
  info.onclick = function () {
    clickTask(i);
  };
  add(info, "div", "name" + i);
  var bar = add(info, "div", "barBox" + i);
  bar.className = "bar";
  add(bar, "div", "bar" + i);
  add(info, "div", "status" + i);
  var buttons = add(row, "div", "buttons" + i);
  buttons.className = "buttons";
  add(buttons, "button", "unlock" + i).onclick = function () {
    buy(i, "unlock");
  };
  add(buttons, "button", "level" + i).onclick = function () {
    buy(i, "level");
  };
  add(buttons, "button", "hire" + i).onclick = function () {
    buy(i, "hire");
  };
}

// Only change text that is different, so the page isn't rewritten every tick (that can lose clicks)
function setText(id, text) {
  var element = document.getElementById(id);
  if (element.textContent != text) {
    element.textContent = text;
  }
}

function setButton(id, show, text, disabled) {
  var button = document.getElementById(id);
  button.style.display = show ? "" : "none";
  setText(id, text);
  button.disabled = disabled;
}

function updateRow(i) {
  var t = state.tasks[i];
  var time = taskTime(i);
  var left = time;
  if (t.running) {
    left = Math.max(0, time - (Date.now() - t.startTime) / 1000);
  }
  document.getElementById("bar" + i).style.width = (time - left) / time * 100 + "%";

  var look = "row";
  var label = "Click to start: ";
  if (!t.unlocked) {
    look = "row locked";
  } else if (t.hired) {
    look = "row auto";
    label = "Auto: ";
  } else if (t.running) {
    look = "row working";
    label = "Working: ";
  }
  document.getElementById("row" + i).className = look;

  if (t.unlocked) {
    setText("name" + i, tasks[i].name + "  Lv " + t.level);
    setText("status" + i, label + money(payout(i)) + " per run, " + timeText(left));
  } else {
    setText("name" + i, tasks[i].name);
    setText("status" + i, "Locked");
  }

  setButton("unlock" + i, !t.unlocked, "Unlock " + money(tasks[i].unlock), state.money < tasks[i].unlock);
  setButton("level" + i, t.unlocked, "Level Up " + money(levelCost(i)), state.money < levelCost(i));
  if (t.hired) {
    setButton("hire" + i, true, "Hired", true);
  } else {
    setButton("hire" + i, t.unlocked, "Hire " + tasks[i].who + " " + money(tasks[i].hire), state.money < tasks[i].hire);
  }
}

function update() {
  setText("money", money(state.money));
  for (var i = 0; i < tasks.length; i++) {
    updateRow(i);
  }
}

load();
for (var i = 0; i < tasks.length; i++) {
  buildRow(i);
}
update();
setInterval(tick, 50);
setInterval(save, 10000);
window.onbeforeunload = save;
