# PRD: Evolution Sync 2.0 - Visual Automation Builder

## 1. Introduction
We are replacing the current "List & Modal" automation UI with a **Visual Node Editor** (similar to n8n/Make). This requires migrating the frontend to a modern React stack.

## 2. Tech Stack Requirements (User Specified)
- **Build**: Vite 5 + React 18
- **Styling**: Tailwind CSS v3, Radix UI, Lucide Icons
- **State/Fetch**: TanStack Query v5
- **Animations**: Framer Motion
- **Core Lib**: React Flow (xyflow)
- **Utilities**: clsx, tailwind-merge

## 3. Product Features

### 3.1 The Dashboard (React Port)
- Replicate existing functionality:
    - Login Screen (JWT Auth)
    - Instance List (Status badges, Connect Wizard with QR)
    - Sidebar Navigation

### 3.2 The Visual Editor
- **Canvas**: Infinite grid, zoomable/pannable.
- **Trigger Node**:
    - Select Provider (Evolution / Green API).
    - Filters: Message Type (Text/Image), Source (Group/Private), Keywords.
- **Action Node**:
    - Send Message (Text).
    - Configurable Inputs (To JID, Message Content).
- **Edges**: Connect Trigger Output -> Action Input.
- **Validation**: Prevent saving if critical fields are empty.

### 3.3 Data Model Changes
- **Backend API**: The backend currently expects a flat JSON `trigger` and `actions` array.
- **Frontend State**: The Visual Editor will work with a Graph JSON (Nodes/Edges).
- **Transformation Layer**: When saving, the frontend must "compile" the Graph -> Backend Rules Format.
    - *Future*: We might update the backend to store the layout JSON (nodes/edges) to preserve UI positioning. For MVP, we might just store logic.

## 4. User Experience (The "Wow" Factor)
- **Glassmorphism**: Dark, semi-transparent panels.
- **Smoothness**: Framer Motion for all layout changes.
- **Feedback**: Toasts (Sonner/Hot-Toast) for all actions.

## 5. Success Metrics
- A user can create a "Reply to 'Hello'" rule using the visual editor in < 30 seconds.
- The rule successfully executes on the backend.
- The UI handles both Evolution API and Green API instances seamlessly.
