import { Response, Request } from 'express';
import Ticket from '../models/ticket.model';
import TicketEvent from '../models/ticketEvent.model';
import User from '../models/user.model';  
interface TicketRequest extends Request {
  user?: {userId: string; email: string  };
  io?: any;  
}

const transformTicket = (ticket: any) => ({
  id: ticket._id.toString(),
  projectId: ticket.project.toString(),
  description: ticket.description,
  status: ticket.status,
  createdBy: ticket.createdBy ? ticket.createdBy : undefined,  
  updatedBy: ticket.updatedBy ? ticket.updatedBy : undefined,
  createdAt: ticket.createdAt ? new Date(ticket.createdAt).getTime() : undefined,
  updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt).getTime() : undefined,
  user: ticket.user
});

export const createTicket = async (req: TicketRequest, res: Response) => { 
  console.log('Creating ticket for project:', req.body);

  try {
    const { projectId, description, status = 'todo' } = req.body;
    const user = req.user;  
    const userId = user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!projectId || !description) {
      return res.status(400).json({ error: 'projectId and description are required' });
    }

    const newTicket = await Ticket.create({ 
      project: projectId,  
      description,
      status,
      createdBy: userId,
      updatedBy: userId ,
      user: userId
    });

    const event = await TicketEvent.create({
      type: 'create',
      ticketId: newTicket._id,
      projectId,
      performedBy: userId,
      details: { description, status }
    });

    const io = req.io;
    if (io) {
      io.to(`project-${projectId}`).emit('ticketCreated', {
        eventId: event.id.toString(),
        ticket: transformTicket(newTicket),
        user: user?.email,  
        message: `New ticket "${description}" created by ${user?.email || 'Unknown'}`
      });
    }

    await User.findByIdAndUpdate(userId, { logging: new Date() });

    res.status(201).json({ data: transformTicket(newTicket) });
  } catch (error: any) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};

export const listTicket = async (req: TicketRequest, res: Response) => {
  try {
    const { projectId } = req.query;

    const user = req.user;  
    const userId = user?.userId;
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const tickets = await Ticket.find({ project: projectId })
      .populate({path:'createdBy', select: 'email'})
      .populate({path: 'updatedBy', select: 'email'})
      .exec();  
      
    const count = await Ticket.countDocuments({ project: projectId });

    const transformedTickets = tickets.map(transformTicket);

    res.status(200).json({
      data: transformedTickets,
      count
    });
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateTicket = async (req: TicketRequest, res: Response) => {  
  const { id } = req.params;
  const updates = req.body;
  const user = req.user;  
  const userId = user?.userId;

  if (!id) {
    return res.status(400).json({ message: 'Ticket ID is required' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check project ownership (optional – assumes user can update project tickets)
    // if (ticket.project.toString() !== req.body.projectId) {  // If sending projectId in body
    //   return res.status(403).json({ message: 'Unauthorized' });
    // }

    // Save old details for event
    const oldStatus = ticket.status;
    const oldDescription = ticket.description;

    // Update
    Object.assign(ticket, { ...updates, updatedBy: userId });
    await ticket.save();

    // NEW: Save Event
    const event = await TicketEvent.create({
      type: 'update',
      ticketId: id,
      projectId: ticket.project,
      performedBy: userId,
      details: { 
        oldStatus, 
        newStatus: updates.status, 
        oldDescription, 
        newDescription: updates.description 
      }
    });

    // NEW: Emit Socket
    const io = req.io;
    if (io) {
      io.to(`project-${ticket.project}`).emit('ticketUpdated', {
        eventId: event.id.toString(),
        ticket: transformTicket(ticket),
        user: userId,  // FIXED: Typed and safe
        message: `Ticket "${ticket.description}" updated by ${user?.email || 'Unknown'} (Status: ${updates.status})`
      });
    }

    // Update user lastActivity
    await User.findByIdAndUpdate(userId, { logging: new Date() });

    res.json(transformTicket(ticket));
  } catch (error: any) {
    console.error('Update ticket error:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
};

export const deleteTicket = async (req: TicketRequest, res: Response) => {  // Extended type
  const { id } = req.params;
  const user = req.user;  // Typed
  const userId = user?.userId;

  if (!id) {
    return res.status(400).json({ message: 'Ticket ID is required' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check ownership (optional)
    // if (ticket.project.toString() !== req.body.projectId) {
    //   return res.status(403).json({ message: 'Unauthorized' });
    // }

    // Save Event
    const event = await TicketEvent.create({
      type: 'delete',
      ticketId: id,
      projectId: ticket.project,
      performedBy: userId,
      details: { description: ticket.description, status: ticket.status }
    });

    await Ticket.findByIdAndDelete(id);

    // Emit Socket
    const io = req.io;
    if (io) {
      io.to(`project-${ticket.project}`).emit('ticketDeleted', {
        eventId: event.id.toString(),
        ticketId: id,
        user: user?.email,  // FIXED: Typed and safe
        message: `Ticket "${ticket.description}" deleted by ${user?.email || 'Unknown'}`
      });
    }

    // Update user lastActivity
    await User.findByIdAndUpdate(userId, { logging: new Date() });

    res.json({ message: 'Ticket deleted' });
  } catch (error: any) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
};