# Big Papa — Fleet Management
A separate ReactJS + Spring Boot application for Apex Logistic Group. This project lives on the `apex-react-springboot-v1` branch; the existing production app on `main` is unchanged.

## Stack
- React + Vite frontend
- Java 21 / Spring Boot 3 backend
- PostgreSQL
- Spring Security + JWT
- Role-based access (ADMIN, USER)

## Stage 1: identity foundation
Registration, login, JWT validation, and administrator bootstrap. Set `BIGPAPA_ADMIN_EMAIL` on the server before registering the first administrator. All other public registrations receive USER. Never expose database/JWT secrets in frontend code.

## Local development
Backend: create a PostgreSQL database, set `DATABASE_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET` (at least 32 characters), and optionally `BIGPAPA_ADMIN_EMAIL`; then run `mvn spring-boot:run` from `backend`.

Frontend: run `npm install` then `npm run dev` from `frontend`. Set `VITE_API_URL` to the backend URL.

This is a development foundation, not yet a deployed or production-ready service. Before production, configure HTTPS, database migrations/backups, rate limiting, email verification/password reset, CORS allowlist, secrets management, and integration tests. Do not import live company records until backup and migration checks are complete.
