/**
 * Speed Command — Three-sample latency test, Ladybug style
 * Made under Ntandomods
 */

const theme = require('../../utils/ladybugTheme');

module.exports = {
  name: 'speed',
  aliases: ['nettest', 'netspeed', 'lagtest'],
  category: 'ladybug',
  description: 'Run a multi-sample latency test against WhatsApp',
  usage: '.speed',

  async execute(sock, msg, args, extra) {
    try {
      const sent = await extra.reply(`${theme.ICON.bug} *Warming up the wings...*`);
      const samples = [];

      for (let i = 0; i < 3; i += 1) {
        const t0 = Date.now();
        await sock.sendMessage(
          extra.from,
          { text: `${theme.ICON.bug} *Sample ${i + 1}/3...*`, edit: sent.key },
          { quoted: msg }
        );
        samples.push(Date.now() - t0);
      }

      const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      const jitter = max - min;
      const verdict = theme.latencyVerdict(avg);

      // Jitter is the real story on WhatsApp: a fast average with huge spikes
      // still feels laggy to users.
      let stability;
      if (jitter < 50) stability = { text: 'Rock steady', icon: '🪨' };
      else if (jitter < 150) stability = { text: 'Slight wobble', icon: '🌬️' };
      else if (jitter < 400) stability = { text: 'Bumpy flight', icon: '🌪️' };
      else stability = { text: 'Turbulence', icon: '⛈️' };

      let text = `${theme.header('Speed Test')}\n`;
      text += `${theme.row(theme.ICON.net, 'Samples', samples.map((s) => theme.humanMs(s)).join(' • '))}\n`;
      text += `${theme.divider()}\n`;
      text += `${theme.row(theme.ICON.bolt, 'Average', `*${theme.humanMs(avg)}*`)}\n`;
      text += `${theme.row(theme.ICON.fire, 'Fastest', theme.humanMs(min))}\n`;
      text += `${theme.row(theme.ICON.honey, 'Slowest', theme.humanMs(max))}\n`;
      text += `${theme.row(theme.ICON.chart, 'Jitter', theme.humanMs(jitter))}\n`;
      text += `${theme.divider()}\n`;
      text += `${theme.row(stability.icon, 'Stability', stability.text)}\n`;
      text += `${theme.row(verdict.icon, 'Verdict', verdict.text)}\n`;
      text += theme.footer();

      await sock.sendMessage(extra.from, { text, edit: sent.key }, { quoted: msg });
    } catch (error) {
      await extra.reply(`${theme.ICON.cross} *Speed test failed:* ${error.message}`);
    }
  },
};
