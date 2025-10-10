import { Router } from 'express';
import {createTicket, /**listTicket, updateTicket*/} from "../controller/ticket.controller";
import authMiddleware from '../middleware/auth.middleware';

const router: Router = Router();
router.use(authMiddleware);
router.post('/create', createTicket);

// router.get('/list',  listTicket)

// router.put("/update/:id", updateTicket);
export default router;