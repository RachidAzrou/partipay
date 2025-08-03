# PartiPay - Bill Splitting Application

## Overview

PartiPay is a Dutch mobile web application designed for collaborative restaurant bill splitting. The application enables users to scan QR codes at restaurant tables to retrieve bill information and then split costs either equally among participants or by individual items. The system features real-time collaboration through WebSocket connections, allowing multiple users to participate in the same session and see updates instantly.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built as a React SPA using Vite as the build tool. The application follows a component-based architecture with:
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management with real-time updates
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Mobile-First Design**: Responsive design optimized for mobile devices with PWA capabilities

The frontend implements a multi-step wizard flow for bill splitting:
1. QR code scanning to retrieve bill data
2. Split mode selection (equal or by items)
3. User registration and item selection
4. Real-time collaboration dashboard

### Backend Architecture
The server uses Express.js with TypeScript, following a RESTful API pattern with WebSocket support for real-time features:
- **HTTP Server**: Express.js handling REST endpoints
- **WebSocket Server**: Real-time bidirectional communication for session updates
- **Session Management**: In-memory session tracking with WebSocket client mapping
- **Storage Layer**: Abstracted storage interface for database operations

The backend implements a broadcasting system where changes in a session are pushed to all connected clients in real-time.

### Database Design
The application uses PostgreSQL with Drizzle ORM for type-safe database operations. The schema includes:
- **Sessions**: Bill splitting sessions with metadata
- **Participants**: Users in each session with payment status
- **Bill Items**: Individual items from restaurant bills
- **Item Claims**: Many-to-many relationship between participants and claimed items
- **Payments**: Payment tracking and status

The database design supports both equal splitting and item-based splitting modes through the flexible claims system.

### Real-Time Communication
WebSocket connections are established per client and organized by session ID. The system broadcasts updates for:
- New participant joins
- Item claims/unclaims
- Payment status changes
- Session state updates

### Development Architecture
The project uses a monorepo structure with shared TypeScript types and schemas:
- **Shared Directory**: Common types, database schema, and validation schemas
- **Client Directory**: React frontend application
- **Server Directory**: Express backend with API routes and WebSocket handling
- **Type Safety**: End-to-end type safety using shared Zod schemas

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Drizzle ORM**: Type-safe database toolkit with schema management

### Frontend Libraries
- **React Ecosystem**: Core React with hooks and context
- **TanStack Query**: Server state management and caching
- **Wouter**: Lightweight routing solution
- **shadcn/ui**: Component library built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework

### Backend Libraries
- **Express.js**: Web framework for Node.js
- **WebSocket (ws)**: Real-time bidirectional communication
- **Zod**: Runtime type validation and parsing

### Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Static type checking across the entire stack
- **ESBuild**: Fast JavaScript bundler for production builds
- **Drizzle Kit**: Database migration and schema management

### Third-Party Services
- **QR Server API**: External service for QR code generation
- **Font Awesome**: Icon library for UI elements
- **Google Fonts**: Web font service (Inter font family)

The application is designed to be deployed on platforms supporting Node.js with PostgreSQL database connectivity.