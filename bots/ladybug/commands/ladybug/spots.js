/**
 * Spots Command — Your ladybug luck reading
 * Made under Ntandomods
 *
 * The result is derived from a hash of the sender JID, so a user always gets
 * the same reading. Random-per-call would make the "your spots" framing a lie.
 */

const theme = require('../../utils/ladybugTheme');

const READINGS = [
  { min: 90, text: 'The garden bends in your favour today.', icon: '🌟' },
  { min: 75, text: 'Good things are crawling toward you.', icon: '🍀' },
  { min: 55, text: 'Steady luck. Nothing dramatic, nothing bad.', icon: '🌿' },
  { min: 35, text: 'Watch your step — a few aphids in the way.', icon: '🍂' },
  { min: 0, text: 'Stay under a leaf today. Just to be safe.', icon: '🌧️' },
];

module.exports = {
  name: 'spots',
  aliases: ['luck', 'spotcheck', 'ladybugluck'],
  category: 'ladybug',
  description: 'Read your ladybug spots for luck',
  usage: '.spots',

  async execute(sock, msg, args, extra) {
    try {
      const who = extra.sender || 'ladybug';
      const ratio = theme.hashRatio(who);
      const spots = 1 + Math.floor(ratio * 7); // 1..7 spots
      const luck = Math.round(ratio * 100);
      const reading = READINGS.find((r) => luck >= r.min) || READINGS[READINGS.length - 1];
      const handle = String(who).split('@')[0];

      let text = `${theme.header('Your Spots')}\n`;
      text += `${theme.row(theme.ICON.crown, 'Keeper', `@${handle}`)}\n`;
      text += `${theme.row(theme.ICON.spot, 'Spots', `${'🔴'.repeat(spots)} (${spots}/7)`)}\n`;
      text += `${theme.row(theme.ICON.leaf, 'Luck', theme.bugBar(luck, 100))}\n`;
      text += `${theme.divider()}\n`;
      text += `${theme.row(reading.icon, 'Reading', reading.text)}\n`;
      text += theme.footer();

      await sock.sendMessage(extra.from, { text, mentions: [who] }, { quoted: msg });
    } catch (error) {
      await extra.reply(`${theme.ICON.cross} *Spot check failed:* ${error.message}`);
    }
  },
};
