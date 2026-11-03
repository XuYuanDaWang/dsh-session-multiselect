const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'client.js'), 'utf8');

/* ---------- minimal fake DOM ---------- */
class FakeEl {
  constructor(tag, attrs = {}) {
    this.tagName = tag.toUpperCase();
    this._attrs = Object.assign({}, attrs);
    this.style = {};
    this.parentElement = null;
    this.children = [];
  }
  get childrenAll() { const out = []; const walk = (n) => { for (const c of n.children) { out.push(c); walk(c); } }; walk(this); return out; }
  append(child) { child.parentElement = this; this.children.push(child); return child; }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null; }
  setAttribute(name, value) { this._attrs[name] = String(value); }
  removeAttribute(name) { delete this._attrs[name]; }
  getBoundingClientRect() { return { left: 10, top: 100, width: 260, height: 400 }; }
  closest(selector) {
    const match = (el) => {
      if (!el) return false;
      if (selector === '[data-dsh-ms-bar]') return el.getAttribute && el.getAttribute('data-dsh-ms-bar') != null;
      if (selector === '[data-row-key^="session:"]') { const k = el.getAttribute && el.getAttribute('data-row-key'); return !!k && k.indexOf('session:') === 0; }
      // INTERACTIVE / editable compound selectors: treat by tag + role + contenteditable
      const tags = selector.split(',').map((s) => s.trim());
      for (const s of tags) {
        if (s === 'input' && el.tagName === 'INPUT') return true;
        if (s === 'textarea' && el.tagName === 'TEXTAREA') return true;
        if (s === 'select' && el.tagName === 'SELECT') return true;
        if (s === 'button' && el.tagName === 'BUTTON') return true;
        if (s === 'a' && el.tagName === 'A') return true;
        if (s === '[role="menuitem"]' && el.getAttribute('role') === 'menuitem') return true;
        if (s === '[role="menu"]' && el.getAttribute('role') === 'menu') return true;
        if (s === '[role="option"]' && el.getAttribute('role') === 'option') return true;
        if (s === '[role="dialog"]' && el.getAttribute('role') === 'dialog') return true;
        if (s === '[contenteditable="true"]' && el.getAttribute('contenteditable') === 'true') return true;
      }
      return false;
    };
    let cur = this;
    while (cur) { if (match(cur)) return cur; cur = cur.parentElement; }
    return null;
  }
}
function makeTree(ids, archivedIds = []) {
  const body = new FakeEl('body');
  const scroll = body.append(new FakeEl('div'));
  const list = scroll.append(new FakeEl('div'));
  const rows = {};
  for (const id of ids) {
    const row = list.append(new FakeEl('div', { 'data-row-key': 'session:' + id, 'aria-selected': 'false' }));
    row.append(new FakeEl('span', { class: 'title' }));
    rows[id] = row;
  }
  const doc = {
    body,
    querySelectorAll(sel) {
      if (sel !== '[data-row-key^="session:"]') return [];
      return body.childrenAll.filter((el) => { const k = el.getAttribute('data-row-key'); return k && k.indexOf('session:') === 0; });
    },
    addEventListener() {},
    removeEventListener() {},
  };
  const win = {
    getComputedStyle(el) { return { overflowY: el === scroll ? 'auto' : 'visible' }; },
    setTimeout, clearTimeout,
  };
  return { doc, win, rows, list, scroll };
}
function mkEvent(target, opts = {}) {
  return {
    target, button: 0,
    shiftKey: !!opts.shift, metaKey: !!opts.meta, ctrlKey: !!opts.ctrl,
    defaultPrevented: false, stopped: false,
    preventDefault() { this.defaultPrevented = true; },
    stopImmediatePropagation() { this.stopped = true; },
  };
}

