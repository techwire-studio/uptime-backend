import { getAllIncidents, getIncidentById } from '@/controllers/incident';
import express from 'express';

const router = express.Router();

router.get('/', getAllIncidents);
router.get('/:id', getIncidentById);

export default router;
