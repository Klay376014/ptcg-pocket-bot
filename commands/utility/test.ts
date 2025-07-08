import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('test')
		.setDescription('Tell who is the best trainer'),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply(`${interaction.user.username}說︰最棒的訓練家是勾勾姐姐！`);
	}
}