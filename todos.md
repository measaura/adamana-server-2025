# Adamana Server (2025) - Todos

## Phase 1: Core Setup & Map Display

*   [/] **Project Initialization**:
    *   [x] Initialize Laravel project (`adamana-server-2025`) with Inertia / React.
    *   [x] Configure database (MySQL).
    *   [/] Migrate reusable script from old Laravel project (`adamana-server`)

*   [/] **Device Simulator deveopment**:
    *   [/] Build Node.js device simulator for API testing
    *   [ ] Integrate automated location update, based on lists of coordinate input (csv)

*   [/] **Dashboard Development**:
    *   [/] Add Google Maps
    *   [ ] Add device list overlaying the map
    *   [ ] Add Device Management page
    *   [ ] Add Administrator page
    *   [ ] Add User Access Level management (Sanctum/Passport)

## Architecture Diagram
```mermaid
---
id: 27014c79-7035-435d-8578-478a25379d75
---
graph TD
    subgraph Client
        Browser[Browser]
    end

    subgraph Server
        Controller[Controller]
        Middleware[Middleware]
        Service[Service Layer]
        Model[Model]
        View[View]
    end

    subgraph Database
        DB[(Database)]
    end

    subgraph ExternalServices
        API[External APIs]
        Queue[Queue System]
        Storage[Cloud Storage]
    end

    Browser -->|HTTP Request| Middleware
    Middleware --> Controller
    Controller --> Service
    Service --> Model
    Model --> DB
    Controller --> View
    View -->|HTML Response| Browser

    Service --> API
    Service --> Queue
    Service --> Storage
```
---
**Key for Status:**
*   [ ] - To Do
*   [/] - In Progress
*   [x] - Completed
*   [-] - Cancelled/Postponed
