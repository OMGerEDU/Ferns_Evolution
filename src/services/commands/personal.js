const logger = require('../../utils/logger');
const evolution = require('../../services/evolution');
const { pool } = require('../db');

async function handlePersonalCommand(command, args, message, instanceName) {
    logger.info(`[PersonalCommand] Executing ${command} for ${instanceName}`);
    const userId = message.sender_jid || message.participant || message.remoteJid;
    logger.info(`[PersonalCommand] Helper debug: sender_jid=${message.sender_jid}, participant=${message.participant}, remoteJid=${message.remoteJid} -> userId=${userId}`);

    switch (command) {
        case 'note':
            const noteContent = args.join(' ');
            if (!noteContent) {
                await evolution.sendText(instanceName, message.remoteJid, 'Usage: !note [your text here]');
                return true;
            }

            try {
                await pool.query(
                    'INSERT INTO personal_notes (user_jid, content) VALUES ($1, $2)',
                    [userId, noteContent]
                );
                await evolution.sendReaction(instanceName, message.id, '📝'); // Confirm with reaction
            } catch (err) {
                logger.error('[PersonalCommand] Error saving note:', err);
                await evolution.sendText(instanceName, message.remoteJid, 'Error saving note.');
            }
            return true;

        case 'notes':
            try {
                const res = await pool.query(
                    'SELECT content, created_at FROM personal_notes WHERE user_jid = $1 ORDER BY created_at DESC LIMIT 10',
                    [userId]
                );

                if (res.rows.length === 0) {
                    await evolution.sendText(instanceName, message.remoteJid, 'You have no saved notes.');
                    return true;
                }

                let response = '*Your Recent Notes:*\n\n';
                res.rows.forEach((row, i) => {
                    const date = new Date(row.created_at).toLocaleDateString();
                    response += `${i + 1}. [${date}] ${row.content}\n`;
                });

                await evolution.sendText(instanceName, message.remoteJid, response);
            } catch (err) {
                logger.error('[PersonalCommand] Error fetching notes:', err);
                await evolution.sendText(instanceName, message.remoteJid, 'Error fetching notes.');
            }
            return true;

        case 'me':
            const info = `*User Info:*\nName: ${message.sender}\nJID: ${userId}\nChat: ${message.chat_id}`;
            await evolution.sendText(instanceName, message.remoteJid, info);
            return true;

        default:
            return false;
    }
}

module.exports = { handlePersonalCommand };
