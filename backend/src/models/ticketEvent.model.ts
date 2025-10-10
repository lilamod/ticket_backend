
import mongoose, { Document, Schema } from 'mongoose';

export interface ITicketEvent extends Document {
  type: 'create' | 'update' | 'delete';
  ticketId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  performedBy: mongoose.Types.ObjectId;  
  details: any;  
  timestamp: Date;
  sentTo: mongoose.Types.ObjectId[]; 
}

const ticketEventSchema: Schema<ITicketEvent> = new Schema({
  type: { 
    type: String, 
    enum: ['create', 'update', 'delete'], 
    required: true 
  },
  ticketId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Ticket', 
    required: true 
  },
  projectId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true 
  },
  performedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  details: {  
    type: Schema.Types.Mixed, 
    default: {} 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  sentTo: [{  
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
});

export default mongoose.model<ITicketEvent>('TicketEvent', ticketEventSchema);