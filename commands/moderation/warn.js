const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addWarning } = require('../../services/warnings');

module.exports = {
    permissionGroup: 'moderation',
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a member and track strikes.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to warn')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason for the warning')
                .setRequired(true)),
    category: 'Moderation',
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');

        if (!interaction.guildId) {
            return interaction.reply({
                content: 'Warnings can only be issued inside a server.',
                ephemeral: true,
            });
        }

        const { warnings } = await addWarning({
            guildId: interaction.guildId,
            userId: target.id,
            moderatorId: interaction.user.id,
            reason,
        });

        return interaction.reply({
            content: `${target.tag} has been warned. Total strikes: **${warnings.length}**.`,
        });
    },
};
