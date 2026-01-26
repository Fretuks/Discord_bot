const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const { loadCommandModules } = require('./loaders/commands');
const { loadEventModules } = require('./loaders/events');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Retrieves commands from the command folder
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const { commands, invalidCommands } = loadCommandModules(commandsPath);

for (const command of commands) {
    client.commands.set(command.data.name, command);
}

for (const filePath of invalidCommands) {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
}

// Retrieves events from the events folder
const eventsPath = path.join(__dirname, 'events');
const eventModules = loadEventModules(eventsPath);

for (const { event } of eventModules) {
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.login(token);
