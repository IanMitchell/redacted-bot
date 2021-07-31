const fetch = require('node-fetch');
const {
  REDACTED_COMMAND,
  INVITE_COMMAND,
  SUPPORT_COMMAND,
} = require('./commands.js');

const TEST_GUILD = '356522910569201664';

async function register() {
  const response = await fetch(
    // Dev
    `https://discord.com/api/v9/applications/${process.env.APPLICATION_ID}/guilds/${TEST_GUILD}/commands`,
    // Prod
    // `https://discord.com/api/v9/applications/${process.env.APPLICATION_ID}/commands`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${process.env.TOKEN}`,
      },
      method: 'PUT',
      body: JSON.stringify([REDACTED_COMMAND, INVITE_COMMAND, SUPPORT_COMMAND]),
    }
  );

  if (response.ok) {
    console.log('Registered all commands');
  } else {
    console.error('Error registering commands');
    const json = await response.text();
    console.error(json);
  }
}
register();
