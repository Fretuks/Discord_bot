const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mute")
        .setDescription("Temporarily mute a member with a timeout.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to mute')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('duration')
                .setDescription('The duration of the mute (in minutes)')
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason of the mute')),
    category: 'Moderation',
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const durationMs = duration * 60 * 1000;
        const member = await interaction.guild.members.fetch(target.id);

        if (!member.moderatable) {
            return interaction.reply({
                content: 'I cannot mute that member. Check my role permissions and hierarchy.',
                ephemeral: true,
            });
        }

        await member.timeout(durationMs, reason);

        return interaction.reply({
            content: `Muted ${target.tag} for **${duration} minutes**. Reason: ${reason}`,
        });
    },
};
