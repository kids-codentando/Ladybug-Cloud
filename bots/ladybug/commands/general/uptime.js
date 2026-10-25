/**
 * Uptime Command — How long the Ladybug has been awake
 * Made under Ntandomods
 */

const config = require('../../config');
const theme = require('../../utils/ladybugTheme');

/** Turn a boot timestamp into a readable date. */
function formatSince(startMs) {
  try {
    return new Date(startMs).toUTCString().replace(' GMT', ' UTC');
  } catch (e) {
    return 'unknown';
  }
}

module.exports = {
  name: 'uptime',
  aliases: ['runtime', 'botuptime', 'alive', 'ladybuguptime'],
  category: 'general',
  description: 'Show how long the bot has been running',
  usage: '.uptime',

  async execute(sock, msg, args, extra) {
    try {
      const seconds = process.uptime();
      const startedAt = Date.now() - seconds * 1000;
      const mem = process.memoryUsage();

      // Health is a friendly read on how long the bug has been flying without
      // a restart: fresh boots look "rested", long runs look "weathered".
      const hours = seconds / 3600;
      let health;
      if (hours < 1) health = { pct: 100, mood: 'Fresh out of the egg', icon: '🥚' };
      else if (hours < 6) health = { pct: 100, mood: 'Wings warm, flying clean', icon: '🪽' };
      else if (hours < 24) health = { pct: 92, mood: 'Steady cruise', icon: '🌿' };
      else if (hours < 72) health = { pct: 85, mood: 'Long flight, still strong', icon: '💪' };
      else health = { pct: 78, mood: 'Veteran of the garden', icon: '🏅' };

      let text = `${theme.header('Uptime')}\n`;
      text += `${theme.row(theme.ICON.robot, 'Bot', config.botName || 'Ladybug Mini')}\n`;
      text += `${theme.row(theme.ICON.dna, 'Version', '2.0.0')}\n`;
      text += `${theme.row(theme.ICON.clock, 'Awake for', `*${theme.humanDuration(seconds)}*`)}\n`;
      text += `${theme.row(theme.ICON.sparkle, 'Since', formatSince(startedAt))}\n`;
      text += `${theme.divider()}\n`;
      text += `${theme.row(theme.ICON.leaf, 'Health', theme.bar(health.pct, 100))}\n`;
      text += `${theme.row(health.icon, 'Mood', health.mood)}\n`;
      text += `${theme.row(theme.ICON.ram, 'Memory', theme.humanBytes(mem.rss))}\n`;
      text += theme.footer();

      await extra.reply(text);
    } catch (error) {
      console.error('Error in uptime command:', error);
      await extra.reply(`${theme.ICON.cross} *Uptime failed:* ${error.message}`);
    }
  },
};
