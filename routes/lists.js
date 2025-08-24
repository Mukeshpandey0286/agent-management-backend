import express from "express";
import {
  uploadAndDistribute,
  getAgentLists,
  getDistributions,
  updateItemStatus,
  getList,
  deleteList,
  getDashboardStats,
  getAllDistributions, // Add this new function
} from "../controllers/listController.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import upload, { handleMulterError } from "../config/multer.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * @route   POST /api/lists/upload
 * @desc    Upload CSV/Excel file and distribute among agents
 * @access  Private (Admin only)
 * @form    file (csv, xlsx, xls)
 */
router.post(
  "/upload",
  upload.single("file"),
  handleMulterError,
  uploadAndDistribute
);

/**
 * @route   GET /api/lists/dashboard-stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin only)
 */
router.get("/dashboard-stats", getDashboardStats);

/**
 * @route   GET /api/lists/distributions
 * @desc    Get all distributions/uploads with summary stats
 * @access  Private (Admin only)
 * @query   page, limit, status
 */
router.get("/distributions", getAllDistributions);

/**
 * @route   GET /api/lists/agent/:agentId
 * @desc    Get lists assigned to specific agent
 * @access  Private (Admin only)
 * @query   page, limit
 */
router.get("/agent/:agentId", getAgentLists);

/**
 * @route   GET /api/lists/upload/:uploadId
 * @desc    Get all distributions for a specific upload
 * @access  Private (Admin only)
 */
router.get("/upload/:uploadId", getDistributions);

/**
 * @route   GET /api/lists/:listId
 * @desc    Get single list with all items
 * @access  Private (Admin only)
 * @query   page, limit, status
 */
router.get("/:listId", getList);

/**
 * @route   PUT /api/lists/:listId/items/:itemId
 * @desc    Update item status in a list
 * @access  Private (Admin only)
 * @body    status, notes
 */
router.put("/:listId/items/:itemId", updateItemStatus);

/**
 * @route   DELETE /api/lists/:listId
 * @desc    Delete a list/distribution
 * @access  Private (Admin only)
 */
router.delete("/:listId", deleteList);

export default router;
