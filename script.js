/* ==========================================================================
   script.js — Beacon Help Center (public site)
   FAQs, categories, views/helpful counts, contact messages and newsletter
   signups now live in MySQL, served through the PHP files in /api. Only
   per-browser personalization (bookmarks, favorites, likes, theme,
   language, search history, recently viewed) stays in LocalStorage —
   that's device-specific preference, not shared application data.
   ========================================================================== */
"use strict";

/* ---------------------------------------------------------------------- */
/* 1. API LAYER (MySQL via PHP)                                           */
/* ---------------------------------------------------------------------- */
const API_BASE = "api/";

async function apiRequest(endpoint, options = {}) {
  try {
    const res = await fetch(API_BASE + endpoint, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      throw new Error(data.error || `Request to ${endpoint} failed (${res.status})`);
    }
    return data;
  } catch (err) {
    showToast(`Couldn't reach the database. Is your PHP/MySQL server running? (${err.message})`, "error");
    throw err;
  }
}
const apiGet = (endpoint) => apiRequest(endpoint);
const apiPost = (endpoint, body) => apiRequest(endpoint, { method: "POST", body: JSON.stringify(body) });

/* In-memory cache of what's currently in the database, refreshed on load
   and after every write so the UI never has to guess. */
let FAQS_CACHE = [];
let CATEGORIES_CACHE = [];

async function loadData() {
  const [faqRes, catRes] = await Promise.all([apiGet("get_faqs.php"), apiGet("get_categories.php")]);
  FAQS_CACHE = faqRes.faqs || [];
  CATEGORIES_CACHE = catRes.categories || [];
}
function getFaqs() { return FAQS_CACHE; }
function getCategories() { return CATEGORIES_CACHE; }

/* ---------------------------------------------------------------------- */
/* 1b. LOCALSTORAGE LAYER — personalization only (not FAQ content)        */
/* ---------------------------------------------------------------------- */
const Store = {
  keys: {
    theme: "beacon_theme",
    lang: "beacon_lang",
    bookmarks: "beacon_bookmarks",
    favorites: "beacon_favorites",
    liked: "beacon_liked",
    helpfulVoted: "beacon_helpful_voted",
    recentlyViewed: "beacon_recent",
    searchHistory: "beacon_search_history",
    admin: "beacon_admin_session"
  },
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full/blocked */ }
  }
};

