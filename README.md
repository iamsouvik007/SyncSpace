<div align="center">

# SyncSpace

**Real-time team collaboration and messaging, engineered from the ground up.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-Bull_Queues-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![AWS S3](https://img.shields.io/badge/AWS-S3-FF9900?style=flat-square&logo=amazons3&logoColor=white)](https://aws.amazon.com/s3)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payments-02042B?style=flat-square&logo=razorpay&logoColor=3395FF)](https://razorpay.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](LICENSE)

SyncSpace is a full-stack, production-grade team collaboration platform inspired by Slack.  
It features workspace isolation, channel-based messaging, real-time WebSocket delivery, Quill rich-text composition, direct-to-S3 image uploads, Redis-backed email queues, and Razorpay payment checkout — all within a clean decoupled monorepo.

[Architecture](#-system-architecture) · [Features](#-features) · [Tech Stack](#-tech-stack) · [Project Structure](#-project-structure) · [Data Models](#-data-models) · [Getting Started](#-getting-started) · [Environment Variables](#-environment-variables) · [API Reference](#-api-reference) · [WebSocket Events](#-websocket-events) · [Queue System](#-background-job-queue) · [Security](#-security)

</div>

---

## 📐 System Architecture

SyncSpace uses a decoupled monorepo with two independent applications that communicate over REST and WebSocket.

```
┌────────────────────────────────────────────────────────────────────┐
│                     SyncSpace-Frontend (Browser)                   │
│                                                                    │
│  React 18 · Vite · Tailwind · Radix UI · TanStack Query · Quill   │
│  Socket.IO Client · Axios · React Router v7                        │
└──────────────────────┬──────────────────────────┬──────────────────┘
                       │  REST  (x-access-token)  │  WebSocket
                       ▼                          ▼
┌────────────────────────────────────────────────────────────────────┐
│                     SyncSpace-Backend (Node.js)                    │
│                                                                    │
│  Express 4 · Socket.IO · Zod Validation · JWT + Bcrypt            │
│  Route → Controller → Service → Repository → Mongoose Model       │
└──────┬─────────────────────────────────────────────────┬──────────┘
       │  MongoDB (Mongoose 8)                           │  Redis (ioredis)
       ▼                                                 ▼
┌──────────────────┐                        ┌─────────────────────────┐
│  Users           │                        │  Bull mailQueue         │
│  Workspaces      │                        │  Bull testQueue         │
│  Channels        │                        └───────────┬─────────────┘
│  Messages        │                                    │  mailProcessor
│  Payments        │                                    ▼
└──────────────────┘                        ┌─────────────────────────┐
                                            │  Nodemailer / Gmail     │
       AWS S3 ◄── Pre-signed URL ──────────► │  SMTP (port 465/SSL)   │
       (Direct browser → S3 upload)         └─────────────────────────┘
```

### Architectural Principles

| Principle | Implementation |
|:---|:---|
| **Strict layering** | `Routes → Controllers → Services → Repositories → Mongoose Models` — no layer skips |
| **Generic CRUD base** | `crudRepository(model)` factory provides `create`, `getById`, `getAll`, `update`, `delete`, `deleteMany` to every repository |
| **Context composition** | `combineContext(...providers)` utility wraps all React contexts via `reduceRight`, eliminating nesting boilerplate |
| **Direct S3 uploads** | Backend generates S3 pre-signed URLs with a 60-second TTL; the browser uploads binary directly to AWS, never buffering in Node |
| **Async email delivery** | All emails (member invites, verification links) are pushed to Bull's `mailQueue` and processed by an isolated `mailProcessor` worker |
| **Room-scoped WebSockets** | Socket.IO rooms (`socket.join(channelId)`) ensure messages are only broadcast to members viewing that specific channel |

---

## ✨ Features

### 🏢 Workspaces
- Create named workspaces; creator is automatically promoted to **admin**
- A `#general` channel is provisioned automatically at workspace creation
- 6-character uppercase UUID join codes (e.g. `A1B2C3`) for quick member onboarding
- Admins can reset join codes on demand, invalidating the old one
- Workspace rename and delete with confirmation dialogs (custom `useConfirm` hook)
- Workspace switcher dropdown showing all user-joined workspaces

### 👥 Members & Roles
- Two roles: `admin` and `member` (stored as an embedded array in the Workspace document)
- Admin-only actions: adding members, creating channels, updating/deleting workspace, resetting join code, inviting via modal
- Role-aware UI — "Invite people" and "Preferences" dropdown items only render for admins
- Member lookup by ID with email notification dispatch on addition

### 💬 Channels
- Custom channels per workspace with duplicate-name guards at both service and repository levels
- Channel details panel with collapsible sections (Channels, Direct Messages) using caret icons
- Click on a channel navigates to `/workspaces/:workspaceId/channels/:channelId`
- Channel header shows `# channelName` with an expandable info dialog

### ⚡ Real-Time Messaging (WebSocket)
- Socket.IO rooms prevent cross-channel message leakage
- `JoinChannel` event subscribes the client to the channel room
- `NewMessage` persists to MongoDB and immediately broadcasts `NewMessageReceived` to the room
- New messages are appended to a React state list (`messageList`) held in `ChannelMessagesContext`
- Message container auto-scrolls to bottom on every new message via `useRef + scrollTop`

### ✍️ Rich-Text Composer
- Quill `snow` theme with toolbar: **bold**, *italic*, ~~strike~~, underline, links, ordered list, bullet list, clean
- Toolbar is hidden by default; toggled with a button (keyboard shortcut: **Shift + Enter** for newline)
- Message body is serialized as Quill Delta JSON and stored as a string in MongoDB
- `MessageRenderer` atom deserializes Delta JSON back to HTML using a headless Quill instance

### 🖼️ Image Attachments
- Clicking the image icon in the editor opens a hidden `<input type="file">`
- Frontend requests a pre-signed S3 URL from `GET /api/v1/messages/pre-signed-url`
- Browser uploads the file directly to S3 via `axios.put(presignedUrl, file)` with the file's `Content-Type`
- The clean S3 URL (`presignedUrl.split('?')[0]`) is sent alongside the message body
- `MessageImageThumbnail` renders images with a click-to-zoom Radix dialog overlay

### 🔐 Authentication & Sessions
- Registration collects `email`, `username`, `password`, and `confirmPassword` (client-side validation)
- Passwords are hashed with bcrypt (salt factor 9) in a Mongoose `pre('save')` hook
- RoboHash avatars are auto-assigned on signup (`https://robohash.org/<username>`)
- Login returns a signed JWT; stored in `localStorage` and hydrated by `AuthContext` on mount
- `ProtectedRoute` component redirects unauthenticated users to `/auth/signin`
- `isAuthenticated` middleware verifies the `x-access-token` header on every protected route
- Token expiry and `JsonWebTokenError` are both caught and return `403 Forbidden`

### 📬 Email Verification (Optional)
- Controlled by `ENABLE_EMAIL_VERIFICATION=true` environment variable
- On signup, a 10-character uppercase UUID token is saved to the User document with a 1-hour expiry
- An email containing `<APP_LINK>/verify/<token>` is queued in `mailQueue`
- `GET /verify/:token` validates the token, checks expiry, and sets `isVerified = true`

### 💳 Razorpay Payment Integration
- `POST /api/v1/payments/order` creates a Razorpay order and persists it to MongoDB with status `created`
- The Razorpay checkout popup is loaded dynamically via the official CDN script
- On success, `captureOrderMutation` calls `POST /api/v1/payments/capture`
- Server verifies HMAC-SHA256 signature: `crypto.createHmac('sha256', KEY_SECRET).update('<orderId>|<paymentId>').digest('hex')`
- Payment status is updated to `success` or `failed` in MongoDB

### 📊 Bull-Board Queue Dashboard
- Accessible at `http://localhost:3000/ui`
- Monitors `mailQueue` and `testQueue` with real-time job counts, payloads, and retry capabilities

---

## 🛠 Tech Stack

### Frontend — `SyncSpace-Frontend`

| Layer | Library / Tool | Purpose |
|:---|:---|:---|
| Framework | React 18 | Component-based UI |
| Bundler | Vite 6 | HMR dev server, production bundling |
| Routing | React Router v7 | Declarative routes, protected routes |
| Styling | Tailwind CSS 3.4, CVA, tailwind-merge | Utility-first styling, variant components |
| UI Primitives | Radix UI (Avatar, Dialog, Dropdown, Separator, Slot, Toast, Tooltip) | Accessible, unstyled components |
| Icons | Lucide React, React Icons | Icon sets |
| Server State | TanStack React Query v5 | Async caching, deduplication, invalidation |
| Real-Time | Socket.IO Client 4.8 | WebSocket channel subscriptions |
| Rich Text | Quill 2 | WYSIWYG message composition and rendering |
| HTTP Client | Axios | API requests with custom base URL instance |
| Layout | react-resizable-panels | Resizable sidebar and content panels |
| UX | react-verification-input | 6-box PIN-style join code entry |

### Backend — `SyncSpace-Backend`

| Layer | Library / Tool | Purpose |
|:---|:---|:---|
| Runtime | Node.js (ES Modules, `"type": "module"`) | Async server-side JavaScript |
| Web Framework | Express 4.21 | HTTP routing and middleware |
| Database | MongoDB + Mongoose 8 | Document persistence, schema modeling |
| Real-Time | Socket.IO 4.8 | WebSocket server with room partitioning |
| Caching / Queues | Redis (ioredis), Bull 4 | Distributed job queues |
| Queue UI | @bull-board/express | Visual queue monitoring dashboard |
| Cloud Storage | AWS SDK v2 (S3) | Pre-signed URL generation for image uploads |
| Payments | Razorpay Node SDK | Order creation, HMAC signature verification |
| Email | Nodemailer (Gmail/SMTP) | Transactional email delivery |
| Validation | Zod | Request body schema validation |
| Auth / Security | jsonwebtoken, bcrypt | Stateless JWT auth, password hashing |
| Dev Tooling | ESLint, Prettier, Nodemon | Linting, formatting, hot reload |

---

## 📁 Project Structure

```
SyncSpace/
│
├── SyncSpace-Frontend/
│   ├── src/
│   │   ├── apis/
│   │   │   ├── auth/              # signup, signin requests
│   │   │   ├── channels/          # getChannelById
│   │   │   ├── payments/          # createOrder, captureOrder
│   │   │   ├── s3/                # getPresignedUrl, uploadImageToAWS
│   │   │   └── workspaces/        # create, fetch, update, delete, join, addMember, addChannel, resetJoinCode
│   │   │
│   │   ├── components/
│   │   │   ├── atoms/
│   │   │   │   ├── Editor/        # Quill editor with toolbar, image picker, send button
│   │   │   │   ├── Hint/          # Tooltip wrapper (Radix)
│   │   │   │   ├── MessageImageThumbnail/  # Clickable image with zoom dialog
│   │   │   │   ├── MessageRenderer/       # Headless Quill Delta → HTML renderer
│   │   │   │   ├── SideBarItem/   # Channel/DM navigation item
│   │   │   │   ├── UserButton/    # Avatar dropdown (logout, create workspace)
│   │   │   │   └── UserItem/      # Member list item with avatar
│   │   │   │
│   │   │   ├── molecules/
│   │   │   │   ├── Channel/       # ChannelHeader with info dialog
│   │   │   │   ├── ChatInput/     # S3 upload + Socket emit wrapper
│   │   │   │   ├── CreateChannelModal/    # Admin channel creation dialog
│   │   │   │   ├── CreateWorkspaceModal/  # Workspace creation dialog
│   │   │   │   ├── Message/       # Single message row (avatar, author, timestamp, body, image)
│   │   │   │   ├── ProtectedRoute/        # Auth guard, redirects to /auth/signin
│   │   │   │   ├── RenderRazorpayPopup/   # Dynamic Razorpay checkout loader
│   │   │   │   ├── SidebarButton/ # Icon + label button for sidebar nav
│   │   │   │   └── Workspace/
│   │   │   │       ├── WorkspacePanelHeader   # Workspace name dropdown + invite modal trigger
│   │   │   │       ├── WorkspacePanelSection  # Collapsible sidebar section
│   │   │   │       └── WorkspacePreferencesModal  # Rename + delete workspace with confirm dialogs
│   │   │   │
│   │   │   ├── organisms/
│   │   │   │   ├── Auth/          # SigninContainer, SignupContainer, SigninCard, SignupCard
│   │   │   │   ├── Modals/        # Global modal host (CreateWorkspace, CreateChannel, Preferences)
│   │   │   │   └── Workspace/
│   │   │   │       ├── WorkspaceNavbar    # Top bar with search button, workspace fetch, auto-logout on 403
│   │   │   │       ├── WorkspacePanel    # Sidebar panel: channels list + members list
│   │   │   │       ├── WorkspaceSidebar  # Narrow icon rail (Home, DMs, Notifications, More, UserButton)
│   │   │   │       └── WorkspaceSwitcher # Dropdown to switch between joined workspaces
│   │   │   │
│   │   │   └── ui/                # Radix-based primitives: button, input, avatar, dialog, dropdown, resizable, toast, separator
│   │   │
│   │   ├── config/
│   │   │   └── axiosConfig.js     # Axios instance with VITE_BACKEND_API_URL as baseURL
│   │   │
│   │   ├── context/
│   │   │   ├── AppContextProvider.jsx          # combineContext(...all providers)
│   │   │   ├── AuthContext.jsx                 # user + token from localStorage, logout()
│   │   │   ├── CHannelMessages.jsx             # messageList state shared across channel view
│   │   │   ├── CreateChannelContext.jsx         # openCreateChannelModal state
│   │   │   ├── CreateWorkspaceContext.jsx       # openCreateWorkspaceModal state
│   │   │   ├── SocketContext.jsx               # socket instance, joinChannel(), currentChannel
│   │   │   ├── WorkspaceContext.jsx            # currentWorkspace state
│   │   │   └── WorkspacePreferencesModalContext.jsx  # openPreferences, initialValue, workspace
│   │   │
│   │   ├── hooks/
│   │   │   ├── apis/
│   │   │   │   ├── auth/          # useSignup, useSignin
│   │   │   │   ├── channels/      # useGetChannelById, useGetChannelMessages
│   │   │   │   ├── payments/      # useCreateOrder, useCaptureOrder
│   │   │   │   └── workspaces/    # useFetchWorkspace, useGetWorkspaceById, useCreateWorkspace,
│   │   │   │                      # useUpdateWorkspace, useDeleteWorkspace, useAddChannelToWorkspace,
│   │   │   │                      # useAddMemberToWorkspace, useJoinWorkspace, useResetJoinCode
│   │   │   ├── context/           # useAuth, useSocket, useCurrentWorkspace, useChannelMessages,
│   │   │   │                      # useCreateWorkspaceModal, useCreateChannelModal, useWorkspacePreferencesModal
│   │   │   ├── use-toast.js       # Radix toast hook
│   │   │   └── useConfirm.jsx     # Promise-based confirm dialog hook
│   │   │
│   │   ├── pages/
│   │   │   ├── Auth/              # Auth layout wrapper (centered card on slack-colored bg)
│   │   │   ├── Home/              # Redirects to first workspace or opens CreateWorkspaceModal
│   │   │   ├── Notfound/          # 404 page
│   │   │   ├── Payments/          # Amount form + RenderRazorpayPopup
│   │   │   └── Workspace/
│   │   │       ├── Layout.jsx     # WorkspaceNavbar + WorkspaceSidebar + ResizablePanels
│   │   │       ├── JoinPage.jsx   # 6-box verification input for join codes
│   │   │       └── Channel/
│   │   │           └── Channel.jsx  # Message list, auto-scroll, ChatInput, joinChannel on mount
│   │   │
│   │   ├── utils/
│   │   │   └── combineContext.jsx  # reduceRight provider composition utility
│   │   │
│   │   ├── App.jsx                # QueryClientProvider + AppContextProvider + AppRoutes + Modals + Toaster
│   │   ├── Routes.jsx             # All application routes with ProtectedRoute guards
│   │   ├── index.css              # Global Tailwind stylesheet
│   │   └── main.jsx               # ReactDOM.createRoot mount
│   │
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── SyncSpace-Backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── awsConfig.js       # AWS.S3 instance
│   │   │   ├── bullBoardConfig.js # ExpressAdapter + createBullBoard (mailQueue, testQueue)
│   │   │   ├── dbConfig.js        # connectDB(), switches DEV_DB_URL / PROD_DB_URL by NODE_ENV
│   │   │   ├── mailConfig.js      # Nodemailer Gmail SMTP transport (port 465, SSL)
│   │   │   ├── razorpayConfig.js  # new Razorpay({ key_id, key_secret })
│   │   │   ├── redisConfig.js     # { host, port } from env
│   │   │   └── serverConfig.js    # All env exports (PORT, JWT_SECRET, AWS_*, RAZORPAY_*, …)
│   │   │
│   │   ├── controllers/
│   │   │   ├── channelController.js       # getChannelByIdController
│   │   │   ├── channelSocketController.js # JoinChannel socket handler
│   │   │   ├── memberController.js        # isMemberPartOfWorkspaceController
│   │   │   ├── messageController.js       # getMessages, getPresignedUrlFromAWS
│   │   │   ├── messageSocketController.js # NewMessage socket handler → persist + broadcast
│   │   │   ├── paymentController.js       # createOrderController, capturePaymentController
│   │   │   ├── userController.js          # signUp, signIn
│   │   │   └── workspaceController.js     # create, get, getAll, update, delete, getByJoinCode,
│   │   │                                  # join, addMember, addChannel, resetJoinCode, verifyEmail
│   │   │
│   │   ├── middlewares/
│   │   │   └── authMiddleware.js  # isAuthenticated: reads x-access-token, verifies JWT, attaches req.user
│   │   │
│   │   ├── processors/
│   │   │   └── mailProcessor.js   # mailQueue.process() consumer; calls nodemailer.sendMail()
│   │   │
│   │   ├── producers/
│   │   │   └── mailQueueProducer.js  # addEmailtoMailQueue(emailData) — pushes job to mailQueue
│   │   │
│   │   ├── queues/
│   │   │   ├── mailQueue.js       # new Queue('mailQueue', { redis: redisConfig })
│   │   │   └── testQueue.js       # new Queue('testQueue', { redis: redisConfig })
│   │   │
│   │   ├── repositories/
│   │   │   ├── crudRepository.js       # Generic factory: create, getAll, getById, update, delete, deleteMany
│   │   │   ├── channelRepostiory.js    # extends crud + getChannelWithWorkspaceDetails
│   │   │   ├── messageRepository.js    # extends crud + getPaginatedMessages (sorted -createdAt, populate senderId) + getMessageDetails
│   │   │   ├── paymentRepository.js    # extends crud + updateOrder
│   │   │   ├── userRepository.js       # extends crud + signUpUser, getByEmail, getByUsername, getByToken
│   │   │   └── workspaceRepository.js  # extends crud + getWorkspaceDetailsById (populate members+channels),
│   │   │                               # getWorkspaceByName, getWorkspaceByJoinCode, addMemberToWorkspace,
│   │   │                               # addChannelToWorkspace, fetchAllWorkspaceByMemberId
│   │   │
│   │   ├── routes/
│   │   │   ├── apiRoutes.js       # /api → v1Router
│   │   │   └── v1/
│   │   │       ├── v1Router.js    # Mounts: /users, /workspaces, /channels, /members, /messages, /payments
│   │   │       ├── users.js
│   │   │       ├── workspaces.js
│   │   │       ├── channel.js
│   │   │       ├── members.js
│   │   │       ├── messages.js
│   │   │       └── payment.js
│   │   │
│   │   ├── schema/
│   │   │   ├── user.js       # email, username, password (hashed), avatar (RoboHash), isVerified, verificationToken/Expiry
│   │   │   ├── workspace.js  # name (unique), description, members[{memberId, role}], joinCode, channels[]
│   │   │   ├── channel.js    # name, workspaceId (ref)
│   │   │   ├── message.js    # body, image, channelId, senderId, workspaceId
│   │   │   └── payment.js    # orderId (unique), paymentId, status (created/success/failed), amount
│   │   │
│   │   ├── services/
│   │   │   ├── userService.js       # signUpService, signInService (bcrypt compare), verifyTokenService
│   │   │   ├── workspaceService.js  # create (joinCode + general channel), get, getAll, update, delete,
│   │   │   │                        # getByJoinCode, resetJoinCode, addMember (+ email queue), addChannel, joinWorkspace
│   │   │   ├── channelService.js    # getChannelByIdService (with 20-message preload + workspace membership check)
│   │   │   ├── memberService.js     # isMemberPartOfWorkspaceService
│   │   │   ├── messageService.js    # getMessagesService (paginated + auth), createMessageService (persist + populate)
│   │   │   └── paymentService.js    # createPaymentService, updatePaymentStatusService (HMAC-SHA256 verify)
│   │   │
│   │   ├── utils/
│   │   │   ├── common/
│   │   │   │   ├── authUtils.js      # createJWT({ id, email })
│   │   │   │   ├── eventConstants.js # NewMessage, NewMessageReceived, JoinChannel, LeaveChannel
│   │   │   │   ├── mailObject.js     # workspaceJoinMail(), verifyEmailMail()
│   │   │   │   └── responseObjects.js  # successResponse, customErrorResponse, internalErrorResponse
│   │   │   └── errors/
│   │   │       ├── clientError.js    # ClientError extends Error (message, explanation, statusCode)
│   │   │       └── validationError.js
│   │   │
│   │   ├── validators/
│   │   │   ├── userSchema.js      # z.object({ email, username, password })
│   │   │   ├── workspaceSchema.js # createWorkspaceSchema, addMemberToWorkspaceSchema, addChannelToWorkspaceSchema
│   │   │   └── zodValidator.js    # validate(schema) middleware factory
│   │   │
│   │   └── index.js               # Express app, Socket.IO server, /api, /ui (Bull-Board), /ping, /verify/:token
│   │
│   ├── .env.example
│   └── package.json
│
├── LICENSE
└── README.md
```

---

## 🗄 Data Models

### Entity Relationships

```
User
  _id          ObjectId
  email        String (unique, validated)
  username     String (unique, alphanumeric, min 3)
  password     String (bcrypt hashed, salt=9)
  avatar       String (https://robohash.org/<username>)
  isVerified   Boolean (default: false)
  verificationToken       String (10-char UUID, 1hr expiry)
  verificationTokenExpiry Date
  createdAt, updatedAt

Workspace
  _id          ObjectId
  name         String (unique)
  description  String
  joinCode     String (6-char UUID uppercase)
  members      [{ memberId: ObjectId→User, role: 'admin'|'member' }]
  channels     [ObjectId→Channel]

Channel
  _id          ObjectId
  name         String
  workspaceId  ObjectId→Workspace
  createdAt, updatedAt

Message
  _id          ObjectId
  body         String (Quill Delta JSON)
  image        String (S3 URL, optional)
  channelId    ObjectId→Channel
  senderId     ObjectId→User
  workspaceId  ObjectId→Workspace
  createdAt, updatedAt

Payment
  _id          ObjectId
  orderId      String (unique, from Razorpay)
  paymentId    String (from Razorpay, on success)
  status       'created' | 'success' | 'failed'
  amount       Number
  createdAt, updatedAt
```

### Relationship Diagram

```
 User ──────────────────── Workspace
  │      (members array,     │
  │       role embedded)     │ 1:N
  │                          ▼
  │                       Channel
  │                          │ 1:N
  │                          ▼
  └──── (senderId) ────── Message ──── (image) ──► AWS S3

                         Payment (standalone, linked to Razorpay orderId)
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Notes |
|:---|:---|:---|
| Node.js | ≥ 18.0.0 | ES Modules (`"type": "module"`) |
| npm | ≥ 9.0.0 | |
| MongoDB | Any | Local: `mongodb://localhost:27017` or Atlas URI |
| Redis | Any | Local: `redis://localhost:6379` — required for Bull queues |
| AWS S3 Bucket | — | Required for image upload; optional for text-only testing |
| Razorpay Account | — | Required for payment flow; optional otherwise |

---

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Message-Slack
```

---

### 2. Backend Setup (`SyncSpace-Backend`)

```bash
cd SyncSpace-Backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Fill in required variables (see Environment Variables section)

# Start development server
npm start
# Runs: eslint --fix && nodemon src/index.js
```

**Verify the backend is running:**
- Health check: `http://localhost:3000/ping` → `{ "message": "pong" }`
- Queue dashboard: `http://localhost:3000/ui`

---

### 3. Frontend Setup (`SyncSpace-Frontend`)

```bash
cd SyncSpace-Frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Fill in required variables (see Environment Variables section)

# Start Vite dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## ⚙️ Environment Variables

### Backend — `SyncSpace-Backend/.env`

```ini
# ── Server ────────────────────────────────────────────────────────
PORT=3000
NODE_ENV=development            # 'development' uses DEV_DB_URL; 'production' uses PROD_DB_URL

# ── Database ──────────────────────────────────────────────────────
DEV_DB_URL=mongodb://localhost:27017/syncspace
PROD_DB_URL=mongodb://localhost:27017/syncspace_prod

# ── Authentication ────────────────────────────────────────────────
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRY=1d                   # Token expiry (e.g. 1d, 7d, 12h)

# ── Email / Nodemailer ────────────────────────────────────────────
MAIL_ID=your_email@gmail.com
MAIL_PASSWORD=your_gmail_app_password   # Gmail App Password (not your account password)

# ── Redis (Bull Queues) ───────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379

# ── Application ───────────────────────────────────────────────────
APP_LINK=http://localhost:3000  # Base URL used inside verification email links
ENABLE_EMAIL_VERIFICATION=false # Set to 'true' to send verification emails on signup

# ── AWS S3 ────────────────────────────────────────────────────────
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_BUCKET_NAME=your_s3_bucket_name

# ── Razorpay ──────────────────────────────────────────────────────
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
CURRENCY=INR
RECEIPT_SECRET=receipt_1103
```

### Frontend — `SyncSpace-Frontend/.env`

```ini
VITE_BACKEND_API_URL=http://localhost:3000/api/v1   # REST API base URL
VITE_BACKEND_SOCKET_URL=http://localhost:3000       # Socket.IO connection URL
VITE_RAZORPAY_KEY_ID=your_razorpay_test_key_id     # Public key for Razorpay checkout
```

---

## 📖 API Reference

> All protected endpoints require the header:
> ```
> x-access-token: <jwt_token>
> ```
> All responses follow the shape `{ success, message, data, err }`.

---

### Authentication — `/api/v1/users`

| Method | Endpoint | Auth | Body | Description |
|:---|:---|:---:|:---|:---|
| `POST` | `/signup` | ✗ | `{ email, username, password }` | Register a new user. Hashes password, generates RoboHash avatar, optionally queues verification email |
| `POST` | `/signin` | ✗ | `{ email, password }` | Validate credentials with bcrypt, return `{ user, token }` |

---

### Workspaces — `/api/v1/workspaces`

| Method | Endpoint | Auth | Admin Only | Body | Description |
|:---|:---|:---:|:---:|:---|:---|
| `POST` | `/` | ✓ | — | `{ name }` | Create workspace. Creator becomes admin. Generates 6-char joinCode. Auto-creates `#general` channel |
| `GET` | `/` | ✓ | — | — | Fetch all workspaces where authenticated user is a member |
| `GET` | `/:workspaceId` | ✓ | — | — | Get workspace details with fully populated `members` (username, email, avatar) and `channels` |
| `PUT` | `/:workspaceId` | ✓ | ✓ | `{ name }` | Update workspace name |
| `DELETE` | `/:workspaceId` | ✓ | ✓ | — | Delete workspace and all its associated channels |
| `GET` | `/join/:joinCode` | ✓ | — | — | Look up a workspace by its 6-character join code |
| `PUT` | `/:workspaceId/join` | ✓ | — | `{ joinCode }` | Join workspace using join code. Adds user as `member` |
| `PUT` | `/:workspaceId/members` | ✓ | ✓ | `{ memberId }` | Directly add a user by ID. Queues join notification email |
| `PUT` | `/:workspaceId/channels` | ✓ | ✓ | `{ channelName }` | Create a new channel inside the workspace |
| `PUT` | `/:workspaceId/joinCode/reset` | ✓ | ✓ | — | Regenerate a new 6-character joinCode |

---

### Members — `/api/v1/members`

| Method | Endpoint | Auth | Description |
|:---|:---|:---:|:---|
| `GET` | `/workspace/:workspaceId` | ✓ | Check if authenticated user is a member of the given workspace |

---

### Channels — `/api/v1/channels`

| Method | Endpoint | Auth | Description |
|:---|:---|:---:|:---|
| `GET` | `/:channelId` | ✓ | Get channel details with its parent workspace. Also returns the first 20 messages. Validates workspace membership |

---

### Messages — `/api/v1/messages`

| Method | Endpoint | Auth | Query Params | Description |
|:---|:---|:---:|:---|:---|
| `GET` | `/pre-signed-url` | ✓ | — | Generate a 60-second AWS S3 pre-signed `putObject` URL for direct browser upload |
| `GET` | `/:channelId` | ✓ | `?page=1&limit=20` | Paginated messages sorted by `-createdAt`, with `senderId` populated (username, email, avatar) |

---

### Payments — `/api/v1/payments`

| Method | Endpoint | Auth | Body | Description |
|:---|:---|:---:|:---|:---|
| `POST` | `/order` | ✓ | `{ amount }` | Create Razorpay order (amount in smallest unit, e.g. paise). Persists to MongoDB with status `created` |
| `POST` | `/capture` | ✗ | `{ orderId, status, paymentId, signature }` | Verify HMAC-SHA256 signature and update payment status to `success` or `failed` |

---

### Email Verification

| Method | Endpoint | Auth | Description |
|:---|:---|:---:|:---|
| `GET` | `/verify/:token` | ✗ | Validates token existence, checks 1-hour expiry, sets `isVerified = true` |

---

## 🔌 WebSocket Events

The Socket.IO server uses rooms to scope message delivery. A client must emit `JoinChannel` before it will receive messages for a channel.

```
Client                             Server (Socket.IO)
  │                                      │
  ├──── JoinChannel ─────────────────────►│  socket.join(channelId)
  │     { channelId: "..." }             │  ack: { success: true, data: channelId }
  │                                      │
  ├──── NewMessage ──────────────────────►│  1. createMessageService(data) → MongoDB
  │     {                                │  2. messageRepository.getMessageDetails() → populate senderId
  │       channelId,                     │  3. io.to(channelId).emit('NewMessageReceived', populated)
  │       body,        (Quill Delta JSON)│  ack: { success: true, data: messageDoc }
  │       image,       (S3 URL | null)   │
  │       senderId,                      │
  │       workspaceId                    │
  │     }                                │
  │                                      │
  │◄─── NewMessageReceived ──────────────┤  Broadcast to all sockets in the channelId room
  │     Populated message document       │
```

### Event Constants (defined in `eventConstants.js`)

| Constant | Value | Direction |
|:---|:---|:---|
| `NEW_MESSAGE_EVENT` | `"NewMessage"` | Client → Server |
| `NEW_MESSAGE_RECEIVED_EVENT` | `"NewMessageReceived"` | Server → Client |
| `JOIN_CHANNEL` | `"JoinChannel"` | Client → Server |
| `LEAVE_CHANNEL` | `"LeaveChannel"` | Client → Server (defined, not yet implemented) |

### Socket.IO CORS

The Socket.IO server is initialized with `cors: { origin: '*' }`. Restrict this in production to your frontend domain.

---

## 📬 Background Job Queue

SyncSpace uses Bull queues backed by Redis for all asynchronous email delivery.

### Queue Architecture

```
Event Trigger                      Producer                  Queue           Consumer
─────────────                      ────────                  ─────           ────────
User signs up              ──────► addEmailtoMailQueue()  ─► mailQueue  ──► mailProcessor
  (ENABLE_EMAIL_VERIFICATION=true)  { ...verifyEmailMail(),               mailQueue.process()
                                      to: user.email }                     mailer.sendMail()

Admin adds member to workspace ──► addEmailtoMailQueue()  ─► mailQueue  ──► mailProcessor
                                   { ...workspaceJoinMail(),
                                     to: member.email }
```

### Email Templates (in `utils/common/mailObject.js`)

| Template | Subject | Trigger |
|:---|:---|:---|
| `workspaceJoinMail(workspace)` | `"You have been added to a workspace"` | `PUT /api/v1/workspaces/:id/members` |
| `verifyEmailMail(token)` | `"Welcome to the app. Please verify your email"` | User signup (when verification enabled) |

### Bull-Board Dashboard

Navigate to `http://localhost:3000/ui` to view:
- Active, waiting, completed, failed, and delayed job counts
- Full job payload inspection
- Manual job retry for failed deliveries

---

## 🔒 Security

| Control | Implementation |
|:---|:---|
| **Password storage** | bcrypt with salt factor 9, applied in `userSchema.pre('save')` |
| **Authentication** | Stateless JWT (`jsonwebtoken`), signed with `JWT_SECRET`, delivered via `x-access-token` header |
| **Authorization** | `isAuthenticated` middleware on all protected routes; admin checks in service layer for mutating workspace operations |
| **Input validation** | Zod schemas (`userSignUpSchema`, `createWorkspaceSchema`, etc.) via `validate(schema)` middleware |
| **Payment integrity** | HMAC-SHA256 signature verification on payment capture: `crypto.createHmac('sha256', KEY_SECRET).update('<orderId>|<paymentId>').digest('hex')` compared to Razorpay's signature |
| **Direct S3 uploads** | Pre-signed URLs with 60-second TTL; binary data never passes through Node.js memory |
| **CORS** | Express-level `cors()` middleware; Socket.IO `cors: { origin: '*' }` (restrict in production) |
| **Error handling** | Custom `ClientError` and `ValidationError` classes propagated through layers; response formatters (`successResponse`, `customErrorResponse`, `internalErrorResponse`) standardize all API responses |
| **Token expiry handling** | `TokenExpiredError` and `JsonWebTokenError` both return `403 Forbidden` |
| **Membership checks** | `isUserMemberOfWorkspace` called in message, channel, and workspace services before data access |

---

## 🧰 Developer Scripts

### Backend (`SyncSpace-Backend`)

```bash
npm start         # lint:fix + nodemon src/index.js
npm run lint      # eslint .
npm run lint:fix  # eslint . --fix
npm run format    # prettier --write .
```

### Frontend (`SyncSpace-Frontend`)

```bash
npm run dev       # Vite dev server (HMR)
npm run build     # Production bundle
npm run preview   # Preview production build locally
npm run lint      # eslint .
```

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).

---

<div align="center">
  <sub>Built with care — SyncSpace</sub>
</div>
