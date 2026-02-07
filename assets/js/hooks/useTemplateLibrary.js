import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { parse, serialize, createBlock, getBlockVariations } from '@wordpress/blocks';
import { select } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';

const MAGICK_BLOCK = 'magick-ad/ad';
const FAVORITES_KEY = 'magick_ad_template_favorites';
const PINNED_KEY = 'magick_ad_template_pins';
const DEVICE_OPTIONS = ['all', 'mobile', 'tablet', 'desktop'];
const RISK_OPTIONS = ['low', 'medium', 'high'];

const sanitizeScenario = (value) =>
    typeof value === 'string' ? value.trim() : '';

const sanitizeDevice = (value) =>
    DEVICE_OPTIONS.includes(value) ? value : 'all';

const sanitizeRisk = (value) =>
    RISK_OPTIONS.includes(value) ? value : 'low';

const getDefaultMeta = ({ type = 'html', containerType = 'inline', source = 'core' }) => {
    if (source === 'user') {
        return {
            scenario: '自定义',
            device: 'all',
            risk: 'medium',
        };
    }
    if (containerType === 'interstitial') {
        return {
            scenario: '活动促销',
            device: 'all',
            risk: 'high',
        };
    }
    if (
        containerType === 'popup' ||
        containerType === 'banner' ||
        containerType === 'floating'
    ) {
        return {
            scenario: '转化引导',
            device: 'all',
            risk: 'medium',
        };
    }
    if (type === 'video') {
        return {
            scenario: '内容运营',
            device: 'all',
            risk: 'medium',
        };
    }
    if (type === 'block') {
        return {
            scenario: '内容运营',
            device: 'desktop',
            risk: 'low',
        };
    }
    if (type === 'html') {
        return {
            scenario: '通用推广',
            device: 'all',
            risk: 'low',
        };
    }
    return {
        scenario: '通用推广',
        device: 'all',
        risk: 'low',
    };
};

const normalizeTemplateMeta = (meta, fallback = {}) => {
    const sourceMeta = meta && typeof meta === 'object' ? meta : {};
    const fallbackMeta =
        fallback && typeof fallback === 'object' ? fallback : {};

    return {
        scenario: sanitizeScenario(
            sourceMeta.scenario || fallbackMeta.scenario || ''
        ),
        device: sanitizeDevice(
            sourceMeta.device || fallbackMeta.device || 'all'
        ),
        risk: sanitizeRisk(sourceMeta.risk || fallbackMeta.risk || 'low'),
    };
};

const withTemplateMeta = (template, meta, fallbackMeta = null) => {
    const normalized = normalizeTemplateMeta(
        meta,
        fallbackMeta || getDefaultMeta(template)
    );
    return {
        ...template,
        scenario: normalized.scenario,
        device: normalized.device,
        risk: normalized.risk,
    };
};

const walkBlocks = (blocks, matcher) => {
    for (const block of blocks) {
        if (matcher(block)) {
            return block;
        }
        if (block.innerBlocks?.length) {
            const found = walkBlocks(block.innerBlocks, matcher);
            if (found) {
                return found;
            }
        }
    }
    return null;
};

const extractTemplateFromContent = (content) => {
    if (!content) {
        return null;
    }
    const blocks = parse(content);
    const magickBlock = walkBlocks(blocks, (block) => block.name === MAGICK_BLOCK);
    if (!magickBlock) {
        return null;
    }

    const attrs = magickBlock.attributes || {};
    const type = attrs.creativeType || 'html';
    const containerType = attrs.containerType || 'inline';
    const category =
        typeof attrs.templateCategory === 'string'
            ? attrs.templateCategory
            : '';
    const scenario =
        typeof attrs.templateScenario === 'string'
            ? attrs.templateScenario
            : '';
    const device =
        typeof attrs.templateDevice === 'string'
            ? attrs.templateDevice
            : '';
    const risk =
        typeof attrs.templateRisk === 'string' ? attrs.templateRisk : '';

    if (type === 'image') {
        return {
            type,
            containerType,
            category,
            scenario,
            device,
            risk,
            data: {
                image: {
                    id: Number(attrs.imageId || 0),
                    url: attrs.imageUrl || '',
                    alt: attrs.imageAlt || '',
                },
                link: attrs.link || '',
                link_target: Boolean(attrs.linkTarget),
            },
        };
    }

    if (type === 'video') {
        return {
            type,
            containerType,
            category,
            scenario,
            device,
            risk,
            data: {
                video_url: attrs.videoUrl || '',
            },
        };
    }

    if (type === 'block') {
        return {
            type,
            containerType,
            category,
            scenario,
            device,
            risk,
            data: {
                blocks: attrs.blocks || '',
            },
        };
    }

    return {
        type: 'html',
        containerType,
        category,
        scenario,
        device,
        risk,
        data: {
            html: attrs.html || '',
        },
    };
};

