import { Router } from 'express';
import { PublicProfileController } from '../controllers/publicProfileController';

const router = Router();

router.get('/students/:identifier', PublicProfileController.getStudentProfile);

export default router;
