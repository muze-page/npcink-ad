import { createRoot, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

const App = () => {
    const [value, setValue] = useState('');
    const [status, setStatus] = useState('');

    const handleSave = async () => {
        setStatus('saving');
        try {
            await apiFetch({
                path: '/magick-ad/v1/save-settings',
                method: 'POST',
                data: { value },
            });
            setStatus('saved');
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <div className="magick-ad-root">
            <h1>Magick AD</h1>
            <label htmlFor="magick-ad-input">Ad Name</label>
            <input
                id="magick-ad-input"
                type="text"
                value={value}
                onChange={(event) => setValue(event.target.value)}
            />
            <button type="button" onClick={handleSave}>
                保存
            </button>
            {status && <p>状态: {status}</p>}
        </div>
    );
};

apiFetch.use((options, next) => {
    return next({
        ...options,
        headers: {
            ...options.headers,
            'X-WP-Nonce': window.MagickAD?.nonce,
        },
    });
});

export default App;

const container = document.getElementById('magick-ad-app');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
