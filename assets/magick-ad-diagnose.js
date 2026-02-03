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

    const handleCopy = (panel) => {
        const content = panel.querySelector('#magick-ad-diagnose-content');
        if (!content) {
            return;
        }
        const text = content.textContent || '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
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
            if (action === 'copy') {
                handleCopy(panel);
            }
        },
        true
    );
})();
