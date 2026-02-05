(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function createPanel(message) {
    var panel = document.createElement('div');
    panel.className = 'magick-ad-node-debug-panel';
    panel.textContent = message;
    document.body.appendChild(panel);
    return panel;
  }

  function normalizeValue(value) {
    if (!value) {
      return '';
    }
    return String(value).trim();
  }

  function stripPrefix(value, prefix) {
    if (value.indexOf(prefix) === 0) {
      return value.slice(prefix.length);
    }
    return value;
  }

  ready(function () {
    var config = window.MagickADNodeDebug || {};
    var type = config.type || 'id';
    var value = normalizeValue(config.value || '');
    var match = config.match || 'first';
    var index = parseInt(config.index, 10);
    if (!index || index < 1) {
      index = 1;
    }

    var style = document.createElement('style');
    style.textContent =
      '.magick-ad-node-debug-target{outline:2px dashed #f97316 !important; outline-offset:2px !important; position:relative !important;}' +
      '.magick-ad-node-debug-label{position:absolute;top:-10px;left:-10px;background:#f97316;color:#fff;font-size:11px;line-height:1;padding:4px 6px;border-radius:6px;z-index:99999;}' +
      '.magick-ad-node-debug-panel{position:fixed;top:16px;left:16px;z-index:999999;background:#111827;color:#fff;padding:8px 12px;border-radius:8px;font-size:12px;box-shadow:0 8px 20px rgba(0,0,0,0.2);}';
    document.head.appendChild(style);

    if (!value) {
      createPanel('未提供节点值，无法定位元素。');
      return;
    }

    var targets = [];
    if (type === 'id') {
      var idValue = stripPrefix(value, '#');
      var el = document.getElementById(idValue);
      if (el) {
        targets = [el];
      }
    } else if (type === 'class') {
      var classValue = stripPrefix(value, '.');
      targets = Array.prototype.slice.call(document.getElementsByClassName(classValue));
    }

    if (!targets.length) {
      createPanel('未找到匹配的节点。');
      return;
    }

    var selected = [];
    if (match === 'all') {
      selected = targets;
    } else if (match === 'index') {
      if (targets[index - 1]) {
        selected = [targets[index - 1]];
      }
    } else {
      selected = [targets[0]];
    }

    if (!selected.length) {
      createPanel('未找到匹配的节点。');
      return;
    }

    selected.forEach(function (node, idx) {
      node.classList.add('magick-ad-node-debug-target');
      var label = document.createElement('div');
      label.className = 'magick-ad-node-debug-label';
      label.textContent = '目标 ' + (idx + 1);
      node.appendChild(label);
    });

    selected[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    createPanel('已定位 ' + selected.length + ' 个节点');
  });
})();
