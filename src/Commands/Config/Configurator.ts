import Config from '../../Config'
import type { IExportProperty } from '../../Config/Property'
import type { Message, TextableChannel, User } from 'eris'
import Discord from '../../Core/Discord'
import Timeout = NodeJS.Timeout
import { createDisplay } from './ConfigDisplay'

const MODULES = Config.getModules()

const CONFIG_TIMEOUT = 5 * 60 * 1000

const configurators: Configurator[] = []

enum CONFIG_END_REASONS {
	INACTIVE = '💤 Config session ended due to inactivity',
	OTHER_COMMAND = '💬 Config session ended because you used another command',
	BY_USER = '☑️ Config session ended by user',
	RELOAD = '🔄 Config session ended due to script reload',
}

/* TODO: Design notes

Don't show JSON-style object literals. Display a simple list of key > value pairs with literals wrapped in inline-code spans

Show examples for everything. How to add, remove, or edit a key/value

*/

export function addConfigurator(message: Message): void {
	if (!configurators.find((c) => c.user.id === message.author.id))
		configurators.push(new Configurator(message))
}

export function terminateConfigurators(): void {
	configurators.forEach((c) => c.end(CONFIG_END_REASONS.RELOAD))
}

class Configurator {
	currentProperty: IExportProperty | null = null
	user: User
	channel: TextableChannel
	lastUserReply: Message | null = null
	messages: Message[] = []
	displayMessage: Message | null = null
	displayText: string | null = null
	errorText: string | null = null
	endTimer: Timeout | null = null
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
		this.lastUserReply = message
		if (deleteMessage) message.delete()
		else this.messages.push(message)
		if (['stop', 'exit', 'quit'].includes(message.content.toLowerCase())) {
			this.end(CONFIG_END_REASONS.BY_USER)
			return
		}
		if (message.command && message.command.label !== 'config') {
			this.end(CONFIG_END_REASONS.OTHER_COMMAND)
			return
		}
		if (this.endTimer) this.endTimer.refresh()
		else
			this.endTimer = setTimeout(
				() => this.end(CONFIG_END_REASONS.INACTIVE),
				CONFIG_TIMEOUT
			)
		this.errorText = null
		try {
			this.processMessage(message)
		} catch (processError) {
			this.errorText = processError
		}
		this.updateDisplay()
	}
	private processMessage(message: Message) {
		const pathString = message.command
			? Discord.stripCommand(message.content)
			: message.content
		const pathArr = Discord.splitArgs(pathString)
		if (!pathArr[0]) return
		pathArr.forEach((pathNode) => {
			if (!this.currentProperty) {
				const module = MODULES.find(
					(prop) => prop.name.toLowerCase() === pathNode.toLowerCase()
				)
				const indexedModule = MODULES[parseInt(pathNode) - 1]
				if (module || indexedModule)
					this.currentProperty = module || indexedModule
				else throw `Invalid module \`${pathNode}\``
				return
			}
			if (pathNode === '..') {
				this.currentProperty = this.currentProperty?.parent || null
				return
			}
			if (!this.currentProperty.properties)
				throw `\`${this.currentProperty.name}\` has no child properties`
			const childProperty = this.currentProperty.properties.find(
				(p) => p.name.toLowerCase() === pathNode.toLowerCase()
			)
			const indexedChildProperty = this.currentProperty.properties[
				parseInt(pathNode) - 1
			]
			if (childProperty || indexedChildProperty)
				this.currentProperty = childProperty || indexedChildProperty
			else
				throw `\`${pathNode}\` does not exist on \`${this.currentProperty.name}\``
		})
	}
	private updateDisplay() {
		this.displayText = createDisplay(this.currentProperty)
		if (this.errorText) this.displayText += `\n⚠️ **Error:** ${this.errorText}`
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
		if (this.displayMessage) this.displayMessage.edit(reason)
		Promise.all(this.messages.map((m) => m.delete()))
		configurators.splice(configurators.indexOf(this), 1)
	}
}
