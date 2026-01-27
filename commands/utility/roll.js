const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const rollDice = (count, sides) => {
    const rolls = [];
    for (let i = 0; i < count; i += 1) {
        rolls.push(1 + Math.floor(Math.random() * sides));
    }
    return rolls;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll one or more dice with a custom number of sides.')
        .addIntegerOption((option) =>
            option
                .setName('sides')
                .setDescription('Number of sides on each die (2-100).')
                .setMinValue(2)
                .setMaxValue(100)
        )
        .addIntegerOption((option) =>
            option
                .setName('count')
                .setDescription('How many dice to roll (1-6).')
                .setMinValue(1)
                .setMaxValue(6)
        ),
    category: 'Utility',
    async execute(interaction) {
        const sidesInput = interaction.options.getInteger('sides') ?? 6;
        const countInput = interaction.options.getInteger('count') ?? 1;

        const sides = clamp(sidesInput, 2, 100);
        const count = clamp(countInput, 1, 6);
        const rolls = rollDice(count, sides);
        const total = rolls.reduce((sum, roll) => sum + roll, 0);

        const embed = new EmbedBuilder()
            .setColor(0x20bf6b)
            .setTitle('Dice Roll')
            .addFields(
                { name: 'Sides', value: `${sides}`, inline: true },
                { name: 'Dice', value: `${count}`, inline: true },
                { name: 'Total', value: `${total}`, inline: true },
                { name: 'Rolls', value: rolls.join(', ') }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
