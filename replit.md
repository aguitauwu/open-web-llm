# AI Chat Assistant

## Overview

This is a full-stack AI chat application built with React, Express, and PostgreSQL. The application provides a conversational interface where users can interact with various AI models, enhanced with web search capabilities. Users can authenticate via Replit Auth, create multiple conversations, and get AI responses with optional web search integration through Hugging Face models and Google Custom Search API.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the user interface
- **Vite** as the build tool and development server
- **TanStack Query** for server state management and API caching
- **Wouter** for client-side routing
- **Tailwind CSS** with shadcn/ui components for styling
- **Component Structure**: Modular design with separate components for chat area, sidebar, messages, and authentication

### Backend Architecture
- **Express.js** server with TypeScript
- **RESTful API** design with route handlers for conversations, messages, and authentication
- **Session-based authentication** using Replit Auth with OpenID Connect
- **Middleware**: Express session management, JSON parsing, and request logging
- **Error handling**: Centralized error middleware with proper HTTP status codes

### Database Layer
- **PostgreSQL** as the primary database
- **Drizzle ORM** for type-safe database operations and schema management
- **Neon Database** integration for serverless PostgreSQL hosting
- **Schema Design**: Normalized tables for users, conversations, messages, search results, and sessions
- **Connection Pooling**: Configured for optimal performance

### Authentication & Authorization
- **Replit Auth** integration with OpenID Connect protocol
- **Session Management**: PostgreSQL-backed session storage with connect-pg-simple
- **User Context**: Authentication state managed through React Query
- **Route Protection**: Server-side middleware and client-side guards

### External Service Integrations
- **Google Gemini API**: Primary AI service with 5 models (2.5 Flash, 2.5 Pro, 1.5 Flash, 1.5 Pro, 1.0 Pro)
- **Mistral AI API**: Direct integration with 4 models (Large, 7B, Mixtral 8x7B, 8x22B)
- **OpenRouter API**: Access to 5 premium models (GPT-4o, Claude 3.5, Llama 3.1 70B, Qwen 2.5 72B, DeepSeek V3)
- **Google Custom Search API**: For web search capabilities with cached results
- **Model Selection**: Total of 15 different AI models across three providers

### State Management
- **Server State**: TanStack Query for API data caching and synchronization
- **Client State**: React hooks for UI state (theme, sidebar, input state)
- **Form Handling**: React Hook Form with Zod validation schemas
- **Toast Notifications**: Radix UI toast system for user feedback

### Development & Build Process
- **TypeScript**: Full type safety across frontend and backend
- **Shared Types**: Common schema definitions between client and server
- **Hot Reload**: Vite HMR for fast development cycles
- **Build Pipeline**: Separate builds for client (Vite) and server (esbuild)

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Auth**: Authentication service with OpenID Connect

### AI & Search Services
- **Hugging Face Inference API**: AI model hosting and inference
- **Google Custom Search API**: Web search functionality

### Frontend Libraries
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide Icons**: SVG icon library
- **React Icons**: Additional icon sets

### Backend Libraries
- **Drizzle ORM**: Type-safe database toolkit
- **Passport.js**: Authentication middleware
- **Express Session**: Session management
- **Zod**: Runtime type validation

### Development Tools
- **Vite**: Frontend build tool with plugins for React and error overlay
- **ESBuild**: Fast JavaScript bundler for server code
- **TypeScript**: Static type checking
- **PostCSS**: CSS processing with Tailwind and Autoprefixer