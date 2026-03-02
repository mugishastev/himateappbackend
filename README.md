# Himate Backend Project

A production-ready, high-performance NestJS backend for a modern chat application. Built with scalability, security, and developer experience in mind.

## 🚀 Features

- **RBAC (Role-Based Access Control):** Granular permissions for Admins, Moderators, and Users.
- **Real-time Communication:** Powered by WebSockets (Socket.IO) with Redis scaling.
- **Robust Security:** Environment validation (Joi), Helmet, Rate Limiting, and JWT authentication.
- **Media Management:** Integrated with Cloudinary for seamless profile and chat media uploads.
- **Push Notifications:** Firebase Cloud Messaging (FCM) integration.
- **API Documentation:** Interactive Swagger UI at `/api`.
- **Production Infrastructure:** Multi-stage Docker optimization and CI/CD ready.

## 🛠 Tech Stack

- **Framework:** NestJS (Node.js)
- **Database:** PostgreSQL (via Prisma ORM)
- **Cache/PubSub:** Redis
- **Real-time:** Socket.IO
- **Validation:** Class-validator & Joi
- **Auth:** JWT (Access + Refresh tokens)
- **CI/CD:** GitHub Actions
- **Containerization:** Docker & Docker Compose

## 📦 Project Structure

```text
src/
├── auth/           # Authentication & Authorization logic
├── common/         # Shared decorators, guards, filters, interceptors
├── config/         # Environment & App configuration
├── conversations/  # Chat conversation management
├── messages/       # Message handling & media attachments
├── prisma/         # Database schema & client management
├── users/          # User management & profiles
├── utils/          # Service utilities (Mail, Cloudinary, FCM)
└── main.ts         # Application entry point
```

## ⚙️ Environment Variables

See [.env.example](.env.example) for a complete list of required variables.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret for signing access tokens | - |
| `REDIS_URL` | Redis connection URL | - |

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Docker & Docker Compose (Optional but recommended)

### Quick Start (Docker)

```bash
docker-compose up -d
```

### Manual Installation

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Run Migrations & Seed Data:**
   ```bash
   npx prisma migrate dev
   npx prisma seed
   ```

4. **Start the Application:**
   ```bash
   npm run start:dev
   ```

## 🧪 Testing

```bash
# Unit tests
npm test

# Test coverage
npm run test:cov
```

## 📖 API Documentation

Once the server is running, visit:
`http://localhost:5000/api`

## 👨‍💻 Author

Built for Himate App.
