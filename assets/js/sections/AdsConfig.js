import { useEffect, useMemo, useState } from '@wordpress/element';
import {
    Button,
    ButtonGroup,
    Card,
    CardBody,
    ColorPicker,
    DropdownMenu,
    FormTokenField,
    Modal,
    MenuGroup,
    MenuItem,
    Notice,
    Panel,
    PanelBody,
    RangeControl,
    SelectControl,
    Spinner,
    TabPanel,
    TextControl,
    TextareaControl,
    ToggleControl,
} from '@wordpress/components';
import { moreHorizontal } from '@wordpress/icons';
import { useStore } from '../store';
import Layout from '../Layout';
import ImagePicker from '../components/ImagePicker';
import LinkPicker from '../components/LinkPicker';
import ClassicEditor from '../components/ClassicEditor';
import BlockEditor from '../components/BlockEditor';
import TemplateLibraryModal from '../components/TemplateLibraryModal';
import TemplateActions from '../components/TemplateActions';
import BuildProbe from '../components/BuildProbe';
import DebugPanel from '../panels/DebugPanel';
import SystemSettingsPanel from '../panels/SystemSettingsPanel';
import useNotice from '../hooks/useNotice';
import useTemplateLibrary from '../hooks/useTemplateLibrary';
import useTargeting from '../hooks/useTargeting';
import {
    ANIMATION_OPTIONS,
    DISPLAY_PAGE_OPTIONS,
    SHADOW_OPTIONS,
    TARGET_TYPE_OPTIONS,
    getPositionOptions,
} from '../constants/options';

