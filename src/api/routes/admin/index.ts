import { Router } from 'express';
import overviewRoutes from './overview.routes';
import usersRoutes from './users.routes';

const router = Router();

router.use('/overview', overviewRoutes);
router.use('/users', usersRoutes);

export default router;
