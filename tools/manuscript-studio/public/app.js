const LANGUAGE_STORAGE_KEY = "manuscript-studio-language";
const savedLanguage = (() => {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return ["all", "en", "zh-TW"].includes(value) ? value : "all";
  } catch {
    return "all";
  }
})();
const state = { files: [], document: null, selected: null, history: [], decisions: new Map(), languageFilter: savedLanguage, editMode: "chinese", aiAvailable: false, openGroups: new Set(["front-matter", "Part_I_基礎篇"]) };
const $ = (selector) => document.querySelector(selector);
$("#language-filter").value = state.languageFilter;

async function api(path, options) {
  const response = await fetch(path, options);
  const value = await response.json();
  if (!response.ok) throw Object.assign(new Error(value.error ?? "Request failed"), { status: response.status, value });
  return value;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

function pairFor(segment) {
  return state.document?.segments.find((item) => item.id === segment?.pairId) ?? null;
}

function editableText(segment) {
  return segment?.text.replace(/^#{1,6}\s+(?:English Version|English Source|EN)\s*\n/iu, "") ?? "";
}

function composeEnglish(segment, rewrite) {
  const marker = segment?.originalText.match(/^(#{1,6}\s+(?:English Version|English Source|EN)\s*)\n/iu)?.[1];
  return marker ? `${marker}\n${rewrite}` : rewrite;
}

function bilingualPair() {
  if (!state.selected) return { english: null, chinese: null };
  if (state.selected.language === "en") return { english: state.selected, chinese: pairFor(state.selected) };
  if (state.selected.language === "zh-TW") return { english: pairFor(state.selected), chinese: state.selected };
  return { english: null, chinese: null };
}

function proposalCards(stage, proposals = [], selectedIndex = null) {
  const labels = { conservative: "保守修訂", editorial: "編輯優化", deep: "深度重寫" };
  return proposals.length ? `<div class="proposal-heading"><strong>選擇一條建議</strong><span>套用後可在上方編輯框繼續修改</span></div><div class="proposal-options">${proposals.map((proposal, index) => `<button type="button" class="proposal-option ${selectedIndex === index ? "selected" : ""}" aria-pressed="${selectedIndex === index}" data-use-proposal="${stage}" data-proposal-index="${index}"><small><b>0${index + 1}</b>${labels[proposal.mode] ?? proposal.mode}${selectedIndex === index ? " · 已套用" : ""}</small><span>${escapeHtml(proposal.text)}</span><em>${escapeHtml(proposal.reason)}</em></button>`).join("")}</div>` : "";
}

function captureEditorDraft() {
  const { english, chinese } = bilingualPair();
  if (!english || !chinese) return;
  const chineseInput = $("#chinese-text");
  const englishInput = $("#english-rewrite");
  if (chineseInput) chinese.proposal = chineseInput.value;
  if (englishInput) english.rewrite = englishInput.value;
  const reasonInput = $("#reason-text");
  if (reasonInput) chinese.reason = reasonInput.value;
}

function inlineEditor(segment) {
  const { english, chinese } = bilingualPair();
  if (!english || !chinese) return `<div class="inline-review"><p class="pair-warning">這個段落尚未找到可靠的英中配對。為避免錯寫，請先檢查書稿結構。</p></div>`;
  const chineseMode = state.editMode === "chinese";
  const modeContent = chineseMode
    ? `<section class="reference-stage"><div class="stage-heading"><small>AUTHORITATIVE SOURCE</small><strong>英文語義來源</strong></div><div class="source-text">${escapeHtml(editableText({ text: english.originalText }))}</div><span class="source-id">${escapeHtml(english.id)}</span></section>
      <section class="revision-stage"><div class="stage-heading"><small>CHINESE EDITORIAL REVISION</small><strong>繁體中文修訂</strong></div><textarea id="chinese-text" lang="zh-Hant">${escapeHtml(chinese.proposal ?? chinese.text)}</textarea><div class="stage-actions"><button type="button" data-generate="chinese">${chinese.aiProposals?.length ? "重新產生 3 條中文建議" : "產生 3 條中文建議"}</button><span id="chinese-status">${state.aiAvailable ? "" : "AI 尚未連線，可先手動編輯"}</span></div>${proposalCards("chinese", chinese.aiProposals, chinese.selectedProposalIndex)}</section>`
    : `<section class="reference-stage"><div class="stage-heading"><small>APPROVED THINKING LAYER</small><strong>中文修訂參照</strong></div><div class="source-text chinese-reference">${escapeHtml(chinese.proposal ?? chinese.text)}</div><span class="source-id">${escapeHtml(chinese.id)}</span></section>
      <section class="rewrite-stage"><div class="stage-heading"><small>ENGLISH MEANING-PRESERVING REWRITE</small><strong>英文回寫稿</strong></div><textarea id="english-rewrite" lang="en" placeholder="依據英文來源與中文修訂，重新寫成可出版英文。">${escapeHtml(english.rewrite ?? editableText(english))}</textarea><div class="stage-actions"><button type="button" data-generate="english">${english.aiProposals?.length ? "重新產生 3 條英文回寫" : "產生 3 條英文回寫"}</button><span id="english-status">${state.aiAvailable ? "" : "AI 尚未連線，可先手動編輯"}</span></div>${proposalCards("english", english.aiProposals, english.selectedProposalIndex)}</section>`;
  const primaryAction = chineseMode
    ? `<button data-action="next-mode" class="primary">保存中文並前往英文回寫</button>`
    : `<button data-action="accept" class="primary">接受這組英中修訂</button>`;
  return `<div class="inline-review bilingual-editor" data-editor-for="${segment.id}">
    <div class="edit-mode-switch" role="tablist" aria-label="修訂模式"><button type="button" role="tab" aria-selected="${chineseMode}" class="${chineseMode ? "active" : ""}" data-edit-mode="chinese"><span>01</span>中文修訂</button><button type="button" role="tab" aria-selected="${!chineseMode}" class="${!chineseMode ? "active" : ""}" data-edit-mode="english"><span>02</span>英文回寫</button></div>
    ${modeContent}
    <div class="inline-review-footer"><div class="reason-field"><label for="reason-text">作者／編輯備註</label><input id="reason-text" value="${escapeHtml(chinese.reason ?? "")}" placeholder="記錄語義澄清、節奏或術語判斷" /></div><div class="actions">${primaryAction}<button data-action="reject">拒絕</button><button data-action="undo">撤銷</button></div></div>
  </div>`;
}

function updateProgress() {
  const visibleSegments = filteredSegments();
  const total = visibleSegments.length;
  const reviewed = visibleSegments.filter((segment) => (state.decisions.get(segment.id) ?? "pending") !== "pending").length;
  const reviewedAll = [...state.decisions.values()].filter((value) => value !== "pending").length;
  $("#progress-label").textContent = `${reviewed} / ${total}`;
  $("#progress").max = Math.max(1, total);
  $("#progress").value = reviewed;
  $("#save-draft").disabled = !state.document || ![...state.decisions.values()].includes("accepted");
  $("#save-state").textContent = state.document ? `${reviewedAll} 個段落已審查 · 尚未寫回正式稿` : "尚未選擇文件";
}

function filteredSegments() {
  if (!state.document) return [];
  if (state.languageFilter === "all") return state.document.segments;
  return state.document.segments.filter((segment) => segment.language === state.languageFilter || segment.language === "shared");
}

function displayLanguage() {
  if (state.languageFilter !== "all") return state.languageFilter;
  return ["en", "zh-TW"].includes(state.selected?.language) ? state.selected.language : "en";
}

function updateDocumentTitle() {
  if (!state.document) return;
  const language = displayLanguage();
  const headings = state.document.segments.filter((segment) => segment.kind === "heading");
  const selectedIndex = state.selected ? state.document.segments.findIndex((segment) => segment.id === state.selected.id) : -1;
  const currentHeading = selectedIndex >= 0
    ? state.document.segments.slice(0, selectedIndex + 1).reverse().find((segment) => segment.kind === "heading" && (segment.language === language || segment.language === "shared"))
    : null;
  const heading = currentHeading
    ?? headings.find((segment) => segment.language === language)
    ?? headings.find((segment) => segment.language === "shared")
    ?? headings[0];
  $("#document-title").textContent = heading?.text
    .replace(/^#+\s*/, "")
    .replace(/[|*_`]/g, "")
    .trim() ?? state.document.path;
}

function filePresentation(file) {
  const parts = file.path.split("/");
  const leaf = parts.at(-1).replace(/\.md$/i, "");
  const nestedPart = parts.length > 1 ? parts[0] : null;
  const standalonePart = !nestedPart && /^Part_[IVX]+_/i.test(leaf) ? leaf : null;
  const groupKey = nestedPart ?? standalonePart ?? "front-matter";
  const groupSource = nestedPart ?? standalonePart;
  const partMatch = groupSource?.match(/^Part_([IVX]+)_(.+)$/i);
  const groupCode = partMatch ? `PART ${partMatch[1]}` : "FRONT MATTER";
  const groupTitle = partMatch ? partMatch[2].replaceAll("_", " ") : "前置內容";
  const itemMatch = leaf.match(/^(\d+)_?(.*)$/);
  const number = standalonePart ? "" : (itemMatch?.[1] ?? "");
  const rawTitle = standalonePart ? "完整篇章" : (itemMatch?.[2] || leaf);
  const title = rawTitle.replaceAll("_", " ").replace(/^(Opening|Preface|Contents)\s+/i, "$1 / ");
  return { ...file, groupKey, groupCode, groupTitle, number, title };
}

function chapterSections() {
  if (!state.document) return [];
  const language = displayLanguage();
  return state.document.segments.filter((segment) => {
    const heading = segment.text.match(/^(#{2,6})\s+(.+)$/s);
    if (!heading) return false;
    const title = heading[2].replace(/[|*_`]/g, "").trim();
    if (/^(EN|ZH|English Version|English Source|Traditional Chinese|繁體中文|中文)$/iu.test(title)) return false;
    return segment.language === language || segment.language === "shared";
  });
}

function renderFiles() {
  const query = $("#file-filter").value.trim().toLowerCase();
  const files = state.files
    .filter((file) => !/(^|\/)README\.md$/i.test(file.path))
    .filter((file) => file.label.toLowerCase().includes(query))
    .map(filePresentation);
  const groups = new Map();
  files.forEach((file) => {
    if (!groups.has(file.groupKey)) groups.set(file.groupKey, { code: file.groupCode, title: file.groupTitle, files: [] });
    groups.get(file.groupKey).files.push(file);
  });
  $("#file-list").innerHTML = [...groups.entries()].map(([groupKey, group]) => {
    const expanded = Boolean(query) || state.openGroups.has(groupKey) || group.files.some((file) => state.document?.path === file.path);
    return `<section class="toc-group ${expanded ? "expanded" : "collapsed"}">
    <button class="toc-group-heading" type="button" data-group="${escapeHtml(groupKey)}" aria-expanded="${expanded}">
      <span class="toc-group-label"><small>${escapeHtml(group.code)}</small><strong>${escapeHtml(group.title)}</strong></span><b aria-hidden="true">${expanded ? "−" : "+"}</b>
    </button>
    <div class="toc-children" ${expanded ? "" : "hidden"}>${group.files.map((file) => {
      const active = state.document?.path === file.path;
      const sections = active ? chapterSections() : [];
      return `<button class="file-item ${active ? "active" : ""}" data-path="${escapeHtml(file.path)}">
      ${file.number ? `<span class="file-number">${escapeHtml(file.number)}</span>` : '<span class="file-number">—</span>'}
      <span class="file-title">${escapeHtml(file.title)}</span>${file.draftExists ? "<small>DRAFT</small>" : ""}
    </button>${sections.length ? `<nav class="section-tree" aria-label="章內小節">${sections.map((section) => {
      const label = section.text.replace(/^#{2,6}\s+/, "").replace(/[|*_`]/g, "").trim();
      return `<button class="section-item ${state.selected?.id === section.id ? "active" : ""}" type="button" data-section="${section.id}"><span>↳</span><strong>${escapeHtml(label)}</strong></button>`;
    }).join("")}</nav>` : ""}`;
    }).join("")}</div>
  </section>`;
  }).join("");
}

function renderSegments() {
  if (!state.document) return;
  updateDocumentTitle();
  const segments = filteredSegments();
  $("#segment-list").innerHTML = segments.map((segment) => {
    const decision = state.decisions.get(segment.id) ?? "pending";
    const preview = escapeHtml(segment.text.replace(/^#{1,6}\s*/, "").slice(0, 240));
    const selected = state.selected?.id === segment.id;
    return `<button class="segment ${selected ? "selected" : ""} ${decision}" data-id="${segment.id}">
      <span class="segment-code">${segment.id.replace(/^WS-/, "")} · ${segment.language}</span>
      <span class="segment-preview">${preview || "（空段落）"}</span>
      <span class="decision">${decision === "accepted" ? "ACCEPTED" : decision === "rejected" ? "REJECTED" : "PENDING"}</span>
    </button>${selected ? inlineEditor(segment) : ""}`;
  }).join("") || '<p class="empty">這份文件沒有此語言的段落。</p>';
  updateProgress();
}

function selectSegment(id) {
  captureEditorDraft();
  state.selected = state.document?.segments.find((segment) => segment.id === id) ?? null;
  if (!state.selected) return;
  $("#segment-id").textContent = state.selected.id;
  $("#segment-language").textContent = state.selected.language;
  $("#segment-kind").textContent = state.selected.kind;
  renderSegments();
  renderFiles();
  document.querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" });
  const { english, chinese } = bilingualPair();
  const proposals = state.editMode === "chinese" ? chinese?.aiProposals : english?.aiProposals;
  if (state.aiAvailable && english && chinese && !proposals?.length) generate(state.editMode);
}

async function openDocument(path) {
  const documentData = await api(`/api/document?path=${encodeURIComponent(path)}`);
  documentData.segments = documentData.segments.map((segment) => ({ ...segment, originalText: segment.text }));
  state.document = documentData;
  state.selected = null;
  state.history = [];
  state.decisions = new Map(documentData.segments.map((segment) => [segment.id, "pending"]));
  const openedFile = state.files.find((file) => file.path === path);
  if (openedFile) state.openGroups.add(filePresentation(openedFile).groupKey);
  $("#language-filter").disabled = false;
  $("#document-path").textContent = documentData.path;
  $("#save-result").textContent = "";
  renderFiles();
  renderSegments();
  selectSegment(filteredSegments()[0]?.id);
}

function applyDecision(decision) {
  if (!state.selected) return;
  const { english, chinese } = bilingualPair();
  if (!english || !chinese) return;
  const previous = { id: state.selected.id, englishId: english.id, chineseId: chinese.id, englishText: english.text, chineseText: chinese.text, englishRewrite: english.rewrite, chineseProposal: chinese.proposal, reason: chinese.reason, englishDecision: state.decisions.get(english.id), chineseDecision: state.decisions.get(chinese.id) };
  state.history.push(previous);
  captureEditorDraft();
  if (decision === "accepted") { chinese.text = chinese.proposal; english.text = composeEnglish(english, english.rewrite); }
  if (decision === "rejected") { chinese.text = chinese.originalText; english.text = english.originalText; }
  state.decisions.set(chinese.id, decision);
  state.decisions.set(english.id, decision);
  renderSegments();
}

function contextFor(segment) {
  const sameLanguage = state.document.segments.filter((item) => item.language === segment.language);
  const index = sameLanguage.findIndex((item) => item.id === segment.id);
  return { before: sameLanguage[index - 1]?.text ?? "", after: sameLanguage[index + 1]?.text ?? "" };
}

async function generate(stage) {
  const { english, chinese } = bilingualPair();
  if (!english || !chinese) return;
  captureEditorDraft();
  const status = $(`#${stage}-status`);
  status.textContent = "正在生成……";
  try {
    const context = contextFor(english);
    const result = await api("/api/proposals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ stage, english: editableText({ text: english.originalText }), chinese: chinese.proposal, ...context }) });
    if (stage === "chinese") chinese.aiProposals = result.proposals;
    else english.aiProposals = result.proposals;
    renderSegments();
  } catch (error) {
    status.textContent = error.message;
  }
}