(async () => {
  let plugin;
  const ReactStub = { createElement: () => null, useState: (v) => [v, () => {}], useEffect: () => {} };
  vm.runInNewContext(source, {
    window: { __ModuleLoader__: { load: (o) => { plugin = o.factory(() => ReactStub); } } },
    navigator: { language: 'zh-CN' },
    setTimeout, clearTimeout, console,
  });
  const T = plugin.__test;

  /* 1. pure helpers */
  const A = (x) => Array.from(x);
  assert.deepEqual(A(T.computeRangeOrdered(['H', 'G', 'E', 'C'], 'H', 'C')), ['H', 'G', 'E', 'C']);
  assert.deepEqual(A(T.computeRangeOrdered(['H', 'G', 'E', 'C'], 'C', 'G')), ['G', 'E', 'C']);
  assert.deepEqual(A(T.computeRangeOrdered(['H', 'G', 'E', 'C'], 'H', 'E')), ['H', 'G', 'E']);
  assert.deepEqual(A(T.computeRangeOrdered(['H', 'G'], 'X', 'G')), ['G']);
  assert.deepEqual(A(T.toggleOrdered(['H', 'G', 'E'], ['H', 'E'], 'G')), ['H', 'G', 'E']);
  assert.deepEqual(A(T.toggleOrdered(['H', 'G', 'E'], ['H', 'G'], 'G')), ['H']);

  /* 2. shift range selection via controller */
  const { doc, win, rows } = makeTree(['H', 'G', 'E', 'C']);
  const archived = ['C'];
  const meta = (id) => ({ title: id, running: id === 'G', archived: archived.indexOf(id) >= 0 });
  const archivedCalls = [];
  const unarchiveCalls = [];
  const api = {
    archiveSession: async (id, o) => { archivedCalls.push([id, o]); },
    unarchiveSession: async (id) => { unarchiveCalls.push(id); },
  };
  const ctrl = T.createController({ doc, win, api, meta });
  const sel = () => Array.from(ctrl.store.getSnapshot().selected);
  const click = (id, opts) => { const ev = mkEvent(rows[id].children[0], opts); ctrl._debug.onClick(ev); return ev; };

  click('H'); // plain
  assert.deepEqual(sel(), [], 'plain click selects nothing');
  const evShift = click('C', { shift: true });
  assert.deepEqual(sel(), ['H', 'G', 'E', 'C'], 'shift click H..C selects whole range');
  assert.equal(evShift.defaultPrevented, true, 'shift click prevents native open');
  assert.equal(evShift.stopped, true, 'shift click stops propagation');

  // reverse range: plain on E (opens/reset), then shift to H
  click('E');
  assert.deepEqual(sel(), [], 'plain click cleared');
  click('H', { shift: true });
  assert.deepEqual(sel(), ['H', 'G', 'E'], 'reverse shift range E<-H');

  // cmd toggle
  click('C', { meta: true });
  assert.deepEqual(sel(), ['H', 'G', 'E', 'C'], 'cmd click adds C');
  click('G', { meta: true });
  assert.deepEqual(sel(), ['H', 'E', 'C'], 'cmd click removes G');

  // meta+shift union from anchor G? anchor currently C after meta click? verify union works
  click('E'); // reset, anchor E
  click('G', { meta: true }); // anchor G, select G
  assert.deepEqual(sel(), ['G']);
  click('C', { shift: true, meta: true }); // anchor G..C union with G
  assert.deepEqual(sel(), ['G', 'E', 'C']);

  // escape clears
  const esc = { key: 'Escape', target: rows['H'], preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; } };
  ctrl._debug.onKeyDown(esc);
  assert.deepEqual(sel(), [], 'escape clears selection');

  /* 3. archive flow: select H..C (G running => confirm needed) */
  click('H'); click('C', { shift: true });
  assert.deepEqual(sel(), ['H', 'G', 'E', 'C']);
  ctrl.requestArchive();
  assert.equal(ctrl.store.getSnapshot().phase, 'confirm', 'running session triggers confirm');
  assert.equal(ctrl.store.getSnapshot().info.running, 1);
  ctrl.confirmArchive();
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(archivedCalls.map((x) => x[0]), ['H', 'G', 'E', 'C'], 'archives all selected in order');
  assert.equal(archivedCalls[0][1] && archivedCalls[0][1].stopActivity, true, 'stopActivity true');
  const res = ctrl.store.getSnapshot();
  assert.equal(res.phase, 'result');
  assert.equal(res.info.archived, 4);
  // undo
  await ctrl.undo();
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(unarchiveCalls.slice(0, 4), ['H', 'G', 'E', 'C'], 'undo unarchives archived ids');
  assert.equal(ctrl.store.getSnapshot().info.action, 'undo');

  /* 4. all-archived selection offers unarchive */
  const tree2 = makeTree(['A', 'B']);
  const ctrl2 = T.createController({ doc: tree2.doc, win: tree2.win, api: { archiveSession: async () => {}, unarchiveSession: async () => {} }, meta: () => ({ title: 'x', running: false, archived: true }) });
  ctrl2._debug.onClick(mkEvent(tree2.rows['A'].children[0]));
  ctrl2._debug.onClick(mkEvent(tree2.rows['B'].children[0], { shift: true }));
  assert.equal(ctrl2.isAllArchived(), true, 'all archived detected');


  /* 5. apply(ctx) wiring smoke test */
  const fakeDoc = {
    body: new FakeEl('body'),
    head: { appendChild() {} },
    createElement(tag) { const el = new FakeEl(tag); el.dataset = {}; el.remove = () => {}; return el; },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
  };
  let wrappedBar = null;
  const fakeCtx = {
    effect(fn) { const c = fn(); return c || (() => {}); },
    locale: { register() {} },
    sessions: { list: { getSnapshot: () => ({ byId: {} }) } },
    workspaces: { list: { getSnapshot: () => ({ archivedSessionIds: [] }) } },
    uiWorkspace: { archiveSession: async () => {}, unarchiveSession: async () => {} },
    slots: {
      inject(name, fn) { fn(); },
      register(opts, Comp) { if (opts && opts.name === 'shell.overlay') wrappedBar = Comp; return {}; },
    },
  };
  // Inject document/window globals into the same VM sandbox by re-running with them.
  const sandbox2 = {
    window: { __ModuleLoader__: { load: (o) => { plugin = o.factory(() => ReactStub); } }, setTimeout, clearTimeout, requestAnimationFrame: (fn) => setTimeout(fn, 0) },
    navigator: { language: 'zh-CN' }, document: fakeDoc, setTimeout, clearTimeout, console,
  };
  vm.runInNewContext(source, sandbox2);
  plugin.apply(fakeCtx);
  assert.equal(typeof wrappedBar, 'function', 'registers a shell.overlay component');
  const rendered = wrappedBar({ t: (k) => k });
  assert.equal(rendered, null, 'bar hidden with empty selection');

  console.log('All session-multiselect regression tests passed');
})().catch((e) => { console.error(e); process.exitCode = 1; });
