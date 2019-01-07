function getDMs(dmChannel, delay) {
    setTimeout(function(){
        bot.getMessages({ channelID: dmChannel, limit: 100 }, function(err, messagesArray) {
            messagesArray.reverse();
            messagesArray.forEach(function(msg){
                console.log(msg.timestamp.substr(0,19), msg.author.username+':', msg.content);
            });
        });
    }, delay);
}
var dm = 0;
for(var dmKey in bot.directMessages) {
    if(!bot.directMessages.hasOwnProperty(dmKey)) continue;
    getDMs(dmKey, dm * 5000);
    dm++;
}