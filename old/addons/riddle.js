// Riddle me this
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var storage = require(__base+'core/storage.js');
var FuzzySet = require('fuzzyset.js');

const CHANNEL = '430194045835542528';
const MONITOR_CHANNEL = '209177876975583232';

const { answerMods, chatRules } = require('./helpers/riddle-mods');
let waiting = false;

const INIT_DATA = {
    attempts: 0,
    stage: -1,
    stageBeginTime: 0,
    furthestStage: -1,
    lastClueTime: 0,
    clueShownTimes: 0,
    nonAnswerMessages: 0,
    lastAnswerer: null,
    answerMod: false,
    chatRule: false,
    chatRuleData: {},
    chatRuleViolations: 0,
    usedAnswerMods: [],
    usedChatRules: [],
    lastChatRuleTime: 0
};

const riddleData = storage.json('riddle', INIT_DATA, '\t');

function showClue() {
    riddleData.set('lastClueTime', Date.now());
    riddleData.trans('clueShownTimes', t => t + 1);
    let stageNumber = riddleData.get('stage');
    let message = STAGES[stageNumber].promptText;
    let answerMod = riddleData.get('answerMod');
    if(answerMod) message = answerMods.get(answerMod).transform(message);
    let end = stageNumber === STAGES.length - 1;
    discord.uploadFile({
        to: CHANNEL, message: (end ? ':tada: ' : ':small_orange_diamond: ') + message,
        file: storage.getStoragePath((end ? 'end' : stageNumber) + '.jpg')
    });
}

function chooseMod(mods, usedKey, stage) {
    let mod, usedMods = riddleData.get(usedKey)[stage] || [];
    do mod = util.pickInArray([...mods.keys()]);
    while(usedMods.includes(mod));
    riddleData.trans(usedKey, u => {
        if(!u[stage]) u[stage] = [];
        u[stage].push(mod);
        // console.log('used mods count', u[stage].length, 'all mods count', mods.size);
        if(u[stage].length === mods.size) u[stage] = [mod]; // All mods used, round robin resets
        return u;
    });
    return mod;
}

function nextStage() {
    waiting = false;
    riddleData.trans('stage', s => s + 1);
    let answerMod = false;
    let stage = riddleData.get('stage');
    riddleData.trans('furthestStage', f => Math.max(f, stage));
    if(stage < STAGES.length && stage < riddleData.get('furthestStage') && Math.random() < 0.3) {
        answerMod = chooseMod(answerMods, 'usedAnswerMods', stage);
    }
    riddleData.set('answerMod', answerMod);
    riddleData.set('clueShownTimes', 0);
    riddleData.set('nonAnswerMessages', 0);
    riddleData.set('stageBeginTime', Date.now());
    showClue();
}

function reset() {
    riddleData.trans('attempts', a => {
        a++;
        discord.sendMessage(CHANNEL, `:repeat: **ATTEMPT ${a + 1}**`);
        return a;
    });
    riddleData.set('stage', -1);
    setTimeout(nextStage, 5 * 1000);
}

module.exports = {
    listen: async function(data) {
        if(data.channel === MONITOR_CHANNEL) {
            if(data.message === 'init riddle') {
                return riddleData.setData(JSON.parse(JSON.stringify(INIT_DATA)));
            }
            if(data.message === 'start riddle') {
                discord.sendMessage(CHANNEL, '@everyone');
                return nextStage();
            }
            if(data.message === 'show clue') return showClue();
        }
        if(data.userID === '86913608335773696' || data.channel !== CHANNEL || waiting || riddleData.get('stage') < 0) return;
        let stage = STAGES[riddleData.get('stage')];
        let answer = stage.answer;
        let answerMod = riddleData.get('answerMod');
        if(answerMod) answer = answerMods.get(answerMod).transform(answer);
        let messageScore = FuzzySet([answer]).get(data.message);
        messageScore = messageScore ? messageScore[0][0] : 0;
        // discord.sendMessage(MONITOR_CHANNEL, `Message "${data.message}" is ${messageScore*100}% close to "${answer}"`);
        if(messageScore >= 0.9 && (!answerMod || answerMods.get(answerMod).validGuess(answer, data.message))) {
            data.reply(':white_check_mark: **Correct!**');
            riddleData.set('lastAnswerer', data.userID);
            return nextStage();
        } else {
            let chatRule = riddleData.get('chatRule');
            let chatRuleData = chatRule && riddleData.get('chatRuleData');
            let chatRuleViolated = chatRule && chatRules.get(chatRule).violates(data, chatRuleData);
            riddleData.save();
            if(chatRuleViolated) {
                data.reply(
                    `:warning: ***CHAT RULE VIOLATION!*** — \`${chatRules.get(chatRule).message(chatRuleData)}\``);
                riddleData.trans('lastChatRuleTime', t => t - 2 * 60 * 1000);
                riddleData.trans('chatRuleViolations', v => v + 1);
                waiting = true;
                return setTimeout(reset, 3 * 1000);
            }
        }
        riddleData.trans('nonAnswerMessages', m => {
            m++;
            let stageTime = Date.now() - riddleData.get('stageBeginTime');
            //console.log(m, stageTime > 3 * 60 * 1000);
            if((util.randomInt(m) > 4 || stageTime > 3 * 60 * 1000) && riddleData.get('stage') > 0) {
                let attempt = riddleData.get('attempts');
                let attemptMessage = attemptMessages[attempt % attemptMessages.length];
                data.reply(attemptMessage);
                waiting = true;
                setTimeout(reset, 3 * 1000);
            } else if(m % 12 === 11) {
                showClue();
            }
            return m;
        });
    },
    async tick() {
        if(waiting || riddleData.get('stage') < 0 || !discord.bot.connected) return;
        let timeSinceLastChatRule = Date.now() - riddleData.get('lastChatRuleTime');
        if(riddleData.get('attempts') > 0 &&
            (riddleData.get('chatRuleViolations') >= 3 || timeSinceLastChatRule > 10 * 60 * 1000)) {
            let chatRule = chooseMod(chatRules, 'usedChatRules', 0);
            riddleData.set('chatRule', chatRule);
            riddleData.set('chatRuleData', {});
            if(chatRules.get(chatRule).init) chatRules.get(chatRule).init(riddleData.get('chatRuleData'));
            riddleData.save();
            riddleData.set('lastChatRuleTime', Date.now() - util.randomInt(5) * 60 * 1000);
            riddleData.set('chatRuleViolations', 0);
            discord.sendMessage(CHANNEL,
                `:notepad_spiral: **New Chat Rule:** \`${chatRules.get(chatRule).message(riddleData.get('chatRuleData'))}\``);
        }
    },
    commands: {}
};

