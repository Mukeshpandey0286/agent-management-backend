import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const agentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Agent name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
      match: [
        /^\+[1-9]\d{1,14}$/,
        "Please enter a valid mobile number with country code (e.g., +1234567890)",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedListsCount: {
      type: Number,
      default: 0,
    },
    totalItemsAssigned: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
agentSchema.index({ email: 1 });
agentSchema.index({ mobile: 1 });
agentSchema.index({ isActive: 1 });
agentSchema.index({ createdAt: -1 });

// Hash password before saving
agentSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
agentSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Instance method to increment assigned lists count
agentSchema.methods.incrementAssignedCount = function (itemsCount = 0) {
  this.assignedListsCount += 1;
  this.totalItemsAssigned += itemsCount;
  return this.save();
};

// Transform output (remove password from JSON responses)
agentSchema.methods.toJSON = function () {
  const agentObject = this.toObject();
  delete agentObject.password;
  return agentObject;
};

// Static method to find agent by email
agentSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active agents
agentSchema.statics.findActiveAgents = function () {
  return this.find({ isActive: true }).sort({ createdAt: 1 });
};

// Static method to get agent statistics
agentSchema.statics.getAgentStats = async function () {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: null,
          totalAgents: { $sum: 1 },
          activeAgents: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
          totalAssignedItems: { $sum: "$totalItemsAssigned" },
        },
      },
    ]);

    return (
      stats[0] || {
        totalAgents: 0,
        activeAgents: 0,
        totalAssignedItems: 0,
      }
    );
  } catch (error) {
    throw error;
  }
};

// Validation for unique email
agentSchema.pre("validate", async function (next) {
  if (this.isNew || this.isModified("email")) {
    try {
      const existingAgent = await this.constructor.findOne({
        email: this.email,
        _id: { $ne: this._id },
      });

      if (existingAgent) {
        const error = new Error("Agent with this email already exists");
        error.name = "ValidationError";
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const Agent = mongoose.model("Agent", agentSchema);

export default Agent;
