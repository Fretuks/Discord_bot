const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('user')
		.setDescription('Provides information about a user.')
		.addUserOption(option =>
			option
				.setName('target')
				.setDescription('User to look up')
				.setRequired(false)),
	category: 'Utility',
	async execute(interaction) {
		const target = interaction.options.getUser('target') ?? interaction.user;
		const member = await interaction.guild.members.fetch(target.id);

		const embed = new EmbedBuilder()
			.setColor(0x4b7bec)
			.setTitle(`${target.username}`)
			.setThumbnail(target.displayAvatarURL({ size: 256 }))
			.addFields(
				{ name: 'Tag', value: target.tag, inline: true },
				{ name: 'User ID', value: target.id, inline: true },
				{ name: 'Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>` },
				{ name: 'Joined Server', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : 'Unknown' },
			)
			.setFooter({ text: `Requested by ${interaction.user.tag}` })
			.setTimestamp();

		await interaction.reply({ embeds: [embed], ephemeral: true });
	},
};
