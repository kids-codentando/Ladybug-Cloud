/**
 * Ping Command — Check bot response time (Ladybug style)
 * Made under Ntandomods
 */

const theme = require('../../utils/ladybugTheme');

module.exports = {
  name: 'ping',
  aliases: ['p', 'latency'],
  category: 'general',
  description: 'Check bot response time',
  usage: '.ping',

  async execute(sock, msg, args, extra) {
    try {
      const start = Date.now();
      const sent = await extra.reply(`${theme.ICON.bug} *Pinging the garden...*`);
      const first = Date.now() - start;

      // Second sample: editing the same message measures the socket round trip
      // again, which gives a more honest average than a single cold send.
      const editStart = Date.now();
      await sock.sendMessage(
        extra.from,
        { text: `${theme.ICON.bug} *Still crawling...*`, edit: sent.key },
        { quoted: msg }
      );
      const second = Date.now() - editStart;

      const best = Math.min(first, second);
      const avg = Math.round((first + second) / 2);
      const verdict = theme.latencyVerdict(avg);

      // A little personality: the faster the reply, the more spots light up.
      const spotsLit = avg < 80 ? 5 : avg < 200 ? 4 : avg < 500 ? 3 : avg < 1200 ? 2 : 1;
      const spots = `${'🔴'.repeat(spotsLit)}${'⚪'.repeat(5 - spotsLit)}`;

      let text = `${theme.header('Ping')}\n`;
      text += `${theme.row(theme.ICON.ping, 'Pong', 'the bug heard you')}\n`;
      text += `${theme.row(theme.ICON.bolt, 'This reply', theme.humanMs(first))}\n`;
      text += `${theme.row(theme.ICON.net, 'Round trip', theme.humanMs(second))}\n`;
      text += `${theme.row(theme.ICON.chart, 'Average', `*${theme.humanMs(avg)}*`)}\n`;
      text += `${theme.row(theme.ICON.fire, 'Best', theme.humanMs(best))}\n`;
      text += `${theme.divider()}\n`;
      text += `${theme.row(theme.ICON.spot, 'Spots lit', spots)}\n`;
      text += `${theme.row(verdict.icon, 'Verdict', verdict.text)}\n`;
      text += theme.footer();

      await sock.sendMessage(extra.from, { text, edit: sent.key }, { quoted: msg });
    } catch (error) {
      await extra.reply(`${theme.ICON.cross} *Ping failed:* ${error.message}`);
    }
  },
};
