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
	},
	label: 'config',
	commandOptions: {
		requirements: { permissions: { administrator: true } },
	},
})
