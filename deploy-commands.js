const path = require('node:path');
const { REST, Routes } = require('discord.js');
const { clientId, token } = require('./config.json');
const { loadCommandModules } = require('./loaders/commands');

const commandsPath = path.join(__dirname, 'commands');
const { commands, invalidCommands } = loadCommandModules(commandsPath);
const commandsData = commands.map((command) => command.data.toJSON());

for (const filePath of invalidCommands) {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
    try {
        console.log(`Started refreshing ${commandsData.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commandsData },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();
