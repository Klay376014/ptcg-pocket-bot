import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
interface Card {
	set: string
	number: number
	rarity: string
	rarityCode: string
	imageName: string
	label: { slug: string, eng: string }
	packs: string[]
}
const rarityMap = {
  'C': '🔷',
  'U': '🔷🔷',
  'R': '🔷🔷🔷',
  'RR': '🔷🔷🔷🔷',
  'AR': '⭐',
  'SR': '⭐⭐',
  'SAR': '⭐⭐',
  'IM': '⭐⭐⭐',
  'UR': '👑',
  'S': '✴️',
  'SSR': '✴️✴️'
}

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
		.setDescription('Draw a pack!')
        .addStringOption(option =>
            option.setName('pack')
                .setDescription('The card pack you want to draw from.')
                .setRequired(true)
                .addChoices(...packChoices)
        ),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply()
		try {
            const selectedPack = interaction.options.getString('pack', true);
			const response = await fetch(
				'https://ptcg-pocket-simulator.vercel.app/api/draw',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ packId: selectedPack }),
				},
			)
			if (!response.ok) {
				throw new Error(`API call failed with status: ${response.status}`)
			}
			const data = (await response.json()) as Card[]
			const cardImages = data.map(
                (card) =>
                    `https://raw.githubusercontent.com/flibustier/pokemon-tcg-exchange/main/public/images/cards/${card.imageName}`,
            )
            if (cardImages && cardImages.length > 0) {
                const cardList = data.map(card => {
                    const rarityIcon = rarityMap[card.rarityCode as keyof typeof rarityMap] || ''
                    return `${card.label.eng}   ${rarityIcon}`
                })
                const messageContent = `${interaction.user.displayName} opened a ${selectedPack} pack and drew:\r\n- ${cardList.join('\r\n- ')}`
                await interaction.editReply({ content: messageContent, files: cardImages })
            } else {
				await interaction.editReply(
					'Sorry, I couldn\'t draw any cards from the pack. Please try again.',
				)
			}
		} catch (error) {
            console.error(error);
			await interaction.editReply(
				'Sorry, there was an error trying to draw cards!',
			)
		}
	},
}