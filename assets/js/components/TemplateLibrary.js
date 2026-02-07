import { useMemo, useState } from '@wordpress/element';
import {
    Button,
    FormTokenField,
    SelectControl,
    ToggleControl,
} from '@wordpress/components';
import { Icon, search } from '@wordpress/icons';
import TemplateCard from './TemplateCard';

const TemplateLibrary = ({
    templates,
    query,
    onQueryChange,
    creativeOptions,
    containerOptions,
    categoryOptions,
    creativeFilter,
    containerFilter,
    categoryFilter,
    onFilterChange,
    onlyFavorites,
    onToggleFavoritesOnly,
    selectionMode,
    onToggleSelectionMode,
    selectedIds,
    onApply,
    onToggleSelect,
    onImport,
    onOpenCategoryDrawer,
    onExportSelected,
    onClearSelection,
    favoriteIds,
    pinnedIds,
    onToggleFavorite,
    onTogglePinned,
    categories,
    onUpdateCategories,
    title,
    description,
    totalCount,
    filteredCount,
    hasActiveFilters,
    activeFilterTags,
    onResetFilters,
}) => {
    const [drawerOpen, setDrawerOpen] = useState(false);

    const categoryTokens = useMemo(
        () => (categories || []).map((item) => item.name),
        [categories]
    );

    const updateCategoryTokens = (tokens) => {
        const normalized = Array.from(
            new Set(tokens.map((item) => item.trim()).filter(Boolean))
        );
        const next = normalized.map((name) => {
            const existing = (categories || []).find(
                (item) => item.name === name
            );
            return existing || { name, color: '#E7E9EE' };
        });
        onUpdateCategories?.(next);
    };

    return (
        <div
            className={`magick-ad-template-library ${
                drawerOpen ? 'is-drawer-open' : ''
            }`}
        >
            <div className="magick-ad-template-headline">
                <div className="magick-ad-template-headline__main">
                    <h3>{title || '模板库'}</h3>
                    {description && (
                        <p className="description">{description}</p>
                    )}
                </div>
                <div className="magick-ad-template-headline__meta">
                    <span className="magick-ad-template-counter">
                        已匹配 {filteredCount} / {totalCount || templates.length}
                    </span>
                    {hasActiveFilters && (
                        <Button
                            variant="tertiary"
                            onClick={() => onResetFilters?.()}
                        >
                            重置筛选
                        </Button>
                    )}
                </div>
            </div>

            <div className="magick-ad-template-toolbar-shell">
                <div className="magick-ad-template-actions-row">
                    <div className="magick-ad-template-actions-left">
                        <Button variant="secondary" onClick={onImport}>
                            导入模板
                        </Button>
                        <Button
                            variant="secondary"
                            aria-expanded={drawerOpen}
                            onClick={() => {
                                setDrawerOpen(true);
                                onOpenCategoryDrawer?.();
                            }}
                        >
                            分类设置
                        </Button>
                    </div>
                    <div className="magick-ad-template-actions-right">
                        <Button
                            variant={selectionMode ? 'primary' : 'secondary'}
                            onClick={onToggleSelectionMode}
                        >
                            {selectionMode ? '退出选择' : '选择模式'}
                        </Button>
                    </div>
                </div>

                <div className="magick-ad-template-filter-row">
                    <div className="magick-ad-template-search">
                        <span className="magick-ad-template-search-icon">
                            <Icon icon={search} size={16} />
                        </span>
                        <input
                            type="text"
                            value={query}
                            onChange={(event) =>
                                onQueryChange?.(event.target.value)
                            }
                            placeholder="搜索模板..."
                        />
                    </div>

                    <div className="magick-ad-template-filter-group">
                        <div className="magick-ad-template-segment">
                            {creativeOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`magick-ad-template-segment-btn ${
                                        creativeFilter === option.value
                                            ? 'is-active'
                                            : ''
                                    }`}
                                    onClick={() =>
                                        onFilterChange?.('creative', option.value)
                                    }
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="magick-ad-template-filter-select">
                        <SelectControl
                            label="容器"
                            hideLabelFromVision
                            value={containerFilter}
                            options={containerOptions}
                            onChange={(value) =>
                                onFilterChange?.('container', value)
                            }
                        />
                    </div>

                    <div className="magick-ad-template-filter-select">
                        <SelectControl
                            label="分类"
                            hideLabelFromVision
                            value={categoryFilter}
                            options={categoryOptions}
                            onChange={(value) =>
                                onFilterChange?.('category', value)
                            }
                        />
                    </div>

                    <div className="magick-ad-template-filter-toggle">
                        <ToggleControl
                            label="仅收藏"
                            checked={onlyFavorites}
                            onChange={onToggleFavoritesOnly}
                        />
                    </div>
                </div>

                {Array.isArray(activeFilterTags) &&
                    activeFilterTags.length > 0 && (
                        <div className="magick-ad-template-active-filters">
                            {activeFilterTags.map((tag) => (
                                <span
                                    key={tag}
                                    className="magick-ad-template-active-filter"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
            </div>

            {templates.length > 0 && (
                <div className="magick-ad-template-gallery">
                    {templates.map((template) => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            isSelected={selectedIds.includes(template.id)}
                            selectionMode={selectionMode}
                            onApply={onApply}
                            onToggleSelect={onToggleSelect}
                            onToggleFavorite={onToggleFavorite}
                            onTogglePinned={onTogglePinned}
                            isFavorite={favoriteIds.includes(template.id)}
                            isPinned={pinnedIds.includes(template.id)}
                        />
                    ))}
                </div>
            )}

            {selectedIds.length > 0 && (
                <div className="magick-ad-template-floating">
                    <span>已选择 {selectedIds.length} 个模板</span>
                    <div className="magick-ad-template-floating-actions">
                        <Button variant="secondary" onClick={onClearSelection}>
                            取消选择
                        </Button>
                        <Button variant="primary" onClick={onExportSelected}>
                            导出选中
                        </Button>
                    </div>
                </div>
            )}

            <div
                className={`magick-ad-template-drawer-layer ${
                    drawerOpen ? 'is-open' : ''
                }`}
            >
                <button
                    type="button"
                    aria-label="关闭分类管理"
                    className="magick-ad-template-drawer-overlay"
                    onClick={() => setDrawerOpen(false)}
                />
                <aside
                    className={`magick-ad-template-drawer-new ${
                        drawerOpen ? 'is-open' : ''
                    }`}
                >
                    <div className="magick-ad-template-drawer-header">
                        <strong>分类管理</strong>
                        <Button
                            variant="tertiary"
                            onClick={() => setDrawerOpen(false)}
                        >
                            关闭
                        </Button>
                    </div>
                    <FormTokenField
                        label="分类标签"
                        value={categoryTokens}
                        onChange={updateCategoryTokens}
                        help="输入回车添加分类"
                    />
                    <div className="magick-ad-template-category-preview">
                        {(categories || []).map((category) => (
                            <span
                                key={category.name}
                                className="magick-ad-template-category-pill"
                            >
                                <span
                                    className="magick-ad-template-category-dot"
                                    style={{
                                        background: category.color || '#E7E9EE',
                                    }}
                                />
                                {category.name}
                            </span>
                        ))}
                    </div>
                    <div className="magick-ad-template-drawer-actions">
                        <Button
                            variant="secondary"
                            onClick={() => setDrawerOpen(false)}
                        >
                            完成
                        </Button>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default TemplateLibrary;
