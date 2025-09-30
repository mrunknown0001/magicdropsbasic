/**
 * HUMAN BEHAVIOR SIMULATION UTILITIES
 * Makes AI responses indistinguishable from human project manager
 */

export interface ManagerStatus {
  isAvailable: boolean;
  status: 'online' | 'busy' | 'lunch' | 'meeting' | 'offline';
  responseStyle: 'energetic' | 'focused' | 'tired' | 'casual';
  autoReplyMessage?: string;
  estimatedResponseTime?: string;
}

export interface HumanResponseTiming {
  readingDelay: number;
  typingDelay: number;
  totalDelay: number;
  showPauses: boolean;
}

/**
 * Get current manager status based on time of day and work patterns
 */
export function getManagerStatus(): ManagerStatus {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Weekend
  if (day === 0 || day === 6) {
    return {
      isAvailable: false,
      status: 'offline',
      responseStyle: 'casual',
      autoReplyMessage: 'Bin übers Wochenende nicht im Büro. Melde mich Montag früh um 8 Uhr zurück!',
      estimatedResponseTime: 'Montag 8:00'
    };
  }
  
  // Early morning (before 8 AM)
  if (hour < 8) {
    return {
      isAvailable: false,
      status: 'offline',
      responseStyle: 'casual',
      autoReplyMessage: 'Bin noch nicht im Büro. Melde mich um 8 Uhr zurück!',
      estimatedResponseTime: 'Heute 8:00'
    };
  }
  
  // Late evening (after 18 PM)
  if (hour >= 18) {
    return {
      isAvailable: false,
      status: 'offline',
      responseStyle: 'casual',
      autoReplyMessage: 'Feierabend! Melde mich morgen früh um 8 Uhr zurück.',
      estimatedResponseTime: 'Morgen 8:00'
    };
  }
  
  // Lunch time (12-13 PM)
  if (hour === 12 || (hour === 13 && minute < 30)) {
    return {
      isAvailable: true,
      status: 'lunch',
      responseStyle: 'casual',
      autoReplyMessage: 'Bin gerade beim Mittagessen. Melde mich in etwa 20 Minuten zurück!',
      estimatedResponseTime: '13:30'
    };
  }
  
  // Morning energy (8-10 AM)
  if (hour >= 8 && hour < 10) {
    return {
      isAvailable: true,
      status: 'online',
      responseStyle: 'energetic'
    };
  }
  
  // Focused work time (10-12 PM)
  if (hour >= 10 && hour < 12) {
    return {
      isAvailable: true,
      status: 'busy',
      responseStyle: 'focused'
    };
  }
  
  // Afternoon productive (13-16 PM)
  if (hour >= 13 && hour < 16) {
    return {
      isAvailable: true,
      status: 'online',
      responseStyle: 'focused'
    };
  }
  
  // End of day (16-18 PM)
  if (hour >= 16 && hour < 18) {
    return {
      isAvailable: true,
      status: 'busy',
      responseStyle: 'tired'
    };
  }
  
  // Default working hours
  return {
    isAvailable: true,
    status: 'online',
    responseStyle: 'focused'
  };
}

/**
 * Calculate human-like response timing based on message and context
 */
export function calculateHumanTiming(
  userMessage: string, 
  responseLength: number,
  managerStatus: ManagerStatus
): HumanResponseTiming {
  const messageComplexity = analyzeComplexity(userMessage);
  const urgency = detectUrgency(userMessage);
  
  // Reading time (human reading speed: 200-300 WPM)
  const wordCount = userMessage.split(' ').length;
  const readingSpeed = managerStatus.responseStyle === 'energetic' ? 250 : 200;
  const baseReadingTime = (wordCount / readingSpeed) * 60 * 1000; // Convert to milliseconds
  
  // Processing time based on complexity and manager state
  const processingMultiplier = {
    energetic: 0.8,  // Quick thinking in the morning
    focused: 1.0,    // Normal processing
    tired: 1.4,      // Slower at end of day
    casual: 1.2      // Relaxed pace
  }[managerStatus.responseStyle];
  
  const complexityTime = {
    simple: 500,     // Quick acknowledgments
    medium: 2000,    // Normal questions
    complex: 4000,   // Technical problems
    urgent: 300      // Immediate attention
  }[messageComplexity];
  
  const processingTime = complexityTime * processingMultiplier;
  
  // Urgency adjustment
  const urgencyMultiplier = urgency === 'high' ? 0.3 : urgency === 'low' ? 1.8 : 1.0;
  
  // Random human variation (±25%)
  const variation = 0.75 + (Math.random() * 0.5);
  
  const readingDelay = Math.max(1000, (baseReadingTime + processingTime) * urgencyMultiplier * variation);
  
  // Typing time calculation
  const baseTypingSpeed = {
    energetic: 55,   // Fast morning typing
    focused: 45,     // Steady typing
    tired: 35,       // Slower evening typing
    casual: 40       // Relaxed typing
  }[managerStatus.responseStyle];
  
  // Typing variations
  const typingVariations = {
    fatigue: responseLength > 150 ? 0.85 : 1.0,
    accuracy: Math.random() < 0.1 ? 0.7 : 1.0,  // Occasional careful typing
    flow: responseLength > 80 ? 1.15 : 1.0,     // Faster when in writing flow
    interruption: Math.random() < 0.03 ? 0.5 : 1.0  // Rare interruptions
  };
  
  const adjustedTypingSpeed = baseTypingSpeed * 
    typingVariations.fatigue * 
    typingVariations.accuracy * 
    typingVariations.flow * 
    typingVariations.interruption;
  
  const baseTypingTime = (responseLength / adjustedTypingSpeed) * 1000;
  
  // Natural pauses (humans pause to think while typing)
  const pauseCount = Math.floor(responseLength / 70);
  const pauseTime = pauseCount * (150 + Math.random() * 500);
  
  const typingDelay = Math.max(2000, Math.min(baseTypingTime + pauseTime, 12000));
  
  return {
    readingDelay: Math.round(readingDelay),
    typingDelay: Math.round(typingDelay),
    totalDelay: Math.round(readingDelay + typingDelay),
    showPauses: responseLength > 100
  };
}

