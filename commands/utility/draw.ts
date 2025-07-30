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
	{ name: '最強的基因 - 皮卡丘', value: 'Pikachu' },
	{ name: '最強的基因 - 噴火龍', value: 'Charizard' },
	{ name: '最強的基因 - 超夢', value: 'Mewtwo' },
	{ name: '幻遊島', value: 'Mew' },
	{ name: '時空激鬥 - 帝牙盧卡', value: 'Dialga' },
	{ name: '時空激鬥 - 帕路奇亞', value: 'Palkia' },
	{ name: '超克之光', value: 'Arceus' },
	{ name: '嗨放異彩', value: 'Shining' },
	{ name: '雙天之守護者 - 索爾迦雷歐', value: 'Solgaleo' },
	{ name: '雙天之守護者 - 露奈雅拉', value: 'Lunala' },
	{ name: '異次元危機', value: 'Extradimensional' },
	{ name: '伊布花園', value: 'Eevee' },
	{ name: '天與海的指引 - 鳳王', value: 'Ho-Oh' },
	{ name: '天與海的指引 - 洛奇亞', value: 'Lugia' },
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

			const [mode, selectedPack] = packInteraction.customId.split('_');

			await packInteraction.update({
				content: `你選擇的卡包是：${packChoices.find(pack => pack.value === selectedPack)?.name ?? ''} ...`,
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