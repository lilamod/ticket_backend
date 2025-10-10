import { Router, Request, Response } from 'express';
import project from "./project.route";
import mailerRouter from "./auth.route";
import ticketRouter from "./ticket.route";

const router: Router = Router();

router.use("/auth", mailerRouter);
router.use("/project", project);
router.use("/ticket", ticketRouter);

export default router;