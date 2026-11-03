window.__ModuleLoader__.load({
  id: '@local/dsh-session-multiselect',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'session-multiselect';
    const ROW_SELECTOR = '[data-row-key^="session:"]';
    const ROW_PREFIX = 'session:';
    const BRAND = 'var(--dsw-alias-brand-primary, #4f83ff)';

    /* ------------------------------------------------------------------ */
    /* 语言包                                                              */
    /* ------------------------------------------------------------------ */
    const zh = {
      barAria: '批量选择会话',
      selected: '已选 {n} 个会话',
      archive: '归档',
      unarchive: '取消归档',
      cancel: '取消',
      back: '返回',
      confirmArchive: '确认归档',
      confirmRunning: '其中 {running} 个会话正在运行，归档会先停止它们。确定归档这 {total} 个会话吗？',
      confirmDesc: '确定归档选中的 {total} 个会话吗？',
      archiving: '正在归档 {n} 个会话…',
      archivingUnarchive: '正在取消归档 {n} 个会话…',
      resultArchived: '已归档 {n} 个会话',
      resultUnarchived: '已取消归档 {n} 个会话',
      resultFailed: '，{failed} 个失败',
      undo: '撤销',
      undoing: '撤销中…',
      undone: '已撤销归档',
      dismiss: '关闭',
    };
    const en = {
      barAria: 'Batch select sessions',
      selected: '{n} sessions selected',
      archive: 'Archive',
      unarchive: 'Unarchive',
      cancel: 'Cancel',
      back: 'Back',
      confirmArchive: 'Archive now',
      confirmRunning: '{running} of them are running; archiving stops them first. Archive these {total} sessions?',
      confirmDesc: 'Archive the {total} selected sessions?',
      archiving: 'Archiving {n} sessions…',
      archivingUnarchive: 'Unarchiving {n} sessions…',
      resultArchived: 'Archived {n} sessions',
      resultUnarchived: 'Unarchived {n} sessions',
      resultFailed: ' ({failed} failed)',
      undo: 'Undo',
      undoing: 'Undoing…',
      undone: 'Archive undone',
      dismiss: 'Close',
    };

    function detectLang() {
      try {
        const lang = typeof navigator !== 'undefined' ? String(navigator.language || '') : '';
        return lang.toLowerCase().startsWith('zh') ? zh : en;
      } catch (_) {
        return en;
      }
    }
    function fmt(dict, key, values) {
      const raw = dict[key] != null ? dict[key] : (en[key] != null ? en[key] : key);
      return String(raw).replace(/\{(\w+)\}/g, (m, k) => (values && values[k] != null ? String(values[k]) : m));
    }

    /* ------------------------------------------------------------------ */
    /* 纯函数（可单测）                                                     */
    /* ------------------------------------------------------------------ */
    /** Inclusive session-id range between anchor and target, in rendered order. */
    function computeRangeOrdered(order, anchorId, targetId) {
      if (!Array.isArray(order)) return [];
      const ai = order.indexOf(anchorId);
      const ti = order.indexOf(targetId);
      if (ti < 0) return [];
      if (ai < 0) return [targetId];
      const lo = Math.min(ai, ti);
      const hi = Math.max(ai, ti);
      return order.slice(lo, hi + 1);
    }
    /** Toggle one id against the current selection, returning ids in rendered order. */
    function toggleOrdered(order, current, id) {
      const set = new Set(Array.isArray(current) ? current : []);
      if (set.has(id)) set.delete(id); else set.add(id);
      return (order || []).filter((x) => set.has(x));
    }
    function rowIdOf(el) {
      if (!el || typeof el.getAttribute !== 'function') return null;
      const key = el.getAttribute('data-row-key') || '';
      if (key.indexOf(ROW_PREFIX) !== 0) return null;
      return key.slice(ROW_PREFIX.length) || null;
    }

    /* ------------------------------------------------------------------ */
    /* 极简快照 store（供 React 订阅）                                      */
    /* ------------------------------------------------------------------ */
    function createStore(initial) {
      let state = initial;
      const subs = new Set();
      return {
        getSnapshot: () => state,
        subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
        set: (next) => { state = next; for (const fn of Array.from(subs)) { try { fn(); } catch (_) {} } },
      };
    }

    function createController(deps) {
      const doc = deps.doc || (typeof document !== 'undefined' ? document : null);
      const win = deps.win || (typeof window !== 'undefined' ? window : null);
      const api = deps.api;
      const metaOf = deps.meta || (() => ({ title: '', running: false, archived: false }));
      const dict = deps.dict || en;
      const store = createStore({ selected: [], rect: null, phase: 'select', info: null });

      let anchorId = null;
      let observer = null;
      let applyRaf = 0;
      let reconcileRaf = 0;
      let dismissTimer = 0;
      let lastArchived = [];
      let suspendPrune = false;

      const INTERACTIVE = 'button,a,input,textarea,select,[role="menuitem"],[role="menu"],[role="option"],[role="dialog"],[contenteditable="true"]';

      function allRows() {
        if (!doc || typeof doc.querySelectorAll !== 'function') return [];
        return Array.prototype.slice.call(doc.querySelectorAll(ROW_SELECTOR));
      }
      function orderedIds() {
        return allRows().map(rowIdOf).filter(Boolean);
      }
      function isEditable(el) {
        if (!el || typeof el.closest !== 'function') return false;
        return !!el.closest('input,textarea,select,[contenteditable="true"]');
      }
      function computeRect() {
        const list = allRows();
        if (!list.length) return null;
        let el = list[0].parentElement;
        let scroll = null;
        while (el) {
          let cs = null;
          try { cs = win && win.getComputedStyle ? win.getComputedStyle(el) : null; } catch (_) { cs = null; }
          if (cs && /(auto|scroll)/.test(String(cs.overflowY || ''))) { scroll = el; break; }
          el = el.parentElement;
        }
        const base = scroll || list[0].parentElement || list[0];
        try {
          const r = base.getBoundingClientRect();
          return { left: r.left, top: r.top, width: r.width, height: r.height };
        } catch (_) {
          return null;
        }
      }
      function applyHighlight() {
        const selected = new Set(store.getSnapshot().selected);
        for (const el of allRows()) {
          const id = rowIdOf(el);
          const on = id != null && selected.has(id);
          if (!el.style) continue;
          if (on) {
            el.setAttribute('data-dsh-ms-selected', '1');
            el.style.background = 'color-mix(in srgb, ' + BRAND + ' 16%, transparent)';
            el.style.boxShadow = 'inset 3px 0 0 ' + BRAND;
          } else {
            if (el.getAttribute('data-dsh-ms-selected') === '1') el.removeAttribute('data-dsh-ms-selected');
            el.style.background = '';
            el.style.boxShadow = '';
          }
        }
      }
      function scheduleApply() {
        if (applyRaf) return;
        const raf = (win && win.requestAnimationFrame) ? win.requestAnimationFrame.bind(win) : (fn) => setTimeout(fn, 16);
        applyRaf = raf(() => { applyRaf = 0; applyHighlight(); });
      }
      function scheduleReconcile() {
        if (reconcileRaf) return;
        const raf = (win && win.requestAnimationFrame) ? win.requestAnimationFrame.bind(win) : (fn) => setTimeout(fn, 16);
        reconcileRaf = raf(() => { reconcileRaf = 0; reconcile(); });
      }
      function startObserver() {
        if (observer || !doc || !win || !win.MutationObserver) return;
        observer = new win.MutationObserver(() => scheduleReconcile());
        try { observer.observe(doc.body, { childList: true, subtree: true }); } catch (_) { observer = null; }
      }
      function stopObserver() {
        if (observer) { try { observer.disconnect(); } catch (_) {} observer = null; }
      }
      function reconcile() {
        if (suspendPrune) { applyHighlight(); return; }
        const present = new Set(orderedIds());
        const cur = store.getSnapshot().selected;
        const kept = cur.filter((id) => present.has(id));
        if (kept.length !== cur.length) {
          store.set(Object.assign({}, store.getSnapshot(), {
            selected: kept,
            rect: kept.length ? computeRect() : null,
          }));
          if (kept.length === 0) stopObserver();
        }
        applyHighlight();
      }
      function commitSelected(ids) {
        const selected = ids.filter(Boolean);
        store.set({ selected: selected, rect: selected.length ? computeRect() : null, phase: 'select', info: null });
        if (selected.length) startObserver(); else stopObserver();
        scheduleApply();
      }
      function clear() {
        anchorId = null;
        stopObserver();
        if (dismissTimer) { try { (win && win.clearTimeout ? win.clearTimeout : clearTimeout)(dismissTimer); } catch (_) {} dismissTimer = 0; }
        store.set({ selected: [], rect: null, phase: 'select', info: null });
        scheduleApply();
      }
      function currentOpenId() {
        for (const el of allRows()) {
          if (el.getAttribute('aria-selected') === 'true') return rowIdOf(el);
        }
        return null;
      }

      function onClick(event) {
        if (!event || (event.button != null && event.button !== 0)) return;
        const target = event.target;
        if (!target || typeof target.closest !== 'function') return;
        if (target.closest('[data-dsh-ms-bar]')) return;
        if (target.closest(INTERACTIVE)) return;

        const row = target.closest(ROW_SELECTOR);
        if (!row) {
          if (store.getSnapshot().selected.length > 0) clear();
          return;
        }
        const id = rowIdOf(row);
        if (!id) return;
        const order = orderedIds();
        const shift = !!event.shiftKey;
        const mod = !!(event.metaKey || event.ctrlKey);

        if (shift) {
          event.preventDefault();
          event.stopImmediatePropagation();
          const anchor = (anchorId && order.indexOf(anchorId) >= 0) ? anchorId : (currentOpenId() || id);
          const range = computeRangeOrdered(order, anchor, id);
          if (mod) {
            const merged = new Set(store.getSnapshot().selected);
            for (const x of range) merged.add(x);
            anchorId = anchor;
            commitSelected(order.filter((x) => merged.has(x)));
          } else {
            anchorId = anchor;
            commitSelected(range);
          }
          return;
        }
        if (mod) {
          event.preventDefault();
          event.stopImmediatePropagation();
          anchorId = id;
          commitSelected(toggleOrdered(order, store.getSnapshot().selected, id));
          return;
        }
        // Plain click: leave native open behaviour alone, just reset selection.
        anchorId = id;
        if (store.getSnapshot().selected.length > 0) clear();
        anchorId = id;
      }

      function onKeyDown(event) {
        if (!event || event.key !== 'Escape') return;
        if (store.getSnapshot().selected.length === 0) return;
        if (isEditable(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        clear();
      }

      function isAllArchived() {
        const selected = store.getSnapshot().selected;
        return selected.length > 0 && selected.every((id) => metaOf(id).archived);
      }

      function scheduleDismiss() {
        if (dismissTimer) { try { (win && win.clearTimeout ? win.clearTimeout : clearTimeout)(dismissTimer); } catch (_) {} }
        const setT = win && win.setTimeout ? win.setTimeout.bind(win) : setTimeout;
        dismissTimer = setT(() => {
          dismissTimer = 0;
          if (store.getSnapshot().phase === 'result') {
            store.set({ selected: [], rect: null, phase: 'select', info: null });
            scheduleApply();
          }
        }, 6000);
      }

      async function performArchive(ids) {
        suspendPrune = true;
        store.set(Object.assign({}, store.getSnapshot(), { phase: 'archiving', info: { total: ids.length, action: 'archive' } }));
        const archived = [];
        const failed = [];
        for (const id of ids) {
          try { await api.archiveSession(id, { stopActivity: true }); archived.push(id); }
          catch (e) { failed.push(id); try { console.warn('[session-multiselect] archive failed', id, e); } catch (_) {} }
        }
        suspendPrune = false;
        lastArchived = archived.slice();
        stopObserver();
        anchorId = null;
        store.set({ selected: [], rect: null, phase: 'result', info: { archived: archived.length, failed: failed.length, action: 'archive' } });
        scheduleApply();
        scheduleDismiss();
      }
      async function performUnarchive(ids) {
        suspendPrune = true;
        store.set(Object.assign({}, store.getSnapshot(), { phase: 'archiving', info: { total: ids.length, action: 'unarchive' } }));
        let ok = 0; let fail = 0;
        for (const id of ids) {
          try { await api.unarchiveSession(id); ok++; }
          catch (e) { fail++; try { console.warn('[session-multiselect] unarchive failed', id, e); } catch (_) {} }
        }
        suspendPrune = false;
        stopObserver();
        anchorId = null;
        store.set({ selected: [], rect: null, phase: 'result', info: { archived: ok, failed: fail, action: 'unarchive' } });
        scheduleApply();
        scheduleDismiss();
      }
      function requestArchive() {
        const selected = store.getSnapshot().selected.slice();
        if (!selected.length) return;
        if (selected.every((id) => metaOf(id).archived)) { performUnarchive(selected); return; }
        const running = selected.filter((id) => metaOf(id).running).length;
        if (running > 0) {
          store.set(Object.assign({}, store.getSnapshot(), { phase: 'confirm', info: { total: selected.length, running: running, action: 'archive' } }));
        } else {
          performArchive(selected);
        }
      }
      function confirmArchive() {
        const snap = store.getSnapshot();
        const ids = snap.selected.slice();
        if (!ids.length) return;
        performArchive(ids);
      }
      function cancelConfirm() {
        const snap = store.getSnapshot();
        store.set(Object.assign({}, snap, { phase: snap.selected.length ? 'select' : 'select', info: null }));
      }
      async function undo() {
        const ids = lastArchived.slice();
        lastArchived = [];
        if (!ids.length) return;
        store.set({ selected: [], rect: null, phase: 'archiving', info: { total: ids.length, action: 'undo' } });
        let ok = 0; let fail = 0;
        for (const id of ids) {
          try { await api.unarchiveSession(id); ok++; }
          catch (e) { fail++; try { console.warn('[session-multiselect] undo failed', id, e); } catch (_) {} }
        }
        store.set({ selected: [], rect: null, phase: 'result', info: { undone: ok, failed: fail, action: 'undo' } });
        scheduleApply();
        scheduleDismiss();
      }

      function attach() {
        if (!doc) return () => {};
        doc.addEventListener('click', onClick, true);
        doc.addEventListener('keydown', onKeyDown, true);
        return () => {
          doc.removeEventListener('click', onClick, true);
          doc.removeEventListener('keydown', onKeyDown, true);
          stopObserver();
          if (applyRaf && win && win.cancelAnimationFrame) { try { win.cancelAnimationFrame(applyRaf); } catch (_) {} applyRaf = 0; }
          for (const el of allRows()) {
            try {
              if (el.getAttribute('data-dsh-ms-selected') === '1') el.removeAttribute('data-dsh-ms-selected');
              el.style.background = '';
              el.style.boxShadow = '';
            } catch (_) {}
          }
        };
      }

      return {
        store, attach, clear, requestArchive, confirmArchive, cancelConfirm, undo,
        isAllArchived,
        _debug: { computeRect, orderedIds, reconcile, onClick, onKeyDown },
      };
    }

    /* ------------------------------------------------------------------ */
    /* 浮动操作条（React）                                                  */
    /* ------------------------------------------------------------------ */
    function useStore(store) {
      if (React.useSyncExternalStore) {
        return React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
      }
      const [value, setValue] = React.useState(store.getSnapshot());
      React.useEffect(() => store.subscribe(() => setValue(store.getSnapshot())), [store]);
      return value;
    }

    function MultiSelectBar(props) {
      const ctrl = props.ctrl;
      const snap = useStore(ctrl.store);
      const t = (key, values) => (typeof props.t === 'function' ? props.t(key, values) : fmt(props.dict || en, key, values));

      const visible = snap.selected.length > 0 || snap.phase === 'result';
      if (!visible) return null;

      const rect = snap.rect;
      const width = rect ? Math.max(220, Math.min(rect.width, 460)) : 300;
      const style = {
        position: 'fixed',
        left: (rect ? rect.left : 12) + 'px',
        top: (rect ? Math.max(8, rect.top - 46) : 60) + 'px',
        width: width + 'px',
        zIndex: 100000,
      };

      const parts = [];
      let text = '';
      const buttons = [];

      if (snap.phase === 'archiving') {
        const n = snap.info && snap.info.total != null ? snap.info.total : snap.selected.length;
        const un = snap.info && snap.info.action === 'unarchive';
        text = un ? t('archivingUnarchive', { n }) : t('archiving', { n });
      } else if (snap.phase === 'result') {
        const info = snap.info || {};
        if (info.action === 'undo') {
          text = t('undone') + (info.failed ? t('resultFailed', { failed: info.failed }) : '');
        } else if (info.action === 'unarchive') {
          text = t('resultUnarchived', { n: info.archived || 0 }) + (info.failed ? t('resultFailed', { failed: info.failed }) : '');
        } else {
          text = t('resultArchived', { n: info.archived || 0 }) + (info.failed ? t('resultFailed', { failed: info.failed }) : '');
        }
        if (info.action === 'archive' && (info.archived || 0) > 0 && !info.failed) {
          buttons.push(h('button', { key: 'undo', type: 'button', className: 'dsh-ms-btn dsh-ms-btn-primary', onClick: () => { ctrl.undo(); } }, t('undo')));
        }
        buttons.push(h('button', { key: 'dismiss', type: 'button', className: 'dsh-ms-btn', onClick: () => { ctrl.clear(); } }, t('dismiss')));
      } else if (snap.phase === 'confirm') {
        const info = snap.info || {};
        text = info.running ? t('confirmRunning', { running: info.running, total: info.total }) : t('confirmDesc', { total: info.total });
        buttons.push(h('button', { key: 'confirm', type: 'button', className: 'dsh-ms-btn dsh-ms-btn-danger', onClick: () => { ctrl.confirmArchive(); } }, t('confirmArchive')));
        buttons.push(h('button', { key: 'back', type: 'button', className: 'dsh-ms-btn', onClick: () => { ctrl.cancelConfirm(); } }, t('back')));
      } else {
        text = t('selected', { n: snap.selected.length });
        const allArchived = ctrl.isAllArchived();
        buttons.push(h('button', {
          key: 'archive',
          type: 'button',
          className: 'dsh-ms-btn dsh-ms-btn-primary',
          onClick: () => { ctrl.requestArchive(); },
        }, allArchived ? t('unarchive') : t('archive')));
        buttons.push(h('button', { key: 'cancel', type: 'button', className: 'dsh-ms-btn', onClick: () => { ctrl.clear(); } }, t('cancel')));
      }

      parts.push(h('span', { key: 'text', className: 'dsh-ms-text' }, text));
      parts.push(h('span', { key: 'actions', className: 'dsh-ms-actions' }, buttons));

      return h('div', {
        className: 'dsh-ms-bar',
        'data-dsh-ms-bar': '1',
        role: 'toolbar',
        'aria-label': t('barAria'),
        style: style,
      }, parts);
    }

    const CSS = [
      '.dsh-ms-bar{box-sizing:border-box;display:flex;align-items:center;gap:10px;justify-content:space-between;padding:8px 10px 8px 12px;border-radius:12px;background:var(--dsw-alias-bg-layer-2,#26282b);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));box-shadow:0 8px 24px rgba(0,0,0,.32);font-size:13px;line-height:18px}',
      '.dsh-ms-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}',
      '.dsh-ms-actions{display:inline-flex;align-items:center;gap:6px;flex:none}',
      '.dsh-ms-btn{height:26px;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.18));background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:24px;cursor:pointer;white-space:nowrap}',
      '.dsh-ms-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}',
      '.dsh-ms-btn-primary{background:var(--dsw-alias-button-primary-fill,#4f83ff);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}',
      '.dsh-ms-btn-primary:hover{opacity:.9;background:var(--dsw-alias-button-primary-fill,#4f83ff)}',
      '.dsh-ms-btn-danger{background:var(--dsw-alias-state-error-primary,#e5484d);border-color:transparent;color:#fff}',
      '.dsh-ms-btn-danger:hover{opacity:.9;background:var(--dsw-alias-state-error-primary,#e5484d)}',
    ].join('\n');

    return {
      inject: ['slots', 'sessions', 'workspaces', 'uiWorkspace', 'locale'],
      __test: { computeRangeOrdered, toggleOrdered, rowIdOf, createController, createStore },
      apply(ctx) {
        const dict = detectLang();
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'session-multiselect: dictionaries');
        ctx.effect(() => {
          const style = document.createElement('style');
          style.dataset.plugin = '@local/dsh-session-multiselect';
          style.dataset.pluginCss = '@local/dsh-session-multiselect/client.css';
          style.textContent = CSS;
          document.head.appendChild(style);
          return () => { style.remove(); };
        }, 'session-multiselect: styles');

        const meta = (id) => {
          let row = {};
          try { row = (ctx.sessions.list.getSnapshot().byId || {})[id] || {}; } catch (_) { row = {}; }
          let archived = false;
          try { archived = (ctx.workspaces.list.getSnapshot().archivedSessionIds || []).indexOf(id) >= 0; } catch (_) { archived = false; }
          const running = !!row.running || row.pendingInteraction != null || (row.runningSubagentCount || 0) > 0;
          return { title: typeof row.title === 'string' ? row.title : '', running: running, archived: archived };
        };

        const api = {
          archiveSession: (id, options) => ctx.uiWorkspace.archiveSession(id, options),
          unarchiveSession: (id) => ctx.uiWorkspace.unarchiveSession(id),
        };

        const controller = createController({
          doc: typeof document !== 'undefined' ? document : null,
          win: typeof window !== 'undefined' ? window : null,
          api: api,
          meta: meta,
          dict: dict,
        });

        ctx.effect(() => controller.attach(), 'session-multiselect: listeners');

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'session-multiselect-bar',
          locale: NS,
        }, (props) => h(MultiSelectBar, Object.assign({}, props, { ctrl: controller, dict: dict }))));
      },
    };
  },
});
