import { Router } from 'express';
import { getProvider } from '../llm/geminiProvider.js';

const router = Router();

router.post('/chat/send', async (req, res) => {
  try {
    const { sessionId, taskConfig, message } = req.body || {};
    if (!sessionId || !taskConfig || !message) {
      return res.status(400).json({ error: 'Missing sessionId, taskConfig or message' });
    }

    const provider = getProvider();
    const text = await provider.sendChatMessage({ sessionId, taskConfig, message });
    res.json({ text });
  } catch (error: any) {
    console.error('Chat send failed', error);
    res.status(500).json({ error: error.message || 'Chat failed' });
  }
});

router.post('/evaluate', async (req, res) => {
  try {
    const { taskConfig, messages } = req.body || {};
    if (!taskConfig || !messages) {
      return res.status(400).json({ error: 'Missing taskConfig or messages' });
    }
    const provider = getProvider();
    const result = await provider.evaluateTranscript({ taskConfig, messages });
    res.json(result);
  } catch (error: any) {
    console.error('Evaluation failed', error);
    res.status(500).json({ error: error.message || 'Evaluation failed' });
  }
});

router.post('/analysis', async (req, res) => {
  try {
    const { submissions } = req.body || {};
    if (!submissions) {
      return res.status(400).json({ error: 'Missing submissions' });
    }
    const provider = getProvider();
    const report = await provider.analyzeClass({ submissions });
    res.json(report);
  } catch (error: any) {
    console.error('Analysis failed', error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
});

export default router;
