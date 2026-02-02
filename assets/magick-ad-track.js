(() => {
    const config = window.MagickADTrack || {};
    const trackUrl = config.restUrl;
    if (!trackUrl) {
        return;
    }

    const hasConsent = config.hasConsent === true;
    const requireConsent = config.requireConsent === true;
    const allowLocalStorage = hasConsent;
    const allowSessionStorage = hasConsent;

    const readStorageValue = (storage, key) => {
        if (
            (storage === localStorage && !allowLocalStorage) ||
            (storage === sessionStorage && !allowSessionStorage)
        ) {
            return null;
        }
        try {
            return storage.getItem(key);
        } catch (err) {
            return null;
        }
    };

    const writeStorageValue = (storage, key, value) => {
        if (
            (storage === localStorage && !allowLocalStorage) ||
            (storage === sessionStorage && !allowSessionStorage)
        ) {
            return false;
        }
        try {
            storage.setItem(key, value);
            return true;
        } catch (err) {
            return false;
        }
    };

    const getSessionId = () => {
        if (!allowSessionStorage) {
            return '';
        }
        const key = 'magick_ad_session_id';
        const existing = readStorageValue(sessionStorage, key);
        if (existing) {
            return existing;
        }
        let id = '';
        if (window.crypto && window.crypto.randomUUID) {
            id = window.crypto.randomUUID();
        } else {
            id = `sess_${Math.random().toString(36).slice(2)}${Date.now()}`;
        }
        writeStorageValue(sessionStorage, key, id);
        return id;
    };

    const sessionId = getSessionId();
    const hashString = (value) => {
        let hash = 0;
        for (let i = 0; i < value.length; i += 1) {
            hash = (hash << 5) - hash + value.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(16);
    };
    const pageHash = hashString(window.location.href);

    const buildTrackPayload = (element, event) => {
        if (!element) {
            return null;
        }
        const adId = element.getAttribute('data-ad-id');
        if (!adId) {
            return null;
        }
        return {
            adId,
            event,
            sig: element.getAttribute('data-ad-sig') || '',
            sigTs: element.getAttribute('data-ad-sig-ts') || '',
            slot: element.getAttribute('data-ad-slot') || '',
            position: element.getAttribute('data-ad-position') || '',
            container: element.getAttribute('data-ad-container') || '',
        };
    };

    const sendTrack = (payload, useBeacon = false) => {
        if (requireConsent && !hasConsent) {
            return;
        }
        if (!payload || !payload.adId) {
            return;
        }
        const bodyData = {
            ad_id: payload.adId,
            event: payload.event,
            session_id: sessionId,
            page_hash: pageHash,
        };
        if (payload.sig) {
            bodyData.sig = payload.sig;
        }
        if (payload.sigTs) {
            bodyData.sig_ts = payload.sigTs;
        }
        if (payload.slot) {
            bodyData.slot = payload.slot;
        }
        if (payload.position) {
            bodyData.position = payload.position;
        }
        if (payload.container) {
            bodyData.container = payload.container;
        }
        if (config.collectPageUrl) {
            bodyData.page_url = window.location.href;
        }
        const body = JSON.stringify(bodyData);

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
    const dedupeScope = config.dedupeScope === 'placement' ? 'placement' : 'ad';
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                const payload = buildTrackPayload(
                    entry.target,
                    'impression'
                );
                if (!payload) {
                    return;
                }

                const observedKey =
                    dedupeScope === 'placement'
                        ? [
                              payload.adId,
                              payload.slot || '',
                              payload.position || '',
                              payload.container || '',
                          ].join('|')
                        : payload.adId;

                const state = observed.get(observedKey) || {
                    seen: false,
                    timer: null,
                };

                if (entry.isIntersecting) {
                    if (!state.seen && !state.timer) {
                        state.timer = window.setTimeout(() => {
                            sendTrack(payload);
                            state.seen = true;
                            state.timer = null;
                            observed.set(observedKey, state);
                        }, 2000);
                    }
                } else if (state.timer) {
                    window.clearTimeout(state.timer);
                    state.timer = null;
                }

                observed.set(observedKey, state);
            });
        },
        { threshold: 0.5 }
    );

    const initAdElement = (element) => {
        if (!element || element.dataset.adInitialized === '1') {
            return;
        }
        element.dataset.adInitialized = '1';
        observer.observe(element);
    };

    const initTracking = () => {
        document.querySelectorAll('[data-ad-id]').forEach((element) => {
            initAdElement(element);
        });
    };

    const initObservers = () => {
        initTracking();
    };

    const observeNewAds = () => {
        if (!window.MutationObserver || !document.body) {
            return;
        }
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (!node || node.nodeType !== 1) {
                        return;
                    }
                    if (node.matches?.('[data-ad-id]')) {
                        initAdElement(node);
                    }
                    if (node.querySelectorAll) {
                        node.querySelectorAll('[data-ad-id]').forEach(
                            (element) => {
                                initAdElement(element);
                            }
                        );
                    }
                });
            });
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    };

    const handleClick = (event) => {
        if (event.target.closest('.magick-ad-overlay')) {
            return;
        }
        if (event.target.closest('.magick-ad-close')) {
            return;
        }
        const target = event.target.closest('[data-ad-id]');
        if (!target) {
            return;
        }
        const payload = buildTrackPayload(target, 'click');
        if (!payload) {
            return;
        }
        sendTrack(payload, true);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initObservers();
            observeNewAds();
        });
    } else {
        initObservers();
        observeNewAds();
    }
    document.addEventListener('click', handleClick, true);
})();
