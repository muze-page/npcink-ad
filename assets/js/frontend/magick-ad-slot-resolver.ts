import type { BehaviorConfig, RenderArgs, RenderCandidate } from '../types';

(() => {
    const behaviorConfig =
        ((window as unknown as { MagickADBehavior?: BehaviorConfig })
            .MagickADBehavior as BehaviorConfig) || {};
    const renderUrl = behaviorConfig.renderUrl || '';
    const renderBatchUrl = behaviorConfig.renderBatchUrl || '';
    const requestNonce = behaviorConfig.nonce || '';

    if (!renderUrl && !renderBatchUrl) {
        return;
    }

    const renderCache = new Map();
    const resolverQueue = new Map();
    let resolverFlushTimer = null;
    const resolverBatchDelay = 20;

    const scheduleResolverFlush = () => {
        if (resolverFlushTimer) {
            return;
        }
        resolverFlushTimer = window.setTimeout(() => {
            resolverFlushTimer = null;
            flushResolverQueue();
        }, resolverBatchDelay);
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

    const pickWeightedCandidates = (
        candidates: RenderCandidate[],
        limit: number
    ): RenderCandidate[] => {
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

    const buildRenderCacheKey = (
        candidate: RenderCandidate,
        args?: RenderArgs
    ): string => {
        if (!candidate || !candidate.id) {
            return '';
        }
        const slot = args?.slot || '';
        const position = args?.position || '';
        const container = args?.container || '';
        const className = args?.class || '';
        const creative = args?.creative || '';
        const sigRev = candidate?.sig_rev || '';
        return [
            candidate.id,
            sigRev,
            slot,
            position,
            container,
            className,
            creative,
        ].join('|');
    };

    const buildRenderPayload = (
        candidate: RenderCandidate,
        args?: RenderArgs
    ) => ({
        ad_id: candidate.id,
        sig: candidate.sig || '',
        sig_ts: candidate.sig_ts || '',
        sig_rev: candidate.sig_rev || '',
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

    const appendMarkup = (container, html) => {
        if (!container || !html) {
            return;
        }
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        const nodes = hydrateScriptNodes(Array.from(wrapper.childNodes));
        nodes.forEach((node) => {
            container.appendChild(node);
        });
        container.querySelectorAll('[data-ad-id]').forEach((ad) => {
            window.MagickADInteractivity?.initAd?.(ad);
        });
    };

    const flushResolverQueue = () => {
        if (!resolverQueue.size) {
            return;
        }
        const pending = Array.from(resolverQueue.values());
        resolverQueue.clear();
        const requests = [];

        pending.forEach((entry) => {
            if (!entry || !entry.element) {
                return;
            }
            const selected = pickWeightedCandidates(
                entry.candidates,
                entry.limit
            );
            if (!selected.length) {
                return;
            }
            requests.push({
                entry,
                selected,
            });
        });

        if (!requests.length) {
            return;
        }

        const fetchTasks = requests.map(({ entry, selected }) =>
            fetchAdMarkups(selected, entry.args).then((results) => ({
                entry,
                results,
            }))
        );

        Promise.all(fetchTasks).then((responses) => {
            responses.forEach(({ entry, results }) => {
                if (!entry || !entry.element) {
                    return;
                }
                results.forEach((html) => {
                    appendMarkup(entry.element, html);
                });
            });
        });
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
        resolverQueue.set(element, {
            element,
            candidates,
            args,
            limit,
        });
        scheduleResolverFlush();
    };

    const resolveSlotPlaceholders = (root = document) => {
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

    const shouldObserveMutations = () => {
        if (!window.MutationObserver || !document.body) {
            return false;
        }
        if (document.querySelector('[data-magick-ad-slot-resolver="1"]')) {
            return true;
        }
        return behaviorConfig.observeMutations === true;
    };

    const observeSlotPlaceholders = () => {
        if (!shouldObserveMutations()) {
            return;
        }
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (!node || node.nodeType !== 1) {
                        return;
                    }
                    if (node.matches?.('[data-magick-ad-slot-resolver="1"]')) {
                        resolveSlotPlaceholder(node);
                    }
                    if (node.querySelectorAll) {
                        node.querySelectorAll(
                            '[data-magick-ad-slot-resolver="1"]'
                        ).forEach((element) => {
                            resolveSlotPlaceholder(element);
                        });
                    }
                });
            });
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    };

    window.MagickADSlotResolver = {
        resolve: resolveSlotPlaceholder,
        resolveAll: resolveSlotPlaceholders,
        isActive: true,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            resolveSlotPlaceholders();
            observeSlotPlaceholders();
        });
    } else {
        resolveSlotPlaceholders();
        observeSlotPlaceholders();
    }
})();