/* ---------------------------------------------------------------------- */
/* 2. I18N (English / Hindi)                                              */
/* ---------------------------------------------------------------------- */
const I18N = {
  en: {
    nav_home:"Home", nav_categories:"Categories", nav_faqs:"FAQs", nav_contact:"Contact", nav_admin:"Admin",
    hero_title:"Find your way to an answer", hero_sub:"Search 35+ guides across account, billing, orders, security and more — or ask our assistant directly.",
    stat_articles:"Articles", stat_categories:"Categories", stat_views:"Views logged",
    cat_eyebrow:"BROWSE", cat_title:"Explore by topic", cat_sub:"Pick a category to jump straight to relevant articles.",
    faq_eyebrow:"KNOWLEDGE BASE", faq_title:"Frequently asked questions",
    sort_newest:"Newest", sort_oldest:"Oldest", sort_views:"Most Viewed", sort_helpful:"Most Helpful",
    reset_filters:"Reset", no_results_title:"No FAQ found", no_results_sub:"Try a different keyword or reset your filters.",
    recent_title:"Recently viewed",
    contact_eyebrow:"STILL STUCK?", contact_title:"Contact support", contact_sub:"Can't find what you're looking for? Send us a message and our team will get back within one business day.",
    form_name:"Name", form_email:"Email", form_subject:"Subject", form_message:"Message", form_newsletter:"Subscribe to product updates", form_submit:"Send message",
    err_required:"This field is required.", err_email:"Enter a valid email address.",
    footer_product:"Product", footer_company:"Company", footer_about:"About", footer_legal:"Legal", footer_privacy:"Privacy Policy", footer_terms:"Terms & Conditions",
    footer_newsletter:"Newsletter", footer_tagline:"Built with HTML, CSS & vanilla JS — no backend required.",
    saved_title:"Saved & Favorite FAQs",
    toast_helpful:"Marked as helpful!", toast_liked:"Added to likes!", toast_bookmarked:"Bookmarked!", toast_unbookmarked:"Removed from bookmarks",
    toast_copied:"Link copied to clipboard!", toast_contact_ok:"Message sent successfully!", toast_newsletter_ok:"Subscribed! Welcome aboard.",
    chat_greeting:"Hi! I'm the Beacon assistant. Ask me about your account, payments, orders, or type a keyword and I'll find matching FAQs."
  },
  hi: {
    nav_home:"होम", nav_categories:"श्रेणियाँ", nav_faqs:"सामान्य प्रश्न", nav_contact:"संपर्क करें", nav_admin:"एडमिन",
    hero_title:"अपने सवाल का जवाब पाएँ", hero_sub:"खाता, भुगतान, ऑर्डर, सुरक्षा और अन्य विषयों पर 35+ गाइड खोजें — या सीधे हमारे सहायक से पूछें।",
    stat_articles:"लेख", stat_categories:"श्रेणियाँ", stat_views:"कुल विज़िट",
    cat_eyebrow:"ब्राउज़ करें", cat_title:"विषय अनुसार देखें", cat_sub:"संबंधित लेखों तक पहुँचने के लिए एक श्रेणी चुनें।",
    faq_eyebrow:"ज्ञान आधार", faq_title:"अक्सर पूछे जाने वाले सवाल",
    sort_newest:"नवीनतम", sort_oldest:"पुराने", sort_views:"सर्वाधिक देखे गए", sort_helpful:"सर्वाधिक सहायक",
    reset_filters:"रीसेट करें", no_results_title:"कोई FAQ नहीं मिला", no_results_sub:"कोई और कीवर्ड आज़माएँ या फ़िल्टर रीसेट करें।",
    recent_title:"हाल ही में देखे गए",
    contact_eyebrow:"अभी भी अटके हैं?", contact_title:"सहायता से संपर्क करें", contact_sub:"जो खोज रहे हैं वह नहीं मिला? हमें संदेश भेजें, हमारी टीम एक कार्यदिवस में जवाब देगी।",
    form_name:"नाम", form_email:"ईमेल", form_subject:"विषय", form_message:"संदेश", form_newsletter:"उत्पाद अपडेट के लिए सब्सक्राइब करें", form_submit:"संदेश भेजें",
    err_required:"यह फ़ील्ड आवश्यक है।", err_email:"एक मान्य ईमेल पता दर्ज करें।",
    footer_product:"उत्पाद", footer_company:"कंपनी", footer_about:"हमारे बारे में", footer_legal:"कानूनी", footer_privacy:"गोपनीयता नीति", footer_terms:"नियम व शर्तें",
    footer_newsletter:"न्यूज़लेटर", footer_tagline:"HTML, CSS और वेनिला JS से बना — किसी बैकएंड की आवश्यकता नहीं।",
    saved_title:"सहेजे गए और पसंदीदा FAQ",
    toast_helpful:"सहायक के रूप में चिह्नित किया गया!", toast_liked:"पसंद में जोड़ा गया!", toast_bookmarked:"बुकमार्क किया गया!", toast_unbookmarked:"बुकमार्क से हटाया गया",
    toast_copied:"लिंक क्लिपबोर्ड पर कॉपी हुआ!", toast_contact_ok:"संदेश सफलतापूर्वक भेजा गया!", toast_newsletter_ok:"सब्सक्राइब हो गया! स्वागत है।",
    chat_greeting:"नमस्ते! मैं Beacon सहायक हूँ। खाता, भुगतान, ऑर्डर के बारे में पूछें या कोई कीवर्ड टाइप करें।"
  }
};

function applyLanguage(lang) {
  const dict = I18N[lang] || I18N.en;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
  document.documentElement.lang = lang;
  Store.set(Store.keys.lang, lang);
}

/* ---------------------------------------------------------------------- */
/* 3. TOASTS                                                              */
/* ---------------------------------------------------------------------- */
function showToast(message, type = "success") {
  const stack = document.getElementById("toastStack");
  if (!stack) return;
  const icons = { success: "fa-circle-check", error: "fa-circle-exclamation", info: "fa-circle-info" };
  const colors = { success: "#35C99B", error: "#FF6B6B", info: "#FFB238" };
  const el = document.createElement("div");
  el.className = "toast-item";
  el.style.cssText = `background:var(--surface);border:1px solid var(--border);border-left:4px solid ${colors[type]};
    color:var(--text);padding:.8rem 1.1rem;border-radius:12px;box-shadow:var(--shadow-soft);
    display:flex;align-items:center;gap:.6rem;min-width:240px;font-size:.88rem;animation:toast-in .3s ease;`;
  el.innerHTML = `<i class="fa-solid ${icons[type]}" style="color:${colors[type]}"></i><span>${message}</span>`;
  stack.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateX(20px)"; el.style.transition = "all .3s ease"; setTimeout(() => el.remove(), 300); }, 3200);
}
const styleEl = document.createElement("style");
styleEl.textContent = "@keyframes toast-in{from{opacity:0;transform:translateX(30px);}to{opacity:1;transform:none;}}";
document.head.appendChild(styleEl);

