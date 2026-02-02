# Clarification Questions: Automation Improvements

To provide the best roadmap, I need to understand your priorities for the "Existing Models" and functionality:

### 1. Logic Complexity
- Do you want support for **conditional branching** (e.g., IF user says "Price" → Action A, ELSE → Action B)?
- Should we implement **Waiting/Delay** nodes (e.g., "Wait 5 minutes before replying")?

### 2. AI & Inteligence
- Are you looking for **native AI integration** (e.g., a node where you just paste an OpenAI API Key and the bot "chats")?
- Would **Keyword Regex** or **Intent Matching** be more useful than the current "Text Contains" logic?

### 3. Data & Variables
- Should the bot be able to **store information** from the user? (e.g., Ask "What is your email?" → Save to a variable → Use in a later webhook).

### 4. Advanced WhatsApp Features
- The Evolution API supports **Buttons, Lists, and Templates**. Should we add specialized nodes for these interactive messages?

### 5. Multi-Step Conversational State
- Currently, the engine handles one-off matches. Do you want **stateful conversations** (where the user can "step through" a flow)?

---
*Please indicate which of these are High, Medium, or Low priority for you.*
