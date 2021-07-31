const {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} = require('discord-interactions');
const getRawBody = require('raw-body');
const dedent = require('dedent');
const fetch = require('node-fetch');
const {
  REDACTED_COMMAND,
  INVITE_COMMAND,
  SUPPORT_COMMAND,
} = require('../commands.js');

const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${process.env.APPLICATION_ID}&scope=bot%20applications.commands&permissions=8192`;

const ADMINISTRATOR = 1n << 3n;
const MANAGE_MESSAGES = 1n << 13n;

function has(permissions, flag) {
  return (BigInt(permissions) & flag) === flag;
}

async function redact(event, response) {
  const member = event.member;
  const message = event.data.resolved.messages[event.data.target_id];

  if (
    !has(member.permissions, ADMINISTRATOR) &&
    !has(member.permissions, MANAGE_MESSAGES) &&
    member.user.id !== message.author.id
  ) {
    response.status(200).send({
      type: 4,
      data: {
        content:
          'You need the Manage Messages permission in order to use this command! Please contact a Mod or Admin to help you.',
        flags: 64,
      },
    });
    return;
  }

  const req = await fetch(
    `https://discord.com/api/v9/channels/${message.channel_id}/messages/${message.id}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${process.env.TOKEN}`,
        'X-Audit-Log-Reason': `Requested by ${member.user.username} (${member.user.id})`,
      },
      method: 'DELETE',
    }
  );

  const date = new Date(message.timestamp);
  const timestamp = Math.round(date.getTime() / 1000);

  response.status(200).send({
    type: 4,
    data: {
      content: dedent`<@${message.author.id}> wrote on <t:${timestamp}:F>:
      ${message.content
        .split('\n')
        .filter((line) => line !== '')
        .map((line) => `> ||${line}||`)
        .join('\n')}`,
    },
  });
}

module.exports = async (request, response) => {
  if (request.method === 'POST') {
    const signature = request.headers['x-signature-ed25519'];
    const timestamp = request.headers['x-signature-timestamp'];
    const rawBody = await getRawBody(request);

    const isValidRequest = verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.PUBLIC_KEY
    );

    if (!isValidRequest) {
      console.error('Invalid Request');
      return response.status(401).send({ error: 'Bad request signature ' });
    }

    const message = request.body;

    if (message.type === InteractionType.PING) {
      console.log('Handling Ping request');
      response.send({
        type: InteractionResponseType.PONG,
      });
    } else if (message.type === InteractionType.APPLICATION_COMMAND) {
      switch (message.data.name.toLowerCase()) {
        case REDACTED_COMMAND.name.toLowerCase(): {
          console.log('Redacted Request');
          redact(message, response);
          break;
        }
        case INVITE_COMMAND.name.toLowerCase(): {
          console.log('Invite request');
          const r = response.status(200).send({
            type: 4,
            data: {
              content: 'Want to use me on your server? Just add me!',
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 2,
                      style: 5,
                      label: 'Add to Server',
                      url: INVITE_URL,
                    },
                  ],
                },
              ],
              flags: 64,
            },
          });
          break;
        }
        case SUPPORT_COMMAND.name.toLowerCase(): {
          console.log('Support request');

          response.status(200).send({
            type: 4,
            data: {
              content:
                "Thanks for using my bot! Let me know what you think on twitter (@IanMitchel1). If you'd like to contribute to hosting costs, you can donate at https://github.com/sponsors/ianmitchell",
              flags: 64,
            },
          });
          break;
        }
        default: {
          console.error('Unknown Command');
          response.status(400).send({ error: 'Unknown Type' });
          break;
        }
      }
    } else {
      console.error('Unknown Type');
      response.status(400).send({ error: 'Unknown Type' });
    }
  }
};
