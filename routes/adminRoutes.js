import express from 'express';
import {
  getUsers,
  updateUser,
  deleteUser,
  getSystemStats
} from '../controllers/adminController.js';
import { adminAuth } from '../middlewares/authMiddleware.js';
import { validateAdminToken } from '../middlewares/adminMiddleware.js';
import { adminRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply admin auth and rate limiting
router.use(validateAdminToken);
router.use(adminAuth);
router.use(adminRateLimiter);

// User management
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// System management
router.get('/stats', getSystemStats);

export default router;
 
