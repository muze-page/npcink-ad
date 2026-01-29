import { useRef } from '@wordpress/element';
import { Button, TextControl, ToggleControl } from '@wordpress/components';

const LinkPicker = ({ value, target, onChange }) => {
    const proxyIdRef = useRef(
        `magick-ad-link-proxy-${Math.random().toString(36).slice(2)}`
    );

    const openLinkModal = () => {
        if (!window.wpLink || !window.jQuery) {
            return;
        }
        const proxyId = proxyIdRef.current;
        const previousActiveEditor = window.wpActiveEditor;
        const originalUpdate = window.wpLink.update;

        window.wpLink.update = () => {
            const attrs = window.wpLink.getAttrs();
            onChange({
                url: attrs?.href || '',
                target: attrs?.target === '_blank',
            });
            originalUpdate.call(window.wpLink);
        };

        window.jQuery(document).one('wplink-close', () => {
            window.wpLink.update = originalUpdate;
            window.wpActiveEditor = previousActiveEditor;
        });

        window.wpActiveEditor = proxyId;
        window.wpLink.textarea = window.jQuery(`#${proxyId}`);
        window.wpLink.open(proxyId, value || '', '');
    };

    return (
        <div className="magick-ad-link-picker">
            <div className="magick-ad-link-picker__row">
                <div className="magick-ad-link-picker__field">
                    <TextControl
                        label="跳转链接"
                        value={value || ''}
                        onChange={(next) => onChange({ url: next, target })}
                    />
                </div>
                <div className="magick-ad-link-picker__actions">
                    <Button variant="secondary" onClick={openLinkModal}>
                        选择链接
                    </Button>
                    {value && (
                        <Button
                            variant="tertiary"
                            onClick={() => onChange({ url: '', target: false })}
                        >
                            清除
                        </Button>
                    )}
                </div>
            </div>
            <ToggleControl
                label="在新标签页中打开链接"
                checked={Boolean(target)}
                onChange={(next) => onChange({ url: value || '', target: next })}
            />
            <textarea
                id={proxyIdRef.current}
                style={{ display: 'none' }}
                defaultValue={value || ''}
            />
        </div>
    );
};

export default LinkPicker;
