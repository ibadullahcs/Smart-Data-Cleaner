// frontend/src/components/AI/AIAssistant.jsx
// Complete AI Chatbot - Real Conversational Experience

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bot, Send, X, Minimize2, Maximize2, 
  Sparkles, Trash2, Type, Mail, Phone,
  Undo, HelpCircle, Zap, Calendar, 
  CheckCircle, Loader2, Mic, MicOff,
  Hash, Scissors, Edit3, TrendingUp, Shield,
  Wand2, Rocket, MessageSquare, Volume2
} from 'lucide-react';
import './AIAssistant.css';

// Available commands for the AI
const COMMANDS = {
  smart_clean: {
    keywords: ['smart clean', 'clean everything', 'full clean', 'complete clean', 'auto clean'],
    description: 'Clean entire dataset automatically',
    requiresColumn: false,
    action: 'smart_clean'
  },
  quick_clean: {
    keywords: ['quick clean', 'basic clean', 'simple clean'],
    description: 'Quick cleaning (remove duplicates + trim spaces)',
    requiresColumn: false,
    action: 'quick_clean'
  },
  remove_duplicates: {
    keywords: ['remove duplicates', 'delete duplicates', 'deduplicate'],
    description: 'Remove duplicate rows',
    requiresColumn: false,
    action: 'remove_duplicates'
  },
  trim_spaces: {
    keywords: ['trim spaces', 'trim whitespace', 'remove spaces', 'strip spaces'],
    description: 'Remove leading/trailing spaces',
    requiresColumn: true,
    action: 'trim_spaces'
  },
  lowercase: {
    keywords: ['lowercase', 'convert to lower', 'make lower'],
    description: 'Convert text to lowercase',
    requiresColumn: true,
    action: 'lowercase'
  },
  uppercase: {
    keywords: ['uppercase', 'convert to upper', 'make upper'],
    description: 'Convert text to uppercase',
    requiresColumn: true,
    action: 'uppercase'
  },
  titlecase: {
    keywords: ['title case', 'capitalize', 'proper case'],
    description: 'Convert text to title case',
    requiresColumn: true,
    action: 'titlecase'
  },
  fill_mean: {
    keywords: ['fill with mean', 'fill average', 'impute mean'],
    description: 'Fill missing values with column mean',
    requiresColumn: true,
    action: 'fill_mean'
  },
  fill_median: {
    keywords: ['fill with median', 'impute median'],
    description: 'Fill missing values with column median',
    requiresColumn: true,
    action: 'fill_median'
  },
  fill_mode: {
    keywords: ['fill with mode', 'fill most frequent'],
    description: 'Fill missing values with most frequent value',
    requiresColumn: true,
    action: 'fill_mode'
  },
  fix_emails: {
    keywords: ['fix emails', 'validate emails', 'clean emails'],
    description: 'Validate and clean email addresses',
    requiresColumn: false,
    action: 'fix_emails'
  },
  format_phones: {
    keywords: ['format phones', 'fix phones', 'clean phone numbers'],
    description: 'Standardize phone number format',
    requiresColumn: false,
    action: 'format_phones'
  },
  extract_year: {
    keywords: ['extract year', 'get year', 'year from date'],
    description: 'Extract year from date column',
    requiresColumn: true,
    action: 'extract_year'
  },
  calculate_age: {
    keywords: ['calculate age', 'compute age', 'age from birth'],
    description: 'Calculate age from birth date',
    requiresColumn: true,
    action: 'calculate_age'
  },
  remove_outliers: {
    keywords: ['remove outliers', 'delete outliers', 'clean outliers'],
    description: 'Remove statistical outliers',
    requiresColumn: true,
    action: 'remove_outliers'
  },
  to_numeric: {
    keywords: ['convert to number', 'to numeric', 'make number'],
    description: 'Convert column to numeric type',
    requiresColumn: true,
    action: 'to_numeric'
  },
  to_datetime: {
    keywords: ['convert to date', 'to datetime', 'make date'],
    description: 'Convert column to date type',
    requiresColumn: true,
    action: 'to_datetime'
  },
  undo: {
    keywords: ['undo', 'undo last', 'go back', 'revert'],
    description: 'Undo last action',
    requiresColumn: false,
    action: 'undo'
  },
  help: {
    keywords: ['help', 'what can you do', 'commands', 'show commands'],
    description: 'Show available commands',
    requiresColumn: false,
    action: 'help'
  }
};

