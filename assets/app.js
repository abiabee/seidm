
// SEIDM SPA — loads article index + post bodies from /data and /posts
let ARTICLES = [];
const app = document.getElementById('app');

const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'});

function setActiveNav(route) {
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const link = document.querySelector(`.nav-links a[data-nav="${route}"]`);
  if (link) link.classList.add('active');
}

function route() {
  const hash = location.hash || '#/';
  if (hash.startsWith('#/article/')) {
    const slug = decodeURIComponent(hash.split('#/article/')[1]);
    renderArticle(slug);
    setActiveNav('articles');
  } else if (hash.startsWith('#/about')) {
    renderAbout();
    setActiveNav('about');
  } else if (hash.startsWith('#/articles')) {
    renderArticles();
    setActiveNav('articles');
  } else {
    renderHome();
    setActiveNav('home');
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  app.focus();
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  // Load article index
  try {
    const res = await fetch('data/articles.json', { cache: 'no-store' });
    ARTICLES = await res.json();
  } catch (e) {
    console.error('Failed to load articles index:', e);
    ARTICLES = [];
  }
  route();
  setupSearchAndSubscribe();
});

// ---------------- VIEWS ----------------
function renderHero() {
  return `
    <section class="hero" aria-labelledby="site-title">
      <div class="grid-bg" aria-hidden="true"></div>
      <div class="formula" style="top:10%; left:8%; font-size:42px">π · Σ · ∫</div>
      <div class="formula" style="bottom:8%; right:6%; font-size:34px">x² + y² = r²</div>
      <h1 id="site-title">SEIDM — Math & Data Science</h1>
      <h2 style="margin:.25rem 0 .25rem; font-size: clamp(26px, 5vw, 40px)">Data Science leaders in Mexico</h2>
      <p class="muted">We are a student group trying to get involved in the art of creating, analyzing and interpreting data to get groundbreaking insights. Follow us in our journey through multidisciplinary projects with community and social impact.</p>
      <div class="mt-16 subscribe" role="region" aria-label="Email subscription">
        <label for="subEmail" class="sr-only">Email</label>
        <input id="subEmail" type="email" placeholder="you@school.edu" required />
        <button class="btn" id="subBtn">Subscribe</button>
        <span class="muted" id="subMsg" aria-live="polite"></span>
      </div>
    </section>
  `;
}

