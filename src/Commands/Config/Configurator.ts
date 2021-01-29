import type { Message, TextableChannel, User } from 'eris'
import Discord from '../../Core/Discord'
import type { IExportProperty } from '../../Config/Property'
import {
	CONFIG_COMMAND,
	CONFIG_END_REASONS,
	CONFIG_QUIT_COMMANDS,
} from './ConfigStrings'
import { traversePath } from './TraversePath'
import { createDisplay } from './ConfigDisplay'
import { ConfigState } from './ConfigState'

const CONFIG_TIMEOUT = 5 * 60 * 1000

/* TODO: Design notes

Show examples for everything. How to add, remove, or edit a key/value

*/

// TODO: Use this for viewing/editing storage json files too

class Configurator {
	state: ConfigState = new ConfigState()
	currentProperty: IExportProperty | null = null
	user: User
	channel: TextableChannel
	lastUserReply: Message | null = null
	displayMessage: Message | null = null
	displayText: string | null = null
	errorText: string | null = null
	endTimer: NodeJS.Timeout | null = null
	boundOnMessage: (message: Message) => void

	constructor(commandMessage: Message) {
		this.user = commandMessage.author
		this.channel = commandMessage.channel
		this.boundOnMessage = this.onMessage.bind(this)
		Discord.bot.on('messageCreate', this.boundOnMessage)
		this.onMessage(commandMessage, false)
	}

	private onMessage(message: Message, deleteMessage = true) {
		if (
			message.author.id !== this.user.id ||
			message.channel.id !== this.channel.id
		)
			return
		if (message.command && message.command.label !== CONFIG_COMMAND) {
			this.end(
				message.command.label === 'reload'
					? CONFIG_END_REASONS.RELOAD
					: CONFIG_END_REASONS.OTHER_COMMAND
			)
			return
		}
		this.lastUserReply = message
		if (deleteMessage) message.delete()
		if (CONFIG_QUIT_COMMANDS.includes(message.content.toLowerCase())) {
			this.end(CONFIG_END_REASONS.BY_USER)
			return
		}
		if (this.endTimer) this.endTimer.refresh()
		else
			this.endTimer = setTimeout(
				() => this.end(CONFIG_END_REASONS.INACTIVE),
				CONFIG_TIMEOUT
			)
		this.errorText = null
		const processedCommand = this.state.processCommand(
			message.content.toLowerCase()
		)
		if (!processedCommand) {
			try {
				const pathString = message.command
					? Discord.stripCommand(message.content)
					: message.content
				const pathArr = Discord.splitArgs(pathString)
				if (pathArr[0]) {
					this.currentProperty = traversePath(this.currentProperty, pathArr)
					this.state.afterTraverse(this.currentProperty)
				}
			} catch (processError) {
				this.errorText = processError
			}
		}
		this.updateDisplay()
	}

	private updateDisplay() {
		this.displayText =
			'**__Configuration__**\n' +
			createDisplay(this.currentProperty, this.state.display)
		if (this.errorText) this.displayText += `\n⚠️ **Error**: ${this.errorText}`
		if (this.state.prompts.length > 0)
			this.displayText += '\n\n' + this.state.prompts.join('\n')
		if (!this.displayMessage) {
			this.channel
				.createMessage(this.displayText)
				.then((message) => (this.displayMessage = message))
		} else if (this.displayMessage.content !== this.displayText) {
			this.displayMessage
				.edit(this.displayText)
				.then((message) => (this.displayMessage = message))
		}
	}

	end(reason: CONFIG_END_REASONS) {
		Discord.bot.removeListener('messageCreate', this.boundOnMessage)
		if (this.endTimer) {
			clearTimeout(this.endTimer)
			this.endTimer = null
		}
		if (this.displayMessage)
			this.displayMessage.edit('**__Configuration__**\n' + reason)
		configurators.splice(configurators.indexOf(this), 1)
	}
}

const configurators: Configurator[] = []

export function addConfigurator(message: Message): void {
	if (!configurators.find((c) => c.user.id === message.author.id))
		configurators.push(new Configurator(message))
}

export function terminateConfigurators(): void {
	configurators.forEach((c) => c.end(CONFIG_END_REASONS.RELOAD))
}