/* ---------------------------------------------------------------------- */
/* 4. THEME + LANGUAGE INIT                                               */
/* ---------------------------------------------------------------------- */
function initTheme() {
  const saved = Store.get(Store.keys.theme, "light");
  document.documentElement.setAttribute("data-theme", saved);
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    Store.set(Store.keys.theme, next);
  });
}
function initLanguage() {
  const saved = Store.get(Store.keys.lang, "en");
  const sel = document.getElementById("langSwitch");
  if (sel) sel.value = saved;
  applyLanguage(saved);
  sel?.addEventListener("change", e => applyLanguage(e.target.value));
}

/* ---------------------------------------------------------------------- */
/* 5. CATEGORY GRID                                                       */
/* ---------------------------------------------------------------------- */
let activeCategory = "all";
function renderCategories() {
  const grid = document.getElementById("categoryGrid");
  if (!grid) return;
  const cats = getCategories();
  const faqs = getFaqs();
  let html = "";
  cats.forEach((c, i) => {
    const count = faqs.filter(f => f.category === c.id).length;
    html += `
    <div class="col-6 col-md-3" data-aos="fade-up" data-aos-delay="${i * 40}">
      <div class="cat-card ${activeCategory === c.id ? "active" : ""}" data-cat="${c.id}">
        <div class="cat-icon"><i class="fa-solid ${c.icon}"></i></div>
        <h5>${c.name}</h5>
        <span class="count">${count} articles</span>
      </div>
    </div>`;
  });
  grid.innerHTML = html;
  grid.querySelectorAll(".cat-card").forEach(card => {
    card.addEventListener("click", () => {
      activeCategory = activeCategory === card.dataset.cat ? "all" : card.dataset.cat;
      renderCategories();
      syncFilterChips();
      renderFaqList();
      document.getElementById("faqs")?.scrollIntoView({ behavior: "smooth" });
    });
  });
}

/* ---------------------------------------------------------------------- */
/* 6. FILTER CHIPS + SORT                                                 */
/* ---------------------------------------------------------------------- */
function renderFilterChips() {
  const wrap = document.getElementById("filterChips");
  if (!wrap) return;
  const cats = getCategories();
  let html = `<button class="filter-chip ${activeCategory === "all" ? "active" : ""}" data-cat="all">All</button>`;
  cats.forEach(c => { html += `<button class="filter-chip ${activeCategory === c.id ? "active" : ""}" data-cat="${c.id}">${c.name}</button>`; });
  wrap.innerHTML = html;
  wrap.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      activeCategory = chip.dataset.cat;
      syncFilterChips();
      renderCategories();
      renderFaqList();
    });
  });
}
function syncFilterChips() {
  document.querySelectorAll("#filterChips .filter-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.cat === activeCategory);
  });
}
document.getElementById("resetFilters")?.addEventListener("click", () => {
  activeCategory = "all";
  document.getElementById("searchInput").value = "";
  document.getElementById("sortSelect").value = "newest";
  syncFilterChips();
  renderCategories();
  renderFaqList();
});
document.getElementById("sortSelect")?.addEventListener("change", renderFaqList);

/* ---------------------------------------------------------------------- */
/* 7. SEARCH + SUGGESTIONS + HISTORY                                      */
/* ---------------------------------------------------------------------- */
let searchTerm = "";
function highlight(text, term) {
  if (!term) return text;
  const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
  return text.replace(re, "<mark>$1</mark>");
}
function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

/* ---- Smart / fuzzy matching -------------------------------------------
   Real questions rarely match a FAQ word-for-word ("how to get refund
   from amazon" vs our FAQ "How do I request a refund?"). Instead of
   requiring the whole typed phrase to appear verbatim, we break the
   query into meaningful words (ignoring filler words in EN/HI), then
   score each FAQ by how many of those words it contains. Anything with
   at least one meaningful word match is considered a result, and the
   best matches float to the top when a search is active.           ---- */
