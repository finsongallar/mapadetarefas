export default async function handler(req, res) {
  // CORS — permite só o seu domínio em produção
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
    return res.status(400).json({ error: 'Prompt inválido' });
  }

  // Chave fica só no servidor — nunca exposta ao browser
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key não configurada' });

  const SYSTEM = `Você é um assistente especializado em mapas mentais.
Gere um mapa mental em JSON válido. Responda APENAS o JSON, sem markdown, sem explicação.
Formato exato:
{"root":"Nome central (até 4 palavras)","branches":[{"label":"Área","children":["item1","item2"]}]}
Regras: 4 a 7 branches, 2 a 5 filhos por branch, labels curtos (4-5 palavras), português brasileiro.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':        'application/json',
        'x-api-key':           apiKey,
        'anthropic-version':   '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-5',
        max_tokens: 1000,
        system:     SYSTEM,
        messages:   [{ role: 'user', content: prompt.trim() }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || 'Erro na API Anthropic' });
    }

    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
    const map  = JSON.parse(text);

    return res.status(200).json(map);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}
