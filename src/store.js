import { create } from 'zustand';
import apiFetch from '@wordpress/api-fetch';

const createAdGroupTemplate = () => ({
    id: `ad_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name: '',
    options: {
        status: 'draft',
        placement: '',
        priority: 0,
    },
    content: {
        html: '',
        image: '',
        link: '',
    },
});

export const useStore = create((set, get) => ({
    ads: [],
    isLoading: false,
    isSaving: false,
    error: null,
    addAdGroup: () => {
        set((state) => ({
            ads: [...state.ads, createAdGroupTemplate()],
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

            set({ ads, isLoading: false });
            return ads;
        } catch (error) {
            set({ isLoading: false, error });
            return [];
        }
    },
}));
