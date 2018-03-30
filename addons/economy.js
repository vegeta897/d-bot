// It's the money
// Inspired by the economy cog in Red Discord Bot
// https://github.com/Cog-Creators/Red-DiscordBot
var util = require(__base+'core/util.js');
var discord = require(__base+'core/discord.js');
var storage = require(__base+'core/storage.js');
const casino = require('./helpers/economy/casino.js');
const bank = require('./helpers/economy/bank.js');

var _commands = {};

const NAMES_MALE = ['jerry', 'walt', 'michael', 'dennis', 'jim', 'peter', 'rick', 'brian', 'tony', 'george', 'jesse', 'ron', 'omar'];
const NAMES_FEMALE = ['leslie', 'lucy', 'marge', 'lisa', 'sandy', 'pam', 'jan', 'lindsay', 'elaine'];
const NAMES = NAMES_MALE.concat(NAMES_FEMALE);
const FACES_MALE = ['👱🏻','👱🏼','👱🏽','👱🏾','👱🏿','👨🏻','👨🏼','👨🏽','👨🏾','👨🏿','👴🏻','👴🏼','👴🏽','👴🏾','👴🏿','👳🏻','👳🏼','👳🏽','👳🏾','👳🏿','🎅🏻'];
const FACES_FEMALE = ['👩🏻','👩🏼','👩🏽','👩🏾','👩🏿','👵🏻','👵🏼','👵🏽','👵🏾','👵🏿','👧🏻','👧🏼','👧🏽','👧🏾','👧🏿','👸🏻','👸🏼','👸🏽','👸🏾','👸🏿','🤶🏻'];
const TRAITS = ['sympathetic', 'scared', 'generous'];
const economy = storage.json('economy',
    {
        // TODO: Store user's current task here (gambling, begging, etc) to block other activities
        people: {},
        beggars: {}
    }, '\t'
);
if(Object.keys(economy.get('people')).length === 0) {
    let people = {};
    for(let i = 0; i < NAMES.length; i++) {
        people[NAMES[i]] = {
            trait: util.pickInArray(TRAITS),
            face: util.pickInArray(i < NAMES_MALE.length ? FACES_MALE : FACES_FEMALE, 1),
            difficulty: util.randomInt(80),
            wealth: util.randomInt(1, 10) * 100 * util.randomInt(1, 10)
        }
    }
    economy.set('people', people);
}
let PEOPLE = economy.get('people');

function requireAccount(command, silent) {
    return function(data) {
        let account = bank.getAccount(data);
        if(!account) return silent || data.reply(data.mention + '```\n❌ You don\'t have an account, register with /bank```');
        let playing = casino.userIsPlaying(data.userID);
        if(playing) return silent || data.reply(`${data.mention}, finish your game of **${playing}** first! 🎰`);
        command(data, account);
    }
}

_commands.bank = function(data) {
    let output = [];
    if(!bank.getAccount(data, output)) {
        bank.register(data, output);
        bank.getAccount(data, output);
    }
    if(['leaderboard','scores','highscores','rank'].includes(data.paramStr)) return data.reply(bank.leaderboard());
    return data.reply(output.join(''));
};

_commands.bankruptcy = requireAccount(function(data) {
    bank.deleteAccount(data);
    data.reply(`${data.mention}, your bank account has been deleted`);
});

_commands.give = requireAccount(function(data, account) {
    // TODO: Rewrite validation with param-validator module
    let output = [data.mention];
    let to = data.params[0];
    let amount = data.params[1];
    if(!discord.getIDFromUsername(to) && data.params[1] && discord.getIDFromUsername(data.params[1])) {
        to = data.params[1];
        amount = data.params[0];
    }
    let toID = discord.getIDFromUsername(to);
    if(!toID) {
        output.push('```\n🤷 I don\'t know anyone named "' + to + '"```');
    } else if(toID === data.userID) {
        output.push('```\nYou can\'t give credits to yourself!```');
    } else if(!util.isNumeric(amount) || Math.floor(+amount) !== +amount || +amount <= 0) {
        output.push('```xl\n❌ Transfer amount must be a whole number greater than 0```');
    } else if(!account.has(+amount)) {
        output.push('```xl\n' + account.balanceWarning() + '```');
    } else {
        account.addCredits(-amount);
        let toAccount = bank.register({ userID: toID });
        toAccount.addCredits(+amount);
        output.push(`\`\`\`xl\n✔️ ${amount} credits have been transferred`
            + `\n${data.nick}’s remaining balance: ${account.balance}`
            + `\n${to}’s new balance: ${toAccount.balance}\`\`\``);
        output.push(`<@!${toID}>, you received credits from **${data.nick}**!`);
        output.shift();
    }
    data.reply(output.join(''));
});

