import User from '../models/User.js';
import Anime from '../models/Anime.js';
import Episode from '../models/Episode.js';
import ScrapeJob from '../models/ScrapeJob.js';
import logger from '../utils/logger.js';

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    logger.error(`Get users error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, req.body, { new: true }).select('-password');
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error(`Update user error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error(`Delete user error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

export const getSystemStats = async (req, res) => {
  try {
    const [animeCount, episodeCount, userCount, jobs] = await Promise.all([
      Anime.countDocuments(),
      Episode.countDocuments(),
      User.countDocuments(),
      ScrapeJob.find().sort({ createdAt: -1 }).limit(10)
    ]);
    
    res.json({
      success: true,
      stats: {
        anime: animeCount,
        episodes: episodeCount,
        users: userCount,
        storage: '2.5GB',
        lastJobs: jobs
      }
    });
  } catch (error) {
    logger.error(`System stats error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to get system stats' });
  }
 
