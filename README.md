# MCP Connect via HTTP

Express REST API that connects to Model Context Protocol (MCP) servers (such as DeepWiki and Dynamics 365 Commerce) over Streamable HTTP.

---

## 📁 Architecture & Folder Structure

The project follows a standard **MVC + Services** layered architecture:

```text
src/
├── config/                  # Environment variables & configuration
│   └── env.ts               # Typed configuration from process.env
│
├── controllers/             # (C in MVC) Request handling & HTTP response formatting
│   ├── d365.controller.ts    # D365 tool execution & AI chat handlers
│   ├── deepwiki.controller.ts# DeepWiki tools, chat, and repo structure handlers
│   ├── github.controller.ts  # GitHub user indexed repos handler
│   └── health.controller.ts  # Health check handler
│
├── models/                  # (M in MVC) Zod validation schemas, interfaces & DTOs
│   ├── d365.model.ts        # D365 input schemas, chat context & tool call types
│   ├── deepwiki.model.ts    # DeepWiki chat & repo validation schemas
│   └── github.model.ts      # GitHub repo & indexing result types
│
├── routes/                  # Express route definitions mapping URLs to controllers
│   ├── index.ts             # Aggregator router mounting all feature sub-routes
│   ├── d365.routes.ts       # Routes under /d365
│   ├── deepwiki.routes.ts   # Routes for /tools, /chat, and /wiki
│   ├── github.routes.ts     # Routes under /users
│   └── health.routes.ts     # Routes under /health
│
├── services/                # Business logic, OpenAI agent & external API calls
│   ├── d365.service.ts      # D365 MCP client calls, OpenAI agent & session store
│   ├── deepwiki.service.ts  # DeepWiki MCP calls (tools, questions, structure)
│   └── github.service.ts    # GitHub public REST API fetcher
│
├── middleware/              # Express middlewares
│   ├── d365Guard.ts         # Verifies D365 configuration before handling requests
│   └── errorHandler.ts      # Centralized error handling middleware
│
├── lib/                     # Infrastructure SDK clients & connection wrappers
│   └── mcpClient.ts         # Generic McpConnection class & MCP client singletons
│
├── utils/                   # Pure utility functions & shared helpers
│   ├── concurrency.ts       # Parallel batch processing with concurrency limits
│   ├── errors.ts            # Custom error classes (GitHubError) & error checkers
│   └── json.ts              # Safe JSON parsing helper
│
├── app.ts                   # Express application setup & middleware registration
└── server.ts                # Application entry point, server listener & graceful shutdown
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your configuration:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm start
```

### 5. Typecheck
```bash
npm run typecheck
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check endpoint |
| `GET` | `/tools` | List DeepWiki MCP tools |
| `POST` | `/chat` | Ask questions about a GitHub repo via DeepWiki |
| `GET` | `/wiki/:owner/:repo/structure` | Fetch table of contents for a repo's DeepWiki |
| `GET` | `/users/:username/indexed-repos` | Check which of a user's GitHub repos are indexed by DeepWiki |
| `GET` | `/d365/tools` | List D365 Commerce MCP tools |
| `POST` | `/d365/tools/:name` | Call a specific D365 Commerce tool directly |
| `POST` | `/d365/chat` | AI shopping assistant chat (OpenAI Agent + D365 tools) |
| `DELETE` | `/d365/chat/:sessionId` | Reset / delete a chat session |
