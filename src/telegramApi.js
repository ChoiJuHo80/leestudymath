const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

/**
 * Send a message to the configured Telegram chat.
 * @param {string} message - The message to send.
 */
export async function sendTelegramNotification(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('Telegram Bot Token or Chat ID is not configured. Skipping notification.');
        return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    // Support multiple chat IDs separated by commas
    const chatIds = TELEGRAM_CHAT_ID.split(',').map(id => id.trim()).filter(id => id);

    try {
        const promises = chatIds.map(chatId => 
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            }).then(async (response) => {
                if (!response.ok) {
                    console.error(`Failed to send Telegram notification to ${chatId}:`, await response.text());
                }
            })
        );
        
        await Promise.all(promises);
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
    }
}
