/**
 * Sysinfo Command — What the Ladybug is running on
 * Made under Ntandomods
 */

const os = require('os');
const theme = require('../../utils/ladybugTheme');

module.exports = {
  name: 'sysinfo',
  aliases: ['botstat', 'specs', 'sysstats'],
  category: 'ladybug',
  description: 'Show the server and runtime the bot lives on',
  usage: '.sysinfo',

  async execute(sock, msg, args, extra) {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const load = os.loadavg()[0];
      const cores = os.cpus().length || 1;
      const heap = process.memoryUsage().heapUsed;

      let text = `${theme.header('System')}\n`;
      text += `${theme.row(theme.ICON.cpu, 'Platform', `${os.platform()} ${os.arch()}`)}\n`;
      text += `${theme.row(theme.ICON.robot, 'Node', process.version)}\n`;
      text += `${theme.row(theme.ICON.dna, 'Cores', String(cores))}\n`;
      text += `${theme.row(theme.ICON.chart, 'Load 1m', `${load.toFixed(2)} / ${cores}`)}\n`;
      text += `${theme.divider()}\n`;
      text += `${theme.row(theme.ICON.ram, 'System RAM', `${theme.humanBytes(usedMem)} of ${theme.humanBytes(totalMem)}`)}\n`;
      text += `${theme.line(theme.bar(usedMem, totalMem))}\n`;
      text += `${theme.row(theme.ICON.leaf, 'Bot heap', theme.humanBytes(heap))}\n`;
      text += `${theme.divider()}\n`;
      text += `${theme.row(theme.ICON.clock, 'Uptime', theme.humanDuration(process.uptime()))}\n`;
      text += `${theme.row(theme.ICON.tag, 'PID', String(process.pid))}\n`;
      text += theme.footer();

      await extra.reply(text);
    } catch (error) {
      await extra.reply(`${theme.ICON.cross} *Sysinfo failed:* ${error.message}`);
    }
  },
};
