// frontend/src/services/intentDetector.js
// Advanced AI Intent Detection - Natural Language Processing
//
// NOTE: this module is confirmed NOT imported by AIAssistant.jsx (or
// anything else live in this app) — AIAssistant.jsx has its own
// independent, working command parser. This file is dead code as far
// as the running application is concerned. Fixed for correctness below
// since it's still real code that could confuse anyone reading it, but
// recommend deciding whether to delete it outright, given it's fully
// superseded.

// ============================================
// INTENT TYPES
// ============================================

export const INTENTS = {
  // Data Quality
  REMOVE_DUPLICATES: 'remove_duplicates',
  REMOVE_NA: 'remove_na',
  DROP_NA: 'drop_na',
  
  // Missing Values
  FILL_MISSING: 'fill_missing',
  FILL_MEAN: 'fill_mean',
  FILL_MEDIAN: 'fill_median',
  FILL_MODE: 'fill_mode',
  FILL_FORWARD: 'fill_forward',
  FILL_BACKWARD: 'fill_backward',
  FILL_CONSTANT: 'fill_constant',
  
  // Text Cleaning
  TRIM_SPACES: 'trim_spaces',
  LOWERCASE: 'lowercase',
  UPPERCASE: 'uppercase',
  TITLECASE: 'titlecase',
  REMOVE_SPECIAL: 'remove_special',
  REMOVE_PUNCTUATION: 'remove_punctuation',
  FIX_ENCODING: 'fix_encoding',
  
  // Data Types
  CONVERT_TO_NUMERIC: 'convert_to_numeric',
  CONVERT_TO_DATETIME: 'convert_to_datetime',
  CONVERT_TO_CATEGORY: 'convert_to_category',
  
  // Date Operations
  EXTRACT_YEAR: 'extract_year',
  EXTRACT_MONTH: 'extract_month',
  EXTRACT_DAY: 'extract_day',
  EXTRACT_WEEKDAY: 'extract_weekday',
  CALCULATE_AGE: 'calculate_age',
  
  // Column Operations
  SPLIT_COLUMN: 'split_column',
  MERGE_COLUMNS: 'merge_columns',
  RENAME_COLUMN: 'rename_column',
  DROP_COLUMN: 'drop_column',
  
  // Search/Replace
  FIND_REPLACE: 'find_replace',
  
  // Email/Phone
  FIX_EMAILS: 'fix_emails',
  FORMAT_PHONES: 'format_phones',
  
  // Outliers
  REMOVE_OUTLIERS: 'remove_outliers',
  CAP_OUTLIERS: 'cap_outliers',
  // Global Actions
  SMART_CLEAN: 'smart_clean',
  QUICK_CLEAN: 'quick_clean',
  UNDO: 'undo',
  RESET: 'reset',
  SHOW_HELP: 'show_help',
  SHOW_STATS: 'show_stats'
};

// ============================================
// ADVANCED KEYWORD MAPPINGS
// ============================================

