import { useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

const formatTime = (timestamp) => {
    if (!timestamp) {
        return '';
    }
    const date = new Date(Number(timestamp) * 1000);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return date.toLocaleString();
};

const BuildProbe = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let mounted = true;
        apiFetch({ path: '/magick-ad/v1/debug' })
            .then((response) => {
                if (!mounted) {
                    return;
                }
                setVisible(Boolean(response?.build_probe));
            })
            .catch(() => {});

        const handler = (event) => {
            const next = Boolean(event?.detail?.build_probe);
            setVisible(next);
        };
        window.addEventListener('magick-ad-debug-updated', handler);
        return () => {
            mounted = false;
            window.removeEventListener('magick-ad-debug-updated', handler);
        };
    }, []);

    if (!visible) {
        return null;
    }

    const buildTime = window.MagickAD?.buildTime;
    const buildVersion = window.MagickAD?.buildVersion;

    return (
        <div className="magick-ad-build-probe">
            <div className="magick-ad-build-probe__title">Build</div>
            <div className="magick-ad-build-probe__meta">
                {buildVersion ? `v${buildVersion}` : 'dev'}
            </div>
            <div className="magick-ad-build-probe__time">
                {formatTime(buildTime) || 'unknown'}
            </div>
        </div>
    );
};

export default BuildProbe;
