import Agent from "../models/agent.js";
import mongoose from "mongoose";

/**
 * Get all agents
 */
export const getAgents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;

    // Build query
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [agents, totalCount] = await Promise.all([
      Agent.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("createdBy", "email"),
      Agent.countDocuments(query),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: {
        agents,
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
    console.error("Get agents error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agents",
    });
  }
};

/**
 * Get single agent by ID
 */
export const getAgent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid agent ID",
      });
    }

    const agent = await Agent.findById(id)
      .select("-password")
      .populate("createdBy", "email");

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    res.json({
      success: true,
      data: { agent },
    });
  } catch (error) {
    console.error("Get agent error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agent",
    });
  }
};

/**
 * Create new agent
 */
export const createAgent = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    // Validate required fields
    if (!name || !email || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields (name, email, mobile, password) are required",
      });
    }

    // Validate mobile number format (should include country code)
    const mobileRegex = /^\+[1-9]\d{1,14}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must include country code (e.g., +1234567890)",
      });
    }

    // Check for existing agent with same email
    const existingAgent = await Agent.findByEmail(email);
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: "Agent with this email already exists",
      });
    }

    // Check for existing agent with same mobile
    const existingMobile = await Agent.findOne({ mobile });
    if (existingMobile) {
      return res.status(400).json({
        success: false,
        message: "Agent with this mobile number already exists",
      });
    }

    // Create new agent
    const agentData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      password,
      createdBy: req.user._id,
    };

    const agent = new Agent(agentData);
    await agent.save();

    res.status(201).json({
      success: true,
      message: "Agent created successfully",
      data: {
        agent: {
          id: agent._id,
          name: agent.name,
          email: agent.email,
          mobile: agent.mobile,
          isActive: agent.isActive,
          createdAt: agent.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Create agent error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create agent",
    });
  }
};

/**
 * Update agent
 */
export const updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid agent ID",
      });
    }

    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    // Update fields if provided
    if (name !== undefined) agent.name = name.trim();
    if (email !== undefined) {
      const existingAgent = await Agent.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: id },
      });
      if (existingAgent) {
        return res.status(400).json({
          success: false,
          message: "Agent with this email already exists",
        });
      }
      agent.email = email.toLowerCase().trim();
    }
    if (mobile !== undefined) {
      const mobileRegex = /^\+[1-9]\d{1,14}$/;
      if (!mobileRegex.test(mobile)) {
        return res.status(400).json({
          success: false,
          message:
            "Mobile number must include country code (e.g., +1234567890)",
        });
      }

      const existingMobile = await Agent.findOne({
        mobile: mobile.trim(),
        _id: { $ne: id },
      });
      if (existingMobile) {
        return res.status(400).json({
          success: false,
          message: "Agent with this mobile number already exists",
        });
      }
      agent.mobile = mobile.trim();
    }
    if (isActive !== undefined) agent.isActive = isActive;

    await agent.save();

    res.json({
      success: true,
      message: "Agent updated successfully",
      data: {
        agent: {
          id: agent._id,
          name: agent.name,
          email: agent.email,
          mobile: agent.mobile,
          isActive: agent.isActive,
          assignedListsCount: agent.assignedListsCount,
          totalItemsAssigned: agent.totalItemsAssigned,
        },
      },
    });
  } catch (error) {
    console.error("Update agent error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update agent",
    });
  }
};

/**
 * Delete agent
 */
export const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid agent ID",
      });
    }

    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    // Check if agent has assigned lists
    if (agent.assignedListsCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete agent with assigned lists. Please reassign or remove lists first.",
      });
    }

    await Agent.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Agent deleted successfully",
    });
  } catch (error) {
    console.error("Delete agent error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete agent",
    });
  }
};

/**
 * Get agent statistics
 */
export const getAgentStats = async (req, res) => {
  try {
    const stats = await Agent.getAgentStats();

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error("Get agent stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agent statistics",
    });
  }
};
