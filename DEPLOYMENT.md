# Deployment Guide

This guide provides instructions for deploying the Himate Backend to production environments.

## 🐳 Docker Deployment (Recommended)

The easiest way to deploy is using the provided Docker configurations.

### 1. Preparation
Ensure you have a `.env` file populated with production credentials.

### 2. Launch
```bash
docker-compose up -d --build
```
This will:
- Build the optimized multi-stage production image.
- Start the PostgreSQL database and Redis cache.
- Run database migrations (`prisma migrate deploy`).
- Launch the NestJS application at the configured port.

## ☁️ Manual Production Deployment

If you prefer to run the application directly on a server:

### 1. Build the Application
```bash
npm install --production=false
npm run build
```

### 2. Database Setup
Ensure your production database is accessible and run:
```bash
npx prisma migrate deploy
```

### 3. Start Processes
Use a process manager like **PM2** to ensure the app stays alive:
```bash
pm2 start dist/main.js --name himate-backend
```

## 🛡️ Security Best Practices

1. **Secrets:** Never commit your `.env` file. Use a secret manager (like AWS Secret Manager or Doppler) in production.
2. **CORS:** Update `main.ts` to restrict CORS origins to your frontend domain only.
3. **HTTPS:** Always serve the API behind a reverse proxy (Nginx/Traefik) with SSL (Let's Encrypt).
4. **Rate Limiting:** The global throttler is set to 100 requests per minute by default. Adjust based on your expected load.

## 🔄 CI/CD Pipeline

The project includes a GitHub Actions workflow in `.github/workflows/ci.yml` that automatically:
- Lints the code.
- Runs unit tests.
- Verifies the build on every push to `main` and `develop`.
- Can be extended to deploy to your hosting provider (e.g., AWS, DigitalOcean).
