import { config } from 'dotenv';
config();

import '@/ai/flows/message-summarizer.ts';
import '@/ai/flows/ai-persona-selector.ts';
import '@/ai/flows/debate-visualizer-flow.ts';
import '@/ai/flows/conversation-starter.ts';