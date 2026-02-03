(() => {
    const fallbackCopy = (text) => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            // Silently ignore copy failures.
        }
        document.body.removeChild(textarea);
    };

    const showToast = (panel, message) => {
        const existing = panel.querySelector('.magick-ad-diagnose__toast');
        const toast = existing || document.createElement('div');
        if (!existing) {
            toast.className = 'magick-ad-diagnose__toast';
            panel.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('is-visible');
        window.clearTimeout(toast.__hideTimer);
        toast.__hideTimer = window.setTimeout(() => {
            toast.classList.remove('is-visible');
        }, 1600);
    };

    const updateButtonLabel = (button, nextLabel) => {
        if (!button) {
            return;
        }
        if (!button.dataset.originalLabel) {
            button.dataset.originalLabel = button.textContent || '';
        }
        button.textContent = nextLabel;
        window.clearTimeout(button.__labelTimer);
        button.__labelTimer = window.setTimeout(() => {
            button.textContent = button.dataset.originalLabel || '复制报告';
        }, 1400);
    };

    const handleCopy = (panel) => {
        const content = panel.querySelector('#magick-ad-diagnose-content');
        if (!content) {
            return Promise.resolve(false);
        }
        const text = content.textContent || '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard
                .writeText(text)
                .then(() => true)
                .catch(() => {
                    fallbackCopy(text);
                    return true;
                });
        }
        fallbackCopy(text);
        return Promise.resolve(true);
    };

    const togglePanel = (panel, button) => {
        const collapsed = panel.classList.toggle('is-collapsed');
        if (button) {
            button.textContent = collapsed ? '展开' : '折叠';
            button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        }
    };

    document.addEventListener(
        'click',
        (event) => {
            const button = event.target.closest('.magick-ad-diagnose__btn');
            if (!button) {
                return;
            }
            const panel = button.closest('.magick-ad-diagnose');
            if (!panel) {
                return;
            }
            const action = button.getAttribute('data-action') || '';
            if (action === 'close') {
                panel.remove();
                return;
            }
            if (action === 'toggle') {
                togglePanel(panel, button);
                return;
            }
            if (action === 'copy') {
                handleCopy(panel).then((ok) => {
                    if (ok) {
                        updateButtonLabel(button, '已复制');
                        showToast(panel, '已复制到剪贴板');
                    } else {
                        showToast(panel, '复制失败');
                    }
                });
            }
        },
        true
    );
})();
