import { useEffect, useRef } from '@wordpress/element';

const CLASSIC_EDITOR_ID = 'magick_ad_classic_editor';
const CLASSIC_EDITOR_HOST_ID = 'magick-ad-classic-editor-host';

const ClassicEditor = ({ value, onChange, active }) => {
    const containerRef = useRef(null);
    const hostRef = useRef(null);
    const initializedRef = useRef(false);
    const editorRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || initializedRef.current) {
            return;
        }
        const host = document.getElementById(CLASSIC_EDITOR_HOST_ID);
        if (!host) {
            return;
        }
        hostRef.current = host;
        while (host.firstChild) {
            containerRef.current.appendChild(host.firstChild);
        }
        initializedRef.current = true;
        return () => {
            if (!hostRef.current || !containerRef.current) {
                return;
            }
            while (containerRef.current.firstChild) {
                hostRef.current.appendChild(
                    containerRef.current.firstChild
                );
            }
        };
    }, []);

    useEffect(() => {
        if (!active) {
            return;
        }
        const ensureEditor = () => {
            let editor = window.tinymce?.get(CLASSIC_EDITOR_ID);
            if (!editor && window.tinymce?.execCommand) {
                try {
                    window.tinymce.execCommand(
                        'mceAddEditor',
                        true,
                        CLASSIC_EDITOR_ID
                    );
                } catch (err) {
                    editor = null;
                }
                editor = window.tinymce?.get(CLASSIC_EDITOR_ID);
            }
            if (editor) {
                editor.show();
                editor.fire('ResizeEditor');
                const container = editor.getContainer?.();
                if (container) {
                    container.style.minHeight = '220px';
                }
                if (editor.iframeElement) {
                    editor.iframeElement.style.minHeight = '220px';
                }
                if (value !== editor.getContent()) {
                    editor.setContent(value || '');
                    editor.save();
                }
            }
            const textarea = document.getElementById(CLASSIC_EDITOR_ID);
            if (textarea && textarea.value !== (value || '')) {
                textarea.value = value || '';
            }
        };
        ensureEditor();
        const timer = window.setTimeout(ensureEditor, 80);
        return () => window.clearTimeout(timer);
    }, [active, value]);

    useEffect(() => {
        const handleChange = () => {
            if (!active) {
                return;
            }
            const currentEditor = editorRef.current;
            if (currentEditor) {
                onChange(currentEditor.getContent());
                return;
            }
            const textarea = document.getElementById(CLASSIC_EDITOR_ID);
            if (textarea) {
                onChange(textarea.value || '');
            }
        };
        const bindEditor = () => {
            const currentEditor = window.tinymce?.get(CLASSIC_EDITOR_ID);
            if (!currentEditor || currentEditor === editorRef.current) {
                return;
            }
            editorRef.current = currentEditor;
            currentEditor.on('change keyup input undo redo', handleChange);
        };
        const interval = window.setInterval(bindEditor, 300);
        bindEditor();

        const textarea = document.getElementById(CLASSIC_EDITOR_ID);
        if (textarea) {
            textarea.addEventListener('input', handleChange);
        }
        return () => {
            window.clearInterval(interval);
            if (editorRef.current) {
                editorRef.current.off(
                    'change keyup input undo redo',
                    handleChange
                );
                editorRef.current = null;
            }
            if (textarea) {
                textarea.removeEventListener('input', handleChange);
            }
        };
    }, [active, onChange]);

    return (
        <div
            className={`magick-ad-classic-host ${
                active ? 'is-active' : 'is-hidden'
            }`}
            ref={containerRef}
        />
    );
};

export default ClassicEditor;
