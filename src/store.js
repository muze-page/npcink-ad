import { create } from 'zustand';
import apiFetch from '@wordpress/api-fetch';

const createAdGroupTemplate = (type = 'global') => ({
    id: `ad_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name: type === 'targeted' ? '指定广告' : '全局广告',
    options: {
        enabled: true,
        ad_type: type,
        display_mode: 'show',
        show_page: 'all',
        show_position: 'bottom',
        content_type: 'image',
        insert_after: 2,
        device: 'all',
        login: 'all',
        end_date: '',
        target_type: '',
        target_ids: [],
    },
    content: {
        html: '',
        image: { id: 0, url: '', alt: '' },
        link: '',
        link_target: false,
        container_style: {
            mode: 'boxed',
            max_width: 100,
            max_width_unit: '%',
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

const normalizeShowPosition = (value) => {
    if (!value) {
        return '';
    }
    if (value === 'footer') {
        return 'bottom';
    }
    if (value === 'head') {
        return 'top';
    }
    return value;
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
    const imageSettings =
        content.image_settings && typeof content.image_settings === 'object'
            ? content.image_settings
            : {};

    return {
        ...safeAd,
        options: {
            enabled: options.enabled ?? true,
            ad_type: options.ad_type || 'global',
            display_mode: options.display_mode || 'show',
            show_page: options.show_page || 'all',
            show_position: normalizeShowPosition(options.show_position) || 'bottom',
            content_type: options.content_type || 'image',
            insert_after: Number(options.insert_after || 2),
            device: options.device || 'all',
            login: options.login || 'all',
            end_date: options.end_date || '',
            target_type: options.target_type || '',
            target_ids: Array.isArray(options.target_ids)
                ? options.target_ids.map((id) => Number(id)).filter(Boolean)
                : [],
        },
        content: {
            html: content.html || '',
            link: content.link || '',
            link_target: Boolean(content.link_target),
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

export const useStore = create((set, get) => ({
    ads: [],
    isLoading: false,
    isSaving: false,
    error: null,
    addAdGroup: (type) => {
        set((state) => ({
            ads: [...state.ads, createAdGroupTemplate(type)],
        }));
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
    saveToDB: async () => {
        set({ isSaving: true, error: null });
        try {
            const { ads } = get();
            const response = await apiFetch({
                path: '/magick-ad/v1/save-settings',
                method: 'POST',
                data: { ads },
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
            if (Array.isArray(response)) {
                ads = response;
            } else if (Array.isArray(response?.ads)) {
                ads = response.ads;
            } else if (Array.isArray(response?.saved?.ads)) {
                ads = response.saved.ads;
            }

            set({
                ads: ads.map((ad) => normalizeAd(ad)),
                isLoading: false,
            });
            return ads;
        } catch (error) {
            set({ isLoading: false, error });
            return [];
        }
    },
}));
