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
    const activeModal = {
        element: null,
        lastFocused: null,
    };
    const prefersReducedMotion =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

    const readStorageValue = (storage, key) => {
        try {
            return storage.getItem(key);
        } catch (err) {
            return null;
        }
    };

    const writeStorageValue = (storage, key, value) => {
        try {
            storage.setItem(key, value);
            return true;
        } catch (err) {
            return false;
        }
    };

    const shouldShowByFrequency = (element) => {
        const mode = element.getAttribute('data-ad-freq-mode') || 'none';
        if (mode === 'none') {
            return true;
        }
        const adId = element.getAttribute('data-ad-id');
        if (!adId) {
            return true;
        }
        if (mode === 'session') {
            return !readStorageValue(
                sessionStorage,
                `magick_ad_freq_${adId}`
            );
        }
        if (mode === 'day') {
            const day = new Date().toISOString().slice(0, 10);
            return !readStorageValue(
                localStorage,
                `magick_ad_freq_${adId}_${day}`
            );
        }
        if (mode === 'count') {
            const limit = Number(
                element.getAttribute('data-ad-freq-limit') || 1
            );
            const rawCount = readStorageValue(
                localStorage,
                `magick_ad_freq_${adId}`
            );
            const count = Number(rawCount || 0);
            return count < limit;
        }
        return true;
    };

    const recordFrequency = (element) => {
        const mode = element.getAttribute('data-ad-freq-mode') || 'none';
        const adId = element.getAttribute('data-ad-id');
        if (!adId || mode === 'none') {
            return;
        }
        if (mode === 'session') {
            writeStorageValue(
                sessionStorage,
                `magick_ad_freq_${adId}`,
                '1'
            );
        } else if (mode === 'day') {
            const day = new Date().toISOString().slice(0, 10);
            writeStorageValue(
                localStorage,
                `magick_ad_freq_${adId}_${day}`,
                '1'
            );
        } else if (mode === 'count') {
            const key = `magick_ad_freq_${adId}`;
            const limit = Number(
                element.getAttribute('data-ad-freq-limit') || 1
            );
            const rawCount = readStorageValue(localStorage, key);
            const count = Number(rawCount || 0);
            if (count < limit) {
                writeStorageValue(localStorage, key, String(count + 1));
            }
        }
    };

    const lockScroll = (element) => {
        const shouldLock = element.getAttribute('data-ad-lock-scroll') === '1';
        const container = element.getAttribute('data-ad-container') || '';
        if (container !== 'popup') {
            return;
        }
        if (!shouldLock) {
            return;
        }
        document.body.classList.add('magick-ad-lock-scroll');
    };

    const unlockScroll = () => {
        document.body.classList.remove('magick-ad-lock-scroll');
    };

    const activateModal = (element) => {
        const container = element.getAttribute('data-ad-container') || '';
        if (
            container === 'popup' ||
            container === 'interstitial' ||
            container === 'banner'
        ) {
            activeModal.element = element;
            activeModal.lastFocused = document.activeElement;
            if (container === 'popup' || container === 'interstitial') {
                const popup = element.querySelector('.magick-ad-popup');
                if (popup) {
                    popup.setAttribute('tabindex', '-1');
                    popup.focus({ preventScroll: true });
                }
            }
            if (container === 'popup') {
                lockScroll(element);
            }
        }
    };

    const deactivateModal = (element) => {
        if (!element) {
            return;
        }
        if (activeModal.element === element) {
            const lastFocused = activeModal.lastFocused;
            activeModal.element = null;
            activeModal.lastFocused = null;
            unlockScroll();
            if (lastFocused && typeof lastFocused.focus === 'function') {
                lastFocused.focus();
            }
        }
    };

    const closeAd = (element) => {
        if (!element) {
            return;
        }
        element.classList.add('magick-ad-is-hidden');
        element.setAttribute('aria-hidden', 'true');
        deactivateModal(element);
    };

    const trapFocus = (event) => {
        if (event.key !== 'Tab' || !activeModal.element) {
            return;
        }
        const container =
            activeModal.element.getAttribute('data-ad-container') || '';
        if (container !== 'popup' && container !== 'interstitial') {
            return;
        }
        const popup = activeModal.element.querySelector('.magick-ad-popup');
        if (!popup) {
            return;
        }
        const focusable = popup.querySelectorAll(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) {
            event.preventDefault();
            popup.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey) {
            if (document.activeElement === first || document.activeElement === popup) {
                event.preventDefault();
                last.focus();
            }
        } else if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const applyBehavior = () => {
        document.querySelectorAll('[data-ad-id]').forEach((element) => {
            const delay = Number(element.getAttribute('data-ad-delay') || 0);
            const animation = element.getAttribute('data-ad-anim');

            if (!shouldShowByFrequency(element)) {
                element.dataset.adFreqBlocked = '1';
                element.classList.add('magick-ad-is-hidden');
                element.setAttribute('aria-hidden', 'true');
                return;
            }

            const showAd = () => {
                element.classList.remove('magick-ad-is-hidden');
                element.removeAttribute('aria-hidden');
                if (animation && !prefersReducedMotion) {
                    element.classList.add(`magick-ad-anim--${animation}`);
                }
                recordFrequency(element);
                activateModal(element);
            };

            if (element.getAttribute('data-ad-random') === 'session') {
                element.classList.add('magick-ad-is-hidden');
                return;
            }

            if (delay > 0) {
                element.classList.add('magick-ad-is-hidden');
                window.setTimeout(showAd, delay * 1000);
            } else if (animation && !prefersReducedMotion) {
                element.classList.add(`magick-ad-anim--${animation}`);
                recordFrequency(element);
                activateModal(element);
            } else {
                recordFrequency(element);
                activateModal(element);
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
                if (element.dataset.adFreqBlocked === '1') {
                    return;
                }
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
                const delay = Number(
                    element.getAttribute('data-ad-delay') || 0
                );
                const animation = element.getAttribute('data-ad-anim');
                const showAd = () => {
                    element.classList.remove('magick-ad-is-hidden');
                    element.removeAttribute('aria-hidden');
                    if (animation && !prefersReducedMotion) {
                        element.classList.add(`magick-ad-anim--${animation}`);
                    }
                    recordFrequency(element);
                    activateModal(element);
                };

                if (value === '1') {
                    if (delay > 0) {
                        element.classList.add('magick-ad-is-hidden');
                        window.setTimeout(showAd, delay * 1000);
                    } else {
                        showAd();
                    }
                } else {
                    element.classList.add('magick-ad-is-hidden');
                    element.setAttribute('aria-hidden', 'true');
                }
            });
    };

    const handleClick = (event) => {
        const overlay = event.target.closest('.magick-ad-overlay');
        if (overlay) {
            const ad = overlay.closest('[data-ad-id]');
            if (
                ad &&
                ad.getAttribute('data-ad-close-overlay') === '1'
            ) {
                closeAd(ad);
                event.preventDefault();
                event.stopPropagation();
            }
            return;
        }
        const closeButton = event.target.closest('.magick-ad-close');
        if (closeButton) {
            const ad = closeButton.closest('[data-ad-id]');
            if (ad) {
                closeAd(ad);
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

    document.addEventListener('keydown', (event) => {
        if (!activeModal.element) {
            return;
        }
        if (event.key === 'Escape') {
            if (activeModal.element.getAttribute('data-ad-close-esc') === '1') {
                closeAd(activeModal.element);
                event.preventDefault();
            }
            return;
        }
        trapFocus(event);
    });

    document.addEventListener('click', handleClick, true);
})();
