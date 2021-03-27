import type { Message } from 'eris'
import type { IExportProperty } from '../../Config/Property'
import {
	CONFIG_EDIT_PROMPTS,
	CONFIG_PROMPTS,
	CONFIG_QUIT_COMMANDS,
	CONFIG_SUBCOMMANDS,
} from './ConfigStrings'
import { getPageCount, validatePageNumber } from './ConfigDisplay'
import Discord from '../../Core/Discord'
import { traversePath } from './TraversePath'

enum CONFIG_STATE {
	INIT,
	SELECTING_PROPERTY,
	VIEW_VALUE,
	VIEW_INFO,
	EDIT_VALUE,
}

export class ConfigState {
	state: CONFIG_STATE = CONFIG_STATE.INIT
	currentProperty: IExportProperty | null = null
	valuePage = 1
	end = false

	get prompts(): (CONFIG_PROMPTS | CONFIG_EDIT_PROMPTS)[] {
		const hasPages = getPageCount(this.currentProperty?.value) > 1
		switch (this.state) {
			case CONFIG_STATE.INIT:
				return [CONFIG_PROMPTS.SELECT_MODULE]
			case CONFIG_STATE.SELECTING_PROPERTY:
				return [CONFIG_PROMPTS.SELECT_PROPERTY, CONFIG_PROMPTS.UP]
			case CONFIG_STATE.VIEW_INFO:
				return [
					CONFIG_PROMPTS.SHOW_VALUE,
					CONFIG_PROMPTS.EDIT_VALUE,
					CONFIG_PROMPTS.UP,
				]
			case CONFIG_STATE.VIEW_VALUE:
				return [
					...(hasPages ? [CONFIG_PROMPTS.SELECT_PAGE] : []),
					CONFIG_PROMPTS.SHOW_INFO,
					CONFIG_PROMPTS.EDIT_VALUE,
					CONFIG_PROMPTS.UP,
				]
			case CONFIG_STATE.EDIT_VALUE:
				const nullable = this.currentProperty?.schema?.is(null)
				return [
					CONFIG_EDIT_PROMPTS.SET,
					...(nullable ? [CONFIG_EDIT_PROMPTS.DELETE] : []),
					CONFIG_PROMPTS.DIVIDER,
					...(hasPages ? [CONFIG_PROMPTS.SELECT_PAGE] : []),
					CONFIG_PROMPTS.SHOW_INFO,
					CONFIG_PROMPTS.UP,
				]
		}
	}

	get display(): {
		showInfo?: boolean
		showValue?: boolean
		editValue?: boolean
	} {
		switch (this.state) {
			case CONFIG_STATE.VIEW_INFO:
				return { showInfo: true }
			case CONFIG_STATE.VIEW_VALUE:
				return { showValue: true }
			case CONFIG_STATE.EDIT_VALUE:
				return { editValue: true }
			default:
				return {}
		}
	}

	processCommand(message: Message): void {
		const command = message.content.toLowerCase()
		if (command === CONFIG_SUBCOMMANDS.SHOW) {
			this.state = CONFIG_STATE.VIEW_VALUE
			this.valuePage = 1
		} else if (command === CONFIG_SUBCOMMANDS.INFO) {
			this.state = CONFIG_STATE.VIEW_INFO
			this.valuePage = 1
		} else if (command === CONFIG_SUBCOMMANDS.EDIT) {
			this.state = CONFIG_STATE.EDIT_VALUE
			this.valuePage = 1
		} else if (command.split(' ')[0] === CONFIG_SUBCOMMANDS.PAGE) {
			if (this.state === CONFIG_STATE.VIEW_VALUE) {
				if (this.currentProperty?.listValue) {
					const page = command.split(' ')[1]
					if (!validatePageNumber(this.currentProperty.value, page))
						throw `Invalid page number \`${page}\``
					else this.valuePage = parseInt(page)
				}
			} else
				throw `The \`${CONFIG_SUBCOMMANDS.PAGE}\` command is not valid here`
		} else if (CONFIG_QUIT_COMMANDS.includes(command)) this.end = true
		else {
			const pathString = message.command
				? Discord.stripCommand(message.content)
				: command
			const pathArr = Discord.splitArgs(pathString)
			if (pathArr[0]) {
				this.currentProperty = traversePath(this.currentProperty, pathArr)
				if (!this.currentProperty) this.state = CONFIG_STATE.INIT
				else if (this.currentProperty.properties)
					this.state = CONFIG_STATE.SELECTING_PROPERTY
				else this.state = CONFIG_STATE.VIEW_INFO
			}
		}
	}
}
