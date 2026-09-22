# Slack Clone — Real-Time Team Collaboration Platform

A full-stack team collaboration and messaging application built with a modern React client and an event-driven Node.js / Express backend. The platform supports workspace management, channel-based discussions, real-time messaging using WebSockets, rich-text messaging with image uploads via AWS S3 pre-signed URLs, background job processing with BullMQ and Redis, and subscription checkout powered by Razorpay.

---

## Architecture Overview

```
                        ┌───────────────────────────────┐
                        │   React 18 Single Page App    │
                        │  (Vite, Tailwind, Radix UI,   │
                        │    TanStack Query, Quill)     │
                        └───────┬──────────────┬────────┘
                                │              │
                     REST APIs  │              │  WebSockets
               (x-access-token) │              │  (Rooms / Events)
                                ▼              ▼
                        ┌───────────────────────────────┐
                        │     Express HTTP Server       │
                        │      & Socket.IO Engine       │
                        └───────┬──────────────┬────────┘
                                │              │
                 Direct Queries │              │  Async Jobs
                                ▼              ▼
                        ┌─────────────┐  ┌──────────────┐
                        │   MongoDB   │  │    Redis     │
                        │  (Mongoose) │  │ (Bull Queue) │
                        └─────────────┘  └──────┬───────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │  Nodemailer  │
                                         │  (Worker)    │
                                         └──────────────┘
```

The system is organized into a decoupled monorepo structure:
- **`Message-Slack-Frontend/`**: React 18 single-page application built on Vite. Leverages Radix UI and Tailwind CSS for accessible design, TanStack Query (v5) for server-state caching, Quill for rich-text input, and Socket.IO client for live channel feeds.
- **`Messaging-Slack-Backend/`**: Modular Express service structured using a strict Layered Architecture (`Routes` &rarr; `Controllers` &rarr; `Services` &rarr; `Repositories` &rarr; `Mongoose Models`). Includes Bull job queues backed by Redis, AWS S3 presigned URL generation, and Bull-Board administration.

---

## Key Features

- **Workspaces & Multi-Tenancy**:
  - Create and manage independent team workspaces.
  - Role-based membership (`admin` vs. `member`).
  - Join code generator and reset capabilities for frictionless onboarding.
  - Email invitations dispatched asynchronously via BullMQ worker queues.
- **Channels & Discussions**:
  - Default `#general` channel automatically created on workspace provision.
  - Custom public channels inside workspaces.
- **Real-Time Messaging**:
  - WebSocket room-based message broadcasting (`JoinChannel`, `NewMessage`, `NewMessageReceived`).
  - Reverse-chronological message history with paginated retrieval.
- **Rich-Text Editor & Attachments**:
  - Quill-powered editor supporting bold, italic, lists, and formatted code blocks.
  - Direct client-to-cloud image uploads using AWS S3 pre-signed URLs.
- **Payments & Billing**:
  - Razorpay order creation and HMAC-SHA256 signature verification.
- **Queue Dashboard**:
  - Built-in Bull-Board dashboard at `/ui` to observe, retry, or inspect background email tasks in real time.

---

## Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS, Class Variance Authority (`cva`), Radix UI Primitives, Lucide Icons
- **State & Data Fetching**: TanStack React Query v5, Custom Context Providers (`combineContext`)
- **Real-Time Client**: Socket.IO Client
- **Rich Text**: Quill
- **Routing**: React Router v7
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js (ES Modules)
- **Web Framework**: Express.js
- **Database & ODM**: MongoDB with Mongoose 8
- **Real-Time Engine**: Socket.IO
- **Background Jobs**: Bull with Redis (ioredis)
- **Queue Admin Dashboard**: `@bull-board/express`
- **Validation**: Zod with centralized error handling
- **Cloud Storage**: AWS S3 SDK
- **Payment Gateway**: Razorpay Node SDK
- **Email Delivery**: Nodemailer (SMTP / Gmail)
- **Security**: JSON Web Tokens (`jsonwebtoken`), bcrypt

---

## Directory Layout

```
Message-Slack/
├── Message-Slack-Frontend/
│   ├── src/
│   │   ├── apis/            # Axios API client functions (auth, workspaces, channels, s3, payments)
│   │   ├── components/      # Atomic UI components, modals, workspace panels, and message lists
│   │   ├── config/          # Axios instance and client configuration
│   │   ├── context/         # React Contexts (Auth, Socket, Workspace, Channels)
│   │   ├── hooks/           # Custom hooks for context and TanStack Query mutations/queries
│   │   ├── pages/           # Route views (Auth, Home, Workspace, Channel, JoinPage, Payments)
│   │   ├── App.jsx          # Root application and QueryClientProvider setup
│   │   ├── Routes.jsx       # Application router definitions and protected routes
│   │   └── main.jsx         # Entry point mounting React DOM
│   ├── .env.example         # Client environment template
│   ├── package.json
│   └── vite.config.js
│
├── Messaging-Slack-Backend/
│   ├── src/
│   │   ├── config/          # Environment configuration, DB, Redis, S3, Bull-board, Razorpay
│   │   ├── controllers/     # HTTP request handlers and socket event handlers
│   │   ├── middlewares/     # JWT authentication and request authorization
│   │   ├── processors/      # Bull queue consumer jobs (email delivery)
│   │   ├── producers/       # Job enqueuing helpers
│   │   ├── queues/          # Bull queue definitions
│   │   ├── repositories/    # Database abstraction layer (CRUD operations, aggregations)
│   │   ├── routes/          # REST API route declarations (v1)
│   │   ├── schema/          # Mongoose database models (User, Workspace, Channel, Message, Payment)
│   │   ├── services/        # Business logic layer
│   │   ├── utils/           # Error classes, response formatters, email templates
│   │   ├── validators/      # Zod validation schemas
│   │   └── index.js         # HTTP server and Socket.IO initialization
│   ├── .env.example         # Backend environment template
│   └── package.json
│
└── README.md
```

