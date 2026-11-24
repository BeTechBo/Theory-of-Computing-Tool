import React, { useEffect, useRef, useState } from 'react';
import { Send, Plus, Trash2, Menu, X, MessageCircle, ImagePlus } from 'lucide-react';
import Mascot from './Mascot';
import Doodles from './Doodles';
import { UserBubble, BotMessage } from './Message';
import { respond, explainPayload } from './brain.js';
import { llmStatus, explain, explainSubject } from './llmClient.js';
import { SUBSET_PRESETS } from '../tutor/presets.js';
import { presetGrammar, presetPda } from '../tutor/grammarPresets.js';
import { checkRegex } from '../tutor/checks.js';
import { READY_ANSWERS } from './suggestions.js';

const STORE = 'stately.chats.v1';

const SUGGESTIONS = [
  { emoji: '🏁', title: 'NFA → DFA', sub: 'The Subset Race from Session 4', color: 'from-teal-100 to-emerald-50 border-teal-200', send: SUBSET_PRESETS[0].table },
  { emoji: '🎲', title: 'Practice', sub: 'A fresh exercise, then I mark your photo', color: 'from-pink-100 to-rose-50 border-pink-200', send: 'practice' },
  {
    emoji: '🧮',
    title: 'Test some strings',
    sub: 'Is the binary number divisible by 3?',
    color: 'from-amber-100 to-yellow-50 border-amber-200',
    send: `state  | 0  | 1\n→ * r0 | r0 | r1\nr1     | r2 | r0\nr2     | r1 | r2\nstrings: 110, 111, 1001, ε`
  },
  { emoji: '💬', title: 'Ask a question', sub: 'Why can every NFA become a DFA?', color: 'from-violet-100 to-indigo-50 border-violet-200', send: 'Why can every NFA be turned into a DFA? Explain it simply.' },
  // Module 5 (S17–S21): grammars and pushdown automata
  { emoji: '🌳', title: 'Grammar → CNF', sub: 'The conversion relay from Session 19', color: 'from-lime-100 to-green-50 border-lime-200', send: `Convert to Chomsky normal form:\n${presetGrammar('s19-relay').text}` },
  { emoji: '🥞', title: 'Trace a PDA', sub: 'Watch the stack count aⁿbⁿ', color: 'from-sky-100 to-cyan-50 border-sky-200', send: `${presetPda('pda-anbn').text}\nstrings: aabb, abab` }
];

const newChat = () => ({ id: Date.now().toString(36), title: 'New chat', messages: [], machine: null, createdAt: Date.now() });

function loadChats() {
  try {
    const c = JSON.parse(localStorage.getItem(STORE) || '[]');
    return Array.isArray(c) && c.length ? c : [newChat()];
  } catch {
    return [newChat()];
  }
}

