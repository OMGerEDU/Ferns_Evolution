# Roadmap: Evolution Sync 2.0 (Visual Automation)

**Goal**: Transform the simple Admin Dashboard into a professional, "World-Class" React Application with a Visual Node Editor for Automations.

## Phases

### Phase 1: Foundation (The React Migration)
*Objective: Establish the new frontend architecture aligning with the user's preferred stack.*
- [ ] Initialize `client/` directory with Vite + React 18 + JavaScript.
- [ ] Configure Tailwind CSS v3, clsx, tailwind-merge.
- [ ] Setup React Router v6 and TanStack Query v5.
- [ ] Port existing "Instances" dashboard from Vanilla JS to React Components (Radix UI).
- [ ] Ensure full parity with existing features (Connect/Logout/Delete).

### Phase 2: The Visual Editor (MVP)
*Objective: A working read/write canvas for automation rules.*
- [ ] Integrate **React Flow** (xyflow).
- [ ] Design Custom Nodes:
    - **Trigger Node**: Message Filters (Text/Image, Group/Private).
    - **Action Node**: Send Message.
- [ ] Implement Drag-and-Drop Sidebar.
- [ ] Build "Compiler": Convert the visual graph JSON -> Backend Rule JSON.

### Phase 3: Advanced Capabilities
*Objective: Reaching "Zapier/n8n" level features.*
- [ ] **Variable Mapping**: Drag output from Trigger -> Input of Action.
- [ ] **Logic Nodes**: If/Else branching, Delay, Randomizer.
- [ ] **HTTP Request Node**: A UI to build custom API calls (Webhooks).
- [ ] **Test Mode**: Run a rule with specific mock data directly from the canvas.

### Phase 4: Polish & "Wow" Factors
- [ ] Framer Motion animations for modal transitions and sidebars.
- [ ] Dark Mode aesthetic refinement (Glassmorphism).
- [ ] Real-time execution logs (WebSockets) lighting up the canvas edges.

## Timeline Estimate
- **Phase 1**: 2-3 Days (Setup & Porting)
- **Phase 2**: 3-4 Days (Canvas & Basic Nodes)
- **Phase 3**: 1 Week (Advanced Logic)
