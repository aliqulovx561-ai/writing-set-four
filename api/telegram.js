import TelegramBot from 'node-telegram-bot-api';

export default async function handler(req, res) {
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
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    console.log('🔧 Environment check:', {
      hasToken: !!TELEGRAM_BOT_TOKEN,
      hasChatId: !!TELEGRAM_CHAT_ID,
      tokenStarts: TELEGRAM_BOT_TOKEN ? TELEGRAM_BOT_TOKEN.substring(0, 10) + '...' : 'none',
      chatId: TELEGRAM_CHAT_ID
    });

    // Validate environment variables
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      const errorMsg = 'Missing Telegram environment variables. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Vercel.';
      console.error('❌', errorMsg);
      return res.status(500).json({ 
        success: false, 
        error: errorMsg 
      });
    }

    // Validate token format
    if (!TELEGRAM_BOT_TOKEN.includes(':') || TELEGRAM_BOT_TOKEN.length < 30) {
      const errorMsg = 'Invalid Telegram bot token format. Token should look like: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz';
      console.error('❌', errorMsg);
      return res.status(500).json({ 
        success: false, 
        error: errorMsg 
      });
    }

    // Validate chat ID is a number
    if (isNaN(TELEGRAM_CHAT_ID)) {
      const errorMsg = 'Invalid Telegram chat ID. Must be a number.';
      console.error('❌', errorMsg);
      return res.status(500).json({ 
        success: false, 
        error: errorMsg 
      });
    }

    const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);
    
    const { 
      message, 
      studentName, 
      teacherName, 
      violations = {}, 
      task1WordCount = 0, 
      task2WordCount = 0, 
      totalWords = 0, 
      testDuration = 0 
    } = req.body;

    console.log('📝 Processing submission for:', studentName);

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Format the Telegram message
    const formattedMessage = `📝 IELTS WRITING TEST SUBMITTED

👤 STUDENT INFORMATION
• Name: ${studentName || 'Not provided'}
• Teacher: ${teacherName || 'Not provided'}
• Test: IELTS Writing Test - Set Four
• Timestamp: ${new Date().toLocaleString()}
• Duration: ${testDuration} seconds

📋 TASK 1 - TABLE DESCRIPTION
Question:
The table below shows the change in the number of people (million) taking part in five different physical activities between 2001 and 2009.

Summarise the information by selecting and reporting the main features, making comparisons where relevant.

Write at least 150 words.

📝 Student's Answer:
${extractAnswer(message, 'TASK 1 - TABLE DESCRIPTION') || 'No answer provided'}

📊 Task 1 Statistics:
• Words: ${task1WordCount}
• Actual Word Count: ${task1WordCount}

📝 TASK 2 - ESSAY WRITING
Question:
Some people say manufacturers and supermarkets are responsible for reducing the packaging on the products they sell. Others argue that consumers should buy products with less packaging. Discuss both views and give your own opinion.

📝 Student's Answer:
${extractAnswer(message, 'TASK 2 - ESSAY WRITING') || 'No answer provided'}

📊 Task 2 Statistics:
• Words: ${task2WordCount}
• Actual Word Count: ${task2WordCount}

📈 OVERALL STATISTICS
• Total Words Written: ${totalWords}
• Task 1 Words: ${task1WordCount} ${task1WordCount < 150 ? "❌" : "✅"}
• Task 2 Words: ${task2WordCount} ${task2WordCount < 250 ? "❌" : "✅"}

🚨 VIOLATION REPORT
• Total Violations: ${violations.total || 0}
• Tab Switching: ${violations.tabSwitching || 0}
• App Switching: ${violations.appSwitching || 0}
• High Typing Speed: ${violations.highTypingSpeed || 0}
• Paste Detected: ${violations.pasteDetected || 0}
• Rapid Keystrokes: ${violations.rapidKeystrokes || 0}
• Final Warnings: ${violations.warningCount || 0}/2

---
✅ Test automatically submitted and recorded
🕒 System Time: ${new Date().toLocaleString()}`;

    console.log('📤 Sending to Telegram...');
    
    // Send to Telegram
    const telegramResponse = await bot.sendMessage(TELEGRAM_CHAT_ID, formattedMessage);
    
    console.log('✅ Telegram message sent successfully!', {
      messageId: telegramResponse.message_id,
      student: studentName
    });

    res.status(200).json({ 
      success: true, 
      message: 'Test submitted successfully to Telegram',
      telegramMessageId: telegramResponse.message_id
    });

  } catch (error) {
    console.error('❌ Telegram API error:', {
      name: error.name,
      message: error.message,
      code: error.code
    });

    let userMessage = 'Failed to send message to Telegram';
    
    if (error.response?.body?.description?.includes('Forbidden')) {
      userMessage = 'Bot cannot send messages to this chat. Please make sure the bot was started.';
    } else if (error.response?.body?.description?.includes('chat not found')) {
      userMessage = 'Chat ID not found. Please check TELEGRAM_CHAT_ID.';
    } else if (error.response?.body?.description?.includes('Unauthorized')) {
      userMessage = 'Invalid bot token. Please check TELEGRAM_BOT_TOKEN.';
    }

    res.status(500).json({ 
      success: false, 
      error: userMessage,
      details: error.message 
    });
  }
}

function extractAnswer(fullMessage, taskSection) {
  try {
    const taskStart = fullMessage.indexOf(taskSection);
    if (taskStart === -1) return 'No answer found';
    
    const sectionText = fullMessage.substring(taskStart);
    const answerStart = sectionText.indexOf('📝 Student\'s Answer:');
    if (answerStart === -1) return 'No answer format found';
    
    const answerText = sectionText.substring(answerStart + '📝 Student\'s Answer:'.length);
    const statsStart = answerText.indexOf('📊');
    
    if (statsStart === -1) {
      return answerText.trim();
    }
    
    return answerText.substring(0, statsStart).trim();
  } catch (error) {
    console.error('Error extracting answer:', error);
    return 'Error extracting answer';
  }
}
