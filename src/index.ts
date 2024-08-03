import express from 'express';
import path from 'path';
import { cleanHtml } from './htmlCleaner';
import { logger } from './logger';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

app.post('/api/clean', async (req, res) => {
  try {
    const { url, html } = req.body;
    logger.info(`clean api. url: ${url}`);
    const cleanedContent = await cleanHtml(url, html);
    res.json(cleanedContent);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Error processing the input' });
  }
});

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});