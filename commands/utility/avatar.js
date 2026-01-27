const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Display a user\'s avatar in full size.')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to fetch the avatar for.')
        ),
    category: 'Utility',
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') ?? interaction.user;
        const avatarUrl = targetUser.displayAvatarURL({ size: 1024, extension: 'png' });

        const embed = new EmbedBuilder()
            .setColor(0xa55eea)
            .setTitle(`${targetUser.username}'s Avatar`)
            .setImage(avatarUrl)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
