import List from "../models/list.js";
import Agent from "../models/agent.js";
import Papa from "papaparse";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload and distribute CSV/Excel file
 */
export const uploadAndDistribute = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const file = req.file;
    const filePath = file.path;
    const fileExtension = path.extname(file.originalname).toLowerCase();

    let data = [];

    try {
      // Parse file based on extension
      if (fileExtension === ".csv") {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const parseResult = Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase(),
        });

        if (parseResult.errors.length > 0) {
          throw new Error(
            "CSV parsing failed: " + parseResult.errors[0].message
          );
        }

        data = parseResult.data;
      } else if (fileExtension === ".xlsx" || fileExtension === ".xls") {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          throw new Error(
            "Excel file must contain at least header and one data row"
          );
        }

        // Convert to objects with lowercase headers
        const headers = jsonData[0].map((h) => String(h).trim().toLowerCase());
        data = jsonData
          .slice(1)
          .map((row) => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || "";
            });
            return obj;
          })
          .filter((row) =>
            Object.values(row).some((val) => val.toString().trim())
          );
      }

      // Validate data format
      const requiredFields = ["firstname", "phone", "notes"];
      const missingFields = requiredFields.filter((field) => {
        return !data[0] || !data[0].hasOwnProperty(field);
      });

      if (missingFields.length > 0) {
        throw new Error(
          `Missing required columns: ${missingFields.join(
            ", "
          )}. Expected: FirstName, Phone, Notes`
        );
      }

      // Validate and clean data
      const validatedData = [];
      const errors = [];

      data.forEach((row, index) => {
        const rowNumber = index + 2; // +2 because of 0-based index and header row

        if (!row.firstname || !row.firstname.toString().trim()) {
          errors.push(`Row ${rowNumber}: FirstName is required`);
          return;
        }

        if (!row.phone || !row.phone.toString().trim()) {
          errors.push(`Row ${rowNumber}: Phone is required`);
          return;
        }

        // Clean and validate phone number
        const phone = row.phone.toString().trim();
        if (!/^[+]?[\d\s()-]+$/.test(phone)) {
          errors.push(`Row ${rowNumber}: Invalid phone number format`);
          return;
        }

        validatedData.push({
          firstName: row.firstname.toString().trim(),
          phone: phone,
          notes: (row.notes || "").toString().trim(),
        });
      });

      if (errors.length > 0) {
        throw new Error("Data validation failed:\n" + errors.join("\n"));
      }

      if (validatedData.length === 0) {
        throw new Error("No valid data rows found in the file");
      }

      // Get active agents for distribution
      const agents = await Agent.findActiveAgents();

      if (agents.length === 0) {
        throw new Error("No active agents available for distribution");
      }

      // Generate unique upload ID
      const uploadId = uuidv4();

      // Prepare upload data
      const uploadData = {
        uploadId,
        fileName: file.filename,
        originalFileName: file.originalname,
        uploadedBy: req.user._id,
      };

      // Distribute items among agents
      const distributions = await List.distributeItems(
        validatedData,
        agents,
        uploadData
      );

      // Get distribution summary
      const summary = distributions.map((dist) => ({
        agent: {
          id: dist.agentId,
          name: agents.find((a) => a._id.equals(dist.agentId)).name,
          email: agents.find((a) => a._id.equals(dist.agentId)).email,
        },
        itemsCount: dist.totalItems,
      }));

      res.json({
        success: true,
        message: "File uploaded and distributed successfully",
        data: {
          uploadId,
          totalItems: validatedData.length,
          totalAgents: agents.length,
          distributions: summary,
        },
      });
    } finally {
      // Clean up uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error("File cleanup error:", cleanupError);
      }
    }
  } catch (error) {
    console.error("Upload and distribute error:", error);

    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error("File cleanup error:", cleanupError);
      }
    }

    res.status(400).json({
      success: false,
      message: error.message || "Failed to process file",
    });
  }
};

/**
 * Get all distributions with proper aggregation from Lists collection
 */
