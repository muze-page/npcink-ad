import { Modal, Notice, TabPanel } from '@wordpress/components';
import { useEffect, useMemo, useState } from '@wordpress/element';
import TemplateLibrary from './TemplateLibrary';

const DEVICE_LABELS = {
    all: '全端',
    mobile: '移动优先',
    tablet: '平板优先',
    desktop: '桌面优先',
};

const RISK_LABELS = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
};

const INDUSTRY_LABELS = {
    general: '通用站点',
    corporate: '企业站',
    content: '内容站',
    ecommerce: '电商站',
};

const TemplateLibraryModal = ({
    isOpen,
    type,
    showVisualTemplateType = true,
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

    const runtimeLevel = window?.MagickAD?.settingsLevel || 'simple';
    const allowVisualTemplateType =
        showVisualTemplateType && runtimeLevel !== 'simple';

    const creativeOptions = useMemo(
        () => [
            { label: '全部', value: 'all' },
            { label: '代码/HTML', value: 'html' },
            { label: '图片', value: 'image' },
            { label: '视频', value: 'video' },
            ...(allowVisualTemplateType
                ? [{ label: '可视化', value: 'block' }]
                : []),
        ],
        [allowVisualTemplateType]
    );
    const allowedCreativeValues = useMemo(
        () => new Set(creativeOptions.map((item) => item.value)),
        [creativeOptions]
    );
    const resolveCreativeFilter = (value) =>
        allowedCreativeValues.has(value || 'all') ? value || 'all' : 'all';
    const initialCreativeFilter = resolveCreativeFilter(type || 'all');

    const [containerFilter, setContainerFilter] = useState('all');
    const [creativeFilter, setCreativeFilter] = useState(initialCreativeFilter);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [scenarioFilter, setScenarioFilter] = useState('all');
    const [industryFilter, setIndustryFilter] = useState('all');
    const [deviceFilter, setDeviceFilter] = useState('all');
    const [riskFilter, setRiskFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);

    useEffect(() => {
        setCreativeFilter(resolveCreativeFilter(type || 'all'));
    }, [type, allowedCreativeValues]);

    const safeTemplates = Array.isArray(templates) ? templates : [];
    const visibleTemplates = allowVisualTemplateType
        ? safeTemplates
        : safeTemplates.filter((item) => item.type !== 'block');
    const systemTemplates = visibleTemplates.filter((item) => item.source === 'core');
    const userTemplates = visibleTemplates.filter((item) => item.source === 'user');

    const derivedCategories = Array.from(
        new Set(
            visibleTemplates
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
    const hasUncategorized = visibleTemplates.some(
        (item) => !item.category || !item.category.trim()
    );
    const hasUnmarkedScenario = visibleTemplates.some(
        (item) => !item.scenario || !item.scenario.trim()
    );
    const hasUnmarkedIndustry = visibleTemplates.some(
        (item) => !item.industry || !item.industry.trim()
    );
    const scenarioOptions = [
        { label: '全部', value: 'all' },
        ...Array.from(
            new Set(
                visibleTemplates
                    .map((item) => item.scenario)
                    .filter((item) => item && item.trim())
            )
        ).map((scenario) => ({
            label: scenario,
            value: scenario,
        })),
        ...(hasUnmarkedScenario
            ? [{ label: '未标注', value: '未标注' }]
            : []),
    ];
    const deviceOptions = [
        { label: '全部', value: 'all' },
        { label: DEVICE_LABELS.mobile, value: 'mobile' },
        { label: DEVICE_LABELS.tablet, value: 'tablet' },
        { label: DEVICE_LABELS.desktop, value: 'desktop' },
    ];
    const industryOptions = [
        { label: '全部', value: 'all' },
        { label: INDUSTRY_LABELS.general, value: 'general' },
        { label: INDUSTRY_LABELS.corporate, value: 'corporate' },
        { label: INDUSTRY_LABELS.content, value: 'content' },
        { label: INDUSTRY_LABELS.ecommerce, value: 'ecommerce' },
        ...(hasUnmarkedIndustry
            ? [{ label: '未标注', value: '未标注' }]
            : []),
    ];
    const riskOptions = [
        { label: '全部', value: 'all' },
        { label: RISK_LABELS.low, value: 'low' },
        { label: RISK_LABELS.medium, value: 'medium' },
        { label: RISK_LABELS.high, value: 'high' },
    ];

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

    const filterByScenario = (list) => {
        if (scenarioFilter === 'all') {
            return list;
        }
        if (scenarioFilter === '未标注') {
            return list.filter((item) => !item.scenario || !item.scenario.trim());
        }
        return list.filter((item) => (item.scenario || '') === scenarioFilter);
    };

    const filterByIndustry = (list) => {
        if (industryFilter === 'all') {
            return list;
        }
        if (industryFilter === '未标注') {
            return list.filter((item) => !item.industry || !item.industry.trim());
        }
        return list.filter(
            (item) => (item.industry || 'general') === industryFilter
        );
    };

    const filterByDevice = (list) => {
        if (deviceFilter === 'all') {
            return list;
        }
        return list.filter((item) => (item.device || 'all') === deviceFilter);
    };

    const filterByRisk = (list) => {
        if (riskFilter === 'all') {
            return list;
        }
        return list.filter((item) => (item.risk || 'low') === riskFilter);
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
                    filterByRisk(
                        filterByDevice(
                            filterByIndustry(
                                filterByScenario(
                                    filterByQuery(
                                        filterByCategory(
                                            filterByContainer(
                                                filterByCreative(list)
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )
        );

    const hasActiveFilters =
        creativeFilter !== initialCreativeFilter ||
        containerFilter !== 'all' ||
        categoryFilter !== 'all' ||
        scenarioFilter !== 'all' ||
        industryFilter !== 'all' ||
        deviceFilter !== 'all' ||
        riskFilter !== 'all' ||
        query.trim() !== '' ||
        onlyFavorites;

    const resetFilters = () => {
        setCreativeFilter(initialCreativeFilter);
        setContainerFilter('all');
        setCategoryFilter('all');
        setScenarioFilter('all');
        setIndustryFilter('all');
        setDeviceFilter('all');
        setRiskFilter('all');
        setQuery('');
        setOnlyFavorites(false);
    };

    const activeFilterTags = [];
    if (creativeFilter !== initialCreativeFilter) {
        const creativeLabel =
            creativeOptions.find((item) => item.value === creativeFilter)?.label ||
            creativeFilter;
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
    if (scenarioFilter !== 'all') {
        activeFilterTags.push(`场景：${scenarioFilter}`);
    }
    if (industryFilter !== 'all') {
        activeFilterTags.push(
            `行业：${INDUSTRY_LABELS[industryFilter] || industryFilter}`
        );
    }
    if (deviceFilter !== 'all') {
        activeFilterTags.push(`设备：${DEVICE_LABELS[deviceFilter] || deviceFilter}`);
    }
    if (riskFilter !== 'all') {
        activeFilterTags.push(`风险：${RISK_LABELS[riskFilter] || riskFilter}`);
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
            scenarioFilter,
            industryFilter,
            deviceFilter,
            riskFilter,
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
            scenarioFilter,
            industryFilter,
            deviceFilter,
            riskFilter,
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
        } else if (group === 'scenario') {
            setScenarioFilter(value);
        } else if (group === 'industry') {
            setIndustryFilter(value);
        } else if (group === 'device') {
            setDeviceFilter(value);
        } else if (group === 'risk') {
            setRiskFilter(value);
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
                creativeOptions={creativeOptions}
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
                scenarioOptions={scenarioOptions}
                industryOptions={industryOptions}
                deviceOptions={deviceOptions}
                riskOptions={riskOptions}
                creativeFilter={creativeFilter}
                containerFilter={containerFilter}
                categoryFilter={categoryFilter}
                scenarioFilter={scenarioFilter}
                industryFilter={industryFilter}
                deviceFilter={deviceFilter}
                riskFilter={riskFilter}
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
                        <strong>{visibleTemplates.length}</strong>
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
