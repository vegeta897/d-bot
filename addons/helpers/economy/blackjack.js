// Frank Catton can't get past the gaming board
var util = require(__base+'core/util.js');
var storage = require(__base+'core/storage.js');
const Deck = require('./deck.js');
const validator = require('./../param-validator.js');

const gameStorage = storage.json('blackjack',
    {
        multi: 1,
        min: 10,
        sessions: {}
    }, '\t'
);
const game = gameStorage.data;

const CHOICES = {
    hit: '🃏 Hit', stay: '🔒 Stay', double: '⏭️ Double', safety: '💸 Safety'
};
// TODO: Add split, "You 1" and "You 2" lines in output, commands are given sequentially, "stay hit"
// TODO: Search within messages for choice, to allow e.g. 'hit me!' and 'oh god, stay!'

const RESULTS = {
    push: '↔️ **Push** Credits returned `Bal: @bal`', bust: '💢 **Bust!** **@net** ➜ `Bal: @bal`',
    '21': '🌟 **⫷ 𝟮𝟭 ⫸** **+@net** ➜ `Bal: @bal`', win: '✨️ **You Win!** **+@net** ➜ `Bal: @bal`',
    lose: '👎 **You Lose** **@net** ➜ `Bal: @bal`', 'safe-won': '✅️ **Safety** **@net** ➜ `Bal: @bal`',
    'safe-lost': ' ❌ Safety lost, **@net**'
};

function getScore(cards) {
    let score = 0, aceCount = 0;
    cards.map(c => Deck.card(c)).forEach(card => {
        if(card.number === 'a') aceCount++;
        score += card.number > 0 ? card.number : card.number === 'a' ? 11 : 10;
    });
    while(score > 21 && aceCount > 0) {
        score -= 10;
        aceCount--;
    }
    return score;
}

function dealerDraw(dHand, deck, pScore) {
    let dScore = getScore(dHand);
    while(dHand.length === 1 || (dScore < 16 && dScore < pScore)) {
        dHand.push(deck.draw());
        dScore = getScore(dHand);
    }
}

function play({ userData, deck, pHand, pScore, dHand, dScore, net = 0, choices, bet }, play) {
    deck = new Deck(deck);
    bet = bet || play.bet;
    let gameOver = false;
    let result;
    if(!pHand) { // New game
        deck.shuffle();
        pHand = [deck.draw(''), deck.draw('')];
        dHand = [deck.draw('0')];
        choices = ['hit', 'stay'];
        if(userData.balance >= bet * 2) choices.push('double');
        pScore = getScore(pHand);
        dScore = getScore(dHand);
        if(pScore === 21) gameOver = true;
        if(deck.card(dHand[0]).number === 'a') choices.push('safety');
    } else { // Playing
        util.findAndRemove('safety', choices);
        util.findAndRemove('double', choices);
        if(play.choice === 'hit' || play.choice === 'double') pHand.push(deck.draw(''));
        if(play.choice === 'double') bet = bet * 2;
        pScore = getScore(pHand);
        if(pScore >= 21 || play.choice === 'stay' || play.choice === 'double') gameOver = true;
        if(play.choice === 'safety') {
            dHand.push(deck.draw());
            dScore = getScore(dHand);
            net = -bet / 2;
            gameOver = gameOver || dScore === 21;
            result = dScore === 21 ? 'safe-won' : 'safe-lost';
        }
    }
    if(gameOver) {
        choices = [];
        dealerDraw(dHand, deck, pScore);
        dScore = getScore(dHand);
        if(result === 'safe-won') {
            // Nothing happens
        } else if(pScore > 21) { // Player busts
            net += -bet;
            result = 'bust';
        } else if(pScore < dScore && dScore <= 21) { // Dealer has better score
            net += -bet;
            result = 'lose';
        } else if(pScore === 21) { // Player has blackjack
            if(dScore === 21 && dHand.length <= pHand.length) result = 'push'; // Dealer ties
            else { // 21!!
                result = '21';
                net += bet * 1.5 * game.multi;
            }
        } else if(pScore <= 21 && pScore === dScore) result = 'push'; // Tie
        else if(pScore > dScore || dScore > 21) { // Better score or dealer busted
            net += bet * game.multi;
            result = 'win';
        }
    }
    return {
        userData, deck: deck.cards, bet, choices, net: Math.round(net),
        pHand, pScore, dHand, dScore, result, gameOver
    }
}

function getOutput({ pScore, dScore, pHand, dHand, choices, result, net, userData }) {
    let output = '```ini\n'
        + `You     ${'[ ' + String(pScore).padStart(2) + ' ]'}   ${pHand.map(c => Deck.card(c).shortName).join(', ')}\n`
        + `Dealer  ${'[ ' + String(dScore).padStart(2) + ' ]'}   ${dHand.map(c => Deck.card(c).shortName).join(', ')}`
        + '```' + choices.map(c => '`' + CHOICES[c] + '`').join(' ');
    if(result) output += RESULTS[result].replace('@net', net).replace('@bal', userData.balance + net);
    return output;
}

module.exports = {
    properName: 'Blackjack',
    names: ['blackjack', 'black-jack', 'bj', '21', 'twentyone', 'twenty-one'],
    parsePlay(sessionID, userData, params) {
        let playData = { userData },
            session = game.sessions[sessionID];
        if(!session) {
            let validated = validator.validate([
                new validator.Pattern(['bet'], params, [
                    new validator.Param().numeric('❌ Provide a bet amount')
                        .whole('❌ Your bet must be a whole number')
                        .min(game.min, `🔺 Minimum bet: ${game.min}`)
                        .max(userData.balance, `❗ You only have ${userData.balance} credits`)
                ])
            ]);
            playData.bet = +validated.bet;
            playData.error = validated.error;
            return playData;
        }
        return validator.validate([
            new validator.Pattern(['choice'], params, [
                new validator.Param().oneOf(session.choices, true) // True argument returns no message
            ])
        ]);
    },
    play(sessionID, playData) {
        let session = game.sessions[sessionID] || { userData: playData.userData };
        game.sessions[sessionID] = session;
        Object.assign(session, play(session, playData));
        let result = { output: getOutput(session), net: session.net };
        if(session.gameOver) {
            delete game.sessions[sessionID];
            result.done = true;
        }
        gameStorage.save();
        return result;
    }
};