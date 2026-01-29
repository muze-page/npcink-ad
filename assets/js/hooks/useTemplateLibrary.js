import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { parse, serialize, createBlock } from '@wordpress/blocks';
import { select } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';

const MAGICK_BLOCK = 'magick-ad/ad';
const FAVORITES_KEY = 'magick_ad_template_favorites';
const PINNED_KEY = 'magick_ad_template_pins';

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

    if (type === 'image') {
        return {
            type,
            containerType,
            category,
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
            data: {
                blocks: attrs.blocks || '',
            },
        };
    }

    return {
        type: 'html',
        containerType,
        category,
        data: {
            html: attrs.html || '',
        },
    };
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

    const systemTemplates = (corePatterns || [])
            .filter((pattern) =>
                Array.isArray(pattern.categories)
                    ? pattern.categories.includes('magick-ad')
                    : false
            )
            .map((pattern) => {
                const extracted = extractTemplateFromContent(pattern.content);
                if (!extracted) {
                    return null;
                }
                return {
                    id: pattern.name || pattern.title,
                    name: pattern.title,
                    description: pattern.description || '',
                    source: 'core',
                    content: pattern.content,
                    ...extracted,
                };
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
                    const extracted = extractTemplateFromContent(content);
                    if (!extracted) {
                        return null;
                    }
                    return {
                        id: `user-${post.id}`,
                        name: post.title?.rendered || post.title || '',
                        description: '',
                        source: 'user',
                        content,
                        ...extracted,
                    };
                })
                .filter(Boolean);
        } catch (err) {
            userTemplates = [];
        }

        const merged = [...systemTemplates, ...userTemplates];
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
