import { Modal, Notice, TabPanel } from '@wordpress/components';
import { useEffect, useMemo, useState } from '@wordpress/element';
import TemplateLibrary from './TemplateLibrary';

const TemplateLibraryModal = ({
    isOpen,
    type,
    templates,
    categories,
    selected,
    favoriteIds,
    pinnedIds,
    onAddCategory,
    onRemoveCategory,
    onUpdateCategories,
    onToggleSelect,
    onToggleFavorite,
    onTogglePinned,
    onBulkFavorite,
    onBulkPinned,
    onClearFavorites,
    onClearPins,
    onRestorePreferences,
    onApply,
    onImport,
    onExport,
    onClose,
}) => {
    if (!isOpen) {
        return null;
    }

    const [containerFilter, setContainerFilter] = useState('all');
    const [creativeFilter, setCreativeFilter] = useState(type || 'all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const initialCreativeFilter = type || 'all';

    useEffect(() => {
        if (type) {
            setCreativeFilter(type);
        }
    }, [type]);

    const safeTemplates = Array.isArray(templates) ? templates : [];
    const systemTemplates = safeTemplates.filter((item) => item.source === 'core');
    const userTemplates = safeTemplates.filter((item) => item.source === 'user');

    const derivedCategories = Array.from(
        new Set(
            safeTemplates
                .map((item) => item.category)
                .filter((item) => item && item.trim())
        )
    );
    const availableCategories =
        Array.isArray(categories) && categories.length > 0
            ? categories
            : derivedCategories.map((name) => ({
                  name,
                  color: '#E7E9EE',
              }));
    const categoryNames = availableCategories.map((item) => item.name);
    const categoryColors = availableCategories.reduce((acc, item) => {
        if (item?.name) {
            acc[item.name] = item.color;
        }
        return acc;
    }, {});
    const hasUncategorized = safeTemplates.some(
        (item) => !item.category || !item.category.trim()
    );

    const selectedIds = Array.isArray(selected) ? selected : [];
    const favoriteList = Array.isArray(favoriteIds) ? favoriteIds : [];
    const pinnedList = Array.isArray(pinnedIds) ? pinnedIds : [];

    const filterByCreative = (list) => {
        if (creativeFilter === 'all') {
            return list;
        }
        return list.filter((item) => item.type === creativeFilter);
    };

    const filterByContainer = (list) => {
        if (containerFilter === 'all') {
            return list;
        }
        return list.filter(
            (item) => (item.containerType || 'inline') === containerFilter
        );
    };

    const filterByCategory = (list) => {
        if (categoryFilter === 'all') {
            return list;
        }
        if (categoryFilter === '未分类') {
            return list.filter((item) => !item.category || !item.category.trim());
        }
        return list.filter((item) => (item.category || '') === categoryFilter);
    };

    const filterByQuery = (list) => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) {
            return list;
        }
        return list.filter((item) => {
            const name = (item.name || '').toLowerCase();
            const desc = (item.description || '').toLowerCase();
            return name.includes(keyword) || desc.includes(keyword);
        });
    };

    const filterByFavorites = (list) => {
        if (!onlyFavorites) {
            return list;
        }
        return list.filter((item) => favoriteList.includes(item.id));
    };

    const sortByPinned = (list) => {
        return [...list].sort((a, b) => {
            const pinA = pinnedList.includes(a.id) ? 1 : 0;
            const pinB = pinnedList.includes(b.id) ? 1 : 0;
            if (pinA !== pinB) {
                return pinB - pinA;
            }
            const favA = favoriteList.includes(a.id) ? 1 : 0;
            const favB = favoriteList.includes(b.id) ? 1 : 0;
            if (favA !== favB) {
                return favB - favA;
            }
            return (a.name || '').localeCompare(b.name || '');
        });
    };

    const applyCategoryColors = (list) =>
        list.map((item) => ({
            ...item,
            categoryColor: item.category
                ? categoryColors[item.category] || '#f3f4f6'
                : '#f3f4f6',
        }));

    const buildFilteredList = (list) =>
        applyCategoryColors(
            sortByPinned(
                filterByFavorites(
                    filterByQuery(
                        filterByCategory(
                            filterByContainer(filterByCreative(list))
                        )
                    )
                )
            )
        );

    const hasActiveFilters =
        creativeFilter !== initialCreativeFilter ||
        containerFilter !== 'all' ||
        categoryFilter !== 'all' ||
        query.trim() !== '' ||
        onlyFavorites;

    const resetFilters = () => {
        setCreativeFilter(initialCreativeFilter);
        setContainerFilter('all');
        setCategoryFilter('all');
        setQuery('');
        setOnlyFavorites(false);
    };

    const activeFilterTags = [];
    if (creativeFilter !== initialCreativeFilter) {
        const creativeLabel =
            [
                { label: '全部', value: 'all' },
                { label: '代码/HTML', value: 'html' },
                { label: '图片', value: 'image' },
                { label: '视频', value: 'video' },
                { label: '可视化', value: 'block' },
            ].find((item) => item.value === creativeFilter)?.label || creativeFilter;
        activeFilterTags.push(`创意：${creativeLabel}`);
    }
    if (containerFilter !== 'all') {
        const containerLabel =
            [
                { label: '默认嵌入', value: 'inline' },
                { label: '弹窗', value: 'popup' },
                { label: '横栏', value: 'banner' },
                { label: '悬浮', value: 'floating' },
                { label: '插屏', value: 'interstitial' },
            ].find((item) => item.value === containerFilter)?.label || containerFilter;
        activeFilterTags.push(`容器：${containerLabel}`);
    }
    if (categoryFilter !== 'all') {
        activeFilterTags.push(`分类：${categoryFilter}`);
    }
    if (query.trim() !== '') {
        activeFilterTags.push(`关键词：${query.trim()}`);
    }
    if (onlyFavorites) {
        activeFilterTags.push('仅收藏');
    }

    const filteredPresets = useMemo(
        () => buildFilteredList(systemTemplates),
        [
            systemTemplates,
            creativeFilter,
            containerFilter,
            categoryFilter,
            query,
            onlyFavorites,
            favoriteList,
            pinnedList,
            availableCategories,
        ]
    );

    const filteredUsers = useMemo(
        () => buildFilteredList(userTemplates),
        [
            userTemplates,
            creativeFilter,
            containerFilter,
            categoryFilter,
            query,
            onlyFavorites,
            favoriteList,
            pinnedList,
            availableCategories,
        ]
    );

    const handleFilterChange = (group, value) => {
        if (group === 'creative') {
            setCreativeFilter(value);
        } else if (group === 'container') {
            setContainerFilter(value);
        } else if (group === 'category') {
            setCategoryFilter(value);
        }
    };

    const clearSelection = () => {
        selectedIds.forEach((id) => onToggleSelect?.(id));
    };

    const renderLibrary = (list, context) => (
        <>
            <TemplateLibrary
                templates={list}
                query={query}
                onQueryChange={setQuery}
                creativeOptions={[
                    { label: '全部', value: 'all' },
                    { label: '代码/HTML', value: 'html' },
                    { label: '图片', value: 'image' },
                    { label: '视频', value: 'video' },
                    { label: '可视化', value: 'block' },
                ]}
                containerOptions={[
                    { label: '全部', value: 'all' },
                    { label: '默认嵌入', value: 'inline' },
                    { label: '弹窗', value: 'popup' },
                    { label: '横栏', value: 'banner' },
                    { label: '悬浮', value: 'floating' },
                    { label: '插屏', value: 'interstitial' },
                ]}
                categoryOptions={[
                    { label: '全部', value: 'all' },
                    ...categoryNames.map((item) => ({
                        label: item,
                        value: item,
                    })),
                    ...(hasUncategorized
                        ? [{ label: '未分类', value: '未分类' }]
                        : []),
                ]}
                creativeFilter={creativeFilter}
                containerFilter={containerFilter}
                categoryFilter={categoryFilter}
                onFilterChange={handleFilterChange}
                onlyFavorites={onlyFavorites}
                onToggleFavoritesOnly={setOnlyFavorites}
                selectionMode={selectionMode}
                onToggleSelectionMode={() =>
                    setSelectionMode((prev) => !prev)
                }
                selectedIds={selectedIds}
                onApply={onApply}
                onToggleSelect={onToggleSelect}
                onImport={onImport}
                onOpenCategoryDrawer={() => {}}
                onExportSelected={onExport}
                onClearSelection={clearSelection}
                favoriteIds={favoriteList}
                pinnedIds={pinnedList}
                onToggleFavorite={onToggleFavorite}
                onTogglePinned={onTogglePinned}
                categories={availableCategories}
                onUpdateCategories={onUpdateCategories}
                title={context?.title || '模板'}
                description={context?.description || ''}
                totalCount={context?.totalCount || 0}
                filteredCount={list.length}
                hasActiveFilters={hasActiveFilters}
                activeFilterTags={activeFilterTags}
                onResetFilters={resetFilters}
            />
            {list.length === 0 && (
                <div className="magick-ad-template-empty-state">
                    <Notice status="info" isDismissible={false}>
                        {hasActiveFilters
                            ? '当前筛选条件下暂无匹配模板。'
                            : context?.emptyText || '暂无模板。'}
                    </Notice>
                </div>
            )}
        </>
    );

    return (
        <Modal
            title="模板库"
            onRequestClose={onClose}
            size="large"
            className="magick-ad-modal magick-ad-template-modal"
        >
            <div className="magick-ad-template-shell">
                <div className="magick-ad-template-modal-overview">
                    <div className="magick-ad-template-overview-item">
                        <strong>{safeTemplates.length}</strong>
                        <span>模板总数</span>
                    </div>
                    <div className="magick-ad-template-overview-item">
                        <strong>{favoriteList.length}</strong>
                        <span>收藏模板</span>
                    </div>
                    <div className="magick-ad-template-overview-item">
                        <strong>{pinnedList.length}</strong>
                        <span>置顶模板</span>
                    </div>
                    {selectedIds.length > 0 && (
                        <div className="magick-ad-template-overview-item is-highlight">
                            <strong>{selectedIds.length}</strong>
                            <span>已选择</span>
                        </div>
                    )}
                </div>
                <TabPanel
                    className="magick-ad-template-tabs"
                    tabs={[
                        {
                            name: 'preset',
                            title: `系统预设 (${systemTemplates.length})`,
                        },
                        {
                            name: 'user',
                            title: `我的模板 (${userTemplates.length})`,
                        },
                    ]}
                >
                    {(tab) =>
                        tab.name === 'preset'
                            ? renderLibrary(filteredPresets, {
                                  title: '系统预设模板',
                                  description:
                                      '内置场景模板，适合快速应用并微调。',
                                  totalCount: systemTemplates.length,
                                  emptyText: '暂无系统预设模板。',
                              })
                            : renderLibrary(filteredUsers, {
                                  title: '我的模板',
                                  description:
                                      '你保存或导入的模板，支持收藏、置顶与批量导出。',
                                  totalCount: userTemplates.length,
                                  emptyText: '还没有我的模板，可先从当前广告存为模板。',
                              })
                    }
                </TabPanel>
            </div>
        </Modal>
    );
};

export default TemplateLibraryModal;
