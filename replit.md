# Overview

Stelluna is an AI chat application that provides an affordable and accessible alternative to ChatGPT. The application features a modern React frontend with a Node.js/Express backend, supporting multiple AI models including Google Gemini, Mistral, and OpenRouter APIs. It includes conversation management, web search integration, YouTube search, image search capabilities, and Google OAuth authentication.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Component Structure**: Modular component architecture with separate UI components, pages, and feature-specific components

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured route handling
- **File Structure**: Separation of concerns with dedicated modules for authentication, database operations, AI integrations, and route handling

## Authentication System
- **Primary Method**: Google OAuth 2.0 integration using Passport.js
- **Session Management**: Express sessions with configurable storage (PostgreSQL or MongoDB)
- **Fallback Support**: Replit OAuth integration for development environments
- **Security**: HTTP-only cookies, CSRF protection, and secure session configuration

## Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Alternative Storage**: 
  - MongoDB support with native MongoDB driver
  - Local storage fallback for development/demo environments
- **Session Storage**: Configurable between PostgreSQL (connect-pg-simple) and MongoDB (connect-mongo)
- **Schema Management**: Drizzle migrations with versioned schema definitions

## AI Model Integration
- **Google Gemini**: Primary AI provider using Google GenAI SDK (models: 2.5 Flash, 2.5 Pro, 1.5 Flash, 1.5 Pro, 1.0 Pro)
- **Mistral AI**: Secondary provider via REST API (models: Large, 7B, Mixtral variants)
- **OpenRouter**: Third provider for accessing various models (GPT-4o, Claude 3.5, Llama 3.1, etc.)
- **Fallback System**: Graceful degradation with demo responses when AI services are unavailable

## Search Integration
- **Web Search**: Google Custom Search API integration for real-time web results
- **YouTube Search**: YouTube Data API v3 for video content search
- **Image Search**: Google Custom Search API with image-specific parameters
- **Caching**: Search result caching to optimize API usage and response times

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL for production, with MongoDB and local storage as alternatives
- **Deployment**: Vercel for hosting with serverless function architecture
- **Session Storage**: PostgreSQL or MongoDB for persistent session management

## AI Services
- **Google Gemini API**: Primary AI model provider requiring GEMINI_API_KEY
- **Mistral AI API**: Secondary AI provider requiring MISTRAL_API_KEY
- **OpenRouter API**: Third AI provider requiring OPENROUTER_API_KEY

## Authentication Services
- **Google OAuth**: Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- **Replit Auth**: Development environment authentication (optional)

## Search APIs
- **Google Custom Search**: Requires GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID
- **YouTube Data API**: Integrated with Google API credentials

## Development Tools
- **Vite**: Frontend build tool with HMR and development server
- **Drizzle Kit**: Database schema management and migrations
- **TypeScript**: Type safety across frontend and backend
- **ESLint/Prettier**: Code quality and formatting (implied by tsconfig)

## UI/UX Libraries
- **Radix UI**: Headless component library for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **React Hook Form**: Form handling with validation
- **TanStack Query**: Server state management and caching