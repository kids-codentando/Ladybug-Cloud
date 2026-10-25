/**
 * Crawl Command — Race a ladybug across the garden
 * Made under Ntandomods
 */

const theme = require('../../utils/ladybugTheme');

const TRACK = 12;

module.exports = {
  name: 'crawl',
  aliases: ['crawlrace', 'bugrace'],
  category: 'ladybug',
  description: 'Race a ladybug across the garden',
  usage: '.crawl',

  async execute(sock, msg, args, extra) {
    try {
      const who = extra.sender || 'ladybug';
      const handle = String(who).split('@')[0];

      // Distance is seeded from the user so the same person always crawls the
      // same distance — the randomness is in the pace, not the outcome.
      const seed = theme.hashRatio(`${who}:crawl`);
      const distance = 60 + Math.round(seed * 140); // cm
      const pace = theme.randInt(4, 26); // cm per second
      const seconds = distance / pace;

      const progress = Math.min(TRACK, Math.max(1, Math.round((pace / 26) * TRACK)));
      const track = `${'·'.repeat(progress)}${theme.BUG}${'·'.repeat(TRACK - progress)}🏁`;

      let text = `${theme.header('Crawl Race')}\n`;
      text += `${theme.row(theme.ICON.crown, 'Racer', `@${handle}`)}\n`;
      text += `${theme.line(`\`${track}\``)}\n`;
      text += `${theme.divider()}\n`;
      text += `${theme.row(theme.ICON.chart, 'Distance', `${distance} cm`)}\n`;
      text += `${theme.row(theme.ICON.bolt, 'Pace', `${pace} cm/s`)}\n`;
      text += `${theme.row(theme.ICON.clock, 'Time', `${seconds.toFixed(1)}s`)}\n`;
      text += `${theme.divider()}\n`;

      if (pace >= 22) text += `${theme.row('🏆', 'Result', 'That is a sprint, not a crawl.')}\n`;
      else if (pace >= 14) text += `${theme.row('🥈', 'Result', 'Respectable little scuttle.')}\n`;
      else if (pace >= 8) text += `${theme.row('🥉', 'Result', 'Cruising. Enjoying the view.')}\n`;
      else text += `${theme.row('🐌', 'Result', 'Stopped to eat an aphid, probably.')}\n`;

      text += theme.footer();

      await sock.sendMessage(extra.from, { text, mentions: [who] }, { quoted: msg });
    } catch (error) {
      await extra.reply(`${theme.ICON.cross} *Race failed:* ${error.message}`);
    }
  },
};
