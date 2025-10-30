import express from 'express';
import userRoutes from './routes/users.js';  // Must include .js in ES modules

const app = express();
app.use(express.json());

// Use the user routes
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
