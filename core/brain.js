// Central events and "awareness"
var config = require('./config.js');
var storage = require('./storage.js');
const EventEmitter = require('events');

const Brain = new EventEmitter();

var moment = {};

var lastMessages = {};

// setInterval(() => {
//     var snapshot;
//     Brain.emit('moment', moment);
// }, 60 * 1000);
//
Brain.on('message', data => {
    if(!data.command) lastMessages[data.channel] = data;
});

Brain.getLastMessage = channel => lastMessages[channel];

module.exports = Brain;