const SEARCH_STOPWORDS = new Set([
  "how","do","does","did","to","from","get","the","a","an","is","are","my","for","of","on","in",
  "and","or","please","can","could","you","tell","me","what","where","when","why","which","who",
  "i","it","this","that","with","about","need","want","help","kaise","se","ka","ki","ke","ko",
  "hai","kya","mera","meri","mujhe","batao","karo","kro","chahiye","aur","ke liye","liye","par","pe"
]);
function tokenizeQuery(term) {
  return term.toLowerCase().split(/[^a-z0-9\u0900-\u097F]+/i)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !SEARCH_STOPWORDS.has(w));
}
function faqMatchScore(faq, term) {
  const tokens = tokenizeQuery(term);
  if (!tokens.length) return 0;
  const haystack = `${faq.question} ${faq.answer} ${faq.tags.join(" ")}`.toLowerCase();
  let matched = 0;
  tokens.forEach(t => { if (haystack.includes(t)) matched++; });
  return matched / tokens.length; // 0..1 — fraction of meaningful words found
}
function addSearchHistory(term) {
  if (!term.trim()) return;
  let history = Store.get(Store.keys.searchHistory, []);
  history = [term, ...history.filter(h => h.toLowerCase() !== term.toLowerCase())].slice(0, 8);
  Store.set(Store.keys.searchHistory, history);
}
function renderSuggestions(term) {
  const panel = document.getElementById("suggestionsPanel");
  if (!panel) return;
  const faqs = getFaqs();
  let items = [];
  if (term.trim()) {
    items = faqs
      .map(f => ({ f, score: faqMatchScore(f, term) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(x => ({ label: highlight(x.f.question, term), id: x.f.id }));
  } else {
    const history = Store.get(Store.keys.searchHistory, []);
    items = history.slice(0, 6).map(h => ({ label: `<i class="fa-solid fa-clock-rotate-left me-2 text-muted"></i>${h}`, id: null, term: h }));
  }
  if (!items.length) { panel.classList.remove("show"); panel.innerHTML = ""; return; }
  panel.innerHTML = items.map(it => `<div class="sugg-item" data-id="${it.id ?? ""}" data-term="${it.term ?? ""}"><span>${it.label}</span><i class="fa-solid fa-arrow-right small text-muted"></i></div>`).join("");
  panel.classList.add("show");
  panel.querySelectorAll(".sugg-item").forEach(item => {
    item.addEventListener("click", () => {
      const input = document.getElementById("searchInput");
      if (item.dataset.id) {
        const faq = faqs.find(f => f.id == item.dataset.id);
        input.value = faq.question;
        searchTerm = faq.question;
      } else {
        input.value = item.dataset.term;
        searchTerm = item.dataset.term;
      }
      panel.classList.remove("show");
      addSearchHistory(searchTerm);
      renderFaqList();
      document.getElementById("faqs")?.scrollIntoView({ behavior: "smooth" });
    });
  });
}
function initSearch() {
  const input = document.getElementById("searchInput");
  if (!input) return;
  const onInput = debounce(() => {
    searchTerm = input.value;
    renderSuggestions(searchTerm);
    renderFaqList();
  }, 220);
  input.addEventListener("input", onInput);
  input.addEventListener("focus", () => renderSuggestions(input.value));
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { addSearchHistory(input.value); document.getElementById("suggestionsPanel").classList.remove("show"); renderFaqList(); }
  });
  document.addEventListener("click", e => {
    if (!e.target.closest(".search-beacon")) document.getElementById("suggestionsPanel")?.classList.remove("show");
  });
}

/* ---------------------------------------------------------------------- */
/* 8. VOICE SEARCH (Web Speech API)                                       */
/* ---------------------------------------------------------------------- */
function initVoiceSearch() {
  const btn = document.getElementById("voiceSearchBtn");
  if (!btn) return;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { btn.style.display = "none"; return; }
  const recognition = new SpeechRecognition();
  recognition.lang = document.getElementById("langSwitch")?.value === "hi" ? "hi-IN" : "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  btn.addEventListener("click", () => {
    try {
      recognition.lang = document.getElementById("langSwitch")?.value === "hi" ? "hi-IN" : "en-US";
      recognition.start();
      btn.classList.add("listening");
    } catch (e) { /* already started */ }
  });
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById("searchInput").value = transcript;
    searchTerm = transcript;
    addSearchHistory(transcript);
    renderFaqList();
    showToast(`Searched: "${transcript}"`, "info");
  };
  recognition.onend = () => btn.classList.remove("listening");
  recognition.onerror = () => { btn.classList.remove("listening"); showToast("Voice search couldn't understand that.", "error"); };
}