/**
 * Analyze message complexity for appropriate response timing
 */
function analyzeComplexity(message: string): 'simple' | 'medium' | 'complex' | 'urgent' {
  const text = message.toLowerCase();
  
  // Urgent indicators
  if (/hilfe|problem|fehler|dringend|schnell|sofort|wichtig|eilig/.test(text) || message.includes('!!!')) {
    return 'urgent';
  }
  
  // Complex topics
  if (/technisch|kompliziert|verstehe.*nicht|funktioniert.*nicht|kyc|dokument|aufgabe.*abgelehnt|video.*chat|fehler.*code/.test(text)) {
    return 'complex';
  }
  
  // Simple interactions
  if (message.length < 15 || /^(hi|hallo|hey|moin|danke|ok|gut|ja|nein)$/i.test(message.trim())) {
    return 'simple';
  }
  
  return 'medium';
}

/**
 * Detect urgency level in message
 */
function detectUrgency(message: string): 'low' | 'normal' | 'high' {
  const urgentWords = /hilfe|problem|fehler|dringend|schnell|sofort|wichtig|eilig/i;
  const casualWords = /danke|bitte|vielleicht|später|gerne|mal/i;
  const exclamationCount = (message.match(/!/g) || []).length;
  
  if (urgentWords.test(message) || exclamationCount >= 2) {
    return 'high';
  }
  
  if (casualWords.test(message) || message.includes('?')) {
    return 'low';
  }
  
  return 'normal';
}

/**
 * Generate context-aware greeting based on time and previous interaction
 */
export function generateContextualGreeting(
  userName: string, 
  lastInteraction?: Date,
  managerStatus?: ManagerStatus
): string {
  const hour = new Date().getHours();
  const timeSinceLastMessage = lastInteraction 
    ? (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60) // hours
    : 24;
  
  // Time-based greetings
  let greeting = '';
  if (hour < 10) {
    greeting = 'Guten Morgen';
  } else if (hour < 14) {
    greeting = 'Hallo';
  } else if (hour < 18) {
    greeting = 'Hi';
  } else {
    greeting = 'Guten Abend';
  }
  
  // Context-based additions
  if (timeSinceLastMessage > 24) {
    return `${greeting} ${userName}! Lange nichts gehört. Wie läuft es denn?`;
  } else if (timeSinceLastMessage > 4) {
    return `${greeting} ${userName}! Wie steht's denn bei dir?`;
  } else {
    return `${greeting} ${userName}!`;
  }
}

/**
 * Add natural conversation elements to AI responses
 */