const extractTemplateFromContentLoose = (content) => {
    if (!content || typeof content !== 'string') {
        return null;
    }
    const match = content.match(
        /<!--\s*wp:magick-ad\/ad\s+({[\s\S]*?})\s*\/-->/i
    );
    if (!match || !match[1]) {
        return null;
    }
    try {
        const attrs = JSON.parse(match[1]);
        const type = attrs.creativeType || 'html';
        const containerType = attrs.containerType || 'inline';
        const category =
            typeof attrs.templateCategory === 'string'
                ? attrs.templateCategory
                : '';
        const scenario =
            typeof attrs.templateScenario === 'string'
                ? attrs.templateScenario
                : '';
        const device =
            typeof attrs.templateDevice === 'string'
                ? attrs.templateDevice
                : '';
        const risk =
            typeof attrs.templateRisk === 'string'
                ? attrs.templateRisk
                : '';

        if (type === 'image') {
            return {
                type,
                containerType,
                category,
                scenario,
                device,
                risk,
                data: {
                    image: {
                        id: Number(attrs.imageId || 0),
                        url: attrs.imageUrl || '',
                        alt: attrs.imageAlt || '',
                    },
                    link: attrs.link || '',
                    link_target: Boolean(attrs.linkTarget),
                },
            };
        }

        if (type === 'video') {
            return {
                type,
                containerType,
                category,
                scenario,
                device,
                risk,
                data: {
                    video_url: attrs.videoUrl || '',
                },
            };
        }

        if (type === 'block') {
            return {
                type,
                containerType,
                category,
                scenario,
                device,
                risk,
                data: {
                    blocks: attrs.blocks || '',
                },
            };
        }

        return {
            type: 'html',
            containerType,
            category,
            scenario,
            device,
            risk,
            data: {
                html: attrs.html || '',
            },
        };
    } catch (err) {
        return null;
    }
};

const buildPatternContent = (
    type,
    data,
    containerType = 'inline',
    category = ''
) => {
    const attrs = { creativeType: type, containerType };
    if (category) {
        attrs.templateCategory = category;
    }
    if (type === 'image') {
        attrs.imageId = data.image?.id || 0;
        attrs.imageUrl = data.image?.url || '';
        attrs.imageAlt = data.image?.alt || '';
        attrs.link = data.link || '';
        attrs.linkTarget = Boolean(data.link_target);
    } else if (type === 'video') {
        attrs.videoUrl = data.video_url || '';
    } else if (type === 'block') {
        attrs.blocks = data.blocks || '';
    } else {
        attrs.html = data.html || '';
    }
    return serialize([createBlock(MAGICK_BLOCK, attrs)]);
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

    const loadTemplates = useCallback(async (type) => {
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
                return withTemplateMeta(
                    template,
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
                    return withTemplateMeta(
                        template,
                        {
                            scenario: extracted.scenario || '自定义',
                            device: extracted.device || 'all',
                            risk: extracted.risk || 'medium',
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
            await loadTemplateCategories();
            await loadTemplatePreferences();
            await loadTemplates(type);
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
                const content = buildPatternContent(
                    type,
                    data,
                    containerType,
                    category
                );
                await apiFetch({
                    path: '/wp/v2/wp_block',
                    method: 'POST',
                    data: { title: name, status: 'publish', content },
                });
                await loadTemplates(type);
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
                await loadTemplates(templateType);
                showNotice?.('success', '模板导入完成');
            } catch (err) {
                showNotice?.('error', err?.message || '模板导入失败');
            }
        },
        [loadTemplates, templateType, showNotice]
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
