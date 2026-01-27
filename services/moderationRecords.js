const { connectToDatabase } = require('../db');

const MODERATION_COLLECTION = 'moderation_records';

const getModerationCollection = async () => {
    const client = await connectToDatabase();
    return client.db('discord').collection(MODERATION_COLLECTION);
};

const updateStrikes = async ({ guildId, userId, strikes }) => {
    const collection = await getModerationCollection();
    const now = new Date();

    return collection.findOneAndUpdate(
        { guildId, userId },
        {
            $set: {
                strikes,
                lastWarnedAt: now,
                updatedAt: now,
            },
            $setOnInsert: {
                guildId,
                userId,
                actions: [],
                createdAt: now,
            },
        },
        { upsert: true, returnDocument: 'after' },
    );
};

const recordModerationAction = async ({
    guildId,
    userId,
    action,
    moderatorId,
    reason,
    metadata = {},
    stateUpdates = {},
}) => {
    const collection = await getModerationCollection();
    const now = new Date();
    const actionEntry = {
        action,
        moderatorId,
        reason,
        metadata,
        createdAt: now,
    };

    return collection.findOneAndUpdate(
        { guildId, userId },
        {
            $push: { actions: actionEntry },
            $set: {
                lastAction: action,
                lastActionAt: now,
                updatedAt: now,
                ...stateUpdates,
            },
            $setOnInsert: {
                guildId,
                userId,
                strikes: 0,
                createdAt: now,
            },
        },
        { upsert: true, returnDocument: 'after' },
    );
};

const clearBanStatus = async ({ guildId, userId }) =>
    recordModerationAction({
        guildId,
        userId,
        action: 'unban',
        moderatorId: null,
        reason: 'Temporary ban expired',
        metadata: {},
        stateUpdates: {
            isBanned: false,
            bannedUntil: null,
        },
    });

module.exports = {
    updateStrikes,
    recordModerationAction,
    clearBanStatus,
};
