import { getIncidentById } from '@/controllers/incident';
import { authenticationMiddleware } from '@/middlewares/auth';
import express from 'express';

const router = express.Router();

router.get('/:id', authenticationMiddleware, getIncidentById);

export default router;
