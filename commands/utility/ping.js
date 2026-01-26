const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s responsiveness.'),
    async execute(interaction) {
        const sentAt = Date.now();
        await interaction.reply({ content: 'Pinging...', ephemeral: true });
        const latency = Date.now() - sentAt;
        const apiLatency = Math.round(interaction.client.ws.ping);

        await interaction.editReply({
            content: `Pong! **${latency}ms** (API: **${apiLatency}ms**)`,
        });
    },
};
