/**
 * Swarm Command — How busy the garden is right now
 * Made under Ntandomods
 */

const theme = require('../../utils/ladybugTheme');
const { getStats } = require('../../utils/groupstats');

module.exports = {
  name: 'swarm',
  aliases: ['colony', 'bugswarm'],
  category: 'ladybug',
  description: 'Show how active this group is today',
  usage: '.swarm',

  async execute(sock, msg, args, extra) {
    try {
      if (!extra.isGroup) {
        return extra.reply(
          `${theme.header('Swarm')}\n${theme.line(`${theme.ICON.warn} The swarm only forms inside a group.`)}\n${theme.footer()}`
        );
      }

      let meta = extra.groupMetadata;
      if (!meta) {
        try {
          meta = await sock.groupMetadata(extra.from);
        } catch (e) {
          meta = null;
        }
      }

      const members = meta?.participants?.length || 0;
      const admins = meta?.participants?.filter((p) => p.admin).length || 0;
      const stats = getStats(extra.from);

      // getStats returns a per-user map for today, or null if nothing happened.
      const perUser = stats?.users || stats || null;
      let total = 0;
      let top = null;
      if (perUser && typeof perUser === 'object') {
        for (const [jid, entry] of Object.entries(perUser)) {
          const count = typeof entry === 'number' ? entry : entry?.count || entry?.messages || 0;
          total += count;
          if (!top || count > top.count) top = { jid, count };
        }
      }

      const activity = members ? Math.min(100, Math.round((total / Math.max(1, members)) * 10)) : 0;

      let text = `${theme.header('Swarm')}\n`;
      text += `${theme.row(theme.ICON.bug, 'Bugs in garden', String(members))}\n`;
      text += `${theme.row(theme.ICON.crown, 'Queens', String(admins))}\n`;
      text += `${theme.divider()}\n`;
      text += `${theme.row(theme.ICON.chart, 'Messages today', String(total))}\n`;
      text += `${theme.row(theme.ICON.leaf, 'Buzz level', theme.bugBar(activity, 100))}\n`;
      if (top && top.count > 0) {
        text += `${theme.row('🏅', 'Busiest bug', `@${String(top.jid).split('@')[0]} (${top.count})`)}\n`;
      } else {
        text += `${theme.row('😴', 'Busiest bug', 'Nobody has spoken yet today')}\n`;
      }
      text += theme.footer();

      const mentions = top && top.count > 0 ? [top.jid] : [];
      await sock.sendMessage(extra.from, { text, mentions }, { quoted: msg });
    } catch (error) {
      await extra.reply(`${theme.ICON.cross} *Swarm failed:* ${error.message}`);
    }
  },
};
