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

const normalModePacks = packChoices

export default {
	data: new SlashCommandBuilder()
		.setName('draw')
		.setDescription('抽一個喜歡的卡包吧！'),
	async execute(interaction: ChatInputCommandInteraction) {
		const modeButtons = [
			new ButtonBuilder()
				.setCustomId('funMode')
				.setLabel('歡樂模式（所有卡片機率平等）')
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId('normalMode')
				.setLabel('一般模式（就像你平常手遊抽的那樣）')
				.setStyle(ButtonStyle.Primary),
		];

		const modeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(modeButtons);

		const response = await interaction.reply({
			content: '請選擇遊戲模式：',
			components: [modeRow],
			flags: MessageFlags.Ephemeral,
		});

		const collectorFilter = (i: ButtonInteraction) => i.user.id === interaction.user.id;

		try {
			const modeInteraction = await response.awaitMessageComponent({
				filter: collectorFilter,
				componentType: ComponentType.Button,
				time: 60_000,
			});

			const selectedMode = modeInteraction.customId;
			const isNormalMode = selectedMode === 'normalMode';
			const availablePacks = isNormalMode ? normalModePacks : packChoices;

			const buttonStyles = [ButtonStyle.Primary, ButtonStyle.Success, ButtonStyle.Danger, ButtonStyle.Secondary];
			const buttons = availablePacks.map((pack, index) =>
				new ButtonBuilder()
					.setCustomId(`${selectedMode}_${pack.value}`)
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

			await modeInteraction.update({
				content: `你選擇了${isNormalMode ? '一般模式' : '歡樂模式'}，請選擇卡包：`,
				components: rows,
			});

			const packInteraction = await response.awaitMessageComponent({
				filter: collectorFilter,
				componentType: ComponentType.Button,
				time: 60_000,
			});

      console.log(packInteraction)
			const [mode, selectedPack] = packInteraction.customId.split('_');

      console.log(mode, selectedPack)
			await packInteraction.update({
				content: `你選擇的是：${selectedPack} 卡包...`,
				components: [],
			});

			const apiPayload = {
				packId: selectedPack,
				useRarity: mode !== 'funMode',
			};

			const apiResponse = await fetch(
				'https://ptcg-pocket-simulator.vercel.app/api/draw',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(apiPayload),
				},
			);

			if (!apiResponse.ok) {
				await packInteraction.editReply({
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
				const modeText = mode === 'funMode' ? '（歡樂模式）' : '（一般模式）';
				const messageContent = `${
					interaction.user.displayName
				} 從 ${selectedPack} 卡包${modeText}中抽出了下列卡片：\r\n- ${cardList.join(
					'\r\n- '
				)}`;
				if (interaction.channel && 'send' in interaction.channel) {
					await interaction.channel.send({
						content: messageContent,
						files: cardImages,
					});
				}
			} else {
				await packInteraction.editReply({
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