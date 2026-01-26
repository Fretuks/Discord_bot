const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Information about this bot and creator'),
    async execute(interaction) {
        const exampleEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('About This Bot')
            .setDescription('A multipurpose Discord bot focused on helpful utilities, moderation, and fun community features.')
            .addFields(
                { name: 'Highlights', value: 'Timezone converter, quiz games, and a growing currency system.' },
                { name: 'Created By', value: interaction.client.user?.username ?? 'Bot Creator' }
            )
            .setImage('https://i.postimg.cc/QdZZwKVD/Screenshot-2024-12-25-005933.png')
            .setTimestamp();

        await interaction.reply({
            embeds: [exampleEmbed]
        });
    }
};
