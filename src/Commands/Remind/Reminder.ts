import hash from 'object-hash'
import JSONFile from '../../Core/Storage/JSONFile'
import Discord from '../../Core/Discord'
import schedule, { Job } from 'node-schedule'
import { Guild, TextChannel } from 'eris'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(duration)
dayjs.extend(relativeTime)

interface IReminder {
	time: number
	text: string
	creator: string
	channel: string
	sendFailed?: true
}

const initData: { reminders: IReminder[] } = { reminders: [] }
const reminderData = new JSONFile('reminders', { initData })

export default class Reminder implements IReminder {
	time
	text
	creator
	channel
	sendFailed

	constructor({ time, text, creator, channel, sendFailed }: IReminder) {
		this.time = time
		this.text = text
		this.creator = creator
		this.channel = channel
		if (sendFailed) this.sendFailed = sendFailed
		this.save()
		if (Date.now() >= this.time) sendReminder(this).catch(console.error)
		else
			reminderJobs.push(
				schedule.scheduleJob(new Date(this.time), async () => {
					sendReminder(this).catch(console.error)
				})
			)
	}

	getHumanDuration(): string {
		return dayjs.duration(this.time - Date.now(), 'ms').humanize()
	}

	private getOtherReminders(): IReminder[] {
		return reminderData
			.get('reminders')
			.filter((r) => Reminder.hash(r) !== Reminder.hash(this))
	}

	update(updateObj: Partial<IReminder>): void {
		Object.assign(this, updateObj)
		this.save()
	}

	private save(): void {
		reminderData.set('reminders', [
			{
				time: this.time,
				text: this.text,
				creator: this.creator,
				channel: this.channel,
				sendFailed: this.sendFailed,
			},
			...this.getOtherReminders(),
		])
	}

	delete(): void {
		reminderData.set('reminders', this.getOtherReminders())
	}

	static hash(reminder: IReminder): string {
		return hash(reminder, {
			excludeKeys: (key) =>
				!['time', 'text', 'creator', 'channel'].includes(key),
		})
	}
}

async function sendReminder(reminder: Reminder): Promise<void> {
	const user = Discord.bot.users.get(reminder.creator)
	if (!user) {
		reminder.delete()
		return
	}
	let message = `${user.mention} Reminder!\n> ${reminder.text}`
	let channel = Discord.bot.getChannel(reminder.channel)
	if (!(channel instanceof TextChannel)) {
		const guild = Discord.bot.guilds.get(
			Discord.bot.channelGuildMap[reminder.channel]
		)
		if (guild instanceof Guild) {
			channel = Discord.getDefaultChannel(guild)
		} else {
			channel = await user.getDMChannel()
			message = `Reminder!\n> ${reminder.text}`
		}
	}
	const diff = Date.now() - reminder.time
	if (diff > 5000) {
		message += `\nSorry for this being ${reminder.getHumanDuration()} late!`
	}
	Discord.sendMessage(channel, message)
		.then(() => reminder.delete())
		.catch(() => reminder.update({ sendFailed: true }))
}

const reminderJobs: Job[] = []

export function initReminders(): void {
	terminateReminders()
	reminderData.get('reminders').forEach((r) => new Reminder(r))
}

export function terminateReminders(): void {
	reminderJobs.forEach((job) => job.cancel())
}
