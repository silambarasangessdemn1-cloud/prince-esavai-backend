# Prince eSevai Authentication Backend

Production-grade Node.js + Express + MongoDB authentication system built with security best practices, bcrypt password hashing, and JWT tokens.

---

## 📁 Project Architecture

```
backend/
├── src/
│   ├── config/
│   │   └── db.js                  # Mongoose MongoDB connection
│   ├── controllers/
│   │   └── authController.js      # Register, Login & Profile controllers
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT verification middleware
│   │   ├── errorHandler.js        # Global error & 404 handler
│   │   └── validationMiddleware.js# express-validator request rules
│   ├── models/
│   │   └── User.js                # User schema (bcrypt hashing, safe JSON)
│   ├── routes/
│   │   └── authRoutes.js          # Authentication routing endpoints
│   ├── app.js                     # Express application configuration
│   ├── server.js                  # App bootstrap & HTTP server entry
│   └── test-api.js                # End-to-end API verification test
├── .env                           # Environment configuration
├── .env.example                   # Environment configuration template
├── package.json                   # Dependencies and scripts
└── README.md                      # API documentation
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Variables (.env)
The `.env` file is pre-configured with MongoDB Atlas connection string:
```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb+srv://tamilnew468_db_user:w7EN5luiSV7B7RKm@cluster0.zoa3glj.mongodb.net/prince_esavai?retryWrites=true&w=majority
JWT_SECRET=prince_esavai_jwt_secret_key_2026_super_secure!
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
```

### 3. Run the Server
- **Development mode (with auto-reload):**
  ```bash
  npm run dev
  ```
- **Production mode:**
  ```bash
  npm start
  ```
- **Run automated test suite:**
  ```bash
  npm test
  ```

---

## 📡 API Endpoints

Base URL: `http://localhost:5001/api/auth`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/health` | Service health status | Public |
| `POST` | `/api/auth/register` | Register new user with username, phone & password | Public |
| `POST` | `/api/auth/login` | Authenticate user with phone & password | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Private (Bearer Token) |

---

## 📖 API Documentation & Error Responses

### 1. Register User
- **Route:** `POST /api/auth/register`
- **Request Body:**
```json
{
  "username": "Tamil Selvan",
  "phoneNumber": "9876543210",
  "password": "Password123"
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "67be647610...",
      "username": "Tamil Selvan",
      "phoneNumber": "9876543210",
      "role": "user",
      "isActive": true,
      "createdAt": "2026-10-28T07:25:57.226Z",
      "updatedAt": "2026-10-28T07:25:57.226Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. Login User
- **Route:** `POST /api/auth/login`

#### Scenario A: Wrong Phone Number (User Not Found)
- **Request:**
```json
{
  "phoneNumber": "9000000000",
  "password": "Password123"
}
```
- **Response (404 Not Found):**
```json
{
  "success": false,
  "error": "WRONG_PHONE_NUMBER",
  "message": "Wrong phone number. No account found with this phone number."
}
```

#### Scenario B: Wrong Password
- **Request:**
```json
{
  "phoneNumber": "9876543210",
  "password": "IncorrectPassword"
}
```
- **Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "WRONG_PASSWORD",
  "message": "Wrong password. Please enter the correct password."
}
```

#### Scenario C: Successful Login
- **Request:**
```json
{
  "phoneNumber": "9876543210",
  "password": "Password123"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "67be647610...",
      "username": "Tamil Selvan",
      "phoneNumber": "9876543210",
      "role": "user",
      "isActive": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3. Get User Profile (Protected)
- **Route:** `GET /api/auth/me`
- **Headers:** `Authorization: Bearer <your_jwt_token>`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "67be647610...",
      "username": "Tamil Selvan",
      "phoneNumber": "9876543210",
      "role": "user",
      "isActive": true
    }
  }
}
```

