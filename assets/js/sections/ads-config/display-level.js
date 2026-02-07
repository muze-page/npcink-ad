export const SETTINGS_LEVEL_STORAGE_KEY = 'magick_ad_settings_level';

export const DISPLAY_LEVEL_LABELS = {
    simple: '简洁',
    advanced: '高级',
    lab: '实验室',
};

export const normalizeDisplayLevel = (value) =>
    value === 'advanced' || value === 'lab' ? value : 'simple';

export const readDisplayLevel = () => {
    if (typeof window === 'undefined') {
        return 'simple';
    }
    try {
        const fromBoot = window.MagickAD?.settingsLevel;
        if (fromBoot) {
            return normalizeDisplayLevel(fromBoot);
        }
        const level = window.localStorage?.getItem(SETTINGS_LEVEL_STORAGE_KEY);
        return normalizeDisplayLevel(level);
    } catch (err) {
        return 'simple';
    }
};