const AIAssistant = ({ 
  isOpen, 
  onClose, 
  onActionExecute,
  availableColumns = [],
  currentJobId = null
}) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [awaitingColumn, setAwaitingColumn] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize chat
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: Date.now(),
          role: 'assistant',
          content: `👋 **Hi! I'm your AI Data Cleaning Assistant!**

I can help you clean your data using natural language.

**✨ Try these commands:**
• "Smart clean" - Clean everything automatically
• "Remove duplicates" - Delete duplicate rows
• "Trim spaces in age column"
• "Lowercase all text columns"
• "Fix emails" - Validate email addresses
• "Format phones" - Standardize phone numbers

**📝 Just type what you want to do!**`,
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  // Voice recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
        setTimeout(() => handleSend(), 100);
      };
      
      recognitionRef.current.onerror = () => {
        setIsListening(false);
        addMessage('assistant', "⚠️ Sorry, I couldn't hear you. Please type your command.", false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const addMessage = (role, content, isHTML = false) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      role,
      content,
      isHTML,
      timestamp: new Date()
    }]);
  };

  const detectCommand = (text) => {
    const lowerText = text.toLowerCase();
    
    // Extract column name (if any)
    let column = null;
    const columnPatterns = [
      /in\s+(\w+)\s+column/i,
      /on\s+(\w+)\s+column/i,
      /for\s+(\w+)\s+column/i,
      /column\s+(\w+)/i,
      /(\w+)\s+column/i
    ];
    
    for (const pattern of columnPatterns) {
      const match = lowerText.match(pattern);
      if (match && match[1]) {
        column = match[1];
        break;
      }
    }
    
    // Special case for "all" columns
    if (lowerText.includes('all columns') || lowerText.includes('every column')) {
      column = 'all';
    }
    
    // Find matching command
    for (const [cmdKey, cmdInfo] of Object.entries(COMMANDS)) {
      for (const keyword of cmdInfo.keywords) {
        if (lowerText.includes(keyword)) {
          return { command: cmdKey, column, requiresColumn: cmdInfo.requiresColumn };
        }
      }
    }
    
    return { command: null, column: null, requiresColumn: false };
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addMessage('user', userMessage, false);
    
    setIsTyping(true);
    
    // Simulate thinking
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Detect command
    const { command, column, requiresColumn } = detectCommand(userMessage);
    
    // Handle help command
    if (command === 'help') {
      const helpText = `**📋 Available Commands**

**🧹 Basic Cleaning**
• "Smart clean" - Complete dataset cleaning
• "Quick clean" - Remove duplicates + trim spaces
• "Remove duplicates" - Delete duplicate rows

**📝 Text Operations**
• "Trim spaces in [column]"
• "Lowercase [column]"
• "Uppercase [column]"
• "Title case [column]"

**📊 Missing Values**
• "Fill with mean in [column]"
• "Fill with median in [column]"
• "Fill with mode in [column]"

**📧 Special Actions**
• "Fix emails" - Validate email addresses
• "Format phones" - Standardize phone numbers
• "Extract year from [date column]"
• "Calculate age from [birth column]"
• "Remove outliers from [column]"
• "Convert [column] to number"
• "Convert [column] to date"

**🔄 Other**
• "Undo" - Undo last action

Just type what you want to do naturally!`;
      
      addMessage('assistant', helpText, true);
      setIsTyping(false);
      return;
    }
    
    // No command detected
    if (!command) {
      addMessage('assistant', "I'm not sure what you want to do. Try saying something like:\n\n• 'Smart clean'\n• 'Remove duplicates'\n• 'Trim spaces in name column'\n\nType 'help' to see all commands!", true);
      setIsTyping(false);
      return;
    }
    
    // Check if column is needed
    if (requiresColumn && !column) {
      setAwaitingColumn({ command });
      addMessage('assistant', `Which column would you like to apply "${command.replace('_', ' ')}" to?\n\nAvailable columns: ${availableColumns.join(', ')}`, false);
      setIsTyping(false);
      return;
    }
    
    // Check if column exists
    if (requiresColumn && column && column !== 'all' && !availableColumns.includes(column)) {
      const similar = availableColumns.find(c => c.toLowerCase().includes(column.toLowerCase()));
      if (similar) {
        addMessage('assistant', `Did you mean "${similar}"? I don't see a column named "${column}".\n\nAvailable columns: ${availableColumns.join(', ')}`, false);
      } else {
        addMessage('assistant', `I can't find a column named "${column}".\n\nAvailable columns: ${availableColumns.join(', ')}`, false);
      }
      setIsTyping(false);
      return;
    }
    
    // Execute the action
    let actionToExecute = command;
    let params = {};
    
    if (requiresColumn) {
      actionToExecute = `${command}:${column === 'all' ? 'all' : column}`;
      params = { column: column === 'all' ? null : column };
    }
    
    addMessage('system', `⏳ Executing ${command.replace('_', ' ')}...`, false);
    
    try {
      const result = await onActionExecute(actionToExecute, params);
      
      if (result && result.success) {
        addMessage('assistant', `✅ **Success!** ${result.message || 'Operation completed.'}\n\n📊 Rows affected: ${result.rowsAffected || 0}`, true);
      } else {
        addMessage('assistant', `❌ **Failed:** ${result?.message || 'Something went wrong. Please try again.'}`, true);
      }
    } catch (error) {
      addMessage('assistant', `❌ **Error:** ${error.message}`, true);
    }
    
    setIsTyping(false);
    setAwaitingColumn(null);
  };

  const handleVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setAwaitingColumn(null);
    addMessage('assistant', "Chat cleared! How can I help you with your data?", false);
  };

  const renderMessage = (msg) => {
    if (msg.role === 'system') {
      return (
        <div className="chat-message system">
          <div className="message-bubble system-bubble">
            <Loader2 size={12} className="spin" />
            <span>{msg.content}</span>
          </div>
        </div>
      );
    }
    
    let content = msg.content;
    if (msg.isHTML) {
      content = msg.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>')
        .replace(/•/g, '<span class="bullet">•</span>');
    }
    
    return (
      <div className={`chat-message ${msg.role}`}>
        <div className="message-avatar">
          {msg.role === 'user' ? '👤' : (
            <div className="bot-avatar-icon">
              <Bot size={16} />
            </div>
          )}
        </div>
        <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
          {msg.isHTML ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <div>{msg.content}</div>
          )}
          <div className="message-time">
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  };

  const renderTyping = () => {
    if (!isTyping) return null;
    return (
      <div className="chat-message assistant">
        <div className="message-avatar">
          <div className="bot-avatar-icon">
            <Bot size={16} />
          </div>
        </div>
        <div className="message-bubble bot-bubble">
          <div className="typing-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const quickCommands = [
    { icon: <Wand2 size={14} />, text: 'Smart clean' },
    { icon: <Trash2 size={14} />, text: 'Remove duplicates' },
    { icon: <Scissors size={14} />, text: 'Trim spaces' },
    { icon: <Type size={14} />, text: 'Lowercase' },
    { icon: <Mail size={14} />, text: 'Fix emails' },
    { icon: <Phone size={14} />, text: 'Format phones' },
    { icon: <Calendar size={14} />, text: 'Extract year' },
    { icon: <HelpCircle size={14} />, text: 'Help' }
  ];

  return (
    <div className={`ai-chatbot ${isExpanded ? 'expanded' : ''}`}>
      {/* Header */}
      <div className="chatbot-header">
        <div className="header-left">
          <div className="bot-icon">
            <Bot size={20} />
            <span className="online-dot"></span>
          </div>
          <div className="header-info">
            <h3>AI Cleaning Assistant</h3>
            <p>Ready to help</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="header-action" onClick={clearChat} title="Clear chat">
            <Trash2 size={16} />
          </button>
          <button className="header-action" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button className="header-action close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chatbot-messages">
        {messages.map(msg => (
          <React.Fragment key={msg.id}>
            {renderMessage(msg)}
          </React.Fragment>
        ))}
        {renderTyping()}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Commands */}
      {messages.length < 3 && (
        <div className="chatbot-quick">
          <div className="quick-title">
            <Zap size={12} />
            <span>Quick commands</span>
          </div>
          <div className="quick-buttons">
            {quickCommands.map((cmd, idx) => (
              <button key={idx} onClick={() => {
                setInputValue(cmd.text);
                setTimeout(() => handleSend(), 50);
              }}>
                {cmd.icon}
                {cmd.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="chatbot-input">
        <input
          ref={inputRef}
          type="text"
          placeholder={isListening ? "Listening..." : "Type your command..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isTyping}
        />
        <button 
          className={`voice-btn ${isListening ? 'listening' : ''}`}
          onClick={handleVoiceInput}
          disabled={isTyping}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button 
          className="send-btn"
          onClick={handleSend}
          disabled={!inputValue.trim() || isTyping}
        >
          <Send size={18} />
        </button>
      </div>

      {/* Footer */}
      <div className="chatbot-footer">
        <Sparkles size={10} />
        <span>AI may make mistakes. Review changes before proceeding.</span>
      </div>
    </div>
  );
};

export default AIAssistant;