const fs = require('node:fs');
const path = require('node:path');
const {MongoClient, ServerApiVersion} = require('mongodb');

const loadConfig = () => {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        return require(configPath);
    }
    return {};
};

const config = loadConfig();
const MONGODB_URI = process.env.MONGODB_URI || config.mongodb;

let dbClient;

async function connectToDatabase() {
    if (!dbClient) {
        if (!MONGODB_URI) {
            throw new Error('Missing MongoDB connection string.');
        }

        dbClient = new MongoClient(MONGODB_URI, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });
        await dbClient.connect();
        console.log("Connected to MongoDB!");
        await dbClient.db("admin").command({ping: 1});
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    return dbClient;
}

module.exports = {
    connectToDatabase
};
