import { Router } from 'express';
import {createProject, listProject} from "../controller/project.controller";
import authMiddleware from '../middleware/auth.middleware';

const router: Router = Router();

router.post('/create',authMiddleware, createProject);

router.get('/list', authMiddleware, listProject)


export default router;
