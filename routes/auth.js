import express from "express";
import {
  login,
  getProfile,
  logout,
  verifyToken,
  createAdmin,
} from "../controllers/authController.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post("/login", login);

/**
 * @route   POST /api/auth/logout
 * @desc    Admin logout
 * @access  Private
 */
router.post("/logout", authenticateToken, logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/profile", authenticateToken, getProfile);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify JWT token
 * @access  Private
 */
router.get("/verify", authenticateToken, verifyToken);

/**
 * @route   POST /api/auth/create-admin
 * @desc    Create initial admin user (for setup only)
 * @access  Public (but only works if no admin exists)
 */
router.post("/create-admin", createAdmin);

export default router;
