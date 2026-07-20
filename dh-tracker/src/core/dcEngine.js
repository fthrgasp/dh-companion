/* Minimal runtime that replicates the small template DSL used by this app:
   sc-if / sc-for / {{expr}} interpolation / sc-camel-on-click / sc-camel-on-change /
   sc-camel-auto-focus / sc-raw-select / x-import (image-slot) / style-hover.
   No external framework dependency — plain DOM. */
import { loadRaw, saveRaw, removeRaw } from './storage.js';

var EXPR_RE = /\{\{\s*([^}]+?)\s*\}\}/g;
var FULL_EXPR_RE = /^\{\{\s*([^}]+?)\s*\}\}$/;

function resolveExpr(scope, exprRaw) {
  var e = (exprRaw || '').trim();
  if (e === 'true') return true;
  if (e === 'false') return false;
  if (e === '') return undefined;
  var parts = e.split('.');
  var cur = scope;
  for (var i = 0; i < parts.length; i++) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

function interpolateString(scope, str) {
  if (str == null) return '';
  return String(str).replace(EXPR_RE, function (m, expr) {
    var v = resolveExpr(scope, expr);
    return (v === undefined || v === null) ? '' : String(v);
  });
}

// Resolve an attribute's raw text: if it is *exactly* one {{expr}}, return
// the typed value (function/bool/number/etc). Otherwise treat it as a
// string template and interpolate.
function resolveAttrRaw(scope, raw) {
  var full = FULL_EXPR_RE.exec(raw || '');
  if (full) return resolveExpr(scope, full[1]);
  return interpolateString(scope, raw);
}

var SKIP_ATTRS = {
  'hint-placeholder-val': 1,
  'hint-placeholder-count': 1,
  'hint-size': 1,
  'component-from-global-scope': 1,
  'from': 1,
  'as': 1,
  'list': 1,
  'value': 1,
  'checked': 1,
  'disabled': 1,
  'style-hover': 1,
  'sc-camel-on-click': 1,
  'sc-camel-on-change': 1,
  'sc-camel-auto-focus': 1
};

function applyHover(el, hoverRaw, scope) {
  var hoverCss = interpolateString(scope, hoverRaw);
  if (!hoverCss) return;
  var base = el.getAttribute('style') || '';
  el.addEventListener('mouseenter', function () {
    el.setAttribute('style', base + ';' + hoverCss);
  });
  el.addEventListener('mouseleave', function () {
    el.setAttribute('style', base);
  });
}

function buildImageSlot(engine, scope, node) {
  var idRaw = node.getAttribute('id') || '';
  var key = interpolateString(scope, idRaw);
  var shape = node.getAttribute('shape') || 'rect';
  var placeholder = interpolateString(scope, node.getAttribute('placeholder') || '');
  var styleStr = interpolateString(scope, node.getAttribute('style') || '');

  var wrap = document.createElement('div');
  wrap.setAttribute('style', styleStr +
    ';position:relative;cursor:pointer;overflow:hidden;background:var(--input-bg,#eee);' +
    'display:flex;align-items:center;justify-content:center;flex:none;' +
    (shape === 'circle' ? 'border-radius:50%;' : 'border-radius:8px;'));

  var storageKey = 'dh-tracker-img-' + key;
  var dataUrl = loadRaw(storageKey);

  function paint() {
    wrap.innerHTML = '';
    var du = loadRaw(storageKey);
    if (du) {
      var img = document.createElement('img');
      img.src = du;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      wrap.appendChild(img);
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.textContent = '✕';
      rm.title = 'Remove image';
      rm.style.cssText = 'position:absolute;top:2px;right:2px;width:18px;height:18px;line-height:16px;' +
        'padding:0;border:none;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;font-size:10px;cursor:pointer;';
      rm.onclick = function (e) {
        e.stopPropagation();
        removeRaw(storageKey);
        paint();
      };
      wrap.appendChild(rm);
    } else {
      var ph = document.createElement('span');
      ph.textContent = placeholder || '+ Add';
      ph.style.cssText = 'font-size:11px;color:var(--muted,#999);text-align:center;padding:4px;pointer-events:none;';
      wrap.appendChild(ph);
    }
  }
  paint();

  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.onchange = function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      var ok = saveRaw(storageKey, reader.result);
      if (!ok) {
        alert('That image is too large to store in the browser. Try a smaller photo.');
        return;
      }
      paint();
    };
    reader.readAsDataURL(f);
  };
  wrap.appendChild(fileInput);
  wrap.addEventListener('click', function () { fileInput.click(); });
  return wrap;
}

