# T-Office Architecture Diagram

This document provides a comprehensive overview of the T-Office project architecture, including the directory structure, key components, and system interactions.

## Table of Contents
1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Directory Structure](#directory-structure)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Data Flow](#data-flow)
7. [Technology Stack](#technology-stack)

## Overview

T-Office is a full-stack internal office management platform designed to streamline administrative, HR, inventory, and collaboration workflows within an organization. It combines frontend interactivity with backend services to support features like user authentication, chat, dashboards, HR onboarding, and inventory tracking.

## High-Level Architecture

```mermaid
graph TD
    A[Client Browser] --> B[Next.js Frontend]
    B --> C[Express Backend API]
    C --> D[(PostgreSQL Database)]
    
    subgraph Frontend
        B
    end
    
    subgraph Backend
        C
    end
    
    subgraph Data
        D
    end
```

## Directory Structure

```
T-Office/
├── app/                     # Next.js App Router pages and layouts
│   ├── login/               # Authentication pages
│   ├── signup/
│   ├── dashboard/           # Main dashboard page
│   ├── hr/                  # HR management section
│   ├── admin/               # Admin panel
│   ├── inventory/           # Inventory management
│   ├── resources/wiki/      # Knowledge base/wiki
│   ├── chat/                # Chat module
│   ├── profile/             # User profile settings
│   ├── clock/               # Time tracking
│   ├── settings/            # Application settings
│   ├── about/               # About page
│   ├── help/                # Help documentation
│   ├── offline/             # Offline support page
│   ├── test/                # Testing pages
│   ├── layout.tsx           # Root layout component
│   └── page.tsx             # Home page
├── backend/                 # Express backend server
│   ├── routes/              # API route handlers
│   ├── utils/               # Helper functions
│   ├── index.js             # Server entry point
│   └── package.json         # Backend dependencies
├── components/              # Reusable UI components
│   ├── ui/                  # Atomic design system components
│   ├── navbar.tsx           # Navigation component
│   ├── footer.tsx           # Footer component
│   └── dashboard-layout.tsx # Dashboard layout
├── lib/                     # Shared logic and utilities
│   ├── auth-context.tsx     # Authentication context
│   └── ui-context.tsx       # UI context provider
├── public/                  # Static assets
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker
├── db/                      # Database migration files
├── hooks/                   # Custom React hooks
└── package.json             # Root dependencies and scripts
```

## Frontend Architecture

The frontend is built with Next.js 13.5.1 using the App Router pattern. It follows a component-based architecture with a clear separation of concerns.

### Key Components

```mermaid
graph TD
    A[Root Layout] --> B[Navbar]
    A --> C[Page Content]
    A --> D[Footer]
    
    C --> E[Dashboard]
    C --> F[Authentication Pages]
    C --> G[HR Management]
    C --> H[Admin Panel]
    C --> I[Inventory System]
    C --> J[Wiki/Resources]
    C --> K[Chat Module]
    C --> L[Profile Settings]
    
    subgraph Layout Components
        A
        B
        D
    end
    
    subgraph Page Components
        C
        E
        F
        G
        H
        I
        J
        K
        L
    end
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    
    U->>F: Navigate to /login
    F->>U: Display login form
    U->>F: Submit credentials
    F->>B: POST /api/login
    B->>B: Validate credentials
    B->>B: Generate JWT token
    B->>F: Return token and user data
    F->>U: Store token, redirect to dashboard
```

## Backend Architecture

The backend is a standalone Node.js + Express server that exposes RESTful endpoints for the frontend to consume.

### API Structure

```mermaid
graph TD
    A[Express Server] --> B[Middleware]
    A --> C[Route Handlers]
    
    B --> D[CORS]
    B --> E[Body Parser]
    B --> F[Auth Middleware]
    
    C --> G[/api/auth]
    C --> H[/api/hr]
    C --> I[/api/admin]
    C --> J[/api/inventory]
    C --> K[/api/chat]
    C --> L[/api/profile]
    C --> M[/api/wiki]
    
    subgraph Middleware
        D
        E
        F
    end
    
    subgraph Routes
        G
        H
        I
        J
        K
        L
        M
    end
```

### Database Schema

```mermaid
erDiagram
    USERS ||--o{ HR_RECORDS : has
    USERS ||--o{ INVENTORY_ITEMS : manages
    USERS ||--o{ CHAT_MESSAGES : sends
    USERS ||--o{ WIKI_PAGES : creates
    
    USERS {
        int id PK
        string full_name
        string email
        string department
        string password_hash
    }
    
    HR_RECORDS {
        int id PK
        int user_id FK
        string position
        date start_date
        string status
    }
    
    INVENTORY_ITEMS {
        int id PK
        string name
        string description
        int quantity
        string location
    }
    
    CHAT_MESSAGES {
        int id PK
        int sender_id FK
        string content
        timestamp sent_at
    }
    
    WIKI_PAGES {
        int id PK
        string title
        string content
        string department
        int author_id FK
    }
```

## Data Flow

```mermaid
flowchart LR
    A[User Action] --> B[Frontend Component]
    B --> C[API Request]
    C --> D[Backend Route Handler]
    D --> E[Database Query]
    E --> F[Data Processing]
    F --> G[Response]
    G --> H[State Update]
    H --> I[UI Render]
    
    subgraph Client Side
        A
        B
        H
        I
    end
    
    subgraph Server Side
        C
        D
        E
        F
        G
    end
```

## Technology Stack

### Frontend
- **Framework**: Next.js 13.5.1 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.3.3
- **UI Components**: Radix UI primitives
- **State Management**: React Context API
- **Form Handling**: React Hook Form + Zod
- **Icons**: Lucide React
- **Notifications**: Sonner

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: PostgreSQL (pg driver)
- **Authentication**: JWT
- **Password Security**: bcrypt
- **Environment Management**: dotenv

### DevOps & Tooling
- **Build Tool**: npm scripts
- **Development Orchestration**: concurrently
- **Containerization**: Docker
- **Linting**: ESLint + TypeScript