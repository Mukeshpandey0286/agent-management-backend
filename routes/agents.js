import express from "express";
import {
  getAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgentStats,
} from "../controllers/agentController.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * @route   GET /api/agents
 * @desc    Get all agents with pagination and search
 * @access  Private (Admin only)
 * @query   page, limit, search, isActive
 */
router.get("/", getAgents);

/**
 * @route   GET /api/agents/stats
 * @desc    Get agent statistics
 * @access  Private (Admin only)
 */
router.get("/stats", getAgentStats);

/**
 * @route   GET /api/agents/:id
 * @desc    Get single agent by ID
 * @access  Private (Admin only)
 */
router.get("/:id", getAgent);

/**
 * @route   POST /api/agents
 * @desc    Create new agent
 * @access  Private (Admin only)
 * @body    name, email, mobile, password
 */
router.post("/", createAgent);

/**
 * @route   PUT /api/agents/:id
 * @desc    Update agent
 * @access  Private (Admin only)
 * @body    name, email, mobile, isActive
 */
router.put("/:id", updateAgent);

/**
 * @route   DELETE /api/agents/:id
 * @desc    Delete agent
 * @access  Private (Admin only)
 */
router.delete("/:id", deleteAgent);

export default router;
