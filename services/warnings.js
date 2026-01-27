const { connectToDatabase } = require('../db');

const WARNING_COLLECTION = 'warnings';

const getWarningsCollection = async () => {
    const client = await connectToDatabase();
    return client.db('discord').collection(WARNING_COLLECTION);
};

const addWarning = async ({ guildId, userId, moderatorId, reason }) => {
    const collection = await getWarningsCollection();
    const warningEntry = {
        reason,
        moderatorId,
        createdAt: new Date(),
    };

    const result = await collection.findOneAndUpdate(
        { guildId, userId },
        {
            $push: { warnings: warningEntry },
            $setOnInsert: { guildId, userId },
        },
        { upsert: true, returnDocument: 'after' },
    );

    const warnings = result.value?.warnings ?? [];

    return { warnings, warningEntry };
};

const getWarnings = async ({ guildId, userId }) => {
    const collection = await getWarningsCollection();
    const record = await collection.findOne({ guildId, userId });

    return record?.warnings ?? [];
};

module.exports = {
    addWarning,
    getWarnings,
};
