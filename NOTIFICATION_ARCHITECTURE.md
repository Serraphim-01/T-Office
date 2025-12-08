# Notification System Architecture

## Component Diagram

```mermaid
graph TD
    A[Frontend Client] --> B[Socket.IO Client]
    C[Backend Server] --> D[Socket.IO Server]
    E[Chat Routes] --> D
    F[Other Services] --> D
    D --> B
    B --> G[Notification Context]
    G --> H[Notification Panel]
    G --> I[UI Components]
    G --> J[localStorage]
    
    subgraph Frontend
        A
        B
        G
        H
        I
        J
    end
    
    subgraph Backend
        C
        D
        E
        F
    end
```

## Data Flow

1. **User Action**: User sends a chat message
2. **API Call**: Frontend makes POST request to chat endpoint
3. **Message Processing**: Backend saves message to database
4. **Notification Broadcasting**: Backend sends notification via Socket.IO to all other connected users
5. **Client Reception**: Frontend receives notification via WebSocket
6. **State Update**: Notification context updates with new notification
7. **UI Update**: Notification panel and header badge update
8. **Persistence**: Notification saved to localStorage

## Notification Lifecycle

```mermaid
graph LR
    A[Notification Created] --> B[Added to Context]
    B --> C[Persisted to localStorage]
    C --> D[Displayed in UI]
    D --> E{User Interaction}
    E --> F[Mark as Read]
    E --> G[Navigate to Source]
    E --> H[Dismiss]
    F --> I[Update Context]
    G --> I
    H --> I
    I --> J[Update localStorage]
```