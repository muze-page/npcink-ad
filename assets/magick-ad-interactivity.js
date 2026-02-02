(() => {
    if (!window.wp || !window.wp.interactivity) {
        return;
    }

    const { store, getElement } = window.wp.interactivity;
    const focusableSelector =
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
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
    const behaviorConfig = window.MagickADBehavior || {};
    const hasConsent = behaviorConfig.hasConsent === true;
    const allowLocalStorage = hasConsent;
    const allowSessionStorage = hasConsent;
    const prefersReducedMotion =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    const getAdElement = (element) => {
        if (!element) {
            return null;
        }
        return element.closest('[data-ad-id]');
    };

    const getPopup = (ad) =>
        ad ? ad.querySelector('.magick-ad-popup') : null;

    const lockScroll = () => {
        document.body.classList.add('magick-ad-lock-scroll');
    };

    const unlockScroll = () => {
        document.body.classList.remove('magick-ad-lock-scroll');
    };

    const focusPopup = (ad) => {
        const popup = getPopup(ad);
        if (!popup) {
            return;
        }
        const focusable = popup.querySelectorAll(focusableSelector);
        if (focusable.length > 0) {
            focusable[0].focus({ preventScroll: true });
        } else {
            popup.focus({ preventScroll: true });
        }
    };

    const activateModal = (ad) => {
        if (!ad) {
            return;
        }
        const container = ad.getAttribute('data-ad-container') || '';
        if (
            container !== 'popup' &&
            container !== 'interstitial' &&
            container !== 'banner'
        ) {
            return;
        }
        const shouldFocus =
            container === 'popup' || container === 'interstitial';
        const currentFocused = document.activeElement;
        activeModal.element = ad;
        activeModal.lastFocused =
            shouldFocus &&
            currentFocused &&
            !ad.contains(currentFocused)
                ? currentFocused
                : null;
        if (shouldFocus) {
            focusPopup(ad);
        }
        if (container === 'popup' && ad.getAttribute('data-ad-lock-scroll') === '1') {
            lockScroll();
        }
    };

    const deactivateModal = (ad) => {
        if (!ad || activeModal.element !== ad) {
            return;
        }
        const lastFocused = activeModal.lastFocused;
        activeModal.element = null;
        activeModal.lastFocused = null;
        unlockScroll();
        if (
            lastFocused &&
            typeof lastFocused.focus === 'function' &&
            document.contains(lastFocused)
        ) {
            lastFocused.focus({ preventScroll: true });
        }
    };

    const closeAd = (ad) => {
        if (!ad) {
            return;
        }
        ad.classList.add('magick-ad-is-hidden');
        ad.setAttribute('aria-hidden', 'true');
        deactivateModal(ad);
    };

    const trapFocus = (event, ad) => {
        if (!ad) {
            return;
        }
        const container = ad.getAttribute('data-ad-container') || '';
        if (container !== 'popup' && container !== 'interstitial') {
            return;
        }
        const popup = getPopup(ad);
        if (!popup) {
            return;
        }
        const focusable = popup.querySelectorAll(focusableSelector);
        if (focusable.length === 0) {
            event.preventDefault();
            popup.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey) {
            if (
                document.activeElement === first ||
                document.activeElement === popup
            ) {
                event.preventDefault();
                last.focus();
            }
        } else if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const keepFocus = (event, ad) => {
        if (!ad) {
            return;
        }
        const container = ad.getAttribute('data-ad-container') || '';
        if (container !== 'popup' && container !== 'interstitial') {
            return;
        }
        const popup = getPopup(ad);
        if (!popup || popup.contains(event.target)) {
            return;
        }
        const focusable = popup.querySelectorAll(focusableSelector);
        if (focusable.length > 0) {
            focusable[0].focus({ preventScroll: true });
        } else {
            popup.focus({ preventScroll: true });
        }
    };

    store('magick-ad', {
        actions: {
            initAd(event) {
                const ad = resolveAdElement(
                    getElement?.().ref || event?.target
                );
                if (!ad) {
                    return;
                }
                initAdBehavior(ad);
            },
            close(event) {
                const ad = getAdElement(getElement?.().ref || event?.target);
                if (!ad) {
                    return;
                }
                closeAd(ad);
                event?.preventDefault();
            },
            onOverlayClick(event) {
                const ad = getAdElement(getElement?.().ref || event?.target);
                if (!ad) {
                    return;
                }
                if (ad.getAttribute('data-ad-close-overlay') === '1') {
                    closeAd(ad);
                    event?.preventDefault();
                }
            },
        },
    });

    document.addEventListener('keydown', (event) => {
        if (!activeModal.element) {
            return;
        }
        if (activeModal.element.classList.contains('magick-ad-is-hidden')) {
            return;
        }
        if (event.key === 'Escape') {
            if (
                activeModal.element.getAttribute('data-ad-close-esc') === '1'
            ) {
                closeAd(activeModal.element);
                event.preventDefault();
            }
            return;
        }
        if (event.key === 'Tab') {
            trapFocus(event, activeModal.element);
        }
    });

    document.addEventListener('focusin', (event) => {
        if (!activeModal.element) {
            return;
        }
        if (activeModal.element.classList.contains('magick-ad-is-hidden')) {
            return;
        }
        keepFocus(event, activeModal.element);
    });

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

    const resolveAdElement = (input) => {
        if (!input) {
            return null;
        }
        if (input.nodeType === 1) {
            const wrapped = getAdElement(input);
            if (wrapped) {
                return wrapped;
            }
            if (input.getAttribute && input.getAttribute('data-ad-id')) {
                return input;
            }
        }
        return null;
    };

    const shouldShowByFrequency = (ad) => {
        if (!allowLocalStorage && !allowSessionStorage) {
            return true;
        }
        const mode = ad.getAttribute('data-ad-freq-mode') || 'none';
        if (mode === 'none') {
            return true;
        }
        const adId = ad.getAttribute('data-ad-id');
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
                ad.getAttribute('data-ad-freq-limit') || 1
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

    const recordFrequency = (ad) => {
        if (!allowLocalStorage && !allowSessionStorage) {
            return;
        }
        const mode = ad.getAttribute('data-ad-freq-mode') || 'none';
        const adId = ad.getAttribute('data-ad-id');
        if (!adId || mode === 'none') {
            return;
        }
        if (mode === 'session') {
            writeStorageValue(sessionStorage, `magick_ad_freq_${adId}`, '1');
        } else if (mode === 'day') {
            const day = new Date().toISOString().slice(0, 10);
            writeStorageValue(
                localStorage,
                `magick_ad_freq_${adId}_${day}`,
                '1'
            );
        } else if (mode === 'count') {
            const key = `magick_ad_freq_${adId}`;
            const limit = Number(ad.getAttribute('data-ad-freq-limit') || 1);
            const rawCount = readStorageValue(localStorage, key);
            const count = Number(rawCount || 0);
            if (count < limit) {
                writeStorageValue(localStorage, key, String(count + 1));
            }
        }
    };

    const decideRandomSession = (ad) => {
        const adId = ad.getAttribute('data-ad-id');
        if (!adId) {
            return true;
        }
        const bucket = Math.floor(Date.now() / 300000);
        let value = null;
        if (allowSessionStorage) {
            const key = `magick_ad_random_${adId}_${bucket}`;
            value = readStorageValue(sessionStorage, key);
            if (!value) {
                value = Math.random() >= 0.5 ? '1' : '0';
                writeStorageValue(sessionStorage, key, value);
            }
        } else if (ad.dataset.adRandomDecided) {
            value = ad.dataset.adRandomDecided;
        } else {
            value = Math.random() >= 0.5 ? '1' : '0';
            ad.dataset.adRandomDecided = value;
        }
        return value === '1';
    };

    const showAd = (ad, animation) => {
        ad.classList.remove('magick-ad-is-hidden');
        ad.removeAttribute('aria-hidden');
        if (animation && !prefersReducedMotion) {
            ad.classList.add(`magick-ad-anim--${animation}`);
        }
        recordFrequency(ad);
        activateModal(ad);
    };

    const hideAd = (ad) => {
        ad.classList.add('magick-ad-is-hidden');
        ad.setAttribute('aria-hidden', 'true');
        deactivateModal(ad);
    };

    const initAdBehavior = (ad) => {
        if (!ad || ad.dataset.adBehaviorInitialized === '1') {
            return;
        }
        ad.dataset.adBehaviorInitialized = '1';

        const delay = Number(ad.getAttribute('data-ad-delay') || 0);
        const animation = ad.getAttribute('data-ad-anim');
        const randomMode = ad.getAttribute('data-ad-random') || '';

        if (!shouldShowByFrequency(ad)) {
            ad.dataset.adFreqBlocked = '1';
            hideAd(ad);
            return;
        }

        if (randomMode === 'session') {
            const shouldShow = decideRandomSession(ad);
            if (!shouldShow) {
                hideAd(ad);
                return;
            }
        }

        if (delay > 0) {
            hideAd(ad);
            window.setTimeout(() => {
                showAd(ad, animation);
            }, delay * 1000);
            return;
        }

        showAd(ad, animation);
    };

    const initAll = () => {
        placeNodeAds();
        document.querySelectorAll('[data-ad-id]').forEach((element) => {
            initAdBehavior(element);
        });
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
                        initAdBehavior(node);
                    }
                    if (node.querySelectorAll) {
                        node.querySelectorAll('[data-ad-id]').forEach(
                            (element) => {
                                initAdBehavior(element);
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

    window.MagickADInteractivity = {
        open: (ad) => {
            if (!ad) {
                return;
            }
            if (ad.classList.contains('magick-ad-is-hidden')) {
                return;
            }
            activateModal(ad);
        },
        close: closeAd,
        initAd: (ad) => {
            const resolved = resolveAdElement(ad);
            if (!resolved) {
                return;
            }
            initAdBehavior(resolved);
        },
        initAll,
        isActive: true,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initAll();
            observeNewAds();
        });
    } else {
        initAll();
        observeNewAds();
    }
})();
