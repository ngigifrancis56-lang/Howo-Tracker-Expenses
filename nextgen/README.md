# Apex Logistic Group — Next Generation

This is a separate application scaffold. It lives on the `apex-react-springboot-v1` branch and does not change the current production app on `main`.

## Architecture
- `frontend/`: React + Vite + TypeScript + responsive PWA-ready UI.
- `backend/`: Java 21 + Spring Boot REST API.
- PostgreSQL: central relational database (configured by environment variables).

## Local development

### Backend
Requires Java 21, Maven and PostgreSQL.
```bash
cd nextgen/backend
export DB_URL=jdbc:postgresql://localhost:5432/apex_logistics
export DB_USERNAME=postgres
export DB_PASSWORD=your-local-password
mvn spring-boot:run
```
API health: `http://localhost:8080/api/health`

### Frontend
Requires Node.js 20+.
```bash
cd nextgen/frontend
npm install
npm run dev
```
The Vite dev server proxies `/api` to the backend at `http://localhost:8080`.

## Data safety
The new app uses a separate database. It does not connect to, modify, or migrate production records automatically. A future import will be an explicit, validated, backed-up operation after the old data has been reconciled.

## Planned delivery sequence
1. Foundation, responsive shell, API health check.
2. Authentication, company roles and audit history.
3. Vehicles, drivers, trips, expenses and per-trip driver pay.
4. Dashboard, financial reports and PDF export.
5. Offline-first entry, sync conflict handling and backups.
6. Chat with image uploads, notifications and installable PWA.
7. Verified data import and production deployment.