export function enhanceResponseWithHumanElements(
  response: string,
  userMessage: string,
  managerStatus: ManagerStatus
): string {
  const shouldAddThinking = Math.random() < 0.15; // 15% chance
  const shouldAddTransition = Math.random() < 0.2; // 20% chance
  const shouldAddPersonalTouch = Math.random() < 0.1; // 10% chance
  
  let enhancedResponse = response;
  
  // Add thinking indicators for complex responses
  if (shouldAddThinking && response.length > 100) {
    const thinkingPhrases = [
      'Hmm, lass mich überlegen...',
      'Moment mal...',
      'Also...',
      'Ach ja, richtig...'
    ];
    const thinking = thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)];
    enhancedResponse = `${thinking}\n\n${response}`;
  }
  
  // Add natural transitions
  if (shouldAddTransition) {
    const transitions = [
      'Übrigens,',
      'Was mir noch einfällt:',
      'Apropos,',
      'Was ich noch sagen wollte:'
    ];
    const transition = transitions[Math.floor(Math.random() * transitions.length)];
    enhancedResponse += `\n\n${transition} Falls noch Fragen aufkommen, melde dich einfach.`;
  }
  
  // Add personal touch based on manager status
  if (shouldAddPersonalTouch) {
    const personalTouches = {
      energetic: ['Bin heute gut drauf und helfe gerne!', 'Lass uns das angehen!'],
      focused: ['Bin voll bei der Sache.', 'Konzentriere mich gerade voll auf dich.'],
      tired: ['War ein langer Tag, aber für dich nehme ich mir die Zeit.', 'Kurz vor Feierabend, aber das schaffen wir noch.'],
      casual: ['Alles entspannt.', 'Lassen wir ruhig angehen.']
    }[managerStatus.responseStyle];
    
    const touch = personalTouches[Math.floor(Math.random() * personalTouches.length)];
    enhancedResponse += `\n\n${touch}`;
  }
  
  return enhancedResponse;
}

/**
 * Simulate "away" messages during non-working hours
 */
export function generateAwayMessage(managerStatus: ManagerStatus): string | null {
  if (!managerStatus.isAvailable && managerStatus.autoReplyMessage) {
    return managerStatus.autoReplyMessage;
  }
  
  if (managerStatus.status === 'lunch') {
    return 'Bin gerade beim Mittagessen. Melde mich in etwa 20 Minuten zurück!';
  }
  
  if (managerStatus.status === 'meeting') {
    return 'Bin gerade in einem Meeting. Melde mich in etwa 30 Minuten zurück!';
  }
  
  return null;
}

/**
 * Add realistic typing indicators with pauses
 */
export function getTypingPattern(responseLength: number): Array<{action: 'type' | 'pause', duration: number}> {
  const pattern: Array<{action: 'type' | 'pause', duration: number}> = [];
  const chunks = Math.ceil(responseLength / 60); // Typing chunks
  
  for (let i = 0; i < chunks; i++) {
    // Typing phase
    pattern.push({
      action: 'type',
      duration: 2000 + Math.random() * 1500 // 2-3.5 seconds of typing
    });
    
    // Thinking pause (except for last chunk)
    if (i < chunks - 1) {
      pattern.push({
        action: 'pause',
        duration: 300 + Math.random() * 700 // 300-1000ms pause
      });
    }
  }
  
  return pattern;
}

/**
 * Generate human-like response variations
 */
export function addHumanVariations(response: string, context: any): string {
  // Occasionally add minor corrections (2% chance)
  if (Math.random() < 0.02) {
    const corrections = [
      '*korrigiere mich: ',
      '*also ich meinte: ',
      '*besser gesagt: '
    ];
    const correction = corrections[Math.floor(Math.random() * corrections.length)];
    return response + `\n\n${correction}${response.split('.')[0]}.`;
  }
  
  // Add emphasis variations (5% chance)
  if (Math.random() < 0.05) {
    return response.replace(/wichtig/gi, 'WICHTIG').replace(/dringend/gi, 'DRINGEND');
  }
  
  return response;
}

/**
 * Simulate manager's daily routine and mood
 */
export function getManagerMoodContext(): {
  mood: string;
  energy: number;
  responseModifier: string;
} {
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  
  // Monday blues
  if (dayOfWeek === 1 && hour < 10) {
    return {
      mood: 'monday_startup',
      energy: 0.7,
      responseModifier: 'Montag früh, aber bin schon im Flow.'
    };
  }
  
  // Friday energy
  if (dayOfWeek === 5 && hour > 15) {
    return {
      mood: 'friday_wind_down',
      energy: 0.9,
      responseModifier: 'Fast Wochenende, aber für dich gerne!'
    };
  }
  
  // Morning fresh
  if (hour >= 8 && hour < 10) {
    return {
      mood: 'morning_fresh',
      energy: 1.0,
      responseModifier: 'Bin heute motiviert und helfe gerne!'
    };
  }
  
  // Afternoon focus
  if (hour >= 13 && hour < 16) {
    return {
      mood: 'afternoon_focus',
      energy: 0.9,
      responseModifier: 'Bin voll konzentriert bei der Sache.'
    };
  }
  
  // End of day
  if (hour >= 16) {
    return {
      mood: 'end_of_day',
      energy: 0.6,
      responseModifier: 'War ein langer Tag, aber das kriegen wir hin.'
    };
  }
  
  return {
    mood: 'normal',
    energy: 0.8,
    responseModifier: ''
  };
}
