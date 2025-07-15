import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	MessageFlags,
  ButtonInteraction,
} from 'discord.js';

interface Card {
	set: string;
	number: number;
	rarity: string;
	rarityCode: string;
	imageName: string;
	label: { slug: string; eng: string };
	packs: string[];
}
const rarityMap = {
	C: '🔷',
	U: '🔷🔷',
	R: '🔷🔷🔷',
	RR: '🔷🔷🔷🔷',
	AR: '⭐',
	SR: '⭐⭐',
	SAR: '⭐⭐',
	IM: '⭐⭐⭐',
	UR: '👑',
	S: '✴️',
	SSR: '✴️✴️',
};

const packChoices = [
	{ name: 'Pikachu', value: 'Pikachu' },
	{ name: 'Charizard', value: 'Charizard' },
	{ name: 'Mewtwo', value: 'Mewtwo' },
	{ name: 'Mew', value: 'Mew' },
	{ name: 'Dialga', value: 'Dialga' },
	{ name: 'Palkia', value: 'Palkia' },
	{ name: 'Arceus', value: 'Arceus' },
	{ name: 'Shining', value: 'Shining' },
	{ name: 'Lunala', value: 'Lunala' },
	{ name: 'Solgaleo', value: 'Solgaleo' },
	{ name: 'Extradimensional', value: 'Extradimensional' },
	{ name: 'Eevee', value: 'Eevee' },
];

export default {
	data: new SlashCommandBuilder()
		.setName('draw')
		.setDescription('抽一個喜歡的卡包吧！'),
	async execute(interaction: ChatInputCommandInteraction) {
		const buttonStyles = [ButtonStyle.Primary, ButtonStyle.Success, ButtonStyle.Danger, ButtonStyle.Secondary];
		const buttons = packChoices.map((pack, index) =>
			new ButtonBuilder()
				.setCustomId(pack.value)
				.setLabel(pack.name)
				.setStyle(buttonStyles[index % buttonStyles.length]),
		);

		const rows: ActionRowBuilder<ButtonBuilder>[] = [];
		for (let i = 0; i < buttons.length; i += 5) {
			rows.push(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					buttons.slice(i, i + 5),
				),
			);
		}

		const response = await interaction.reply({
			content: '請選擇卡包︰',
			components: rows,
			flags: MessageFlags.Ephemeral,
		});

		const collectorFilter = (i: ButtonInteraction) => i.user.id === interaction.user.id;

		try {
			const buttonInteraction = await response.awaitMessageComponent({
				filter: collectorFilter,
				componentType: ComponentType.Button,
				time: 60_000,
			});
			const selectedPack = buttonInteraction.customId;

			await buttonInteraction.update({
				content: `你選擇的是︰${selectedPack} 卡包...`,
				components: [],
			});

			const apiResponse = await fetch(
				'https://ptcg-pocket-simulator.vercel.app/api/draw',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ packId: selectedPack }),
				},
			);

			if (!apiResponse.ok) {
				await buttonInteraction.editReply({
					content: `API call failed with status: ${apiResponse.status}`,
				});
				return;
			}

			const data = (await apiResponse.json()) as Card[];
			const cardImages = data.map(
				(card) =>
					`https://raw.githubusercontent.com/flibustier/pokemon-tcg-exchange/main/public/images/cards/${card.imageName}`,
			);

			if (cardImages && cardImages.length > 0) {
				const cardList = data.map((card) => {
					const rarityIcon =
						rarityMap[card.rarityCode as keyof typeof rarityMap] || '';
					return `${card.label.eng}   ${rarityIcon}`;
				});
				const messageContent = `${
					interaction.user.displayName
				} 從 ${selectedPack} 卡包中抽出了下列卡片︰\r\n- ${cardList.join(
					'\r\n- '
				)}`;
				if (interaction.channel && 'send' in interaction.channel) {
					await interaction.channel.send({
					content: messageContent,
					files: cardImages,
				})
				}
			} else {
				await buttonInteraction.editReply({
					content: '卡包出了問題！沒有抽到卡片QQ',
				});
			}
		} catch (error) {
			console.error(error);
			await interaction.editReply({
				content:
					'An error occurred or the selection timed out. Please try again.',
				components: [],
			});
		}
	},
};