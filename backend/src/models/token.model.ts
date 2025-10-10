import mongoose, { Schema, Document, Types } from 'mongoose';

export interface Token extends Document {
  token: string;
  expiresAt: Date;
  isDeleted: boolean;
  user: Types.ObjectId;
  createdAt: Date;
}

const BrokerTokenSchema: Schema<Token> = new Schema({
  token: {
    type: String,
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isDeleted: {
    type: Boolean,
    index: true,
    default: false,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<Token>('BrokerToken', BrokerTokenSchema);