const INTENT_KEYWORDS = {
  [INTENTS.REMOVE_DUPLICATES]: [
    'remove duplicates', 'delete duplicates', 'drop duplicates', 
    'deduplicate', 'remove duplicate rows', 'clean duplicates',
    'remove repeated rows', 'eliminate duplicates'
  ],
  [INTENTS.REMOVE_NA]: [
    'remove missing', 'remove null', 'remove na', 'remove empty',
    'drop missing', 'drop null', 'drop na'
  ],
  [INTENTS.FILL_MISSING]: [
    'fill missing', 'fill null', 'fill na', 'fill empty', 
    'fill nan', 'handle missing', 'impute missing', 'fill blanks'
  ],
  [INTENTS.FILL_MEAN]: [
    'fill with mean', 'fill average', 'impute mean', 'use average'
  ],
  [INTENTS.FILL_MEDIAN]: [
    'fill with median', 'impute median', 'use median'
  ],
  [INTENTS.FILL_MODE]: [
    'fill with mode', 'fill most frequent', 'use mode'
  ],
  [INTENTS.FILL_FORWARD]: [
    'forward fill', 'fill forward', 'propagate forward', 'use previous'
  ],
  [INTENTS.FILL_BACKWARD]: [
    'backward fill', 'fill backward', 'use next'
  ],
  [INTENTS.FILL_CONSTANT]: [
    'fill with constant', 'fill with value', 'replace with'
  ],
  [INTENTS.TRIM_SPACES]: [
    'trim spaces', 'trim whitespace', 'remove spaces', 
    'strip spaces', 'clean whitespace', 'remove extra spaces'
  ],
  [INTENTS.LOWERCASE]: [
    'lowercase', 'convert to lower', 'make lowercase', 
    'all lower case', 'to lower', 'lower case'
  ],
  [INTENTS.UPPERCASE]: [
    'uppercase', 'convert to upper', 'make uppercase', 
    'all upper case', 'to upper', 'upper case'
  ],
  [INTENTS.TITLECASE]: [
    'title case', 'capitalize', 'proper case', 
    'capitalize first letter', 'make title', 'sentence case'
  ],
  [INTENTS.REMOVE_SPECIAL]: [
    'remove special characters', 'remove special chars', 
    'clean special characters', 'remove punctuation', 'clean symbols'
  ],
  [INTENTS.FIX_ENCODING]: [
    'fix encoding', 'fix encoding issues', 'repair text encoding',
    'fix mojibake', 'fix garbled text'
  ],
  [INTENTS.CONVERT_TO_NUMERIC]: [
    'convert to number', 'to numeric', 'make number', 
    'convert numeric', 'as number', 'to integer', 'to float'
  ],
  [INTENTS.CONVERT_TO_DATETIME]: [
    'convert to date', 'to date', 'make date', 
    'parse date', 'as date', 'to datetime', 'to timestamp'
  ],
  [INTENTS.CONVERT_TO_CATEGORY]: [
    'convert to category', 'to categorical', 'make category',
    'as factor', 'to factor'
  ],
  [INTENTS.EXTRACT_YEAR]: [
    'extract year', 'get year', 'year from date', 'year column'
  ],
  [INTENTS.EXTRACT_MONTH]: [
    'extract month', 'get month', 'month from date', 'month column'
  ],
  [INTENTS.EXTRACT_DAY]: [
    'extract day', 'get day', 'day from date', 'day column'
  ],
  [INTENTS.EXTRACT_WEEKDAY]: [
    'extract weekday', 'get day of week', 'day of week', 'weekday column'
  ],
  [INTENTS.CALCULATE_AGE]: [
    'calculate age', 'compute age', 'age from birth date', 'how old'
  ],
  [INTENTS.SPLIT_COLUMN]: [
    'split column', 'split into columns', 'separate column'
  ],
  [INTENTS.MERGE_COLUMNS]: [
    'merge columns', 'combine columns', 'join columns', 'concatenate'
  ],
  [INTENTS.RENAME_COLUMN]: [
    'rename column', 'rename field', 'change column name'
  ],
  [INTENTS.DROP_COLUMN]: [
    'drop column', 'remove column', 'delete column', 
    'remove field', 'delete field'
  ],
  [INTENTS.FIND_REPLACE]: [
    'find and replace', 'find replace', 'replace text', 
    'substitute', 'replace all'
  ],
  [INTENTS.FIX_EMAILS]: [
    'fix emails', 'validate emails', 'clean emails', 
    'repair email', 'email validation', 'fix email addresses'
  ],
  [INTENTS.FORMAT_PHONES]: [
    'fix phones', 'format phones', 'clean phones', 
    'phone numbers', 'format phone numbers', 'standardize phones'
  ],
  [INTENTS.REMOVE_OUTLIERS]: [
    'remove outliers', 'remove extreme values', 'remove anomalies',
    'clean outliers', 'eliminate outliers'
  ],
  [INTENTS.CAP_OUTLIERS]: [
    'cap outliers', 'winsorize', 'limit outliers', 'clip outliers'
  ],
  [INTENTS.SMART_CLEAN]: [
    'smart clean', 'auto clean', 'clean my data', 'clean dataset',
    'complete clean', 'full clean', 'clean everything'
  ],
  [INTENTS.QUICK_CLEAN]: [
    'quick clean', 'fast clean', 'basic clean', 'simple clean'
  ],
  [INTENTS.UNDO]: [
    'undo', 'undo last action', 'go back', 'rollback',
    'revert', 'reverse last change'
  ],
  [INTENTS.RESET]: [
    'reset', 'reset data', 'reset all', 'start over', 
    'clear all changes', 'original data'
  ],
  [INTENTS.SHOW_HELP]: [
    'help', 'what can you do', 'commands', 'show commands',
    'available actions', 'list commands', 'capabilities'
  ],
  [INTENTS.SHOW_STATS]: [
    'show stats', 'column statistics', 'data summary', 'describe',
    'show info', 'column info', 'statistics', 'summary'
  ]
};

