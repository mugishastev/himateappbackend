# Himate Backend

NestJS backend for the Himate chat application.

## Stack

- NestJS 11
- Prisma + PostgreSQL
- Redis + Socket.IO (real-time)
- JWT authentication + RBAC
- Firebase Admin (push notifications)
- Cloudinary (media uploads)

## Requirements

- Node.js 24+ (matches `package.json` engines)
- PostgreSQL
- Redis

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Fill all required values.
3. Keep `APP_URL` aligned with your running backend URL (default `http://localhost:5000`).

Main required keys are validated in `src/config/env.validation.ts`:

- `PORT`, `APP_URL`
- `DATABASE_URL`
- `JWT_SECRET`, `REFRESH_TOKEN_SECRET`
- `REDIS_URL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## Local Development

```bash
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

API base URL: `http://localhost:5000/api`

Swagger UI: `http://localhost:5000/api` (served on the same prefix as the API root)

## Scripts

- `npm run start:dev` - start in watch mode
- `npm run build` - build production bundle
- `npm run start:prod` - run compiled app
- `npm run test` - run unit tests
- `npm run test:cov` - run tests with coverage
- `npm run lint` - run eslint
- `npm run prisma:generate` - regenerate Prisma client
- `npm run prisma:migrate` - run development migrations
- `npm run prisma:studio` - open Prisma Studio

## Docker

Use the included `docker-compose.yml` for local infra/app startup.
