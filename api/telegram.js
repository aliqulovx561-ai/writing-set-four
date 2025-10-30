import TelegramBot from 'node-telegram-bot-api';

export default async function handler(req, res) {
  console.log('📨 Telegram API called at:', new Date().toISOString());
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS preflight request');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    console.log('🔑 Environment check:', {
      hasToken: !!TELEGRAM_BOT_TOKEN,
      hasChatId: !!TELEGRAM_CHAT_ID,
      tokenLength: TELEGRAM_BOT_TOKEN ? TELEGRAM_BOT_TOKEN.length : 0,
      chatId: TELEGRAM_CHAT_ID
    });

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('❌ Missing Telegram environment variables');
      return res.status(500).json({ 
        success: false, 
        error: 'Telegram configuration missing. Please check environment variables.',
        details: {
          hasToken: !!TELEGRAM_BOT_TOKEN,
          hasChatId: !!TELEGRAM_CHAT_ID
        }
      });
    }

    // Validate token format (should look like: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz)
    if (!TELEGRAM_BOT_TOKEN.includes(':') || TELEGRAM_BOT_TOKEN.length < 30) {
      console.error('❌ Invalid Telegram bot token format');
      return res.status(500).json({ 
        success: false, 
        error: 'Invalid Telegram bot token format' 
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

    console.log('📝 Received submission:', {
      studentName,
      teacherName,
      task1WordCount,
      task2WordCount,
      violations: violations.total || 0
    });

    if (!message) {
      console.log('❌ No message provided');
      return res.status(400).json({ error: 'Message is required' });
    }

    // Parse the answers from the message
    const task1Answer = extractAnswer(message, 'TASK 1 - TABLE DESCRIPTION');
    const task2Answer = extractAnswer(message, 'TASK 2 - ESSAY WRITING');

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
${task1Answer || 'No answer provided'}

📊 Task 1 Statistics:
• Words: ${task1WordCount}
• Actual Word Count: ${task1WordCount}

📝 TASK 2 - ESSAY WRITING
Question:
Some people say manufacturers and supermarkets are responsible for reducing the packaging on the products they sell. Others argue that consumers should buy products with less packaging. Discuss both views and give your own opinion.

📝 Student's Answer:
${task2Answer || 'No answer provided'}

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

    console.log('📤 Sending message to Telegram...');
    
    // Send to Telegram with error handling
    const telegramResponse = await bot.sendMessage(TELEGRAM_CHAT_ID, formattedMessage);
    
    console.log('✅ Telegram message sent successfully:', {
      messageId: telegramResponse.message_id,
      chat: telegramResponse.chat.title || telegramResponse.chat.id,
      date: telegramResponse.date
    });

    res.status(200).json({ 
      success: true, 
      message: 'Test submitted successfully to Telegram',
      telegramMessageId: telegramResponse.message_id
    });

  } catch (error) {
    console.error('❌ Error sending to Telegram:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send message to Telegram',
      details: {
        error: error.message,
        code: error.code,
        suggestion: 'Check if bot token and chat ID are correct, and bot has permission to send messages'
      }
    });
  }
}

function extractAnswer(fullMessage, taskSection) {
  try {
    const sections = fullMessage.split('📋 ');
    for (const section of sections) {
      if (section.includes(taskSection)) {
        const answerPart = section.split('📝 Student\'s Answer:')[1];
        if (answerPart) {
          const nextSection = answerPart.split('📊')[0];
          return nextSection ? nextSection.trim() : 'No answer provided';
        }
      }
    }
    return 'No answer provided';
  } catch (error) {
    console.error('Error extracting answer:', error);
    return 'Error extracting answer';
  }
}
