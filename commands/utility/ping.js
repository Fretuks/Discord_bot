const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s responsiveness.'),
    category: 'Utility',
    async execute(interaction) {
        const sentAt = Date.now();
        await interaction.reply({ content: 'Pinging...', ephemeral: true });
        const latency = Date.now() - sentAt;
        const apiLatency = Math.round(interaction.client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor(0x34ace0)
            .setTitle('Pong! 🏓')
            .addFields(
                { name: 'Round Trip', value: `${latency}ms`, inline: true },
                { name: 'API Latency', value: `${apiLatency}ms`, inline: true },
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], content: null });
    },
};
