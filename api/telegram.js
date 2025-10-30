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

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('Missing Telegram environment variables');
      return res.status(500).json({ 
        success: false, 
        error: 'Telegram configuration missing' 
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

    if (!message) {
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

    // Send to Telegram
    await bot.sendMessage(TELEGRAM_CHAT_ID, formattedMessage);

    console.log('✅ Test submission sent to Telegram successfully');
    console.log('Student:', studentName);
    console.log('Teacher:', teacherName);
    console.log('Task 1 words:', task1WordCount);
    console.log('Task 2 words:', task2WordCount);
    console.log('Violations:', violations.total || 0);

    res.status(200).json({ 
      success: true, 
      message: 'Test submitted successfully to Telegram' 
    });

  } catch (error) {
    console.error('❌ Error sending to Telegram:', error);
    
    // Fallback: Log the message that would have been sent
    console.log('FALLBACK - Message content:', req.body.message);
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send message to Telegram',
      details: error.message 
    });
  }
}

function extractAnswer(fullMessage, taskSection) {
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
}
