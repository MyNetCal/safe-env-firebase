# CLAUDE.md - Safe Environment Frontend

## Project Overview

Safe Environment is a management system for Prelature organizations that tracks personnel screening, training compliance, incident reporting, and activity management. It serves as a PWA that lets Safe Environment Coordinators (SECs) manage compliance across multiple corporations/centers within a hierarchical organizational structure.

## Tech Stack

- **Framework:** Vue 3.5 + Vite 7 + Vue Router 4 (hash mode)
- **State:** Pinia 3
- **Backend:** Firebase 12 (Auth, Firestore, Storage) via VueFire 3
- **Styling:** Tailwind CSS 3 + Headless UI 1.7
- **Icons:** FontAwesome 7 (SVG core + vue-fontawesome 3)
- **Utilities:** VueUse 14 (core, components, firebase, integrations), dayjs, fuse.js, jsPDF 3, html2canvas, PapaParse 5, axios, qs
- **Language:** JavaScript only (no TypeScript)
- **Linting:** ESLint 9 (flat config) + Prettier with tailwindcss plugin
- **PWA:** vite-plugin-pwa 1.0

## Commands

All commands from project root:

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # ESLint with --fix
npm run format     # Prettier --write src/
```

## Deployment

Deployed to **AWS Amplify** via `amplify.yml`:
- Runs `npm install` then `npm run build`
- Serves from `dist/` directory
- Caches `node_modules/`, `.cache/`, `dist/`, `dev-dist/`

## Project Structure

```
src/
  App.vue                   # Root layout: header, sidebar, content grid, branch theming
  main.js                   # App entry point
  firebase.js               # Firebase config and initialization
  migration-branch.js       # One-time migration script
  router/
    index.js                # All routes + auth guard (hash history)
  stores/
    general.js              # Auth state, access levels, roles, constants, email helpers
    datadb.js               # Firestore CRUD: Users, UsersCorporations, Sites, Participants, Activities
  composables/
    backgroundCheck.js      # Background check logic
  views/
    HomeView.vue            # Landing page / My Status
    LogIn.vue               # Authentication
    WelcomeView.vue         # Welcome page (public, parameterized by user ID)
    DashboardVue.vue        # Admin dashboard (level 5)
    BoardView.vue           # Board/committee view (level 2+)
    TrainingView.vue        # Training management (level 2.5+)
    TrainingViewOld.vue     # LEGACY - do not use as pattern
    ScreeningView.vue       # Screening management (level 2.5+)
    IncidentReport.vue      # Incident reporting (all users)
    MigrationView.vue       # Data migration tool
    SetUpView.vue           # Setup/config
    Users/                  # Personnel management views
    Corporations/           # Corporation management views
    Sites/                  # Site management views (SitesViewOld.vue is LEGACY)
    Activities/             # Activity management views (ActivitiesViewEditOld.vue is LEGACY)
    Participants/           # Participant management views
  components/
    SideMenu.vue            # Navigation sidebar with access-level gating
    MyInputs/               # Reusable input components
    MySelect/               # Custom select components
    My*.vue                 # Reusable UI components (MyModal, MyTable, MyButton, etc.)
    UserAndCorpEdit.vue     # Combined user + corporation editing
    UserCorporationEdit.vue # Corporation assignment editing
    UserInfoEdit.vue        # User info editing
    UsersTrainingApprovedStatus.vue
    UserViewScreening*.vue  # Screening-related components
    DateEditModal.vue       # Date picker modal
    TemplateEditingModal.vue
  assets/
    base.css                # Base styles
    main.css                # Main styles
    logo.svg                # App logo
