/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
/*!***********************************************!*\
  !*** ./assets/js/frontend/magick-ad-track.ts ***!
  \***********************************************/
__webpack_require__.r(__webpack_exports__);
(() => {
  const config = window.MagickADTrack || {};
  const trackUrl = config.restUrl || '';
  if (!trackUrl) {
    return;
  }
  const allowBeacon = config.allowBeacon !== false;
  const requestCredentials = config.credentials || 'omit';
  let hasConsent = config.hasConsent === true;
  const requireConsent = config.requireConsent === true;
  let allowLocalStorage = hasConsent;
  let allowSessionStorage = hasConsent;
  const readStorageValue = (storage, key) => {
    if (storage === localStorage && !allowLocalStorage || storage === sessionStorage && !allowSessionStorage) {
      return null;
    }
    try {
      return storage.getItem(key);
    } catch (err) {
      return null;
    }
  };
  const writeStorageValue = (storage, key, value) => {
    if (storage === localStorage && !allowLocalStorage || storage === sessionStorage && !allowSessionStorage) {
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
  const hashString = value => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  };
  const pageHash = hashString(window.location.href);
  const normalizeEventName = event => {
    if (typeof event !== 'string') {
      return '';
    }
    const normalized = event.trim().toLowerCase();
    if (!normalized) {
      return '';
    }
    const known = new Set(['impression', 'click', 'video_play', 'video_pause', 'video_complete', 'conversion']);
    if (known.has(normalized)) {
      return normalized;
    }
    if (!/^[a-z][a-z0-9_-]{0,31}$/.test(normalized)) {
      return '';
    }
    return normalized;
  };
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
      sigRev: element.getAttribute('data-ad-sig-rev') || '',
      variantId: element.getAttribute('data-ad-variant') || '',
      slot: element.getAttribute('data-ad-slot') || '',
      position: element.getAttribute('data-ad-position') || '',
      container: element.getAttribute('data-ad-container') || ''
    };
  };
  const escapeSelector = value => {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(value);
    }
    return value.replace(/["\\]/g, '\\$&');
  };
  const resolveAdElement = options => {
    if (options?.element instanceof Element) {
      return options.element;
    }
    const adId = typeof options?.adId === 'string' ? options.adId : '';
    if (!adId) {
      return null;
    }
    const selector = `[data-ad-id="${escapeSelector(adId)}"]`;
    return document.querySelector(selector);
  };
  const buildCustomPayload = (event, options) => {
    const element = resolveAdElement(options);
    let payload = buildTrackPayload(element, event);
    const adId = typeof options?.adId === 'string' ? options.adId : '';
    if (!payload && adId) {
      payload = {
        adId,
        event,
        sig: typeof options?.sig === 'string' ? options.sig : '',
        sigTs: typeof options?.sigTs === 'string' ? options.sigTs : '',
        sigRev: typeof options?.sigRev === 'string' ? options.sigRev : '',
        variantId: typeof options?.variantId === 'string' ? options.variantId : '',
        slot: typeof options?.slot === 'string' ? options.slot : '',
        position: typeof options?.position === 'string' ? options.position : '',
        container: typeof options?.container === 'string' ? options.container : ''
      };
    }
    if (!payload) {
      return null;
    }
    if (typeof options?.sig === 'string') {
      payload.sig = options.sig;
    }
    if (typeof options?.sigTs === 'string') {
      payload.sigTs = options.sigTs;
    }
    if (typeof options?.sigRev === 'string') {
      payload.sigRev = options.sigRev;
    }
    if (typeof options?.variantId === 'string') {
      payload.variantId = options.variantId;
    }
    if (typeof options?.slot === 'string') {
      payload.slot = options.slot;
    }
    if (typeof options?.position === 'string') {
      payload.position = options.position;
    }
    if (typeof options?.container === 'string') {
      payload.container = options.container;
    }
    return payload;
  };
  const batchSize = Number.parseInt(config.batchSize, 10) || 10;
  const batchInterval = Number.parseInt(config.batchInterval, 10) || 2000;
  const trackQueue = [];
  let flushTimer = null;
  const buildItemPayload = payload => {
    const item = {
      ad_id: payload.adId,
      event: payload.event
    };
    if (payload.sig) {
      item.sig = payload.sig;
    }
    if (payload.sigTs) {
      item.sig_ts = payload.sigTs;
    }
    if (payload.sigRev) {
      item.sig_rev = payload.sigRev;
    }
    if (payload.variantId) {
      item.variant_id = payload.variantId;
    }
    if (payload.slot) {
      item.slot = payload.slot;
    }
    if (payload.position) {
      item.position = payload.position;
    }
    if (payload.container) {
      item.container = payload.container;
    }
    return item;
  };
  const buildBatchPayload = items => {
    const bodyData = {
      session_id: sessionId,
      page_hash: pageHash,
      items: items.map(buildItemPayload)
    };
    if (config.collectPageUrl) {
      bodyData.page_url = window.location.href;
    }
    return bodyData;
  };
  const sendBatch = (items, useBeacon = false) => {
    if (!items.length) {
      return;
    }
    const body = JSON.stringify(buildBatchPayload(items));
    if (useBeacon && allowBeacon && navigator.sendBeacon) {
      const blob = new Blob([body], {
        type: 'application/json'
      });
      navigator.sendBeacon(trackUrl, blob);
      return;
    }
    fetch(trackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body,
      keepalive: true,
      credentials: requestCredentials
    }).catch(() => undefined);
  };
  const scheduleFlush = () => {
    if (flushTimer) {
      return;
    }
    flushTimer = window.setTimeout(() => {
      flushTimer = null;
      flushQueue();
    }, batchInterval);
  };
  const flushQueue = (options = {}) => {
    if (!trackQueue.length) {
      return;
    }
    if (flushTimer) {
      window.clearTimeout(flushTimer);
      flushTimer = null;
    }
    const useBeacon = options.useBeacon === true;
    const force = options.force === true;
    do {
      const items = trackQueue.splice(0, batchSize);
      sendBatch(items, useBeacon);
    } while ((useBeacon || force) && trackQueue.length);
    if (trackQueue.length && !useBeacon && !force) {
      if (trackQueue.length >= batchSize) {
        window.setTimeout(() => flushQueue(), 100);
      } else {
        scheduleFlush();
      }
    }
  };
  const enqueueTrack = (payload, options = {}) => {
    if (requireConsent && !hasConsent) {
      return;
    }
    if (!payload || !payload.adId) {
      return;
    }
    trackQueue.push(payload);
    if (trackQueue.length >= batchSize) {
      flushQueue(options);
      return;
    }
    scheduleFlush();
  };
  const trackCustomEvent = (event, options = {}) => {
    const normalized = normalizeEventName(event);
    if (!normalized) {
      return false;
    }
    if (requireConsent && !hasConsent) {
      return false;
    }
    const payload = buildCustomPayload(normalized, options);
    if (!payload) {
      return false;
    }
    const useBeacon = options.useBeacon === true;
    const force = options.force === true;
    enqueueTrack(payload, {
      useBeacon,
      force
    });
    return true;
  };
  const api = window.magickAdTrack || {};
  api.track = trackCustomEvent;
  window.magickAdTrack = api;
  const observed = new Map();
  const pendingImpressions = new Set();
  let impressionTimer = null;
  const impressionDelay = 2000;
  const impressionTick = 250;
  const dedupeScope = config.dedupeScope === 'placement' ? 'placement' : 'ad';
  const buildObservedKey = payload => dedupeScope === 'placement' ? [payload.adId, payload.slot || '', payload.position || '', payload.container || ''].join('|') : payload.adId;
  const startImpressionTicker = () => {
    if (impressionTimer) {
      return;
    }
    impressionTimer = window.setInterval(() => {
      if (!pendingImpressions.size) {
        window.clearInterval(impressionTimer);
        impressionTimer = null;
        return;
      }
      const now = Date.now();
      pendingImpressions.forEach(key => {
        const state = observed.get(key);
        if (!state || state.seen || !state.startAt) {
          pendingImpressions.delete(key);
          return;
        }
        if (now - state.startAt >= impressionDelay) {
          enqueueTrack(state.payload);
          state.seen = true;
          state.startAt = null;
          state.payload = null;
          observed.set(key, state);
          pendingImpressions.delete(key);
        }
      });
    }, impressionTick);
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const target = entry.target;
      if (!target || target.nodeType !== 1) {
        return;
      }
      const payload = buildTrackPayload(target, 'impression');
      if (!payload) {
        return;
      }
      const observedKey = buildObservedKey(payload);
      const state = observed.get(observedKey) || {
        seen: false,
        startAt: null,
        payload: null
      };
      if (entry.isIntersecting) {
        if (!state.seen && !state.startAt) {
          state.startAt = Date.now();
          state.payload = payload;
          pendingImpressions.add(observedKey);
          startImpressionTicker();
        }
      } else if (state.startAt) {
        state.startAt = null;
        state.payload = null;
        pendingImpressions.delete(observedKey);
      }
      observed.set(observedKey, state);
    });
  }, {
    threshold: 0.5
  });
  const initVideoTracking = ad => {
    if (!ad || ad.dataset.adVideoTrackingInit === '1') {
      return;
    }
    if (ad.getAttribute('data-ad-video-track') !== '1') {
      return;
    }
    const videos = ad.querySelectorAll('.magick-ad-video__media');
    if (!videos.length) {
      return;
    }
    ad.dataset.adVideoTrackingInit = '1';
    const markOnce = (video, key) => {
      if (video.dataset[key] === '1') {
        return false;
      }
      video.dataset[key] = '1';
      return true;
    };
    videos.forEach(video => {
      video.addEventListener('play', () => {
        if (!markOnce(video, 'adVideoPlaySent')) {
          return;
        }
        const payload = buildTrackPayload(ad, 'video_play');
        if (payload) {
          enqueueTrack(payload);
        }
      });
      video.addEventListener('pause', () => {
        if (video.ended) {
          return;
        }
        if (!markOnce(video, 'adVideoPauseSent')) {
          return;
        }
        const payload = buildTrackPayload(ad, 'video_pause');
        if (payload) {
          enqueueTrack(payload);
        }
      });
      video.addEventListener('ended', () => {
        if (!markOnce(video, 'adVideoCompleteSent')) {
          return;
        }
        const payload = buildTrackPayload(ad, 'video_complete');
        if (payload) {
          enqueueTrack(payload);
        }
      });
    });
  };
  const initAdElement = element => {
    if (!element || element.dataset.adInitialized === '1') {
      return;
    }
    element.dataset.adInitialized = '1';
    observer.observe(element);
    initVideoTracking(element);
  };
  const initTracking = () => {
    document.querySelectorAll('[data-ad-id]').forEach(element => {
      initAdElement(element);
    });
  };
  const initObservers = () => {
    initTracking();
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
    return config.observeMutations === true;
  };
  const observeNewAds = () => {
    if (!shouldObserveMutations()) {
      return;
    }
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (!node || node.nodeType !== 1) {
            return;
          }
          if (node.matches?.('[data-ad-id]')) {
            initAdElement(node);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('[data-ad-id]').forEach(element => {
              initAdElement(element);
            });
          }
        });
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };
  const handleClick = event => {
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
    enqueueTrack(payload, {
      useBeacon: true,
      force: true
    });
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
  window.addEventListener('magickad:consent', event => {
    const next = event?.detail?.hasConsent;
    if (next !== true) {
      return;
    }
    hasConsent = true;
    allowLocalStorage = true;
    allowSessionStorage = true;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushQueue({
        useBeacon: true,
        force: true
      });
    }
  });
  window.addEventListener('pagehide', () => {
    flushQueue({
      useBeacon: true,
      force: true
    });
  });
})();

/******/ })()
;
//# sourceMappingURL=magick-ad-track.js.map