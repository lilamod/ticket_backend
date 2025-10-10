
import mongoose, { Document, Schema } from 'mongoose';
import { Types } from 'mongoose'
import { TicketStatus } from '../enum/enum';

interface Ticket extends Document {
    project: Types.ObjectId;
    description: string;
    status: TicketStatus;
    createdBy?: string;
    updatedBy?: string;
}

const ticketSchema: Schema<Ticket> = new Schema(
    {
        project: {
          type: Schema.Types.ObjectId,
          ref: 'Project',
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: Object.values(TicketStatus), 
          default: TicketStatus.TODO,
          required: true,
        },
        createdBy: {
          type: String,
        },
        updatedBy: {
          type: String,
        },
      },
      {
        timestamps: true,
      }
    );

export default mongoose.model<Ticket>('Ticket', ticketSchema);
