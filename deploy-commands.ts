import { REST, Routes, type RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// --- Environment Variable Setup ---
const token = process.env.DISCORD_TOKEN
const clientId = process.env.CLIENT_ID
const guildId = process.env.GUILD_ID

if (!token || !clientId || !guildId) {
	throw new Error('Ensure DISCORD_TOKEN, CLIENT_ID, and GUILD_ID are defined in your .env file.')
}

// --- Main Deployment Logic in an async IIFE ---
(async () => {
	try {
		const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []

		// Use import.meta.url to get the correct path in ES Modules
		const __dirname = path.dirname(fileURLToPath(import.meta.url))
		const foldersPath = path.join(__dirname, 'commands')
		const commandFolders = fs.readdirSync(foldersPath)

		for (const folder of commandFolders) {
			const commandsPath = path.join(foldersPath, folder)
			// Correctly filter for .ts files
			const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'))

			for (const file of commandFiles) {
				const filePath = path.join(commandsPath, file)
				// Use async import() for ES Modules
				const commandModule = await import(filePath)
				const command = commandModule.default

				if (command && 'data' in command && 'execute' in command) {
					commands.push(command.data.toJSON())
				} else {
					console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`)
				}
			}
		}

		const rest = new REST().setToken(token)

		console.log(`Started refreshing ${commands.length} application (/) commands.`)

		const data = (await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })) as any[]

		console.log(`Successfully reloaded ${data.length} application (/) commands.`)
	} catch (error) {
		console.error(error)
	}
})()