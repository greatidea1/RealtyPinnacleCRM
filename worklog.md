---
Task ID: 1
Agent: Main Agent
Task: Build complete Real Estate Broker CRM as a single-page Next.js application

Work Log:
- Designed and pushed Prisma schema with 8 models: User, Property, PropertyAmenity, PropertyPhoto, Client, Deal, Task, Notification, Activity
- Created comprehensive seed script with 3 users (1 admin, 2 agents), 8 properties, 8 clients, 6 deals, 12 tasks, 10 notifications, 10 activity log entries
- Built bright fresh emerald/teal glossy CSS theme with glass-card, gradient accents, shimmer loaders, kanban cards, pipeline bars, step trackers
- Created Zustand store for SPA routing, auth, modal state, sidebar collapse, search, notifications
- Built 10 API routes: auth, properties, clients, deals, tasks, notifications, users, search, activity, dashboard
- Built 15 component files: AuthScreen, Sidebar, TopBar, DashboardPage, PropertiesPage (list+detail+form), ClientsPage, ClientDetail, ClientForm, DealsPage (kanban+detail+form), TasksPage (list+form), NotificationsPage, SettingsPage, DeleteDialog
- Wired everything in page.tsx as client-side SPA with AnimatePresence page transitions
- Fixed all lint errors (cn imports, Login→LogIn icon, setState-in-effect)
- Browser-verified: login, dashboard, properties (table+grid), deals kanban, clients, settings admin user management, global search, notifications, sidebar collapse
- Zero console errors, zero lint errors

Stage Summary:
- Fully functional Real Estate Broker CRM with all 14+ screens
- Admin/Agent role-based access with data isolation
- Demo credentials: admin@propcrm.com/admin123, priya@propcrm.com/agent123
- All CRUD operations, drag-to-change deal stages, inline task completion, global live search, multi-step forms with validation

---
Task: Fast deploys via GHCR (avoid 1h Dokploy on-server builds)

Work Log:
- Dockerfile runner no longer runs npm install; copies prisma/@prisma/.prisma/bcryptjs from builder; Next build uses BuildKit .next/cache mount
- Added .github/workflows/docker-publish.yml — push to main builds/pushes ghcr.io/greatidea1/realtypinnaclecrm:main (+ short sha)
- docker-compose.yml app service uses image: (no build:) so Dokploy only pulls

Dokploy one-time setup:
1. Make package ghcr.io/greatidea1/realtypinnaclecrm public, OR add a GitHub PAT with read:packages as a Dokploy registry credential for ghcr.io
2. Confirm the stack compose has image: ghcr.io/greatidea1/realtypinnaclecrm:main and no build: block
3. Redeploy with pull only — do not use compose up --build / "build from source" on the VPS
4. After the first successful Actions publish, Dokploy redeploy should be pull + recreate (minutes), not an hour-long npm/next build