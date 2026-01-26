const fs = require('node:fs');
const path = require('node:path');

const isJavaScriptFile = (file) => file.endsWith('.js');

const getCommandFilePaths = (commandsPath) => {
    const commandFolders = fs
        .readdirSync(commandsPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

    return commandFolders.flatMap((folder) => {
        const folderPath = path.join(commandsPath, folder);
        return fs
            .readdirSync(folderPath)
            .filter(isJavaScriptFile)
            .map((file) => path.join(folderPath, file));
    });
};

const loadCommandModules = (commandsPath) => {
    const commandFiles = getCommandFilePaths(commandsPath);
    const commands = [];
    const invalidCommands = [];

    for (const filePath of commandFiles) {
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            commands.push(command);
        } else {
            invalidCommands.push(filePath);
        }
    }

    return { commands, invalidCommands };
};

module.exports = {
    loadCommandModules,
};
