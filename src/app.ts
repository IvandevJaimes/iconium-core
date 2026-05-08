import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import iconRoutes from './routes/iconRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---

app.use(cors());
app.use(morgan('short'));

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

// --- Routes ---

app.use('/api', iconRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// --- Error handler ---

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;