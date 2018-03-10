# D-Bot
A quirky Discord bot made for single, small, private servers

1. Install: `npm install d-bot`
2. Set up: `config.json`
3. Run: `start bot.bat`
4. ???: `profit`

## About
This bot was created for a small server I share with my friends. Running it on multiple servers may have unintended side-effects. You probably don't want to install this bot anyway. 

But, I do think it's a halfway decent framework for a bot, and there are some interesting addons. Take a look at the code!

This bot logs messages, and has several commands that interact with those logs. Currently, this will not work for any messages sent before installing D-Bot, or any sent while D-Bot is offline. I plan to implement history crawling at some point.

## Config
Rename `config_example.json` to `config.json`

The config file is mostly optional things. You can remove any optional property you don't need.

### Required
* `token` *string* - Your bot's token. A long string of letters and numbers.
* `owner` *string* -  Your Discord ID. Not your user tag, but your actual numeric ID
* `prefixes` *array* -  Array of strings to prefix your commands with. You can have just one, or many, but they can only be one character each.

### Optional
* `adminRole` *string* - Role ID for users permitted to perform admin-like commands such as editing channels.
* `privateChannels` *array* - Array of channel ID strings that are ignored when commands such as `find` or `last` are used outside of these channels. When such a command is used inside a private channel, only messages from within that channel are searched.
* `noLogServers` *array* - Array of server ID strings that D-Bot will not log messages for
* `noLogChannels` *array* - Array of channel ID strings that D-Bot will not log messages for
* `allowCustomColors` *boolean* - If true, users can set their username color with the `color` command
* `minecraft` *object* - Contains IP and port for a Minecraft server to check the status of
* `mumble` *object* - If you have a CommandChannel Mumble server, input your e-mail and API key to check the status
* `starbound` *object* - If you have a Starbound server with Multiplay, paste in your server status image URL
* `7d` *object* - If you have a 7 Days to Die server, input the server IP and telnet info (see serverconfig.xml)
* `debugChannel` *string* - Channel ID to simulate when running the `debug` script.
* `userAliases` *object* - Lists of alternate names that users go by, for username lookups within the bot and for getting the username of a user no longer in the server. Property name should be the user ID, value should be an array of strings.

## And Also
Eternal thanks and respect to Izy521 for his awesome library, [discord.io](https://github.com/izy521/discord.io), and all the assistance he has provided

Shout-outs to F&A!