function renderCards(list) {
  if (!list || list.length === 0) return `<p class="muted center">No articles yet. Add one in <code>/data/articles.json</code>.</p>`;
  return `
    <section class="mt-24">
      <div class="grid">
        ${list.map(a => `
          <article class="card">
            <img src="${a.cover}" alt="Cover image for ${a.title}">
            <div class="body">
              <div class="flex"><span class="chip">${(a.tags && a.tags[0]) || 'post'}</span><span class="right muted">${fmtDate(a.date)}</span></div>
              <h3 style="margin:.4rem 0 .2rem"><a href="#/article/${encodeURIComponent(a.id)}">${a.title}</a></h3>
              <p class="muted" style="margin:0 0 .8rem">${a.summary}</p>
              <a class="btn secondary" href="#/article/${encodeURIComponent(a.id)}" aria-label="Read ${a.title}">Read</a>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderHome() {
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const list = q ? ARTICLES.filter(a => [a.title, a.summary, ...(a.tags||[])].join(' ').toLowerCase().includes(q)) : ARTICLES;
  app.innerHTML = `${renderHero()}${renderCards(list)}${renderContrib()}`;
  setupSubscribe();
}

function renderArticles() {
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const list = q ? ARTICLES.filter(a => [a.title, a.summary, ...(a.tags||[])].join(' ').toLowerCase().includes(q)) : ARTICLES;
  app.innerHTML = `
    <section class="hero" aria-label="Articles">
      <h1>Articles</h1>
      <p class="muted">Browse all posts from SEIDM.</p>
    </section>
    ${renderCards(list)}
  `;
}

async function renderArticle(slug) {
  const a = ARTICLES.find(x => x.id === slug);
  if (!a) { app.innerHTML = `<p>Article not found. <a href="#/">Go home</a>.</p>`; return; }

  let body = '';
  try {
    const res = await fetch(`posts/${slug}.html`, { cache: 'no-store' });
    body = await res.text();
  } catch (e) {
    console.error('Failed to load article body', e);
    body = `<p class="muted">Unable to load article body.</p>`;
  }

  app.innerHTML = `
    <a href="#/" class="muted">← Back</a>
    <article class="mt-16" aria-labelledby="title">
      <div class="flex" style="margin-bottom:6px">
        <span class="chip">${(a.tags && a.tags[0]) || 'post'}</span>
        <span class="muted">${fmtDate(a.date)}</span>
        <span class="muted">•</span>
        <span class="muted">${a.author}</span>
      </div>
      <h1 id="title">${a.title}</h1>
      ${a.cover ? `<img src="${a.cover}" alt="${a.title}" class="mt-16">` : ''}
      <div class="mt-16">${body}</div>
    </article>
    ${renderComments(slug)}
  `;
  bindComments(slug);
}

function renderAbout() {
  app.innerHTML = `
    <section class="hero">
      <div class="grid-bg" aria-hidden="true"></div>
      <h1>About SEIDM</h1>
      <p>SEIDM is a simple school blog focused on mathematics and data science. Posts are short, practical, and edited by students. Contribute via GitHub (see below).</p>
    </section>
    ${renderContrib()}
  `;
}

// ---------------- Subscribe + Search ----------------
function setupSubscribe() {
  const btn = document.getElementById('subBtn'); if (!btn) return;
  btn.onclick = (e)=>{
    e.preventDefault();
    const input = document.getElementById('subEmail');
    const msg = document.getElementById('subMsg');
    const email = (input.value||'').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = 'Please enter a valid email.'; return; }
    const key = 'seidm_subscribers';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    if (!list.includes(email)) list.push(email);
    localStorage.setItem(key, JSON.stringify(list));
    input.value='';
    msg.textContent = 'Subscribed locally ✔ (connect to Mailchimp, Buttondown, or Formspree when deploying)';
  };
}

function setupSearchAndSubscribe(){
  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');
  if (form) form.onsubmit = (e)=>{ e.preventDefault(); renderHome(); };
  if (input) input.oninput = ()=> renderHome();
}


// ---------------- Comments ----------------
function renderComments(slug){
  const key = `seidm_comments_${slug}`;
  const comments = JSON.parse(localStorage.getItem(key) || '[]');
  return `
    <section class="comments mt-24" aria-label="Comments">
      <h2>Comments (${comments.length})</h2>
      <div id="commentList">
        ${comments.map((c,i)=>`
          <div class="comment" data-index="${i}">
            <div class="flex">
              <strong>${escapeHtml(c.name || 'Anonymous')}</strong>
              <span class="muted">${fmtDate(c.date)}</span>
              <button class="right btn" data-del="${i}" title="Delete comment">Delete</button>
            </div>
            <p style="margin:.5rem 0 0; white-space: pre-wrap">${escapeHtml(c.text)}</p>
          </div>
        `).join('')}
      </div>
      <form id="commentForm" class="mt-16">
        <label class="sr-only" for="cname">Name</label>
        <input id="cname" placeholder="Name (optional)" style="background:#0e1424; color:var(--text); border:1px solid rgba(255,255,255,.06); border-radius:10px; padding:10px 12px; width:100%; margin-bottom:8px" />
        <label class="sr-only" for="ctext">Comment</label>
        <textarea id="ctext" required placeholder="Write a comment…" rows="4" style="background:#0e1424; color:var(--text); border:1px solid rgba(255,255,255,.06); border-radius:10px; padding:10px 12px; width:100%;"></textarea>
        <div class="flex" style="margin-top:10px">
          <button class="btn" type="submit">Post Comment</button>
          <span class="muted">Stored only on <em>this</em> browser.</span>
        </div>
      </form>
    </section>
  `;
}

