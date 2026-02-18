import { useState, useEffect, useRef, useCallback } from "react";

const COLORS = ["#7c6fff","#ff6b6b","#ffd93d","#43d9ad","#60a5fa","#f472b6"];
const TAG_COLORS = ["#7c6fff","#43d9ad","#ffd93d","#ff6b6b","#60a5fa","#f472b6"];

const SEED_NOTES = [
  {
    id: 1, title: "Welcome to NoteCraft ✦",
    content: "# Welcome!\n\nThis is a **minimal** experimental note app.\n\n## Features\n\n- Write notes with Markdown\n- Toggle live preview\n- Auto-save with version history\n- Tags + color labels\n- Archive & pin notes\n- Search across all notes",
    tags: [], color: "#7c6fff", pinned: false, archived: false,
    version: 1, versions: [], createdAt: Date.now(), updatedAt: Date.now() - 3600000,
  },
  {
    id: 2, title: "Ideas backlog",
    content: "## Things to build\n\n- [ ] Dark mode toggle\n- [ ] Export to PDF\n- [x] Tag filtering\n- [x] Version history\n\n> The best ideas come when you stop trying.",
    tags: [], color: "#43d9ad", pinned: false, archived: false,
    version: 1, versions: [], createdAt: Date.now(), updatedAt: Date.now() - 7200000,
  },
];

function relTime(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return "just now";
  if (d < 3600000) return Math.floor(d/60000) + "m ago";
  if (d < 86400000) return Math.floor(d/3600000) + "h ago";
  return Math.floor(d/86400000) + "d ago";
}