function renderNode(engine, node, scope, out, loopPath) {
  if (node.nodeType === 3) { // text
    var txt = interpolateString(scope, node.nodeValue);
    out.push(document.createTextNode(txt));
    return;
  }
  if (node.nodeType !== 1) return; // ignore comments etc.

  var tag = node.tagName.toLowerCase();

  if (tag === 'sc-if') {
    var val = resolveAttrRaw(scope, node.getAttribute('value') || '');
    if (val) renderChildren(engine, node, scope, out, loopPath);
    return;
  }

  if (tag === 'sc-for') {
    var listExprRaw = node.getAttribute('list') || '';
    var list = resolveAttrRaw(scope, listExprRaw) || [];
    var alias = node.getAttribute('as');
    var listKey = (FULL_EXPR_RE.exec(listExprRaw) || [null, listExprRaw])[1];
    for (var i = 0; i < list.length; i++) {
      var childScope = Object.create(scope);
      childScope[alias] = list[i];
      var childLoopPath = loopPath + '/' + listKey + ':' + i;
      renderChildren(engine, node, childScope, out, childLoopPath);
    }
    return;
  }

  if (tag === 'x-import') {
    out.push(buildImageSlot(engine, scope, node));
    return;
  }

  var realTag = tag === 'sc-raw-select' ? 'select' : tag;
  var el = document.createElement(realTag);

  var attrs = node.attributes;
  var valueRaw = null, checkedRaw = null, disabledRaw = null;
  var onClickRaw = null, onChangeRaw = null, autoFocusRaw = null, hoverRaw = null;
  var bindPathForFocus = null;

  for (var a = 0; a < attrs.length; a++) {
    var name = attrs[a].name;
    var raw = attrs[a].value;
    if (name === 'value') { valueRaw = raw; continue; }
    if (name === 'checked') { checkedRaw = raw; continue; }
    if (name === 'disabled') { disabledRaw = raw; continue; }
    if (name === 'sc-camel-on-click') { onClickRaw = raw; continue; }
    if (name === 'sc-camel-on-change') { onChangeRaw = raw; continue; }
    if (name === 'sc-camel-auto-focus') { autoFocusRaw = raw; continue; }
    if (name === 'style-hover') { hoverRaw = raw; continue; }
    if (SKIP_ATTRS[name]) continue;
    el.setAttribute(name, interpolateString(scope, raw));
  }

  // Populate children first (options etc.) — a <select>'s .value only
  // "sticks" once matching <option> elements already exist in the DOM.
  renderChildren(engine, node, scope, [], loopPath, el);

  if (valueRaw !== null) {
    var v = resolveAttrRaw(scope, valueRaw);
    el.value = (v === undefined || v === null) ? '' : v;
    var m = FULL_EXPR_RE.exec(valueRaw);
    if (m) {
      bindPathForFocus = loopPath + '|' + m[1];
      el.setAttribute('data-dc-bind', bindPathForFocus);
    }
  }
  if (checkedRaw !== null) el.checked = !!resolveAttrRaw(scope, checkedRaw);
  if (disabledRaw !== null) el.disabled = !!resolveAttrRaw(scope, disabledRaw);
  if (onClickRaw !== null) {
    var clickFn = resolveAttrRaw(scope, onClickRaw);
    if (typeof clickFn === 'function') el.onclick = function (fn) { return function (e) { fn(e); }; }(clickFn);
  }
  if (onChangeRaw !== null) {
    var changeFn = resolveAttrRaw(scope, onChangeRaw);
    if (typeof changeFn === 'function') el.onchange = function (fn) { return function (e) { fn(e); }; }(changeFn);
    // Mirror onto 'input' too, so typing feels live — but only for text-like
    // fields. Checkboxes/radios already fire their own 'change', and also
    // fire 'input' in modern browsers; wiring both would run a toggle
    // handler twice per click and cancel itself out.
    var textLikeTypes = { text: 1, number: 1, search: 1, email: 1, tel: 1, url: 1, password: 1, '': 1 };
    var isTextLike = realTag === 'textarea' || (realTag === 'input' && textLikeTypes[(el.getAttribute('type') || '').toLowerCase()]);
    if (typeof changeFn === 'function' && isTextLike) {
      el.oninput = el.onchange;
    }
  }
  if (hoverRaw !== null) applyHover(el, hoverRaw, scope);
  if (autoFocusRaw !== null && resolveAttrRaw(scope, autoFocusRaw) === true) {
    engine.pendingAutofocus = el;
  }

  out.push(el);
}

function renderChildren(engine, node, scope, out, loopPath, appendTo) {
  var target = appendTo || out;
  var isFragmentOut = !appendTo;
  var buf = [];
  var children = node.childNodes;
  for (var i = 0; i < children.length; i++) {
    renderNode(engine, children[i], scope, buf, loopPath);
  }
  for (var j = 0; j < buf.length; j++) {
    if (isFragmentOut) out.push(buf[j]);
    else appendTo.appendChild(buf[j]);
  }
}

export function DcEngine(templateHtml, ComponentClass, props, container) {
  var t = document.createElement('template');
  t.innerHTML = templateHtml;
  this.masterNodes = t.content.childNodes;
  this.container = container;
  this.instance = new ComponentClass(props);
  this.instance._engine = this;
  this.pendingAutofocus = null;
}

DcEngine.prototype.render = function () {
  this.pendingAutofocus = null;
  var vals = this.instance.renderVals();

  var active = document.activeElement;
  var focusInfo = null;
  if (active && this.container.contains(active) && active.getAttribute && active.getAttribute('data-dc-bind')) {
    focusInfo = {
      bind: active.getAttribute('data-dc-bind'),
      start: (typeof active.selectionStart === 'number') ? active.selectionStart : null,
      end: (typeof active.selectionEnd === 'number') ? active.selectionEnd : null
    };
  }

  var out = [];
  for (var i = 0; i < this.masterNodes.length; i++) {
    renderNode(this, this.masterNodes[i], vals, out, '');
  }
  this.container.innerHTML = '';
  for (var j = 0; j < out.length; j++) this.container.appendChild(out[j]);

  if (focusInfo) {
    var sel = '[data-dc-bind="' + CSS.escape(focusInfo.bind) + '"]';
    var el = this.container.querySelector(sel);
    if (el) {
      el.focus();
      if (focusInfo.start !== null && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        try { el.setSelectionRange(focusInfo.start, focusInfo.end); } catch (e) {}
      }
    }
  } else if (this.pendingAutofocus) {
    this.pendingAutofocus.focus();
  }
};

export function DCLogic(props) {
  this.props = props || {};
  if (!this.state) this.state = {};
}
DCLogic.prototype.setState = function (updater) {
  var prev = this.state;
  var patch = (typeof updater === 'function') ? updater(prev) : updater;
  this.state = Object.assign({}, prev, patch);
  this._engine.render();
};
