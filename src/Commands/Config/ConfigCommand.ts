import { DBotCommand } from '../Command'
import { addConfigurator, terminateConfigurators } from './Configurator'
import clearModule from 'clear-module'

export const ConfigCommand = new DBotCommand({
	execute({ message }) {
		addConfigurator(message)
	},
	terminate() {
		terminateConfigurators()
		clearModule.single('./Configurator')
		clearModule.single('./ConfigDisplay')
	},
	label: 'config',
	commandOptions: {
		requirements: { permissions: { administrator: true } },
	},
})
