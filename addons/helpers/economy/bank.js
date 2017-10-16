// Maybe you have what it takes to break the bank. Whoops!
var util = require(__base+'core/util.js');
var storage = require(__base+'core/storage.js');
var discord = require(__base+'core/discord.js');

const bankStorage = storage.json('bank',
    {
        startCredits: 100,
        users: {}
    }, '\t'
);
const bank = bankStorage.data;

function getAccount(data, output) {
    let account = bank.users[data.userID];
    if(account) {
        account.has = amount => account.balance >= amount;
        account.balanceWarning = () => `❗ You only have ${account.balance} credits`;
        account.showBalance = () => `\`\`\`xl\n${data.nick}’s account balance: ${account.balance}\`\`\``;
        account.addCredits = amount => {
            account.balance += amount;
            bankStorage.save();
        };
        if(output) output.push(account.showBalance());
    }
    return account;
}

module.exports = {
    register(data, output) {
        if(!getAccount(data)) {
            if(output) output.push(`🏦 Welcome to **D-Bank**, ${data.mention}`);
            bank.users[data.userID] = {
                created: Date.now(),
                balance: bank.startCredits
            };
            bankStorage.save();
        }
        return getAccount(data);
    },
    getAccount,
    deleteAccount(data) {
        if(bank.users[data.userID]) {
            delete bank.users[data.userID];
            bankStorage.save();
        }
    },
    addCredits(userID, amount) {
        let account = bank.users[userID];
        if(account) account.balance += amount;
        bankStorage.save();
    },
    leaderboard() {
        return '```xl\n' + Object.keys(bank.users).map(u => {
            return [discord.getUsernameFromID(u), bank.users[u]];
        }).sort((a, b) => {
            return b[1].balance - a[1].balance || a[1].created - b[1].created;
        }).map((u, i) => {
            let paddedName = u[0].padEnd(12);
            let paddedBal = String(u[1].balance).padStart(8);
            return (i + 1 + '.').padEnd(4) + paddedName + paddedBal
        }).join('\n') + '```';
    }
};