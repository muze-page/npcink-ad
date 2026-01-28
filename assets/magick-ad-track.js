(() => {
    const config = window.MagickADTrack || {};
    const trackUrl = config.restUrl;
    if (!trackUrl) {
        return;
    }

    const sendTrack = (payload, useBeacon = false) => {
        const body = JSON.stringify({
            ad_id: payload.adId,
            event: payload.event,
            page_url: window.location.href,
        });

        if (useBeacon && navigator.sendBeacon) {
            const blob = new Blob([body], { type: 'application/json' });
            navigator.sendBeacon(trackUrl, blob);
            return;
        }

        fetch(trackUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(config.nonce ? { 'X-WP-Nonce': config.nonce } : {}),
            },
            body,
            keepalive: true,
        }).catch(() => undefined);
    };

    const observed = new Map();
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                const adId = entry.target.getAttribute('data-ad-id');
                if (!adId) {
                    return;
                }

                const state = observed.get(adId) || {
                    seen: false,
                    timer: null,
                };

                if (entry.isIntersecting) {
                    if (!state.seen && !state.timer) {
                        state.timer = window.setTimeout(() => {
                            sendTrack({ adId, event: 'impression' });
                            state.seen = true;
                            state.timer = null;
                            observed.set(adId, state);
                        }, 2000);
                    }
                } else if (state.timer) {
                    window.clearTimeout(state.timer);
                    state.timer = null;
                }

                observed.set(adId, state);
            });
        },
        { threshold: 0.5 }
    );

    const initObservers = () => {
        document
            .querySelectorAll('[data-ad-id]')
            .forEach((element) => observer.observe(element));
    };

    const handleClick = (event) => {
        const target = event.target.closest('[data-ad-id]');
        if (!target) {
            return;
        }
        const adId = target.getAttribute('data-ad-id');
        if (!adId) {
            return;
        }
        sendTrack({ adId, event: 'click' }, true);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initObservers);
    } else {
        initObservers();
    }

    document.addEventListener('click', handleClick, true);
})();
