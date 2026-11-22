// The only file that knows which LLM provider we use (plan §11: "keep it swappable").
// Today: Google Gemini (free tier from Google AI Studio). Key lives in .env / Vercel env vars.
//
//   GEMINI_API_KEY=...   required
//   GEMINI_MODEL=...     optional: one model, or several separated by commas (tried in order)
//
// Free-tier models are sometimes "experiencing high demand" (503) or retired for new
// keys (404), so we try a short list and move on when one is busy.

// Each model has its own free-tier quota, so a longer list = more capacity on busy days.
const DEFAULT_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];
const TIMEOUT_MS = 20000;
const TOTAL_BUDGET_MS = 45000; // stop trying after this, the student is waiting
// A model that just said "limit reached" (429) or "busy" (503) is tried last for a while.
const cooldown = new Map(); // model -> time until which it is skipped
const models = () => {
  const list = (process.env.GEMINI_MODEL || '').split(',').map(m => m.trim()).filter(Boolean).concat(DEFAULT_MODELS).filter((m, i, a) => a.indexOf(m) === i);
  const now = Date.now();
  return [...list.filter(m => !(cooldown.get(m) > now)), ...list.filter(m => cooldown.get(m) > now)];
};

export function llmStatus() {
  return {
    configured: Boolean(process.env.GEMINI_API_KEY),
    provider: 'gemini',
    model: models()[0]
  };
}

// messages: [{ role: 'user' | 'assistant', content: string, images?: [{ mimeType, data(base64) }] }]
// Returns the parsed JSON object the model produced. Retries once on invalid JSON.
export async function askLLM({ system, messages, temperature = 0.2 }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error('No GEMINI_API_KEY set on the server.'), { status: 503 });

  const call = async (model, extraNote) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system + (extraNote || '') }] },
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [
            ...(m.images || []).map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
            { text: m.content }
          ]
        })),
        generationConfig: { temperature, responseMimeType: 'application/json' }
      })
    });
    if (!res.ok) {
      const body = await res.text();
      const err = new Error(`Gemini (${model}) returned ${res.status}: ${body.slice(0, 300)}`);
      err.status = res.status === 429 ? 429 : 502;
      err.tryNext = [404, 429, 500, 503].includes(res.status);
      throw err;
    }
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    return JSON.parse(text.replace(/^```(json)?\s*|\s*```$/g, ''));
  };

  // Try each model in turn; on invalid JSON, ask the same model once more.
  let lastError;
  const begin = Date.now();
  for (const model of models()) {
    if (Date.now() - begin > TOTAL_BUDGET_MS) break;
    const started = Date.now();
    try {
      try {
        const out = await call(model);
        console.log(`[llm] ${model} answered in ${((Date.now() - started) / 1000).toFixed(1)}s`);
        return out;
      } catch (e) {
        if (!(e instanceof SyntaxError)) throw e;
        return await call(model, '\n\nYour previous answer was not valid JSON. Return one JSON object and nothing else.');
      }
    } catch (e) {
      lastError = e;
      if (e.tryNext) cooldown.set(model, Date.now() + (String(e.message).includes('returned 429') ? 5 * 60000 : 60000));
      console.log(`[llm] ${model} failed after ${((Date.now() - started) / 1000).toFixed(1)}s: ${e.name === 'TimeoutError' ? 'timeout' : (e.message || '').slice(0, 80)}`);
      const timedOut = e.name === 'TimeoutError' || e.name === 'AbortError';
      if (!(e.tryNext || timedOut || e instanceof SyntaxError)) throw e;
    }
  }
  const err = lastError || new Error('The AI helper is busy.');
  err.status = 429; // the client shows a friendly "busy, try again in a bit" message
  throw err;
}
