const {Events} = require('discord.js');
const {connectToDatabase} = require('../db.js');

module.exports = {
    name: Events.ClientReady,
    async execute(client) {
        const dbClient = await connectToDatabase();
        const db = dbClient.db('discord');
        const tempBanCollection = db.collection('tempban');
        const scheduled = new Map();
        async function unbanNow(banData) {
            try {
                const guild = await client.guilds.fetch(banData.guildId);
                await guild.bans.remove(banData.userId);
                await tempBanCollection.deleteOne({_id: banData._id});
            } catch (err) {
                console.error('Error unbanning member:', err);
            } finally {
                scheduled.delete(String(banData._id));
            }
        }

        function scheduleUnban(banData) {
            const id = String(banData._id);
            if (scheduled.has(id)) return;

            const delay = banData.banTime - Date.now(); // assumes banTime is a future timestamp (ms)
            if (delay <= 0) {
                // already expired -> unban immediately
                void unbanNow(banData);
                return;
            }

            const timeoutId = setTimeout(() => void unbanNow(banData), delay);
            scheduled.set(id, timeoutId);
        }

        async function scanAndSchedule() {
            try {
                const now = Date.now();
                const futureBans = await tempBanCollection.find({banTime: {$gt: now}}).toArray();
                futureBans.forEach(scheduleUnban);
                const expired = await tempBanCollection.find({banTime: {$lte: now}}).toArray();
                expired.forEach((b) => void unbanNow(b));
            } catch (err) {
                console.error('Error scanning tempbans:', err);
            }
        }

        // Initial load
        await scanAndSchedule();

        // Poll every 10 seconds for newly inserted bans
        setInterval(scanAndSchedule, 10_000);
    },
};