$("#file-filter").addEventListener("input", renderFiles);
$("#review-toggle").addEventListener("click", () => {
  const collapsed = $(".workspace").classList.toggle("review-collapsed");
  $("#review-toggle").setAttribute("aria-expanded", String(!collapsed));
  $("#review-toggle").setAttribute("aria-label", collapsed ? "展開右側審查欄" : "收合右側審查欄");
  $("#review-toggle span").textContent = collapsed ? "←" : "→";
});
$("#language-filter").addEventListener("change", (event) => {
  state.languageFilter = event.target.value;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, state.languageFilter);
  } catch {
    // The selection still works for this session when browser storage is unavailable.
  }
  const visible = filteredSegments();
  if (!visible.some((segment) => segment.id === state.selected?.id)) state.selected = null;
  renderSegments();
  if (!state.selected && visible[0]) selectSegment(visible[0].id);
  renderFiles();
});
$("#file-list").addEventListener("click", (event) => {
  const section = event.target.closest("[data-section]");
  if (section) {
    selectSegment(section.dataset.section);
    document.querySelector(`[data-section="${CSS.escape(section.dataset.section)}"]`)?.scrollIntoView({ block: "nearest" });
    return;
  }
  const group = event.target.closest("[data-group]");
  if (group) {
    const key = group.dataset.group;
    if (state.openGroups.has(key)) state.openGroups.delete(key);
    else state.openGroups.add(key);
    renderFiles();
    return;
  }
  const file = event.target.closest("[data-path]");
  if (file) openDocument(file.dataset.path);
});
$("#segment-list").addEventListener("click", (event) => {
  const editMode = event.target.closest("[data-edit-mode]")?.dataset.editMode;
  if (editMode) {
    captureEditorDraft();
    state.editMode = editMode;
    return renderSegments();
  }
  const generateStage = event.target.closest("[data-generate]")?.dataset.generate;
  if (generateStage) return generate(generateStage);
  const proposalButton = event.target.closest("[data-use-proposal]");
  if (proposalButton) {
    const { english, chinese } = bilingualPair();
    if (!english || !chinese) return;
    const stage = proposalButton.dataset.useProposal;
    const proposal = (stage === "chinese" ? chinese.aiProposals : english.aiProposals)?.[Number(proposalButton.dataset.proposalIndex)];
    if (!proposal) return;
    if (stage === "chinese") { chinese.proposal = proposal.text; chinese.selectedProposalIndex = Number(proposalButton.dataset.proposalIndex); }
    else { english.rewrite = proposal.text; english.selectedProposalIndex = Number(proposalButton.dataset.proposalIndex); }
    renderSegments();
    document.querySelector(`[data-editor-for="${CSS.escape(state.selected.id)}"] textarea`)?.focus();
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "next-mode") {
    captureEditorDraft();
    state.editMode = "english";
    return renderSegments();
  }
  if (action === "accept") return applyDecision("accepted");
  if (action === "reject") return applyDecision("rejected");
  if (action !== "undo") {
    const segment = event.target.closest("[data-id]");
    if (segment) selectSegment(segment.dataset.id);
    return;
  }
  const previous = state.history.pop();
  if (!previous || !state.document) return;
  const english = state.document.segments.find((item) => item.id === previous.englishId);
  const chinese = state.document.segments.find((item) => item.id === previous.chineseId);
  if (!english || !chinese) return;
  Object.assign(english, { text: previous.englishText, rewrite: previous.englishRewrite });
  Object.assign(chinese, { text: previous.chineseText, proposal: previous.chineseProposal, reason: previous.reason });
  state.decisions.set(english.id, previous.englishDecision ?? "pending");
  state.decisions.set(chinese.id, previous.chineseDecision ?? "pending");
  selectSegment(previous.id);
});
$("#save-draft").addEventListener("click", async () => {
  if (!state.document) return;
  $("#save-result").textContent = "正在保存……";
  try {
    const result = await api("/api/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      path: state.document.path,
      segments: state.document.segments.map(({ id, text }) => ({ id, text })),
      confirmProtectedChanges: $("#confirm-terms").checked,
    }) });
    $("#save-result").textContent = `已保存：${result.saved}`;
    state.files.find((file) => file.path === state.document.path).draftExists = true;
    renderFiles();
  } catch (error) {
    $("#save-result").textContent = error.status === 409 ? `術語變動：${error.value.changes.map((item) => `${item.term} ${item.before}→${item.after}`).join("、")}` : error.message;
  }
});

Promise.all([api("/api/files"), api("/api/terms"), api("/api/status")]).then(([files, terms, status]) => {
  state.files = files;
  state.aiAvailable = status.aiAvailable;
  renderFiles();
  $("#term-list").innerHTML = terms.map((term) => `<div><strong>${escapeHtml(term.en)}</strong><span>${escapeHtml(term.zh)}</span><small>${escapeHtml(term.rule)}</small></div>`).join("");
}).catch((error) => { $("#save-state").textContent = error.message; });
