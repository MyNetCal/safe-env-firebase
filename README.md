# Safe Environment

A management system for Prelature organizations to track personnel screening, training compliance, incident reporting, and activity management. Built as a Progressive Web App (PWA) with Vue 3 and Firebase.

## Features

- **Personnel Management** - Track staff across multiple corporations with role-based access
- **Screening & Selection** - Manage background checks, code of conduct, recommendations, and references
- **Training Compliance** - Assign and track required training with expiration monitoring
- **Incident Reporting** - File and manage incident reports with PDF generation
- **Sites** - Review and approve physical locations with checklists and photos
- **Activities** - Plan and track activities with staff and participant assignments
- **Participants** - Manage participant records, consent forms, and activity groups
- **Board/Committee View** - Approval workflows for Safe Environment Committee members
- **PWA** - Installable progressive web app with offline support

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm
- Access to the `vue-safe-env` Firebase project

## Setup

```bash
git clone <repository-url>
cd safe-env-firebase
npm install
npm run dev
```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Lint and auto-fix with ESLint |
| `npm run format` | Format source files with Prettier |

## Tech Stack

- **Vue 3.5** with Composition API (`<script setup>`)
- **Vite 7** build tool
- **Pinia 3** state management
- **Firebase 12** (Auth, Firestore, Storage) via VueFire 3
- **Tailwind CSS 3** with Headless UI
- **FontAwesome 7** icons
- **VueUse 14** composables
- JavaScript only (no TypeScript)

## Project Structure

```
src/
  router/          # Vue Router config (hash-based routing)
  stores/          # Pinia stores (general.js, datadb.js)
  composables/     # Reusable composition functions
  views/           # Page-level components
    Users/         # Personnel management
    Corporations/  # Corporation management
    Sites/         # Site management
    Activities/    # Activity management
    Participants/  # Participant management
  components/      # Reusable UI components
  assets/          # Static assets and styles
```

## Deployment

The app is deployed to **AWS Amplify**. The build configuration is defined in `amplify.yml`. Amplify runs `npm install` and `npm run build`, then serves the `dist/` directory.

## Related

- **Backend:** [firebase-functions](../firebase-functions) - Cloud Functions for scheduled notifications, training management, and PDF processing

## Access Levels

The system uses a hierarchical access level system (levels -1 through 5) that determines what each user can see and do. Access is computed from the user's role, function, and flags (SEC, Board, Committee, Screening) within their active corporation. Higher levels can access everything available to lower levels.