export const getAllDistributions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build match filter
    let matchFilter = {};
    if (status && status !== "all") {
      // Add status filter logic based on completion
      if (status === "completed") {
        matchFilter.$expr = { $eq: ["$completedItems", "$totalItems"] };
      } else if (status === "in_progress") {
        matchFilter.$expr = {
          $and: [
            { $gt: ["$completedItems", 0] },
            { $lt: ["$completedItems", "$totalItems"] },
          ],
        };
      } else if (status === "pending") {
        matchFilter.completedItems = 0;
      }
    }

    // Get all distributions grouped by uploadId
    const distributionsAggregation = [
      { $match: matchFilter },
      {
        $lookup: {
          from: "agents",
          localField: "agentId",
          foreignField: "_id",
          as: "agent",
        },
      },
      {
        $group: {
          _id: "$uploadId",
          fileName: { $first: "$fileName" },
          originalName: { $first: "$originalFileName" },
          uploadDate: { $first: "$createdAt" },
          totalItems: { $sum: "$totalItems" },
          completedItems: { $sum: "$completedItems" },
          inProgressItems: { $sum: "$inProgressItems" },
          pendingItems: { $sum: "$pendingItems" },
          assignedAgents: { $addToSet: "$agentId" },
          uploadedBy: { $first: "$uploadedBy" },
          fileSize: { $first: "$fileSize" },
          lists: { $push: "$$ROOT" },
        },
      },
      {
        $addFields: {
          assignedAgents: { $size: "$assignedAgents" },
          status: {
            $cond: {
              if: { $eq: ["$completedItems", "$totalItems"] },
              then: "completed",
              else: {
                $cond: {
                  if: { $gt: ["$completedItems", 0] },
                  then: "in_progress",
                  else: "pending",
                },
              },
            },
          },
        },
      },
      { $sort: { uploadDate: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const distributions = await List.aggregate(distributionsAggregation);

    // Get total count for pagination
    const countAggregation = [
      { $match: matchFilter },
      { $group: { _id: "$uploadId" } },
      { $count: "total" },
    ];

    const totalResult = await List.aggregate(countAggregation);
    const total = totalResult[0]?.total || 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    // Transform data to match expected frontend format
    const transformedDistributions = distributions.map((dist) => ({
      _id: dist._id,
      fileName: dist.fileName,
      originalName: dist.originalName,
      uploadDate: dist.uploadDate,
      createdAt: dist.uploadDate,
      totalItems: dist.totalItems,
      completedItems: dist.completedItems,
      inProgressItems: dist.inProgressItems,
      pendingItems: dist.pendingItems,
      assignedAgents: dist.assignedAgents,
      status: dist.status,
      uploadedBy: dist.uploadedBy,
      fileSize: dist.fileSize,
      lists: dist.lists,
    }));

    res.json({
      success: true,
      data: transformedDistributions,
      pagination: {
        current: parseInt(page),
        pages: totalPages,
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get all distributions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch distributions",
      error: error.message,
    });
  }
};

/**
 * Get lists for a specific agent
 */
export const getAgentLists = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required",
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get lists for agent with populated agent info
    const lists = await List.find({ agentId })
      .populate("agentId", "name email mobile")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await List.countDocuments({ agentId });

    // Calculate stats for the agent
    const stats = await List.aggregate([
      { $match: { agentId: List.schema.obj.agentId.cast(agentId) } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: "$totalItems" },
          completedItems: { $sum: "$completedItems" },
          inProgressItems: { $sum: "$inProgressItems" },
          pendingItems: { $sum: "$pendingItems" },
          totalLists: { $sum: 1 },
        },
      },
    ]);

    const agentStats = stats[0] || {
      totalItems: 0,
      completedItems: 0,
      inProgressItems: 0,
      pendingItems: 0,
      totalLists: 0,
    };

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: {
        lists,
        stats: agentStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get agent lists error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agent lists",
    });
  }
};

/**
 * Get all distributions for an upload
 */
export const getDistributions = async (req, res) => {
  try {
    const { uploadId } = req.params;

    if (!uploadId) {
      return res.status(400).json({
        success: false,
        message: "Upload ID is required",
      });
    }

    // Get all lists for this upload
    const distributions = await List.find({ uploadId }).populate(
      "agentId",
      "name email"
    );

    if (distributions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No distributions found for this upload",
      });
    }

    // Get distribution statistics
    const stats = await List.aggregate([
      { $match: { uploadId } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: "$totalItems" },
          completedItems: { $sum: "$completedItems" },
          inProgressItems: { $sum: "$inProgressItems" },
          pendingItems: { $sum: "$pendingItems" },
          totalLists: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        distributions,
        stats: stats[0] || {
          totalItems: 0,
          completedItems: 0,
          inProgressItems: 0,
          pendingItems: 0,
          totalLists: 0,
        },
      },
    });
  } catch (error) {
    console.error("Get distributions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch distributions",
    });
  }
};

