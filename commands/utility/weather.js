const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const getJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json();
};

const formatTemperature = (value, unit) => `${Math.round(value)}°${unit === 'fahrenheit' ? 'F' : 'C'}`;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Get the current weather for a location.')
        .addStringOption(option =>
            option
                .setName('location')
                .setDescription('City or place name to look up')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('units')
                .setDescription('Temperature units')
                .setRequired(false)
                .addChoices(
                    { name: 'Celsius', value: 'celsius' },
                    { name: 'Fahrenheit', value: 'fahrenheit' },
                )),
    category: 'Utility',
    async execute(interaction) {
        const location = interaction.options.getString('location');
        const units = interaction.options.getString('units') ?? 'celsius';

        await interaction.deferReply();

        try {
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
            const geo = await getJson(geoUrl);
            const match = geo.results?.[0];

            if (!match) {
                return interaction.editReply({ content: 'I could not find that location. Try a more specific place name.' });
            }

            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${match.latitude}&longitude=${match.longitude}&current_weather=true&temperature_unit=${units}`;
            const weather = await getJson(weatherUrl);
            const current = weather.current_weather;

            if (!current) {
                return interaction.editReply({ content: 'Weather data is currently unavailable for that location.' });
            }

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`Weather for ${match.name}${match.country ? `, ${match.country}` : ''}`)
                .addFields(
                    { name: 'Temperature', value: formatTemperature(current.temperature, units), inline: true },
                    { name: 'Wind Speed', value: `${Math.round(current.windspeed)} km/h`, inline: true },
                    { name: 'Conditions', value: `Weather code: ${current.weathercode}`, inline: true },
                )
                .setFooter({ text: `Latitude ${match.latitude.toFixed(2)}, Longitude ${match.longitude.toFixed(2)}` })
                .setTimestamp(new Date(current.time));

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: 'Something went wrong fetching the weather. Please try again later.' });
        }
    },
};