// ============================================
// UTILITY EXTRACTORS
// ============================================

export const extractColumn = (text) => {
  const patterns = [
    /column\s+["']?(\w+)["']?/i,
    /in\s+["']?(\w+)["']?/i,
    /for\s+["']?(\w+)["']?/i,
    /on\s+["']?(\w+)["']?/i,
    /from\s+["']?(\w+)["']?/i,
    /(\w+)\s+column/i,
    /column\s+(\w+)/i,
    /in column (\w+)/i,
    /the (\w+) column/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

export const extractFillMethod = (text) => {
  if (text.includes('mean') || text.includes('average')) return 'mean';
  if (text.includes('median') || text.includes('middle')) return 'median';
  if (text.includes('mode') || text.includes('frequent')) return 'mode';
  if (text.includes('forward') || text.includes('previous')) return 'forward';
  if (text.includes('backward') || text.includes('next')) return 'backward';
  return null;
};

export const extractCustomValue = (text) => {
  const match = text.match(/with\s+["']([^"']+)["']/i);
  if (match) return match[1];
  const match2 = text.match(/value\s+["']([^"']+)["']/i);
  if (match2) return match2[1];
  const match3 = text.match(/replace with\s+["']([^"']+)["']/i);
  if (match3) return match3[1];
  return null;
};

export const extractThreshold = (text) => {
  const match = text.match(/(\d+(?:\.\d+)?)%?/);
  if (match) return parseFloat(match[1]);
  return null;
};

// ============================================
// ADVANCED INTENT DETECTION
// ============================================

export const detectIntent = (text) => {
  const lowerText = text.toLowerCase().trim();
  
  let detectedIntent = null;
  let confidence = 0;
  let matchedKeyword = '';
  
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        const matchConfidence = keyword.length / lowerText.length;
        if (matchConfidence > confidence) {
          confidence = matchConfidence;
          detectedIntent = intent;
          matchedKeyword = keyword;
        }
      }
    }
  }
  
  if (!detectedIntent && lowerText.length > 0) {
    detectedIntent = INTENTS.SHOW_HELP;
    confidence = 0.3;
  }
  
  const column = extractColumn(lowerText);
  const method = extractFillMethod(lowerText);
  const customValue = extractCustomValue(lowerText);
  const threshold = extractThreshold(lowerText);
  
  let target = column;
  if (lowerText.includes('all columns') || lowerText.includes('every column')) {
    target = 'all';
  }
  
  return {
    intent: detectedIntent,
    confidence: Math.round(confidence * 100),
    column: target,
    method,
    customValue,
    threshold,
    matchedKeyword,
    originalText: text
  };
};

// ============================================
// RESPONSE GENERATION
// ============================================

// FIX: previously `responses[intent] || responses[INTENTS.SHOW_HELP]`
// silently substituted the ENTIRE generic help menu whenever a
// correctly-detected intent (20 of 38, by count) had no dedicated
// entry in `responses` — e.g. a user typing "fill with median in age"
// would be correctly recognized as FILL_MEDIAN, then shown the full
// command list as if they'd typed "help", with zero acknowledgment of
// what was actually understood. This is the same class of bug fixed
// in AIAssistant.jsx (there, 5 specific commands; here, systemically
// more of them). Rather than inventing 20 unverified confirmation
// messages (real design work this dead file doesn't warrant right
// now), this at least stops the misleading silent substitution — an
// intent that's genuinely recognized but not yet wired to a specific
// response now says so honestly, instead of pretending to be a help
// request.
const genericRecognizedFallback = (intentResult) => ({
  message: `I understood you want to "${intentResult.matchedKeyword}", but this specific action isn't fully wired up yet in this assistant. Type "help" to see the commands that are fully supported.`,
  requiresConfirmation: false,
  suggestedAction: null
});

export const generateResponse = (intentResult) => {
  const { intent, column, method, customValue, threshold } = intentResult;
  
  const responses = {
    [INTENTS.REMOVE_DUPLICATES]: {
      message: `I'll remove all duplicate rows from your dataset. This will keep only the first occurrence of each duplicate.`,
      requiresConfirmation: true,
      suggestedAction: 'remove_duplicates'
    },
    [INTENTS.SMART_CLEAN]: {
      message: `✨ I'll perform a COMPREHENSIVE cleaning on your entire dataset.\n\nThis will:\n✅ Remove duplicate rows\n✅ Fix encoding issues\n✅ Trim spaces\n✅ Fill missing values intelligently\n✅ Convert date columns\n✅ Standardize text case\n\nReady to proceed?`,
      requiresConfirmation: true,
      suggestedAction: 'smart_clean'
    },
    [INTENTS.QUICK_CLEAN]: {
      message: `⚡ I'll perform a QUICK clean on your dataset (remove duplicates + trim spaces). This is fast and safe.`,
      requiresConfirmation: true,
      suggestedAction: 'quick_clean'
    },
    [INTENTS.TRIM_SPACES]: {
      message: column 
        ? `I'll remove leading and trailing spaces from column "${column}".`
        : `I'll remove spaces from ALL text columns.`,
      requiresConfirmation: true,
      suggestedAction: column ? `trim_spaces:${column}` : 'trim_spaces:all'
    },
    [INTENTS.LOWERCASE]: {
      message: column 
        ? `I'll convert column "${column}" to lowercase.`
        : `I'll convert ALL text columns to lowercase.`,
      requiresConfirmation: true,
      suggestedAction: column ? `lowercase:${column}` : 'lowercase:all'
    },
    [INTENTS.UPPERCASE]: {
      message: column 
        ? `I'll convert column "${column}" to uppercase.`
        : `I'll convert ALL text columns to uppercase.`,
      requiresConfirmation: true,
      suggestedAction: column ? `uppercase:${column}` : 'uppercase:all'
    },
    [INTENTS.FIX_EMAILS]: {
      message: `📧 I'll validate and fix email addresses in your dataset. Invalid emails will be flagged.`,
      requiresConfirmation: true,
      suggestedAction: 'fix_emails'
    },
    [INTENTS.FORMAT_PHONES]: {
      message: `📞 I'll standardize phone numbers to a consistent format (XXX) XXX-XXXX.`,
      requiresConfirmation: true,
      suggestedAction: 'format_phones'
    },
    [INTENTS.EXTRACT_YEAR]: {
      message: column 
        ? `I'll extract the year from date column "${column}" and create a new column "${column}_year".`
        : `Which date column would you like to extract year from?`,
      requiresConfirmation: !!column,
      suggestedAction: column ? `extract_year:${column}` : null
    },
    [INTENTS.CALCULATE_AGE]: {
      message: column 
        ? `I'll calculate age from birth date column "${column}".`
        : `Which birth date column would you like to calculate age from?`,
      requiresConfirmation: !!column,
      suggestedAction: column ? `calculate_age:${column}` : null
    },
    [INTENTS.UNDO]: {
      message: `↩️ I'll undo your last cleaning action.`,
      requiresConfirmation: true,
      suggestedAction: 'undo'
    },
    [INTENTS.SHOW_HELP]: {
      message:  `**📋 Available Commands**

**🧹 Basic Cleaning**
- "Smart clean" - Complete dataset cleaning
- "Quick clean" - Remove duplicates + trim spaces
- "Remove duplicates" - Delete duplicate rows

**📝 Text Operations**
- "Trim spaces in [column]"
- "Lowercase [column]" 
- "Uppercase [column]"
- "Title case [column]"

**📊 Missing Values**
- "Fill with mean in [column]"
- "Fill with median in [column]"
- "Fill with mode in [column]"

**📧 Special Actions**
- "Fix emails" - Validate email addresses
- "Format phones" - Standardize phone numbers
- "Extract year from [date column]"
- "Calculate age from [birth column]"

**🔄 Other**
- "Undo" - Undo last action

Just type what you want to do naturally!`,
      requiresConfirmation: false,
      suggestedAction: null
    }
  };

  if (responses[intent]) {
    return responses[intent];
  }
  // Genuinely unrecognized input still gets the real help menu.
  if (!intent || intent === INTENTS.SHOW_HELP) {
    return responses[INTENTS.SHOW_HELP];
  }
  // A real intent WAS recognized, it just has no dedicated response
  // template yet — say so honestly instead of silently showing help.
  return genericRecognizedFallback(intentResult);
};

// ============================================
// MAIN PARSE FUNCTION
// ============================================

export const parseCommand = (text) => {
  const intentResult = detectIntent(text);
  const response = generateResponse(intentResult);
  
  let action = response.suggestedAction;
  let params = {
    column: intentResult.column,
    method: intentResult.method,
    customValue: intentResult.customValue,
    threshold: intentResult.threshold
  };
  
  if (action && action.includes(':')) {
    // Action already has parameters
  } else if (action && params.column && action !== 'smart_clean' && action !== 'quick_clean') {
    action = `${action}:${params.column}`;
  }
  
  return {
    action,
    params,
    requiresConfirmation: response.requiresConfirmation,
    responseMessage: response.message,
    confidence: intentResult.confidence,
    originalText: text,
    matchedKeyword: intentResult.matchedKeyword
  };
};

// ============================================
// QUICK COMMANDS
// ============================================

export const getQuickCommands = () => {
  return [
    { label: '✨ Smart Clean', command: 'smart clean' },
    { label: '⚡ Quick Clean', command: 'quick clean' },
    { label: '🗑️ Remove Duplicates', command: 'remove duplicates' },
    { label: '✂️ Trim Spaces', command: 'trim spaces' },
    { label: '🔤 Lowercase All', command: 'lowercase all text columns' },
    { label: '📊 Fill Missing', command: 'fill missing values' },
    { label: '📧 Fix Emails', command: 'fix emails' },
    { label: '📞 Format Phones', command: 'format phones' },
    { label: '📅 Extract Year', command: 'extract year from date column' },
    { label: '🎂 Calculate Age', command: 'calculate age from birth date' },
    { label: '↩️ Undo', command: 'undo' },
    { label: '❓ Help', command: 'help' }
  ];
};

// ============================================
// VALIDATION
// ============================================

// FIX (case-sensitivity bug, same class as the one fixed in
// AIAssistant.jsx): `params.column` comes from extractColumn(), which
// always operates on lowercased text, so it's always lowercase — but
// `availableColumns` holds the real column names with their actual
// casing (e.g. "Age", "Email"). The previous exact-match `!includes()`
// check meant ANY column name containing an uppercase letter would
// incorrectly report "not found" even when it genuinely exists. Now
// resolves case-insensitively AND corrects action.params.column to the
// real-cased value in place, so any downstream code that goes on to
// call an API with this column name uses the name that actually
// exists in the dataset.
export const validateAction = (action, availableColumns = []) => {
  const { params } = action;
  
  if (params.column && params.column !== 'all' && availableColumns.length > 0) {
    const realCased = availableColumns.find(
      c => c.toLowerCase() === params.column.toLowerCase()
    );
    if (!realCased) {
      return {
        valid: false,
        errorMessage: `Column "${params.column}" not found. Available columns: ${availableColumns.join(', ')}`
      };
    }
    params.column = realCased;
  }
  
  return { valid: true, errorMessage: null };
};

export default {
  INTENTS,
  detectIntent,
  generateResponse,
  parseCommand,
  getQuickCommands,
  extractColumn,
  extractFillMethod,
  validateAction
};