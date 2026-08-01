# 🚀 Messenger — Real-time Chat Application

A production-ready full-stack real-time chat application built with **Rails 7.1 API** (ActionCable) + **Next.js 15** + **Docker**.

## ⚡ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Rails 7.1 (API mode) · Ruby 3.2.2 |
| **Frontend** | Next.js 15 · React 19 · TypeScript · TailwindCSS 3 |
| **Real-time** | ActionCable (WebSockets) |
| **Auth** | Devise + JWT (devise-jwt) |
| **Database** | PostgreSQL 15 |
| **Caching/PubSub** | Redis 7 |
| **File Storage** | MinIO (S3-compatible) |
| **Serialization** | Blueprinter |
| **Pagination** | Pagy (Offset) + Cursor-based (Messages) |
| **Infrastructure** | Docker Compose |

## ✨ Key Features

- **Real-time Messaging**: Instant message delivery using WebSockets (ActionCable).
- **1-to-1 & Group Chats**: Support for both direct messages and multi-user group conversations.
- **Infinite Scroll**: Cursor-based pagination for older messages with seamless scroll anchoring.
- **User Liveness (Presence)**: Real-time Online/Offline indicators and "Last seen X mins ago" tracking.
- **User Directory & Search**: Browse all registered users or search by name/email to start conversations.
- **Dark Mode UI**: Premium aesthetic with glassmorphism, built with TailwindCSS and Framer Motion.
- **Internationalization (i18n)**: Multi-language support via `next-intl`.

## 🏗️ Project Structure

```
messenger/
├── app/
│   ├── blueprints/          # Blueprinter serializers (User, Message, Conversation)
│   ├── channels/            # ActionCable channels (PresenceChannel, ConversationChannel)
│   ├── controllers/         # API controllers (v1)
│   ├── models/              # ActiveRecord models
│   └── services/            # Service objects (Result pattern)
├── config/
│   ├── initializers/        # Devise, CORS, Rack::Attack, etc.
│   ├── routes.rb            # API routes
│   └── database.yml
├── db/
│   ├── migrate/             # Database migrations
│   └── seeds.rb             # Seed data
├── frontend/
│   ├── src/
│   │   ├── actions/         # Next.js Server Actions (auth)
│   │   ├── app/             # App Router pages ([locale]/...)
│   │   ├── components/      # React UI components (chat, layout, providers)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── i18n/            # next-intl configuration
│   │   ├── lib/             # Server API client, Zod schemas, Utils
│   │   └── middleware.ts    # Auth + i18n route protection
│   ├── messages/            # i18n JSON files
│   └── tailwind.config.ts   # Design system
├── docker-compose.yml       # Full stack orchestration
└── README.md
```

## 🚀 Quick Start

### 1. Start with Docker Compose

```bash
docker compose up --build
```

This starts all necessary services:
- 🟢 **Rails API** at `http://localhost:3000`
- 🔵 **Next.js Frontend** at `http://localhost:3001`
- 🐘 **PostgreSQL** at `localhost:5432`
- 🔴 **Redis** at `localhost:6379`
- 📦 **MinIO Console** at `http://localhost:9001` (admin: minioadmin / minioadmin123)

### 2. Run Database Migrations & Seeds

Open a new terminal window and run:
```bash
docker compose exec web bundle exec rails db:migrate db:seed
```

### 3. Default Credentials

After seeding the database, you can log in with:
- **Email:** `admin@example.com`
- **Password:** `password123`

*(Note: The seed script usually creates additional mock users to test the chat functionality).*

## 📖 Real-time Architecture

### Presence Tracking (User Liveness)
- Connected clients subscribe to the `PresenceChannel`.
- Upon connection, the backend broadcasts an `online` status and updates the user's `last_seen_at` in the DB.
- Upon disconnection, the backend broadcasts an `offline` status with the latest `last_seen_at` timestamp.
- The `PresenceProvider` in Next.js maintains a global state of user statuses, updating the UI (Green Dots, "Last seen...") instantly.

### Infinite Scroll (Cursor Pagination)
- Instead of traditional page numbers, the chat UI requests older messages using `?before_message_id=XYZ`.
- The Next.js frontend uses React's `flushSync` and explicit `scrollHeight` calculations to strictly anchor the scroll position, preventing the view from jumping when older messages are prepended to the DOM.

## 🧪 Running Tests

### Backend
```bash
docker compose exec web bin/rspec
```

### Frontend
```bash
docker compose exec frontend npm test
```

## 📚 API Documentation (Swagger)

This application includes auto-generated Swagger (OpenAPI 3) documentation.

**1. View the API Docs**
Once the server is running, visit:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

**2. Generate / Update Docs**
```bash
docker compose exec web bundle exec rake rswag:specs:swaggerize
```
