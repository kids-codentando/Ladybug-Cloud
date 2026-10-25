/**
 * Ladybug Command - Show Ladybug Mini bot information & branding
 * Made under Ntandomods
 */

const fs = require('fs');
const path = require('path');
const config = require('../../config');

module.exports = {
  name: 'ladybug',
  aliases: ['about', 'botinfo', 'info', 'lb', 'ntandomods'],
  category: 'general',
  description: 'Show information about Ladybug Mini',
  usage: '.ladybug',

  async execute(sock, msg, args, extra) {
    try {
      const ownerNames = Array.isArray(config.ownerName) ? config.ownerName : [config.ownerName];
      const displayOwner = ownerNames[0] || 'Ntandomods';
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const uptimeStr = `${days}d ${hours}h ${minutes}m`;

      let text = `╭━━━『 *🐞 ${config.botName}* 』━━━╮\n\n`;
      text += `🐞 *Name:* ${config.botName}\n`;
      text += `🏷️ *Brand:* ${config.brand || 'Ntandomods'}\n`;
      text += `👑 *Owner:* ${displayOwner}\n`;
      text += `⚡ *Prefix:* ${config.prefix}\n`;
      text += `🧬 *Version:* 2.0.0\n`;
      text += `⏱️ *Uptime:* ${uptimeStr}\n\n`;
      text += `🌟 *About*\n`;
      text += `Ladybug Mini is a fast, lightweight WhatsApp MD bot built on Baileys and proudly crafted under *Ntandomods*. Packed with AI, media, group management, games, economy and utility tools — all easy to customize.\n\n`;
      text += `🔗 *Connect*\n`;
      text += `• GitHub: ${config.social?.github || 'https://github.com/Ntandomods'}\n`;
      text += `• YouTube: ${config.social?.youtube || 'https://youtube.com/@ntandomods'}\n`;
      text += `• Instagram: ${config.social?.instagram || 'https://instagram.com/ntandomods'}\n\n`;
      text += `💡 Type *${config.prefix}menu* to see all commands.\n`;
      text += `╰━━━━━━━━━━━━━━━━━━╯\n\n`;
      text += `> 🐞 *Powered by ${config.botName} • ${config.brand || 'Ntandomods'}*`;

      const imagePath = path.join(__dirname, '../../utils/bot_image.jpg');
      if (fs.existsSync(imagePath)) {
        await sock.sendMessage(extra.from, {
          image: fs.readFileSync(imagePath),
          caption: text,
          mentions: [extra.sender],
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: config.newsletterJid || '120363161513685998@newsletter',
              newsletterName: config.botName,
              serverMessageId: -1
            }
          }
        }, { quoted: msg });
      } else {
        await sock.sendMessage(extra.from, { text, mentions: [extra.sender] }, { quoted: msg });
      }
    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