/* ---------------------------------------------------------------------- */
/* 9. USER INTERACTION STATE (helpful / like / bookmark / favorite)       */
/* ---------------------------------------------------------------------- */
function toggleSetMember(key, id) {
  let arr = Store.get(key, []);
  const idx = arr.indexOf(id);
  if (idx > -1) { arr.splice(idx, 1); Store.set(key, arr); return false; }
  arr.push(id); Store.set(key, arr); return true;
}
function isSetMember(key, id) { return Store.get(key, []).includes(id); }

function markHelpful(id) {
  if (isSetMember(Store.keys.helpfulVoted, id)) { showToast("You already marked this helpful.", "info"); return; }
  const faq = getFaqs().find(f => f.id === id);
  if (!faq) return;
  faq.helpful += 1; // optimistic UI update
  toggleSetMember(Store.keys.helpfulVoted, id);
  renderFaqList(true);
  apiPost("mark_helpful.php", { id })
    .then(() => showToast(I18N[currentLang()].toast_helpful, "success"))
    .catch(() => { faq.helpful -= 1; renderFaqList(true); }); // roll back on failure
}
function toggleLike(id, btn) {
  const active = toggleSetMember(Store.keys.liked, id);
  btn.classList.toggle("is-active", active);
  if (active) showToast(I18N[currentLang()].toast_liked, "success");
}
function toggleBookmark(id, btn) {
  const active = toggleSetMember(Store.keys.bookmarks, id);
  if (btn) btn.classList.toggle("is-active", active);
  showToast(active ? I18N[currentLang()].toast_bookmarked : I18N[currentLang()].toast_unbookmarked, active ? "success" : "info");
  renderSavedPanel();
}
function toggleFavorite(id, btn) {
  const active = toggleSetMember(Store.keys.favorites, id);
  if (btn) btn.classList.toggle("is-active", active);
  renderSavedPanel();
}
function currentLang() { return Store.get(Store.keys.lang, "en"); }

function pushRecentlyViewed(id) {
  let recent = Store.get(Store.keys.recentlyViewed, []);
  recent = [id, ...recent.filter(r => r !== id)].slice(0, 6);
  Store.set(Store.keys.recentlyViewed, recent);
  renderRecentGrid();
}
function incrementViews(id) {
  const faq = getFaqs().find(f => f.id === id);
  if (!faq) return;
  faq.views += 1; // optimistic UI update, persisted in the background
  apiPost("increment_view.php", { id }).catch(() => { /* view counts are best-effort */ });
}

/* ---------------------------------------------------------------------- */
/* 10. FAQ LIST RENDER                                                    */
/* ---------------------------------------------------------------------- */
function getFilteredSortedFaqs() {
  let faqs = getFaqs();
  if (activeCategory !== "all") faqs = faqs.filter(f => f.category === activeCategory);

  const isSearching = searchTerm.trim().length > 0;
  let scored = null;
  if (isSearching) {
    scored = new Map();
    faqs = faqs.filter(f => {
      const score = faqMatchScore(f, searchTerm);
      if (score > 0) scored.set(f.id, score);
      return score > 0;
    });
  }

  const sortMode = document.getElementById("sortSelect")?.value || "newest";
  faqs = [...faqs].sort((a, b) => {
    // While searching, show the closest matches first; the chosen sort
    // mode only breaks ties between equally-relevant results.
    if (isSearching) {
      const diff = scored.get(b.id) - scored.get(a.id);
      if (diff !== 0) return diff;
    }
    if (sortMode === "newest") return new Date(b.date) - new Date(a.date);
    if (sortMode === "oldest") return new Date(a.date) - new Date(b.date);
    if (sortMode === "views") return b.views - a.views;
    if (sortMode === "helpful") return b.helpful - a.helpful;
    return 0;
  });
  return faqs;
}

