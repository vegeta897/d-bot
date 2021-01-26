export const CONFIG_COMMAND = 'config'

export enum CONFIG_END_REASONS {
	INACTIVE = '💤 Session ended due to inactivity',
	OTHER_COMMAND = '💬 Session ended because you used another command',
	BY_USER = '☑️ Session ended by user',
	RELOAD = '🔄 Session ended due to script reload',
}

export enum CONFIG_SUBCOMMANDS {
	SHOW = 'show',
	INFO = 'info',
}

export enum CONFIG_PROMPTS {
	SELECT_MODULE = 'Type the number or name of a module to view it',
	SELECT_PROPERTY = 'Type the number or name of a property to view it',
	SHOW_VALUE = 'Type `show` to view the value of this property',
	SHOW_INFO = 'Type `info` to view information about this property',
}

export const CONFIG_QUIT_COMMANDS = ['stop', 'exit', 'quit']
