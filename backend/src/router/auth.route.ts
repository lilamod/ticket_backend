import { Router, Request, Response } from 'express';
import authMiddleware from "../middleware/auth.middleware";
import { addPassword, disableSuperAdmin, sendOTP, userDetails, verifyOTP } from "../controller/auth.controller";
const router: Router = Router();

router.post('/send-otp', sendOTP);

router.post('/verify-otp',  verifyOTP);

router.post('/enable', authMiddleware, addPassword)

router.post('/disable', authMiddleware, disableSuperAdmin);

router.post('/me', authMiddleware, userDetails);

export default router;
