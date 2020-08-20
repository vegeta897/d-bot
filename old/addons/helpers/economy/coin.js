// What's the most you've ever lost in a coin toss?
var util = require(__base+'core/util.js');
var storage = require(__base+'core/storage.js');
const validator = require('./../param-validator.js');

const game = storage.json('coin',
    {
        multi: 1,
        min: 1,
        heads: 0,
        tails: 0
    }, '\t'
);

module.exports = {
    properName: 'Coin Flip',
    names: ['coin', 'coins', 'coinflip', 'cf'],
    parsePlay(sessionID, userData, params) {
        let playData = {};
        let choiceValidator = new validator.Param().oneOf(['heads', 'tails'], '❓ Choose "heads" or "tails"');
        let betValidator = new validator.Param().numeric('❌ Provide a bet amount')
            .whole('❌ Your bet must be a whole number')
            .min(game.get('min'), `🔺 Minimum bet: ${game.get('min')}`)
            .max(userData.balance, `❗ You only have ${userData.balance} credits`);
        let validated = validator.validate([
            new validator.Pattern(['choice', 'bet'], params, [choiceValidator, betValidator]),
            new validator.Pattern(['bet', 'choice'], params, [betValidator, choiceValidator]),
        ]);
        playData.bet = +validated.bet;
        playData.choice = validated.choice;
        playData.error = validated.error;
        playData.balance = userData.balance;
        return playData;
    },
    play(sessionID, playData) {
        let side = util.flip() ? 'Heads' : 'Tails';
        if(side === 'Heads') game.set('heads', game.get('heads') + 1);
        else game.set('tails', game.get('tails') + 1);
        game.save();
        let win = side.toLowerCase() === playData.choice;
        let net = win ? playData.bet * game.get('multi') : -playData.bet;
        return {
            output: 'The coin flips into the air...',
            noMention: true,
            delay: {
                done: true, net,
                output: `\n${win ? (side === 'Tails' ? '🦊' : '🦁') : '😩'} **${side}!** ` +
                    `${win ? 'You Win!' : 'Sorry...'} ` +
                    `**${win ? '+' : ''}${net}** ➜ ` +
                    `\`Bal: ${playData.balance + net}\``,
                time: util.randomInt(2000, 4000)
            }
        };
    }
};
