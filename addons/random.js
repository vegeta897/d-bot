// RNG-based commands
var util = require('./../core/util.js');
var discord = require(__base+'core/discord.js');

var _commands = {};

_commands.roll = function(data) {
    if(!data.params.length && data.params[0][1] != 'd') return;
    var diceCount = +data.params[0][0];
    var sides = +(data.params[0].substr(2, 20));
    var total = 0;
    var rolls = [`Rolling a **${sides}** sided die **${diceCount}** time${diceCount > 1 ? 's' : ''}!`];
    if(diceCount > 0 && sides > 0) {
        for(var i = 0; i < diceCount; i++) {
            var roll = util.randomIntRange(1, sides);
            total += roll;
            rolls.push(`**${roll}**`);
        }
        if(diceCount > 1) rolls.push(`Total: **${total}**`);
        discord.sendMessage(data.channel, rolls.join('\n'));
    }
};

_commands.flip = function(data) {
    var coinCount = data.params.length ? Math.min(10, +data.params[0]) : 1;
    var flips = [`Flipping a coin **${coinCount}** time${coinCount > 1 ? 's' : ''}!`];
    if(coinCount > 0) {
        for(var j = 0; j < coinCount; j++) {
            flips.push(`**${util.flip() ? 'Heads' : 'Tails'}**`);
        }
        discord.sendMessage(data.channel,flips.join('\n'));
    }
};

_commands.whataretheodds = function(data) {
    var odds = Math.pow(10,util.randomIntRange(1,8))*util.randomIntRange(1,9);
    discord.sendMessage(data.channel, `1 in ${odds.toLocaleString()}!`);
};

module.exports = {
    commands: _commands,
    help: {
        flip: ['Flip a coin, or 5!', '5'],
        roll: ['DnD style dice rolls', '2d6'],
        whataretheodds: ['What *are* the odds?']
    }
};