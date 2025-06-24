import { z } from 'zod';
import { ai } from '../genkit';
import { personas, getPersonaByName, type Persona } from '@/lib/personas';

// Schema for debate configuration
const DebateConfigSchema = z.object({
  topic: z.string(),
  debateMode: z.enum(['boardroom', 'expert-panel', 'quick-consult', 'custom']),
  selectedPersonas: z.array(z.string()).optional(),
  maxRounds: z.number().default(3),
  includeModeration: z.boolean().default(true),
});

// Schema for debate turn
const DebateTurnSchema = z.object({
  round: z.number(),
  turnNumber: z.number(),
  speakingPersona: z.string(),
  context: z.array(z.object({
    persona: z.string(),
    message: z.string(),
    timestamp: z.string(),
  })),
  isRebuttal: z.boolean().default(false),
});

// Schema for debate state
const DebateStateSchema = z.object({
  topic: z.string(),
  mode: z.string(),
  personas: z.array(z.string()),
  currentRound: z.number(),
  currentTurn: z.number(),
  messages: z.array(z.object({
    persona: z.string(),
    message: z.string(),
    timestamp: z.string(),
    round: z.number(),
    turn: z.number(),
  })),
  isComplete: z.boolean().default(false),
});

// Function to generate a debate prompt for a persona
function generateDebatePrompt(params: {
  topic: string;
  currentContext: Array<{ persona: string; message: string; }>;
  speakingPersona: string;
  personaDetails: {
    name: string;
    title: string;
    description: string;
    expertise: string[];
    prompt: string;
  };
  round: number;
  isRebuttal: boolean;
}): string {
  const contextString = params.currentContext.length > 0 
    ? params.currentContext.map(ctx => `- ${ctx.persona}: ${ctx.message}`).join('\n')
    : 'No previous context.';

  return `You are ${params.personaDetails.name}, ${params.personaDetails.title}. 

${params.personaDetails.prompt}

DEBATE TOPIC: ${params.topic}

CURRENT DEBATE CONTEXT:
${contextString}

This is Round ${params.round} of the debate. ${params.isRebuttal ? 'You are responding to the previous arguments and providing rebuttals or counter-arguments.' : 'Present your initial position on this topic.'}

Instructions:
1. Stay true to your persona and expertise areas: ${params.personaDetails.expertise.join(', ')}
2. ${params.currentContext.length > 0 ? 'Reference and respond to the other executives\' points where relevant' : 'Present your initial perspective'}
3. Provide actionable insights from your role's perspective
4. Be concise but thorough (2-3 paragraphs maximum)
5. If you agree or disagree with specific points, be explicit about it

Please provide a thoughtful response from your persona's perspective.`;
}

// Function to select relevant personas based on topic
export function selectRelevantPersonas(topic: string, mode: string): Persona[] {
  switch (mode) {
    case 'boardroom':
      return personas; // All 5 personas
    case 'expert-panel':
      // Use AI to select 2-3 most relevant personas
      return selectPersonasByExpertise(topic, 3);
    case 'quick-consult':
      return selectPersonasByExpertise(topic, 1);
    default:
      return personas;
  }
}

// Helper to select personas by expertise relevance
function selectPersonasByExpertise(topic: string, count: number): Persona[] {
  // Simple keyword matching - could be enhanced with AI
  const topicLower = topic.toLowerCase();
  const relevanceScores = personas.map(persona => {
    let score = 0;
    persona.expertise.forEach(expertise => {
      if (topicLower.includes(expertise.toLowerCase())) {
        score += 2;
      }
    });
    // Add description relevance
    if (persona.description.toLowerCase().split(' ').some(word => topicLower.includes(word))) {
      score += 1;
    }
    return { persona, score };
  });

  return relevanceScores
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(item => item.persona);
}

