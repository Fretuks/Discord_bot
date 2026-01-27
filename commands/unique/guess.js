const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guess')
        .setDescription('Try to guess a number between 1 and 10.')
        .addIntegerOption(option =>
            option
                .setName('number')
                .setDescription('Your guess (1-10)')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(true)),
    category: 'Unique',
    async execute(interaction) {
        const guess = interaction.options.getInteger('number');
        const answer = Math.floor(Math.random() * 10) + 1;

        if (guess === answer) {
            return interaction.reply({
                content: `🎉 Correct! The number was **${answer}**.`,
            });
        }

        return interaction.reply({
            content: `Not quite! The number was **${answer}**. Try again!`,
        });
    },
};
