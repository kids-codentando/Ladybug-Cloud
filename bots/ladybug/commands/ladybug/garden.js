/**
 * Garden Command — A themed overview of the current group
 * Made under Ntandomods
 */

const theme = require('../../utils/ladybugTheme');

function formatDate(ts) {
  if (!ts) return 'unknown';
  const ms = typeof ts === 'number' ? ts * 1000 : Number(ts);
  if (!Number.isFinite(ms)) return 'unknown';
  try {
    return new Date(ms).toISOString().slice(0, 10);
  } catch (e) {
    return 'unknown';
  }
}

module.exports = {
  name: 'garden',
  aliases: ['ladybuggarden', 'mygarden'],
  category: 'ladybug',
  description: 'Show a themed overview of this group',
  usage: '.garden',

  async execute(sock, msg, args, extra) {
    try {
      if (!extra.isGroup) {
        return extra.reply(
          `${theme.header('Garden')}\n${theme.line(`${theme.ICON.warn} You are not in a garden — this is a private chat.`)}\n${theme.footer()}`
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

      if (!meta) {
        return extra.reply(`${theme.ICON.cross} *Could not read this garden's details.*`);
      }

      const members = meta.participants || [];
      const admins = members.filter((p) => p.admin).length;
      const name = meta.subject || 'Unnamed garden';
      const created = formatDate(meta.creation);
      const desc = (meta.desc || '').trim();

      let text = `${theme.header('Garden')}\n`;
      text += `${theme.row(theme.ICON.leaf, 'Name', name)}\n`;
      text += `${theme.row(theme.ICON.bug, 'Bugs', String(members.length))}\n`;
      text += `${theme.row(theme.ICON.crown, 'Queens', String(admins))}\n`;
      text += `${theme.row(theme.ICON.clock, 'Planted', created)}\n`;
      text += `${theme.divider()}\n`;
      text += `${theme.row(theme.ICON.chart, 'Queen share', theme.bar(admins, Math.max(1, members.length)))}\n`;
      if (desc) {
        text += `${theme.divider()}\n`;
        text += `${theme.line(`${theme.ICON.sparkle} *About*`)}\n`;
        text += `${theme.line(desc.length > 400 ? `${desc.slice(0, 400)}…` : desc)}\n`;
      }
      text += theme.footer();

      await extra.reply(text);
    } catch (error) {
      await extra.reply(`${theme.ICON.cross} *Garden failed:* ${error.message}`);
    }
  },
};
