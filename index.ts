import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client, Collection, Events, GatewayIntentBits, MessageFlags, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'

const token = process.env.DISCORD_TOKEN
if (!token) {
	throw new Error('DISCORD_TOKEN is not defined in the .env file.')
}

// Define a more specific and reusable type for our commands
interface Command {
	data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
	execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
}

// Extend the base Client to include our custom commands collection
class MyClient extends Client {
	public commands: Collection<string, Command> = new Collection();
}

const client = new MyClient({ intents: [GatewayIntentBits.Guilds] })

// Asynchronous command loader function
const loadCommands = async () => {
	// In ES Modules, __dirname is not available. We derive it from `import.meta.url`.
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const foldersPath = path.join(__dirname, 'commands');
	const commandFolders = fs.readdirSync(foldersPath);

	for (const folder of commandFolders) {
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			// Use modern async import() instead of require()
			const commandModule = await import(filePath);
			const command = commandModule.default as Command;

			// Now the check will succeed because we are accessing the default export
			if (command && 'data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
				console.log(`[SUCCESS] Loaded command: ${command.data.name}`);
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}
};

client.on(Events.InteractionCreate, async interaction => {
  // 只執行 slash command
	if (!interaction.isChatInputCommand()) return
  
	const command = client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	await command.execute(interaction);
})
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`)
})

// Load all commands first, then log the client in.
loadCommands().then(() => {
	client.login(token);
});
