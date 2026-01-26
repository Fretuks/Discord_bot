const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const MAX_DESCRIPTION = 4096;

const truncate = (text, maxLength) => {
    if (!text) return 'No summary available.';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wiki')
        .setDescription('Search Wikipedia for a topic.')
        .addStringOption(option =>
            option
                .setName('topic')
                .setDescription('Topic to search')
                .setRequired(true)),
    category: 'Utility',
    async execute(interaction) {
        const topic = interaction.options.getString('topic');
        const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;

        await interaction.deferReply();

        const response = await fetch(endpoint, {
            headers: {
                'User-Agent': 'DiscordBot/1.0 (https://github.com)',
            },
        });

        if (!response.ok) {
            return interaction.editReply({
                content: 'I could not find a Wikipedia summary for that topic.',
            });
        }

        const data = await response.json();

        const embed = new EmbedBuilder()
            .setColor(0x8e44ad)
            .setTitle(data.title ?? topic)
            .setURL(data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`)
            .setDescription(truncate(data.extract, MAX_DESCRIPTION))
            .setFooter({ text: 'Source: Wikipedia' });

        if (data.thumbnail?.source) {
            embed.setThumbnail(data.thumbnail.source);
        }

        return interaction.editReply({ embeds: [embed] });
    },
};
