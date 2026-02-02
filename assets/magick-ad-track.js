(() => {
    const config = window.MagickADTrack || {};
    const trackUrl = config.restUrl;
    const renderUrl = config.renderUrl;
    const renderBatchUrl = config.renderBatchUrl;
    if (!trackUrl) {
        return;
    }

    const hasConsent = config.hasConsent === true;
    const requireConsent = config.requireConsent === true;
    const allowLocalStorage = hasConsent;
    const allowSessionStorage = hasConsent;
    const renderCache = new Map();

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
        resolveSlotPlaceholders();
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
                        ...(config.nonce ? { 'X-WP-Nonce': config.nonce } : {}),
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
                            ...(config.nonce
                                ? { 'X-WP-Nonce': config.nonce }
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

    const resolveSlotPlaceholders = () => {
        if (!renderUrl) {
            return;
        }
        document
            .querySelectorAll('[data-magick-ad-slot-resolver="1"]')
            .forEach((element) => {
                if (element.dataset.slotResolved === '1') {
                    return;
                }
                element.dataset.slotResolved = '1';
                const candidates = parseJsonAttribute(
                    element,
                    'data-magick-ad-candidates'
                );
                const args = parseJsonAttribute(
                    element,
                    'data-magick-ad-args'
                );
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
                        element
                            .querySelectorAll('[data-ad-id]')
                            .forEach((adElement) => {
                                initAdElement(adElement);
                            });
                    });
                });
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
        document.addEventListener('DOMContentLoaded', initObservers);
    } else {
        initObservers();
    }
    document.addEventListener('click', handleClick, true);
})();
