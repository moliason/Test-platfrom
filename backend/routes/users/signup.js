import express from 'express';
const router = express.Router();

export default function (_sequelize) {
  router.post('/signup', (_req, res) => {
    res.status(403).json({ error: 'Sign up is disabled' });
  });

  return router;
}
