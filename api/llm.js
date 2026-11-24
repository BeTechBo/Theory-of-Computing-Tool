// POST /api/llm   { task: "analyze" | "explain", ... }  → JSON from the model
// GET  /api/llm   → { configured, provider, model }   (no secrets)
// Runs as a Vercel serverless function in production and through a Vite
// middleware in development (see vite.config.js).

import { askLLM, llmStatus } from './_lib/llm.js';
import { ANALYZE, EXPLAIN, CHECK, EXPLAIN_SUBJECT } from './_lib/prompts.js';
import { GRAMMAR_TECHNIQUE_SESSION } from './_lib/courseNotesGrammar.js';
import { SESSION_MAP, relevantNotes } from './_lib/courseNotes.js';

const TECHNIQUE_SESSION = {
  dfa_trace: 'S01 dfa trace',
  dfa_design: 'S02 design',
  min_table: 'S03 minimise',
  min_partition: 'S03 minimise',
  subset_construction: 'S04 nfa subset',
  eps_closure: 'S05 ε-closure',
  eps_removal: 'S06 ε-removal',
  moore_mealy: 'S07 moore mealy',
  regex: 'S09 regex identities',
  state_elimination: 'S10 state elimination',
  thompson: 'S11 thompson',
  product: 'S12 product construction',
  pumping: 'S13 pumping lemma',
  ...GRAMMAR_TECHNIQUE_SESSION // S17–S21
};

// The system prompt + the course map + the notes that match this request.
const withNotes = (base, message, context = '') => {
  const notes = relevantNotes(message, context);
  return (
    `${base}\n\n${SESSION_MAP}` +
    (notes
      ? `\n\nCOURSE NOTES: these are how THIS course teaches the topic and they are the authority. ` +
        `If your general knowledge or a textbook says something different, follow the notes, and never call the notes' method a mistake.\n${notes}`
      : '')
  );
};

const MAX_CHARS = 6000;
const MAX_IMAGES = 3;
const MAX_IMAGE_B64 = 2_500_000; // about 1.8 MB per picture after resizing in the browser
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default async function handler(req, res) {
  const send = (status, obj) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };

  if (req.method === 'GET') return send(200, llmStatus());
  if (req.method !== 'POST') return send(405, { error: 'Use GET or POST.' });

  let body;
  try {
    body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(await readBody(req));
  } catch {
    return send(400, { error: 'Body must be JSON.' });
  }

  try {
    if (body.task === 'analyze') {
      const { message = '', technique = null, machineTable = null, history = [] } = body;
      const images = (Array.isArray(body.images) ? body.images : [])
        .slice(0, MAX_IMAGES)
        .filter(i => ALLOWED_TYPES.includes(i?.mimeType) && typeof i.data === 'string' && i.data.length < MAX_IMAGE_B64);
      if (!message.trim() && !images.length) return send(400, { error: 'Empty message.' });
      if (message.length > MAX_CHARS) return send(400, { error: 'That message is too long for me. Try a shorter one.' });
      const context = [
        technique ? `Selected technique: ${technique}` : 'Selected technique: none (decide yourself)',
        machineTable ? `Current machine:\n${machineTable}` : 'Current machine: none'
      ].join('\n');
      const messages = [
        ...history.slice(-6).map(h => ({ role: h.role === 'bot' ? 'assistant' : 'user', content: String(h.text).slice(0, 1500) })),
        {
          role: 'user',
          images,
          content: `${context}\n\n${images.length ? `The student attached ${images.length} picture(s).\n` : ''}Student message:\n${message || '(no text, see the picture)'}`
        }
      ];
      const noteContext = [technique ? TECHNIQUE_SESSION[technique] : '', history.slice(-2).map(h => h.text).join(' ')].join(' ');
      return send(200, await askLLM({ system: withNotes(ANALYZE, message, noteContext), messages }));
    }

    if (body.task === 'explain') {
      const { machineTable = '', accepted = [], rejected = [], technique = '' } = body;
      if (!machineTable || machineTable.length > MAX_CHARS) return send(400, { error: 'Missing or oversized machine.' });
      const content =
        `Technique: ${technique}\nFinal machine:\n${machineTable}\n\n` +
        `Accepted (shortest first): ${accepted.map(w => (w === '' ? 'ε' : w)).join(', ') || 'none'}\n` +
        `Rejected (shortest first): ${rejected.map(w => (w === '' ? 'ε' : w)).join(', ') || 'none'}`;
      return send(200, await askLLM({ system: withNotes(EXPLAIN, TECHNIQUE_SESSION[technique] || technique), messages: [{ role: 'user', content }] }));
    }

    // S17–S21: what each variable generates / each state and stack symbol means, and L in one sentence
    if (body.task === 'explain_subject') {
      const { subject = 'grammar', text = '', items = [], accepted = [], rejected = [] } = body;
      if (!text || typeof text !== 'string' || text.length > MAX_CHARS) return send(400, { error: 'Missing or oversized grammar.' });
      const show = w => (w === '' ? 'ε' : String(w));
      const names = (Array.isArray(items) ? items : []).slice(0, 40).map(String);
      const content =
        `${subject === 'pda' ? 'Pushdown automaton' : 'Context-free grammar'}:\n${text}\n\n` +
        `Describe these names, in this order: ${names.join(', ')}\n` +
        `In the language (shortest first): ${(Array.isArray(accepted) ? accepted : []).slice(0, 20).map(show).join(', ') || 'none'}\n` +
        `Not in the language: ${(Array.isArray(rejected) ? rejected : []).slice(0, 20).map(show).join(', ') || 'none'}`;
      const topic = subject === 'pda' ? GRAMMAR_TECHNIQUE_SESSION.pda : `${GRAMMAR_TECHNIQUE_SESSION.cfg} context-free`;
      return send(200, await askLLM({ system: withNotes(EXPLAIN_SUBJECT, topic), messages: [{ role: 'user', content }] }));
    }

    if (body.task === 'check') {
      const { message = '', technique = null, machineTable = null, transducerTable = null } = body;
      const images = (Array.isArray(body.images) ? body.images : [])
        .slice(0, MAX_IMAGES)
        .filter(i => ALLOWED_TYPES.includes(i?.mimeType) && typeof i.data === 'string' && i.data.length < MAX_IMAGE_B64);
      if (!message.trim() && !images.length) return send(400, { error: 'Send your answer as text or a picture.' });
      if (message.length > MAX_CHARS) return send(400, { error: 'That answer is too long for me. Try a shorter one.' });
      const content = [
        technique ? `Technique: ${technique}` : 'Technique: decide from the work',
        machineTable ? `Question machine:\n${machineTable}` : '',
        transducerTable ? `Question machine (Moore/Mealy):\n${transducerTable}` : '',
        images.length ? `The student attached ${images.length} picture(s) of their work.` : '',
        `Student's message:\n${message || '(see the pictures)'}`
      ].filter(Boolean).join('\n\n');
      return send(200, await askLLM({ system: CHECK, messages: [{ role: 'user', images, content }] }));
    }

    return send(400, { error: 'Unknown task.' });
  } catch (e) {
    return send(e.status || 500, { error: e.message || 'The AI helper failed.' });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => {
      data += c;
      if (data.length > 8_000_000) reject(new Error('too large'));
    });
    req.on('end', () => resolve(data || '{}'));
    req.on('error', reject);
  });
}
