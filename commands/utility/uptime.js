const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const formatDuration = (totalSeconds) => {
    const seconds = Math.floor(totalSeconds % 60);
    const minutes = Math.floor((totalSeconds / 60) % 60);
    const hours = Math.floor((totalSeconds / 3600) % 24);
    const days = Math.floor(totalSeconds / 86400);

    const parts = [
        days ? `${days}d` : null,
        hours ? `${hours}h` : null,
        minutes ? `${minutes}m` : null,
        `${seconds}s`,
    ].filter(Boolean);

    return parts.join(' ');
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Display how long the bot has been running.'),
    category: 'Utility',
    async execute(interaction) {
        const uptimeSeconds = process.uptime();
        const embed = new EmbedBuilder()
            .setColor(0x45aaf2)
            .setTitle('Bot Uptime')
            .setDescription(`Online for **${formatDuration(uptimeSeconds)}**.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
