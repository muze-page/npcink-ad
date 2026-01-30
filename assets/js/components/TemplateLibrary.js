import { useMemo, useState } from '@wordpress/element';
import { Button, FormTokenField } from '@wordpress/components';
import { Icon, search } from '@wordpress/icons';
import styled from '@emotion/styled';
import TemplateCard from './TemplateCard';

const Toolbar = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
`;

const ActionRow = styled.div`
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
`;

const FilterBar = styled.div`
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 6px;
`;

const FilterGroup = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
`;

const FilterLabel = styled.span`
    font-size: 12px;
    color: #6b7280;
`;

const Chip = styled.button`
    border: 1px solid ${props => (props.$active ? '#2563eb' : '#e5e7eb')};
    background: ${props => (props.$active ? '#eff6ff' : '#ffffff')};
    color: ${props => (props.$active ? '#1d4ed8' : '#374151')};
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 12px;
    cursor: pointer;
`;

const SearchWrap = styled.div`
    position: relative;
    flex: 1;
    min-width: 220px;
`;

const SearchIcon = styled.span`
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
`;

const SearchInput = styled.input`
    width: 100%;
    height: 36px;
    padding: 0 12px 0 34px;
    border-radius: 10px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
`;

const Gallery = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 18px;
`;

const FloatingBar = styled.div`
    position: sticky;
    bottom: 0;
    margin-top: 16px;
    background: #0f172a;
    color: #fff;
    padding: 12px 16px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 16px 32px rgba(15, 23, 42, 0.3);
`;

const DrawerOverlay = styled.div`
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.35);
    z-index: 5;
`;

const Drawer = styled.aside`
    position: absolute;
    top: 0;
    right: 0;
    width: min(360px, 92vw);
    height: 100%;
    background: #ffffff;
    border-left: 1px solid #e5e7eb;
    box-shadow: -12px 0 24px rgba(15, 23, 42, 0.12);
    padding: 16px;
    transform: translateX(${props => (props.$open ? '0' : '110%')});
    transition: transform 0.25s ease;
    z-index: 6;
    overflow: auto;
`;

const DrawerHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
`;

const CategoryList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const CategoryChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: #f3f4f6;
    font-size: 12px;
`;

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
        <div style={{ position: 'relative' }}>
            <Toolbar>
                <ActionRow>
                    <Button variant="secondary" onClick={onImport}>
                        导入
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setDrawerOpen(true);
                            onOpenCategoryDrawer?.();
                        }}
                    >
                        分类设置
                    </Button>
                    <Button
                        variant={selectionMode ? 'primary' : 'secondary'}
                        onClick={onToggleSelectionMode}
                    >
                        {selectionMode ? '退出选择' : '选择模式'}
                    </Button>
                    <SearchWrap>
                        <SearchIcon>
                            <Icon icon={search} size={16} />
                        </SearchIcon>
                        <SearchInput
                            value={query}
                            onChange={(event) =>
                                onQueryChange?.(event.target.value)
                            }
                            placeholder="搜索模板名称或描述"
                        />
                    </SearchWrap>
                </ActionRow>
                <FilterBar>
                    <FilterGroup>
                        <FilterLabel>创意类型</FilterLabel>
                        {creativeOptions.map((option) => (
                            <Chip
                                key={option.value}
                                $active={creativeFilter === option.value}
                                onClick={() =>
                                    onFilterChange?.('creative', option.value)
                                }
                            >
                                {option.label}
                            </Chip>
                        ))}
                    </FilterGroup>
                    <FilterGroup>
                        <FilterLabel>容器</FilterLabel>
                        {containerOptions.map((option) => (
                            <Chip
                                key={option.value}
                                $active={containerFilter === option.value}
                                onClick={() =>
                                    onFilterChange?.('container', option.value)
                                }
                            >
                                {option.label}
                            </Chip>
                        ))}
                    </FilterGroup>
                    <FilterGroup>
                        <FilterLabel>分类</FilterLabel>
                        {categoryOptions.map((option) => (
                            <Chip
                                key={option.value}
                                $active={categoryFilter === option.value}
                                onClick={() =>
                                    onFilterChange?.('category', option.value)
                                }
                            >
                                {option.label}
                            </Chip>
                        ))}
                    </FilterGroup>
                    <FilterGroup>
                        <FilterLabel>收藏</FilterLabel>
                        <Chip
                            $active={onlyFavorites}
                            onClick={() => onToggleFavoritesOnly?.(!onlyFavorites)}
                        >
                            仅收藏
                        </Chip>
                    </FilterGroup>
                </FilterBar>
            </Toolbar>

            <Gallery>
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
            </Gallery>

            {selectedIds.length > 0 && (
                <FloatingBar>
                    <span>已选择 {selectedIds.length} 个模板</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="secondary" onClick={onClearSelection}>
                            取消选择
                        </Button>
                        <Button variant="primary" onClick={onExportSelected}>
                            导出选中
                        </Button>
                    </div>
                </FloatingBar>
            )}

            {drawerOpen && (
                <DrawerOverlay onClick={() => setDrawerOpen(false)} />
            )}
            <Drawer $open={drawerOpen}>
                <DrawerHeader>
                    <strong>分类管理</strong>
                    <Button variant="tertiary" onClick={() => setDrawerOpen(false)}>
                        关闭
                    </Button>
                </DrawerHeader>
                <FormTokenField
                    label="分类标签"
                    value={categoryTokens}
                    onChange={updateCategoryTokens}
                    help="输入回车添加分类"
                />
                <CategoryList style={{ marginTop: 12 }}>
                    {(categories || []).map((category) => (
                        <CategoryChip key={category.name}>
                            <span
                                style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 999,
                                    background: category.color || '#E7E9EE',
                                }}
                            />
                            {category.name}
                        </CategoryChip>
                    ))}
                </CategoryList>
            </Drawer>
        </div>
    );
};

export default TemplateLibrary;
