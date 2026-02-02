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
    const renderUrl = behaviorConfig.renderUrl || '';
    const renderBatchUrl = behaviorConfig.renderBatchUrl || '';
    const requestNonce = behaviorConfig.nonce || '';
    const hasConsent = behaviorConfig.hasConsent === true;
    const allowLocalStorage = hasConsent;
    const allowSessionStorage = hasConsent;
    const prefersReducedMotion =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderCache = new Map();

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

    const parseJsonAttribute = (element, name) => {
        if (!element) {
            return null;
        }
        const raw = element.getAttribute(name);
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw);
        } catch (err) {
            return null;
        }
    };

    const cloneScriptElement = (script) => {
        const next = document.createElement('script');
        Array.from(script.attributes || []).forEach((attr) => {
            next.setAttribute(attr.name, attr.value);
        });
        if (script.textContent) {
            next.text = script.textContent;
        }
        return next;
    };

    const hydrateScriptNodes = (nodes) =>
        nodes.map((node) => {
            if (!node || node.nodeType !== 1) {
                return node;
            }
            const element = node;
            if (element.tagName === 'SCRIPT') {
                return cloneScriptElement(element);
            }
            element.querySelectorAll('script').forEach((script) => {
                const replacement = cloneScriptElement(script);
                if (script.parentNode) {
                    script.parentNode.replaceChild(replacement, script);
                }
            });
            return element;
        });

    const pickWeightedCandidates = (candidates, limit) => {
        const pool = Array.isArray(candidates)
            ? candidates.filter((candidate) => candidate && candidate.id)
            : [];
        if (!pool.length) {
            return [];
        }
        const max = Math.min(
            Math.max(1, Number(limit || 1)),
            pool.length
        );
        const selected = [];
        const localPool = [...pool];
        while (selected.length < max && localPool.length) {
            let total = 0;
            localPool.forEach((candidate) => {
                const weight = Math.max(1, Number(candidate.weight) || 1);
                total += weight;
            });
            let roll = Math.random() * total;
            let pickedIndex = 0;
            for (let i = 0; i < localPool.length; i += 1) {
                roll -= Math.max(1, Number(localPool[i].weight) || 1);
                if (roll <= 0) {
                    pickedIndex = i;
                    break;
                }
            }
            selected.push(localPool[pickedIndex]);
            localPool.splice(pickedIndex, 1);
        }
        return selected;
    };

    const buildRenderCacheKey = (candidate, args) => {
        if (!candidate || !candidate.id) {
            return '';
        }
        const slot = args?.slot || '';
        const position = args?.position || '';
        const container = args?.container || '';
        const className = args?.class || '';
        const creative = args?.creative || '';
        return [
            candidate.id,
            slot,
            position,
            container,
            className,
            creative,
        ].join('|');
    };

    const buildRenderPayload = (candidate, args) => ({
        ad_id: candidate.id,
        sig: candidate.sig || '',
        sig_ts: candidate.sig_ts || '',
        slot: args?.slot || '',
        position: args?.position || '',
        class: args?.class || '',
        container: args?.container || '',
        creative: args?.creative || '',
    });

    const fetchAdMarkup = async (candidate, args) => {
        if (!renderUrl || !candidate || !candidate.id) {
            return '';
        }
        const cacheKey = buildRenderCacheKey(candidate, args);
        if (cacheKey && renderCache.has(cacheKey)) {
            return renderCache.get(cacheKey);
        }
        const payload = buildRenderPayload(candidate, args);
        const request = (async () => {
            try {
                const response = await fetch(renderUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(requestNonce
                            ? { 'X-WP-Nonce': requestNonce }
                            : {}),
                    },
                    body: JSON.stringify(payload),
                    credentials: 'same-origin',
                    keepalive: true,
                });
                const data = await response.json();
                return data?.html || '';
            } catch (err) {
                return '';
            }
        })();
        if (cacheKey) {
            renderCache.set(cacheKey, request);
        }
        return request;
    };

    const fetchAdMarkups = async (candidates, args) => {
        if (!Array.isArray(candidates) || !candidates.length) {
            return [];
        }
        if (!renderBatchUrl) {
            return Promise.all(
                candidates.map((candidate) => fetchAdMarkup(candidate, args))
            );
        }
        try {
            const results = new Array(candidates.length).fill('');
            const pending = [];

            candidates.forEach((candidate, index) => {
                const key = buildRenderCacheKey(candidate, args);
                if (key && renderCache.has(key)) {
                    results[index] = renderCache.get(key);
                } else {
                    pending.push({ candidate, index, key });
                }
            });

            if (pending.length) {
                const payloadItems = pending.map(({ candidate }) =>
                    buildRenderPayload(candidate, args)
                );
                const batchPromise = (async () => {
                    const response = await fetch(renderBatchUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(requestNonce
                                ? { 'X-WP-Nonce': requestNonce }
                                : {}),
                        },
                        body: JSON.stringify({ items: payloadItems }),
                        credentials: 'same-origin',
                        keepalive: true,
                    });
                    const data = await response.json();
                    return Array.isArray(data?.items) ? data.items : [];
                })();

                pending.forEach(({ index, key }, idx) => {
                    const htmlPromise = batchPromise.then(
                        (items) => items[idx]?.html || ''
                    );
                    if (key) {
                        renderCache.set(key, htmlPromise);
                    }
                    results[index] = htmlPromise;
                });
            }

            return Promise.all(
                results.map(async (value) => {
                    if (!value) {
                        return '';
                    }
                    if (typeof value.then === 'function') {
                        return await value;
                    }
                    return value;
                })
            );
        } catch (err) {
            return Promise.all(
                candidates.map((candidate) => fetchAdMarkup(candidate, args))
            );
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

    const resolveSlotPlaceholder = (element) => {
        if (!element || element.dataset.slotResolved === '1') {
            return;
        }
        element.dataset.slotResolved = '1';
        const candidates = parseJsonAttribute(
            element,
            'data-magick-ad-candidates'
        );
        const args = parseJsonAttribute(element, 'data-magick-ad-args');
        const limit = Number(
            element.getAttribute('data-magick-ad-limit') || 1
        );
        const selected = pickWeightedCandidates(candidates, limit);
        if (!selected.length) {
            return;
        }
        fetchAdMarkups(selected, args).then((results) => {
            results.forEach((html) => {
                if (!html) {
                    return;
                }
                const wrapper = document.createElement('div');
                wrapper.innerHTML = html;
                const nodes = hydrateScriptNodes(
                    Array.from(wrapper.childNodes)
                );
                nodes.forEach((node) => {
                    element.appendChild(node);
                });
                element.querySelectorAll('[data-ad-id]').forEach((ad) => {
                    initAdBehavior(ad);
                });
            });
        });
    };

    const resolveSlotPlaceholders = (root = document) => {
        if (!renderUrl && !renderBatchUrl) {
            return;
        }
        if (!root) {
            return;
        }
        if (root.matches?.('[data-magick-ad-slot-resolver="1"]')) {
            resolveSlotPlaceholder(root);
        }
        if (root.querySelectorAll) {
            root.querySelectorAll('[data-magick-ad-slot-resolver="1"]').forEach(
                (element) => {
                    resolveSlotPlaceholder(element);
                }
            );
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
        resolveSlotPlaceholders();
        document.querySelectorAll('[data-ad-id]').forEach((element) => {
            initAdBehavior(element);
        });
    };

    const shouldObserveMutations = () => {
        if (!window.MutationObserver || !document.body) {
            return false;
        }
        if (document.querySelector('[data-magick-ad-slot-resolver="1"]')) {
            return true;
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
                    resolveSlotPlaceholders(node);
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
