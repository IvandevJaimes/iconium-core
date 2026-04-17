import express from 'express';
import iconRoutes from './routes/iconRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api', iconRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;