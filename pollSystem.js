const activePolls = new Map(); // Store active polls by chat ID

async function handleCommand(ctx, query) {
  const chatId = ctx.remoteJid;
  
  let question = query.trim();
  let options = [];

  // Strategy 1: Extract "Option X 'text'" or "Option X text" patterns
  const optionRegex = /option\s*\d+\s*["']?([^"'\n]+?)["']?(?=\s*(?:option\s*\d+|option\s*\d*|$))/gi;
  let match;
  const foundOptions = [];
  
  while ((match = optionRegex.exec(query)) !== null) {
    foundOptions.push(match[1].trim());
  }
  
  if (foundOptions.length > 0) {
    options = foundOptions;
    
    // Extract question - everything before first "Option"
    const firstOptionIndex = query.toLowerCase().indexOf('option');
    if (firstOptionIndex > 0) {
      let qText = query.substring(0, firstOptionIndex).trim();
      // Remove prefixes like "Create a poll with this question"
      qText = qText.replace(/^(create\s+a\s+poll\s+)?(with\s+this\s+question\s*)?/i, '').trim();
      // Remove surrounding quotes
      qText = qText.replace(/^["']|["']$/g, '').trim();
      question = qText;
    }
  }
  
  // Strategy 2: Try ? separator format
  if (options.length === 0 && question.includes('?')) {
    const parts = question.split('?');
    question = parts[0].trim() + '?';
    const rest = parts.slice(1).join('?').trim();
    
    if (rest) {
      // Try to extract quoted options first
      const quotedMatches = rest.match(/["']([^"'\n]+?)["']/g);
      if (quotedMatches) {
        options = quotedMatches.map(o => o.replace(/^["']|["']$/g, '').trim());
      } else {
        // Fallback: comma or newline split
        options = rest.split(/,|\n/).map(o => o.trim()).filter(o => o.length > 0);
      }
    }
  }
  
  // Strategy 3: Numbered list format (1. text, 2. text)
  if (options.length === 0) {
    const numberedMatches = query.match(/(?:^|\n)\s*\d+[.)\s]\s*(.+?)(?=\n\s*\d+[.)\s]|\n*$)/gi);
    if (numberedMatches) {
      options = numberedMatches.map(o => o.replace(/^\s*\d+[.)\s]\s*/, '').trim());
      // Extract question from before first number
      const firstNumIndex = query.search(/\n\s*\d+[.)\s]/);
      if (firstNumIndex > 0) {
        question = query.substring(0, firstNumIndex).trim();
      }
    }
  }
  
  // Default options if none found
  if (options.length === 0) {
    options = ['Yes', 'No', 'Maybe'];
  }
  
  // Limit to 12 options (WhatsApp max)
  options = options.slice(0, 12);
  
  // Ensure at least 2 options
  if (options.length < 2) {
    options.push('No');
    options.push('Maybe');
  }
  
  // Clean up question
  question = question.replace(/^(create\s+a\s+poll\s+)?(make\s+a\s+poll\s+)?(start\s+a\s+poll\s+)?/i, '').trim();
  if (!question.endsWith('?')) question += '?';
  
  try {
    // Send native WhatsApp poll using Baileys
    const pollMsg = await ctx.sock.sendMessage(chatId, {
      poll: {
        name: question || 'Poll',
        values: options,
        selectableCount: 1,  // Single choice
        toAnnouncementGroup: false
      }
    }, { quoted: ctx.message });
    
    // Store poll info for tracking votes
    activePolls.set(pollMsg.key.id, {
      question: question || 'Poll',
      options: options,
      votes: new Map(),
      messageKey: pollMsg.key,
      createdAt: Date.now()
    });
    
    return null; // Don't send text reply - the poll is the reply
  } catch (error) {
    console.error('Poll creation error:', error);
    return `❌ Failed to create poll: ${error.message}`;
  }
}

// Handle incoming poll votes
function handlePollVote(message) {
  const pollUpdate = message?.message?.pollUpdateMessage;
  if (!pollUpdate) return;
  
  const pollId = pollUpdate.pollCreationMessageKey?.id;
  if (!pollId || !activePolls.has(pollId)) return;
  
  const poll = activePolls.get(pollId);
  // Process vote...
}

function getActivePolls() {
  return activePolls;
}

// Clean up old polls (older than 24 hours)
function cleanupOldPolls() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  for (const [id, poll] of activePolls) {
    if (now - poll.createdAt > maxAge) {
      activePolls.delete(id);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupOldPolls, 60 * 60 * 1000);

module.exports = { handleCommand, handlePollVote, getActivePolls };