_commands.beg = requireAccount(function(data, account) {
    if(economy.get('beggars')[data.userID]) {
        if(economy.get('beggars')[data.userID].state) return data.reply(data.mention +
            '```\n🙏 You\'re already begging! Choose from the list above.```');
        if(account.balance === 0) economy.get('beggars')[data.userID].cooldown = 0;
        let cooldown = economy.get('beggars')[data.userID].cooldown - Date.now();
        if(cooldown > 0) return data.reply(data.mention +
            '```\n⏳ Wait ' +  util.getTimeUnits(cooldown).join(' ') + ` before begging again` + '```');
    }
    let people = Object.keys(PEOPLE);
    let choices = [util.pickInArray(people, true), util.pickInArray(people, true), util.pickInArray(people, true)];
    economy.get('beggars')[data.userID] = { state: 'approach', choices };
    data.reply(data.mention + '```css\n' + `Who do you want to beg from?\n` +
        choices.map((p, i) => `${(i + 1)}. ${PEOPLE[p].face} ${util.capitalize(p)}`).join('\n') + '```');
});

function listenToBeggar(data) {
    let beggar = economy.get('beggars')[data.userID];
    if(!beggar || !beggar.state) return;
    let choice;
    if(beggar.state === 'amount') {
        choice = +data.message.toLowerCase();
        choice = util.isNumeric(choice) && choice > 0 ? Math.ceil(choice) : false;
    } else {
        choice = beggar.choices.find((choice, i) => {
            return choice.toLowerCase() === data.message.toLowerCase() || (i + 1) === +data.message;
        });
    }
    if(!choice) return;
    switch(beggar.state) {
        case 'approach':
            beggar.person = choice;
            beggar.score = 100 - PEOPLE[beggar.person].difficulty;
            beggar.choices = ['Ask politely', 'Demand angrily', 'Beg pitifully'];
            data.reply(data.mention + '```css\n' + `You approach ${util.capitalize(choice)}. What do you say?\n` +
                beggar.choices.map((c, i) => `${(i + 1)}. ${c}`).join('\n') + '```');
            beggar.state = 'ask';
            break;
        case 'ask':
            delete beggar.choices;
            choice = choice.toLowerCase().split(' ')[0];
            if(TRAITS.indexOf(PEOPLE[beggar.person].trait) !== ['beg', 'demand', 'ask'].indexOf(choice)) {
                beggar.score -= util.randomInt(10, 40);
            }
            let verb = choice + (choice === 'demand' ? '' : ' for');
            data.reply(data.mention + '```\n' + `How many credits do you ${verb}?` + '```');
            beggar.state = 'amount';
            break;
        case 'amount':
            let person = PEOPLE[beggar.person];
            beggar.score = Math.max(beggar.score, 0);
            let scoreModifier = util.random(beggar.score / 100, 1);
            let given = Math.min(choice, Math.max(0, person.wealth - Math.max(0, choice - person.wealth)));
            given *= 1 - Math.min(1, choice / person.wealth);
            let account = bank.getAccount(data);
            let balance = account.balance;
            if(choice > person.wealth) given *= scoreModifier;
            given = Math.round(Math.max(0, given - given * balance / (balance + 100) ));
            let prefix = data.mention + `\n${person.face} ${util.capitalize(beggar.person)} `;
            let pronoun = NAMES_MALE.includes(beggar.person) ? 'his' : 'her';
            if(given) {
                account.addCredits(given);
                data.reply(`${prefix}gives you **${given}** credit${given > 1 ? 's' : ''}! ` +
                    `\`Bal: ${account.balance}\``);
                economy.get('people')[beggar.person].given = (economy.get('people')[beggar.person].given || 0) + given;
            }
            else data.reply(`${prefix}rolls ${pronoun} eyes and walks away.`);
            beggar.cooldown = Date.now() + given * 2500; // 2.5 sec per credit
            delete beggar.state;
            delete beggar.person;
            delete beggar.score;
            break;
    }
    economy.save();
}

// TODO: Create a module for chat interfaces like casino games and begging
// Has its own .onMessage event handler for the specified user in the specified channel

module.exports = {
    listen(data) {
        if(!economy.get('beggars')[data.userID] || !economy.get('beggars')[data.userID].state) casino.listen(data);
        requireAccount(listenToBeggar, true)(data); // Improve this one-thing-at-a-time checking
    },
    // tick() {
    //
    // },
    commands: _commands
};

// Ideas
/*
    - Beg command, randomly generates choices of AI people to beg from, with varying results

*/
