const TelegramBot = require('node-telegram-bot-api');

// Replace with your actual Telegram bot token and chat ID
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID_HERE';

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      message, 
      studentName, 
      teacherName, 
      violations, 
      task1WordCount, 
      task2WordCount, 
      totalWords, 
      testDuration 
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Format the message for better readability in Telegram
    const formattedMessage = `📝 IELTS WRITING TEST SUBMITTED

👤 STUDENT INFORMATION
• Name: ${studentName || 'Not provided'}
• Teacher: ${teacherName || 'Not provided'}
• Test: IELTS Writing Test - Set Four
• Timestamp: ${new Date().toLocaleString()}
• Duration: ${testDuration || 0} seconds

📋 TASK 1 - TABLE DESCRIPTION
Question:
The table below shows the change in the number of people (million) taking part in five different physical activities between 2001 and 2009.

Summarise the information by selecting and reporting the main features, making comparisons where relevant.

Write at least 150 words.

📝 Student's Answer:
${message.split('📝 Student\'s Answer:')[1]?.split('📊 Task 1 Statistics:')[0] || 'No answer provided'}

📊 Task 1 Statistics:
• Words: ${task1WordCount || 0}
• Actual Word Count: ${task1WordCount || 0}

📝 TASK 2 - ESSAY WRITING
Question:
Some people say manufacturers and supermarkets are responsible for reducing the packaging on the products they sell. Others argue that consumers should buy products with less packaging. Discuss both views and give your own opinion.

📝 Student's Answer:
${message.split('📝 Student\'s Answer:')[2] || 'No answer provided'}

📊 Task 2 Statistics:
• Words: ${task2WordCount || 0}
• Actual Word Count: ${task2WordCount || 0}

📈 OVERALL STATISTICS
• Total Words Written: ${totalWords || 0}
• Task 1 Words: ${task1WordCount || 0} ${(task1WordCount || 0) < 150 ? "❌" : "✅"}
• Task 2 Words: ${task2WordCount || 0} ${(task2WordCount || 0) < 250 ? "❌" : "✅"}

🚨 VIOLATION REPORT
• Total Violations: ${violations?.total || 0}
• Tab Switching: ${violations?.tabSwitching || 0}
• App Switching: ${violations?.appSwitching || 0}
• High Typing Speed: ${violations?.highTypingSpeed || 0}
• Paste Detected: ${violations?.pasteDetected || 0}
• Rapid Keystrokes: ${violations?.rapidKeystrokes || 0}
• Final Warnings: ${violations?.warningCount || 0}/2

---
✅ Test automatically submitted and recorded
🕒 System Time: ${new Date().toLocaleString()}`;

    // Send to Telegram
    await bot.sendMessage(TELEGRAM_CHAT_ID, formattedMessage);

    console.log('✅ Test submission sent to Telegram:', {
      studentName,
      teacherName,
      task1WordCount,
      task2WordCount,
      violations: violations?.total || 0
    });

    res.status(200).json({ 
      success: true, 
      message: 'Test submitted successfully to Telegram' 
    });
  } catch (error) {
    console.error('❌ Error sending to Telegram:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send message to Telegram',
      details: error.message 
    });
  }
};
