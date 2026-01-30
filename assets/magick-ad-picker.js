(() => {
    if (typeof window === 'undefined') {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('magick_ad_picker') !== '1') {
        return;
    }

    const origin = params.get('magick_ad_picker_origin') || '';
    const voidElements = new Set([
        'AREA',
        'BASE',
        'BR',
        'COL',
        'EMBED',
        'HR',
        'IMG',
        'INPUT',
        'LINK',
        'META',
        'PARAM',
        'SOURCE',
        'TRACK',
        'WBR',
    ]);

    let lastTarget = null;
    const highlight = (el) => {
        if (lastTarget && lastTarget !== el) {
            lastTarget.style.outline = '';
            lastTarget.style.outlineOffset = '';
        }
        lastTarget = el;
        if (el) {
            el.style.outline = '2px solid #2563eb';
            el.style.outlineOffset = '2px';
        }
    };

    const cleanup = () => {
        if (lastTarget) {
            lastTarget.style.outline = '';
            lastTarget.style.outlineOffset = '';
        }
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleMove, true);
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('keydown', handleKeydown, true);
        const ui = document.getElementById('magick-ad-picker-ui');
        if (ui) {
            ui.remove();
        }
    };

    const sendSelection = (payload) => {
        if (window.opener && payload) {
            try {
                window.opener.postMessage(payload, origin || '*');
            } catch (err) {
                // ignore
            }
        }
    };

    const buildSelector = (el) => {
        if (!el) {
            return null;
        }
        if (el.id) {
            return { targetType: 'id', value: el.id };
        }
        if (el.classList && el.classList.length > 0) {
            return { targetType: 'class', value: el.classList[0] };
        }
        return null;
    };

    const handleMove = (event) => {
        const ui = document.getElementById('magick-ad-picker-ui');
        if (ui && ui.contains(event.target)) {
            return;
        }
        highlight(event.target);
    };

    const handleClick = (event) => {
        const ui = document.getElementById('magick-ad-picker-ui');
        if (ui && ui.contains(event.target)) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const selection = buildSelector(event.target);
        if (!selection) {
            highlight(event.target);
            showHint('该元素没有 ID 或 Class，请换一个元素。');
            return;
        }
        sendSelection({
            type: 'magick-ad-node-picked',
            targetType: selection.targetType,
            value: selection.value,
        });
        cleanup();
    };

    const handleKeydown = (event) => {
        if (event.key === 'Escape') {
            cleanup();
        }
    };

    const showHint = (text) => {
        const hint = document.getElementById('magick-ad-picker-hint');
        if (!hint) {
            return;
        }
        hint.textContent = text;
        hint.style.opacity = '1';
        window.setTimeout(() => {
            hint.style.opacity = '0';
        }, 1600);
    };

    const buildUI = () => {
        const ui = document.createElement('div');
        ui.id = 'magick-ad-picker-ui';
        ui.style.position = 'fixed';
        ui.style.top = '18px';
        ui.style.right = '18px';
        ui.style.zIndex = '2147483647';
        ui.style.background = '#0f172a';
        ui.style.color = '#fff';
        ui.style.borderRadius = '12px';
        ui.style.padding = '12px 14px';
        ui.style.fontSize = '12px';
        ui.style.boxShadow = '0 12px 24px rgba(15, 23, 42, 0.35)';
        ui.style.maxWidth = '220px';
        ui.style.display = 'flex';
        ui.style.flexDirection = 'column';
        ui.style.gap = '8px';

        const title = document.createElement('div');
        title.textContent = '节点选择模式';
        title.style.fontWeight = '600';
        ui.appendChild(title);

        const desc = document.createElement('div');
        desc.textContent = '点击页面元素以选中，按 ESC 退出。';
        desc.style.opacity = '0.85';
        ui.appendChild(desc);

        const hint = document.createElement('div');
        hint.id = 'magick-ad-picker-hint';
        hint.style.color = '#fbbf24';
        hint.style.opacity = '0';
        hint.style.transition = 'opacity 0.2s ease';
        hint.textContent = '';
        ui.appendChild(hint);

        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = '退出';
        button.style.background = '#1d4ed8';
        button.style.border = 'none';
        button.style.color = '#fff';
        button.style.padding = '6px 10px';
        button.style.borderRadius = '999px';
        button.style.cursor = 'pointer';
        button.style.fontSize = '12px';
        button.addEventListener('click', cleanup);
        ui.appendChild(button);

        document.body.appendChild(ui);
    };

    document.body.style.cursor = 'crosshair';
    buildUI();

    document.addEventListener('mousemove', handleMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeydown, true);

    if (document.body) {
        const observer = new MutationObserver(() => {
            if (lastTarget && !document.body.contains(lastTarget)) {
                lastTarget = null;
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();
