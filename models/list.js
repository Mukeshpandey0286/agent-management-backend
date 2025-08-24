import mongoose from "mongoose";

// Individual list item schema
const listItemSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [100, "First name cannot exceed 100 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^[+]?[\d\s()-]+$/, "Please enter a valid phone number"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "contacted", "completed", "failed"],
      default: "pending",
    },
    contactedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    _id: true,
  }
);

// Main list schema
const listSchema = new mongoose.Schema(
  {
    uploadId: {
      type: String,
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      required: true,
      index: true,
    },
    items: [listItemSchema],
    totalItems: {
      type: Number,
      default: 0,
    },
    completedItems: {
      type: Number,
      default: 0,
    },
    pendingItems: {
      type: Number,
      default: 0,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    distributedAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
listSchema.index({ uploadId: 1, agentId: 1 });
listSchema.index({ agentId: 1, distributedAt: -1 });
listSchema.index({ uploadedBy: 1 });

// Pre-save middleware to update item counts
listSchema.pre("save", function (next) {
  this.totalItems = this.items.length;
  this.completedItems = this.items.filter(
    (item) => item.status === "completed"
  ).length;
  this.pendingItems = this.items.filter(
    (item) => item.status === "pending"
  ).length;
  this.lastUpdated = new Date();
  next();
});

// Instance method to update item status
listSchema.methods.updateItemStatus = function (
  itemId,
  status,
  additionalData = {}
) {
  const item = this.items.id(itemId);
  if (!item) {
    throw new Error("Item not found");
  }

  item.status = status;

  // Update timestamps based on status
  if (status === "contacted" && !item.contactedAt) {
    item.contactedAt = new Date();
  } else if (status === "completed" && !item.completedAt) {
    item.completedAt = new Date();
  }

  // Apply any additional data
  Object.assign(item, additionalData);

  return this.save();
};

// Instance method to get completion percentage
listSchema.methods.getCompletionPercentage = function () {
  if (this.totalItems === 0) return 0;
  return Math.round((this.completedItems / this.totalItems) * 100);
};

// Static method to find lists by agent
listSchema.statics.findByAgent = function (agentId, options = {}) {
  const query = this.find({ agentId }).populate("agentId", "name email");

  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ distributedAt: -1 });
  }

  if (options.limit) {
    query.limit(options.limit);
  }

  return query;
};

// Static method to find lists by upload ID
listSchema.statics.findByUploadId = function (uploadId) {
  return this.find({ uploadId })
    .populate("agentId", "name email")
    .sort({ agentId: 1 });
};

// Static method to get distribution statistics
listSchema.statics.getDistributionStats = async function (uploadId) {
  try {
    const stats = await this.aggregate([
      { $match: { uploadId } },
      {
        $group: {
          _id: null,
          totalAgents: { $sum: 1 },
          totalItems: { $sum: "$totalItems" },
          totalCompleted: { $sum: "$completedItems" },
          totalPending: { $sum: "$pendingItems" },
          avgItemsPerAgent: { $avg: "$totalItems" },
        },
      },
    ]);

    return (
      stats[0] || {
        totalAgents: 0,
        totalItems: 0,
        totalCompleted: 0,
        totalPending: 0,
        avgItemsPerAgent: 0,
      }
    );
  } catch (error) {
    throw error;
  }
};

// Static method to distribute items among agents
listSchema.statics.distributeItems = async function (
  items,
  agents,
  uploadData
) {
  try {
    const distributions = [];
    const itemsPerAgent = Math.floor(items.length / agents.length);
    const remainder = items.length % agents.length;

    let currentIndex = 0;

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const itemCount = itemsPerAgent + (i < remainder ? 1 : 0);
      const agentItems = items.slice(currentIndex, currentIndex + itemCount);

      if (agentItems.length > 0) {
        const listData = {
          uploadId: uploadData.uploadId,
          fileName: uploadData.fileName,
          originalFileName: uploadData.originalFileName,
          agentId: agent._id,
          items: agentItems,
          uploadedBy: uploadData.uploadedBy,
        };

        const list = new this(listData);
        distributions.push(await list.save());

        // Update agent's assigned count
        await agent.incrementAssignedCount(agentItems.length);
      }

      currentIndex += itemCount;
    }

    return distributions;
  } catch (error) {
    throw error;
  }
};

const List = mongoose.model("List", listSchema);

export default List;
