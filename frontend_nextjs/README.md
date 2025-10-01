# Jira/Confluence Connector – Next.js Frontend

This frontend implements:
- OAuth 2.0 and API token authentication for Jira and Confluence
- Connection status indicators
- Views for Jira projects and Confluence spaces
- Frontend-to-backend REST communication
- Ocean Professional theme (Playful): vibrant colors, soft rounded corners, lively gradients
- Responsive two-column layout with sidebar navigation

Backend API endpoints expected:
- /auth/jira/oauth/start
- /auth/jira/oauth/callback
- /auth/jira/api-token
- /jira/projects
- /auth/confluence/oauth/start
- /auth/confluence/oauth/callback
- /auth/confluence/api-token
- /confluence/spaces

## Requirements
- Node.js 18+ recommended
- TailwindCSS v4 (already configured via @import "tailwindcss" in globals.css)
- A running FastAPI backend with the endpoints above

## Environment
Copy .env.example to .env and set:
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

The app uses NEXT_PUBLIC_BACKEND_URL on the client to call the FastAPI backend.

## Getting Started
1) Install dependencies:
   npm install

2) Run the development server:
   npm run dev

3) Open the app:
   http://localhost:3000

## OAuth Notes
The frontend starts an OAuth popup and then polls localStorage for a session token written by the backend callback. Ensure your backend callback writes to localStorage and closes the window. Expected keys:
- "jira_session_token" for Jira OAuth
- "confluence_session_token" for Confluence OAuth

If using API token authentication, submit:
- email
- api_token
- optional site (e.g., example.atlassian.net)

## Styling
The Ocean Professional theme is implemented with TailwindCSS utilities and custom classes in src/app/globals.css:
- Buttons: .btn, .btn-primary, .btn-secondary
- Badges: .badge, .badge-success, .badge-error
- Inputs: .input
- Cards: .card-surface
- Section titles: .section-title
- Sidebar link: .sidebar-link
- Background gradient: .ocean-gradient

## Structure
- src/app/layout.tsx: Sidebar layout + theme wrappers
- src/app/page.tsx: Jira + Confluence dashboard with tabs
- src/app/confluence/page.tsx: Dedicated Confluence page
- src/app/about/page.tsx: About and configuration notes
