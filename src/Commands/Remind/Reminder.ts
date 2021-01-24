import hash from 'object-hash'
import JSONFile from '../../Core/Storage/JSONFile'
import Discord from '../../Core/Discord'
import schedule, { Job } from 'node-schedule'
import { Guild, TextChannel } from 'eris'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { ChannelID } from '../../Types/Discord'

dayjs.extend(duration)
dayjs.extend(relativeTime)

type ReminderType = {
	time: number
	text: string
	creator: string
	channel: string
}

const initData: { reminders: ReminderType[] } = { reminders: [] }
const reminderData = new JSONFile('reminders', { initData })

export default class Reminder implements ReminderType {
	time
	text
	creator
	channel

	constructor({ time, text, creator, channel }: ReminderType) {
		this.time = time
		this.text = text
		this.creator = creator
		this.channel = channel
		this.save()
		if (Date.now() >= this.time) sendReminder(this).catch(console.error)
		else {
			reminderJobs.push(
				schedule.scheduleJob(new Date(this.time), async () => {
					sendReminder(this).catch(console.error)
				})
			)
		}
	}

	getHumanDuration(): string {
		return dayjs.duration(this.time - Date.now(), 'ms').humanize()
	}

	private getOtherReminders(): ReminderType[] {
		return reminderData
			.get('reminders')
			.filter((r) => Reminder.hash(r) !== Reminder.hash(this))
	}

	update(updateObj: Partial<ReminderType>): void {
		Object.assign(this, updateObj)
		this.save()
	}

	private save(): void {
		const { time, text, creator, channel } = this
		reminderData.set(
			'reminders',
			[{ time, text, creator, channel }, ...this.getOtherReminders()].sort(
				(a, b) => a.time - b.time
			)
		)
	}

	delete(): void {
		reminderData.set('reminders', this.getOtherReminders())
	}

	static hash(reminder: ReminderType): string {
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
			Discord.bot.channelGuildMap[reminder.channel] as ChannelID
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
	Discord.sendMessage(channel, message).then(() => reminder.delete())
}

const reminderJobs: Job[] = []

export function initReminders(): void {
	terminateReminders()
	reminderData.get('reminders').forEach((r) => new Reminder(r))
}

export function terminateReminders(): void {
	reminderJobs.forEach((job) => job.cancel())
}