```

## Key Architecture Patterns

### Access Level System

Access is numeric, computed in `src/stores/general.js`. The sidebar in `SideMenu.vue` gates menu items based on these levels:

| Level | Name | Scope |
|-------|------|-------|
| 5 | Admin / SEC of Prelature | Full access, dashboard |
| 4.5 | Committee Member (Prelature) | Near-full access |
| 4 | Board of Prelature | Cross-corporation access |
| 3 | SEC of Corporation | Full access within corporation |
| 2.5 | Committee Member (Corporation) | Training + screening |
| 2 | Board of Corporation | Board view access |
| 1.5 | Screening Staff | Screening access |
| 1 | Activity Director | Sites + activities |
| 0 | Staff | Participants + activities |
| -1 | Low Access / Junior Counselor | Minimal access |
| -2 | Not assigned | Default / no access |

Computed from `UsersCorporations` document fields: `SEC`, `Committee`, `Board`, `Screening`, `Function`, and whether the corporation is the Prelature.

### Data Model (Firestore Collections)

**Top-level collections:**
- `Users` - User profiles. Key fields: `Name`, `LastName`, `Nickname`, `Email`, `DOB`, `Branch`, `CurrentUsersCorporationsId`, `CorpsActiveIds[]`, `CorpsActiveAtLeastOne`, `ScreeningFiles*[]`
- `UsersCorporations` - Join table linking users to corporations with role/status. Key fields: `UserId`, `CorporationId`, `CorporationName`, `Role`, `Function`, `Status` (Pending Approval | Requiring Attention | Approved | Inactive), `Active`, `Board`, `SEC`, `Committee`, `Screening`, `ApprovedOn`, `ApprovedBy[]`, `AllFunctions[]`, `BackgroundCheckExpiresOn`, `CodeOfConductExpiresOn`, `ScreeningCodeDate`, `ScreeningConsentDate`, `ScreeningReqFlag*`, `StatusRquiringAttentionReasons[]`, `MissingTrainingIds[]`, `ActivityGroups[]`, `Entity`
- `Corporations` - Organizations/centers. Key fields: `Name`, `Short`, `Branch` (Men|Women), `Entity` (Prelature|3rd Party Only|Both)
- `Participants` - Minors/participants. Key fields: `Name`, `LastName`, `Nickname`, `DOB`, `CorpId`, `Branch`, `Active`, `ActivityGroups[]`, `Plan`, `Consent`
- `Sites` - Physical locations. Key fields: `Name`, `Address`, `Status` (In Review|Waiting Approval|Approved), `Branch`, `CheckList[]`, `Photos[]`, `ApprovedBy[]`
- `IncidentReports` - Filed incidents. Key fields: `CorporationId`, `DateIncident`, `DateFiled`, `UserId`, `Branch`, `Filepath`
- `mail-triggers` - Email trigger documents (processed by Firebase Extension or Cloud Functions). Key fields: `to[]`, `cc[]`, `bcc[]`, `template` or `message`, `delivery`, `userId`, `ExpiresAt`
- `pdfs` - PDF metadata for Cloud Functions processing
- `temp` - Temporary documents for Code of Conduct flow

**Subcollections:**
- `Users/{id}/UserTrainingCompleted/{trainingId}` - Training completion records per user
- `Users/{id}/MessagesPending/{emailId}` - Pending email delivery status notifications
- `UsersCorporations/{id}/UserCorpTraining/{trainingId}` - Required training per user-corporation
- `Corporations/{id}/Initial Training/{trainingId}` - Training requirements per corporation
- `Corporations/{id}/Ongoing Training/{trainingId}` - Scheduled ongoing training

### Naming Conventions

- **Vue components:** PascalCase filenames (e.g., `SideMenu.vue`, `MyModal.vue`)
- **Reusable components:** `My*` prefix (e.g., `MyButton.vue`, `MyListBox.vue`, `MyTable.vue`)
- **JS files:** camelCase (e.g., `general.js`, `datadb.js`, `backgroundCheck.js`)
- **Firestore fields:** PascalCase (e.g., `FirstName`, `CorporationId`, `StatusRquiringAttentionReasons`)
- **Vue code style:** Single quotes, Composition API with `<script setup>`

### Composition API Patterns

Components use `<script setup>` with:
```js
import { useGeneralStore } from '@/stores/general'
import { storeToRefs } from 'pinia'

const store = useGeneralStore()
const { loginUserId, accessLevel, currentBranch } = storeToRefs(store)
```

VueFire reactive composables:
```js
import { useCollection, useDocument, useFirestore } from 'vuefire'
const db = useFirestore()
const docRef = computed(() => doc(db, 'Collection', id.value))
const data = useDocument(docRef)
```

### Email System

Emails are sent by writing to the `mail-triggers` Firestore collection. Two patterns:

1. **Template-based:** `{ template: { name: 'Template-Name', data: {...} }, to: [...] }`
2. **Raw HTML:** `{ message: { subject: '...', html: '...' }, to: [...] }`

Functions in `general.js`: `triggerEmailTemplate()`, `triggerEmail()`, `createDocTriggerEmail()`, `createDocTriggerEmailTemplate()`

### Branch Theming

The app themes by branch (Men vs Women), set via `currentBranch` from the user's corporation:
- **Men:** `bg-sky-700` header, `bg-slate-200/90` sidebar, `bg-slate-300` footer
- **Women:** `bg-pink-700` header, `bg-pink-100/90` sidebar, `bg-pink-200` footer

## Related Repository

**Backend Cloud Functions:** `C:\Users\cased\Documents\Apps\firebase-functions`

Both repos share the same Firebase project (`vue-safe-env`). The frontend writes to Firestore collections that trigger Cloud Functions in the backend (e.g., writing to `mail-triggers` triggers email delivery status updates, uploading PDFs triggers `archivedopts`, changes to `UsersCorporations` trigger training management).

## Gotchas

- **`StatusRquiringAttentionReasons`** is intentionally misspelled (missing "e" in "Requiring"). This matches the Firestore field name used across both frontend and backend. **Do NOT fix this.**
- **Firebase config is hardcoded** in `src/firebase.js` with the API key visible. This is the standard Firebase web SDK pattern.
- **No tests.** There is no test suite or test framework configured.
- **Firestore rules are wide open** (`allow read, write: if true`). These rules live in `firebase-functions/firestore.rules`. **Do NOT deploy these rules to production.**
- **Hash-based routing** - The app uses `createWebHashHistory` (URLs like `/#/personnel`), not HTML5 history mode.
- **`@` alias** maps to `src/` (configured in `vite.config.js`).
- **Single quotes** are used in the frontend codebase (the backend uses double quotes).
- **Hardcoded admin user ID** - `'EduardoCastillo1966-12-27'` in `general.js` gets access level 5 regardless of role assignments.
- **User IDs are generated as** `Name + LastName + Random4Digits` (spaces stripped) in `datadb.js:createUser()`.
- **`*Old` suffix views** (e.g., `TrainingViewOld.vue`, `SitesViewOld.vue`, `ActivitiesViewEditOld.vue`) are legacy versions. Do not use them as patterns for new code.
- **`saveNuewLoginCorp`** in `App.vue` is a typo ("Nuew" instead of "New") - intentional, do not rename without updating all references.
