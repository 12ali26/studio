
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ConsensusAI is a Next.js application that creates an AI-powered virtual boardroom for business decision-making. The app simulates different executive personas (CEO, CTO, CMO, CFO, Strategic Advisor) in debates to help users analyze business decisions from multiple perspectives.

## Development Commands

- `npm run dev` - Start development server on port 9002 with Turbopack
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run genkit:dev` - Start Genkit development server
- `npm run genkit:watch` - Start Genkit with file watching

## Multi-AI Debate System (CHUNK 4 Complete)

### Core Features
- **Multi-AI Orchestration**: Coordinate multiple AI personas in structured debates
- **Real-time Streaming**: Server-Sent Events for live debate updates
- **Turn-based Logic**: Intelligent turn management with context sharing
- **Multiple Debate Modes**: Boardroom (5 AIs), Expert Panel (2-3 AIs), Quick Consult (1 AI), Custom
- **Advanced State Management**: React Context with real-time debate tracking

## Advanced Cost Management & Billing System (CHUNK 5 Complete)

### Core Features
- **Subscription Tiers**: 4-tier system (Starter, Professional, Boardroom, Enterprise) with feature limits
- **Real-time Cost Calculation**: Token tracking and cost estimation for all AI operations
- **Usage Tracking**: Comprehensive usage limits and violation detection
- **Budget Management**: Monthly budgets, spending limits, and automated alerts
- **Billing Engine**: Usage-based billing with prorated charges and invoice generation
- **Cost Analytics**: Rich dashboards with usage trends and model breakdowns
- **Cost Optimization**: AI-powered recommendations to reduce spending

## Architecture

### AI Integration
- **Genkit Framework**: Uses Google's Genkit for AI orchestration (`src/ai/genkit.ts`)
- **OpenRouter API**: Alternative AI provider integration via `/api/generate` route
- **Multi-AI Orchestrator**: New flow at `src/ai/flows/multi-ai-debate-orchestrator.ts`
- **Streaming API**: Enhanced debate streaming at `/api/debate-stream` route
- **Dual AI Support**: Can use both Google Gemini (via Genkit) and OpenRouter models
- **AI Flows**: Located in `src/ai/flows/` for different AI operations

### Core Components
- **Personas System**: Defined in `src/lib/personas.ts` - contains 5 executive personas with distinct prompts and expertise areas
- **Enhanced Debate View**: New multi-AI interface at `src/components/boardroom/enhanced-debate-view.tsx`
- **Debate State Management**: React hooks and context at `src/hooks/use-debate-state.ts` and `src/contexts/debate-context.tsx`
- **Enhanced Agent Cards**: Rich message components at `src/components/boardroom/enhanced-agent-card.tsx`
- **Debate Controls**: Real-time control panel at `src/components/boardroom/debate-control-panel.tsx`
- **Authentication**: Google Sign-in integration via `src/components/auth/user-auth-form.tsx`
- **UI Components**: Radix UI + Tailwind CSS in `src/components/ui/`

### Billing & Cost Management
- **Subscription System**: Tier definitions and utilities at `src/lib/subscription-tiers.ts`
- **Cost Calculator**: Real-time cost tracking at `src/lib/cost-calculator.ts`
- **Usage Tracker**: Usage limits and violation detection at `src/lib/usage-tracker.ts`
- **Billing Engine**: Subscription and invoice management at `src/lib/billing-engine.ts`
- **Cost Analytics Dashboard**: Rich analytics at `src/components/analytics/cost-analytics-dashboard.tsx`
- **Budget Management**: Budget controls at `src/components/billing/budget-management.tsx`
- **Subscription Management**: Tier management at `src/components/billing/subscription-management.tsx`
- **Cost Optimization**: AI recommendations at `src/components/analytics/cost-optimization.tsx`

### Routing Structure
- `/` - Authentication page
- `/boardroom` - Main debate interface
- `/api/generate` - AI completion endpoint (OpenRouter)

### Styling
- **Dark Theme**: Primary color #1E3A8A, background #0A192F, accent #7E57C2
- **Fonts**: Inter (body), Space Grotesk (headlines)
- **Design**: Glassmorphism effects, modern minimalist UI

## Environment Setup

Set `OPENROUTER_API_KEY` environment variable for OpenRouter AI models. The app supports both Google AI (via Genkit) and OpenRouter for flexibility.

## Development Notes

- TypeScript and ESLint errors are ignored during builds (configured in `next.config.ts`)
- Uses path aliases: `@/*` maps to `./src/*`
- Firebase integration configured via `apphosting.yaml`
- Supports both Gemini and OpenRouter models for AI responses