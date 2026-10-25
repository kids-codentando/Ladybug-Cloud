/**
 * Delete Group Status Command
 * Revokes existing group status posts for everyone (all known posts, or the replied one)
 */

const groupStatusTracker = require('../../utils/groupStatusTracker');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  name: 'delgcstatus',
  aliases: ['delgstatus', 'delgs'],
  category: 'admin',
  description: 'Delete existing group status posts for everyone',
  usage: '.delgcstatus (or reply to a group status)',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,

  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;

      let targets;
      if (ctx?.stanzaId && groupStatusTracker.isGroupStatusMessage(ctx.quotedMessage)) {
        targets = [{
          key: {
            remoteJid: chatId,
            id: ctx.stanzaId,
            fromMe: false,
            ...(ctx.participant ? { participant: ctx.participant } : {}),
          },
        }];
        const known = groupStatusTracker.list(chatId).find((e) => e.key.id === ctx.stanzaId);
        if (known) targets = [known];
      } else {
        targets = groupStatusTracker.list(chatId);
      }

      if (!targets.length) {
        return extra.reply(
          '📭 No group status found to delete.\n\n' +
          'I can only delete statuses I have seen (posted in the last 24h while I was online). ' +
          'You can also reply to a group status with this command.'
        );
      }

      await extra.react('⏳');

      const deleted = [];
      let failed = 0;
      for (const { key } of targets) {
        try {
          await sock.sendMessage(chatId, { delete: key });
          deleted.push(key.id);
        } catch (e) {
          failed++;
          console.error('delgcstatus delete error:', e.message);
        }
        if (targets.length > 1) await sleep(700);
      }

      groupStatusTracker.remove(chatId, deleted);

      await extra.react(deleted.length ? '✅' : '❌');
      const text = failed
        ? `🗑️ Deleted ${deleted.length} group status(es). ${failed} failed.`
        : `🗑️ Deleted ${deleted.length} group status(es) for everyone.`;
      await extra.reply(text);
    } catch (error) {
      console.error('delgcstatus command error:', error);
      await extra.reply('❌ Failed to delete group status. Make sure I am admin.');
    }
  },
};
