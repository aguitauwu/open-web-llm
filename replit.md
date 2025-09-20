# Overview

Stelluna is a multi-provider AI chat application that offers a budget-friendly alternative to ChatGPT. The application provides an intuitive interface for interacting with various AI models from different providers, featuring conversation management, web search integration, and multiple search capabilities. Built with a modern TypeScript stack, it includes both frontend and backend components with database storage and authentication systems.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: TailwindCSS with shadcn/ui component library for consistent UI components
- **State Management**: TanStack Query (React Query) for server state management and API caching
- **Routing**: Wouter for client-side routing
- **Authentication Flow**: Google OAuth integration with support for demo mode
- **Responsive Design**: Mobile-first approach with responsive sidebar and chat interface

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL using Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL storage via connect-pg-simple
- **Authentication**: Passport.js with Google OAuth 2.0 strategy
- **API Structure**: RESTful endpoints for conversations, messages, and user management

## Data Storage Solutions
- **Primary Database**: Neon PostgreSQL for production data storage
- **ORM**: Drizzle ORM with code-first schema definitions
- **Session Storage**: PostgreSQL-backed session store for authentication persistence
- **Alternative Storage**: MongoDB and LocalStorage implementations available as fallback options
- **Schema**: Includes users, conversations, messages, search results, and session tables

## Authentication and Authorization
- **Primary Method**: Google OAuth 2.0 using Passport.js
- **Session Management**: Server-side sessions with secure HTTP-only cookies
- **Demo Mode**: Guest access without authentication for demonstration purposes
- **Authorization**: Route-level protection with user context validation

# External Dependencies

## AI Service Providers
- **Google Gemini**: Primary AI provider using @google/genai SDK (models: 2.5 Flash, 2.5 Pro, 1.5 Flash, 1.5 Pro, 1.0 Pro)
- **Mistral AI**: Secondary AI provider via REST API (models: Large, 7B, Mixtral 8x7B, Mixtral 8x22B)
- **OpenRouter**: Third AI provider for additional model access (GPT-4o, Claude 3.5, Llama 3.1 70B, Qwen 2.5 72B, DeepSeek V3)

## Search Integrations
- **Google Custom Search API**: Web search functionality with configurable search engine
- **YouTube Data API**: Specialized YouTube content search capabilities
- **Google Images API**: Image search with thumbnail and full-size image results

## Database and Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **WebSocket Support**: Real-time capabilities using ws library for database connections

## Authentication Services
- **Google OAuth**: User authentication and profile management
- **Optional HuggingFace**: Planned integration for additional AI model access

## Development and Build Tools
- **Vite**: Frontend build tool with hot module replacement
- **ESBuild**: Backend bundling for production deployment
- **Replit Integration**: Development environment support with runtime error overlay
- **Vercel**: Deployment platform configuration for static asset serving