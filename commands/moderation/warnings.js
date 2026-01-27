const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getWarnings } = require('../../services/warnings');

const formatWarning = (warning, index) => {
    const date = new Date(warning.createdAt);
    const timestamp = Number.isNaN(date.getTime())
        ? 'Unknown date'
        : date.toLocaleString();

    return `${index + 1}. ${warning.reason} (by <@${warning.moderatorId}> on ${timestamp})`;
};

module.exports = {
    permissionGroup: 'moderation',
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View a member warning history.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to check')
                .setRequired(true)),
    category: 'Moderation',
    async execute(interaction) {
        const target = interaction.options.getUser('target');

        if (!interaction.guildId) {
            return interaction.reply({
                content: 'Warnings can only be checked inside a server.',
                ephemeral: true,
            });
        }

        const warnings = await getWarnings({
            guildId: interaction.guildId,
            userId: target.id,
        });

        if (warnings.length === 0) {
            return interaction.reply({
                content: `${target.tag} has no warnings.`,
            });
        }

        const recentWarnings = warnings.slice(-5).map(formatWarning).join('\n');

        return interaction.reply({
            content: `Warnings for ${target.tag} (total ${warnings.length}):\n${recentWarnings}`,
        });
    },
};
