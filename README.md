# 🚀 Agent Management Backend

A fully functional **Node.js + Express.js** backend service for managing **agents, lists, and distributions** with robust **authentication, authorization, and file handling**.  
Designed to be **scalable, secure, and easy to extend** for real-world applications.

---

## 📌 Features

### 🔑 Authentication & Authorization
- ✅ JWT-based authentication (`jsonwebtoken`)
- ✅ Role-based access control (`requireAdmin` middleware)
- ✅ Secure password hashing using `bcryptjs`

### 👥 Agent Management
- Create, update, delete agents
- Get agent stats and detailed profiles

### 🗂️ List Management
- Upload **CSV/Excel** files using `multer`
- Distribute records across agents
- Track item status updates
- Dashboard analytics for uploads

### 📂 File Uploads & Parsing
- CSV parsing with `papaparse`
- Excel parsing with `xlsx`
- File storage served via `/uploads`

### 🛢️ Database
- MongoDB with `mongoose`
- Centralized database connection utility

### ⚠️ Error Handling
- Centralized error middleware with proper status codes
- Handles **validation** and **cast errors** gracefully

### 🧑‍💻 Developer Experience
- Hot reload with `nodemon`
- `.env` support with `dotenv`
- CORS enabled for frontend integration

---

## 🛠️ Tech Stack

- **Runtime:** Node.js (v22+)  
- **Framework:** Express.js (v5.1.0)  
- **Database:** MongoDB (via Mongoose ORM)  
- **Authentication:** JWT + bcrypt  
- **File Uploads:** Multer, Papaparse, XLSX  
- **Other:** UUID, Dotenv, CORS  

---

## 📂 Project Structure
```
backend/
│── config/
│ ├── database.js # MongoDB connection
│ ├── multer.js # Multer setup for file uploads
│
│── controllers/ # Route controllers (business logic)
│── middleware/ # Authentication & authorization middleware
│── routes/ # API route definitions
│── uploads/ # Uploaded CSV/Excel files
│── server.js # Application entry point
│── package.json
│── .env.example
```


---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository
```bash
git clone https://github.com/Mukeshpandey0286/agent-management-backend.git
cd agent-management-backend/backend
```
### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Configure Environment Variables
Create a .env file in the backend root:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/agentManagement
JWT_SECRET=your_jwt_secret_key
```

### 4️⃣ Run the server
```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

## 🔑 API Endpoints

### 🔐 Auth Routes (/api/auth)

1. POST /login → Admin login

2. POST /logout → Logout

3. GET /profile → Get logged-in admin profile

4. GET /verify → Verify token

5. POST /create-admin → Create first admin

### 👥 Agent Routes (/api/agents)

1. GET / → Get all agents (with search, pagination)

2. GET /stats → Get agent statistics

3. GET /:id → Get agent details

4. POST / → Create agent

5. PUT /:id → Update agent

6. DELETE /:id → Delete agent

### 📂 List Routes (/api/lists)

1. POST /upload → Upload & distribute CSV/Excel

2. GET /dashboard-stats → Get dashboard analytics

3. GET /agent/:agentId → Get agent-specific lists

4. GET /upload/:uploadId → Get distributions from an upload

5. GET /:listId → Get a specific list

6. PUT /:listId/items/:itemId → Update item status

8. DELETE /:listId → Delete a list

### 📊 Health Check

The API provides a health check route:
```
GET /api/health
```
### Example Response:
```
{
  "success": true,
  "message": "Agent Management API is running",
  "timestamp": "2025-08-23T06:45:32.910Z"
}
```

## 🧪 Error Handling
```
Validation Errors (400): Missing/invalid fields

Cast Errors (400): Invalid MongoDB ObjectId

Auth Errors (401/403): Unauthorized or forbidden access

Not Found (404): Invalid route

Server Errors (500): Internal issues

```

## 🚀 Future Improvements

1. Add Docker support for easy deployment
2. Implement request validation with Joi or Zod
3. Add rate-limiting & Helmet for security hardening
4. Introduce testing with Jest & Supertest
5. CI/CD pipeline setup with GitHub Actions
   
## 🤝 Contributing

Pull requests are welcome!
For significant changes, please open an issue first to discuss your ideas.

##### ✨ With this backend, you get a secure, production-ready API foundation for any agent/list management system.
Perfect as a starting point for enterprise dashboards, CRMs, or resource distribution platforms.


 
