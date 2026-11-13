// The user guide (README.md) and the changelog as a page with real headings, lists and links,
// so NVDA's browse mode can go from heading to heading (H) instead of reading Markdown signs.
// Only the little Markdown these files use is understood: headings, paragraphs, lists (also
// inside lists), code blocks, `code`, **bold** and [links](...). Everything goes in as text,
// never as HTML.

// The parts for developers (between <!-- dev --> and <!-- /dev -->) and other comments are left out.
export function stripComments(markdown) {
  return markdown.replace(/\r/g, '').replace(/<!-- dev -->[\s\S]*?<!-- \/dev -->\n?/g, '').replace(/<!--[\s\S]*?-->/g, '');
}

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const ITEM = /^(\s*)([-*]|\d+[.)])\s+(.*)$/;
const FENCE = /^\s*```/;
const indentOf = (line) => line.match(/^\s*/)[0].length;

// The text inside a line: [{ t: 'text', v }, { t: 'code', v }, { t: 'strong', c }, { t: 'link', href, c }].
export function parseInline(text) {
  const out = [];
  const push = (node) => {
    const last = out.at(-1);
    if (node.t === 'text' && last?.t === 'text') last.v += node.v; else out.push(node);
  };
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    let m;
    if ((m = /^`([^`]+)`/.exec(rest))) { push({ t: 'code', v: m[1] }); i += m[0].length; continue; }
    if ((m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest))) { push({ t: 'link', href: m[2], c: parseInline(m[1]) }); i += m[0].length; continue; }
    if ((m = /^\*\*(?=\S)([\s\S]+?)\*\*/.exec(rest))) { push({ t: 'strong', c: parseInline(m[1]) }); i += m[0].length; continue; }
    push({ t: 'text', v: text[i] });
    i += 1;
  }
  return out;
}

// The page as blocks: { t: 'heading', level, text }, { t: 'para', text }, { t: 'code', text },
// { t: 'list', ordered, start, items: [{ text, blocks }] }.
export function parseGuide(markdown) {
  const lines = stripComments(markdown).split('\n');
  let i = 0;

  const code = () => {
    const fenceIndent = indentOf(lines[i]);
    i += 1;
    const body = [];
    while (i < lines.length && !FENCE.test(lines[i])) { body.push(lines[i].slice(Math.min(fenceIndent, indentOf(lines[i])))); i += 1; }
    i += 1; // the closing fence
    return { t: 'code', text: body.join('\n') };
  };

  const list = (indent) => {
    const first = ITEM.exec(lines[i]);
    const ordered = /\d/.test(first[2]);
    const node = { t: 'list', ordered, start: ordered ? parseInt(first[2], 10) : 1, items: [] };
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        // A blank line ends the list unless the next line carries it on.
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j += 1;
        const next = ITEM.exec(lines[j] || '');
        const inside = j < lines.length && indentOf(lines[j]) > indent && !next;
        if ((next && next[1].length >= indent && /\d/.test(next[2]) === ordered) || inside) { i = j; continue; }
        break;
      }
      const m = ITEM.exec(line);
      const item = node.items.at(-1);
      if (m && m[1].length === indent) {
        if (/\d/.test(m[2]) !== ordered) break;
        node.items.push({ text: m[3], blocks: [] });
        i += 1;
      } else if (m && m[1].length > indent && item) {
        item.blocks.push(list(m[1].length));
      } else if (m || HEADING.test(line)) {
        break;
      } else if (FENCE.test(line) && item) {
        item.blocks.push(code());
      } else if (item) {
        // A line that carries on the item (indented, or straight after it).
        if (item.blocks.length) item.blocks.push({ t: 'para', text: line.trim() }); else item.text += ` ${line.trim()}`;
        i += 1;
      } else {
        break;
      }
    }
    return node;
  };

  const blocks = [];
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    let m;
    if (FENCE.test(line)) { blocks.push(code()); continue; }
    if ((m = HEADING.exec(line))) { blocks.push({ t: 'heading', level: m[1].length, text: m[2] }); i += 1; continue; }
    if ((m = ITEM.exec(line))) { blocks.push(list(m[1].length)); continue; }
    const text = [];
    while (i < lines.length && lines[i].trim() && !HEADING.test(lines[i]) && !ITEM.exec(lines[i]) && !FENCE.test(lines[i])) { text.push(lines[i].trim()); i += 1; }
    blocks.push({ t: 'para', text: text.join(' ') });
  }
  return blocks;
}

// What a heading says, without its formatting.
export const plainText = (nodes) => nodes.map((n) => (n.t === 'text' || n.t === 'code' ? n.v : plainText(n.c))).join('');

