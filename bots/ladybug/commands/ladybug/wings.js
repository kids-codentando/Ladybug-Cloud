/**
 * Wings Command — Open the wings and show the bot's live state
 * Made under Ntandomods
 */

const config = require('../../config');
const theme = require('../../utils/ladybugTheme');
const { loadCommands } = require('../../utils/commandLoader');

const FLIGHTS = [
  'Circling the group twice, then landing on your message.',
  'A short hop over the chat, wings catching the light.',
  'Gliding low, looking for something to react to.',
  'Climbing fast — the garden looks good from up here.',
  'Hovering just above the conversation, listening.',
];

module.exports = {
  name: 'wings',
  aliases: ['flutter', 'fly', 'openwings'],
  category: 'ladybug',
  description: 'Open the wings and see the bot status',
  usage: '.wings',

  async execute(sock, msg, args, extra) {
    try {
      const commands = loadCommands();
      const mem = process.memoryUsage();
      const mode = config.selfMode ? 'Private (self)' : 'Public';
      const flight = theme.pick(FLIGHTS);

      let text = `${theme.header('Wings Open')}\n`;
      text += `${theme.line(`${theme.ICON.wing} ${flight}`)}\n`;
      text += `${theme.divider()}\n`;
      text += `${theme.row(theme.ICON.robot, 'Bot', config.botName || 'Ladybug Mini')}\n`;
      text += `${theme.row(theme.ICON.tag, 'Prefix', `\`${config.prefix}\``)}\n`;
      text += `${theme.row(theme.ICON.chart, 'Commands', String(commands.size))}\n`;
      text += `${theme.row(theme.ICON.crown, 'Mode', mode)}\n`;
      text += `${theme.row(theme.ICON.clock, 'Airborne', theme.humanDuration(process.uptime()))}\n`;
      text += `${theme.row(theme.ICON.ram, 'Memory', theme.humanBytes(mem.rss))}\n`;
      text += theme.footer(`💡 Type *${config.prefix}menu* to see everything I can do.`);

      await extra.reply(text);
    } catch (error) {
      await extra.reply(`${theme.ICON.cross} *Wings failed to open:* ${error.message}`);
    }
  },
};
