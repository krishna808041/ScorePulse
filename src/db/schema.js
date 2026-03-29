import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    sport: {
      type: String,
      required: true,
    },
    homeTeam: {
      type: String,
      required: true,
    },
    awayTeam: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "finished"],
      default: "scheduled",
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    homeScore: {
      type: Number,
      default: 0,
    },
    awayScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);


const commentarySchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Match",
    required: true,
  },
  minute: Number,
  sequence: Number,
  period: String,
  eventType: String,
  actor: String,
  team: String,
  message: {
    type: String,
    required: true,
  },
  metadata: {
    type: Object, // equivalent of jsonb
  },
  tags: [String],
}, { timestamps: { createdAt: "createdAt", updatedAt: false } });

export const Commentary = mongoose.model("Commentary", commentarySchema);
export const Match = mongoose.model("Match", matchSchema);
