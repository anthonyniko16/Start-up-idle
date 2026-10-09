// All the task numbers live here so they can be changed in one place.
// time is in seconds and payout is in dollars. Both are for level 1.
var taskList = [
  {
    name: "Fix a Bug",
    character: "Intern",
    time: 10,
    payout: 10,
    unlockCost: 0,
    levelCostBase: 15,
    hireCost: 150
  },
  {
    name: "Build a Feature",
    character: "Junior Dev",
    time: 30,
    payout: 75,
    unlockCost: 400,
    levelCostBase: 100,
    hireCost: 2000
  },
  {
    name: "Design a Screen",
    character: "Designer",
    time: 60,
    payout: 200,
    unlockCost: 3000,
    levelCostBase: 750,
    hireCost: 15000
  },
  {
    name: "Test a Release",
    character: "QA Tester",
    time: 120,
    payout: 600,
    unlockCost: 20000,
    levelCostBase: 6000,
    hireCost: 100000
  },
  {
    name: "Launch a Product",
    character: "DevOps Engineer",
    time: 300,
    payout: 2500,
    unlockCost: 150000,
    levelCostBase: 50000,
    hireCost: 750000
  }
];

// When a task reaches one of these levels, its time is cut in half
var speedMilestones = [10, 25, 50, 100];

// Every 5 levels (5, 10, 15...) a task's time is multiplied by this (0.96 = 4% shorter)
var fiveLevelSpeedUp = 0.96;

// The team members who help with events. They don't run a task.
// Number 0 is IT Support (shorter outages), number 1 is Cybersecurity (hacker breaches).
var teamList = [
  { name: "IT Support", hireCost: 25000, levelCostBase: 5000, maxLevel: 15 },
  { name: "Cybersecurity", hireCost: 50000, levelCostBase: 10000, maxLevel: 15 }
];

// How much money must be earned in total before these show up
var teamUnlockEarned = 10000;
var outageUnlockEarned = 5000;
var breachUnlockEarned = 100000;