const STAGES = [
    { // 0
        promptText: 'Good morning, and welcome to the',
        answer: 'Black Mesa transit system'
    },
    { // 1
        promptText: 'The Barney says:',
        answer: `Morning Mr. Freeman, looks like you're running late`
    },
    { // 2
        promptText: 'Whose locker?',
        answer: 'Laidlaw'
    },
    { // 3
        promptText: `I'm seeing predictable`,
        answer: 'phase arrays'
    },
    { // 4
        promptText: 'Title card:',
        answer: 'OFFICE COMPLEX'
    },
    { // 5
        promptText: 'morgs: why does black mesa have a ..',
        answer: 'meat? processing plant?'
    },
    { // 6
        promptText: 'The dangling scientist says:',
        answer: `I... I can't hold on much longer`
    },
    { // 7
        promptText: 'For \\_\\_\\_ sake \\_\\_\\_ the \\_\\_\\_ door, \\_\\_\\_ coming \\_\\_\\_ us, \\_\\_\\_ our \\_\\_\\_ way \\_\\_\\_!',
        answer: `god's open silo they're for it's only out`
    },
    { // 8
        promptText: `What's _this_ button do?`,
        answer: 'TEST FIRE'
    },
    { // 9
        promptText: `How many W presses does it take to go full speed on a train?`,
        answer: 'four'
    },
    { // 10
        promptText: `They said it was hauled from the Challenger Deep`,
        answer: 'ichthyosaur'
    },
    { // 11
        promptText: `Who was being careless with the Gauss gun?`,
        answer: 'Barney'
    },
    { // 12
        promptText: `What does the suit lady say when you reach full battery?`,
        answer: 'Power level is one hundred percent'
    },
    { // 13
        promptText: `What comes out of this pod when you break it?`,
        answer: 'snarks'
    },
    { // 14
        promptText: `Who kept jumping into this portal too early because they couldn't hear the scientist?`,
        answer: 'Viper'
    },
    { // 15
        promptText: `Do the Xen healing pools make the best sound ever?`,
        answer: 'yes'
    },
    { // 16
        promptText: `The G-Man is \\_\\_\\_ by the nasty piece of work you managed over there`,
        answer: 'impressed'
    },
    { // end
        promptText: 'You finally solved my riddle...',
        answer: 'L1VXsQjml4wFT8YYXKXgJLTtcPAprsULL1Df5TUPmCOVIfXTNOOnyiCjxlZzDAJ1gYjj4c7bAyRlxE9hxRDZHUFni2piWlDzVTpT5C'
    }
];

const attemptMessages = [
    `:confused: Hmm. I'm resetting your progress. Try again.`,
    `:pensive: Start over. You'll get it this time.`,
    ':rolling_eyes: Really? Come on. Starting over.',
    ':disappointed: You guys are better than this. Do it again.',
    ':expressionless: Have you even played Half-Life?',
    `:neutral_face: This really isn't that hard.`,
    ':thinking: Some of you went to college, right?',
    ':sweat: This is a disgrace.',
    ':grimacing: What is the matter with you?',
    ':poop: Try again, morons.',
    ':unamused: Come the fuck on.',
    ':confounded: Try using your brains.',
    `:veg: I'm starting to feel sorry for you.`,
    ':no_mouth: You all must feel pretty stupid.',
    ':nerd: Try thinking for a change.',
    `:flushed: You should be ashamed.`,
    `:head_bandage: This is painful to watch.`,
    ':cry: Are you just hitting random keys?',
    ':cobra: *GOD DAMNIT!*'
];
