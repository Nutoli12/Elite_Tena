import express from 'express';

const app = express();
const PORT = 3001;

app.get('/', (req, res) => {
  res.json({ message: 'Server is working!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`âœ… Test server running on http://localhost:${PORT}`);
  console.log('Press CTRL+C to stop');
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\ní»‘ Server stopped');
  process.exit(0);
});
