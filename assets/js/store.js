import { create } from 'zustand';
import apiFetch from '@wordpress/api-fetch';
import { cleanForSlug } from '@wordpress/url';

const createAdGroupTemplate = (type = 'global', ads = []) => ({
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
    },
    content: {
        html: '',
        blocks: '',
        video_url: '',
        image: { id: 0, url: '', alt: '' },
        link: '',
        link_target: false,
        cta_text: '',
        custom_html: '',
        custom_css: '',
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
            badge_text: '广告',
            badge_color: '#1d2327',
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

const createSlotTemplate = (slots = []) => {
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

const normalizePlacement = (options) => {
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

const normalizeAd = (ad) => {
    const safeAd = ad && typeof ad === 'object' ? ad : {};
    const options =
        safeAd.options && typeof safeAd.options === 'object'
            ? safeAd.options
            : {};
    const content = safeAd.content && typeof safeAd.content === 'object' ? safeAd.content : {};
    const image = content.image && typeof content.image === 'object' ? content.image : {};
    const containerStyle =
        content.container_style && typeof content.container_style === 'object'
            ? content.container_style
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
                ? options.target_ids.map((id) => Number(id)).filter(Boolean)
                : [],
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
            node_compact:
                options.node_compact === false ? false : true,
        },
        content: {
            html: content.html || '',
            blocks: content.blocks || '',
            video_url: content.video_url || '',
            link: content.link || '',
            link_target: Boolean(content.link_target),
            cta_text: content.cta_text || '',
            custom_html: content.custom_html || '',
            custom_css: content.custom_css || '',
            image: {
                id: Number(image.id || 0),
                url: image.url || '',
                alt: image.alt || '',
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
                badge_text: containerStyle.badge_text || '广告',
                badge_color: containerStyle.badge_color || '#1d2327',
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
            close_on_esc:
                behavior.close_on_esc === false ? false : true,
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

const normalizeSlot = (slot) => {
    const safeSlot = slot && typeof slot === 'object' ? slot : {};
    return {
        id: typeof safeSlot.id === 'string' ? safeSlot.id : '',
        label: typeof safeSlot.label === 'string' ? safeSlot.label : '',
        ad_ids: Array.isArray(safeSlot.ad_ids)
            ? safeSlot.ad_ids.filter(Boolean)
            : [],
        weights: Array.isArray(safeSlot.weights)
            ? safeSlot.weights.map((value) => Number(value) || 1)
            : [],
        limit: Number(safeSlot.limit || 1),
    };
};

export const useStore = create((set, get) => ({
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
                return {};
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

            let ads = [];
            let slots = [];
            if (Array.isArray(response)) {
                ads = response;
            } else if (Array.isArray(response?.ads)) {
                ads = response.ads;
                if (Array.isArray(response?.slots)) {
                    slots = response.slots;
                }
            } else if (Array.isArray(response?.saved?.ads)) {
                ads = response.saved.ads;
                if (Array.isArray(response?.saved?.slots)) {
                    slots = response.saved.slots;
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
