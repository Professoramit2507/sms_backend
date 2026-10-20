# Secure SMS Backend API

A complete, secure, and production-ready REST API backend built with **Node.js**, **Express**, **MongoDB (Mongoose)**, **JWT Authentication**, and **Dotenv**.

Designed specifically for encrypted messaging and key exchange applications.

---

## 📁 Project Architecture

```
secure-sms-backend/
├── .env                  # Environment configuration
├── .env.example          # Environment template
├── .gitignore            # Git ignore file
├── package.json          # Node package & scripts
├── server.js             # Main server entry point
└── src/
    ├── config/
    │   └── db.js         # MongoDB connection setup
    ├── controllers/
    │   ├── authController.js         # User registration, login, JWT
    │   ├── contactController.js      # Contacts management
    │   ├── conversationController.js # Conversations management
    │   ├── keyController.js          # Cryptographic key registration & lookup
    │   └── messageController.js      # Encrypted messages sending & receiving
    ├── middlewares/
    │   ├── authMiddleware.js         # JWT Bearer protection
    │   └── errorHandler.js           # Central error & 404 handler
    ├── models/
    │   ├── Contact.js                # Contact schema
    │   ├── Conversation.js           # Conversation schema
    │   ├── Key.js                    # Cryptographic public key schema
    │   ├── Message.js                # Encrypted message schema
    │   └── User.js                   # User account schema with bcrypt
    ├── routes/
    │   ├── authRoutes.js
    │   ├── contactRoutes.js
    │   ├── conversationRoutes.js
    │   ├── index.js                  # Master router mounted at /api
    │   ├── keyRoutes.js
    │   ├── messageRoutes.js
    │   └── userRoutes.js
    └── utils/
        └── generateToken.js          # JWT generator utility
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd secure-sms-backend
npm install
```

### 2. Configure Environment (`.env`)
The `.env` file is pre-configured. Adjust it if needed:

```env
PORT=5000
NODE_ENV=development

# For Local MongoDB:
MONGO_URI=mongodb://127.0.0.1:27017/secure_sms

# Or for MongoDB Atlas (Cloud):
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/secure_sms?retryWrites=true&w=majority

JWT_SECRET=secure_sms_super_secret_jwt_key_2026_!@#$
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### 3. Run the Server

**Development Mode (auto-reloads with nodemon):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

Server will run at `http://localhost:5000` with API base URL `http://localhost:5000/api`.

---

## 📡 API Endpoints Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new account (`fullName, username, email, password`) | No |
| `POST` | `/api/auth/login` | Login with identifier (email or username) & password | No |
| `GET` | `/api/auth/me` | Get currently logged-in user profile | Yes (Bearer Token) |
| `POST` | `/api/auth/refresh` | Refresh JWT authentication token | Yes (Bearer Token) |
| `POST` | `/api/auth/logout` | Logout current session | Yes (Bearer Token) |

### 👤 User Profile (`/api/users`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/users/me` | Fetch user profile | Yes |
| `PUT` | `/api/users/me` | Update user profile (`fullName`, `avatar`) | Yes |
| `PUT` | `/api/users/me/password` | Change password (`currentPassword`, `newPassword`) | Yes |

### 🔑 Cryptographic Keys (`/api/keys`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/keys` | Register or update public key, uniqueKey & fingerprint | Yes |
| `GET` | `/api/keys/me` | Get current user's registered key record | Yes |
| `GET` | `/api/keys/status` | Check if user has generated & registered key | Yes |
| `GET` | `/api/keys/:userId` | Get public key & fingerprint of a specific user | Yes |

### 👥 Contacts (`/api/contacts`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/contacts` | List all contacts for logged-in user | Yes |
| `POST` | `/api/contacts` | Add contact by `identifier` (email or username) | Yes |
| `GET` | `/api/contacts/:id` | Get single contact profile | Yes |
| `DELETE` | `/api/contacts/:id` | Remove contact | Yes |

### 💬 Conversations & Messages (`/api/conversations`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/conversations` | Get all user conversations | Yes |
| `POST` | `/api/conversations` | Create or get conversation with `recipientId` | Yes |
| `GET` | `/api/conversations/:id` | Get specific conversation details | Yes |
| `GET` | `/api/conversations/:id/messages` | Get all messages in a conversation | Yes |
| `POST` | `/api/conversations/:id/messages` | Send encrypted message into a conversation | Yes |
| `PATCH/PUT`| `/api/messages/:id/read` | Mark message as read | Yes |
| `DELETE` | `/api/messages/:id` | Delete a message | Yes |

---

## 🔗 Connecting with Frontend

The frontend (`secure-sms-frontend`) is already configured to target:
```
VITE_API_BASE_URL=http://localhost:5000/api
```
All endpoints and data structures in this backend directly match the contracts defined in frontend's `api.js`, `authService.js`, `keyService.js`, and `messageService.js`.
