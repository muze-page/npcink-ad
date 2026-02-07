import type { BehaviorConfig } from '../types';

(() => {
    const behaviorConfig =
        ((window as unknown as { MagickADBehavior?: BehaviorConfig })
            .MagickADBehavior as BehaviorConfig) || {};
    const requiresConsent =
        behaviorConfig.requireConsent === true ||
        behaviorConfig.requireConsent === '1' ||
        behaviorConfig.requireConsent === 1;
    let hasConsent =
        behaviorConfig.hasConsent === true ||
        behaviorConfig.hasConsent === '1' ||
        behaviorConfig.hasConsent === 1 ||
        !requiresConsent;
    let allowLocalStorage = hasConsent;
    let allowSessionStorage = hasConsent;
    const consentBannerEnabled =
        behaviorConfig.consentBannerEnabled !== false &&
        behaviorConfig.consentBannerEnabled !== '0' &&
        behaviorConfig.consentBannerEnabled !== 0;
    const consentBannerText =
        typeof behaviorConfig.consentBannerText === 'string' &&
        behaviorConfig.consentBannerText.trim()
            ? behaviorConfig.consentBannerText.trim()
            : '为了提供更好的体验，我们会使用必要的 Cookie/存储进行频控。';
    const consentBannerButton =
        typeof behaviorConfig.consentBannerButton === 'string' &&
        behaviorConfig.consentBannerButton.trim()
            ? behaviorConfig.consentBannerButton.trim()
            : '同意';

    const setConsentCookie = () => {
        const maxAge = 60 * 60 * 24 * 365;
        const secure = window.location.protocol === 'https:' ? '; secure' : '';
        document.cookie = `magick_ad_consent=1; path=/; max-age=${maxAge}; samesite=lax${secure}`;
    };

    const initConsentBanner = () => {
        if (!requiresConsent || hasConsent || !consentBannerEnabled) {
            return;
        }
        if (!document.body) {
            return;
        }
        if (document.querySelector('.magick-ad-consent')) {
            return;
        }
        const bar = document.createElement('div');
        bar.className = 'magick-ad-consent';

        const text = document.createElement('div');
        text.className = 'magick-ad-consent__text';
        text.textContent = consentBannerText;

        const actions = document.createElement('div');
        actions.className = 'magick-ad-consent__actions';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'magick-ad-consent__btn';
        button.textContent = consentBannerButton;

        button.addEventListener('click', () => {
            setConsentCookie();
            hasConsent = true;
            allowLocalStorage = true;
            allowSessionStorage = true;
            if (window.MagickADBehavior) {
                window.MagickADBehavior.hasConsent = true;
            }
            window.dispatchEvent(
                new CustomEvent('magickad:consent', {
                    detail: {
                        hasConsent: true,
                    },
                })
            );
            bar.remove();
        });

        actions.appendChild(button);
        bar.appendChild(text);
        bar.appendChild(actions);
        document.body.appendChild(bar);
    };

    if (!window.wp || !window.wp.interactivity) {
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
                    ad.getAttribute('data-ad-freq-limit') || 1
                );
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

        const shouldShowByRandom = (ad) => {
            const randomMode = ad.getAttribute('data-ad-random') || '';
            if (randomMode !== 'session') {
                return true;
            }
            return decideRandomSession(ad);
        };

        const updateLockScroll = (ad, shouldLock) => {
            if (!ad || !document.body) {
                return;
            }
            const container = ad.getAttribute('data-ad-container') || '';
            if (
                (container === 'popup' || container === 'interstitial') &&
                ad.getAttribute('data-ad-lock-scroll') === '1'
            ) {
                document.body.classList.toggle(
                    'magick-ad-lock-scroll',
                    shouldLock
                );
            }
        };

        const showFallbackAd = (ad) => {
            if (!ad) {
                return;
            }
            ad.classList.remove('magick-ad-is-hidden');
            ad.removeAttribute('aria-hidden');
            const animation = ad.getAttribute('data-ad-anim');
            if (animation && !prefersReducedMotion) {
                ad.classList.add(`magick-ad-anim--${animation}`);
            }
            updateLockScroll(ad, true);
            recordFrequency(ad);
        };

        const hideFallbackAd = (ad) => {
            if (!ad) {
                return;
            }
            ad.classList.add('magick-ad-is-hidden');
            ad.setAttribute('aria-hidden', 'true');
            updateLockScroll(ad, false);
        };

        const initFallbackAd = (ad) => {
            if (!ad || ad.dataset.adBehaviorInitialized === '1') {
                return;
            }
            ad.dataset.adBehaviorInitialized = '1';

            if (!shouldShowByFrequency(ad)) {
                ad.dataset.adFreqBlocked = '1';
                hideFallbackAd(ad);
                return;
            }

            if (!shouldShowByRandom(ad)) {
                hideFallbackAd(ad);
                return;
            }

            const delay = Number(ad.getAttribute('data-ad-delay') || 0);
            if (delay > 0) {
                hideFallbackAd(ad);
                window.setTimeout(() => {
                    showFallbackAd(ad);
                }, delay * 1000);
                return;
            }

            showFallbackAd(ad);
        };

        const initFallbackAdsInRoot = (root) => {
            if (!root) {
                return;
            }
            if (root.matches?.('[data-ad-id]')) {
                initFallbackAd(root);
            }
            if (root.querySelectorAll) {
                root.querySelectorAll('[data-ad-id]').forEach((ad) => {
                    initFallbackAd(ad);
                });
            }
        };

        const observeFallbackAds = () => {
            if (!window.MutationObserver || !document.body) {
                return;
            }
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (!node || node.nodeType !== 1) {
                            return;
                        }
                        initFallbackAdsInRoot(node);
                    });
                });
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        };

        const closeFallback = (ad) => {
            if (!ad) {
                return;
            }
            if (ad.contains(document.activeElement)) {
                document.activeElement.blur?.();
            }
            hideFallbackAd(ad);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initConsentBanner();
                initFallbackAdsInRoot(document.body);
                observeFallbackAds();
            });
        } else {
            initConsentBanner();
            initFallbackAdsInRoot(document.body);
            observeFallbackAds();
        }

        document.addEventListener(
            'click',
            (event) => {
                const closeButton = event.target.closest('.magick-ad-close');
                const overlay = event.target.closest('.magick-ad-overlay');
                if (!closeButton && !overlay) {
                    return;
                }
                const ad = event.target.closest('[data-ad-id]');
                if (!ad) {
                    return;
                }
                if (
                    overlay &&
                    ad.getAttribute('data-ad-close-overlay') !== '1'
                ) {
                    return;
                }
                closeFallback(ad);
                event.preventDefault();
            },
            true
        );
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
        deactivateModal(ad);
        if (ad.contains(document.activeElement)) {
            document.activeElement.blur?.();
        }
        ad.classList.add('magick-ad-is-hidden');
        ad.setAttribute('aria-hidden', 'true');
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

    const emitNodePlacementResult = (
        unit,
        result,
        reason,
        extras = {}
    ) => {
        if (!unit) {
            return;
        }
        unit.dataset.nodeResult = result || '';
        if (reason) {
            unit.dataset.nodeReason = reason;
        } else {
            delete unit.dataset.nodeReason;
        }
        window.dispatchEvent(
            new CustomEvent('magick-ad-node-placement', {
                detail: {
                    adId: unit.getAttribute('data-ad-id') || '',
                    result: result || '',
                    reason: reason || '',
                    nodeType:
                        unit.getAttribute('data-ad-node-type') || 'id',
                    nodeValue:
                        unit.getAttribute('data-ad-node-value') || '',
                    fallback:
                        unit.getAttribute('data-ad-node-fallback') ||
                        'hide',
                    ...extras,
                },
            })
        );
    };

    const fallbackNodePlacement = (
        unit,
        fallback,
        reason,
        extras = {}
    ) => {
        if (!unit) {
            return;
        }
        if (fallback === 'footer') {
            const zone = ensureFooterZone();
            const inserted = insertElement(zone, unit, 'append');
            if (inserted) {
                unit.dataset.nodeInserted = '1';
                emitNodePlacementResult(
                    unit,
                    'fallback_footer',
                    reason,
                    extras
                );
                return;
            }
            emitNodePlacementResult(
                unit,
                'fallback_footer_failed',
                'footer_insert_failed',
                extras
            );
            unit.remove();
            return;
        }
        emitNodePlacementResult(unit, 'fallback_hidden', reason, extras);
        unit.remove();
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
                fallbackNodePlacement(unit, fallback, 'missing_target_value');
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
            } else {
                fallbackNodePlacement(unit, fallback, 'invalid_target_type');
                return;
            }
            targets = targets.filter(
                (target) => target && !stash.contains(target)
            );

            if (matchMode === 'nth') {
                const target = targets[index - 1];
                targets = target ? [target] : [];
            } else if (matchMode === 'first') {
                targets = targets.slice(0, 1);
            }

            if (!targets.length) {
                fallbackNodePlacement(
                    unit,
                    fallback,
                    matchMode === 'nth' ? 'nth_not_found' : 'target_not_found'
                );
                return;
            }

            if (matchMode === 'all' && targets.length > 1) {
                let insertedCount = 0;
                targets.forEach((target, idx) => {
                    const node = idx === 0 ? unit : unit.cloneNode(true);
                    const inserted = insertElement(target, node, insertMode);
                    if (!inserted) {
                        emitNodePlacementResult(
                            node,
                            'insert_failed',
                            'insert_failed',
                            { targetIndex: idx + 1 }
                        );
                        if (node !== unit) {
                            node.remove();
                        }
                        return;
                    }
                    insertedCount += 1;
                    node.dataset.nodeInserted = '1';
                    emitNodePlacementResult(node, 'inserted', '', {
                        targetIndex: idx + 1,
                    });
                });
                if (insertedCount === 0) {
                    fallbackNodePlacement(unit, fallback, 'insert_failed');
                    return;
                }
                if (insertedCount < targets.length && unit.isConnected) {
                    emitNodePlacementResult(unit, 'inserted_partial', '', {
                        insertedCount,
                        targetCount: targets.length,
                    });
                }
            } else {
                const target = targets[0];
                const inserted = insertElement(target, unit, insertMode);
                if (!inserted) {
                    fallbackNodePlacement(unit, fallback, 'insert_failed');
                    return;
                }
                unit.dataset.nodeInserted = '1';
                emitNodePlacementResult(unit, 'inserted', '', {
                    targetCount: 1,
                });
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

    const shouldObserveMutations = () => {
        if (!window.MutationObserver || !document.body) {
            return false;
        }
        if (document.querySelector('[data-ad-node-type]')) {
            return true;
        }
        return behaviorConfig.observeMutations === true;
    };

    const observeNewAds = () => {
        if (!shouldObserveMutations()) {
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
            initConsentBanner();
            initAll();
            observeNewAds();
        });
    } else {
        initConsentBanner();
        initAll();
        observeNewAds();
    }
})();
