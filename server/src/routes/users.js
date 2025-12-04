import express from 'express';

const router = express.Router();

// Basic user routes placeholder
router.get('/', (req, res) => {
  res.json({ message: 'User routes are working!' });
});

export default router;
