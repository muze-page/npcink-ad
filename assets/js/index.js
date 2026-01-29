import { createRoot } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import './index.css';
import App from './sections/App';

apiFetch.use((options, next) => {
    return next({
        ...options,
        headers: {
            ...options.headers,
            'X-WP-Nonce': window.MagickAD?.nonce,
        },
    });
});

const container = document.getElementById('magick-ad-app');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
