// RNG-based commands
var util = require('./../core/util.js');
var discord = require(__base+'core/discord.js');

var _commands = {};

_commands.roll = function(data) {
    if(!data.params.length && data.params[0][1] != 'd') return;
    var rolls = [];
    var diceCount = +data.params[0][0];
    var sides = +(data.params[0].substr(2, 20));
    var total = 0;
    if(diceCount > 0 && sides > 0) {
        for(var i = 0; i < diceCount; i++) {
            var roll = util.randomIntRange(1, sides);
            total += roll;
            rolls.push('*D' + sides + '* roll: **' + roll + '**');
        }
        if(diceCount > 1) rolls.push('Total: **' + total + '**');
        discord.sendMessage(data.channel, rolls);
    }
};

_commands.flip = function(data) {
    var flips = [];
    var coinCount = data.params.length ? Math.min(10, +data.params[0]) : 1;
    if(coinCount > 0) {
        for(var j = 0; j < coinCount; j++) {
            flips.push('**' + (util.flip() ? 'Heads' : 'Tails') + '**');
        }
        discord.sendMessage(data.channel,flips);
    }
};

_commands.whataretheodds = function(data) {
    discord.sendMessage(data.channel, '1 in ' +
        (Math.pow(10,util.randomIntRange(1,8))*util.randomIntRange(1,9)).toLocaleString()+'!');
};

module.exports = {
    commands: _commands,
    help: {
        flip: ['Flip a coin, or 5!', '5'],
        roll: ['DnD style dice rolls', '2d6'],
        whataretheodds: ['What *are* the odds?']
    }
};