// Mock response generator for testing
function generateMockPersonaResponse(persona: Persona, topic: string, round: number): string {
  const responses = {
    'Alex (CEO)': [
      `From a strategic perspective, this ${topic.toLowerCase()} initiative aligns with our long-term vision. We need to consider market positioning and competitive advantage.`,
      `Building on the previous points, I believe we should focus on scalable solutions that drive shareholder value while maintaining our market leadership position.`
    ],
    'Sam (CTO)': [
      `Looking at the technical feasibility of ${topic.toLowerCase()}, we need to evaluate our current infrastructure and development capabilities.`,
      `I agree with the strategic direction, but we must ensure our technical architecture can support these requirements efficiently and securely.`
    ],
    'Jordan (CMO)': [
      `From a marketing standpoint, this ${topic.toLowerCase()} opportunity could significantly enhance our brand positioning and customer engagement.`,
      `The customer experience implications are substantial. We should leverage this to strengthen our market presence and differentiate from competitors.`
    ],
    'Taylor (CFO)': [
      `Analyzing the financial implications of ${topic.toLowerCase()}, we need to carefully evaluate ROI projections and budget allocation.`,
      `While I see the strategic value, we must ensure this investment delivers measurable returns and doesn't compromise our financial stability.`
    ],
    'Casey (Advisor)': [
      `Considering all perspectives on ${topic.toLowerCase()}, we should weigh the long-term implications against short-term gains.`,
      `The discussion highlights important trade-offs. We need to ensure our decision considers ethical implications and sustainable growth.`
    ]
  };

  const personaResponses = responses[persona.name as keyof typeof responses] || [
    `This is an important consideration for ${topic.toLowerCase()}. We should carefully evaluate all aspects.`,
    `Based on the discussion, I believe we need to take a balanced approach to this decision.`
  ];

  return personaResponses[Math.min(round - 1, personaResponses.length - 1)];
}

// Main debate orchestrator flow
export async function multiAiDebateFlow(input: z.infer<typeof DebateConfigSchema>): Promise<z.infer<typeof DebateStateSchema>> {
  const debatePersonas = input.selectedPersonas 
    ? input.selectedPersonas.map(name => getPersonaByName(name)).filter(Boolean) as Persona[]
    : selectRelevantPersonas(input.topic, input.debateMode);

  const debateState: z.infer<typeof DebateStateSchema> = {
    topic: input.topic,
    mode: input.debateMode,
    personas: debatePersonas.map(p => p.name),
    currentRound: 1,
    currentTurn: 1,
    messages: [],
    isComplete: false,
  };

  // Conduct the debate rounds
  for (let round = 1; round <= input.maxRounds; round++) {
    debateState.currentRound = round;
    
    // Each persona gets to speak in each round
    for (let turn = 0; turn < debatePersonas.length; turn++) {
      debateState.currentTurn = turn + 1;
      const speakingPersona = debatePersonas[turn];
      
      // Build context from previous messages
      const context = debateState.messages.map(msg => ({
        persona: msg.persona,
        message: msg.message,
        timestamp: msg.timestamp,
      }));

      // Generate prompt for this persona
      const prompt = generateDebatePrompt({
        topic: input.topic,
        currentContext: context,
        speakingPersona: speakingPersona.name,
        personaDetails: {
          name: speakingPersona.name,
          title: speakingPersona.title,
          description: speakingPersona.description,
          expertise: speakingPersona.expertise,
          prompt: speakingPersona.prompt,
        },
        round,
        isRebuttal: round > 1, // First round is initial positions, later rounds are rebuttals
      });

      // For now, generate a mock response - in production this would call an AI API
      const mockResponse = generateMockPersonaResponse(speakingPersona, input.topic, round);

      // Add message to debate state
      debateState.messages.push({
        persona: speakingPersona.name,
        message: mockResponse,
        timestamp: new Date().toISOString(),
        round,
        turn: turn + 1,
      });
    }

    // Check for consensus or completion after each round
    if (round === input.maxRounds) {
      debateState.isComplete = true;
    }
  }

  return debateState;
}

