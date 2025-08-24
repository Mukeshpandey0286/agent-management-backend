🚀 Agent Management Backend

A fully functional Node.js + Express.js backend service for managing agents, lists, and distributions with robust authentication, authorization, and file handling.
Designed to be scalable, secure, and easy to extend for real-world applications.

📌 Features

Authentication & Authorization

JWT-based authentication (jsonwebtoken)

Role-based access control (requireAdmin middleware)

Secure password hashing using bcryptjs

Agent Management

Create, update, delete agents

Get agent stats and detailed profiles

List Management

Upload CSV/Excel files using multer

Distribute records across agents

Track item status updates

Dashboard analytics for uploads

File Uploads & Parsing

CSV parsing with papaparse

Excel parsing with xlsx

File storage served via /uploads

Database

MongoDB with mongoose

Centralized database connection utility

Error Handling

Centralized error middleware with proper status codes

Handles validation and cast errors gracefully

Developer Experience

.env support with dotenv

CORS enabled for frontend integration

🛠️ Tech Stack

Runtime: Node.js (v22+)

Framework: Express.js (v5.1.0)

Database: MongoDB (via Mongoose ORM)

Authentication: JWT + bcrypt

File Uploads: Multer, Papaparse, XLSX

Other: UUID, Dotenv, CORS

📂 Project Structure
backend/
│── config/
│   ├── database.js       # MongoDB connection
│   ├── multer.js         # Multer setup for file uploads
│
│── controllers/          # Route controllers (business logic)
│── middleware/           # Authentication & authorization middleware
│── routes/               # API route definitions
│── uploads/              # Uploaded CSV/Excel files
│── server.js             # Application entry point
│── package.json
│── .env

⚙️ Installation & Setup
1️⃣ Clone the repository
git clone https://github.com/Mukeshpandey0286/agent-management-backend.git
cd agent-management-backend/backend

2️⃣ Install dependencies
npm install

3️⃣ Configure Environment Variables

Create a .env file in the backend root and add:

PORT=5000
MONGO_URI=mongodb://localhost:27017/example
JWT_SECRET=your_jwt_secret_key

4️⃣ Run the server
# Development (with hot reload)
npm run dev

# Production
npm start

🔑 API Endpoints
Auth Routes (/api/auth)

POST /login → Admin login

POST /logout → Logout

GET /profile → Get logged-in admin profile

GET /verify → Verify token

POST /create-admin → Create first admin

Agent Routes (/api/agents)

GET / → Get all agents (with search, pagination)

GET /stats → Get agent statistics

GET /:id → Get agent details

POST / → Create agent

PUT /:id → Update agent

DELETE /:id → Delete agent

List Routes (/api/lists)

POST /upload → Upload & distribute CSV/Excel

GET /dashboard-stats → Get dashboard analytics

GET /agent/:agentId → Get agent-specific lists

GET /upload/:uploadId → Get distributions from an upload

GET /:listId → Get a specific list

PUT /:listId/items/:itemId → Update item status

DELETE /:listId → Delete a list

📊 Health Check

API is equipped with a health check endpoint:

GET /api/health


Example Response:

{
  "success": true,
  "message": "Agent Management API is running",
  "timestamp": "2025-08-23T06:45:32.910Z"
}

🧪 Error Handling

Validation Errors (400): Missing/invalid fields

Cast Errors (400): Invalid MongoDB ObjectId

Auth Errors (401/403): Unauthorized or forbidden access

Not Found (404): Invalid route

Server Errors (500): Internal issues

📌 Interviewer Highlights

Scalable Architecture: Follows modular MVC structure with separation of concerns.

Security Best Practices: JWT-based auth, password hashing, role-based middleware.

Production Ready: Error handling, file upload support, health checks.

Developer Friendly: Hot reload, .env support, clear project structure.

Extendable: Easy to add new routes, models, or services without refactoring core logic.

🚀 Future Improvements

Add Docker support for easy deployment

Implement request validation with Joi or Zod

Add rate-limiting & helmet for security hardening

Introduce unit/integration testing with Jest/Supertest

CI/CD pipeline setup with GitHub Actions

🤝 Contributing

Pull requests are welcome! For significant changes, please open an issue first to discuss what you would like to change.

✨ With this backend, you get a secure, production-ready API foundation for any agent/list management system. Perfect as a starting point for enterprise dashboards, CRMs, or resource distribution platforms.
