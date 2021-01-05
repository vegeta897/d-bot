import {
	CommandClient,
	Guild,
	Message,
	MessageContent,
	MessageFile,
	PrivateChannel,
	TextChannel,
	User,
} from 'eris'
import { DISCORD_TOKEN, DEFAULT_BOT_CHANNEL_ID } from '../config'
import { Intents } from './Intents'

export class Discord {
	private static clientInstance: CommandClient
	static get bot(): CommandClient {
		if (!this.clientInstance) {
			this.clientInstance = new CommandClient(
				DISCORD_TOKEN,
				{ intents: Intents },
				{
					prefix: ']',
					owner: 'vegeta897#7777',
					defaultCommandOptions: { caseInsensitive: true },
				}
			)
		}
		return this.clientInstance
	}
	static findUserByName(
		name: string,
		{
			ignoreNick = false,
			matchCase = false,
		}: { ignoreNick?: boolean; matchCase?: boolean } = {}
	): User | undefined {
		const foundUser = this.bot.users.find((u) =>
			compareStrings(u.username, name, matchCase)
		)
		if (foundUser || ignoreNick) return foundUser
		// Search nicknames if username not found
		for (const [, guild] of this.bot.guilds) {
			const foundMember = guild.members.find(
				(m) => !!m.nick && compareStrings(m.nick, name, matchCase)
			)
			if (foundMember) return this.bot.users.get(foundMember.id)
		}
		return undefined
	}
	static getDefaultChannel(guild: Guild): TextChannel {
		const defaultBotChannel = guild.channels.get(DEFAULT_BOT_CHANNEL_ID)
		if (defaultBotChannel instanceof TextChannel) return defaultBotChannel
		const mainChannel = guild.channels.get(guild.id)
		if (mainChannel instanceof TextChannel) return mainChannel
		const anyChannel = guild.channels.filter((c) => c instanceof TextChannel)[0]
		if (anyChannel instanceof TextChannel) return anyChannel
		throw `Could not find a default channel in guild ${guild.id}`
	}
	// Unify Promise return of TextChannel and PrivateChannel
	static sendMessage(
		channel: TextChannel | PrivateChannel,
		content: MessageContent,
		file?: MessageFile | MessageFile[]
	): Promise<Message> {
		return channel.createMessage(content, file)
	}
}

function compareStrings(a: string, b: string, matchCase: boolean): boolean {
	if (matchCase) return a === b
	else return a.toLowerCase() === b.toLowerCase()
}
