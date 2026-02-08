import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

const FAVORITES_KEY = 'magick_ad_template_favorites';
const PINNED_KEY = 'magick_ad_template_pins';
const MAGICK_BLOCK = 'magick-ad/ad';

let templateHelpersPromise = null;

const loadTemplateHelpers = async () => {
    if (!templateHelpersPromise) {
        templateHelpersPromise = import('./template-library/helpers');
    }
    return templateHelpersPromise;
};

const useTemplateLibrary = ({
    selectedAd,
    getCreativeTemplateData,
    onApplyTemplate,
    showNotice,
}) => {
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateType, setTemplateType] = useState('image');
    const [templateLibrary, setTemplateLibrary] = useState([]);
    const [templateSelection, setTemplateSelection] = useState([]);
    const [templateCategories, setTemplateCategories] = useState([]);
    const [favoriteIds, setFavoriteIds] = useState([]);
    const [pinnedIds, setPinnedIds] = useState([]);
    const fileInputRef = useRef(null);
    const favoritesRef = useRef([]);
    const pinsRef = useRef([]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            const storedFavorites = JSON.parse(
                window.localStorage.getItem(FAVORITES_KEY) || '[]'
            );
            const storedPins = JSON.parse(
                window.localStorage.getItem(PINNED_KEY) || '[]'
            );
            setFavoriteIds(Array.isArray(storedFavorites) ? storedFavorites : []);
            setPinnedIds(Array.isArray(storedPins) ? storedPins : []);
        } catch (err) {
            setFavoriteIds([]);
            setPinnedIds([]);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        window.localStorage.setItem(
            FAVORITES_KEY,
            JSON.stringify(favoriteIds)
        );
    }, [favoriteIds]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        window.localStorage.setItem(PINNED_KEY, JSON.stringify(pinnedIds));
    }, [pinnedIds]);

    useEffect(() => {
        favoritesRef.current = favoriteIds;
    }, [favoriteIds]);

    useEffect(() => {
        pinsRef.current = pinnedIds;
    }, [pinnedIds]);

    const loadTemplates = useCallback(async () => {
        const [
            {
                extractTemplateFromContent,
                extractTemplateFromContentLoose,
                getDefaultMeta,
                normalizeTemplateMeta,
                sanitizeUsageType,
                withTemplateMeta,
            },
            { createBlock, getBlockVariations, serialize },
            { select },
            { store: coreStore },
        ] = await Promise.all([
            loadTemplateHelpers(),
            import('@wordpress/blocks'),
            import('@wordpress/data'),
            import('@wordpress/core-data'),
        ]);

        const fallbackMetaMap = new Map();
        if (
            typeof window !== 'undefined' &&
            Array.isArray(window.MagickAD?.patterns)
        ) {
            window.MagickAD.patterns.forEach((pattern) => {
                const name = pattern?.name || '';
                if (!name) {
                    return;
                }
                fallbackMetaMap.set(
                    name,
                    normalizeTemplateMeta(pattern?.meta, {
                        scenario: '',
                        device: 'all',
                        risk: 'low',
                        industry: 'general',
                    })
                );
            });
        }

        let corePatterns = [];
        try {
            const patterns = select(coreStore)?.getBlockPatterns?.();
            if (Array.isArray(patterns)) {
                corePatterns = patterns;
            } else {
                corePatterns = await apiFetch({
                    path: '/wp/v2/block-patterns/patterns',
                    method: 'GET',
                });
            }
        } catch (err) {
            corePatterns = [];
        }

        if (
            (!Array.isArray(corePatterns) || corePatterns.length === 0) &&
            typeof window !== 'undefined' &&
            Array.isArray(window.MagickAD?.patterns)
        ) {
            corePatterns = window.MagickAD.patterns;
        }

        const variationTemplates = [];
        try {
            const variations = getBlockVariations(MAGICK_BLOCK) || [];
            variations.forEach((variation) => {
                if (!variation || !variation.attributes) {
                    return;
                }
                const content = serialize([
                    createBlock(MAGICK_BLOCK, variation.attributes),
                ]);
                const extracted =
                    extractTemplateFromContent(content) ||
                    extractTemplateFromContentLoose(content);
                if (!extracted) {
                    return;
                }
                const template = {
                    id: `variation-${variation.name || variation.title}`,
                    name: variation.title || '模板变体',
                    description: variation.description || '',
                    source: 'core',
                    content,
                    ...extracted,
                };
                template.usageType = sanitizeUsageType(template.usageType);
                variationTemplates.push(withTemplateMeta(template, extracted));
            });
        } catch (err) {
            // ignore variations
        }

        const systemTemplates = (corePatterns || [])
            .filter((pattern) =>
                Array.isArray(pattern.categories)
                    ? pattern.categories.includes('magick-ad')
                    : false
            )
            .map((pattern) => {
                const extracted =
                    extractTemplateFromContent(pattern.content) ||
                    extractTemplateFromContentLoose(pattern.content);
                if (!extracted) {
                    return null;
                }
                const template = {
                    id: pattern.name || pattern.title,
                    name: pattern.title,
                    description: pattern.description || '',
                    source: 'core',
                    content: pattern.content,
                    ...extracted,
                };
                const patternMeta =
                    pattern?.meta ||
                    fallbackMetaMap.get(pattern.name || '') ||
                    {};
                const usageType = sanitizeUsageType(
                    extracted.usageType ||
                        patternMeta?.usageType ||
                        patternMeta?.usage_type ||
                        'ad'
                );
                return withTemplateMeta(
                    {
                        ...template,
                        usageType,
                    },
                    {
                        ...patternMeta,
                        scenario:
                            extracted.scenario ||
                            patternMeta?.scenario ||
                            '',
                        device:
                            extracted.device ||
                            patternMeta?.device ||
                            'all',
                        risk:
                            extracted.risk ||
                            patternMeta?.risk ||
                            'low',
                        industry:
                            extracted.industry ||
                            patternMeta?.industry ||
                            'general',
                    },
                    getDefaultMeta(template)
                );
            })
            .filter(Boolean);

        let userTemplates = [];
        try {
            const response = await apiFetch({
                path: '/wp/v2/wp_block?per_page=100',
                method: 'GET',
            });
            const posts = Array.isArray(response) ? response : [];
            userTemplates = posts
                .map((post) => {
                    const content = post?.content?.raw || post?.content?.rendered || '';
                    const extracted =
                        extractTemplateFromContent(content) ||
                        extractTemplateFromContentLoose(content);
                    if (!extracted) {
                        return null;
                    }
                    const template = {
                        id: `user-${post.id}`,
                        name: post.title?.rendered || post.title || '',
                        description: '',
                        source: 'user',
                        content,
                        ...extracted,
                    };
                    template.usageType = sanitizeUsageType(template.usageType);
                    return withTemplateMeta(
                        template,
                        {
                            scenario: extracted.scenario || '自定义',
                            device: extracted.device || 'all',
                            risk: extracted.risk || 'medium',
                            industry: extracted.industry || 'general',
                        },
                        getDefaultMeta(template)
                    );
                })
                .filter(Boolean);
        } catch (err) {
            userTemplates = [];
        }

        const merged = [...variationTemplates, ...systemTemplates, ...userTemplates];
        setTemplateLibrary(merged);
    }, []);

    const loadTemplateCategories = useCallback(async () => {
        try {
            const response = await apiFetch({
                path: '/magick-ad/v1/template-categories',
                method: 'GET',
            });
            const categories = Array.isArray(response?.categories)
                ? response.categories
                : [];
            setTemplateCategories(categories);
        } catch (err) {
            setTemplateCategories([]);
        }
    }, []);

    const loadTemplatePreferences = useCallback(async () => {
        try {
            const response = await apiFetch({
                path: '/magick-ad/v1/template-preferences',
                method: 'GET',
            });
            const favorites = Array.isArray(response?.favorites)
                ? response.favorites
                : [];
            const pins = Array.isArray(response?.pins) ? response.pins : [];
            setFavoriteIds(favorites);
            setPinnedIds(pins);
        } catch (err) {
            // fallback to local storage only
        }
    }, []);

    const openTemplateLibrary = useCallback(
        async (type) => {
            setTemplateType(type);
            setTemplateSelection([]);
            setTemplateModalOpen(true);
            await Promise.all([
                loadTemplateCategories(),
                loadTemplatePreferences(),
                loadTemplates(),
            ]);
        },
        [loadTemplates, loadTemplateCategories, loadTemplatePreferences]
    );

    const updateTemplateCategories = useCallback(async (categories) => {
        const payload = Array.isArray(categories) ? categories : [];
        const response = await apiFetch({
            path: '/magick-ad/v1/template-categories',
            method: 'POST',
            data: { categories: payload },
        });
        const next = Array.isArray(response?.categories)
            ? response.categories
            : payload;
        setTemplateCategories(next);
        return next;
    }, []);

    const saveTemplatePreferences = useCallback(
        async (favorites, pins) => {
            try {
                await apiFetch({
                    path: '/magick-ad/v1/template-preferences',
                    method: 'POST',
                    data: { favorites, pins },
                });
            } catch (err) {
                // ignore
            }
        },
        []
    );

    const updatePreferences = useCallback(
        (favorites, pins) => {
            setFavoriteIds(favorites);
            setPinnedIds(pins);
            saveTemplatePreferences(favorites, pins);
        },
        [saveTemplatePreferences]
    );

    const addTemplateCategory = useCallback(
        async (name) => {
            const trimmed = (name || '').trim();
            if (!trimmed) {
                return;
            }
            const current = Array.isArray(templateCategories)
                ? templateCategories
                : [];
            const exists = current.some((item) => item?.name === trimmed);
            if (exists) {
                return;
            }
            const next = [
                ...current,
                { name: trimmed, color: '#E7E9EE' },
            ];
            await updateTemplateCategories(next);
        },
        [templateCategories, updateTemplateCategories]
    );

    const removeTemplateCategory = useCallback(
        async (name) => {
            const current = Array.isArray(templateCategories)
                ? templateCategories
                : [];
            const next = current.filter((item) => item?.name !== name);
            await updateTemplateCategories(next);
        },
        [templateCategories, updateTemplateCategories]
    );

    const toggleFavorite = useCallback(
        (id) => {
            const current = favoritesRef.current || [];
            const next = current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id];
            updatePreferences(next, pinsRef.current || []);
        },
        [updatePreferences]
    );

    const togglePinned = useCallback(
        (id) => {
            const current = pinsRef.current || [];
            const next = current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id];
            updatePreferences(favoritesRef.current || [], next);
        },
        [updatePreferences]
    );

    const bulkFavorite = useCallback(
        (ids, enable) => {
            const current = new Set(favoritesRef.current || []);
            ids.forEach((id) => {
                if (enable) {
                    current.add(id);
                } else {
                    current.delete(id);
                }
            });
            updatePreferences(Array.from(current), pinsRef.current || []);
        },
        [updatePreferences]
    );

    const bulkPinned = useCallback(
        (ids, enable) => {
            const current = new Set(pinsRef.current || []);
            ids.forEach((id) => {
                if (enable) {
                    current.add(id);
                } else {
                    current.delete(id);
                }
            });
            updatePreferences(favoritesRef.current || [], Array.from(current));
        },
        [updatePreferences]
    );

    const clearFavorites = useCallback(() => {
        updatePreferences([], pinsRef.current || []);
    }, [updatePreferences]);

    const clearPins = useCallback(() => {
        updatePreferences(favoritesRef.current || [], []);
    }, [updatePreferences]);

    const restorePreferences = useCallback(
        (favorites, pins) => {
            updatePreferences(
                Array.isArray(favorites) ? favorites : [],
                Array.isArray(pins) ? pins : []
            );
        },
        [updatePreferences]
    );

    const saveTemplate = useCallback(
        async (type, name, category, containerType) => {
            if (!selectedAd) {
                return;
            }
            if (!name) {
                return;
            }
            const data = getCreativeTemplateData(type, selectedAd);
            try {
                const { buildPatternContent } = await loadTemplateHelpers();
                const content = buildPatternContent(
                    type,
                    data,
                    containerType,
                    category,
                    selectedAd?.options?.usage_type || 'ad',
                    'general'
                );
                await apiFetch({
                    path: '/wp/v2/wp_block',
                    method: 'POST',
                    data: { title: name, status: 'publish', content },
                });
                await loadTemplates();
                showNotice?.('success', '模板已保存');
            } catch (err) {
                showNotice?.('error', err?.message || '模板保存失败');
                throw err;
            }
        },
        [selectedAd, getCreativeTemplateData, loadTemplates, showNotice]
    );

    const handleApplyTemplate = useCallback(
        (template) => {
            onApplyTemplate?.(template);
            setTemplateModalOpen(false);
        },
        [onApplyTemplate]
    );

    const handleToggleTemplateSelect = useCallback((id) => {
        setTemplateSelection((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        );
    }, []);

    const handleExportTemplates = useCallback(() => {
        const selected = templateLibrary.filter((item) =>
            templateSelection.includes(item.id)
        );
        if (selected.length === 0) {
            return;
        }
        const payload = selected.map((item) => ({
            title: item.name || '',
            content: item.content || '',
        }));
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `magick-templates-${templateType}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }, [templateLibrary, templateSelection, templateType]);

    const handleImportTemplates = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    }, []);

    const handleFileChange = useCallback(
        async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
                return;
            }
            try {
                const text = await file.text();
                const json = JSON.parse(text);
                const templates = Array.isArray(json) ? json : [];
                const createTasks = templates.map((item) => {
                    if (!item?.content) {
                        return null;
                    }
                    return apiFetch({
                        path: '/wp/v2/wp_block',
                        method: 'POST',
                        data: {
                            title: item.title || '模板',
                            status: 'publish',
                            content: item.content,
                        },
                    });
                });
                await Promise.all(createTasks.filter(Boolean));
                await loadTemplates();
                showNotice?.('success', '模板导入完成');
            } catch (err) {
                showNotice?.('error', err?.message || '模板导入失败');
            }
        },
        [loadTemplates, showNotice]
    );

    return {
        templateModalOpen,
        templateType,
        templateLibrary,
        templateSelection,
        templateCategories,
        favoriteIds,
        pinnedIds,
        fileInputRef,
        setTemplateModalOpen,
        openTemplateLibrary,
        loadTemplateCategories,
        saveTemplate,
        updateTemplateCategories,
        addTemplateCategory,
        removeTemplateCategory,
        toggleFavorite,
        togglePinned,
        bulkFavorite,
        bulkPinned,
        clearFavorites,
        clearPins,
        restorePreferences,
        handleApplyTemplate,
        handleToggleTemplateSelect,
        handleExportTemplates,
        handleImportTemplates,
        handleFileChange,
    };
};

export default useTemplateLibrary;
