// #justemojithings
const util = require(__base+'core/util.js');
const storage = require(__base+'core/storage.js');
const emoji = require('node-emoji');

const emojiData = storage.json('emojis', { safe: [], unsafe: [] });

const _commands = {};

const recordEmoji = (list, emoji) => {
    emojiData.trans(list, arr => {
        if(!arr.includes(emoji)) arr.push(emoji);
        return arr;
    });
};

_commands.react = async data => {

    // TODO: React to previous message with emojis based on what was said,
    //  use fuzzyset on 1-2 word groups in message

    let unsafeEmoji = emojiData.get('unsafe');
    do {
        var randomEmoji = emoji.random().emoji;
    } while(unsafeEmoji.includes(randomEmoji));
    data.messageObject.addReaction(randomEmoji)
        .then(() => recordEmoji('safe', randomEmoji))
        .catch((err) => {
            if(err.message.includes('Unknown Emoji')) {
                recordEmoji('unsafe', randomEmoji);
                data.messageObject.addReaction(util.pickInArray(emojiData.get('safe')))
                    .catch(err => console.log(err));
            }
        });
};

module.exports = {
    commands: _commands,
    help: {
        react: ['Make D-Bot react with a random emoji']
    }
};