// The id GitHub gives a heading, so the same links work in both places.
export function slugger() {
  const seen = new Map();
  return (text) => {
    const base = text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
}

// ---------- the page ----------

if (typeof document !== 'undefined' && window.notebook?.readGuide) {
  const main = document.getElementById('guide');
  let current = null;

  // A link to the other file opens it here; a link to a heading goes to that heading; a web
  // address opens in the browser (the window passes it on). Anything else is only text.
  const follow = (href) => {
    const [file, hash] = href.split('#');
    if (/^https:\/\//i.test(href)) { window.open(href); return; }
    const name = file.split('/').pop();
    if (!file) { goTo(hash); return; }
    if (['README.md', 'CHANGELOG.md'].includes(name)) show(name, hash);
  };

  const inline = (nodes, parent) => {
    for (const n of nodes) {
      if (n.t === 'text') parent.append(n.v);
      else if (n.t === 'code') { const c = document.createElement('code'); c.textContent = n.v; parent.append(c); }
      else if (n.t === 'strong') { const s = document.createElement('strong'); inline(n.c, s); parent.append(s); }
      else {
        const usable = /^https:\/\//i.test(n.href) || /^(#|README\.md|CHANGELOG\.md|\.\.?\/)/.test(n.href);
        if (!usable) { inline(n.c, parent); continue; }
        const a = document.createElement('a');
        a.href = n.href;
        a.addEventListener('click', (event) => { event.preventDefault(); follow(n.href); });
        inline(n.c, a);
        parent.append(a);
      }
    }
  };

  const block = (b, parent, slug) => {
    if (b.t === 'heading') {
      const h = document.createElement(`h${b.level}`);
      const nodes = parseInline(b.text);
      inline(nodes, h);
      h.id = slug(plainText(nodes));
      h.tabIndex = -1;
      parent.append(h);
    } else if (b.t === 'para') {
      const p = document.createElement('p');
      inline(parseInline(b.text), p);
      parent.append(p);
    } else if (b.t === 'code') {
      const pre = document.createElement('pre');
      const c = document.createElement('code');
      c.textContent = b.text;
      pre.append(c);
      parent.append(pre);
    } else {
      const l = document.createElement(b.ordered ? 'ol' : 'ul');
      if (b.ordered && b.start !== 1) l.start = b.start;
      for (const item of b.items) {
        const li = document.createElement('li');
        inline(parseInline(item.text), li);
        for (const inner of item.blocks) block(inner, li, slug);
        l.append(li);
      }
      parent.append(l);
    }
  };

  const goTo = (hash) => {
    const target = hash && document.getElementById(decodeURIComponent(hash));
    const h = target || main.querySelector('h1');
    h?.focus();
    h?.scrollIntoView({ block: 'start' });
  };

  async function show(name, hash) {
    let text;
    try {
      text = await window.notebook.readGuide(name);
    } catch {
      text = `# Math Notebook user guide\n\nThe guide could not be opened (${name} is missing).`;
    }
    current = name;
    main.replaceChildren();
    const slug = slugger();
    const blocks = parseGuide(text);
    if (name !== 'README.md') {
      const p = document.createElement('p');
      inline(parseInline('[Back to the user guide](README.md)'), p);
      main.append(p);
    }
    for (const b of blocks) block(b, main, slug);
    // Contents, after the opening paragraphs: a link to each part.
    const parts = [...main.querySelectorAll('h2')];
    if (parts.length > 3) {
      const nav = document.createElement('nav');
      nav.setAttribute('aria-labelledby', 'guide-contents');
      const h = document.createElement('h2');
      h.id = 'guide-contents';
      h.textContent = 'Contents';
      h.tabIndex = -1;
      const ul = document.createElement('ul');
      for (const part of parts) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${part.id}`;
        a.textContent = part.textContent;
        a.addEventListener('click', (event) => { event.preventDefault(); goTo(part.id); });
        li.append(a);
        ul.append(li);
      }
      nav.append(h, ul);
      parts[0].before(nav);
    }
    document.title = main.querySelector('h1')?.textContent || 'Math Notebook user guide';
    window.guideShown = name; // for the tests
    goTo(hash);
  }

  // Escape closes the guide (NVDA passes Escape on in browse mode too).
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); window.notebook.closeGuide(); }
  });
  window.notebook.onGuideShow((name, hash) => (name === current && !hash ? goTo() : show(name, hash)));
  show(new URLSearchParams(location.search).get('file') || 'README.md');
}
