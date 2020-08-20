// Role call
const util = require(__base+'core/util.js');
const config = require(__base+'core/config.js');
const storage = require(__base+'core/storage.js');
const discord = require(__base+'core/discord.js');

const rolesData = storage.json('roles', { servers: {} }, '\t');

var _commands = {};

function syncServerRoles(server) {
    rolesData.trans('servers', servers => {
        servers[server.id] = Object.assign({
            roles: {}
        }, servers[server.id]);
        let roleData = servers[server.id].roles;
        for(let roleID of Object.keys(roleData)) {
            let role = server.roles.get(roleID);
            if(!role) {
                console.log('deleting unknown role', roleID);
                delete roleData[roleID];
                continue;
            }
            roleData[roleID].users = discord.getUsersInRole(server, role);
        }
        return servers;
    });
}

async function openRole(server, role, user) {
    if(!user.roles.includes(config.adminRole)) throw new Error('You do not have admin permissions!');
    if([config.adminRole, config.modRole].includes(role.id)) throw new Error(`For safety, you can't open that role`);
    rolesData.trans('servers', servers => {
        if(servers[server.id].roles[role.id]) {
            throw new Error('That role is already public');
        }
        servers[server.id].roles[role.id] = { users: [] };
        return servers;
    });
}

async function closeRole(server, role, user) {
    if(!user.roles.includes(config.adminRole)) throw new Error('You do not have admin permissions!');
    rolesData.trans('servers', servers => {
        if(!servers[server.id].roles[role.id]) {
            throw new Error('That is not a public role');
        }
        delete servers[server.id].roles[role.id];
        return servers;
    });
}

async function joinRole(server, role, user) {
    let roleData = rolesData.get('servers')[server.id].roles[role.id];
    if(!roleData) throw new Error('That is not a public role');
    if(roleData.users.includes(user.id)) throw new Error('You already have that role');
    try {
        await server.addMemberRole(user.id, role.id, `${user.username} commanded it`);
    } catch(e) {
        throw new Error('There was an error');
    }
    rolesData.trans('servers', servers => {
        roleData.users.push(user.id);
        return servers;
    });
}

async function leaveRole(server, role, user) {
    let roleData = rolesData.get('servers')[server.id].roles[role.id];
    if(!roleData || !roleData.users.includes(user.id)) throw new Error(`You don't have that role`);
    try {
        await server.removeMemberRole(user.id, role.id, `${user.username} commanded it`);
    } catch(e) {
        throw new Error('There was an error');
    }
    rolesData.trans('servers', servers => {
        util.findAndRemove(user.id, roleData.users);
        return servers;
    });
}

_commands.role = async function(data) {
    if(data.isPM) return data.reply('This command can only be used in a server');
    if(data.params.length < 2) {
        return data.reply('Use `/role` with `join` or `leave` followed by the role name');
    }
    let [action, roleName] = data.params;
    let role = data.server.roles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    if(!role) return data.reply(`The role \`${roleName}\` does not exist, you have to create it first`);
    syncServerRoles(data.server);
    let method;
    if(action === 'open') method = openRole;
    if(action === 'close') method = closeRole;
    if(action === 'join') method = joinRole;
    if(action === 'leave') method = leaveRole;
    if(!method) return data.reply(`Invalid action \`${action}\`, try \`join\` or \`leave\``);
    method(data.server, role, data.messageObject.member)
        .then(() => {
            data.messageObject.addReaction('\u2705');
        })
        .catch(e => {
            data.reply(e.message);
        });
};

module.exports = {
    commands: _commands
};
