(() => {
    const config = window.MagickADPreview || {};
    const context = config.context || {};
    const debugEl = document.querySelector('.magick-ad-preview-debug');
    const titleEl = debugEl?.querySelector('.magick-ad-preview-debug__title');
    const statusEl =
        debugEl?.querySelector('.magick-ad-preview-debug__status');
    const reasonEl =
        debugEl?.querySelector('.magick-ad-preview-debug__reason');

    const zoneSelector = '[data-magick-zone]';
    const zones = () => document.querySelectorAll(zoneSelector);

    const reasonLabels = {
        disabled: '未启用',
        expired: '已过期',
        'display_mode=hide': '展示模式=隐藏',
        'display_mode=random_hidden': '随机模式未命中',
        targeting: '定向条件不匹配',
        show_page: '展示页面不匹配',
        device: '设备不匹配',
        login: '登录状态不匹配',
    };

    const clearPreview = () => {
        document
            .querySelectorAll('.magick-ad-preview-item')
            .forEach((node) => node.remove());
    };

    const formatReasons = (reasons) =>
        reasons
            .map((reason) => reasonLabels[reason] || reason)
            .filter(Boolean)
            .join(' · ');

    const updateDebug = (ad, evaluation) => {
        if (!debugEl) {
            return;
        }
        if (titleEl && ad?.name) {
            titleEl.textContent = ad.name;
        }
        if (statusEl) {
            statusEl.textContent = evaluation.allowed ? '命中' : '未命中';
        }
        debugEl.classList.toggle('is-hit', evaluation.allowed);
        debugEl.classList.toggle('is-miss', !evaluation.allowed);
        if (reasonEl) {
            if (evaluation.allowed) {
                reasonEl.textContent = '';
            } else {
                const text = formatReasons(evaluation.reasons);
                reasonEl.textContent = text ? `原因：${text}` : '';
            }
        }
    };

    const isExpired = (options) => {
        const endDate = options?.end_date;
        if (!endDate) {
            return false;
        }
        const timestamp = Date.parse(`${endDate}T23:59:59`);
        if (Number.isNaN(timestamp)) {
            return false;
        }
        return Date.now() > timestamp;
    };

    const matchesShowPage = (options, ctx) => {
        const page = options?.show_page || 'all';
        const pageCtx = ctx?.page || {};
        if (page === 'posts') {
            return !!pageCtx.is_single;
        }
        if (page === 'pages') {
            return !!pageCtx.is_page;
        }
        if (page === 'home') {
            return !!(pageCtx.is_home || pageCtx.is_front_page);
        }
        if (page === 'archive') {
            return !!pageCtx.is_archive;
        }
        if (page === 'category') {
            return !!pageCtx.is_category;
        }
        if (page === 'tag') {
            return !!pageCtx.is_tag;
        }
        if (page === 'search') {
            return !!pageCtx.is_search;
        }
        if (page === 'not_found') {
            return !!pageCtx.is_404;
        }
        if (page === 'author') {
            return !!pageCtx.is_author;
        }
        return true;
    };

    const matchesLogin = (options, ctx) => {
        const login = options?.login || 'all';
        if (login === 'logged-in') {
            return !!ctx?.user?.logged_in;
        }
        if (login === 'logged-out') {
            return !ctx?.user?.logged_in;
        }
        return true;
    };

    const matchesDevice = (options, ctx, deviceOverride) => {
        const device = options?.device || 'all';
        if (!device || device === 'all') {
            return true;
        }
        if (deviceOverride) {
            return deviceOverride === device;
        }
        const isMobile = !!ctx?.device?.is_mobile;
        const isTablet = !!ctx?.device?.is_tablet;
        if (device === 'mobile') {
            return isMobile && !isTablet;
        }
        if (device === 'tablet') {
            return isTablet;
        }
        if (device === 'desktop') {
            return !isMobile && !isTablet;
        }
        return true;
    };

    const evaluateAd = (ad, ctx, deviceOverride) => {
        const reasons = [];
        const options = ad?.options || {};

        if (options.enabled === false || options.enabled === 0) {
            reasons.push('disabled');
        }
        if (isExpired(options)) {
            reasons.push('expired');
        }

        const displayMode = options.display_mode || 'show';
        if (displayMode === 'hide') {
            reasons.push('display_mode=hide');
        }

        const adType = options.ad_type || 'global';
        if (adType === 'targeted') {
            // 预览页无法完全匹配真实定向条件，这里保守判断
            if (!options.target_type) {
                reasons.push('targeting');
            }
        } else if (!matchesShowPage(options, ctx)) {
            reasons.push('show_page');
        }

        if (!matchesDevice(options, ctx, deviceOverride)) {
            reasons.push('device');
        }

        if (!matchesLogin(options, ctx)) {
            reasons.push('login');
        }

        if (displayMode === 'random') {
            const bucket = Math.floor(Date.now() / 300000);
            const seed = `${ad?.id || ''}-${bucket}`;
            const hash = seed
                .split('')
                .reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const hit = hash % 2 === 0;
            if (!hit) {
                reasons.push('display_mode=random_hidden');
            }
        }

        return {
            allowed: reasons.length === 0,
            reasons,
        };
    };

    const buildHtmlContainer = (body, content) => {
        const containerStyle = content?.container_style || {};
        if (containerStyle.mode === 'raw') {
            return body;
        }
        const classes = ['magick-ad-html-container'];
        const styles = [];
        const maxWidth = Number(containerStyle.max_width || 0);
        const maxWidthUnit = containerStyle.max_width_unit || '%';
        const paddingTop = Number(containerStyle.padding_top || 0);
        const paddingRight = Number(containerStyle.padding_right || 0);
        const paddingBottom = Number(containerStyle.padding_bottom || 0);
        const paddingLeft = Number(containerStyle.padding_left || 0);
        const background = containerStyle.background || 'transparent';
        const radius = Number(containerStyle.radius || 0);
        const shadow = containerStyle.shadow || 'none';
        const badgeEnabled = !!containerStyle.badge_enabled;
        const badgeText = containerStyle.badge_text || '广告';
        const badgeColor = containerStyle.badge_color || '#1d2327';
        const layout = containerStyle.layout || '';

        if (maxWidth) {
            styles.push(`max-width:${maxWidth}${maxWidthUnit}`);
            if (maxWidthUnit === 'px') {
                styles.push('width:100%');
            }
        }
        if (paddingTop || paddingRight || paddingBottom || paddingLeft) {
            styles.push(
                `padding:${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`
            );
        }
        if (background && background !== 'transparent') {
            styles.push(`background:${background}`);
        }
        if (radius) {
            styles.push(`border-radius:${radius}px`);
        }
        if (shadow === 'soft') {
            classes.push('magick-ad-shadow--soft');
        }
        if (shadow === 'float') {
            classes.push('magick-ad-shadow--float');
        }
        if (layout === 'centered') {
            classes.push('magick-ad-layout--centered');
            styles.push('margin-left:auto');
            styles.push('margin-right:auto');
        }

        const styleAttr = styles.length ? ` style="${styles.join(';')}"` : '';
        const badgeMarkup = badgeEnabled
            ? `<span class="magick-ad-badge" style="background:${badgeColor}">${badgeText}</span>`
            : '';
        const closeMarkup = content?.behavior?.close_button
            ? '<button type="button" class="magick-ad-close" aria-label="关闭广告">×</button>'
            : '';

        return `<div class="${classes.join(' ')}"${styleAttr}>${badgeMarkup}${closeMarkup}<div class="magick-ad-html-content">${body}</div></div>`;
    };

    const buildBody = (ad) => {
        const content = ad?.content || {};
        const options = ad?.options || {};
        const creativeType =
            options.creative_type || options.content_type || 'image';

        let body = '';
        if (creativeType === 'html') {
            if (content.html) {
                body = content.html;
            }
        } else if (creativeType === 'block') {
            if (content.blocks) {
                body = content.blocks;
            }
        } else if (creativeType === 'image') {
            const image = content.image || {};
            if (image.url) {
                const settings = content.image_settings || {};
                const styles = [];
                if (settings.radius) {
                    styles.push(`border-radius:${settings.radius}px`);
                }
                if (settings.max_width) {
                    styles.push(`max-width:${settings.max_width}px`);
                    styles.push('width:100%');
                }
                if (settings.margin_top) {
                    styles.push(`margin-top:${settings.margin_top}px`);
                }
                if (settings.margin_bottom) {
                    styles.push(`margin-bottom:${settings.margin_bottom}px`);
                }
                if (settings.margin_left) {
                    styles.push(`margin-left:${settings.margin_left}px`);
                }
                if (settings.margin_right) {
                    styles.push(`margin-right:${settings.margin_right}px`);
                }
                const styleAttr = styles.length
                    ? ` style="${styles.join(';')}"`
                    : '';
                let imgTag = `<img src="${image.url}" alt="${image.alt || ''}"${styleAttr} />`;
                if (content.link) {
                    const target = content.link_target
                        ? ' target="_blank" rel="noopener noreferrer"'
                        : '';
                    imgTag = `<a href="${content.link}"${target}>${imgTag}</a>`;
                }
                if (content.link && content.cta_text) {
                    const target = content.link_target
                        ? ' target="_blank" rel="noopener noreferrer"'
                        : '';
                    imgTag += `<a class="magick-ad-cta" href="${content.link}"${target}>${content.cta_text}</a>`;
                }
                body = imgTag;
            }
        } else if (creativeType === 'video') {
            if (content.video_url) {
                body = `<div class="magick-ad-video"><video controls src="${content.video_url}"></video></div>`;
            }
        }

        if (!body) {
            return '';
        }

        if (content.custom_html) {
            body += content.custom_html;
        }
        if (content.custom_css) {
            body = `<style>${content.custom_css}</style>${body}`;
        }

        return buildHtmlContainer(body, content);
    };

    const getPlacement = (ad) => {
        const options = ad?.options || {};
        const hook = options.placement_hook || 'content';
        const position = options.placement_position || '';
        const paragraph = Number(options.placement_paragraph || 0) || 0;
        return { hook, position, paragraph };
    };

    const insertIntoZone = (node, zone) => {
        if (!node) {
            return;
        }
        if (zone) {
            zone.appendChild(node);
        }
    };

    const renderAd = (ad, deviceOverride) => {
        if (!ad) {
            return;
        }
        clearPreview();
        const evaluation = evaluateAd(ad, context, deviceOverride);
        updateDebug(ad, evaluation);
        if (!evaluation.allowed) {
            return;
        }

        const body = buildBody(ad);
        if (!body) {
            return;
        }

        const options = ad?.options || {};
        const containerType = options.container_type || 'inline';
        const placement = getPlacement(ad);
        const position = placement.position || placement.hook || 'content';
        const unitClass = `magick-ad-unit magick-ad-unit--${position} magick-ad-container--${containerType}`;
        const wrapper = document.createElement('div');
        wrapper.className = `${unitClass} magick-ad-preview-item`;
        const unitBody =
            containerType === 'popup' || containerType === 'interstitial'
                ? `<div class="magick-ad-overlay"></div><div class="magick-ad-popup" role="dialog" aria-modal="true" tabindex="-1">${body}</div>`
                : body;
        wrapper.innerHTML = `<div class="magick-ad-unit__inner">${unitBody}</div>`;

        if (placement.hook === 'head') {
            insertIntoZone(
                wrapper,
                document.querySelector('[data-magick-zone="head"]')
            );
            return;
        }
        if (placement.hook === 'body_top') {
            insertIntoZone(
                wrapper,
                document.querySelector('[data-magick-zone="body_top"]')
            );
            return;
        }
        if (placement.hook === 'footer') {
            insertIntoZone(
                wrapper,
                document.querySelector('[data-magick-zone="footer"]')
            );
            return;
        }
        if (placement.hook === 'comments_top') {
            insertIntoZone(
                wrapper,
                document.querySelector('[data-magick-zone="comments_top"]')
            );
            return;
        }
        if (placement.hook === 'comments_bottom') {
            insertIntoZone(
                wrapper,
                document.querySelector('[data-magick-zone="comments_bottom"]')
            );
            return;
        }
        if (placement.hook === 'comment_form_before') {
            insertIntoZone(
                wrapper,
                document.querySelector('[data-magick-zone="comment_form_before"]')
            );
            return;
        }
        if (placement.hook === 'comment_form_after') {
            insertIntoZone(
                wrapper,
                document.querySelector('[data-magick-zone="comment_form_after"]')
            );
            return;
        }

        if (placement.hook === 'content') {
            if (placement.position === 'before') {
                insertIntoZone(
                    wrapper,
                    document.querySelector('[data-magick-zone="content_before"]')
                );
                return;
            }
            if (placement.position === 'after') {
                insertIntoZone(
                    wrapper,
                    document.querySelector('[data-magick-zone="content_after"]')
                );
                return;
            }
            if (placement.position === 'paragraph') {
                const target =
                    document.querySelector(
                        `[data-magick-paragraph="${placement.paragraph || 2}"]`
                    ) ||
                    document.querySelector('[data-magick-paragraph="2"]');
                if (target?.parentNode) {
                    target.parentNode.insertBefore(
                        wrapper,
                        target.nextSibling
                    );
                }
                return;
            }
        }

        insertIntoZone(
            wrapper,
            document.querySelector('[data-magick-zone="content_before"]')
        );
    };

    window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) {
            return;
        }
        const payload = event.data;
        if (!payload || payload.type !== 'MAGICK_AD_PREVIEW_UPDATE') {
            return;
        }
        renderAd(payload?.payload?.ad, payload?.payload?.device);
    });

    window.parent?.postMessage?.(
        { type: 'MAGICK_AD_PREVIEW_READY' },
        window.location.origin
    );

    if (config.ad) {
        renderAd(config.ad, config.device);
    }
})();
