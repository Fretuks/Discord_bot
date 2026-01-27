const quiz = require('./quiz.json');
const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const { connectToDatabase } = require('../../db.js');

const QUIZ_REWARD = 50;
const QUIZ_TIMEOUT_MS = 30000;

const normalizeAnswer = (answer) => answer.trim().toLowerCase();

const buildRows = (choices) => {
    const rows = [];
    for (let i = 0; i < choices.length; i += 5) {
        const slice = choices.slice(i, i + 5);
        const row = new ActionRowBuilder().addComponents(
            slice.map((choice, index) =>
                new ButtonBuilder()
                    .setCustomId(`quiz_choice_${i + index}`)
                    .setLabel(choice)
                    .setStyle(ButtonStyle.Primary)
            )
        );
        rows.push(row);
    }
    return rows;
};

const disableRows = (rows) =>
    rows.map((row) => {
        const disabledRow = ActionRowBuilder.from(row);
        disabledRow.components = disabledRow.components.map((component) =>
            ButtonBuilder.from(component).setDisabled(true)
        );
        return disabledRow;
    });

const awardReward = async (userId) => {
    const dbClient = await connectToDatabase();
    const db = dbClient.db('discord');
    const collection = db.collection('currency');

    await collection.updateOne(
        { userID: userId },
        { $inc: { balance: QUIZ_REWARD } },
        { upsert: true }
    );
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quiz')
        .setDescription('Start a cool quiz'),
    category: 'Games',
    async execute(interaction) {
        const item = quiz[Math.floor(Math.random() * quiz.length)];
        const answers = (item.answers ?? [])
            .map(normalizeAnswer)
            .filter(Boolean);
        const hasChoices = Array.isArray(item.choices) && item.choices.length > 0;

        const embed = new EmbedBuilder()
            .setColor(0xf7b731)
            .setTitle('Quiz Time!')
            .setDescription(item.question)
            .setFooter({ text: 'You have 30 seconds to answer.' });

        if (!interaction.channel) {
            return interaction.reply({
                content: 'I need a channel to run the quiz.',
                ephemeral: true,
            });
        }

        if (hasChoices) {
            const choices = item.choices;
            const rows = buildRows(choices);
            const reply = await interaction.reply({
                embeds: [embed],
                components: rows,
                fetchReply: true,
            });

            try {
                const selection = await reply.awaitMessageComponent({
                    filter: (component) => component.user.id === interaction.user.id,
                    time: QUIZ_TIMEOUT_MS,
                });

                const choiceIndex = Number(selection.customId.split('_').pop());
                const selected = choices[choiceIndex];
                const isCorrect = answers.includes(normalizeAnswer(selected));

                const resultText = isCorrect
                    ? `${selection.user} nailed it! **${selected}** is correct. +${QUIZ_REWARD} coins! 🎉`
                    : `Nice try! The correct answer was **${item.answers[0]}**.`;

                if (isCorrect) {
                    await awardReward(selection.user.id);
                }

                await selection.update({
                    content: resultText,
                    embeds: [],
                    components: disableRows(rows),
                });
            } catch (err) {
                await interaction.editReply({
                    content: `⏳ Time's up! The correct answer was **${item.answers[0]}**.`,
                    embeds: [],
                    components: disableRows(rows),
                });
            }

            return;
        }

        await interaction.reply({ embeds: [embed] });

        const collectorFilter = (response) =>
            response.author.id === interaction.user.id &&
            answers.includes(normalizeAnswer(response.content));

        try {
            const collected = await interaction.channel.awaitMessages({
                filter: collectorFilter,
                max: 1,
                time: QUIZ_TIMEOUT_MS,
                errors: ['time'],
            });

            const correctAnswer = collected.first();
            await awardReward(correctAnswer.author.id);

            await interaction.followUp(
                `${correctAnswer.author} got the correct answer: **${correctAnswer.content}**! +${QUIZ_REWARD} coins! 🎉`
            );
        } catch (err) {
            await interaction.followUp(
                `⏳ Time's up! Nobody got the correct answer. The correct answers were: **${item.answers.join(', ')}**.`
            );
        }
    },
};
