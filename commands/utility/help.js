const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Gives all available commands.'),
    async execute(interaction) {
        const commandDetails = interaction.client.commands
            .map(cmd => ({
                name: cmd.data.name,
                description: cmd.data.description,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const helpMessage = commandDetails
            .map(detail => `• **/${detail.name}** — ${detail.description}`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x4b7bec)
            .setTitle('Available Commands')
            .setDescription(helpMessage)
            .setFooter({ text: `${commandDetails.length} commands loaded.` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
