# Authentication API Backend

A robust RESTful API backend for user authentication with JWT tokens, bcrypt password hashing, and **native PostgreSQL** database.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via **node-postgres `pg`**)
- **Authentication**: JSON Web Tokens (JWT)
- **Password Hashing**: bcrypt
- **Deployment**: Render

## Features

- User registration with email/password
- User login with JWT token generation
- Protected routes with JWT authentication
- Secure password hashing with bcrypt (10 salt rounds)
- Input validation
- **Row Level Security (RLS) policies (Implemented in SQL)**
- CORS enabled
- Comprehensive error handling

---

## API Endpoints

### Authentication Routes

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "uuid-here"
}
```

#### POST `/api/auth/login`
Login with existing credentials.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "uuid-here"
}
```

#### POST `/api/auth/social/google`
Google OAuth login (stub implementation).

**Request Body:**
```json
{
  "token": "google-oauth-token"
}
```

**Response (501):**
```json
{
  "error": "Google authentication not yet implemented",
  "message": "This endpoint is a stub for future implementation"
}
```

#### POST `/api/auth/forgot-password`
Initiate password reset flow (stub for email sending).

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "message": "If the email exists, a password reset link has been sent"
}
```

### User Routes

#### GET `/api/users/me`
Get authenticated user profile (protected route).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "uuid-here",
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2025-10-15T00:00:00.000Z"
}
```

## Local Setup

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database  
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd auth-api-backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:

Create a `.env` file in the root directory:

```env
DATABASE_URL=your-database-url
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
```

**Important:** Change the `JWT_SECRET` to a strong, random string in production.

4. Set up the database:

Run the migration script in your SQL Editor:
```bash
cat migrations/001_create_users_table.sql
```

Copy and execute the SQL in your pgadmin dashboard.

5. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Database Schema

### Users Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique user identifier |
| name | varchar(255) | NOT NULL | User's full name |
| email | varchar(255) | NOT NULL, UNIQUE | User's email address |
| password_hash | varchar(60) | NOT NULL | Bcrypt-hashed password |
| created_at | timestamptz | DEFAULT NOW() | Account creation timestamp |
| updated_at | timestamptz | DEFAULT NOW() | Last update timestamp |

### Security

- Row Level Security (RLS) enabled
- Users can only read their own profile data
- Users can only update their own profile data
- Passwords hashed with bcrypt (10 salt rounds minimum)

## Deployment on Render

### Prerequisites

- GitHub account with the repository
- Render account

### Steps

1. **Create PostgreSQL Database:**
   - Go to Render dashboard
   - Click "New +" → "PostgreSQL"
   - Choose a name and region
   - Note the database URL

2. **Create Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: auth-api-backend
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`

3. **Set Environment Variables:**
   - In the Render dashboard, go to Environment
   - Add:
     - `DATABASE_URL`: Your database project URL
     - `JWT_SECRET`: A strong random string
     - `PORT`: 3000 (or leave blank for Render default)

4. **Run Database Migration:**
   - Execute the SQL from `migrations/001_create_users_table.sql` in your SQL Editor

5. **Deploy:**
   - Render will automatically build and deploy
   - Your API will be available at the provided Render URL

## Project Structure

```
auth-api-backend/
├── config/
│   └── database.js          # Database connection and initialization
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── migrations/
│   └── 001_create_users_table.sql  # Database schema
├── routes/
│   ├── auth.js              # Authentication endpoints
│   └── users.js             # User profile endpoints
├── utils/
│   ├── auth.js              # Password hashing and JWT utilities
│   └── validation.js        # Input validation functions
├── .env                     # Environment variables (not in git)
├── .gitignore
├── index.js                 # Application entry point
├── package.json
└── README.md
```

## HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid input or validation error
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error
- `501 Not Implemented`: Feature not yet implemented

## Security Best Practices

1. **Password Hashing**: All passwords are hashed with bcrypt (10+ salt rounds)
2. **JWT Tokens**: Tokens expire after 7 days
3. **Input Validation**: All inputs are validated before processing
4. **RLS Policies**: Database-level security with Row Level Security
5. **CORS**: Configured for cross-origin requests
6. **Environment Variables**: Sensitive data in environment variables
7. **Error Handling**: No sensitive information leaked in error messages

## Testing

### Test Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Protected Route
```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## License

ISC

## Support

For issues and questions, please open an issue in the GitHub repository.
