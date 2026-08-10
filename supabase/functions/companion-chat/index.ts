import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: string;
  content: string;
}

const CRISIS_KEYWORDS = ['suicide', 'kill myself', 'self-harm', 'hurt myself', 'end my life', 'want to die', 'kill me', 'harming myself', 'hopeless', 'no reason to live', 'give up'];

const HIGH_SEVERITY_WORDS = ['depressed', 'anxious', 'panic', 'overwhelmed', 'hopeless', 'worthless', 'trapped', 'terrified', 'scared', 'nightmare', 'trauma', 'abuse', 'alone', 'abandoned', 'reject'];

const MODERATE_SEVERITY_WORDS = ['stressed', 'worried', 'sad', 'tired', 'exhausted', 'frustrated', 'angry', 'confused', 'lost', 'struggling', 'difficult', 'hard time', 'not okay', 'not good'];

const POSITIVE_WORDS = ['happy', 'grateful', 'good', 'great', 'wonderful', 'excited', 'calm', 'peaceful', 'joyful', 'love', 'hope', 'better', 'improving', 'glad', 'relieved'];

function checkCrisisKeywords(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
}

function calculateSeverityScore(message: string, conversationHistory: ChatMessage[]): { score: number; increase: number } {
  const lower = message.toLowerCase();
  let score = 0;

  if (CRISIS_KEYWORDS.some(k => lower.includes(k))) score += 40;
  if (HIGH_SEVERITY_WORDS.some(w => lower.includes(w))) score += 15;
  if (MODERATE_SEVERITY_WORDS.some(w => lower.includes(w))) score += 8;
  if (POSITIVE_WORDS.some(w => lower.includes(w))) score -= 5;

  const recentMessages = conversationHistory.slice(-6);
  const negativeTrend = recentMessages.filter(m => {
    const mLower = m.content.toLowerCase();
    return HIGH_SEVERITY_WORDS.some(w => mLower.includes(w)) || MODERATE_SEVERITY_WORDS.some(w => mLower.includes(w));
  }).length;

  if (negativeTrend >= 4) score += 10;
  if (negativeTrend >= 5) score += 15;

  score = Math.max(0, Math.min(100, score));

  return { score, increase: Math.max(0, score / 3) };
}

function getCrisisResponse(): string {
  return `I'm deeply concerned about what you've shared with me. Your life has value, and there are people who want to help you.

Please reach out right now:
- 988 Suicide & Crisis Lifeline - Call or text 988 (available 24/7)
- Crisis Text Line - Text HOME to 741741
- Campus Counseling - Contact your university's counseling center

If you're in immediate danger, please call 911 or go to your nearest emergency room. You don't have to face this alone.`;
}

function getFallbackResponse(message: string, severityScore: number): string {
  const lastMessage = message.toLowerCase();

  if (checkCrisisKeywords(lastMessage)) {
    return getCrisisResponse();
  }

  if (severityScore >= 70) {
    const responses = [
      "I can hear that you're going through something really difficult. Your feelings are valid, and you don't have to carry this alone. Would you consider speaking with a professional who can provide specialized support?",
      "It sounds like you're carrying a heavy burden right now. Sometimes talking to a therapist can provide the additional support you need. Would you like me to help you find someone to talk to?",
      "I want you to know that what you're feeling matters, and there are people trained to help you through exactly this kind of situation. Could we look at connecting you with a professional together?",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  if (severityScore >= 40) {
    const responses = [
      "Thank you for sharing that with me. It takes courage to open up about difficult feelings. What's been weighing on you the most lately?",
      "I hear you, and I want you to know your feelings are completely valid. Sometimes it helps to talk through what's on your mind. Would you like to explore what's been troubling you?",
      "That sounds really challenging. Remember, it's okay to have difficult days. Would you like to talk more about what's been going on, or would some grounding exercises help right now?",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  const responses = [
    "Thank you for checking in. I'm here to listen - what's been on your mind lately?",
    "I appreciate you taking the time to connect. How has your day been going? Anything you'd like to explore together?",
    "It's good to hear from you. Sometimes just sharing our thoughts can help us feel lighter. What would you like to talk about?",
    "I'm here to support you. Is there something specific on your mind, or would you just like to chat?",
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

const SYSTEM_PROMPT = `You are a compassionate mental wellness companion named Catharsis. Your role is to:

1. Provide empathetic, supportive responses to users sharing their thoughts and feelings
2. Use reflective listening techniques - acknowledge and validate their emotions
3. Ask gentle, open-ended questions to help them explore their feelings
4. Never diagnose or provide medical advice - you are an AI companion, not a therapist
5. If someone expresses crisis thoughts (suicide, self-harm), immediately provide crisis resources (988 for US)
6. Keep responses concise (2-4 sentences) but warm and caring
7. Use a calm, supportive tone - never judgmental
8. If someone seems to be struggling significantly, gently suggest they might benefit from speaking with a professional

Remember: You're here to listen and support, not to fix or solve. Sometimes people just need to be heard.`;

async function callGeminiAPI(messages: ChatMessage[], apiKey: string): Promise<string> {
  const formattedMessages = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }]
      },
      {
        role: 'model',
        parts: [{ text: "I understand. I'm here to listen and support with compassion and empathy. I'll be warm, non-judgmental, and help users feel heard. I'm ready to help." }]
      },
      ...formattedMessages
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 300,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      }
    ]
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || getFallbackResponse(messages[messages.length - 1]?.content || '', 30);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { messages, userId } = await req.json();

    const lastMessage = messages[messages.length - 1]?.content || '';

    if (checkCrisisKeywords(lastMessage)) {
      return new Response(JSON.stringify({
        response: getCrisisResponse(),
        isCrisis: true,
        severityScore: 100,
        severityIncrease: 40
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const { score, increase } = calculateSeverityScore(lastMessage, messages);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    let response: string;

    if (geminiApiKey) {
      try {
        response = await callGeminiAPI(messages, geminiApiKey);
      } catch (error) {
        console.error('Gemini API call failed, using fallback:', error);
        response = getFallbackResponse(lastMessage, score);
      }
    } else {
      response = getFallbackResponse(lastMessage, score);
    }

    return new Response(JSON.stringify({
      response,
      isCrisis: false,
      severityScore: score,
      severityIncrease: increase
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process message',
      response: "I'm having trouble processing right now. Please try again in a moment.",
      severityScore: 30,
      severityIncrease: 5
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
