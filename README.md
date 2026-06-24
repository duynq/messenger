# 🚀 MyApp — Full-Stack Base Template

A production-ready full-stack base template with **Rails 7.1 API** + **Next.js 15** + **Docker**.

## ⚡ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Rails 7.1 (API mode) · Ruby 3.2.2 |
| **Frontend** | Next.js 15 · React 19 · TypeScript · TailwindCSS 3 |
| **Auth** | Devise + JWT (devise-jwt) |
| **Database** | PostgreSQL 15 |
| **File Storage** | MinIO (S3-compatible) |
| **Serialization** | Blueprinter |
| **Pagination** | Custom `Paginatable` concern |
| **Rate Limiting** | Rack::Attack |
| **Testing** | RSpec + FactoryBot + Shoulda · Jest + Testing Library |
| **Infrastructure** | Docker Compose |

## 🏗️ Project Structure

```
base-template/
├── app/
│   ├── blueprints/          # Blueprinter serializers
│   ├── controllers/
│   │   ├── api/v1/          # API controllers
│   │   │   ├── users/       # Devise JWT auth controllers
│   │   │   ├── posts_controller.rb    # Example CRUD
│   │   │   └── dashboard_controller.rb
│   │   ├── concerns/        # Shared concerns (Paginatable)
│   │   └── application_controller.rb  # Error handling + auth
│   ├── models/              # ActiveRecord models
│   └── services/            # Service objects (Result pattern)
├── config/
│   ├── initializers/        # Devise, CORS, Rack::Attack, etc.
│   ├── environments/        # dev/test/prod configs
│   ├── routes.rb            # API routes
│   └── database.yml
├── db/
│   ├── migrate/             # Database migrations
│   └── seeds.rb             # Seed data
├── spec/                    # RSpec tests
│   ├── factories/           # FactoryBot factories
│   ├── models/              # Model specs
│   ├── requests/            # Request specs (API tests)
│   └── support/             # Test helpers
├── frontend/
│   ├── src/
│   │   ├── actions/         # Next.js Server Actions (auth, account)
│   │   ├── app/             # App Router pages
│   │   ├── components/      # UI + Layout components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Server API client, Zod schemas
│   │   └── middleware.ts    # Auth route protection
│   ├── tailwind.config.ts   # Design system
│   └── package.json
├── scripts/
│   ├── minio-setup.sh       # MinIO bucket setup
│   └── rename-project.sh    # Auto-rename project
├── docker-compose.yml       # Full stack orchestration
├── Dockerfile               # Rails backend
└── README.md
```

## 🚀 Quick Start

### 1. Clone & Rename

```bash
# Copy the template
cp -r base-template my-new-project
cd my-new-project

# Rename everything automatically
chmod +x scripts/rename-project.sh
./scripts/rename-project.sh my_new_project
```

### 2. Start with Docker

```bash
docker compose up --build
```

This starts:
- 🟢 **Rails API** at `http://localhost:3000`
- 🔵 **Next.js Frontend** at `http://localhost:3001`
- 🐘 **PostgreSQL** at `localhost:5432`
- 📦 **MinIO Console** at `http://localhost:9001` (admin: minioadmin / minioadmin123)

### 3. Default Credentials

After first boot, the seed data creates a test user:
- **Email:** `admin@example.com`
- **Password:** `password123`

## 📖 Patterns & Conventions

### Backend Patterns

#### Result Pattern (Service Objects)
```ruby
# app/services/result.rb
result = Result.success(data)
result = Result.failure("Something went wrong")

result.success?  # => true/false
result.value     # => data on success
result.error     # => error message on failure
```

#### Blueprinter Serialization
```ruby
# app/blueprints/post_blueprint.rb
class PostBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :body, :published

  view :with_user do
    association :user, blueprint: UserBlueprint
  end
end

# Usage in controller:
render json: PostBlueprint.render_as_hash(records)
```

#### Pagination (Custom Paginatable Concern)
```ruby
# In any controller (included via ApplicationController):
# Supports ?page=N query param. Default: 12 items/page.
pagy_obj, records = pagy(collection, items: 20)  # items is optional
render json: {
  posts: PostBlueprint.render_as_hash(records),
  pagination: pagy_metadata(pagy_obj)
  # => { count:, page:, items:, pages:, next:, prev: }
}
```

### Frontend Patterns

#### Server Actions (Auth)
```typescript
// src/actions/auth.ts — handles login/register/logout
// Automatically manages JWT cookie via httpOnly cookies
```

#### Server API Client
```typescript
// src/lib/server-api.ts
import { serverFetch, handleUnauthorized } from '@/lib/server-api';

const response = await serverFetch('/api/v1/posts');
await handleUnauthorized(response); // Auto-redirect to /login on 401
```

#### Zod Validation
```typescript
// src/lib/schemas/auth.ts — shared validation schemas
import { loginSchema, registerSchema } from '@/lib/schemas/auth';
```

## 🔧 How to Add a New Resource

### Step 1: Generate Migration
```bash
docker compose exec web bundle exec rails generate migration CreateProducts name:string price:decimal user:references
docker compose exec web bundle exec rails db:migrate
```

### Step 2: Create Model
```ruby
# app/models/product.rb
class Product < ApplicationRecord
  belongs_to :user
  validates :name, presence: true
  validates :price, presence: true, numericality: { greater_than: 0 }
end
```

### Step 3: Create Blueprint
```ruby
# app/blueprints/product_blueprint.rb
class ProductBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :price, :created_at
end
```

### Step 4: Create Controller
```ruby
# app/controllers/api/v1/products_controller.rb
class Api::V1::ProductsController < ApplicationController
  def index
    pagy_obj, records = pagy(current_user.products)
    render json: {
      products: ProductBlueprint.render_as_hash(records),
      pagination: pagy_metadata(pagy_obj)
    }
  end
  # ... create, update, destroy
end
```

### Step 5: Add Route
```ruby
# config/routes.rb
resources :products, only: [:index, :show, :create, :update, :destroy]
```

### Step 6: Add Tests
```ruby
# spec/factories/products.rb + spec/models/product_spec.rb + spec/requests/products_spec.rb
```

## 🧪 Running Tests

### Backend
```bash
docker compose exec web bundle exec rspec
```

### Frontend
```bash
cd frontend && npm test
```

## 📋 Included Features

- ✅ JWT Authentication (login, register, logout)
- ✅ Auth middleware (route protection on both frontend and backend)
- ✅ CORS configuration
- ✅ Rate limiting (Rack::Attack)
- ✅ API pagination
- ✅ Blueprinter serialization
- ✅ Result pattern for service objects
- ✅ Dark theme with glassmorphism UI
- ✅ Responsive design
- ✅ Framer Motion animations
- ✅ Toast notifications (Sonner)
- ✅ Zod form validation
- ✅ Error/Loading/404 pages
- ✅ RSpec + Jest test infrastructure
- ✅ Docker Compose orchestration
- ✅ MinIO (S3-compatible) file storage
- ✅ Auto-rename script