function bindComments(slug){
  const key = `seidm_comments_${slug}`;
  const listEl = document.getElementById('commentList');
  const form = document.getElementById('commentForm');
  if (!listEl || !form) return;

  listEl.addEventListener('click', (e)=>{
    const id = e.target?.getAttribute?.('data-del');
    if (id !== null && id !== undefined){
      const items = JSON.parse(localStorage.getItem(key) || '[]');
      items.splice(Number(id), 1);
      localStorage.setItem(key, JSON.stringify(items));
      document.querySelector(`[data-index="${id}"]`)?.remove();
      const h2 = document.querySelector('.comments h2');
      if (h2) h2.textContent = `Comments (${items.length})`;
    }
  });

  form.onsubmit = (e)=>{
    e.preventDefault();
    const name = document.getElementById('cname').value.trim();
    const text = document.getElementById('ctext').value.trim();
    if (!text) return;
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    items.push({ name, text, date: new Date().toISOString().slice(0,10) });
    localStorage.setItem(key, JSON.stringify(items));
    const i = items.length - 1;
    const div = document.createElement('div');
    div.className='comment';
    div.setAttribute('data-index', i);
    div.innerHTML = `
      <div class="flex">
        <strong>${escapeHtml(name || 'Anonymous')}</strong>
        <span class="muted">${fmtDate(items[i].date)}</span>
        <button class="right btn" data-del="${i}" title="Delete comment">Delete</button>
      </div>
      <p style="margin:.5rem 0 0; white-space: pre-wrap">${escapeHtml(text)}</p>`;
    listEl.appendChild(div);
    const h2 = document.querySelector('.comments h2');
    if (h2) h2.textContent = `Comments (${items.length})`;
    form.reset();
  };
}

// ---------------- Contrib ----------------
function renderContrib(){
  return `
    <section class="mt-24" aria-label="Contributing & Upgrades">
      <article>
        <h2>Contribute & Upgrade (GitHub-friendly)</h2>
        <details open>
          <summary><strong>Quick team workflow</strong></summary>
          <ol>
            <li><strong>Create a GitHub repo</strong> (e.g., <code>seidm-blog</code>). Enable <em>GitHub Pages</em> (main branch / root) or deploy via Netlify/Vercel.</li>
            <li><strong>Branch per edit</strong>: contributors fork or branch (<code>feature/add-probability-post</code>), then open a Pull Request.</li>
            <li>Use a <strong>PR template</strong> and optional <code>CODEOWNERS</code> for quick review by teachers/editors.</li>
            <li><strong>Quick add/delete</strong>: add a .html file under <code>/posts</code> and a matching entry in <code>/data/articles.json</code>. Delete by removing both.</li>
          </ol>
        </details>
        <details>
          <summary><strong>How to add an article (no build step)</strong></summary>
          <p>Add a file like <code>/posts/my-new-post.html</code> containing the body HTML (images/footnotes allowed), and add this to <code>/data/articles.json</code>:</p>
          <pre><code>{ "id": "my-new-post", "title": "Title", "date": "2025-08-19", "author":"Your Name", "tags": ["math"], "cover": "https://.../image.jpg", "summary": "One-line summary" }</code></pre>
        </details>
        <details>
          <summary><strong>Optional upgrades</strong></summary>
          <ul>
            <li>RSS feed from the articles index.</li>
            <li>KaTeX for TeX math rendering via CDN.</li>
            <li>Giscus/Utterances for cross-device comments.</li>
            <li>Mailchimp/Buttondown/Formspree for email capture (swap the subscribe handler).</li>
          </ul>
        </details>
      </article>
    </section>
  `;
}

// ---------------- Utils ----------------
function escapeHtml(str){
  return (str||'').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
}
