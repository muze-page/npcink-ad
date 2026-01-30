import {
    Button,
    CheckboxControl,
    DropdownMenu,
    MenuGroup,
    MenuItem,
    ToggleControl,
    Modal,
    Notice,
    SelectControl,
    TabPanel,
    TextControl,
    Tooltip,
} from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { Icon, moreVertical, pinSmall, starFilled } from '@wordpress/icons';

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
    const [newCategory, setNewCategory] = useState('');
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [dragIndex, setDragIndex] = useState(null);
    const [dropIndex, setDropIndex] = useState(null);
    const [insertSide, setInsertSide] = useState('left');
    const [confirmAction, setConfirmAction] = useState(null);
    const [undoSnapshot, setUndoSnapshot] = useState(null);
    const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);

    useEffect(() => {
        if (type) {
            setCreativeFilter(type);
        }
    }, [type]);

    const systemTemplates = templates.filter((item) => item.source === 'core');
    const userTemplates = templates.filter((item) => item.source === 'user');
    const derivedCategories = Array.from(
        new Set(
            templates
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
    const hasUncategorized = templates.some(
        (item) => !item.category || !item.category.trim()
    );

    const filterByContainer = (list) => {
        if (containerFilter === 'all') {
            return list;
        }
        return list.filter(
            (item) => (item.containerType || 'inline') === containerFilter
        );
    };

    const filterByCreative = (list) => {
        if (creativeFilter === 'all') {
            return list;
        }
        return list.filter((item) => item.type === creativeFilter);
    };

    const filterByCategory = (list) => {
        if (categoryFilter === 'all') {
            return list;
        }
        return list.filter(
            (item) => (item.category || '未分类') === categoryFilter
        );
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
        return list.filter((item) => favoriteIds?.includes(item.id));
    };

    const sortByPinned = (list) => {
        return [...list].sort((a, b) => {
            const pinA = pinnedIds?.includes(a.id) ? 1 : 0;
            const pinB = pinnedIds?.includes(b.id) ? 1 : 0;
            if (pinA !== pinB) {
                return pinB - pinA;
            }
            const favA = favoriteIds?.includes(a.id) ? 1 : 0;
            const favB = favoriteIds?.includes(b.id) ? 1 : 0;
            if (favA !== favB) {
                return favB - favA;
            }
            return (a.name || '').localeCompare(b.name || '');
        });
    };

    const requestBulkAction = (type, ids) => {
        if (!ids || ids.length === 0) {
            return;
        }
        setConfirmAction({ type, ids });
    };

    const executeBulkAction = (type, ids) => {
        const prev = {
            favorites: [...(favoriteIds || [])],
            pins: [...(pinnedIds || [])],
        };
        setUndoSnapshot(prev);

        if (type === 'favorite') {
            onBulkFavorite?.(ids, true);
        } else if (type === 'unfavorite') {
            onBulkFavorite?.(ids, false);
        } else if (type === 'pin') {
            onBulkPinned?.(ids, true);
        } else if (type === 'unpin') {
            onBulkPinned?.(ids, false);
        } else if (type === 'clearFavorites') {
            onClearFavorites?.();
        } else if (type === 'clearPins') {
            onClearPins?.();
        }

        window.setTimeout(() => {
            setUndoSnapshot(null);
        }, 6000);
    };

    const handleUndo = () => {
        if (!undoSnapshot) {
            return;
        }
        onRestorePreferences?.(
            undoSnapshot.favorites,
            undoSnapshot.pins
        );
        setUndoSnapshot(null);
    };

    return (
        <>
        <Modal title="模板库" onRequestClose={onClose} size="large">
            <div className="magick-ad-template-shell">
            <div className="magick-ad-template-toolbar">
                <div className="magick-ad-template-toolbar__actions">
                    <Button variant="secondary" onClick={onImport}>
                        导入模板
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={onExport}
                        disabled={selected.length === 0}
                    >
                        导出选中
                    </Button>
                    <DropdownMenu
                        icon={moreVertical}
                        label="批量操作"
                        toggleProps={{ variant: 'secondary' }}
                    >
                        {() => (
                            <MenuGroup>
                                <MenuItem
                                    disabled={selected.length === 0}
                                    onClick={() =>
                                        requestBulkAction('favorite', selected)
                                    }
                                >
                                    批量收藏
                                </MenuItem>
                                <MenuItem
                                    disabled={selected.length === 0}
                                    onClick={() =>
                                        requestBulkAction('unfavorite', selected)
                                    }
                                >
                                    取消收藏
                                </MenuItem>
                                <MenuItem
                                    disabled={selected.length === 0}
                                    onClick={() =>
                                        requestBulkAction('pin', selected)
                                    }
                                >
                                    批量置顶
                                </MenuItem>
                                <MenuItem
                                    disabled={selected.length === 0}
                                    onClick={() =>
                                        requestBulkAction('unpin', selected)
                                    }
                                >
                                    取消置顶
                                </MenuItem>
                                <MenuItem
                                    disabled={!favoriteIds?.length}
                                    onClick={() =>
                                        requestBulkAction('clearFavorites', ['_all'])
                                    }
                                >
                                    清空收藏
                                </MenuItem>
                                <MenuItem
                                    disabled={!pinnedIds?.length}
                                    onClick={() =>
                                        requestBulkAction('clearPins', ['_all'])
                                    }
                                >
                                    清空置顶
                                </MenuItem>
                            </MenuGroup>
                        )}
                    </DropdownMenu>
                    <Button
                        variant="secondary"
                        onClick={() => setCategoryDrawerOpen(true)}
                    >
                        分类管理
                    </Button>
                </div>
                <div className="magick-ad-template-toolbar__filters">
                    <TextControl
                        label="搜索"
                        value={query}
                        onChange={setQuery}
                        placeholder="搜索模板名称或描述"
                    />
                    <SelectControl
                        label="创意类型"
                        value={creativeFilter}
                        options={[
                            { label: '全部', value: 'all' },
                            { label: '代码/HTML', value: 'html' },
                            { label: '图片', value: 'image' },
                            { label: '视频', value: 'video' },
                            { label: '可视化', value: 'block' },
                        ]}
                        onChange={setCreativeFilter}
                    />
                    <SelectControl
                        label="容器"
                        value={containerFilter}
                        options={[
                            { label: '全部', value: 'all' },
                            { label: '默认嵌入', value: 'inline' },
                            { label: '弹窗', value: 'popup' },
                            { label: '横栏', value: 'banner' },
                            { label: '悬浮', value: 'floating' },
                            { label: '插屏', value: 'interstitial' },
                        ]}
                        onChange={setContainerFilter}
                    />
                    <SelectControl
                        label="分类"
                        value={categoryFilter}
                        options={[
                            { label: '全部', value: 'all' },
                            ...categoryNames.map((item) => ({
                                label: item,
                                value: item,
                            })),
                            ...(hasUncategorized
                                ? [{ label: '未分类', value: '未分类' }]
                                : []),
                        ]}
                        onChange={setCategoryFilter}
                    />
                    <ToggleControl
                        label="仅收藏"
                        checked={onlyFavorites}
                        onChange={setOnlyFavorites}
                    />
                </div>
            </div>

            {undoSnapshot && (
                <Notice
                    status="success"
                    isDismissible
                    onRemove={() => setUndoSnapshot(null)}
                >
                    操作已完成。
                    <Button
                        variant="link"
                        className="magick-ad-template-undo"
                        onClick={handleUndo}
                    >
                        撤销
                    </Button>
                </Notice>
            )}

            <TabPanel
                className="magick-ad-template-tabs"
                tabs={[
                    { name: 'preset', title: '系统预设' },
                    { name: 'user', title: '我的模板' },
                ]}
            >
                {(tab) => {
                    const list =
                        tab.name === 'preset'
                            ? systemTemplates
                            : userTemplates;
                    const filteredList = sortByPinned(
                        filterByFavorites(
                            filterByQuery(
                                filterByCategory(
                                    filterByContainer(filterByCreative(list))
                                )
                            )
                        )
                    );
                    if (filteredList.length === 0) {
    return (
                            <Notice status="info" isDismissible={false}>
                                暂无模板。
                            </Notice>
                        );
                    }
                    return (
                        <div className="magick-ad-template-grid">
                            {filteredList.map((template) => (
                                <div
                                    key={template.id}
                                    className="magick-ad-template-card"
                                >
                                    <div className="magick-ad-template-card__body">
                                        <h4>{template.name || template.title}</h4>
                                        <p>{template.description || ''}</p>
                                        <div className="magick-ad-template-card__meta">
                                            <span
                                                className={`magick-ad-template-badge is-type-${
                                                    template.type || 'html'
                                                }`}
                                            >
                                                {template.type === 'html'
                                                    ? '代码/HTML'
                                                    : template.type === 'image'
                                                      ? '图片'
                                                      : template.type ===
                                                          'video'
                                                        ? '视频'
                                                        : '可视化'}
                                            </span>
                                            {template.category && (
                                                <span
                                                    className="magick-ad-template-badge is-category"
                                                    style={{
                                                        '--badge-color':
                                                            categoryColors[
                                                                template.category
                                                            ] || '#F3F4F6',
                                                    }}
                                                >
                                                    {template.category}
                                                </span>
                                            )}
                                            <span className="magick-ad-template-badge is-soft">
                                                {(template.containerType || 'inline') ===
                                                'popup'
                                                    ? '弹窗'
                                                    : (template.containerType ||
                                                          'inline') === 'banner'
                                                      ? '横栏'
                                                      : (template.containerType ||
                                                            'inline') ===
                                                        'floating'
                                                        ? '悬浮'
                                                        : (template.containerType ||
                                                              'inline') ===
                                                          'interstitial'
                                                            ? '插屏'
                                                            : '默认嵌入'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="magick-ad-template-card__actions">
                                        <Button
                                            variant="primary"
                                            onClick={() => onApply(template)}
                                        >
                                            应用
                                        </Button>
                                        <Button
                                            variant="tertiary"
                                            className={
                                                favoriteIds?.includes(
                                                    template.id
                                                )
                                                    ? 'is-favorite'
                                                    : ''
                                            }
                                            onClick={() =>
                                                onToggleFavorite?.(template.id)
                                            }
                                        >
                                            收藏
                                        </Button>
                                        <Button
                                            variant="tertiary"
                                            className={
                                                pinnedIds?.includes(
                                                    template.id
                                                )
                                                    ? 'is-pinned'
                                                    : ''
                                            }
                                            onClick={() =>
                                                onTogglePinned?.(template.id)
                                            }
                                        >
                                            置顶
                                        </Button>
                                    </div>
                                    <div className="magick-ad-template-card__corner">
                                        {pinnedIds?.includes(template.id) && (
                                            <Tooltip text="已置顶">
                                                <span className="magick-ad-template-corner is-pinned">
                                                    <Icon icon={pinSmall} />
                                                </span>
                                            </Tooltip>
                                        )}
                                        {favoriteIds?.includes(template.id) && (
                                            <Tooltip text="已收藏">
                                                <span className="magick-ad-template-corner is-favorite">
                                                    <Icon icon={starFilled} />
                                                </span>
                                            </Tooltip>
                                        )}
                                    </div>
                                    <CheckboxControl
                                        className="magick-ad-template-card__check"
                                        label="导出"
                                        checked={selected.includes(template.id)}
                                        onChange={() =>
                                            onToggleSelect(template.id)
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    );
                }}
            </TabPanel>
            {categoryDrawerOpen && (
                <div
                    className="magick-ad-template-drawer__overlay"
                    onClick={() => setCategoryDrawerOpen(false)}
                />
            )}
            <aside
                className={`magick-ad-template-drawer ${
                    categoryDrawerOpen ? 'is-open' : ''
                }`}
            >
                <div className="magick-ad-template-drawer__header">
                    <strong>分类管理</strong>
                    <Button
                        variant="tertiary"
                        onClick={() => setCategoryDrawerOpen(false)}
                    >
                        关闭
                    </Button>
                </div>
                <div className="magick-ad-template-category-manager">
                    <div className="magick-ad-template-category-list">
                        {(availableCategories || []).map((item, index) => (
                            <span
                                key={item.name}
                                className={`magick-ad-template-chip ${
                                    dragIndex === index ? 'is-dragging' : ''
                                } ${dropIndex === index ? 'is-drop' : ''} ${
                                    dropIndex === index && dragIndex !== null
                                        ? 'is-over'
                                        : ''
                                } ${
                                    dropIndex === index && dragIndex !== null
                                        ? `is-insert-${insertSide}`
                                        : ''
                                }`}
                                draggable
                                onDragStart={(event) => {
                                    event.dataTransfer.setData(
                                        'text/plain',
                                        String(index)
                                    );
                                    setDragIndex(index);
                                }}
                                onDragEnd={() => {
                                    setDragIndex(null);
                                    setDropIndex(null);
                                    setInsertSide('left');
                                }}
                                onDragEnter={() => setDropIndex(index)}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    const rect =
                                        event.currentTarget.getBoundingClientRect();
                                    const mid = rect.left + rect.width / 2;
                                    const side =
                                        event.clientX >= mid ? 'right' : 'left';
                                    setDropIndex(index);
                                    setInsertSide(side);
                                }}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    const from = Number(
                                        event.dataTransfer.getData('text/plain')
                                    );
                                    if (Number.isNaN(from) || from === index) {
                                        return;
                                    }
                                    const next = [...availableCategories];
                                    const moved = next.splice(from, 1)[0];
                                    let target =
                                        insertSide === 'right' ? index + 1 : index;
                                    if (from < target) {
                                        target -= 1;
                                    }
                                    next.splice(target, 0, moved);
                                    onUpdateCategories?.(next);
                                    setDropIndex(index);
                                    window.setTimeout(() => {
                                        setDropIndex(null);
                                    }, 250);
                                }}
                            >
                                <span className="magick-ad-template-chip__handle">
                                    ⋮⋮
                                </span>
                                <span
                                    className="magick-ad-template-chip__dot"
                                    style={{
                                        background: item.color || '#E7E9EE',
                                    }}
                                />
                                {item.name}
                                <input
                                    type="color"
                                    className="magick-ad-template-chip__color"
                                    value={item.color || '#E7E9EE'}
                                    onChange={(event) => {
                                        const next = availableCategories.map(
                                            (cat) =>
                                                cat.name === item.name
                                                    ? {
                                                          ...cat,
                                                          color: event.target.value,
                                                      }
                                                    : cat
                                        );
                                        onUpdateCategories?.(next);
                                    }}
                                    aria-label={`设置分类 ${item.name} 的颜色`}
                                />
                                <button
                                    type="button"
                                    className="magick-ad-template-chip__remove"
                                    onClick={() => onRemoveCategory?.(item.name)}
                                    aria-label={`移除分类 ${item.name}`}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="magick-ad-template-category-hint">
                        拖拽分类可排序，颜色用于模板标签。
                    </div>
                    <div className="magick-ad-template-category-add">
                        <TextControl
                            label="新增分类"
                            value={newCategory}
                            onChange={setNewCategory}
                            placeholder="输入分类名称"
                        />
                        <Button
                            variant="secondary"
                            onClick={() => {
                                if (!newCategory.trim()) {
                                    return;
                                }
                                onAddCategory?.(newCategory);
                                setNewCategory('');
                            }}
                        >
                            添加
                        </Button>
                    </div>
                </div>
            </aside>
            </div>
        </Modal>
        {confirmAction && (
            <Modal
                title="确认操作"
                onRequestClose={() => setConfirmAction(null)}
                className="magick-ad-confirm-modal"
            >
                <p>
                    确认对 {confirmAction.ids.length} 个模板执行该操作吗？
                </p>
                <div className="magick-ad-confirm-actions">
                    <Button
                        variant="secondary"
                        onClick={() => setConfirmAction(null)}
                    >
                        取消
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            executeBulkAction(
                                confirmAction.type,
                                confirmAction.ids
                            );
                            setConfirmAction(null);
                        }}
                    >
                        确认
                    </Button>
                </div>
            </Modal>
        )}
        </>
    );
};

export default TemplateLibraryModal;
