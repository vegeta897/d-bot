// You wanna knock over a casino?
// Inspired by the casino cog in JumperCogs
// https://github.com/Redjumpman/Jumper-Cogs
var util = require(__base+'core/util.js');
var storage = require(__base+'core/storage.js');
const bank = require('./bank.js');

const casino = storage.json('casino',
    {
        globalMulti: 1,
        houseCredits: 0,
        players: {},
        cooldowns: {}
    }, '\t'
);

const games = {
    blackjack: require('./blackjack.js'),
    coin: require('./coin.js')
};
const gameList = Object.keys(games);

function findGame(command) {
    for(let i = 0; i < gameList.length; i++) {
        if(games[gameList[i]].names.includes(command)) return gameList[i];
    }
}
function getCooldown(userID, game) {
    if(!casino.get('cooldowns')[userID]) return 0;
    if(!casino.get('cooldowns')[userID][game]) return 0;
    return casino.get('cooldowns')[userID][game] - Date.now();
}

function setCooldown(userID, game, play) {
    let userCooldowns = casino.get('cooldowns')[userID] || {};
    userCooldowns[game] = Date.now() + Math.round(5 + 20 * play.bet / (play.bet + 1000)) * 1000;
    casino.get('cooldowns')[userID] = userCooldowns;
}

module.exports = {
    userIsPlaying(userID) {
        return casino.get('players')[userID] ? games[casino.get('players')[userID].id].properName : false;
    },
    listen(data) {
        let account = bank.getAccount(data);
        let game = casino.get('players')[data.userID];
        let newGame = data.command ? findGame(data.command) : false;
        if(game && newGame) return data.reply(`${data.mention}, you're already playing **${games[game.id].properName}**!`);
        if(!game && !newGame || (game && game.wait)) return;
        let output = [data.mention];
        if(!game && newGame) {
            if(!account) {
                output.push('```\n❌ You don\'t have an account, register with /bank```');
                return data.reply(output.join(''));
            }
            let cooldown = getCooldown(data.userID, newGame);
            if(cooldown > 3000) {
                output.push('```\n⏳ Wait ' +  util.getTimeUnits(cooldown).join(' ') +
                    ` to play ${games[newGame].properName} again` + '```');
                return data.reply(output.join(''));
            }
            game = { id: newGame, session: Date.now() };
            casino.get('players')[data.userID] = game;
        }
        let userData = { balance: account.balance };
        let play = games[game.id].parsePlay(game.session, userData, data.params || data.words);
        if(play.error) {
            output.push('```xl\n' + play.error + '```');
            if(newGame) delete casino.get('players')[data.userID];
            return play.error === true ? null : data.reply(output.join(''));
        }
        if(newGame) setCooldown(data.userID, newGame, play);
        function handleResult(result) {
            game.wait = false;
            if(result.done) {
                delete casino.get('players')[data.userID];
                if(result.net) {
                    account.addCredits(result.net);
                    casino.set('houseCredits', casino.get('houseCredits') - result.net);
                }
            }
            casino.save();
            if(result.output) output.push(result.output);
            if(result.noMention) output.splice(0, 1);
            data.reply(output.join(''));
            if(result.delay) {
                output = [];
                game.wait = true;
                setTimeout(() => handleResult(result.delay), result.delay.time);
            }
        }
        handleResult(games[game.id].play(game.session, play));
    }
};

// TODO: "Let it ride" command that puts your bet + winnings back into a repeat game. If you win that, you get a ride bonus. Can be repeated as long as you keep winning, with bonus increasing constantly