/**
 * Update item status in a list
 */
export const updateItemStatus = async (req, res) => {
  try {
    const { listId, itemId } = req.params;
    const { status, notes } = req.body;

    if (!listId || !itemId) {
      return res.status(400).json({
        success: false,
        message: "List ID and Item ID are required",
      });
    }

    const validStatuses = ["pending", "contacted", "completed", "failed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    // Find and update the list
    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    // Update item status
    const additionalData = {};
    if (notes) additionalData.notes = notes;

    await list.updateItemStatus(itemId, status, additionalData);

    res.json({
      success: true,
      message: "Item status updated successfully",
      data: {
        listId: list._id,
        itemId,
        status,
        completionPercentage: list.getCompletionPercentage(),
      },
    });
  } catch (error) {
    console.error("Update item status error:", error);

    if (error.message === "Item not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update item status",
    });
  }
};

/**
 * Get list by ID with all items
 */
export const getList = async (req, res) => {
  try {
    const { listId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    if (!listId) {
      return res.status(400).json({
        success: false,
        message: "List ID is required",
      });
    }

    const list = await List.findById(listId).populate("agentId", "name email");

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    // Filter items by status if provided
    let filteredItems = list.items;
    if (status) {
      filteredItems = list.items.filter((item) => item.status === status);
    }

    // Paginate items
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedItems = filteredItems.slice(skip, skip + parseInt(limit));
    const totalItems = filteredItems.length;
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    res.json({
      success: true,
      data: {
        list: {
          ...list.toObject(),
          items: paginatedItems,
          completionPercentage: list.getCompletionPercentage(),
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get list error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch list",
    });
  }
};

/**
 * Delete a distribution/list
 */
export const deleteList = async (req, res) => {
  try {
    const { listId } = req.params;

    if (!listId) {
      return res.status(400).json({
        success: false,
        message: "List ID is required",
      });
    }

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    // Update agent's assigned count
    const agent = await Agent.findById(list.agentId);
    if (agent) {
      agent.assignedListsCount = Math.max(0, agent.assignedListsCount - 1);
      agent.totalItemsAssigned = Math.max(
        0,
        agent.totalItemsAssigned - list.totalItems
      );
      await agent.save();
    }

    await List.findByIdAndDelete(listId);

    res.json({
      success: true,
      message: "List deleted successfully",
    });
  } catch (error) {
    console.error("Delete list error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete list",
    });
  }
};

/**
 * Get dashboard statistics
 */

export const getDashboardStats = async (req, res) => {
  try {
    // Get overall statistics
    const stats = await List.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: "$totalItems" },
          completedItems: { $sum: "$completedItems" },
          inProgressItems: { $sum: "$inProgressItems" },
          pendingItems: { $sum: "$pendingItems" },
          totalLists: { $sum: 1 },
          activeDistributions: { $addToSet: "$uploadId" },
        },
      },
      {
        $addFields: {
          activeDistributions: { $size: "$activeDistributions" },
        },
      },
    ]);

    // Get recent upload info
    const recentUpload = await List.findOne()
      .sort({ createdAt: -1 })
      .select("createdAt");

    const dashboardStats = {
      totalItems: stats[0]?.totalItems || 0,
      completedItems: stats[0]?.completedItems || 0,
      inProgressItems: stats[0]?.inProgressItems || 0,
      pendingItems: stats[0]?.pendingItems || 0,
      totalLists: stats[0]?.totalLists || 0,
      activeDistributions: stats[0]?.activeDistributions || 0,
      lastUpload: recentUpload?.createdAt || null,
      completionRate:
        stats[0]?.totalItems > 0
          ? Math.round((stats[0].completedItems / stats[0].totalItems) * 100)
          : 0,
    };

    res.json({
      success: true,
      data: dashboardStats,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
};
