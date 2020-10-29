import { CommandClient, User } from 'eris'
import { DISCORD_TOKEN } from '../config'
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
}

function compareStrings(a: string, b: string, matchCase: boolean): boolean {
	if (matchCase) return a === b
	else return a.toLowerCase() === b.toLowerCase()
}
