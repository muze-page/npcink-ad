(() => {
    const config = window.MagickADTrack || {};
    const trackUrl = config.restUrl;
    if (!trackUrl) {
        return;
    }

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

    const getSessionId = () => {
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

    const sendTrack = (payload, useBeacon = false) => {
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
    const activeModal = {
        element: null,
        lastFocused: null,
    };
    const voidElements = new Set([
        'AREA',
        'BASE',
        'BR',
        'COL',
        'EMBED',
        'HR',
        'IMG',
        'INPUT',
        'LINK',
        'META',
        'PARAM',
        'SOURCE',
        'TRACK',
        'WBR',
    ]);
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
                            sendTrack({
                                adId,
                                event: 'impression',
                                sig: entry.target.getAttribute('data-ad-sig'),
                                sigTs: entry.target.getAttribute('data-ad-sig-ts'),
                            });
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

    const ensureFooterZone = () => {
        let zone = document.querySelector('.magick-ad-zone--footer');
        if (zone) {
            return zone;
        }
        zone = document.createElement('div');
        zone.className = 'magick-ad-zone magick-ad-zone--footer';
        document.body.appendChild(zone);
        return zone;
    };

    const normalizeInsertMode = (target, insertMode) => {
        if (!target) {
            return insertMode;
        }
        const tag = target.tagName || '';
        if (insertMode === 'append' || insertMode === 'prepend') {
            if (tag === 'P' || voidElements.has(tag)) {
                return insertMode === 'append' ? 'after' : 'before';
            }
        }
        return insertMode;
    };

    const insertElement = (target, element, insertMode) => {
        if (!target || !element) {
            return false;
        }
        const mode = normalizeInsertMode(target, insertMode);
        try {
            switch (mode) {
                case 'prepend':
                    target.insertAdjacentElement('afterbegin', element);
                    break;
                case 'before':
                    target.insertAdjacentElement('beforebegin', element);
                    break;
                case 'after':
                    target.insertAdjacentElement('afterend', element);
                    break;
                case 'append':
                default:
                    target.insertAdjacentElement('beforeend', element);
                    break;
            }
            return true;
        } catch (err) {
            return false;
        }
    };

    const placeNodeAds = () => {
        const stash = document.getElementById('magick-ad-stash');
        if (!stash) {
            return;
        }
        const units = Array.from(
            stash.querySelectorAll('[data-ad-node-type][data-ad-node-value]')
        );
        if (!units.length) {
            return;
        }
        units.forEach((unit) => {
            if (unit.dataset.nodeInserted === '1') {
                return;
            }
            const type = unit.getAttribute('data-ad-node-type') || 'id';
            const value = unit.getAttribute('data-ad-node-value') || '';
            const insertMode =
                unit.getAttribute('data-ad-node-insert') || 'append';
            const matchMode =
                unit.getAttribute('data-ad-node-match') || 'first';
            const fallback =
                unit.getAttribute('data-ad-node-fallback') || 'hide';
            const index = Number(
                unit.getAttribute('data-ad-node-index') || 1
            );
            const compact =
                unit.getAttribute('data-ad-node-compact') === '1';
            if (compact) {
                unit.classList.add('magick-ad-placement--node-compact');
            }

            if (!value) {
                unit.remove();
                return;
            }

            let targets = [];
            if (type === 'id') {
                const target = document.getElementById(value);
                if (target) {
                    targets = [target];
                }
            } else if (type === 'class') {
                targets = Array.from(
                    document.getElementsByClassName(value)
                );
            }

            if (matchMode === 'nth') {
                const target = targets[index - 1];
                targets = target ? [target] : [];
            } else if (matchMode === 'first') {
                targets = targets.slice(0, 1);
            }

            if (!targets.length) {
                if (fallback === 'footer') {
                    const zone = ensureFooterZone();
                    insertElement(zone, unit, 'append');
                    unit.dataset.nodeInserted = '1';
                    return;
                }
                unit.remove();
                return;
            }

            if (matchMode === 'all' && targets.length > 1) {
                targets.forEach((target, idx) => {
                    const node = idx === 0 ? unit : unit.cloneNode(true);
                    node.dataset.nodeInserted = '1';
                    insertElement(target, node, insertMode);
                });
            } else {
                const target = targets[0];
                insertElement(target, unit, insertMode);
                unit.dataset.nodeInserted = '1';
            }
        });

        if (!stash.children.length) {
            stash.remove();
        }
    };

    const initObservers = () => {
        placeNodeAds();
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
        sendTrack(
            {
                adId,
                event: 'click',
                sig: target.getAttribute('data-ad-sig'),
                sigTs: target.getAttribute('data-ad-sig-ts'),
            },
            true
        );
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
