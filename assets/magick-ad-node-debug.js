/* global MagickADNodeDebug */
(function () {
    const cfg = typeof MagickADNodeDebug === 'object' ? MagickADNodeDebug : {};
    const value = cfg.value || '';
    if (!value) {
        return;
    }
    const type = cfg.type === 'class' ? 'class' : 'id';
    const match = cfg.match || 'first';
    const index = Number(cfg.index || 1) || 1;

    const escape = (val) => {
        if (typeof CSS !== 'undefined' && CSS.escape) {
            return CSS.escape(val);
        }
        return val.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
    };

    const selector = type === 'class' ? `.${escape(value)}` : `#${escape(value)}`;
    const nodes = Array.from(document.querySelectorAll(selector));
    let targets = [];
    if (match === 'all') {
        targets = nodes;
    } else if (match === 'nth') {
        if (nodes[index - 1]) {
            targets = [nodes[index - 1]];
        }
    } else if (nodes[0]) {
        targets = [nodes[0]];
    }

    const style = document.createElement('style');
    style.textContent =
        '.magick-ad-node-debug-highlight{outline:2px dashed #f97316!important;outline-offset:2px;}' +
        '.magick-ad-node-debug-badge{position:absolute;top:-22px;left:0;background:#f97316;color:#fff;font-size:11px;padding:2px 6px;border-radius:6px;z-index:999999;line-height:1.2;}' +
        '.magick-ad-node-debug-toast{position:fixed;right:16px;top:16px;background:#111827;color:#fff;padding:8px 12px;border-radius:10px;font-size:12px;z-index:999999;}';
    document.head.appendChild(style);

    const toast = document.createElement('div');
    toast.className = 'magick-ad-node-debug-toast';
    toast.textContent = targets.length
        ? `Magick AD：匹配 ${targets.length} 个节点 (${selector})`
        : `Magick AD：未找到节点 ${selector}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);

    if (!targets.length) {
        console.warn('[Magick AD] node debug: no match', selector);
        return;
    }

    const cleanups = [];
    targets.forEach((node) => {
        if (!(node instanceof HTMLElement)) {
            return;
        }
        const originalPosition = node.style.position;
        if (getComputedStyle(node).position === 'static') {
            node.style.position = 'relative';
            cleanups.push(() => {
                node.style.position = originalPosition;
            });
        }
        node.classList.add('magick-ad-node-debug-highlight');
        const badge = document.createElement('div');
        badge.className = 'magick-ad-node-debug-badge';
        badge.textContent = selector;
        node.appendChild(badge);
        cleanups.push(() => {
            node.classList.remove('magick-ad-node-debug-highlight');
            badge.remove();
        });
    });

    setTimeout(() => {
        cleanups.forEach((fn) => fn());
    }, 8000);
})();