// Streaming version for real-time debates
export async function* streamMultiAiDebate(config: z.infer<typeof DebateConfigSchema>) {
  const debatePersonas = config.selectedPersonas 
    ? config.selectedPersonas.map(name => getPersonaByName(name)).filter(Boolean) as Persona[]
    : selectRelevantPersonas(config.topic, config.debateMode);

  const debateState: z.infer<typeof DebateStateSchema> = {
    topic: config.topic,
    mode: config.debateMode,
    personas: debatePersonas.map(p => p.name),
    currentRound: 1,
    currentTurn: 1,
    messages: [],
    isComplete: false,
  };

  // Yield initial state
  yield {
    type: 'debate-started',
    data: debateState,
  };

  // Conduct the debate rounds with streaming
  for (let round = 1; round <= config.maxRounds; round++) {
    debateState.currentRound = round;
    
    yield {
      type: 'round-started',
      data: { round, personas: debatePersonas.map(p => p.name) },
    };

    // Each persona gets to speak in each round
    for (let turn = 0; turn < debatePersonas.length; turn++) {
      debateState.currentTurn = turn + 1;
      const speakingPersona = debatePersonas[turn];
      
      yield {
        type: 'turn-started',
        data: { 
          persona: speakingPersona.name, 
          round, 
          turn: turn + 1,
          personaDetails: speakingPersona,
        },
      };

      // Build context from previous messages
      const context = debateState.messages.map(msg => ({
        persona: msg.persona,
        message: msg.message,
        timestamp: msg.timestamp,
      }));

      try {
        // Generate mock response for testing
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        const mockResponse = generateMockPersonaResponse(speakingPersona, config.topic, round);

        const message = {
          persona: speakingPersona.name,
          message: mockResponse,
          timestamp: new Date().toISOString(),
          round,
          turn: turn + 1,
        };

        // Add message to debate state
        debateState.messages.push(message);

        yield {
          type: 'message-generated',
          data: {
            ...message,
            confidence: Math.floor(Math.random() * 30) + 70, // Random confidence 70-100
            keyPoints: [`Key insight from ${speakingPersona.name}`, 'Strategic consideration', 'Implementation note'],
            agreesWih: round > 1 ? [debateState.messages[Math.floor(Math.random() * debateState.messages.length)]?.persona].filter(Boolean) : undefined,
            disagreesWith: undefined,
          },
        };

      } catch (error) {
        yield {
          type: 'error',
          data: { 
            persona: speakingPersona.name, 
            error: error instanceof Error ? error.message : 'Unknown error',
            round,
            turn: turn + 1,
          },
        };
      }
    }

    yield {
      type: 'round-completed',
      data: { round, messagesInRound: debatePersonas.length },
    };
  }

  debateState.isComplete = true;
  
  yield {
    type: 'debate-completed',
    data: debateState,
  };
}

// Utility function to generate debate summary
export async function generateDebateSummary(debateState: z.infer<typeof DebateStateSchema>) {
  // Generate a mock summary for testing
  const participantPersonas = [...new Set(debateState.messages.map(msg => msg.persona))];
  
  return {
    summary: `This debate on "${debateState.topic}" involved ${participantPersonas.length} executive perspectives across ${debateState.currentRound} rounds. The discussion covered strategic, technical, marketing, financial, and advisory considerations.`,
    keyConsensusPoints: [
      'All executives agreed on the importance of careful planning',
      'Strategic alignment with company vision was emphasized',
      'Risk assessment and mitigation were highlighted as priorities'
    ],
    majorDisagreements: [
      'Timeline expectations varied between departments',
      'Budget allocation priorities differed between executives',
      'Implementation approach preferences showed some conflict'
    ],
    recommendations: [
      'Develop a comprehensive implementation roadmap',
      'Establish clear success metrics and milestones',
      'Create cross-functional working groups for execution',
      'Regular review checkpoints to assess progress'
    ],
    nextSteps: [
      'Schedule follow-up meeting with all stakeholders',
      'Prepare detailed project proposal and budget',
      'Identify required resources and capabilities',
      'Set timeline for initial implementation phase'
    ]
  };
}

export type DebateConfig = z.infer<typeof DebateConfigSchema>;
export type DebateState = z.infer<typeof DebateStateSchema>;
export type DebateTurn = z.infer<typeof DebateTurnSchema>;