import { useEffect, useRef } from '@wordpress/element';

const CLASSIC_EDITOR_ID = 'magick_ad_classic_editor';
const CLASSIC_EDITOR_HOST_ID = 'magick-ad-classic-editor-host';

const ClassicEditor = ({ value, onChange, active }) => {
    const containerRef = useRef(null);
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
        while (host.firstChild) {
            containerRef.current.appendChild(host.firstChild);
        }
        initializedRef.current = true;
    }, []);

    useEffect(() => {
        if (!active) {
            return;
        }
        const editor = window.tinymce?.get(CLASSIC_EDITOR_ID);
        if (editor && value !== editor.getContent()) {
            editor.setContent(value || '');
            editor.save();
        }
        const textarea = document.getElementById(CLASSIC_EDITOR_ID);
        if (textarea && textarea.value !== (value || '')) {
            textarea.value = value || '';
        }
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
