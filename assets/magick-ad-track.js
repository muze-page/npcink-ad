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

    const applyBehavior = () => {
        document.querySelectorAll('[data-ad-id]').forEach((element) => {
            const delay = Number(element.getAttribute('data-ad-delay') || 0);
            const animation = element.getAttribute('data-ad-anim');

            const showAd = () => {
                element.classList.remove('magick-ad-is-hidden');
                if (animation) {
                    element.classList.add(`magick-ad-anim--${animation}`);
                }
            };

            if (delay > 0) {
                element.classList.add('magick-ad-is-hidden');
                window.setTimeout(showAd, delay * 1000);
            } else if (animation) {
                element.classList.add(`magick-ad-anim--${animation}`);
            }
        });
    };

    const initObservers = () => {
        document
            .querySelectorAll('[data-ad-id]')
            .forEach((element) => observer.observe(element));
        applyBehavior();
        applyRandomStrategy();
    };

    const applyRandomStrategy = () => {
        const bucket = Math.floor(Date.now() / 300000);
        document
            .querySelectorAll('[data-ad-random="session"]')
            .forEach((element) => {
                const adId = element.getAttribute('data-ad-id');
                if (!adId) {
                    return;
                }
                const key = `magick_ad_random_${adId}_${bucket}`;
                let value = null;
                try {
                    value = sessionStorage.getItem(key);
                } catch (err) {
                    value = null;
                }
                if (!value) {
                    value = Math.random() >= 0.5 ? '1' : '0';
                    try {
                        sessionStorage.setItem(key, value);
                    } catch (err) {
                        // ignore
                    }
                }
                if (value === '1') {
                    element.classList.remove('magick-ad-is-hidden');
                } else {
                    element.classList.add('magick-ad-is-hidden');
                }
            });
    };

    const handleClick = (event) => {
        const closeButton = event.target.closest('.magick-ad-close');
        if (closeButton) {
            const ad = closeButton.closest('[data-ad-id]');
            if (ad) {
                ad.classList.add('magick-ad-is-hidden');
            }
            event.preventDefault();
            event.stopPropagation();
            return;
        }
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
