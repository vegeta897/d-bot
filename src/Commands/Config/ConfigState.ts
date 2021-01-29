import { CONFIG_PROMPTS, CONFIG_SUBCOMMANDS } from './ConfigStrings'
import { IExportProperty } from '../../Config/Property'

export enum CONFIG_STATE {
	INIT,
	SELECTING_PROPERTY,
	VIEW_VALUE,
	VIEW_INFO,
	EDIT_VALUE,
}

export class ConfigState {
	state: CONFIG_STATE = CONFIG_STATE.INIT

	get prompts(): CONFIG_PROMPTS[] {
		switch (this.state) {
			case CONFIG_STATE.INIT:
				return [CONFIG_PROMPTS.SELECT_MODULE]
			case CONFIG_STATE.SELECTING_PROPERTY:
				return [CONFIG_PROMPTS.SELECT_PROPERTY]
			case CONFIG_STATE.VIEW_INFO:
				return [CONFIG_PROMPTS.SHOW_VALUE, CONFIG_PROMPTS.EDIT_VALUE]
			case CONFIG_STATE.VIEW_VALUE:
				return [CONFIG_PROMPTS.SHOW_INFO, CONFIG_PROMPTS.EDIT_VALUE]
			case CONFIG_STATE.EDIT_VALUE:
				return []
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

	processCommand(command: string): boolean {
		if (command === CONFIG_SUBCOMMANDS.SHOW) {
			this.state = CONFIG_STATE.VIEW_VALUE
		} else if (command === CONFIG_SUBCOMMANDS.INFO) {
			this.state = CONFIG_STATE.VIEW_INFO
		} else if (command === CONFIG_SUBCOMMANDS.EDIT) {
			this.state = CONFIG_STATE.EDIT_VALUE
		} else return false
		return true
	}

	afterTraverse(property: IExportProperty | null): void {
		if (!property) this.state = CONFIG_STATE.INIT
		else if (property.properties) this.state = CONFIG_STATE.SELECTING_PROPERTY
		else this.state = CONFIG_STATE.VIEW_INFO
	}
}
