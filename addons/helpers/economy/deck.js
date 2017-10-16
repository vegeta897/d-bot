// Check the deck, y'all! Press eject, y'all!
var util = require(__base+'core/util.js');

CARDS = {};

['spades', 'diamonds', 'clubs', 'hearts'].forEach(suit => {
    let s = suit[0];
    for(let i = 2; i <= 10; i++) {
        CARDS[s + i] = {
            suit,
            number: i,
            shortName: '' + i,
            fullName: i + ' of ' + suit
        }
    }
    ['jack', 'queen', 'king', 'ace'].forEach(face => {
        let f = face[0];
        CARDS[s + f] = {
            suit,
            number: f,
            shortName: util.capitalize(face),
            fullName: face + ' of ' + suit
        }
    });
});

function Deck(cards) {
    this.cards = cards || Object.keys(CARDS);
}

Deck.prototype.draw = function(card) {
    return card ? this.cards.splice(this.cards.indexOf(card), 1) : this.cards.pop();
};

Deck.prototype.shuffle = function() {
    let shuffled = [];
    while(this.cards.length > 0) shuffled.push(util.pickInArray(this.cards, true));
    this.cards = shuffled;
};

Deck.prototype.card = card => CARDS[card];
Deck.card = card => CARDS[card];

module.exports = Deck;