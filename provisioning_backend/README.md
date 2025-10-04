# Mayday Website Backend

A robust Node.js backend API with authentication, built using Express.js, MongoDB, and JWT tokens. This backend follows the MVC (Model-View-Controller) architectural pattern and provides secure authentication with protected routes.

## 🚀 Features

- **Authentication System**: Register, login, logout with JWT tokens
- **Protected Routes**: Secure endpoints requiring authentication
- **Role-Based Access Control**: Admin and user roles with different permissions
- **MongoDB Integration**: Secure data storage with Mongoose
- **Input Validation**: Server-side validation using express-validator
- **Security Middleware**: Helmet, CORS, and secure cookie handling
- **Password Hashing**: Bcrypt for secure password storage
- **Error Handling**: Comprehensive error handling and logging

## 📁 Project Structure

```
backend/
├── controllers/          # Route controllers (business logic)
│   └── authController.js # Authentication controller
├── middleware/           # Custom middleware
│   ├── auth.js          # Authentication middleware
│   └── validation.js    # Input validation rules
├── models/              # Database models
│   └── User.js          # User model
├── routes/              # Route definitions
│   ├── authRoutes.js    # Authentication routes
│   └── protectedRoutes.js # Protected route examples
├── config/              # Configuration files
│   └── database.js      # MongoDB connection
├── utils/               # Utility functions
├── app.js               # Express app setup
├── server.js            # Server entry point
├── package.json         # Dependencies and scripts
└── .gitignore           # Git ignore rules
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### 1. Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/mayday_website
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/mayday_website

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# Cookie Configuration
COOKIE_SECRET=your-cookie-secret-here
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Start the Server

```bash
# Development mode (with auto-restart)
npm run server

# Production mode
npm start
```

## 📚 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint    | Description         | Access  |
| ------ | ----------- | ------------------- | ------- |
| POST   | `/register` | Register new user   | Public  |
| POST   | `/login`    | Login user          | Public  |
| POST   | `/logout`   | Logout user         | Private |
| GET    | `/me`       | Get current user    | Private |
| PUT    | `/profile`  | Update user profile | Private |

### Protected Routes (`/api/protected`)

| Method | Endpoint       | Description     | Access     |
| ------ | -------------- | --------------- | ---------- |
| GET    | `/dashboard`   | User dashboard  | Private    |
| GET    | `/settings`    | User settings   | Private    |
| GET    | `/admin`       | Admin panel     | Admin only |
| GET    | `/admin/users` | User management | Admin only |

### Health Check

| Method | Endpoint      | Description      | Access |
| ------ | ------------- | ---------------- | ------ |
| GET    | `/api/health` | API health check | Public |

## 🔒 Authentication Flow

### 1. Register User

```javascript
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### 2. Login User

```javascript
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### 3. Access Protected Routes

Include JWT token in request headers:

```javascript
Authorization: Bearer <your-jwt-token>
```

Or the token will be automatically sent via httpOnly cookies.

## 🛡️ Security Features

- **JWT Tokens**: Secure authentication with JSON Web Tokens
- **Password Hashing**: Bcrypt with salt rounds for secure password storage
- **HTTP-Only Cookies**: Secure token storage in cookies
- **CORS Protection**: Configured for frontend domain
- **Helmet**: Security headers middleware
- **Input Validation**: Server-side validation for all inputs
- **Role-Based Access**: Different access levels for users and admins

## 🧪 Testing the API

You can test the API using tools like:

- **Postman**: Import the endpoints and test
- **Thunder Client**: VS Code extension for API testing
- **curl**: Command line testing

Example curl command:

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"SecurePass123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123"}'
```

## 📝 Environment Variables

| Variable        | Description               | Default               |
| --------------- | ------------------------- | --------------------- |
| `NODE_ENV`      | Environment mode          | development           |
| `PORT`          | Server port               | 5000                  |
| `FRONTEND_URL`  | Frontend URL for CORS     | http://localhost:3000 |
| `MONGODB_URI`   | MongoDB connection string | Required              |
| `JWT_SECRET`    | JWT signing secret        | Required              |
| `JWT_EXPIRE`    | JWT expiration time       | 7d                    |
| `COOKIE_SECRET` | Cookie signing secret     | Required              |

## 🚀 Deployment

### Local MongoDB

1. Install MongoDB locally
2. Start MongoDB service
3. Update `MONGODB_URI` in `.env`

### MongoDB Atlas (Cloud)

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get connection string
4. Update `MONGODB_URI` with Atlas connection string

## 🔧 Development

### Adding New Protected Routes

1. Create controller in `controllers/`
2. Add routes in `routes/`
3. Apply `protect` middleware
4. Optionally add role-based authorization

Example:

```javascript
const { protect, authorize } = require("../middleware/auth");

router.get("/admin-only", protect, authorize("admin"), controller);
```

### Adding New Models

1. Create model in `models/`
2. Define schema with Mongoose
3. Add validation and middleware
4. Export the model

## 📱 Frontend Integration

This backend is designed to work with your React frontend. Key integration points:

1. **CORS**: Configured for `http://localhost:3000`
2. **Cookies**: JWT tokens stored in httpOnly cookies
3. **Error Handling**: Consistent error response format
4. **Validation**: Client-side validation should match server-side rules

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**

   - Check if MongoDB is running
   - Verify connection string
   - Check network connectivity for Atlas

2. **JWT Token Issues**

   - Ensure JWT_SECRET is set
   - Check token expiration
   - Verify token format

3. **CORS Errors**
   - Check FRONTEND_URL in .env
   - Verify credentials: true in requests

## 📄 License

This project is licensed under the ISC License.

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Happy Coding! 🚀**
