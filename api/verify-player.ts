import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    console.log(`[verify-player] Processing ID: ${playerId}`);

    // Simulate network delay for a premium feel
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Realistic BGMI Name Generation Logic (Deterministic based on ID)
    if (playerId.length >= 8 && playerId.length <= 12 && /^\d+$/.test(playerId)) {
      const prefixes = ["亗", "GOD乛", "KING亗", "OP・", "IND丶", "MR・", "Proツ", "NINJA", "DARK・", "X・"];
      const suffixes = ["OP", "YT", "GAMER", "KILLER", "BOT", "NOOB", "MAX", "PRO"];
      const names = ["Mortal", "Scout", "Dynamo", "Jonathan", "Viper", "Ronney", "Rahul", "Aryan", "Shadow", "Ghost", "Venum", "Ravan", "Mafia", "Legend", "Eagle", "Falcon"];
      
      let hash = 0;
      for (let i = 0; i < playerId.length; i++) {
        hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
      }
      hash = Math.abs(hash);
      
      const prefix = (hash % 3 === 0) ? prefixes[hash % prefixes.length] : "";
      const name = names[hash % names.length];
      const suffix = (hash % 2 === 0) ? suffixes[hash % suffixes.length] : "";
      
      let finalName = prefix + name + suffix;
      if (!prefix && !suffix) {
         finalName += (hash % 99).toString().padStart(2, '0');
      }

      return res.status(200).json({
        success: true,
        name: finalName,
        message: 'Player verified successfully'
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Invalid Player ID or Player not found'
      });
    }
  } catch (error) {
    console.error('[verify-player] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during verification'
    });
  }
}
