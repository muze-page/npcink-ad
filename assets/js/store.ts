import { create } from 'zustand';
import apiFetch from '@wordpress/api-fetch';
import { cleanForSlug } from '@wordpress/url';
import type {
    Ad,
    AdType,
    AdOptions,
    AdContent,
    Slot,
    StoreState,
} from './types';

const createAdGroupTemplate = (
    type: AdType = 'global',
    ads: Ad[] = []
): Ad => ({
    id: `ad_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name: type === 'targeted' ? '指定广告' : '全局广告',
    status: 'publish',
    date: '',
    options: {
        enabled: true,
        ad_type: type,
        creative_type: 'image',
        container_type: 'inline',
        display_mode: 'show',
        random_strategy: 'request',
        html_mode: 'safe',
        html_sandbox: 'inherit',
        editor_mode: 'design',
        placement_hook: 'footer',
        placement_position: '',
        placement_paragraph: 0,
        show_page: 'all',
        device: 'all',
        login: 'all',
        start_date: '',
        end_date: '',
        target_type: '',
        target_ids: [],
        priority: 10,
        weight: 1,
        node_target_type: 'id',
        node_target_value: '',
        node_insert: 'append',
        node_match: 'first',
        node_index: 1,
        node_fallback: 'hide',
        node_compact: true,
        render_require_consent: false,
    },
    content: {
        html: '',
        blocks: '',
        video_url: '',
        image: { id: 0, url: '', alt: '' },
        link: '',
        link_target: false,
        link_rel: '',
        cta_text: '',
        custom_html: '',
        custom_css: '',
        custom_js: '',
        video_settings: {
            type: 'mp4',
            autoplay: false,
            muted: false,
            loop: false,
            controls: true,
            playsinline: true,
            preload: 'metadata',
            aspect_ratio: '16:9',
            poster: { id: 0, url: '', alt: '' },
            fallback_text: '',
        },
        block_settings: {
            background: 'transparent',
            text_color: '',
            padding: 0,
            radius: 0,
            max_width: 0,
            font_size: 0,
            font_family: '',
            align: '',
            background_image: { id: 0, url: '', alt: '' },
        },
        container_style: {
            mode: 'boxed',
            max_width: 100,
            max_width_unit: '%',
            reserve_height: 0,
            padding_top: 0,
            padding_right: 0,
            padding_bottom: 0,
            padding_left: 0,
            background: 'transparent',
            radius: 0,
            shadow: 'none',
            badge_enabled: false,
            badge_type: 'text',
            badge_text: '广告',
            badge_color: '#1d2327',
            badge_image: {
                id: 0,
                url: '',
                alt: '',
            },
            layout: '',
        },
        behavior: {
            animation: 'none',
            close_button: false,
            close_on_esc: true,
            close_on_overlay: true,
            lock_scroll: false,
            frequency_mode: 'none',
            frequency_limit: 1,
            delay: 0,
        },
        image_settings: {
            watermark: false,
            radius: 0,
            max_width: 1200,
            margin_top: 0,
            margin_bottom: 0,
            margin_left: 0,
            margin_right: 0,
        },
    },
});

const createSlotTemplate = (slots: Slot[] = []): Slot => {
    const existing = new Set(
        (slots || []).map((slot) => cleanForSlug(slot?.id || ''))
    );
    let candidate = 'slot';
    let index = 2;
    while (candidate && existing.has(candidate)) {
        candidate = `slot-${index}`;
        index += 1;
    }
    return {
        id: candidate || 'slot',
        label: '新广告位',
        ad_ids: [],
        weights: [],
        limit: 1,
    };
};

const normalizePlacement = (options: Partial<AdOptions>): {
    hook: string;
    position: string;
    paragraph: number;
} => {
    const placement = {
        hook: options.placement_hook || 'footer',
        position: options.placement_position || '',
        paragraph: Number(options.placement_paragraph || 0),
    };

    if (placement.hook === 'content') {
        placement.position = placement.position || 'before';
        if (placement.position === 'paragraph') {
            placement.paragraph = placement.paragraph > 0 ? placement.paragraph : 2;
        } else {
            placement.paragraph = 0;
        }
    } else {
        placement.position = '';
        placement.paragraph = 0;
    }

    return placement;
};

const normalizeAd = (ad: unknown): Ad => {
    const safeAd = ad && typeof ad === 'object' ? (ad as Record<string, any>) : {};
    const options =
        safeAd.options && typeof safeAd.options === 'object'
            ? safeAd.options
            : {};
    const content =
        safeAd.content && typeof safeAd.content === 'object' ? safeAd.content : {};
    const image =
        content.image && typeof content.image === 'object' ? content.image : {};
    const containerStyle =
        content.container_style && typeof content.container_style === 'object'
            ? content.container_style
            : {};
    const videoSettings =
        content.video_settings && typeof content.video_settings === 'object'
            ? content.video_settings
            : {};
    const blockSettings =
        content.block_settings && typeof content.block_settings === 'object'
            ? content.block_settings
            : {};
    const behavior =
        content.behavior && typeof content.behavior === 'object'
            ? content.behavior
            : {};
    const placement = normalizePlacement(options);
    const imageSettings =
        content.image_settings && typeof content.image_settings === 'object'
            ? content.image_settings
            : {};
    const contentTypeRaw =
        options.creative_type ||
        options.content_type ||
        options.type ||
        'image';
    const contentType =
        contentTypeRaw === 'popup' || contentTypeRaw === 'bar'
            ? 'html'
            : contentTypeRaw;
    const containerType =
        options.container_type ||
        options.container ||
        ((options.content_type === 'popup' && 'popup') ||
            (options.content_type === 'bar' && 'banner')) ||
        'inline';

    return {
        ...safeAd,
        status:
            safeAd.status ||
            safeAd.post_status ||
            (options.enabled === false ? 'draft' : 'publish'),
        date: safeAd.date || safeAd.post_date || '',
        options: {
            enabled: options.enabled ?? true,
            ad_type: options.ad_type || 'global',
            creative_type: ['html', 'image', 'video', 'block'].includes(
                contentType
            )
                ? contentType
                : 'image',
            container_type: [
                'inline',
                'popup',
                'banner',
                'floating',
                'interstitial',
            ].includes(containerType)
                ? containerType
                : 'inline',
            display_mode: options.display_mode || 'show',
            random_strategy: ['request', 'session', 'cookie'].includes(
                options.random_strategy
            )
                ? options.random_strategy
                : 'request',
            html_mode: ['safe', 'full'].includes(options.html_mode)
                ? options.html_mode
                : 'safe',
            html_sandbox: ['inherit', 'enable', 'disable'].includes(
                options.html_sandbox
            )
                ? options.html_sandbox
                : 'inherit',
            editor_mode: ['quick', 'design', 'expert'].includes(options.editor_mode)
                ? options.editor_mode
                : 'design',
            placement_hook: placement.hook || 'footer',
            placement_position:
                placement.hook === 'content' ? placement.position || 'before' : '',
            placement_paragraph:
                placement.hook === 'content' && placement.position === 'paragraph'
                    ? Number(placement.paragraph || 2)
                    : 0,
            show_page: options.show_page || 'all',
            device: options.device || 'all',
            login: options.login || 'all',
            start_date: options.start_date || '',
            end_date: options.end_date || '',
            target_type: options.target_type || '',
            target_ids: Array.isArray(options.target_ids)
                ? options.target_ids.map((id: number) => Number(id)).filter(Boolean)
                : [],
            priority: Number(options.priority || 10),
            weight: Number(options.weight || 1),
            node_target_type: ['id', 'class'].includes(options.node_target_type)
                ? options.node_target_type
                : 'id',
            node_target_value:
                typeof options.node_target_value === 'string'
                    ? options.node_target_value
                    : '',
            node_insert: ['append', 'prepend', 'before', 'after'].includes(
                options.node_insert
            )
                ? options.node_insert
                : 'append',
            node_match: ['first', 'nth', 'all'].includes(options.node_match)
                ? options.node_match
                : 'first',
            node_index: Number(options.node_index || 1) || 1,
            node_fallback: ['hide', 'footer'].includes(options.node_fallback)
                ? options.node_fallback
                : 'hide',
            node_compact: options.node_compact === false ? false : true,
            render_require_consent: Boolean(options.render_require_consent),
        },
        content: {
            html: content.html || '',
            blocks: content.blocks || '',
            video_url: content.video_url || '',
            link: content.link || '',
            link_target: Boolean(content.link_target),
            link_rel: content.link_rel || '',
            cta_text: content.cta_text || '',
            custom_html: content.custom_html || '',
            custom_css: content.custom_css || '',
            custom_js: content.custom_js || '',
            image: {
                id: Number(image.id || 0),
                url: image.url || '',
                alt: image.alt || '',
            },
            video_settings: {
                type: ['mp4', 'embed'].includes(videoSettings.type)
                    ? videoSettings.type
                    : 'mp4',
                autoplay: Boolean(videoSettings.autoplay),
                muted: Boolean(videoSettings.muted),
                loop: Boolean(videoSettings.loop),
                controls: videoSettings.controls !== false,
                playsinline: videoSettings.playsinline !== false,
                preload: ['metadata', 'auto', 'none'].includes(
                    videoSettings.preload
                )
                    ? videoSettings.preload
                    : 'metadata',
                aspect_ratio: ['auto', '16:9', '4:3', '1:1', '9:16'].includes(
                    videoSettings.aspect_ratio
                )
                    ? videoSettings.aspect_ratio
                    : '16:9',
                poster: {
                    id: Number(videoSettings.poster?.id || 0),
                    url: videoSettings.poster?.url || '',
                    alt: videoSettings.poster?.alt || '',
                },
                fallback_text: videoSettings.fallback_text || '',
            },
            block_settings: {
                background: blockSettings.background || 'transparent',
                text_color: blockSettings.text_color || '',
                padding: Number(blockSettings.padding || 0),
                radius: Number(blockSettings.radius || 0),
                max_width: Number(blockSettings.max_width || 0),
                font_size: Number(blockSettings.font_size || 0),
                font_family: blockSettings.font_family || '',
                align: blockSettings.align === 'center' ? 'center' : '',
                background_image: {
                    id: Number(blockSettings.background_image?.id || 0),
                    url: blockSettings.background_image?.url || '',
                    alt: blockSettings.background_image?.alt || '',
                },
            },
            container_style: {
                mode: containerStyle.mode === 'raw' ? 'raw' : 'boxed',
                max_width: Number(containerStyle.max_width || 100),
                max_width_unit:
                    containerStyle.max_width_unit === 'px' ? 'px' : '%',
                reserve_height: Number(containerStyle.reserve_height || 0),
                padding_top: Number(containerStyle.padding_top || 0),
                padding_right: Number(containerStyle.padding_right || 0),
                padding_bottom: Number(containerStyle.padding_bottom || 0),
                padding_left: Number(containerStyle.padding_left || 0),
                background: containerStyle.background || 'transparent',
                radius: Number(containerStyle.radius || 0),
                shadow: ['none', 'soft', 'float'].includes(
                    containerStyle.shadow
                )
                    ? containerStyle.shadow
                    : 'none',
                badge_enabled: Boolean(containerStyle.badge_enabled),
                badge_type: ['text', 'image'].includes(
                    containerStyle.badge_type
                )
                    ? containerStyle.badge_type
                    : 'text',
                badge_text: containerStyle.badge_text || '广告',
                badge_color: containerStyle.badge_color || '#1d2327',
                badge_image: {
                    id: Number(containerStyle.badge_image?.id || 0),
                    url: containerStyle.badge_image?.url || '',
                    alt: containerStyle.badge_image?.alt || '',
                },
                layout:
                    containerStyle.layout === 'centered'
                        ? 'centered'
                        : '',
            },
            behavior: {
                animation: ['none', 'fade', 'slide-up', 'zoom'].includes(
                    behavior.animation
                )
                    ? behavior.animation
                    : 'none',
                close_button: Boolean(behavior.close_button),
                close_on_esc: behavior.close_on_esc === false ? false : true,
                close_on_overlay:
                    behavior.close_on_overlay === false ? false : true,
                lock_scroll: Boolean(behavior.lock_scroll),
                frequency_mode: ['none', 'session', 'day', 'count'].includes(
                    behavior.frequency_mode
                )
                    ? behavior.frequency_mode
                    : 'none',
                frequency_limit: Number(behavior.frequency_limit || 1),
                delay: Number(behavior.delay || 0),
            },
            image_settings: {
                watermark: Boolean(imageSettings.watermark),
                radius: Number(imageSettings.radius || 0),
                max_width: Number(imageSettings.max_width || 1200),
                margin_top: Number(imageSettings.margin_top || 0),
                margin_bottom: Number(imageSettings.margin_bottom || 0),
                margin_left: Number(imageSettings.margin_left || 0),
                margin_right: Number(imageSettings.margin_right || 0),
            },
        },
    };
};

const normalizeSlot = (slot: unknown): Slot => {
    const safeSlot = slot && typeof slot === 'object' ? (slot as Record<string, any>) : {};
    return {
        id: typeof safeSlot.id === 'string' ? safeSlot.id : '',
        label: typeof safeSlot.label === 'string' ? safeSlot.label : '',
        ad_ids: Array.isArray(safeSlot.ad_ids)
            ? safeSlot.ad_ids.filter(Boolean)
            : [],
        weights: Array.isArray(safeSlot.weights)
            ? safeSlot.weights.map((value: number) => Number(value) || 1)
            : [],
        limit: Number(safeSlot.limit || 1),
    };
};

export const useStore = create<StoreState>((set, get) => ({
    ads: [],
    slots: [],
    isLoading: false,
    isSaving: false,
    error: null,
    addAdGroup: (type) => {
        set((state) => {
            const draft = createAdGroupTemplate(type, state.ads);
            return {
                ads: [...state.ads, draft],
            };
        });
    },
    removeAdGroup: (id) => {
        set((state) => ({
            ads: state.ads.filter((ad) => ad.id !== id),
        }));
    },
    updateAdGroup: (id, updates) => {
        set((state) => ({
            ads: state.ads.map((ad) =>
                ad.id === id ? { ...ad, ...updates } : ad
            ),
        }));
    },
    setSlots: (slots) => {
        set({ slots: Array.isArray(slots) ? slots : [] });
    },
    addSlot: () => {
        set((state) => ({
            slots: [...state.slots, createSlotTemplate(state.slots)],
        }));
    },
    updateSlot: (index, updates) => {
        set((state) => {
            const next = [...state.slots];
            if (!next[index]) {
                return state;
            }
            next[index] = { ...next[index], ...updates };
            return { slots: next };
        });
    },
    removeSlot: (index) => {
        set((state) => ({
            slots: state.slots.filter((_, idx) => idx !== index),
        }));
    },
    saveToDB: async () => {
        set({ isSaving: true, error: null });
        try {
            const { ads, slots } = get();
            const response = await apiFetch({
                path: '/magick-ad/v1/save-settings',
                method: 'POST',
                data: { ads, slots },
            });
            set({ isSaving: false });
            return response;
        } catch (error) {
            set({ isSaving: false, error });
            throw error;
        }
    },
    fetchFromDB: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await apiFetch({
                path: '/magick-ad/v1/save-settings',
                method: 'GET',
            });

            let ads: Ad[] = [];
            let slots: Slot[] = [];
            if (Array.isArray(response)) {
                ads = response as Ad[];
            } else if (Array.isArray((response as any)?.ads)) {
                ads = (response as any).ads;
                if (Array.isArray((response as any)?.slots)) {
                    slots = (response as any).slots;
                }
            } else if (Array.isArray((response as any)?.saved?.ads)) {
                ads = (response as any).saved.ads;
                if (Array.isArray((response as any)?.saved?.slots)) {
                    slots = (response as any).saved.slots;
                }
            }

            set({
                ads: ads.map((ad) => normalizeAd(ad)),
                slots: slots.map((slot) => normalizeSlot(slot)),
                isLoading: false,
            });
            return ads;
        } catch (error) {
            set({ isLoading: false, error });
            return [];
        }
    },
}));
