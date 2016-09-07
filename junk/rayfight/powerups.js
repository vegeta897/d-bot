'use strict';
var util = require('./../util.js');

var powerups = {
    clipperBeam: { name: 'Clipper Beam', symbol: 'C', color: '#f62727' },
    omniPower: { name: 'Omni Power', symbol: 'O', color: '#23c0df' }
};

module.exports = {
    spawn: function(turn,x,y) {
        var pu = JSON.parse(JSON.stringify(powerups[util.pickInObject(powerups)]));
        pu.turn = turn; pu.x = x; pu.y = y;
        return pu;
    },
    powerups: powerups
};