const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('server')
		.setDescription('Provides information about the server.'),
	category: 'Utility',
	async execute(interaction) {
		const { guild } = interaction;
		const owner = await guild.fetchOwner();
		const created = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`;
		const boostCount = guild.premiumSubscriptionCount ?? 0;

		const embed = new EmbedBuilder()
			.setColor(0x2ecc71)
			.setTitle(guild.name)
			.setThumbnail(guild.iconURL({ size: 256 }))
			.addFields(
				{ name: 'Server ID', value: guild.id, inline: true },
				{ name: 'Owner', value: owner.user.tag, inline: true },
				{ name: 'Members', value: guild.memberCount.toString(), inline: true },
				{ name: 'Boosts', value: boostCount.toString(), inline: true },
				{ name: 'Created', value: created, inline: false },
			)
			.setFooter({ text: `Requested by ${interaction.user.tag}` })
			.setTimestamp();

		await interaction.reply({ embeds: [embed], ephemeral: true });
	},
};
