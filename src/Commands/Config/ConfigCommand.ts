import { DBotCommand } from '../Command'
import { addConfigurator, terminateConfigurators } from './Configurator'
import clearModule from 'clear-module'
import { CONFIG_COMMAND } from './ConfigStrings'

export const ConfigCommand = new DBotCommand({
	execute({ message }) {
		addConfigurator(message)
	},
	terminate() {
		terminateConfigurators()
		clearModule.single('./Configurator')
		clearModule.single('./ConfigDisplay')
		clearModule.single('./ConfigState')
		clearModule.single('./TraversePath')
		clearModule.single('./ConfigStrings')
	},
	label: CONFIG_COMMAND,
	commandOptions: {
		requirements: { permissions: { administrator: true } },
	},
})