export default function ChatApp() {
  const [chats, setChats] = useState(loadChats);
  const [activeId, setActiveId] = useState(() => chats[0].id);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState({ configured: false });
  const [sidebar, setSidebar] = useState(false);
  const [attachments, setAttachments] = useState([]); // [{ dataUrl, mimeType, data }]
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const chat = chats.find(c => c.id === activeId) || chats[0];

  useEffect(() => {
    llmStatus().then(setAi);
  }, []);

  useEffect(() => {
    const clean = chats.slice(0, 20).map(c => ({
      ...c,
      messages: c.messages
        .filter(m => m.kind !== 'typing')
        .map(m => (m.images?.length ? { ...m, images: [], imageCount: m.images.length } : m))
    }));
    try {
      localStorage.setItem(STORE, JSON.stringify(clean));
    } catch {
      /* storage full: not fatal */
    }
  }, [chats]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.messages.length, busy]);

  const updateChat = (id, fn) => setChats(cs => cs.map(c => (c.id === id ? fn(c) : c)));

  const send = async raw => {
    const text = (raw ?? input).trim();
    const pics = raw === undefined ? attachments : [];
    if ((!text && !pics.length) || busy) return;
    setInput('');
    if (raw === undefined) setAttachments([]);
    setBusy(true);
    const id = chat.id;
    const history = chat.messages.filter(m => m.kind !== 'typing').slice(-6).map(m => ({ role: m.role, text: m.text }));
    updateChat(id, c => ({
      ...c,
      title: c.messages.length ? c.title : titleFrom(text || 'Picture question'),
      messages: [...c.messages, { role: 'user', text, images: pics.map(p => p.dataUrl) }, { role: 'bot', kind: 'typing' }]
    }));

    let result;
    try {
      const [r] = await Promise.all([
        respond({ text, images: pics.map(({ mimeType, data }) => ({ mimeType, data })), machine: chat.machine, subject: chat.subject || null, practice: chat.practice || null, llmOn: ai.configured, history }),
        new Promise(res => setTimeout(res, 450)) // let Stately "think" for a moment
      ]);
      result = r;
    } catch (e) {
      result = { msgs: [{ role: 'bot', kind: 'text', text: e.message || 'Something went wrong. Try again?', mood: 'sad' }] };
    }
    const stamped = result.msgs.map((m, i) => ({ ...m, id: `${Date.now()}-${i}` }));
    updateChat(id, c => ({
      ...c,
      machine: result.machine !== undefined ? result.machine : c.machine,
      subject: result.subject !== undefined ? result.subject : c.subject, // the grammar or PDA in the chat (S17–S21)
      practice: result.practice !== undefined ? result.practice : c.practice,
      messages: [...c.messages.filter(m => m.kind !== 'typing'), ...stamped]
    }));
    setBusy(false);

    const target = stamped.find(m => m.needsExplain);
    if (target && ai.configured) enrich(id, target);
  };

  // The AI writes what each state means and the language; its regex is checked against the machine.
  const enrich = async (chatId, msg) => {
    const patch = fn => updateChat(chatId, c => ({ ...c, messages: c.messages.map(m => (m.id === msg.id ? fn(m) : m)) }));
    patch(m => ({ ...m, explainState: 'loading' }));
    try {
      if (msg.explainKind) {
        // a grammar or a PDA: the AI writes what each variable / state means and L in one sentence
        const out = await explainSubject(msg.explainData);
        const meaning = Object.fromEntries((out.facts || []).filter(f => msg.explainData.items.includes(f.item) && f.meaning).map(f => [f.item, String(f.meaning)]));
        patch(m => ({
          ...m,
          explainState: 'done',
          solution: { ...m.solution, facts: (m.solution.facts || []).map(f => (meaning[f.item] ? { ...f, meaning: meaning[f.item] } : f)), language: out.language ? String(out.language) : m.solution.language }
        }));
        return;
      }
      const out = await explain(explainPayload(msg));
      const names = new Set(msg.finalMachine.states);
      const facts = (out.facts || []).filter(f => names.has(f.item));
      const regexCheck = out.regex ? checkRegex(out.regex, msg.finalMachine) : null;
      patch(m => ({
        ...m,
        explainState: 'done',
        solution: {
          ...m.solution,
          facts: facts.length ? facts : m.solution.facts,
          language: out.language ? `${out.language}${out.regex ? `  Regex: ${out.regex}` : ''}` : m.solution.language
        },
        checks: regexCheck ? [...m.checks, regexCheck] : m.checks
      }));
    } catch {
      patch(m => ({ ...m, explainState: 'done' }));
    }
  };

  const onAction = action => {
    if (action.type === 'test') {
      setInput('test ');
      inputRef.current?.focus();
    } else if (action.type === 'checkPrompt') {
      setInput('Check my answer');
      fileRef.current?.click(); // pick the photo of your work
    } else if (action.type === 'say') {
      send(action.text);
    } else if (action.type === 'ask') {
      const q = action.question;
      if (ai.configured || !READY_ANSWERS[q]) send(q);
      else
        updateChat(chat.id, c => ({
          ...c,
          messages: [...c.messages, { role: 'user', text: q }, { role: 'bot', kind: 'text', text: READY_ANSWERS[q], mood: 'wow', id: Date.now().toString() }]
        }));
    }
  };

  // ---------- pictures: button, paste, drag & drop ----------
  const addFiles = async files => {
    const imgs = [...files].filter(f => f.type.startsWith('image/')).slice(0, 3 - attachments.length);
    const prepared = await Promise.all(imgs.map(shrinkImage));
    setAttachments(a => [...a, ...prepared.filter(Boolean)].slice(0, 3));
    inputRef.current?.focus();
  };
  const onPaste = e => {
    const files = [...(e.clipboardData?.files || [])];
    if (files.some(f => f.type.startsWith('image/'))) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const startNew = () => {
    // Reuse an empty chat instead of piling up "New chat" entries
    const empty = chats.find(c => c.messages.length === 0);
    if (empty) setActiveId(empty.id);
    else {
      const c = newChat();
      setChats(cs => [c, ...cs]);
      setActiveId(c.id);
    }
    setSidebar(false);
  };

  const removeChat = id => {
    setChats(cs => {
      const rest = cs.filter(c => c.id !== id);
      const next = rest.length ? rest : [newChat()];
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  return (
    <div className="h-screen flex bg-white text-slate-800 font-round overflow-hidden">
      {/* Sidebar: just new chat + history */}
      <aside
        className={`${sidebar ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static z-40 inset-y-0 left-0 w-64 shrink-0 flex flex-col bg-gradient-to-b from-amber-50 via-white to-teal-50 border-r-2 border-slate-100 transition-transform`}
      >
        <div className="p-4 flex items-center gap-2.5">
          <Mascot size={44} mood="happy" bob={false} />
          <div>
            <h1 className="font-fun text-2xl font-semibold leading-none text-slate-900">Stately</h1>
            <p className="text-xs font-semibold text-slate-500">your CSCE 4201 study buddy</p>
          </div>
          <button className="md:hidden ml-auto p-1.5 rounded-full hover:bg-white" onClick={() => setSidebar(false)} aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4">
          <button
            onClick={startNew}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-slate-900 text-white font-fun text-base font-medium hover:bg-slate-800 active:scale-[0.98] transition shadow-md shadow-slate-900/10"
          >
            <Plus className="w-4 h-4" /> New chat
          </button>
        </div>

        <div className="px-4 mt-6 flex-1 min-h-0 flex flex-col">
          <h2 className="font-fun text-sm font-medium text-slate-500 mb-2">Your chats</h2>
          <div className="space-y-1 overflow-y-auto pr-1 pb-4">
            {chats.map(c => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-sm font-semibold ${
                  c.id === chat.id ? 'bg-white shadow-sm border-2 border-slate-100' : 'hover:bg-white/70'
                }`}
                onClick={() => {
                  setActiveId(c.id);
                  setSidebar(false);
                }}
              >
                <MessageCircle className="w-4 h-4 shrink-0 text-teal-500" />
                <span className="truncate flex-1">{c.title}</span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    removeChat(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
                  aria-label="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>
      {sidebar && <div className="md:hidden fixed inset-0 z-30 bg-slate-900/20" onClick={() => setSidebar(false)} />}

      {/* Chat */}
      <main
        className="flex-1 min-w-0 flex flex-col relative"
        onDragOver={e => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={e => e.currentTarget === e.target && setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        {dragging && (
          <div className="absolute inset-3 z-20 rounded-3xl border-4 border-dashed border-teal-300 bg-teal-50/80 flex items-center justify-center pointer-events-none">
            <p className="font-fun text-2xl text-teal-700">Drop your picture here 📷</p>
          </div>
        )}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b-2 border-slate-100">
          <button className="p-1.5 rounded-full hover:bg-slate-100" onClick={() => setSidebar(true)} aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="font-fun text-lg font-medium truncate">{chat.title}</h2>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
          {chat.messages.length === 0 ? (
            <Welcome onPick={s => send(s)} />
          ) : (
            <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-5">
              {chat.messages.map((m, i) =>
                m.role === 'user' ? (
                  <UserBubble key={i} text={m.text} images={m.images} imageCount={m.imageCount} />
                ) : (
                  <BotMessage key={m.id || i} msg={m} latest={i === chat.messages.length - 1} onAction={onAction} />
                )
              )}
            </div>
          )}
        </div>

        <div className="px-3 sm:px-6 pb-4 pt-2">
          <div className="max-w-4xl mx-auto rounded-3xl border-2 border-slate-200 bg-white shadow-lg shadow-slate-200/60 focus-within:border-teal-400 transition">
            {attachments.length > 0 && (
              <div className="flex gap-2 px-3 pt-3">
                {attachments.map((a, i) => (
                  <div key={i} className="relative">
                    <img src={a.dataUrl} alt="" className="h-16 w-16 object-cover rounded-xl border-2 border-slate-100" />
                    <button
                      onClick={() => setAttachments(x => x.filter((_, j) => j !== i))}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center"
                      aria-label="Remove picture"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              onPaste={onPaste}
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={Math.min(8, Math.max(2, input.split('\n').length))}
              placeholder="Message Stately…"
              spellCheck={false}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              className={`w-full resize-none bg-transparent px-4 pt-3 pb-1 outline-none placeholder:text-slate-400 ${/[|\n]/.test(input) ? 'font-mono text-sm' : 'font-round text-base'}`}
            />
            <div className="flex items-center gap-1.5 px-3 pb-2.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={e => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-sm font-bold transition active:scale-95"
                title="Attach a picture (or paste / drop one)"
              >
                <ImagePlus className="w-4 h-4" /> Picture
              </button>
              <button
                onClick={() => send()}
                disabled={busy || (!input.trim() && !attachments.length)}
                className="ml-auto w-10 h-10 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/30 disabled:opacity-40 disabled:shadow-none transition active:scale-90"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Welcome({ onPick }) {
  return (
    <div className="relative min-h-full flex flex-col items-center justify-center px-4 py-10">
      <Doodles />
      <div className="relative flex flex-col items-center text-center max-w-2xl">
        <Mascot size={130} mood="idle" />
        <h1 className="font-fun text-4xl sm:text-5xl font-semibold text-slate-900 mt-2">
          Hi, I'm <span className="text-teal-500">Stately</span>!
        </h1>
        <p className="mt-3 text-lg text-slate-600 font-semibold">
          Type a question, paste a machine, or attach a photo of it. I'll walk you through it step by step,{' '}
          <span className="bg-amber-100 rounded-md px-1">the way your exam marks it</span>.
        </p>
      </div>
      <div className="relative grid sm:grid-cols-2 gap-3 mt-8 w-full max-w-2xl">
        {SUGGESTIONS.map(s => (
          <button
            key={s.title}
            onClick={() => onPick(s.send)}
            className={`group text-left rounded-3xl border-2 bg-gradient-to-br ${s.color} p-4 hover:-translate-y-0.5 hover:shadow-lg transition`}
          >
            <span className="text-3xl inline-block group-hover:scale-110 transition">{s.emoji}</span>
            <p className="font-fun text-lg font-medium text-slate-900 mt-1">{s.title}</p>
            <p className="text-sm font-semibold text-slate-600">{s.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function titleFrom(text) {
  const first = text.split('\n')[0].replace(/[|→*{}]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^state\b/i.test(first)) return 'Machine ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return first.length > 34 ? first.slice(0, 34) + '…' : first || 'New chat';
}

// Shrink a picture in the browser before sending (max 1600px, JPEG): keeps requests small.
function shrinkImage(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; // transparent PNGs become white, not black
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ dataUrl, mimeType: 'image/jpeg', data: dataUrl.split(',')[1] });
      };
      img.onerror = () => resolve(null);
      img.src = reader.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