const AdsConfig = () => {
    const ads = useStore((state) => state.ads);
    const isLoading = useStore((state) => state.isLoading);
    const isSaving = useStore((state) => state.isSaving);
    const error = useStore((state) => state.error);
    const addAdGroup = useStore((state) => state.addAdGroup);
    const removeAdGroup = useStore((state) => state.removeAdGroup);
    const updateAdGroup = useStore((state) => state.updateAdGroup);
    const saveToDB = useStore((state) => state.saveToDB);
    const fetchFromDB = useStore((state) => state.fetchFromDB);

    const [selectedId, setSelectedId] = useState(null);
    const [showValidation, setShowValidation] = useState(false);
    const [devicePreview, setDevicePreview] = useState('desktop');
    const { notice, showNotice, clearNotice } = useNotice();
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [renameTarget, setRenameTarget] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
    const [saveTemplateType, setSaveTemplateType] = useState('image');
    const [saveTemplateName, setSaveTemplateName] = useState('');
    const [saveTemplateCategory, setSaveTemplateCategory] = useState('');
    const [saveTemplateCategoryName, setSaveTemplateCategoryName] =
        useState('');
    const branding =
        (typeof window !== 'undefined' && window.MagickAD?.branding) || {
            name: 'Magick AD',
            tagline: '广告配置与投放规则管理',
        };
    const canUnfilteredHtml =
        typeof window !== 'undefined' &&
        window.MagickAD &&
        window.MagickAD.canUnfilteredHtml;

    const pad = (value) => String(value).padStart(2, '0');

    const parseDateTime = (value) => {
        if (!value) {
            return null;
        }
        const normalized = value.includes('T')
            ? value.replace('T', ' ')
            : value;
        const [datePart, timePart = ''] = normalized.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        if (!year || !month || !day) {
            return null;
        }
        const [hour = 0, minute = 0, second = 0] =
            timePart.split(':').map(Number);
        return new Date(year, month - 1, day, hour, minute, second);
    };

    const formatDateTimeLocalInput = (value) => {
        const date = parseDateTime(value);
        if (!date) {
            return '';
        }
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
            date.getDate()
        )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const formatDateTimeStorage = (value) => {
        if (!value) {
            return '';
        }
        if (value.includes('T')) {
            const [datePart, timePart] = value.split('T');
            const [hour = '00', minute = '00'] = timePart.split(':');
            return `${datePart} ${pad(hour)}:${pad(minute)}:00`;
        }
        return value.length === 16 ? `${value}:00` : value;
    };

    const buildDefaultSchedule = () => {
        const date = new Date();
        date.setMinutes(date.getMinutes() + 10);
        date.setSeconds(0);
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
            date.getDate()
        )} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
    };

    const formatDateFromDate = (date) =>
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
            date.getDate()
        )} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;

    const isFutureDate = (value) => {
        const date = parseDateTime(value);
        if (!date) {
            return false;
        }
        return date.getTime() > Date.now();
    };

    const resolveStatus = (ad) => {
        if (!ad) {
            return 'draft';
        }
        const enabled = ad?.options?.enabled !== false;
        if (!enabled) {
            return 'draft';
        }
        return ad.status || 'publish';
    };

    const statusMeta = (ad) => {
        const status = resolveStatus(ad);
        if (status === 'future') {
            return { label: '已排期', className: 'is-scheduled' };
        }
        if (status === 'pending') {
            return { label: '待审核', className: 'is-pending' };
        }
        if (status === 'publish') {
            return { label: '已发布', className: 'is-enabled' };
        }
        return { label: '已停用', className: 'is-disabled' };
    };

    useEffect(() => {
        fetchFromDB();
    }, [fetchFromDB]);

    useEffect(() => {
        if (!selectedId && ads.length > 0) {
            setSelectedId(ads[0].id);
        }
    }, [ads, selectedId]);

    useEffect(() => {
        if (!showValidation) {
            return;
        }
        const allPlaced = ads.every((ad) => {
            const placement = resolvePlacement(ad.options || {});
            if (!placement.hook) {
                return false;
            }
            if (placement.hook === 'content' && !placement.position) {
                return false;
            }
            if (
                placement.hook === 'content' &&
                placement.position === 'paragraph' &&
                placement.paragraph < 1
            ) {
                return false;
            }
            return true;
        });
        if (allPlaced) {
            setShowValidation(false);
        }
    }, [ads, showValidation]);

    const selectedAd = useMemo(
        () => ads.find((ad) => ad.id === selectedId),
        [ads, selectedId]
    );

    const editorModeRaw =
        selectedAd?.options?.editor_mode || 'design';
    const effectiveEditorMode =
        editorModeRaw === 'expert' && !canUnfilteredHtml
            ? 'design'
            : editorModeRaw;

    const { targetItems, targetSuggestions, targetLoading, handleTargetSearch } =
        useTargeting(selectedAd);

    const positionOptions = useMemo(() => {
        const page = selectedAd?.options?.show_page || 'all';
        return [
            { label: '请选择展示位置', value: '' },
            ...getPositionOptions(page),
        ];
    }, [selectedAd?.options?.show_page]);

    const targetPositionOptions = useMemo(() => {
        const targetType = selectedAd?.options?.target_type || '';
        if (!targetType) {
            return [{ label: '请选择展示位置', value: '' }];
        }
        return [
            { label: '请选择展示位置', value: '' },
            ...getPositionOptions(targetType),
        ];
    }, [selectedAd?.options?.target_type]);

    const resolvePlacement = (options) => {
        const placement = {
            hook: options?.placement_hook || '',
            position: options?.placement_position || '',
            paragraph: Number(options?.placement_paragraph || 0),
        };

        if (placement.hook === 'content') {
            if (placement.position !== 'paragraph') {
                placement.paragraph = 0;
            }
        } else {
            placement.position = '';
            placement.paragraph = 0;
        }

        return placement;
    };

    const placementToSlotValue = (placement) => {
        if (!placement?.hook) {
            return '';
        }
        if (placement.hook === 'node') {
            return 'node';
        }
        if (placement.hook === 'head') {
            return 'head';
        }
        if (placement.hook === 'body_top') {
            return 'top';
        }
        if (placement.hook === 'footer') {
            return 'bottom';
        }
        if (placement.hook === 'comments_top') {
            return 'comments_top';
        }
        if (placement.hook === 'comments_bottom') {
            return 'comments_bottom';
        }
        if (placement.hook === 'comment_form_before') {
            return 'comment_form_before';
        }
        if (placement.hook === 'comment_form_after') {
            return 'comment_form_after';
        }
        if (placement.hook === 'content') {
            if (placement.position === 'before') {
                return 'content_before';
            }
            if (placement.position === 'after') {
                return 'content_after';
            }
            if (placement.position === 'paragraph') {
                return 'paragraph_3';
            }
        }
        return '';
    };

    const slotToPlacementUpdates = (value) => {
        const updates = {
            placement_hook: '',
            placement_position: '',
            placement_paragraph: 0,
        };

        switch (value) {
            case 'node':
                updates.placement_hook = 'node';
                break;
            case 'head':
                updates.placement_hook = 'head';
                break;
            case 'top':
                updates.placement_hook = 'body_top';
                break;
            case 'bottom':
            case 'footer':
                updates.placement_hook = 'footer';
                break;
            case 'content_before':
            case 'post_top':
                updates.placement_hook = 'content';
                updates.placement_position = 'before';
                break;
            case 'content_after':
            case 'post_bottom':
                updates.placement_hook = 'content';
                updates.placement_position = 'after';
                break;
            case 'paragraph_3':
                updates.placement_hook = 'content';
                updates.placement_position = 'paragraph';
                updates.placement_paragraph = 3;
                break;
            case 'comments_top':
                updates.placement_hook = 'comments_top';
                break;
            case 'comments_bottom':
                updates.placement_hook = 'comments_bottom';
                break;
            case 'comment_form_before':
                updates.placement_hook = 'comment_form_before';
                break;
            case 'comment_form_after':
                updates.placement_hook = 'comment_form_after';
                break;
            default:
                updates.placement_hook = '';
        }

        return updates;
    };

    const missingPositionIds = useMemo(() => {
        return new Set(
            ads.filter((ad) => {
                const placement = resolvePlacement(ad.options || {});
                if (!placement.hook) {
                    return true;
                }
                if (placement.hook === 'content' && !placement.position) {
                    return true;
                }
                if (
                    placement.hook === 'content' &&
                    placement.position === 'paragraph' &&
                    placement.paragraph < 1
                ) {
                    return true;
                }
                return false;
            }).map((ad) => ad.id)
        );
    }, [ads]);

    const handleUpdateOptions = (updates) => {
        if (!selectedAd) {
            return;
        }
        updateAdGroup(selectedAd.id, {
            options: {
                ...selectedAd.options,
                ...updates,
            },
        });
    };

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin !== window.location.origin) {
                return;
            }
            const data = event.data || {};
            if (data.type !== 'magick-ad-node-picked') {
                return;
            }
            if (!selectedAd) {
                return;
            }
            handleUpdateOptions({
                node_target_type: data.targetType || 'id',
                node_target_value: data.value || '',
            });
            showNotice('success', '已选择节点', 2000);
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [selectedAd, showNotice]);

    const handleUpdateMeta = (updates) => {
        if (!selectedAd) {
            return;
        }
        updateAdGroup(selectedAd.id, updates);
    };

    const handleUpdateContent = (updates) => {
        if (!selectedAd) {
            return;
        }
        updateAdGroup(selectedAd.id, {
            content: {
                ...selectedAd.content,
                ...updates,
            },
        });
    };

    const handleUpdateImageSettings = (updates) => {
        if (!selectedAd) {
            return;
        }
        const currentSettings =
            selectedAd.content?.image_settings || {};
        handleUpdateContent({
            image_settings: {
                ...currentSettings,
                ...updates,
            },
        });
    };

    const handleUpdateContainerStyle = (updates) => {
        if (!selectedAd) {
            return;
        }
        const currentStyle =
            selectedAd.content?.container_style || {};
        handleUpdateContent({
            container_style: {
                ...currentStyle,
                ...updates,
            },
        });
    };

    const handleUpdateBehavior = (updates) => {
        if (!selectedAd) {
            return;
        }
        const currentBehavior = selectedAd.content?.behavior || {};
        handleUpdateContent({
            behavior: {
                ...currentBehavior,
                ...updates,
            },
        });
    };

    const formatColorValue = (color) => {
        if (!color) {
            return 'transparent';
        }
        if (typeof color === 'string') {
            return color;
        }
        if (color.rgb) {
            const { r, g, b, a } = color.rgb;
            if (a === 1) {
                return color.hex;
            }
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        }
        return color.hex || 'transparent';
    };

    const getCreativeTemplateData = (type, ad) => {
        const content = ad?.content || {};
        if (type === 'image') {
            return {
                image: content.image || { id: 0, url: '', alt: '' },
                link: content.link || '',
                link_target: Boolean(content.link_target),
                image_settings: content.image_settings || {},
            };
        }
        if (type === 'video') {
            return {
                video_url: content.video_url || '',
            };
        }
        if (type === 'block') {
            return {
                blocks: content.blocks || '',
            };
        }
        return {
            html: content.html || '',
        };
    };

    const applyTemplate = (template) => {
        const updates = { creative_type: template.type };
        if (template.containerType) {
            updates.container_type = template.containerType;
            if (template.containerType !== 'inline') {
                updates.placement_hook = 'footer';
                updates.placement_position = '';
                updates.placement_paragraph = 0;
            }
        }
        handleUpdateOptions(updates);
        handleUpdateContent(template.data || {});
    };

    const {
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
        addTemplateCategory,
        removeTemplateCategory,
        updateTemplateCategories,
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
    } = useTemplateLibrary({
        selectedAd,
        getCreativeTemplateData,
        onApplyTemplate: applyTemplate,
        showNotice,
    });

    const handleSave = async () => {
        clearNotice();

        const missingPosition = ads.filter((ad) => {
            const placement = resolvePlacement(ad.options || {});
            if (!placement.hook) {
                return true;
            }
            if (placement.hook === 'content' && !placement.position) {
                return true;
            }
            if (
                placement.hook === 'content' &&
                placement.position === 'paragraph' &&
                placement.paragraph < 1
            ) {
                return true;
            }
            return false;
        });
        if (missingPosition.length > 0) {
            setShowValidation(true);
            showNotice(
                'error',
                `请为 ${missingPosition.length} 个广告选择展示位置。`,
                4000
            );
            return;
        }
        setShowValidation(false);

        try {
            await saveToDB();
            showNotice('success', '保存成功', 2500);
        } catch (err) {
            const message =
                err?.data?.message ||
                err?.message ||
                '保存失败，请检查网络或权限设置。';
            showNotice('error', message, 4000);
        }
    };

    const openSaveTemplate = async (type) => {
        setSaveTemplateType(type);
        setSaveTemplateName('');
        setSaveTemplateCategory('');
        setSaveTemplateCategoryName('');
        setSaveTemplateOpen(true);
        await loadTemplateCategories();
    };

    const handleConfirmSaveTemplate = async () => {
        const name = saveTemplateName.trim();
        if (!name) {
            showNotice('error', '请输入模板名称', 3000);
            return;
        }
        const containerType = selectedAd?.options?.container_type || 'inline';
        const isNewCategory = saveTemplateCategory === 'new';
        const categoryName = isNewCategory
            ? saveTemplateCategoryName.trim()
            : saveTemplateCategory;
        const category =
            !categoryName || categoryName === 'uncategorized'
                ? ''
                : categoryName;
        if (isNewCategory && !categoryName) {
            showNotice('error', '请输入新分类名称', 3000);
            return;
        }
        try {
            if (isNewCategory && categoryName) {
                await addTemplateCategory(categoryName);
            }
            await saveTemplate(saveTemplateType, name, category, containerType);
            setSaveTemplateOpen(false);
        } catch (err) {
            // keep modal open for retry
        }
    };

    const handleToggleEnabled = async (ad) => {
        const nextEnabled = !(ad?.options?.enabled ?? true);
        const nextStatus = nextEnabled
            ? isFutureDate(ad?.date) || ad?.status === 'future'
                ? 'future'
                : 'publish'
            : 'draft';
        updateAdGroup(ad.id, {
            status: nextStatus,
            options: {
                ...(ad.options || {}),
                enabled: nextEnabled,
            },
        });

        try {
            await saveToDB();
            showNotice(
                'success',
                nextEnabled ? '已启用该广告' : '已停用该广告',
                2000
            );
        } catch (err) {
            const message =
                err?.data?.message ||
                err?.message ||
                '保存失败，请检查网络或权限设置。';
            showNotice('error', message, 4000);
        }
    };

    const leftSidebar = (
        <div className="magick-ad-left-stack">
            <Card>
                <CardBody>
                    <div className="magick-ad-sidebar__header">
                        <h2>广告组</h2>
                        <div className="magick-ad-sidebar__header-actions">
                            <DropdownMenu
                                className="magick-ad-add-menu"
                                icon={null}
                                text="新增"
                                toggleProps={{ variant: 'secondary' }}
                            >
                                {({ onClose }) => (
                                    <MenuGroup>
                                        <MenuItem
                                            onClick={() => {
                                                addAdGroup('global');
                                                onClose();
                                            }}
                                        >
                                            全局广告
                                        </MenuItem>
                                        <MenuItem
                                            onClick={() => {
                                                addAdGroup('targeted');
                                                onClose();
                                            }}
                                        >
                                            指定广告
                                        </MenuItem>
                                    </MenuGroup>
                                )}
                            </DropdownMenu>
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                isBusy={isSaving}
                                disabled={isSaving || !selectedAd}
                            >
                                {isSaving ? '保存中...' : '保存'}
                            </Button>
                        </div>
                    </div>
                    {ads.length === 0 ? (
                        <p className="description">暂无广告组。</p>
                    ) : (
                        <nav className="magick-ad-sidebar__list">
                            {[
                                {
                                    key: 'global',
                                    title: '全局广告',
                                    items: ads.filter(
                                        (ad) =>
                                            ad.options?.ad_type !== 'targeted'
                                    ),
                                },
                                {
                                    key: 'targeted',
                                    title: '指定广告',
                                    items: ads.filter(
                                        (ad) =>
                                            ad.options?.ad_type === 'targeted'
                                    ),
                                },
                            ].map((section) => (
                                <div
                                    key={section.key}
                                    className="magick-ad-sidebar__section"
                                >
                                    <div className="magick-ad-sidebar__section-title">
                                        {section.title}
                                        <span className="magick-ad-sidebar__section-count">
                                            {section.items.length}
                                        </span>
                                    </div>
                                    {section.items.length === 0 ? (
                                        <p className="description">
                                            暂无{section.title}
                                        </p>
                                    ) : (
                                        section.items.map((ad, index) => (
                                            <div
                                                key={ad.id}
                                                className={`magick-ad-sidebar__item ${
                                                    selectedId === ad.id
                                                        ? 'is-active'
                                                        : ''
                                                } ${
                                                    missingPositionIds.has(
                                                        ad.id
                                                    )
                                                        ? 'has-error'
                                                        : ''
                                                } ${
                                                    ad?.options?.enabled ===
                                                    false
                                                        ? 'is-disabled'
                                                        : ''
                                                }`}
                                            >
                                                <div className="magick-ad-sidebar__body">
                                                    <Button
                                                        variant="tertiary"
                                                        onClick={() =>
                                                            setSelectedId(
                                                                ad.id
                                                            )
                                                        }
                                                        aria-current={
                                                            selectedId ===
                                                            ad.id
                                                                ? 'true'
                                                                : undefined
                                                        }
                                                        className="magick-ad-sidebar__main"
                                                    >
                                                        <span className="magick-ad-sidebar__title-row">
                                                            <span className="magick-ad-sidebar__title">
                                                                {ad.name ||
                                                                    `广告组 ${index + 1}`}
                                                            </span>
                                                            <span
                                                                className={`magick-ad-status-pill ${
                                                                    statusMeta(ad)
                                                                        .className
                                                                }`}
                                                            >
                                                                {
                                                                    statusMeta(
                                                                        ad
                                                                    ).label
                                                                }
                                                            </span>
                                                        </span>
                                                        {missingPositionIds.has(
                                                            ad.id
                                                        ) && (
                                                            <span className="magick-ad-sidebar__alert">
                                                                <span className="magick-ad-sidebar__dot" />
                                                                需配置位置
                                                            </span>
                                                        )}
                                                    </Button>
                                                </div>
                                                <div className="magick-ad-sidebar__actions">
                                                    <DropdownMenu
                                                        icon={moreHorizontal}
                                                        label="更多操作"
                                                        className="magick-ad-item-menu"
                                                        toggleProps={{
                                                            variant:
                                                                'tertiary',
                                                            size: 'small',
                                                            className:
                                                                'magick-ad-item-menu__toggle',
                                                        }}
                                                    >
                                                        {({ onClose }) => (
                                                            <MenuGroup>
                                                                <MenuItem
                                                                    onClick={() => {
                                                                        setRenameTarget(
                                                                            ad
                                                                        );
                                                                        setRenameValue(
                                                                            ad.name ||
                                                                                ''
                                                                        );
                                                                        onClose();
                                                                    }}
                                                                >
                                                                    修改名称
                                                                </MenuItem>
                                                                <MenuItem
                                                                    onClick={() => {
                                                                        handleToggleEnabled(
                                                                            ad
                                                                        );
                                                                        onClose();
                                                                    }}
                                                                >
                                                                    {ad
                                                                        ?.options
                                                                        ?.enabled ===
                                                                    false
                                                                        ? '设为启用'
                                                                        : '设为停用'}
                                                                </MenuItem>
                                                                <MenuItem
                                                                    isDestructive
                                                                    onClick={() => {
                                                                        setDeleteTarget(
                                                                            ad
                                                                        );
                                                                        onClose();
                                                                    }}
                                                                >
                                                                    删除
                                                                </MenuItem>
                                                            </MenuGroup>
                                                        )}
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ))}
                        </nav>
                    )}
                </CardBody>
            </Card>
            <SystemSettingsPanel onNotice={showNotice} />
            <DebugPanel onNotice={showNotice} />
        </div>
    );

    const activeCreativeType =
        selectedAd?.options?.creative_type || 'image';

    const contentHeader = selectedAd ? (
        <div>
            <TemplateActions
                onOpen={() => openTemplateLibrary(activeCreativeType)}
                onSave={() => openSaveTemplate(activeCreativeType)}
            />
        </div>
    ) : null;

    const contentPanels = selectedAd ? (
        <TabPanel
            className="magick-ad-sub-tabs"
            tabs={[
                { name: 'html', title: '代码/HTML' },
                { name: 'image', title: '图片' },
                { name: 'video', title: '视频' },
                { name: 'block', title: '可视化设计' },
            ]}
            initialTabName={selectedAd.options?.creative_type || 'image'}
            onSelect={(name) =>
                handleUpdateOptions({
                    creative_type: name,
                })
            }
        >
            {() => {
                const activeContentType =
                    selectedAd.options?.creative_type || 'image';

                return (
                    <>
                        <div
                            className={`magick-ad-tab-panel ${
                                activeContentType === 'image'
                                    ? ''
                                    : 'is-hidden'
                            }`}
                        >
                            <Panel>
                                <PanelBody title="内容配置" initialOpen>
                                    <TabPanel
                                        className="magick-ad-image-tabs"
                                        tabs={[
                                            { name: 'content', title: '内容' },
                                            { name: 'settings', title: '配置' },
                                        ]}
                                    >
                                        {(imageTab) =>
                                            imageTab.name === 'content' ? (
                                                <>
                                                    <LinkPicker
                                                        value={
                                                            selectedAd.content
                                                                ?.link || ''
                                                        }
                                                        target={
                                                            selectedAd.content
                                                                ?.link_target
                                                        }
                                                        onChange={({
                                                            url,
                                                            target,
                                                        }) =>
                                                            handleUpdateContent({
                                                                link: url,
                                                                link_target:
                                                                    Boolean(
                                                                        target
                                                                    ),
                                                            })
                                                        }
                                                    />
                                                    <div className="magick-ad-field">
                                                        <p className="magick-ad-field__label">
                                                            图片
                                                        </p>
                                                        <ImagePicker
                                                            value={
                                                                selectedAd.content
                                                                    ?.image ||
                                                                null
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateContent(
                                                                    {
                                                                        image: value,
                                                                    }
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <Notice status="info" isDismissible={false}>
                                                        图片配置仅影响图片本体（img）。容器背景、内边距、
                                                        阴影等请在右侧“容器外观”中设置。
                                                    </Notice>
                                                    <div className="magick-ad-field">
                                                        <p className="magick-ad-field__label">
                                                            水印
                                                        </p>
                                                        <p className="description">
                                                            水印将显示在图片中的右下角，默认隐藏水印。
                                                        </p>
                                                        <ToggleControl
                                                            label={
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.watermark
                                                                    ? '显示'
                                                                    : '隐藏'
                                                            }
                                                            checked={Boolean(
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.watermark
                                                            )}
                                                            onChange={(value) =>
                                                                handleUpdateImageSettings(
                                                                    {
                                                                        watermark:
                                                                            value,
                                                                    }
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="magick-ad-image-grid">
                                                        <TextControl
                                                            label="图片圆角"
                                                            type="number"
                                                            min={0}
                                                            value={
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.radius ??
                                                                0
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateImageSettings(
                                                                    {
                                                                        radius:
                                                                            Number(
                                                                                value
                                                                            ),
                                                                    }
                                                                )
                                                            }
                                                            help="像素"
                                                        />
                                                        <TextControl
                                                            label="图片最大宽度"
                                                            type="number"
                                                            min={0}
                                                            value={
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.max_width ??
                                                                1200
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateImageSettings(
                                                                    {
                                                                        max_width:
                                                                            Number(
                                                                                value
                                                                            ),
                                                                    }
                                                                )
                                                            }
                                                            help="像素"
                                                        />
                                                        <TextControl
                                                            label="图片距离顶部"
                                                            type="number"
                                                            min={0}
                                                            value={
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.margin_top ??
                                                                0
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateImageSettings(
                                                                    {
                                                                        margin_top:
                                                                            Number(
                                                                                value
                                                                            ),
                                                                    }
                                                                )
                                                            }
                                                            help="像素"
                                                        />
                                                        <TextControl
                                                            label="图片距离底部"
                                                            type="number"
                                                            min={0}
                                                            value={
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.margin_bottom ??
                                                                0
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateImageSettings(
                                                                    {
                                                                        margin_bottom:
                                                                            Number(
                                                                                value
                                                                            ),
                                                                    }
                                                                )
                                                            }
                                                            help="像素"
                                                        />
                                                        <TextControl
                                                            label="图片距离左边"
                                                            type="number"
                                                            min={0}
                                                            value={
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.margin_left ??
                                                                0
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateImageSettings(
                                                                    {
                                                                        margin_left:
                                                                            Number(
                                                                                value
                                                                            ),
                                                                    }
                                                                )
                                                            }
                                                            help="像素"
                                                        />
                                                        <TextControl
                                                            label="图片距离右边"
                                                            type="number"
                                                            min={0}
                                                            value={
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.margin_right ??
                                                                0
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateImageSettings(
                                                                    {
                                                                        margin_right:
                                                                            Number(
                                                                                value
                                                                            ),
                                                                    }
                                                                )
                                                            }
                                                            help="像素"
                                                        />
                                                    </div>
                                                </>
                                            )
                                        }
                                    </TabPanel>
                                </PanelBody>
                            </Panel>
                        </div>

                        <div
                            className={`magick-ad-tab-panel ${
                                activeContentType === 'html'
                                    ? ''
                                    : 'is-hidden'
                            }`}
                        >
                            <Panel>
                                <PanelBody title="内容配置" initialOpen>
                                    <SelectControl
                                        label="HTML 模式"
                                        value={
                                            selectedAd.options?.html_mode ||
                                            'safe'
                                        }
                                        options={[
                                            {
                                                label: '安全模式（过滤脚本）',
                                                value: 'safe',
                                            },
                                            {
                                                label: '完全模式（允许脚本）',
                                                value: 'full',
                                            },
                                        ]}
                                        onChange={(value) => {
                                            if (
                                                value === 'full' &&
                                                !canUnfilteredHtml
                                            ) {
                                                showNotice(
                                                    'error',
                                                    '当前账号无 unfiltered_html 权限，无法启用完全模式。',
                                                    3500
                                                );
                                                handleUpdateOptions({
                                                    html_mode: 'safe',
                                                });
                                                return;
                                            }
                                            handleUpdateOptions({
                                                html_mode: value,
                                            });
                                        }}
                                        help="完全模式仅限高权限用户，可能存在安全风险。"
                                    />
                                    {selectedAd.options?.html_mode ===
                                        'safe' &&
                                        /<script[\s>]/i.test(
                                            selectedAd.content?.html || ''
                                        ) && (
                                            <Notice
                                                status="warning"
                                                isDismissible={false}
                                            >
                                                检测到 <code>&lt;script&gt;</code>{' '}
                                                标签。安全模式会移除脚本，
                                                请切换到“完全模式”并确保账号具备权限。
                                            </Notice>
                                        )}
                                    {selectedAd.options?.html_mode ===
                                        'full' &&
                                        !canUnfilteredHtml && (
                                            <Notice
                                                status="error"
                                                isDismissible={false}
                                            >
                                                当前账号无 unfiltered_html 权限，
                                                脚本会被过滤并自动回退到安全模式。
                                            </Notice>
                                        )}
                                    <ClassicEditor
                                        value={selectedAd.content?.html || ''}
                                        active={activeContentType === 'html'}
                                        onChange={(value) =>
                                            handleUpdateContent({
                                                html: value,
                                            })
                                        }
                                    />
                                </PanelBody>
                            </Panel>
                        </div>

                        {activeContentType === 'video' && (
                            <Panel>
                                <PanelBody title="内容配置" initialOpen>
                                    <TextControl
                                        label="视频地址"
                                        value={
                                            selectedAd.content?.video_url || ''
                                        }
                                        onChange={(value) =>
                                            handleUpdateContent({
                                                video_url: value,
                                            })
                                        }
                                        help="支持 MP4 或外部嵌入链接"
                                    />
                                </PanelBody>
                            </Panel>
                        )}

                        {activeContentType === 'block' && (
                            <Panel>
                                <PanelBody title="内容配置" initialOpen>
                                    <BlockEditor
                                        value={
                                            selectedAd.content?.blocks || ''
                                        }
                                        onChange={(value) =>
                                            handleUpdateContent({
                                                blocks: value,
                                            })
                                        }
                                    />
                                </PanelBody>
                            </Panel>
                        )}
                    </>
                );
            }}
        </TabPanel>
    ) : (
        <div className="magick-ad-empty">
            <p>请选择一个广告组进行配置。</p>
        </div>
    );

    const rightSidebar = selectedAd ? (
        <div className="magick-ad-right-stack">
            <Card>
                <CardBody>
                    <div className="magick-ad-schedule-header">
                        <div className="magick-ad-schedule-title">
                            发布与排期
                        </div>
                        <span
                            className={`magick-ad-status-pill ${
                                statusMeta(selectedAd).className
                            }`}
                        >
                            {statusMeta(selectedAd).label}
                        </span>
                    </div>
                    <SelectControl
                        label="发布状态"
                        value={resolveStatus(selectedAd)}
                        options={[
                            { label: '已发布', value: 'publish' },
                            { label: '定时发布', value: 'future' },
                            { label: '待审核', value: 'pending' },
                            { label: '草稿/停用', value: 'draft' },
                        ]}
                        onChange={(value) => {
                            if (!selectedAd) {
                                return;
                            }
                            if (value === 'draft') {
                                handleUpdateMeta({
                                    status: 'draft',
                                    options: {
                                        ...selectedAd.options,
                                        enabled: false,
                                    },
                                });
                                return;
                            }
                            if (value === 'pending') {
                                handleUpdateMeta({
                                    status: 'pending',
                                    options: {
                                        ...selectedAd.options,
                                        enabled: true,
                                    },
                                });
                                return;
                            }
                            if (value === 'future') {
                                handleUpdateMeta({
                                    status: 'future',
                                    date: selectedAd.date || buildDefaultSchedule(),
                                    options: {
                                        ...selectedAd.options,
                                        enabled: true,
                                    },
                                });
                                return;
                            }
                            const nextDate =
                                selectedAd.date && isFutureDate(selectedAd.date)
                                    ? formatDateFromDate(new Date())
                                    : selectedAd.date || '';
                            handleUpdateMeta({
                                status: 'publish',
                                date: nextDate,
                                options: {
                                    ...selectedAd.options,
                                    enabled: true,
                                },
                            });
                        }}
                    />
                    {resolveStatus(selectedAd) === 'future' && (
                        <TextControl
                            label="排期时间"
                            type="datetime-local"
                            value={formatDateTimeLocalInput(selectedAd.date)}
                            onChange={(value) => {
                                const nextDate =
                                    formatDateTimeStorage(value);
                                if (!nextDate) {
                                    handleUpdateMeta({
                                        date: '',
                                        status: 'draft',
                                        options: {
                                            ...selectedAd.options,
                                            enabled: false,
                                        },
                                    });
                                    return;
                                }
                                const nextStatus = isFutureDate(nextDate)
                                    ? 'future'
                                    : 'publish';
                                handleUpdateMeta({
                                    date: nextDate,
                                    status: nextStatus,
                                    options: {
                                        ...selectedAd.options,
                                        enabled: true,
                                    },
                                });
                            }}
                            help="达到排期时间后，广告会自动发布。"
                        />
                    )}
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <div className="magick-ad-mode-switch">
                        <div className="magick-ad-mode-switch__label">
                            编辑模式
                        </div>
                        <ButtonGroup>
                            <Button
                                variant="secondary"
                                isPressed={effectiveEditorMode === 'quick'}
                                onClick={() =>
                                    handleUpdateOptions({
                                        editor_mode: 'quick',
                                    })
                                }
                            >
                                快速模式
                            </Button>
                            <Button
                                variant="secondary"
                                isPressed={effectiveEditorMode === 'design'}
                                onClick={() =>
                                    handleUpdateOptions({
                                        editor_mode: 'design',
                                    })
                                }
                            >
                                设计模式
                            </Button>
                            <Button
                                variant="secondary"
                                isPressed={effectiveEditorMode === 'expert'}
                                onClick={() => {
                                    if (!canUnfilteredHtml) {
                                        showNotice(
                                            'error',
                                            '当前账号无 unfiltered_html 权限，无法启用专家模式。',
                                            3500
                                        );
                                        return;
                                    }
                                    handleUpdateOptions({
                                        editor_mode: 'expert',
                                    });
                                }}
                                disabled={!canUnfilteredHtml}
                            >
                                专家模式
                            </Button>
                        </ButtonGroup>
                    </div>
                    {editorModeRaw === 'expert' && !canUnfilteredHtml && (
                        <Notice status="warning" isDismissible={false}>
                            专家模式需要 unfiltered_html 权限，已回退为设计模式。
                        </Notice>
                    )}
                    {effectiveEditorMode === 'quick' && (
                        <Panel>
                            <PanelBody title="快速设置" initialOpen>
                                <div className="magick-ad-field">
                                    <p className="magick-ad-field__label">
                                        主色
                                    </p>
                                    <ColorPicker
                                        color={
                                            selectedAd.content?.container_style
                                                ?.background || 'transparent'
                                        }
                                        onChangeComplete={(value) =>
                                            handleUpdateContainerStyle({
                                                background: formatColorValue(
                                                    value
                                                ),
                                            })
                                        }
                                        enableAlpha
                                    />
                                </div>
                                <RangeControl
                                    label="圆角"
                                    min={0}
                                    max={50}
                                    value={
                                        selectedAd.content?.container_style
                                            ?.radius ?? 0
                                    }
                                    onChange={(value) =>
                                        handleUpdateContainerStyle({
                                            radius: Number(value),
                                        })
                                    }
                                />
                                {selectedAd.options?.creative_type ===
                                    'image' && (
                                    <TextControl
                                        label="按钮文案"
                                        value={
                                            selectedAd.content?.cta_text || ''
                                        }
                                        onChange={(value) =>
                                            handleUpdateContent({
                                                cta_text: value,
                                            })
                                        }
                                        help="图片广告将展示一个按钮（需设置跳转链接）。"
                                    />
                                )}
                            </PanelBody>
                            <PanelBody title="展示位置" initialOpen>
                                    {showValidation &&
                                        !resolvePlacement(
                                            selectedAd.options || {}
                                        ).hook && (
                                            <Notice
                                                status="error"
                                                isDismissible={false}
                                            >
                                                请先选择展示位置
                                            </Notice>
                                        )}
                                    {selectedAd.options?.ad_type ===
                                        'global' && (
                                        <>
                                            <SelectControl
                                                label="展示页面"
                                                value={
                                                    selectedAd.options
                                                        ?.show_page || 'all'
                                                }
                                                options={DISPLAY_PAGE_OPTIONS}
                                                onChange={(value) => {
                                                    const allowedPositions =
                                                        getPositionOptions(
                                                            value
                                                        ).map(
                                                            (option) =>
                                                                option.value
                                                        );
                                                    const currentPlacement =
                                                        resolvePlacement(
                                                            selectedAd.options ||
                                                                {}
                                                        );
                                                    const currentValue =
                                                        placementToSlotValue(
                                                            currentPlacement
                                                        );
                                                    const nextPosition =
                                                        allowedPositions.includes(
                                                            currentValue
                                                        )
                                                            ? currentValue
                                                            : '';
                                                    handleUpdateOptions({
                                                        show_page: value,
                                                        ...slotToPlacementUpdates(
                                                            nextPosition
                                                        ),
                                                    });
                                                }}
                                            />
                                            <SelectControl
                                                label="展示位置"
                                                value={placementToSlotValue(
                                                    resolvePlacement(
                                                        selectedAd.options || {}
                                                    )
                                                )}
                                                options={positionOptions}
                                                onChange={(value) =>
                                                    handleUpdateOptions({
                                                        ...slotToPlacementUpdates(
                                                            value
                                                        ),
                                                    })
                                                }
                                            />
                                        </>
                                    )}
                                    {selectedAd.options?.ad_type ===
                                        'targeted' && (
                                        <>
                                            <SelectControl
                                                label="展示类型"
                                                value={
                                                    selectedAd.options
                                                        ?.target_type || ''
                                                }
                                                options={[
                                                    {
                                                        label: '请选择展示类型',
                                                        value: '',
                                                    },
                                                    ...TARGET_TYPE_OPTIONS,
                                                ]}
                                                onChange={(value) => {
                                                    setTargetItems([]);
                                                    setTargetSuggestions([]);
                                                    const allowedPositions =
                                                        value
                                                            ? getPositionOptions(
                                                                  value
                                                              ).map(
                                                                  (option) =>
                                                                      option.value
                                                              )
                                                            : [];
                                                    const nextPosition =
                                                        allowedPositions.includes(
                                                            placementToSlotValue(
                                                                resolvePlacement(
                                                                    selectedAd.options ||
                                                                        {}
                                                                )
                                                            )
                                                        )
                                                            ? placementToSlotValue(
                                                                  resolvePlacement(
                                                                      selectedAd.options ||
                                                                          {}
                                                                  )
                                                              )
                                                            : '';
                                                    handleUpdateOptions({
                                                        target_type: value,
                                                        target_ids: [],
                                                        ...slotToPlacementUpdates(
                                                            nextPosition
                                                        ),
                                                    });
                                                }}
                                            />
                                            <SelectControl
                                                label="展示位置"
                                                value={placementToSlotValue(
                                                    resolvePlacement(
                                                        selectedAd.options || {}
                                                    )
                                                )}
                                                options={targetPositionOptions}
                                                onChange={(value) =>
                                                    handleUpdateOptions({
                                                        ...slotToPlacementUpdates(
                                                            value
                                                        ),
                                                    })
                                                }
                                                disabled={
                                                    !selectedAd.options
                                                        ?.target_type
                                                }
                                            />
                                            <FormTokenField
                                                label="展示页面"
                                                value={targetItems.map(
                                                    (item) => item.label
                                                )}
                                                suggestions={targetSuggestions.map(
                                                    (item) => item.label
                                                )}
                                                onInputChange={handleTargetSearch}
                                                onFocus={() =>
                                                    handleTargetSearch('')
                                                }
                                                __experimentalExpandOnFocus
                                                onChange={(tokens) => {
                                                    const tokenMap = new Map();
                                                    targetItems.forEach(
                                                        (item) => {
                                                            tokenMap.set(
                                                                item.label,
                                                                item
                                                            );
                                                        }
                                                    );
                                                    targetSuggestions.forEach(
                                                        (item) => {
                                                            tokenMap.set(
                                                                item.label,
                                                                item
                                                            );
                                                        }
                                                    );
                                                    const nextItems = tokens
                                                        .map((token) =>
                                                            tokenMap.get(
                                                                token
                                                            )
                                                        )
                                                        .filter(Boolean);
                                                    setTargetItems(nextItems);
                                                    handleUpdateOptions({
                                                        target_ids: nextItems.map(
                                                            (item) => item.id
                                                        ),
                                                    });
                                                }}
                                                placeholder={
                                                    selectedAd.options
                                                        ?.target_type
                                                        ? '输入关键词搜索并选择'
                                                        : '请先选择展示类型'
                                                }
                                                disabled={
                                                    !selectedAd.options
                                                        ?.target_type
                                                }
                                            />
                                        </>
                                    )}
                                    {resolvePlacement(
                                        selectedAd.options || {}
                                    ).hook === 'node' && (
                                        <div className="magick-ad-node-placement">
                                            <h4 className="magick-ad-field__label">
                                                节点投放
                                            </h4>
                                            <Button
                                                variant="secondary"
                                                onClick={() => {
                                                    const base =
                                                        window.MagickAD
                                                            ?.previewUrl ||
                                                        window.location.origin;
                                                    let url = base;
                                                    try {
                                                        const next = new URL(
                                                            base
                                                        );
                                                        next.searchParams.set(
                                                            'magick_ad_picker',
                                                            '1'
                                                        );
                                                        next.searchParams.set(
                                                            'magick_ad_picker_origin',
                                                            window.location
                                                                .origin
                                                        );
                                                        url = next.toString();
                                                    } catch (err) {
                                                        url = base;
                                                    }
                                                    window.open(
                                                        url,
                                                        'magick-ad-picker'
                                                    );
                                                }}
                                            >
                                                可视化选择
                                            </Button>
                                            <SelectControl
                                                label="定位方式"
                                                value={
                                                    selectedAd.options
                                                        ?.node_target_type ||
                                                    'id'
                                                }
                                                options={[
                                                    {
                                                        label: 'ID',
                                                        value: 'id',
                                                    },
                                                    {
                                                        label: 'Class',
                                                        value: 'class',
                                                    },
                                                ]}
                                                onChange={(value) =>
                                                    handleUpdateOptions({
                                                        node_target_type:
                                                            value,
                                                    })
                                                }
                                            />
                                            <TextControl
                                                label="节点值"
                                                value={
                                                    selectedAd.options
                                                        ?.node_target_value ||
                                                    ''
                                                }
                                                onChange={(value) =>
                                                    handleUpdateOptions({
                                                        node_target_value:
                                                            value.trim(),
                                                    })
                                                }
                                                help="ID 不带 #，Class 不带 ."
                                            />
                                            <SelectControl
                                                label="插入方式"
                                                value={
                                                    selectedAd.options
                                                        ?.node_insert ||
                                                    'append'
                                                }
                                                options={[
                                                    {
                                                        label: '插入到节点内部末尾',
                                                        value: 'append',
                                                    },
                                                    {
                                                        label: '插入到节点内部开头',
                                                        value: 'prepend',
                                                    },
                                                    {
                                                        label: '插入到节点外部前面',
                                                        value: 'before',
                                                    },
                                                    {
                                                        label: '插入到节点外部后面',
                                                        value: 'after',
                                                    },
                                                ]}
                                                onChange={(value) =>
                                                    handleUpdateOptions({
                                                        node_insert: value,
                                                    })
                                                }
                                            />
                                            <SelectControl
                                                label="匹配策略"
                                                value={
                                                    selectedAd.options
                                                        ?.node_match ||
                                                    'first'
                                                }
                                                options={[
                                                    {
                                                        label: '仅第一个匹配',
                                                        value: 'first',
                                                    },
                                                    {
                                                        label: '第 N 个',
                                                        value: 'nth',
                                                    },
                                                    {
                                                        label: '全部匹配',
                                                        value: 'all',
                                                    },
                                                ]}
                                                onChange={(value) =>
                                                    handleUpdateOptions({
                                                        node_match: value,
                                                    })
                                                }
                                                help="Class 可能匹配多个元素，默认仅第一个。"
                                            />
                                            {selectedAd.options
                                                ?.node_match === 'nth' && (
                                                <RangeControl
                                                    label="第 N 个"
                                                    min={1}
                                                    max={20}
                                                    value={
                                                        Number(
                                                            selectedAd.options
                                                                ?.node_index ||
                                                                1
                                                        ) || 1
                                                    }
                                                    onChange={(value) =>
                                                        handleUpdateOptions({
                                                            node_index:
                                                                Number(value),
                                                        })
                                                    }
                                                />
                                            )}
                                            <SelectControl
                                                label="找不到节点时"
                                                value={
                                                    selectedAd.options
                                                        ?.node_fallback ||
                                                    'hide'
                                                }
                                                options={[
                                                    {
                                                        label: '隐藏广告',
                                                        value: 'hide',
                                                    },
                                                    {
                                                        label: '回退到页脚',
                                                        value: 'footer',
                                                    },
                                                ]}
                                                onChange={(value) =>
                                                    handleUpdateOptions({
                                                        node_fallback: value,
                                                    })
                                                }
                                            />
                                            <ToggleControl
                                                label="紧凑模式"
                                                checked={
                                                    selectedAd.options
                                                        ?.node_compact !==
                                                    false
                                                }
                                                onChange={(value) =>
                                                    handleUpdateOptions({
                                                        node_compact: value,
                                                    })
                                                }
                                                help="默认移除广告单元外边距，避免挤压布局。"
                                            />
                                        </div>
                                    )}
                                </PanelBody>
                                <PanelBody title="频控" initialOpen>
                                    <SelectControl
                                        label="频控策略"
                                        value={
                                            selectedAd.content?.behavior
                                                ?.frequency_mode || 'none'
                                        }
                                        options={[
                                            {
                                                label: '不限制',
                                                value: 'none',
                                            },
                                            {
                                                label: '每会话一次',
                                                value: 'session',
                                            },
                                            {
                                                label: '每天一次',
                                                value: 'day',
                                            },
                                            {
                                                label: '最多 N 次',
                                                value: 'count',
                                            },
                                        ]}
                                        onChange={(value) =>
                                            handleUpdateBehavior({
                                                frequency_mode: value,
                                            })
                                        }
                                    />
                                    {selectedAd.content?.behavior
                                        ?.frequency_mode === 'count' && (
                                        <TextControl
                                            label="最多展示次数"
                                            type="number"
                                            min={1}
                                            value={
                                                selectedAd.content?.behavior
                                                    ?.frequency_limit ?? 1
                                            }
                                            onChange={(value) =>
                                                handleUpdateBehavior({
                                                    frequency_limit:
                                                        Math.max(
                                                            1,
                                                            Number(
                                                                value || 1
                                                            )
                                                        ),
                                                })
                                            }
                                        />
                                    )}
                                </PanelBody>
                        </Panel>
                    )}
                    {effectiveEditorMode !== 'quick' && (
                    <TabPanel
                        className="magick-ad-right-tabs"
                        tabs={[
                            { name: 'container', title: '容器' },
                            { name: 'behavior', title: '交互' },
                            { name: 'placement', title: '投放' },
                        ]}
                        initialTabName="placement"
                    >
                        {(tab) => {
                            const containerStyle =
                                selectedAd.content?.container_style || {};
                            const behavior =
                                selectedAd.content?.behavior || {};

                            const isInlineContainer =
                                (selectedAd.options?.container_type || 'inline') ===
                                'inline';

                            if (tab.name === 'container') {
                                return (
                                    <Panel>
                                        <PanelBody title="容器外观" initialOpen>
                                            <Notice status="info" isDismissible={false}>
                                                容器外观仅作用于包裹层（div），不影响图片本体。图片尺寸、
                                                圆角与外边距请在“图片配置”里调整。
                                            </Notice>
                                            <TabPanel
                                                className="magick-ad-sub-tabs"
                                                tabs={[
                                                    { name: 'base', title: '基础' },
                                                    { name: 'size', title: '尺寸' },
                                                    { name: 'spacing', title: '间距' },
                                                    { name: 'appearance', title: '外观' },
                                                    { name: 'badge', title: '角标' },
                                                ]}
                                                initialTabName="base"
                                            >
                                                {(subTab) => {
                                                    if (subTab.name === 'base') {
                                                        return (
                                                            <>
                                                                <SelectControl
                                                                    label="容器类型"
                                                                    value={
                                                                        selectedAd
                                                                            .options
                                                                            ?.container_type ||
                                                                        'inline'
                                                                    }
                                                                    options={[
                                                                        {
                                                                            label: '默认嵌入',
                                                                            value: 'inline',
                                                                        },
                                                                        {
                                                                            label: '弹窗',
                                                                            value: 'popup',
                                                                        },
                                                                        {
                                                                            label: '吸顶/吸底横栏',
                                                                            value: 'banner',
                                                                        },
                                                                        {
                                                                            label: '角落悬浮',
                                                                            value: 'floating',
                                                                        },
                                                                        {
                                                                            label: '全屏插屏',
                                                                            value: 'interstitial',
                                                                        },
                                                                    ]}
                                                                    onChange={(value) => {
                                                                        if (value !== 'inline') {
                                                                            handleUpdateOptions({
                                                                                container_type: value,
                                                                                placement_hook: 'footer',
                                                                                placement_position: '',
                                                                                placement_paragraph: 0,
                                                                            });
                                                                            return;
                                                                        }
                                                                        handleUpdateOptions({
                                                                            container_type: value,
                                                                        });
                                                                    }}
                                                                    help="容器决定展示形态，投放位置仍由“投放”页签控制。"
                                                                />
                                                                <SelectControl
                                                                    label="容器模式"
                                                                    value={
                                                                        containerStyle.mode ||
                                                                        'boxed'
                                                                    }
                                                                    options={[
                                                                        {
                                                                            label: '包裹容器',
                                                                            value: 'boxed',
                                                                        },
                                                                        {
                                                                            label: '原始输出',
                                                                            value: 'raw',
                                                                        },
                                                                    ]}
                                                                    onChange={(value) =>
                                                                        handleUpdateContainerStyle(
                                                                            {
                                                                                mode: value,
                                                                            }
                                                                        )
                                                                    }
                                                                />
                                                                {containerStyle.mode === 'raw' && (
                                                                    <Notice
                                                                        status="info"
                                                                        isDismissible={false}
                                                                    >
                                                                        原始模式不会应用容器样式。
                                                                    </Notice>
                                                                )}
                                                            </>
                                                        );
                                                    }

                                                    if (containerStyle.mode === 'raw') {
                                                        return (
                                                            <Notice
                                                                status="info"
                                                                isDismissible={false}
                                                            >
                                                                当前为原始输出模式，尺寸/外观设置不会生效。
                                                            </Notice>
                                                        );
                                                    }

                                                    if (subTab.name === 'size') {
                                                        return (
                                                            <div className="magick-ad-field">
                                                                <RangeControl
                                                                    label="最大宽度"
                                                                    min={
                                                                        containerStyle.max_width_unit ===
                                                                        'px'
                                                                            ? 320
                                                                            : 50
                                                                    }
                                                                    max={
                                                                        containerStyle.max_width_unit ===
                                                                        'px'
                                                                            ? 1200
                                                                            : 100
                                                                    }
                                                                    value={
                                                                        containerStyle.max_width ??
                                                                        100
                                                                    }
                                                                    onChange={(value) =>
                                                                        handleUpdateContainerStyle(
                                                                            {
                                                                                max_width:
                                                                                    Number(
                                                                                        value
                                                                                    ),
                                                                            }
                                                                        )
                                                                    }
                                                                />
                                                                <SelectControl
                                                                    label="宽度单位"
                                                                    value={
                                                                        containerStyle.max_width_unit ||
                                                                        '%'
                                                                    }
                                                                    options={[
                                                                        {
                                                                            label: '百分比 (%)',
                                                                            value: '%',
                                                                        },
                                                                        {
                                                                            label: '像素 (px)',
                                                                            value: 'px',
                                                                        },
                                                                    ]}
                                                                    onChange={(value) =>
                                                                        handleUpdateContainerStyle(
                                                                            {
                                                                                max_width_unit:
                                                                                    value,
                                                                            }
                                                                        )
                                                                    }
                                                                />
                                                                <RangeControl
                                                                    label="占位高度（减少 CLS）"
                                                                    min={0}
                                                                    max={800}
                                                                    value={
                                                                        containerStyle.reserve_height ??
                                                                        0
                                                                    }
                                                                    onChange={(value) =>
                                                                        handleUpdateContainerStyle(
                                                                            {
                                                                                reserve_height:
                                                                                    Number(
                                                                                        value
                                                                                    ),
                                                                            }
                                                                        )
                                                                    }
                                                                    help="设置后会为广告预留高度，降低布局抖动。"
                                                                />
                                                            </div>
                                                        );
                                                    }

                                                    if (subTab.name === 'spacing') {
                                                        return (
                                                            <div className="magick-ad-field">
                                                                <p className="magick-ad-field__label">
                                                                    内边距
                                                                </p>
                                                                <div className="magick-ad-image-grid">
                                                                    <RangeControl
                                                                        label="上"
                                                                        min={0}
                                                                        max={80}
                                                                        value={
                                                                            containerStyle.padding_top ??
                                                                            0
                                                                        }
                                                                        onChange={(value) =>
                                                                            handleUpdateContainerStyle(
                                                                                {
                                                                                    padding_top:
                                                                                        Number(
                                                                                            value
                                                                                        ),
                                                                                }
                                                                            )
                                                                        }
                                                                    />
                                                                    <RangeControl
                                                                        label="右"
                                                                        min={0}
                                                                        max={80}
                                                                        value={
                                                                            containerStyle.padding_right ??
                                                                            0
                                                                        }
                                                                        onChange={(value) =>
                                                                            handleUpdateContainerStyle(
                                                                                {
                                                                                    padding_right:
                                                                                        Number(
                                                                                            value
                                                                                        ),
                                                                                }
                                                                            )
                                                                        }
                                                                    />
                                                                    <RangeControl
                                                                        label="下"
                                                                        min={0}
                                                                        max={80}
                                                                        value={
                                                                            containerStyle.padding_bottom ??
                                                                            0
                                                                        }
                                                                        onChange={(value) =>
                                                                            handleUpdateContainerStyle(
                                                                                {
                                                                                    padding_bottom:
                                                                                        Number(
                                                                                            value
                                                                                        ),
                                                                                }
                                                                            )
                                                                        }
                                                                    />
                                                                    <RangeControl
                                                                        label="左"
                                                                        min={0}
                                                                        max={80}
                                                                        value={
                                                                            containerStyle.padding_left ??
                                                                            0
                                                                        }
                                                                        onChange={(value) =>
                                                                            handleUpdateContainerStyle(
                                                                                {
                                                                                    padding_left:
                                                                                        Number(
                                                                                            value
                                                                                        ),
                                                                                }
                                                                            )
                                                                        }
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    if (subTab.name === 'appearance') {
                                                        return (
                                                            <>
                                                                <div className="magick-ad-field">
                                                                    <p className="magick-ad-field__label">
                                                                        背景色
                                                                    </p>
                                                                    <ColorPicker
                                                                        color={
                                                                            containerStyle.background ||
                                                                            'transparent'
                                                                        }
                                                                        onChangeComplete={(
                                                                            value
                                                                        ) =>
                                                                            handleUpdateContainerStyle(
                                                                                {
                                                                                    background:
                                                                                        formatColorValue(
                                                                                            value
                                                                                        ),
                                                                                }
                                                                            )
                                                                        }
                                                                        enableAlpha
                                                                    />
                                                                    <Button
                                                                        variant="tertiary"
                                                                        onClick={() =>
                                                                            handleUpdateContainerStyle(
                                                                                {
                                                                                    background:
                                                                                        'transparent',
                                                                                }
                                                                            )
                                                                        }
                                                                    >
                                                                        清除背景
                                                                    </Button>
                                                                </div>

                                                                <RangeControl
                                                                    label="圆角"
                                                                    min={0}
                                                                    max={50}
                                                                    value={
                                                                        containerStyle.radius ??
                                                                        0
                                                                    }
                                                                    onChange={(value) =>
                                                                        handleUpdateContainerStyle(
                                                                            {
                                                                                radius:
                                                                                    Number(
                                                                                        value
                                                                                    ),
                                                                            }
                                                                        )
                                                                    }
                                                                />

                                                                <SelectControl
                                                                    label="布局"
                                                                    value={
                                                                        containerStyle.layout ||
                                                                        ''
                                                                    }
                                                                    options={[
                                                                        {
                                                                            label: '默认',
                                                                            value: '',
                                                                        },
                                                                        {
                                                                            label: '居中',
                                                                            value: 'centered',
                                                                        },
                                                                    ]}
                                                                    onChange={(value) =>
                                                                        handleUpdateContainerStyle(
                                                                            {
                                                                                layout: value,
                                                                            }
                                                                        )
                                                                    }
                                                                />

                                                                <SelectControl
                                                                    label="阴影"
                                                                    value={
                                                                        containerStyle.shadow ||
                                                                        'none'
                                                                    }
                                                                    options={
                                                                        SHADOW_OPTIONS
                                                                    }
                                                                    onChange={(value) =>
                                                                        handleUpdateContainerStyle(
                                                                            {
                                                                                shadow:
                                                                                    value,
                                                                            }
                                                                        )
                                                                    }
                                                                />
                                                            </>
                                                        );
                                                    }

                                                    return (
                                                        <div className="magick-ad-field">
                                                            <ToggleControl
                                                                label="角标 (Badge)"
                                                                checked={Boolean(
                                                                    containerStyle.badge_enabled
                                                                )}
                                                                onChange={(value) =>
                                                                    handleUpdateContainerStyle(
                                                                        {
                                                                            badge_enabled:
                                                                                value,
                                                                        }
                                                                    )
                                                                }
                                                            />
                                                            {containerStyle.badge_enabled && (
                                                                <>
                                                                    <SelectControl
                                                                        label="角标文案"
                                                                        value={
                                                                            containerStyle.badge_text ||
                                                                            '广告'
                                                                        }
                                                                        options={[
                                                                            {
                                                                                label: '广告',
                                                                                value: '广告',
                                                                            },
                                                                            {
                                                                                label: '推广',
                                                                                value: '推广',
                                                                            },
                                                                        ]}
                                                                        onChange={(
                                                                            value
                                                                        ) =>
                                                                            handleUpdateContainerStyle(
                                                                                {
                                                                                    badge_text:
                                                                                        value,
                                                                                }
                                                                            )
                                                                        }
                                                                    />
                                                                    <p className="magick-ad-field__label">
                                                                        角标颜色
                                                                    </p>
                                                                    <ColorPicker
                                                                        color={
                                                                            containerStyle.badge_color ||
                                                                            '#1d2327'
                                                                        }
                                                                        onChangeComplete={(
                                                                            value
                                                                        ) =>
                                                                            handleUpdateContainerStyle(
                                                                                {
                                                                                    badge_color:
                                                                                        formatColorValue(
                                                                                            value
                                                                                        ),
                                                                                }
                                                                            )
                                                                        }
                                                                        enableAlpha
                                                                    />
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                }}
                                            </TabPanel>
                                        </PanelBody>
                                    </Panel>
                                );
                            }

                            if (tab.name === 'behavior') {
                                return (
                                    <Panel>
                                        <PanelBody
                                            title="交互行为"
                                            initialOpen
                                        >
                                            <SelectControl
                                                label="进场动画"
                                                value={
                                                    behavior.animation || 'none'
                                                }
                                                options={ANIMATION_OPTIONS}
                                                onChange={(value) =>
                                                    handleUpdateBehavior({
                                                        animation: value,
                                                    })
                                                }
                                            />
                                            <ToggleControl
                                                label="显示关闭按钮"
                                                checked={Boolean(
                                                    behavior.close_button
                                                )}
                                                onChange={(value) =>
                                                    handleUpdateBehavior({
                                                        close_button: value,
                                                    })
                                                }
                                            />
                                            <ToggleControl
                                                label="ESC 关闭"
                                                checked={
                                                    behavior.close_on_esc !==
                                                    false
                                                }
                                                onChange={(value) =>
                                                    handleUpdateBehavior({
                                                        close_on_esc: value,
                                                    })
                                                }
                                                help="弹窗/横栏可用"
                                            />
                                            <ToggleControl
                                                label="点击遮罩关闭"
                                                checked={
                                                    behavior.close_on_overlay !==
                                                    false
                                                }
                                                onChange={(value) =>
                                                    handleUpdateBehavior({
                                                        close_on_overlay: value,
                                                    })
                                                }
                                                help="仅弹窗/插屏有效"
                                            />
                                            <ToggleControl
                                                label="打开时锁定滚动"
                                                checked={Boolean(
                                                    behavior.lock_scroll
                                                )}
                                                onChange={(value) =>
                                                    handleUpdateBehavior({
                                                        lock_scroll: value,
                                                    })
                                                }
                                                help="弹窗/插屏可用"
                                            />
                                            <RangeControl
                                                label="延迟显示（秒）"
                                                min={0}
                                                max={30}
                                                value={behavior.delay ?? 0}
                                                onChange={(value) =>
                                                    handleUpdateBehavior({
                                                        delay: Number(value),
                                                    })
                                                }
                                            />
                                            <SelectControl
                                                label="频控策略"
                                                value={
                                                    behavior.frequency_mode ||
                                                    'none'
                                                }
                                                options={[
                                                    {
                                                        label: '不限制',
                                                        value: 'none',
                                                    },
                                                    {
                                                        label: '每会话一次',
                                                        value: 'session',
                                                    },
                                                    {
                                                        label: '每天一次',
                                                        value: 'day',
                                                    },
                                                    {
                                                        label: '最多 N 次',
                                                        value: 'count',
                                                    },
                                                ]}
                                                onChange={(value) =>
                                                    handleUpdateBehavior({
                                                        frequency_mode: value,
                                                    })
                                                }
                                                help="频控仅在前台生效"
                                            />
                                            {behavior.frequency_mode ===
                                                'count' && (
                                                <TextControl
                                                    label="最多展示次数"
                                                    type="number"
                                                    min={1}
                                                    value={
                                                        behavior.frequency_limit ??
                                                        1
                                                    }
                                                    onChange={(value) =>
                                                        handleUpdateBehavior({
                                                            frequency_limit:
                                                                Math.max(
                                                                    1,
                                                                    Number(
                                                                        value ||
                                                                            1
                                                                    )
                                                                ),
                                                        })
                                                    }
                                                />
                                            )}
                                        </PanelBody>
                                    </Panel>
                                );
                            }

                            return (
                                <Panel>
                                    {!isInlineContainer && (
                                        <Notice
                                            status="info"
                                            isDismissible={false}
                                        >
                                            当前容器为“非嵌入”模式，展示位置将固定在页脚输出。
                                        </Notice>
                                    )}
                                    {selectedAd.options?.ad_type ===
                                        'global' && (
                                        <PanelBody
                                            title="展示位置"
                                            initialOpen
                                        >
                                            {showValidation &&
                                                !resolvePlacement(
                                                    selectedAd.options || {}
                                                ).hook && (
                                                    <Notice
                                                        status="error"
                                                        isDismissible={false}
                                                    >
                                                        请先选择展示位置
                                                    </Notice>
                                                )}
                                            <SelectControl
                                                label="展示页面"
                                                value={
                                                    selectedAd.options
                                                        ?.show_page || 'all'
                                                }
                                                options={DISPLAY_PAGE_OPTIONS}
                                                onChange={(value) => {
                                                    const allowedPositions =
                                                        getPositionOptions(
                                                            value
                                                        ).map(
                                                            (option) =>
                                                                option.value
                                                        );
                                                    const currentPlacement =
                                                        resolvePlacement(
                                                            selectedAd.options ||
                                                                {}
                                                        );
                                                    const currentValue =
                                                        placementToSlotValue(
                                                            currentPlacement
                                                        );
                                                    const nextPosition =
                                                        allowedPositions.includes(
                                                            currentValue
                                                        )
                                                            ? currentValue
                                                            : '';
                                                    handleUpdateOptions({
                                                        show_page: value,
                                                        ...slotToPlacementUpdates(
                                                            nextPosition
                                                        ),
                                                    });
                                                }}
                                            />

                                            <SelectControl
                                                label="展示位置"
                                                value={placementToSlotValue(
                                                    resolvePlacement(
                                                        selectedAd.options || {}
                                                    )
                                                )}
                                                className={
                                                    showValidation &&
                                                    !resolvePlacement(
                                                        selectedAd.options || {}
                                                    ).hook
                                                        ? 'magick-ad-control--error'
                                                        : undefined
                                                }
                                                help={
                                                    showValidation &&
                                                    !resolvePlacement(
                                                        selectedAd.options || {}
                                                    ).hook
                                                        ? '请选择展示位置'
                                                        : undefined
                                                }
                                                options={positionOptions}
                                                onChange={(value) =>
                                                    handleUpdateOptions({
                                                        ...slotToPlacementUpdates(
                                                            value
                                                        ),
                                                    })
                                                }
                                                disabled={!isInlineContainer}
                                            />
                                            {resolvePlacement(
                                                selectedAd.options || {}
                                            ).hook === 'head' && (
                                                <Notice
                                                    status="warning"
                                                    isDismissible={false}
                                                >
                                                    Head 位置仅用于脚本/像素/验证标签，
                                                    将直接输出原始内容，不包裹容器。
                                                </Notice>
                                            )}
                                        </PanelBody>
                                    )}

                                    {selectedAd.options?.ad_type ===
                                        'targeted' && (
                                        <PanelBody
                                            title="展示位置"
                                            initialOpen
                                        >
                                            <SelectControl
                                                label="展示类型"
                                                value={
                                                    selectedAd.options
                                                        ?.target_type || ''
                                                }
                                                options={[
                                                    {
                                                        label: '请选择展示类型',
                                                        value: '',
                                                    },
                                                    ...TARGET_TYPE_OPTIONS,
                                                ]}
                                                onChange={(value) => {
                                                    setTargetItems([]);
                                                    setTargetSuggestions([]);
                                                    const allowedPositions =
                                                        value
                                                            ? getPositionOptions(
                                                                  value
                                                              ).map(
                                                                  (option) =>
                                                                      option.value
                                                              )
                                                            : [];
                                                    const nextPosition =
                                                        allowedPositions.includes(
                                                            placementToSlotValue(
                                                                resolvePlacement(
                                                                    selectedAd.options ||
                                                                        {}
                                                                )
                                                            )
                                                        )
                                                            ? placementToSlotValue(
                                                                  resolvePlacement(
                                                                      selectedAd.options ||
                                                                          {}
                                                                  )
                                                              )
                                                            : '';
                                                    handleUpdateOptions({
                                                        target_type: value,
                                                        target_ids: [],
                                                        ...slotToPlacementUpdates(
                                                            nextPosition
                                                        ),
                                                    });
                                                }}
                                            />

                                            <SelectControl
                                                label="展示位置"
                                                value={placementToSlotValue(
                                                    resolvePlacement(
                                                        selectedAd.options || {}
                                                    )
                                                )}
                                                className={
                                                    showValidation &&
                                                    !resolvePlacement(
                                                        selectedAd.options || {}
                                                    ).hook
                                                        ? 'magick-ad-control--error'
                                                        : undefined
                                                }
                                                help={
                                                    showValidation &&
                                                    !resolvePlacement(
                                                        selectedAd.options || {}
                                                    ).hook
                                                        ? '请选择展示位置'
                                                        : undefined
                                                }
                                                options={targetPositionOptions}
                                                onChange={(value) =>
                                                    handleUpdateOptions({
                                                        ...slotToPlacementUpdates(
                                                            value
                                                        ),
                                                    })
                                                }
                                                disabled={
                                                    !selectedAd.options
                                                        ?.target_type ||
                                                    !isInlineContainer
                                                }
                                            />
                                            {resolvePlacement(
                                                selectedAd.options || {}
                                            ).hook === 'head' && (
                                                <Notice
                                                    status="warning"
                                                    isDismissible={false}
                                                >
                                                    Head 位置仅用于脚本/像素/验证标签，
                                                    将直接输出原始内容，不包裹容器。
                                                </Notice>
                                            )}

                                            <FormTokenField
                                                label="展示页面"
                                                value={targetItems.map(
                                                    (item) => item.label
                                                )}
                                                suggestions={targetSuggestions.map(
                                                    (item) => item.label
                                                )}
                                                onInputChange={handleTargetSearch}
                                                onFocus={() =>
                                                    handleTargetSearch('')
                                                }
                                                __experimentalExpandOnFocus
                                                onChange={(tokens) => {
                                                    const tokenMap = new Map();
                                                    targetItems.forEach(
                                                        (item) => {
                                                            tokenMap.set(
                                                                item.label,
                                                                item
                                                            );
                                                        }
                                                    );
                                                    targetSuggestions.forEach(
                                                        (item) => {
                                                            tokenMap.set(
                                                                item.label,
                                                                item
                                                            );
                                                        }
                                                    );
                                                    const nextItems = tokens
                                                        .map((token) =>
                                                            tokenMap.get(
                                                                token
                                                            )
                                                        )
                                                        .filter(Boolean);
                                                    setTargetItems(nextItems);
                                                    handleUpdateOptions({
                                                        target_ids: nextItems.map(
                                                            (item) => item.id
                                                        ),
                                                    });
                                                }}
                                                placeholder={
                                                    selectedAd.options
                                                        ?.target_type
                                                        ? '输入关键词搜索并选择'
                                                        : '请先选择展示类型'
                                                }
                                                disabled={
                                                    !selectedAd.options
                                                        ?.target_type
                                                }
                                            />
                                            {targetLoading && (
                                                <div className="magick-ad-inline-loading">
                                                    <Spinner />
                                                    <span>正在加载列表…</span>
                                                </div>
                                            )}
                                            {!selectedAd.options?.target_type && (
                                                <Notice
                                                    status="info"
                                                    isDismissible={false}
                                                >
                                                    请选择展示类型后再选择具体页面与展示位置。
                                                </Notice>
                                            )}
                                        </PanelBody>
                                    )}

                                    <PanelBody title="展示规则" initialOpen>
                                        <SelectControl
                                            label="是否展示"
                                            value={
                                                selectedAd.options
                                                    ?.display_mode || 'show'
                                            }
                                            options={[
                                                { label: '展示', value: 'show' },
                                                { label: '随机', value: 'random' },
                                                { label: '隐藏', value: 'hide' },
                                            ]}
                                            onChange={(value) =>
                                                handleUpdateOptions({
                                                    display_mode: value,
                                                })
                                            }
                                            help="随机：每次页面请求随机展示或隐藏"
                                        />
                                        {selectedAd.options?.display_mode ===
                                            'random' && (
                                            <SelectControl
                                                label="随机策略"
                                                value={
                                                    selectedAd.options
                                                        ?.random_strategy ||
                                                    'request'
                                                }
                                                options={[
                                                    {
                                                        label: '无 Cookie（每次请求随机）',
                                                        value: 'request',
                                                    },
                                                    {
                                                        label: '会话级（sessionStorage）',
                                                        value: 'session',
                                                    },
                                                    {
                                                        label: '持久级（Cookie，需要同意）',
                                                        value: 'cookie',
                                                    },
                                                ]}
                                                onChange={(value) =>
                                                    handleUpdateOptions({
                                                        random_strategy:
                                                            value,
                                                    })
                                                }
                                                help="持久级策略需要站点同意逻辑支持，否则会回退为无 Cookie 模式。"
                                            />
                                        )}

                                        <TextControl
                                            label="截止时间"
                                            type="date"
                                            value={
                                                selectedAd.options?.end_date ||
                                                ''
                                            }
                                            onChange={(value) =>
                                                handleUpdateOptions({
                                                    end_date: value,
                                                })
                                            }
                                            help="到期后自动隐藏广告"
                                        />

                                        <SelectControl
                                            label="设备限制"
                                            value={
                                                selectedAd.options?.device ||
                                                'all'
                                            }
                                            options={[
                                                { label: '全部设备', value: 'all' },
                                                {
                                                    label: '仅移动端',
                                                    value: 'mobile',
                                                },
                                                {
                                                    label: '仅平板端',
                                                    value: 'tablet',
                                                },
                                                {
                                                    label: '仅桌面端',
                                                    value: 'desktop',
                                                },
                                            ]}
                                            onChange={(value) =>
                                                handleUpdateOptions({
                                                    device: value,
                                                })
                                            }
                                        />

                                        <SelectControl
                                            label="登录状态"
                                            value={
                                                selectedAd.options?.login ||
                                                'all'
                                            }
                                            options={[
                                                { label: '全部用户', value: 'all' },
                                                {
                                                    label: '仅登录用户',
                                                    value: 'logged-in',
                                                },
                                                {
                                                    label: '仅未登录用户',
                                                    value: 'logged-out',
                                                },
                                            ]}
                                            onChange={(value) =>
                                                handleUpdateOptions({
                                                    login: value,
                                                })
                                            }
                                        />
                                    </PanelBody>
                                </Panel>
                            );
                        }}
                    </TabPanel>
                    )}
                    {effectiveEditorMode === 'expert' && (
                        <Panel>
                            <PanelBody title="专家模式：自定义代码" initialOpen>
                                <Notice status="warning" isDismissible={false}>
                                    自定义代码仅建议高级用户使用，可能影响站点安全与稳定性。
                                </Notice>
                                <TextareaControl
                                    label="自定义 CSS"
                                    value={
                                        selectedAd.content?.custom_css || ''
                                    }
                                    onChange={(value) =>
                                        handleUpdateContent({
                                            custom_css: value,
                                        })
                                    }
                                    help="会直接输出为 style 标签。"
                                />
                                <TextareaControl
                                    label="自定义 HTML（追加）"
                                    value={
                                        selectedAd.content?.custom_html || ''
                                    }
                                    onChange={(value) =>
                                        handleUpdateContent({
                                            custom_html: value,
                                        })
                                    }
                                    help="会追加在广告内容之后。"
                                />
                            </PanelBody>
                        </Panel>
                    )}
                </CardBody>
            </Card>

        </div>
    ) : (
        <Card>
            <CardBody>
                <Notice status="info" isDismissible={false}>
                    请先选择一个广告组。
                </Notice>
            </CardBody>
        </Card>
    );

    return (
        <div className="magick-ad-config">
            <div className="magick-ad-header">
                <div>
                    <h1>{branding.name}</h1>
                    <p className="description">{branding.tagline}</p>
                </div>
            </div>

            {notice && (
                <Notice
                    status={notice.status}
                    isDismissible
                    onRemove={clearNotice}
                >
                    {notice.message}
                </Notice>
            )}

            {isLoading && <Notice status="info">正在加载配置…</Notice>}
            {error && (
                <Notice status="error" isDismissible>
                    {error.message || '请求失败'}
                </Notice>
            )}

            <Layout
                adData={selectedAd}
                creativeType={selectedAd?.options?.creative_type || 'image'}
                containerType={selectedAd?.options?.container_type || 'inline'}
                devicePreview={devicePreview}
                onCreativeChange={(value) =>
                    selectedAd && handleUpdateOptions({ creative_type: value })
                }
                onContainerChange={(value) => {
                    if (!selectedAd) {
                        return;
                    }
                    if (value !== 'inline') {
                        handleUpdateOptions({
                            container_type: value,
                            placement_hook: 'footer',
                            placement_position: '',
                            placement_paragraph: 0,
                        });
                        return;
                    }
                    handleUpdateOptions({
                        container_type: value,
                    });
                }}
                onDevicePreviewChange={setDevicePreview}
            onUpdateRule={(key, value) =>
                selectedAd && handleUpdateOptions({ [key]: value })
            }
            contentHeader={contentHeader}
            leftSidebar={leftSidebar}
            rightSidebar={rightSidebar}
            contentPanels={contentPanels}
            />

            <TemplateLibraryModal
                isOpen={templateModalOpen}
                type={templateType}
                templates={templateLibrary}
                selected={templateSelection}
                categories={templateCategories}
                onUpdateCategories={updateTemplateCategories}
                favoriteIds={favoriteIds}
                pinnedIds={pinnedIds}
                onAddCategory={addTemplateCategory}
                onRemoveCategory={removeTemplateCategory}
                onToggleSelect={handleToggleTemplateSelect}
                onToggleFavorite={toggleFavorite}
                onTogglePinned={togglePinned}
                onBulkFavorite={bulkFavorite}
                onBulkPinned={bulkPinned}
                onClearFavorites={clearFavorites}
                onClearPins={clearPins}
                onRestorePreferences={restorePreferences}
                onApply={handleApplyTemplate}
                onImport={handleImportTemplates}
                onExport={handleExportTemplates}
                onClose={() => setTemplateModalOpen(false)}
            />

            <BuildProbe />

            {saveTemplateOpen && (
                <Modal
                    title="存为模板"
                    onRequestClose={() => setSaveTemplateOpen(false)}
                    className="magick-ad-rename-modal"
                >
                    <TextControl
                        label="模板名称"
                        value={saveTemplateName}
                        onChange={setSaveTemplateName}
                        placeholder="请输入模板名称"
                    />
                    <SelectControl
                        label="模板分类"
                        value={saveTemplateCategory || 'uncategorized'}
                        options={[
                            { label: '未分类', value: 'uncategorized' },
                            ...(templateCategories || []).map((item) => ({
                                label: item.name,
                                value: item.name,
                            })),
                            { label: '新建分类…', value: 'new' },
                        ]}
                        onChange={(value) => {
                            setSaveTemplateCategory(value);
                            if (value !== 'new') {
                                setSaveTemplateCategoryName('');
                            }
                        }}
                    />
                    {saveTemplateCategory === 'new' && (
                        <TextControl
                            label="新建分类名称"
                            value={saveTemplateCategoryName}
                            onChange={setSaveTemplateCategoryName}
                            placeholder="输入分类名称"
                        />
                    )}
                    <div className="magick-ad-confirm-actions">
                        <Button
                            variant="secondary"
                            onClick={() => setSaveTemplateOpen(false)}
                        >
                            取消
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirmSaveTemplate}
                        >
                            保存模板
                        </Button>
                    </div>
                </Modal>
            )}

            {deleteTarget && (
                <Modal
                    title="确认删除广告组"
                    onRequestClose={() => setDeleteTarget(null)}
                    className="magick-ad-confirm-modal"
                >
                    <p>
                        确认删除“{deleteTarget.name || '未命名广告组'}”吗？
                        删除后无法恢复。
                    </p>
                    <div className="magick-ad-confirm-actions">
                        <Button
                            variant="secondary"
                            onClick={() => setDeleteTarget(null)}
                        >
                            取消
                        </Button>
                        <Button
                            variant="primary"
                            isDestructive
                            onClick={() => {
                                const targetId = deleteTarget.id;
                                setDeleteTarget(null);
                                removeAdGroup(targetId);
                                if (selectedId === targetId) {
                                    setSelectedId(null);
                                }
                                saveToDB()
                                    .then(() => {
                                        showNotice(
                                            'success',
                                            '广告组已删除',
                                            2000
                                        );
                                    })
                                    .catch((err) => {
                                        const message =
                                            err?.data?.message ||
                                            err?.message ||
                                            '删除失败，请检查网络或权限设置。';
                                        showNotice('error', message, 4000);
                                        fetchFromDB();
                                    });
                            }}
                        >
                            确认删除
                        </Button>
                    </div>
                </Modal>
            )}

            {renameTarget && (
                <Modal
                    title="修改广告名称"
                    onRequestClose={() => setRenameTarget(null)}
                    className="magick-ad-rename-modal"
                >
                    <TextControl
                        label="广告名称"
                        value={renameValue}
                        onChange={setRenameValue}
                        placeholder="请输入广告名称"
                    />
                    <div className="magick-ad-confirm-actions">
                        <Button
                            variant="secondary"
                            onClick={() => setRenameTarget(null)}
                        >
                            取消
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                const targetId = renameTarget.id;
                                updateAdGroup(targetId, {
                                    name: renameValue.trim(),
                                });
                                setRenameTarget(null);
                                saveToDB()
                                    .then(() => {
                                        showNotice('success', '名称已更新', 2000);
                                    })
                                    .catch((err) => {
                                        const message =
                                            err?.data?.message ||
                                            err?.message ||
                                            '保存失败，请检查网络或权限设置。';
                                        showNotice('error', message, 4000);
                                    });
                            }}
                        >
                            保存
                        </Button>
                    </div>
                </Modal>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

        </div>
    );
};
export default AdsConfig;
