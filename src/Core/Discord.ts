import { CommandClient } from 'eris'
import { DISCORD_TOKEN } from '../config'

export class Discord extends CommandClient {
	private static instance: Discord
	private constructor() {
		super(
			DISCORD_TOKEN,
			{},
			{
				prefix: ']',
				owner: 'vegeta897#7777',
			}
		)
	}
	static get bot(): Discord {
		if (!this.instance) {
			this.instance = new Discord()
		}
		return this.instance
	}
}
