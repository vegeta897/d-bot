export default jest.fn().mockImplementation(() => ({
	getHumanDuration: () => 'duration',
}))

export const initReminders = jest.fn()
export const terminateReminders = jest.fn()