---

## Getting Started

### Prerequisites
Make sure you have the following installed locally:
- **Node.js**: v18+ (tested on Node v20/v24)
- **npm**: v9+
- **MongoDB**: Running locally on `mongodb://localhost:27017` or a MongoDB Atlas URI
- **Redis**: Running locally on `localhost:6379` (required for background queues)

---

### Backend Setup

1. **Navigate to the backend folder**:
   ```bash
   cd Messaging-Slack-Backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

   Configure the variables:
   ```ini
   PORT=3000
   NODE_ENV=development

   DEV_DB_URL=mongodb://localhost:27017/slack
   PROD_DB_URL=mongodb://localhost:27017/slack_prod

   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRY=1d

   MAIL_ID=your_email@gmail.com
   MAIL_PASSWORD=your_gmail_app_password

   REDIS_HOST=localhost
   REDIS_PORT=6379

   APP_LINK=http://localhost:3000
   ENABLE_EMAIL_VERIFICATION=false

   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_BUCKET_NAME=your_s3_bucket_name

   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   CURRENCY=INR
   RECEIPT_SECRET=receipt_1103
   ```

4. **Start the backend server**:
   ```bash
   npm start
   ```
   The backend will be running on `http://localhost:3000`. You can test health via `http://localhost:3000/ping`.
   Access the Bull queue monitor dashboard at `http://localhost:3000/ui`.

---

### Frontend Setup

1. **Navigate to the frontend folder**:
   ```bash
   cd ../Message-Slack-Frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

   Configure the variables:
   ```ini
   VITE_BACKEND_API_URL=http://localhost:3000/api/v1
   VITE_BACKEND_SOCKET_URL=http://localhost:3000
   VITE_RAZORPAY_KEY_ID=your_razorpay_test_key
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## API Reference (v1)

All protected routes require the `x-access-token` header containing a valid JWT.

### Authentication (`/api/v1/users`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/signup` | Register a new user account | No |
| `POST` | `/signin` | Login and obtain JWT token | No |

### Workspaces (`/api/v1/workspaces`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Create a new workspace | Yes |
| `GET` | `/` | List all workspaces the user belongs to | Yes |
| `GET` | `/:workspaceId` | Fetch workspace details with channels & members | Yes |
| `PUT` | `/:workspaceId` | Update workspace metadata | Yes (Admin) |
| `DELETE` | `/:workspaceId` | Delete workspace and its channels | Yes (Admin) |
| `GET` | `/join/:joinCode` | Look up a workspace by its join code | Yes |
| `PUT` | `/:workspaceId/join` | Join workspace with a join code | Yes |
| `PUT` | `/:workspaceId/members` | Add a member directly to workspace | Yes (Admin) |
| `PUT` | `/:workspaceId/channels` | Create a new channel inside workspace | Yes (Admin) |
| `PUT` | `/:workspaceId/joinCode/reset` | Reset and regenerate join code | Yes (Admin) |

### Channels (`/api/v1/channels`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/:channelId` | Fetch channel details and associated workspace | Yes |

### Messages (`/api/v1/messages`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/pre-signed-url` | Generate an AWS S3 pre-signed upload URL | Yes |
| `GET` | `/:channelId` | Get paginated messages for a channel (`limit`, `page`) | Yes |

### Payments (`/api/v1/payments`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/order` | Create a Razorpay order | Yes |
| `POST` | `/capture` | Verify Razorpay payment signature & update status | No |

---

## Real-Time WebSocket Events

The application uses Socket.IO rooms to scope live chat activity to individual channels:

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `JoinChannel` | Client &rarr; Server | `{ channelId }` | Subscribes socket connection to channel room |
| `NewMessage` | Client &rarr; Server | `{ channelId, body, image, senderId, workspaceId }` | Persists message to MongoDB and broadcasts to room |
| `NewMessageReceived` | Server &rarr; Client | Populated message document | Emitted to all clients joined to the specific channel room |

---

## Code Quality & Verification

Both services are configured with ESLint and Prettier for code consistency:

```bash
# Run backend linter
cd Messaging-Slack-Backend
npm run lint

# Run frontend linter & production bundle build
cd ../Message-Slack-Frontend
npm run lint
npm run build
```

---

## License

This project is licensed under the ISC License.
