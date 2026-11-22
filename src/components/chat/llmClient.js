// Browser side of the AI helper. Talks only to our own /api/llm, never to the
// provider directly, so the API key stays on the server.

export async function llmStatus() {
  try {
    const r = await fetch('/api/llm');
    if (!r.ok) return { configured: false };
    return await r.json();
  } catch {
    return { configured: false };
  }
}

async function post(body) {
  const r = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg =
      r.status === 429
        ? "I've used up my free AI quota for now. Pasted tables still work; try questions again in a bit."
        : data.error || `The AI helper failed (${r.status}).`;
    throw new Error(msg);
  }
  return data;
}

export const analyze = payload => post({ task: 'analyze', ...payload });
export const explain = payload => post({ task: 'explain', ...payload });
export const readAttempt = payload => post({ task: 'check', ...payload });
