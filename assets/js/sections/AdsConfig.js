import { useEffect, useMemo, useState } from '@wordpress/element';
import {
    Button,
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
    ToggleControl,
} from '@wordpress/components';
import { useStore } from '../store';
import Layout from '../Layout';
import ImagePicker from '../components/ImagePicker';
import LinkPicker from '../components/LinkPicker';
import ClassicEditor from '../components/ClassicEditor';
import BlockEditor from '../components/BlockEditor';
import TemplateLibraryModal from '../components/TemplateLibraryModal';
import TemplateActions from '../components/TemplateActions';
import DebugPanel from '../panels/DebugPanel';
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
        if (ads.every((ad) => ad.options?.show_position)) {
            setShowValidation(false);
        }
    }, [ads, showValidation]);

    const selectedAd = useMemo(
        () => ads.find((ad) => ad.id === selectedId),
        [ads, selectedId]
    );

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

    const missingPositionIds = useMemo(() => {
        return new Set(
            ads.filter((ad) => !ad.options?.show_position).map((ad) => ad.id)
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
        handleUpdateOptions({ creative_type: template.type });
        handleUpdateContent(template.data || {});
    };

    const {
        templateModalOpen,
        templateType,
        templateLibrary,
        templateSelection,
        fileInputRef,
        setTemplateModalOpen,
        openTemplateLibrary,
        handleSaveTemplate,
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

        const missingPosition = ads.filter(
            (ad) => !ad.options?.show_position
        );
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

    const leftSidebar = (
        <div className="magick-ad-left-stack">
            <Card>
                <CardBody>
                    <div className="magick-ad-sidebar__header">
                        <h2>广告组</h2>
                        <DropdownMenu
                            className="magick-ad-add-menu"
                            icon={null}
                            text="新增广告组"
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
                    </div>
                    {ads.length === 0 && (
                        <p className="description">暂无广告组。</p>
                    )}
                    <nav className="magick-ad-sidebar__list">
                        {ads.map((ad, index) => (
                            <div
                                key={ad.id}
                                className={`magick-ad-sidebar__item ${
                                    selectedId === ad.id ? 'is-active' : ''
                                } ${
                                    missingPositionIds.has(ad.id)
                                        ? 'has-error'
                                        : ''
                                }`}
                            >
                                <Button
                                    variant="tertiary"
                                    onClick={() => setSelectedId(ad.id)}
                                    aria-current={
                                        selectedId === ad.id ? 'true' : undefined
                                    }
                                    className="magick-ad-sidebar__main"
                                >
                                    <span className="magick-ad-sidebar__text">
                                        <span className="magick-ad-sidebar__title">
                                            {ad.name || `广告组 ${index + 1}`}
                                        </span>
                                        <span className="magick-ad-type">
                                            {ad.options?.ad_type === 'targeted'
                                                ? '指定广告'
                                                : '全局广告'}
                                        </span>
                                    </span>
                                    {missingPositionIds.has(ad.id) && (
                                        <span className="magick-ad-sidebar__alert">
                                            <span className="magick-ad-sidebar__dot" />
                                            需配置位置
                                        </span>
                                    )}
                                </Button>
                                <Button
                                    variant="tertiary"
                                    isDestructive
                                    className="magick-ad-delete-btn"
                                    onClick={() => setDeleteTarget(ad)}
                                >
                                    删除
                                </Button>
                            </div>
                        ))}
                    </nav>
                </CardBody>
            </Card>
            <DebugPanel onNotice={showNotice} />
        </div>
    );

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
                                    <TemplateActions
                                        onOpen={() =>
                                            openTemplateLibrary('image')
                                        }
                                        onSave={() =>
                                            handleSaveTemplate('image')
                                        }
                                    />
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
                                    <TemplateActions
                                        onOpen={() =>
                                            openTemplateLibrary('html')
                                        }
                                        onSave={() =>
                                            handleSaveTemplate('html')
                                        }
                                    />
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
                                        <TemplateActions
                                            onOpen={() =>
                                                openTemplateLibrary('video')
                                            }
                                            onSave={() =>
                                                handleSaveTemplate('video')
                                            }
                                        />
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
                                    <TemplateActions
                                        onOpen={() =>
                                            openTemplateLibrary('block')
                                        }
                                        onSave={() =>
                                            handleSaveTemplate('block')
                                        }
                                    />
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
                    <Panel>
                        <PanelBody title="基础信息" initialOpen>
                            <TextControl
                                label="广告名称"
                                value={selectedAd.name || ''}
                                onChange={(value) =>
                                    updateAdGroup(selectedAd.id, {
                                        name: value,
                                    })
                                }
                            />
                            <ToggleControl
                                label="启用此广告"
                                checked={selectedAd?.options?.enabled ?? true}
                                onChange={(value) =>
                                    handleUpdateOptions({ enabled: value })
                                }
                            />
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                isBusy={isSaving}
                                disabled={isSaving}
                            >
                                {isSaving ? '保存中...' : '保存'}
                            </Button>
                        </PanelBody>
                    </Panel>
                </CardBody>
            </Card>

            <Card>
                <CardBody>
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
                                            <SelectControl
                                                label="容器类型"
                                                value={
                                                    selectedAd.options
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
                                                    const nextPosition =
                                                        value !== 'inline'
                                                            ? 'footer'
                                                            : selectedAd
                                                                  .options
                                                                  ?.show_position;
                                                    handleUpdateOptions({
                                                        container_type: value,
                                                        show_position:
                                                            nextPosition ||
                                                            'footer',
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

                                            {containerStyle.mode === 'raw' ? (
                                                <Notice
                                                    status="info"
                                                    isDismissible={false}
                                                >
                                                    原始模式不会应用容器样式。
                                                </Notice>
                                            ) : (
                                                <>
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
                                                    </div>

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
                                                        options={SHADOW_OPTIONS}
                                                        onChange={(value) =>
                                                            handleUpdateContainerStyle(
                                                                {
                                                                    shadow:
                                                                        value,
                                                                }
                                                            )
                                                        }
                                                    />

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
                                                </>
                                            )}
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
                                                !selectedAd.options
                                                    ?.show_position && (
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
                                                    const nextPosition =
                                                        allowedPositions.includes(
                                                            selectedAd.options
                                                                ?.show_position
                                                        )
                                                            ? selectedAd
                                                                  .options
                                                                  ?.show_position
                                                            : '';
                                                    handleUpdateOptions({
                                                        show_page: value,
                                                        show_position:
                                                            nextPosition,
                                                    });
                                                }}
                                            />

                                            <SelectControl
                                                label="展示位置"
                                                value={
                                                    selectedAd.options
                                                        ?.show_position || ''
                                                }
                                                className={
                                                    showValidation &&
                                                    !selectedAd.options
                                                        ?.show_position
                                                        ? 'magick-ad-control--error'
                                                        : undefined
                                                }
                                                help={
                                                    showValidation &&
                                                    !selectedAd.options
                                                        ?.show_position
                                                        ? '请选择展示位置'
                                                        : undefined
                                                }
                                                options={positionOptions}
                                                onChange={(value) =>
                                                    handleUpdateOptions({
                                                        show_position: value,
                                                    })
                                                }
                                                disabled={!isInlineContainer}
                                            />
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
                                                            selectedAd.options
                                                                ?.show_position
                                                        )
                                                            ? selectedAd
                                                                  .options
                                                                  ?.show_position
                                                            : '';
                                                    handleUpdateOptions({
                                                        target_type: value,
                                                        target_ids: [],
                                                        show_position:
                                                            nextPosition,
                                                    });
                                                }}
                                            />

                                            <SelectControl
                                                label="展示位置"
                                                value={
                                                    selectedAd.options
                                                        ?.show_position || ''
                                                }
                                                className={
                                                    showValidation &&
                                                    !selectedAd.options
                                                        ?.show_position
                                                        ? 'magick-ad-control--error'
                                                        : undefined
                                                }
                                                help={
                                                    showValidation &&
                                                    !selectedAd.options
                                                        ?.show_position
                                                        ? '请选择展示位置'
                                                        : undefined
                                                }
                                                options={targetPositionOptions}
                                                onChange={(value) =>
                                                    handleUpdateOptions({
                                                        show_position: value,
                                                    })
                                                }
                                                disabled={
                                                    !selectedAd.options
                                                        ?.target_type ||
                                                    !isInlineContainer
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
                    <h1>Magick AD</h1>
                    <p className="description">广告配置与投放规则管理</p>
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
                    const nextPosition =
                        value !== 'inline' ? 'footer' : selectedAd.options?.show_position;
                    handleUpdateOptions({
                        container_type: value,
                        show_position: nextPosition || 'footer',
                    });
                }}
                onDevicePreviewChange={setDevicePreview}
                onUpdateRule={(key, value) =>
                    selectedAd && handleUpdateOptions({ [key]: value })
                }
                leftSidebar={leftSidebar}
                rightSidebar={rightSidebar}
                contentPanels={contentPanels}
            />

            <TemplateLibraryModal
                isOpen={templateModalOpen}
                type={templateType}
                templates={templateLibrary}
                selected={templateSelection}
                onToggleSelect={handleToggleTemplateSelect}
                onApply={handleApplyTemplate}
                onImport={handleImportTemplates}
                onExport={handleExportTemplates}
                onClose={() => setTemplateModalOpen(false)}
            />

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
                            }}
                        >
                            确认删除
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