function renderMd(md) {
  if (!md.trim()) return "<p style='color:#4a5168'>Nothing to preview yet…</p>";
  let h = md
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  h = h.replace(/^### (.+)$/gm,"<h3>$1</h3>");
  h = h.replace(/^## (.+)$/gm,"<h2>$1</h2>");
  h = h.replace(/^# (.+)$/gm,"<h1>$1</h1>");
  h = h.replace(/^&gt; (.+)$/gm,"<blockquote>$1</blockquote>");
  h = h.replace(/^---+$/gm,"<hr/>");
  h = h.replace(/^- \[x\] (.+)$/gm,"<li>✅ $1</li>");
  h = h.replace(/^- \[ \] (.+)$/gm,"<li>☐ $1</li>");
  h = h.replace(/^- (.+)$/gm,"<li>$1</li>");
  h = h.replace(/(<li>[\s\S]+?<\/li>)/g,"<ul>$1</ul>");
  h = h.replace(/```([\s\S]*?)```/g,"<pre><code>$1</code></pre>");
  h = h.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");
  h = h.replace(/\*(.+?)\*/g,"<em>$1</em>");
  h = h.replace(/`(.+?)`/g,"<code>$1</code>");
  h = h.replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2" target="_blank">$1</a>');
  h = h.split("\n\n").map(b => {
    if (/^<(h[1-3]|ul|blockquote|pre|hr)/.test(b.trim())) return b;
    return `<p>${b.replace(/\n/g,"<br/>")}</p>`;
  }).join("\n");
  return h;
}

export default function NoteCraft() {
  const [notes, setNotes] = useState(SEED_NOTES);
  const [tags, setTags] = useState([
    { id: 1, name: "work", color: "#7c6fff" },
    { id: 2, name: "ideas", color: "#43d9ad" },
  ]);
  const [activeId, setActiveId] = useState(1);
  const [search, setSearch] = useState("");
  const [tagFilters, setTagFilters] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [pendingColor, setPendingColor] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [nextId, setNextId] = useState(10);
  const saveTimer = useRef(null);
  const titleRef = useRef(null);

  const active = notes.find(n => n.id === activeId);

  co useCallback((updatedNotes) => {
    setSaveStatus("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setNotes(prev => prev.map(n => {
        const updated = updatedNotes.find(u => u.id === n.id);
        if (!updated) return n;
        const last = n.versions[n.versions.length - 1];
        const changed = !last || last.title !== updated.title || last.content !== updated.content;
        if (!changed) return updated;
        const newVersions = [...n.versions, {
          id: Date.now(), version: updated.version + 1,
          title: updated.title, content: updated.content, savedAt: Date.now(),
        }].slice(-15);
        return { ...updated, version: updated.version + 1, versions: newVersions };
      }));
      setSaveStatus("saved");
    }, 1200);
  }, []);

  function updateActive(field, value) {
    const updated = notes.map(n =>
      n.id === activeId ? { ...n, [field]: value, updatedAt: Date.now() } : n
    );
    setNotes(updated);
    scheduleSnapshot(updated);
  }

  function newNote() {
    const note = {
      id: nextId, title: "", content: "", tags: [], color: null,
      pinned: false, archived: false, version: 1, versions: [],
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    setNextId(n => n + 1);
    setNotes(prev => [note, ...prev]);
    setActiveId(note.id);
    setTimeout(() => titleRef.current?.focus(), 50);
  }

  function deleteNote(id) {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (activeId === id) setActiveId(notes.find(n => n.id !== id && !n.archived)?.id ?? null);
  }

  function archiveNote(id) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, archived: true } : n));
    if (activeId === id) setActiveId(notes.find(n => n.id !== id && !n.archived)?.id ?? null);
  }

  function restoreNote(id) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, archived: false } : n));
  }

  function pinNote(id) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  }

  function toggleNoteTag(tagId) {
    if (!active) return;
    const has = active.tags.includes(tagId);
    updateActive("tags", has ? active.tags.filter(t => t !== tagId) : [...active.tags, tagId]);
  }

  function restoreVersion(v) {
    if (!active) return;
    setNotes(prev => prev.map(n =>
      n.id === activeId ? { ...n, title: v.title, content: v.content, updatedAt: Date.now() } : n
    ));
    setShowHistory(false);
  }

  function addTag() {
    if (!newTagName.trim()) return;
    const tag = { id: nextId, name: newTagName.trim(), color: newTagColor };
    setNextId(n => n + 1);
    setTags(prev => [...prev, tag]);
    setNewTagName("");
    setShowTagModal(false);
  }

  function applyColor(color) {
    setNotes(prev => prev.map(n => n.id === activeId ? { ...n, color } : n));
    setShowColorModal(false);
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") { e.preventDefault(); newNote(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "m") { e.preventDefault(); setShowPreview(p => !p); }
      if ((e.metaKey || e.ctrlKey) && e.key === "h") { e.preventDefault(); setShowHistory(p => !p); }
      if (e.key === "Escape") { setShowTagModal(false); setShowColorModal(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [notes]);

  function insertMd(before, after) {
    const ta = document.getElementById("note-body");
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e) || "text";
    const rep = before + sel + after;
    const newVal = ta.value.slice(0, s) + rep + ta.value.slice(e);
    updateActive("content", newVal);
    setTimeout(() => { ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + sel.length; ta.focus(); }, 0);
  }

  const filtered = notes.filter(n => {
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) &&
        !n.content.toLowerCase().includes(search.toLowerCase())) return false;
    if (tagFilters.length && !tagFilters.every(id => n.tags.includes(id))) return false;
    return true;
  });
  const activeNotes = filtered.filter(n => !n.archived).sort((a,b) => (b.pinned - a.pinned) || b.updatedAt - a.updatedAt);
  const archivedNotes = filtered.filter(n => n.archived).sort((a,b) => b.updatedAt - a.updatedAt);

  const s = {
    app: { display:"flex", height:"100vh", background:"#111318", color:"#dde1ed", fontFamily:"system-ui,sans-serif", fontSize:14, overflow:"hidden" },
    sidebar: { width:240, flexShrink:0, background:"#1c1f28", borderRight:"1px solid #2e3347", display:"flex", flexDirection:"column", overflow:"hidden" },
    sideTop: { padding:"14px 12px 10px", borderBottom:"1px solid #2e3347", display:"flex", alignItems:"center", gap:8 },
    logo: { fontWeight:800, fontSize:16, letterSpacing:-0.5 },
    newBtn: { marginLeft:"auto", background:"#7c6fff", color:"#fff", border:"none", borderRadius:6, width:26, height:26, fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 },
    searchBox: { padding:"8px 10px", borderBottom:"1px solid #2e3347" },
    searchInput: { width:"100%", background:"#252a36", border:"1px solid #2e3347", borderRadius:6, padding:"6px 10px", color:"#dde1ed", fontSize:12, outline:"none", fontFamily:"inherit" },
    tagRow: { padding:"6px 10px", display:"flex", gap:5, flexWrap:"wrap", borderBottom:"1px solid #2e3347", minHeight:36 },
    sectionLabel: { padding:"6px 12px 4px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"#4a5168" },
    noteList: { overflowY:"auto", flex:1 },
    noteItem: (active, color) => ({
      padding:"9px 10px", borderRadius:7, margin:"2px 6px", cursor:"pointer",
      border:`1px solid ${active ? "#7c6fff" : "transparent"}`,
      background: active ? "rgba(124,111,255,0.1)" : "transparent",
      borderLeft: color ? `3px solid ${color}` : active ? "3px solid #7c6fff" : "3px solid transparent",
      transition:"all 0.1s",
    }),
    noteTitle: { fontWeight:600, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:2 },
    notePreview: { fontSize:11, color:"#4a5168", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
    noteDate: { fontSize:10, color:"#4a5168", marginTop:3 },
    main: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
    toolbar: { background:"#1c1f28", borderBottom:"1px solid #2e3347", padding:"7px 14px", display:"flex", alignItems:"center", gap:3, flexShrink:0, flexWrap:"wrap" },
    tbBtn: (active) => ({ padding:"4px 8px", borderRadius:5, border:"none", background: active ? "rgba(124,111,255,0.2)" : "transparent", color: active ? "#7c6fff" : "#8890a4", fontSize:12, cursor:"pointer", fontFamily:"inherit" }),
    tbSep: { width:1, height:16, background:"#2e3347", margin:"0 3px" },
    tbRight: { marginLeft:"auto", display:"flex", alignItems:"center", gap:6 },
    saveStatus: { fontSize:11, color:"#4a5168", display:"flex", alignItems:"center", gap:4 },
    saveDot: (st) => ({ width:6, height:6, borderRadius:"50%", background: st==="saving" ? "#ffd93d" : st==="saved" ? "#43d9ad" : "#4a5168" }),
    tagStrip: { padding:"6px 20px 8px", borderBottom:"1px solid #2e3347", display:"flex", gap:6, flexWrap:"wrap", alignItems:"center", flexShrink:0 },
    tagPill: (color, on) => ({ fontSize:11, padding:"2px 10px", borderRadius:20, border:`1px solid ${color}`, color, background: on ? color+"20" : "transparent", cursor:"pointer", fontWeight:500 }),
    editorWrap: { flex:1, display:"flex", overflow:"hidden" },
    editorPane: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
    titleInput: { fontSize:24, fontWeight:800, color:"#dde1ed", background:"transparent", border:"none", outline:"none", fontFamily:"inherit", padding:"24px 28px 12px", letterSpacing:-0.5, width:"100%" },
    bodyInput: { flex:1, fontSize:14, color:"#dde1ed", background:"transparent", border:"none", outline:"none", fontFamily:"inherit", padding:"0 28px 20px", lineHeight:1.8, resize:"none", overflowY:"auto" },
    previewPane: { flex:1, padding:"24px 28px", overflowY:"auto", borderLeft:"1px solid #2e3347", fontSize:14, lineHeight:1.8 },
    historyPanel: { width:210, flexShrink:0, borderLeft:"1px solid #2e3347", background:"#1c1f28", display:"flex", flexDirection:"column", overflow:"hidden" },
    histHead: { padding:"10px 12px", borderBottom:"1px solid #2e3347", fontSize:12, fontWeight:700, color:"#8890a4", display:"flex", justifyContent:"space-between", alignItems:"center" },
    vItem: (cur) => ({ padding:"10px 12px", borderBottom:"1px solid #2e3347", borderLeft: cur ? "2px solid #7c6fff" : "2px solid transparent" }),
    empty: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"#4a5168" },
    modal: { position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 },
    modalBox: { background:"#1c1f28", border:"1px solid #2e3347", borderRadius:12, padding:22, width:320 },
    modalTitle: { fontWeight:700, marginBottom:14 },
    modalInput: { width:"100%", background:"#252a36", border:"1px solid #2e3347", borderRadius:6, padding:"7px 10px", color:"#dde1ed", fontFamily:"inherit", fontSize:13, outline:"none", marginBottom:10 },
    swatches: { display:"flex", gap:7, marginBottom:14, flexWrap:"wrap" },
    swatch: (c, sel) => ({ width:22, height:22, borderRadius:"50%", background: c||"#252a36", cursor:"pointer", border: sel ? "2px solid #fff" : "2px solid transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#666" }),
    btnRow: { display:"flex", gap:8, justifyContent:"flex-end" },
    btnPrimary: { padding:"6px 14px", background:"#7c6fff", color:"#fff", border:"none", borderRadius:6, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit" },
    btnGhost: { padding:"6px 14px", background:"#252a36", color:"#8890a4", border:"1px solid #2e3347", borderRadius:6, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit" },
  };

  return (
    <div style={s.app}>

      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <div style={s.sidebar}>
        <div style={s.sideTop}>
          <span style={s.logo}>note<span style={{color:"#7c6fff"}}>craft</span></span>
          <button style={s.newBtn} onClick={newNote} title="New note (⌘N)">+</button>
        </div>

        <div style={s.searchBox}>
          <input style={s.searchInput} placeholder="Search…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>

        {tags.length > 0 && (
          <div style={s.tagRow}>
            {tags.map(tag => {
              const on = tagFilters.includes(tag.id);
              return (
                <span key={tag.id} style={s.tagPill(tag.color, on)}
                  onClick={() => setTagFilters(prev => on ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}>
                  {tag.name}
                </span>
              );
            })}
          </div>
        )}

        <div style={s.sectionLabel}>Notes ({activeNotes.length})</div>
        <div style={{...s.noteList, maxHeight:"45vh"}}>
          {activeNotes.length === 0
            ? <div style={{padding:"10px 12px", fontSize:12, color:"#4a5168"}}>No notes yet</div>
            : activeNotes.map(note => (
              <div key={note.id} style={s.noteItem(note.id === activeId, note.color)}
                onClick={() => setActiveId(note.id)}>
                <div style={{display:"flex", alignItems:"center", gap:5}}>
                  <div style={s.noteTitle}>{note.pinned ? "📌 " : ""}{note.title || "Untitled"}</div>
                </div>
                <div style={s.notePreview}>{note.content.replace(/[#*`>\-_\[\]]/g,"").slice(0,55) || "Empty"}</div>
                <div style={s.noteDate}>{relTime(note.updatedAt)}</div>
              </div>
            ))
          }
        </div>

        {archivedNotes.length > 0 && (
          <>
            <div style={{...s.sectionLabel, borderTop:"1px solid #2e3347", paddingTop:8}}>Archive ({archivedNotes.length})</div>
            <div style={{...s.noteList, maxHeight:"18vh"}}>
              {archivedNotes.map(note => (
                <div key={note.id} style={{...s.noteItem(note.id === activeId, note.color), opacity:0.5}}
                  onClick={() => setActiveId(note.id)}>
                  <div style={s.noteTitle}>{note.title || "Untitled"}</div>
                  <div style={s.noteDate}>{relTime(note.updatedAt)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── MAIN ────────────────────────────────────────── */}
      <div style={s.main}>
        {!active ? (
          <div style={s.empty}>
            <div style={{fontSize:36, opacity:0.3}}>✦</div>
            <div style={{fontWeight:600}}>No note selected</div>
            <div style={{fontSize:12}}>Press ⌘N to create one</div>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div style={s.toolbar}>
              <button style={s.tbBtn()} onClick={() => insertMd("**","**")} title="Bold"><b>B</b></button>
              <button style={s.tbBtn()} onClick={() => insertMd("*","*")} title="Italic"><i>I</i></button>
              <button style={s.tbBtn()} onClick={() => insertMd("`","`")} title="Code">&lt;/&gt;</button>
              <button style={s.tbBtn()} onClick={() => insertMd("\n## ","")} title="Heading">H2</button>
              <button style={s.tbBtn()} onClick={() => insertMd("\n> ","")} title="Quote">❝</button>
              <button style={s.tbBtn()} onClick={() => insertMd("\n- ","")} title="List">≡</button>
              <button style={s.tbBtn()} onClick={() => insertMd("\n- [ ] ","")} title="Task">☑</button>
              <div style={s.tbSep} />
              <button style={s.tbBtn(showHistory)} onClick={() => setShowHistory(p => !p)} title="History (⌘H)">⏱</button>
              <button style={s.tbBtn(showPreview)} onClick={() => setShowPreview(p => !p)} title="Preview (⌘M)">👁</button>
              <div style={s.tbRight}>
                <div style={s.saveStatus}>
                  <div style={s.saveDot(saveStatus)} />
                  <span>{saveStatus === "saving" ? "Saving…" : "Saved"}</span>
                </div>
                <button style={s.tbBtn()} onClick={() => { setPendingColor(active.color); setShowColorModal(true); }} title="Color">🎨</button>
                <button style={s.tbBtn(active.pinned)} onClick={() => pinNote(active.id)} title="Pin">📌</button>
                <button style={s.tbBtn()} onClick={() => archiveNote(active.id)} title="Archive">📦</button>
                {active.archived && <button style={s.tbBtn()} onClick={() => restoreNote(active.id)} title="Restore">📤</button>}
                <button style={{...s.tbBtn(), color:"#ff6b6b"}} onClick={() => deleteNote(active.id)} title="Delete">🗑</button>
              </div>
            </div>

            {/* Tags strip */}
            <div style={s.tagStrip}>
              {tags.map(tag => {
                const on = active.tags.includes(tag.id);
                return (
                  <span key={tag.id} style={s.tagPill(tag.color, on)} onClick={() => toggleNoteTag(tag.id)}>
                    {tag.name}
                  </span>
                );
              })}
              <span style={{fontSize:11, color:"#4a5168", cursor:"pointer", padding:"2px 8px", border:"1px dashed #2e3347", borderRadius:20}}
                onClick={() => setShowTagModal(true)}>+ tag</span>
            </div>

            {/* Editor + Preview + History */}
            <div style={s.editorWrap}>
              <div style={s.editorPane}>
                <input
                  ref={titleRef}
                  style={s.titleInput}
                  value={active.title}
                  placeholder="Untitled"
                  onChange={e => updateActive("title", e.target.value)}
                />
                <textarea
                  id="note-body"
                  style={s.bodyInput}
                  value={active.content}
                  placeholder={"Start writing… Markdown supported\n\n**bold** *italic* `code`\n# Heading  > Quote  - List"}
                  onChange={e => updateActive("content", e.target.value)}
                />
              </div>

              {showPreview && (
                <div style={s.previewPane}
                  dangerouslySetInnerHTML={{ __html: renderMd(active.content) }} />
              )}

              {showHistory && (
                <div style={s.historyPanel}>
                  <div style={s.histHead}>
                    History
                    <span style={{cursor:"pointer", color:"#4a5168"}} onClick={() => setShowHistory(false)}>×</span>
                  </div>
                  <div style={{...s.vItem(true)}}>
                    <div style={{fontSize:11, fontWeight:700, color:"#7c6fff"}}>v{active.version} · current</div>
                    <div style={{fontSize:10, color:"#4a5168", marginTop:2}}>{relTime(active.updatedAt)}</div>
                  </div>
                  {[...active.versions].reverse().map(v => (
                    <div key={v.id} style={s.vItem(false)}>
                      <div style={{fontSize:11, fontWeight:700, color:"#8890a4"}}>v{v.version}</div>
                      <div style={{fontSize:10, color:"#4a5168", marginTop:2}}>{relTime(v.savedAt)}</div>
                      <div style={{fontSize:11, color:"#7c6fff", cursor:"pointer", marginTop:4,
                        border:"1px solid rgba(124,111,255,0.3)", borderRadius:10, padding:"2px 8px", display:"inline-block"}}
                        onClick={() => restoreVersion(v)}>↩ restore</div>
                    </div>
                  ))}
                  {active.versions.length === 0 &&
                    <div style={{padding:12, fontSize:11, color:"#4a5168"}}>No history yet — keep writing!</div>}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── TAG MODAL ───────────────────────────────────── */}
      {showTagModal && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowTagModal(false)}>
          <div style={s.modalBox}>
            <div style={s.modalTitle}>New tag</div>
            <input autoFocus style={s.modalInput} placeholder="Tag name" value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTag()} />
            <div style={s.swatches}>
              {TAG_COLORS.map(c => (
                <div key={c} style={s.swatch(c, newTagColor === c)} onClick={() => setNewTagColor(c)} />
              ))}
            </div>
            <div style={s.btnRow}>
              <button style={s.btnGhost} onClick={() => setShowTagModal(false)}>Cancel</button>
              <button style={s.btnPrimary} onClick={addTag}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* ── COLOR MODAL ─────────────────────────────────── */}
      {showColorModal && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowColorModal(false)}>
          <div style={s.modalBox}>
            <div style={s.modalTitle}>Note color</div>
            <div style={s.swatches}>
              <div style={s.swatch(null, pendingColor === null)} onClick={() => setPendingColor(null)}>✕</div>
              {COLORS.map(c => (
                <div key={c} style={s.swatch(c, pendingColor === c)} onClick={() => setPendingColor(c)} />
              ))}
            </div>
            <div style={s.btnRow}>
              <button style={s.btnGhost} onClick={() => setShowColorModal(false)}>Cancel</button>
              <button style={s.btnPrimary} onClick={() => applyColor(pendingColor)}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview styles injected ─────────────────────── */}
      <style>{`
        .preview-content h1 { font-size:20px; font-weight:800; margin-bottom:10px }
        [style*="previewPane"] h1 { font-size:20px; font-weight:800; margin-bottom:10px; color:#dde1ed }
        [style*="previewPane"] h2 { font-size:16px; font-weight:700; margin:16px 0 8px; color:#dde1ed }
        [style*="previewPane"] h3 { font-size:14px; font-weight:600; margin:12px 0 6px; color:#dde1ed }
        [style*="previewPane"] p { margin-bottom:10px }
        [style*="previewPane"] code { font-family:monospace; background:#252a36; padding:2px 5px; border-radius:4px; font-size:12px; color:#7c6fff }
        [style*="previewPane"] pre { background:#252a36; padding:12px; border-radius:7px; margin:10px 0; overflow-x:auto }
        [style*="previewPane"] pre code { background:none; padding:0; color:#dde1ed }
        [style*="previewPane"] blockquote { border-left:3px solid #7c6fff; padding-left:12px; color:#8890a4; margin:10px 0 }
        [style*="previewPane"] ul { padding-left:20px; margin-bottom:10px }
        [style*="previewPane"] li { margin-bottom:3px }
        [style*="previewPane"] strong { color:#dde1ed; font-weight:700 }
        [style*="previewPane"] a { color:#7c6fff }
        [style*="previewPane"] hr { border:none; border-top:1px solid #2e3347; margin:16px 0 }
        textarea { caret-color: #7c6fff }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: #2e3347; border-radius: 2px }
      `}</style>
    </div>
  );
}