function renderFaqList(skipSkeleton) {
  const container = document.getElementById("faqAccordion");
  const noResults = document.getElementById("noResults");
  const meta = document.getElementById("resultsMeta");
  if (!container) return;

  const render = () => {
    const faqs = getFilteredSortedFaqs();
    const cats = getCategories();
    meta.textContent = `${faqs.length} result${faqs.length === 1 ? "" : "s"}${searchTerm ? ` for "${searchTerm}"` : ""}`;

    if (!faqs.length) {
      container.innerHTML = "";
      noResults.classList.remove("d-none");
      return;
    }
    noResults.classList.add("d-none");

    container.innerHTML = faqs.map((f, idx) => {
      const cat = cats.find(c => c.id === f.category);
      const isLiked = isSetMember(Store.keys.liked, f.id);
      const isBookmarked = isSetMember(Store.keys.bookmarks, f.id);
      const isFav = isSetMember(Store.keys.favorites, f.id);
      return `
      <div class="accordion-item" data-aos="fade-up" data-aos-delay="${Math.min(idx * 25, 200)}">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq-${f.id}">
            ${highlight(f.question, searchTerm)}
          </button>
        </h2>
        <div id="faq-${f.id}" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
          <div class="accordion-body">
            <p class="mb-2">${highlight(f.answer, searchTerm)}</p>
            <div class="faq-meta">
              <span class="badge-tag"><i class="fa-solid ${cat?.icon || "fa-tag"} me-1"></i>${cat?.name || f.category}</span>
              ${f.tags.map(t => `<span class="badge-tag">#${t}</span>`).join("")}
              <span class="badge-tag"><i class="fa-regular fa-calendar me-1"></i>${f.date}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span class="faq-stat"><i class="fa-solid fa-eye me-1"></i>${f.views} views · <i class="fa-solid fa-thumbs-up me-1"></i>${f.helpful} helpful</span>
            </div>
            <div class="faq-actions">
              <button data-action="helpful" data-id="${f.id}"><i class="fa-solid fa-thumbs-up"></i> Helpful</button>
              <button data-action="like" data-id="${f.id}" class="${isLiked ? "is-active" : ""}"><i class="fa-solid fa-heart"></i> Like</button>
              <button data-action="bookmark" data-id="${f.id}" class="${isBookmarked ? "is-active" : ""}"><i class="fa-solid fa-bookmark"></i> Save</button>
              <button data-action="favorite" data-id="${f.id}" class="${isFav ? "is-active" : ""}"><i class="fa-solid fa-star"></i> Favorite</button>
              <button data-action="copy" data-id="${f.id}"><i class="fa-solid fa-link"></i> Copy link</button>
              <button data-action="copyanswer" data-id="${f.id}"><i class="fa-regular fa-copy"></i> Copy answer</button>
              <button data-action="print" data-id="${f.id}"><i class="fa-solid fa-print"></i> Print</button>
              <button data-action="pdf" data-id="${f.id}"><i class="fa-solid fa-file-pdf"></i> PDF</button>
              <button data-action="share-wa" data-id="${f.id}"><i class="fa-brands fa-whatsapp"></i></button>
              <button data-action="share-fb" data-id="${f.id}"><i class="fa-brands fa-facebook-f"></i></button>
              <button data-action="share-x" data-id="${f.id}"><i class="fa-brands fa-x-twitter"></i></button>
            </div>
          </div>
        </div>
      </div>`;
    }).join("");

    // bind expand → view tracking
    container.querySelectorAll(".accordion-collapse").forEach(el => {
      el.addEventListener("show.bs.collapse", () => {
        const id = parseInt(el.id.replace("faq-", ""));
        incrementViews(id);
        pushRecentlyViewed(id);
      });
    });
    // bind actions
    container.querySelectorAll("[data-action]").forEach(btn => bindFaqAction(btn));
    if (window.AOS) AOS.refreshHard();
  };

  if (skipSkeleton) { render(); return; }
  const skWrap = document.getElementById("skeletonWrap");
  skWrap.innerHTML = `<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>`;
  container.style.display = "none";
  setTimeout(() => { skWrap.innerHTML = ""; container.style.display = ""; render(); }, 260);
}

function bindFaqAction(btn) {
  const id = parseInt(btn.dataset.id);
  const faq = getFaqs().find(f => f.id === id);
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const action = btn.dataset.action;
    const url = `${location.origin}${location.pathname}#faq-${id}`;
    if (action === "helpful") markHelpful(id);
    else if (action === "like") toggleLike(id, btn);
    else if (action === "bookmark") toggleBookmark(id, btn);
    else if (action === "favorite") toggleFavorite(id, btn);
    else if (action === "copy") { navigator.clipboard?.writeText(url); showToast(I18N[currentLang()].toast_copied, "success"); }
    else if (action === "copyanswer") { navigator.clipboard?.writeText(faq.answer); showToast("Answer copied!", "success"); }
    else if (action === "print") printFaq(faq);
    else if (action === "pdf") downloadFaqAsPdf(faq);
    else if (action === "share-wa") window.open(`https://wa.me/?text=${encodeURIComponent(faq.question + " — " + url)}`, "_blank");
    else if (action === "share-fb") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
    else if (action === "share-x") window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(faq.question)}&url=${encodeURIComponent(url)}`, "_blank");
  });
}

function printFaq(faq) {
  const w = window.open("", "_blank", "width=600,height=700");
  w.document.write(`<html><head><title>${faq.question}</title>
    <style>body{font-family:Arial,sans-serif;padding:2rem;color:#1F2937;} h1{font-size:1.3rem;} .meta{color:#5B6B7C;font-size:.85rem;margin-top:1rem;}</style>
    </head><body><h1>${faq.question}</h1><p>${faq.answer}</p><div class="meta">Category: ${faq.category} · Tags: ${faq.tags.join(", ")}</div></body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
function downloadFaqAsPdf(faq) {
  // Lightweight "PDF" export without external libs: generates a print-ready
  // document and triggers the browser's Save-as-PDF via print dialog.
  showToast("Opening print dialog — choose 'Save as PDF' as the destination.", "info");
  printFaq(faq);
}

/* ---------------------------------------------------------------------- */
/* 11. RECENTLY VIEWED + SAVED PANEL                                      */
/* ---------------------------------------------------------------------- */
function renderRecentGrid() {
  const grid = document.getElementById("recentGrid");
  const section = document.getElementById("recentSection");
  if (!grid) return;
  const ids = Store.get(Store.keys.recentlyViewed, []);
  if (!ids.length) { section.classList.add("d-none"); return; }
  section.classList.remove("d-none");
  const faqs = getFaqs();
  grid.innerHTML = ids.map(id => {
    const f = faqs.find(x => x.id === id);
    if (!f) return "";
    return `<div class="col-md-4"><div class="cat-card" data-jump="${f.id}"><h5>${f.question}</h5><span class="count"><i class="fa-solid fa-eye me-1"></i>${f.views} views</span></div></div>`;
  }).join("");
  grid.querySelectorAll("[data-jump]").forEach(card => {
    card.addEventListener("click", () => {
      searchTerm = "";
      activeCategory = "all";
      document.getElementById("searchInput").value = "";
      renderFaqList(true);
      setTimeout(() => {
        const el = document.getElementById(`faq-${card.dataset.jump}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        bootstrap.Collapse.getOrCreateInstance(el).show();
      }, 150);
    });
  });
}
function renderSavedPanel() {
  const list = document.getElementById("savedList");
  if (!list) return;
  const faqs = getFaqs();
  const bookmarks = Store.get(Store.keys.bookmarks, []);
  const favorites = Store.get(Store.keys.favorites, []);
  const section = (title, ids, emptyMsg) => `
    <h6 class="mt-2">${title}</h6>
    ${ids.length ? ids.map(id => {
      const f = faqs.find(x => x.id === id);
      return f ? `<div class="d-flex justify-content-between align-items-center border-bottom py-2" style="border-color:var(--border) !important;">
        <span class="small">${f.question}</span></div>` : "";
    }).join("") : `<p class="text-muted small">${emptyMsg}</p>`}
  `;
  list.innerHTML = section("Bookmarked", bookmarks, "No bookmarks yet.") + section("Favorites", favorites, "No favorites yet.");
}

/* ---------------------------------------------------------------------- */
/* 12. HERO STATS                                                         */
/* ---------------------------------------------------------------------- */
function renderStats() {
  const faqs = getFaqs();
  const cats = getCategories();
  const totalViews = faqs.reduce((a, f) => a + f.views, 0);
  animateCount("statTotalFaqs", faqs.length);
  animateCount("statTotalCats", cats.length);
  animateCount("statTotalViews", totalViews);
}
function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 40));
  const t = setInterval(() => {
    cur += step;
    if (cur >= target) { cur = target; clearInterval(t); }
    el.textContent = cur.toLocaleString();
  }, 20);
}

/* ---------------------------------------------------------------------- */
/* 14. CONTACT + NEWSLETTER FORMS                                         */
/* ---------------------------------------------------------------------- */
function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

const CONTACT_VALIDATORS = {
  cfName: v => v.trim().length >= 2,
  cfEmail: v => validEmail(v.trim()),
  cfSubject: v => v.trim().length >= 3,
  cfMessage: v => v.trim().length >= 10
};
function validateContactField(el) {
  const isValid = CONTACT_VALIDATORS[el.id](el.value);
  el.classList.toggle("is-invalid", !isValid);
  el.classList.toggle("is-valid", isValid && el.value.trim() !== "");
  return isValid;
}
function initContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;
  const fields = ["cfName", "cfEmail", "cfSubject", "cfMessage"].map(id => document.getElementById(id));

  // Real-time: validate as the person types/leaves each field, not just on submit.
  fields.forEach(el => {
    el.addEventListener("input", () => { if (el.classList.contains("is-invalid") || el.classList.contains("is-valid")) validateContactField(el); });
    el.addEventListener("blur", () => validateContactField(el));
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const [name, email, subject, msg] = fields;
    const allValid = fields.map(validateContactField).every(Boolean);
    if (!allValid) { showToast("Please fix the highlighted fields.", "error"); return; }

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    apiPost("contact.php", {
      name: name.value.trim(), email: email.value.trim(),
      subject: subject.value.trim(), message: msg.value.trim()
    }).then(() => {
      showToast(I18N[currentLang()].toast_contact_ok, "success");
      form.reset();
      fields.forEach(el => el.classList.remove("is-invalid", "is-valid"));
    }).finally(() => { submitBtn.disabled = false; });
  });
}
function initNewsletterForm() {
  const form = document.getElementById("newsletterForm");
  if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    const email = document.getElementById("newsEmail");
    if (!validEmail(email.value)) { email.classList.add("is-invalid"); return; }
    email.classList.remove("is-invalid");
    apiPost("newsletter.php", { email: email.value.trim() }).then(() => {
      showToast(I18N[currentLang()].toast_newsletter_ok, "success");
      form.reset();
    });
  });
}

/* ---------------------------------------------------------------------- */
/* 15. UX: back-to-top, progress bar, ripple, shortcuts, custom cursor    */
/* ---------------------------------------------------------------------- */
function initScrollFx() {
  const backBtn = document.getElementById("back-to-top");
  const progress = document.getElementById("reading-progress");
  window.addEventListener("scroll", () => {
    const scrolled = window.scrollY;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${(scrolled / height) * 100}%`;
    backBtn.classList.toggle("show", scrolled > 400);
  });
  backBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}
function initRipple() {
  document.addEventListener("click", e => {
    const target = e.target.closest(".ripple");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const circle = document.createElement("span");
    const size = Math.max(rect.width, rect.height);
    circle.className = "ripple-el";
    circle.style.width = circle.style.height = `${size}px`;
    circle.style.left = `${e.clientX - rect.left - size / 2}px`;
    circle.style.top = `${e.clientY - rect.top - size / 2}px`;
    target.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  });
}
function initKeyboardShortcuts() {
  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault();
      document.getElementById("searchInput")?.focus();
    }
    if (e.key === "Escape") {
      document.getElementById("suggestionsPanel")?.classList.remove("show");
    }
  });
}
function initCustomCursor() {
  const cursor = document.getElementById("customCursor");
  if (!cursor || !matchMedia("(hover:hover) and (pointer:fine)").matches) return;
  window.addEventListener("mousemove", e => {
    cursor.style.left = `${e.clientX - 9}px`;
    cursor.style.top = `${e.clientY - 9}px`;
  });
  document.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("mouseenter", () => cursor.style.transform = "scale(1.8)");
    el.addEventListener("mouseleave", () => cursor.style.transform = "scale(1)");
  });
}

/* ---------------------------------------------------------------------- */
/* 16. SERVICE WORKER + PWA                                               */
/* ---------------------------------------------------------------------- */
function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => { /* offline support unavailable */ });
  }
}

/* ---------------------------------------------------------------------- */
/* 17. BOOTSTRAP / INIT SEQUENCE                                          */
/* ---------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  if (window.AOS) AOS.init({ duration: 600, once: true, offset: 40 });

  initTheme();
  initLanguage();
  initSearch();
  initVoiceSearch();
  initContactForm();
  initNewsletterForm();
  initScrollFx();
  initRipple();
  initKeyboardShortcuts();
  initCustomCursor();
  initServiceWorker();

  try {
    await loadData(); // pulls FAQs + categories from MySQL via api/*.php
  } catch (e) {
    // apiRequest already surfaced a toast explaining the DB connection issue
  }

  renderCategories();
  renderFilterChips();
  renderFaqList(true);
  renderRecentGrid();
  renderSavedPanel();
  renderStats();

  // deep-link support e.g. index.html#faq-7
  if (location.hash.startsWith("#faq-")) {
    setTimeout(() => {
      const el = document.querySelector(location.hash);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (el) bootstrap.Collapse.getOrCreateInstance(el).show();
    }, 400);
  }

  window.addEventListener("load", () => {
    setTimeout(() => document.getElementById("loading-screen")?.classList.add("hidden"), 350);
  });
});
