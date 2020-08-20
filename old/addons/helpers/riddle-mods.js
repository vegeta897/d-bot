var util = require(__base+'core/util.js');

const replace = (str, a, b) => str.split(a).join(b);

const answerMods = new Map();

answerMods.set('reverse', {
    transform: a => a.split('').reverse().join(''),
    validGuess: () => true
});

answerMods.set('allcaps', {
    transform: a => a.toUpperCase(),
    validGuess: (a, g) => g === g.toUpperCase()
});

answerMods.set('spaced', {
    transform: a => replace(replace(a, ' ', ''), '', ' '),
    validGuess: (a, g) => g.split(' ').length === (g.length + 1) / 2
});

answerMods.set('leet', {
    transform: a =>
        replace(replace(replace(replace(replace(replace(a.toLowerCase(), 'a','4'), 'l','1'), 'o','0'), 'e','3'), 's','5'), 't','7'),
    validGuess: () => true
});

const chatRules = new Map();

chatRules.set('banned-letter', {
    init: d => d.letter = util.pickInArray([ ...'abcdefghilmnoprstw' ]),
    message: d => `Don't use the letter ${d.letter.toUpperCase()}`,
    violates: ({ message: m }, d) => m.toLowerCase().includes(d.letter)
});

chatRules.set('no-spaces', {
    message: d => 'No spaces allowed',
    violates: ({ message: m }, d) => m.includes(' ')
});

chatRules.set('no-long-words', {
    message: d => 'No long words',
    violates: ({ message: m }, d) => m.split(' ').some(w => w.length > 5)
});

chatRules.set('capitalize-messages', {
    message: d => 'Messages must begin with a capital letter',
    violates: ({ message: m }, d) => m[0].toUpperCase() !== m[0] || m[0].toLowerCase() === m[0]
});

chatRules.set('no-consecutive-messages', {
    message: d => 'No user is allowed to send 2 messages in a row',
    violates: ({ userID }, d) => {
        if(d.lastUser === userID) return true;
        d.lastUser = userID;
        return false;
    }
});

chatRules.set('one-of-each-vowel', {
    message: d => 'Messages can only contain 1 of each vowel',
    violates: ({ message: m }, d) => {
        let usedVowels = {};
        let violated = false;
        m.toLowerCase().split('').forEach(l => {
            if(util.vowels.includes(l)) {
                if(usedVowels[l]) violated = true;
                usedVowels[l] = true;
            }
        });
        return violated;
    }
});

chatRules.set('zero-punctuation', {
    message: d => 'Zero Punctuation',
    violates: ({ message: m }, d) => [ ...',.!?()"\':;-' ].some(p => m.includes(p))
});

module.exports = {
    answerMods,
    chatRules
};
