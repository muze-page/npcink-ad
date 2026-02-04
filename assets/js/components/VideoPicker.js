import { useRef } from '@wordpress/element';
import { Button } from '@wordpress/components';

const VideoPicker = ({ value, onChange, compact = false }) => {
    const frameRef = useRef(null);

    const handleOpen = () => {
        if (!window.wp?.media) {
            // eslint-disable-next-line no-console
            console.error('wp.media is not available.');
            return;
        }

        if (frameRef.current) {
            frameRef.current.open();
            return;
        }

        const frame = window.wp.media({
            title: '选择视频',
            button: { text: '使用此视频' },
            library: { type: 'video' },
            multiple: false,
        });

        frame.on('select', () => {
            const attachment = frame
                .state()
                .get('selection')
                .first()
                .toJSON();
            onChange(attachment.url || '');
        });

        frameRef.current = frame;
        frame.open();
    };

    if (compact) {
        return (
            <div className="magick-ad-video-picker is-compact">
                {value ? (
                    <div className="magick-ad-image-actions">
                        <Button onClick={handleOpen} variant="secondary">
                            更换视频
                        </Button>
                        <Button
                            onClick={() => onChange('')}
                            variant="tertiary"
                            isDestructive
                        >
                            移除
                        </Button>
                    </div>
                ) : (
                    <Button onClick={handleOpen} variant="secondary">
                        选择视频
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="magick-ad-video-picker">
            {value ? (
                <div className="magick-ad-video-preview">
                    <video src={value} controls />
                    <div className="magick-ad-image-actions">
                        <Button onClick={handleOpen} variant="secondary">
                            更换视频
                        </Button>
                        <Button
                            onClick={() => onChange('')}
                            variant="tertiary"
                            isDestructive
                        >
                            移除
                        </Button>
                    </div>
                </div>
            ) : (
                <Button onClick={handleOpen} variant="secondary">
                    选择视频
                </Button>
            )}
        </div>
    );
};

export default VideoPicker;
