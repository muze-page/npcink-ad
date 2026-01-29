import { useMemo } from '@wordpress/element';
import {
    Button,
    Card,
    CardBody,
    Panel,
    PanelBody,
    SelectControl,
    Toolbar,
    ToolbarButton,
    ToolbarDropdownMenu,
    ToolbarGroup,
} from '@wordpress/components';
import {
    desktop,
    tablet,
    mobile,
    video,
    image,
    code,
    layout,
} from '@wordpress/icons';

const previewIcons = {
    desktop,
    tablet,
    mobile,
};

const Layout = ({
    adData = {},
    creativeType = 'image',
    containerType = 'inline',
    devicePreview = 'desktop',
    onCreativeChange,
    onContainerChange,
    onDevicePreviewChange,
    onUpdateRule,
    leftSidebar,
    rightSidebar,
    contentPanels,
    preview,
}) => {
    const adTypeControls = useMemo(
        () => [
            {
                title: '代码 / HTML',
                icon: code,
                onClick: () => onCreativeChange?.('html'),
                isActive: creativeType === 'html',
            },
            {
                title: '图片',
                icon: image,
                onClick: () => onCreativeChange?.('image'),
                isActive: creativeType === 'image',
            },
            {
                title: '视频',
                icon: video,
                onClick: () => onCreativeChange?.('video'),
                isActive: creativeType === 'video',
            },
            {
                title: '可视化设计 (Block)',
                onClick: () => onCreativeChange?.('block'),
                isActive: creativeType === 'block',
            },
        ],
        [creativeType, onCreativeChange]
    );

    const containerControls = useMemo(
        () => [
            {
                title: '默认嵌入',
                onClick: () => onContainerChange?.('inline'),
                isActive: containerType === 'inline',
            },
            {
                title: '弹窗',
                onClick: () => onContainerChange?.('popup'),
                isActive: containerType === 'popup',
            },
            {
                title: '吸顶/吸底横栏',
                onClick: () => onContainerChange?.('banner'),
                isActive: containerType === 'banner',
            },
            {
                title: '角落悬浮',
                onClick: () => onContainerChange?.('floating'),
                isActive: containerType === 'floating',
            },
            {
                title: '全屏插屏',
                onClick: () => onContainerChange?.('interstitial'),
                isActive: containerType === 'interstitial',
            },
        ],
        [containerType, onContainerChange]
    );

    const previewBody = useMemo(() => {
        const content = adData?.content || {};
        const options = adData?.options || {};
        const containerStyle = content.container_style || {};
        const behavior = content.behavior || {};
        const wrapperStyle = {};
        if (containerStyle.max_width) {
            wrapperStyle.maxWidth = `${containerStyle.max_width}${containerStyle.max_width_unit || '%'}`;
            if (containerStyle.max_width_unit === 'px') {
                wrapperStyle.width = '100%';
            }
        }
        if (
            containerStyle.padding_top ||
            containerStyle.padding_right ||
            containerStyle.padding_bottom ||
            containerStyle.padding_left
        ) {
            wrapperStyle.padding = `${containerStyle.padding_top || 0}px ${containerStyle.padding_right || 0}px ${containerStyle.padding_bottom || 0}px ${containerStyle.padding_left || 0}px`;
        }
        if (containerStyle.background && containerStyle.background !== 'transparent') {
            wrapperStyle.background = containerStyle.background;
        }
        if (containerStyle.radius) {
            wrapperStyle.borderRadius = `${containerStyle.radius}px`;
        }
        if (containerStyle.shadow === 'soft') {
            wrapperStyle.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.08)';
        } else if (containerStyle.shadow === 'float') {
            wrapperStyle.boxShadow = '0 16px 28px rgba(0, 0, 0, 0.16)';
        }
        if (containerStyle.layout === 'centered') {
            wrapperStyle.display = 'flex';
            wrapperStyle.justifyContent = 'center';
            wrapperStyle.marginLeft = 'auto';
            wrapperStyle.marginRight = 'auto';
        }

        const wrapContent = (inner) => {
            if (containerStyle.mode === 'raw') {
                return inner;
            }
            return (
                <div className="magick-ad-preview__html">
                    <div
                        className="magick-ad-html-container"
                        style={wrapperStyle}
                    >
                        {containerStyle.badge_enabled && (
                            <span
                                className="magick-ad-badge"
                                style={{
                                    background:
                                        containerStyle.badge_color ||
                                        '#1d2327',
                                }}
                            >
                                {containerStyle.badge_text || '广告'}
                            </span>
                        )}
                        {content.behavior?.close_button && (
                            <span className="magick-ad-close">×</span>
                        )}
                        <div className="magick-ad-html-content">
                            {inner}
                        </div>
                    </div>
                </div>
            );
        };

        let inner = null;
        if (creativeType === 'html' && content.html) {
            inner = (
                <div
                    dangerouslySetInnerHTML={{ __html: content.html }}
                />
            );
        } else if (creativeType === 'image' && content.image?.url) {
            const settings = content.image_settings || {};
            const imageStyle = {};
            if (settings.radius) {
                imageStyle.borderRadius = `${settings.radius}px`;
            }
            if (settings.max_width) {
                imageStyle.maxWidth = `${settings.max_width}px`;
                imageStyle.width = '100%';
            }
            if (settings.margin_top) {
                imageStyle.marginTop = `${settings.margin_top}px`;
            }
            if (settings.margin_bottom) {
                imageStyle.marginBottom = `${settings.margin_bottom}px`;
            }
            if (settings.margin_left) {
                imageStyle.marginLeft = `${settings.margin_left}px`;
            }
            if (settings.margin_right) {
                imageStyle.marginRight = `${settings.margin_right}px`;
            }

            const imageNode = (
                <img
                    src={content.image.url}
                    alt={content.image.alt || ''}
                    style={imageStyle}
                />
            );

            const wrappedImage = content.link ? (
                <a
                    href={content.link}
                    target={content.link_target ? '_blank' : undefined}
                    rel={
                        content.link_target
                            ? 'noopener noreferrer'
                            : undefined
                    }
                >
                    {imageNode}
                </a>
            ) : (
                imageNode
            );

            inner = wrappedImage;
        } else if (creativeType === 'video' && content.video_url) {
            inner = (
                <video
                    className="magick-ad-preview__video"
                    controls
                    src={content.video_url}
                />
            );
        } else if (creativeType === 'block' && content.blocks) {
            inner = (
                <div
                    dangerouslySetInnerHTML={{
                        __html: content.blocks,
                    }}
                />
            );
        }

        if (!inner) {
            return <div className="magick-ad-preview__empty">预览区域</div>;
        }

        const displayMode = options.display_mode || 'show';
        if (displayMode === 'hide') {
            return (
                <div className="magick-ad-preview__empty">
                    当前设置为“隐藏”，前台将不展示该广告。
                </div>
            );
        }

        const wrapped = wrapContent(inner);
        const animation = behavior.animation || 'none';
        const delay = behavior.delay ?? 0;
        const animationClass =
            animation && animation !== 'none'
                ? `magick-ad-anim--${animation}`
                : '';
        const unitStyle =
            delay > 0 ? { animationDelay: `${delay}s` } : undefined;

        const placementParts = [];
        if (options.ad_type === 'targeted') {
            placementParts.push(options.target_type || '未选择类型');
        } else {
            placementParts.push(options.show_page || 'all');
        }
        if (options.show_position) {
            placementParts.push(options.show_position);
        }
        if (displayMode === 'random') {
            placementParts.unshift('随机');
        } else {
            placementParts.unshift('展示');
        }

        return (
            <div
                className={`magick-ad-preview__stage magick-ad-preview__stage--${containerType}`}
            >
                {(containerType === 'popup' ||
                    containerType === 'interstitial') && (
                    <div className="magick-ad-preview__overlay" />
                )}
                <div
                    className={`magick-ad-preview__unit magick-ad-preview__unit--${containerType} ${animationClass}`}
                    style={unitStyle}
                >
                    {wrapped}
                </div>
                <div className="magick-ad-preview__placement">
                    {placementParts.join(' · ')}
                    {delay > 0 && ` · 延迟${delay}s`}
                </div>
            </div>
        );
    }, [adData, creativeType, containerType]);

    return (
        <div className="magick-ad-layout">
            <aside className="magick-ad-left">
                {leftSidebar || (
                    <Card>
                        <CardBody>
                            <h3 className="magick-ad-section-title">
                                广告列表
                            </h3>
                            <div className="magick-ad-list">
                                左侧列表区域
                            </div>
                            <Button variant="secondary">新增</Button>
                        </CardBody>
                    </Card>
                )}
            </aside>

            <main className="magick-ad-main">
                <Card>
                    <CardBody>
                        <Toolbar className="magick-ad-toolbar">
                            <ToolbarGroup>
                                <ToolbarDropdownMenu
                                    icon={adTypeControls.find(
                                        (item) => item.isActive
                                    )?.icon}
                                    label="素材类型"
                                    controls={adTypeControls}
                                />
                            </ToolbarGroup>
                            <ToolbarGroup>
                                <ToolbarDropdownMenu
                                    icon={layout}
                                    label="容器类型"
                                    controls={containerControls}
                                />
                            </ToolbarGroup>
                            <ToolbarGroup>
                                {['desktop', 'tablet', 'mobile'].map(
                                    (device) => (
                                        <ToolbarButton
                                            key={device}
                                            icon={previewIcons[device]}
                                            isPressed={
                                                devicePreview === device
                                            }
                                            onClick={() =>
                                                onDevicePreviewChange?.(device)
                                            }
                                        />
                                    )
                                )}
                            </ToolbarGroup>
                        </Toolbar>

                        <div className="magick-ad-editor">
                            <div className="magick-ad-editor-left">
                                {contentPanels || (
                                    <Panel>
                                        <PanelBody title="内容配置" initialOpen>
                                            内容配置区域
                                        </PanelBody>
                                        <PanelBody title="样式自定义">
                                            样式自定义区域
                                        </PanelBody>
                                        <PanelBody title="动画设置">
                                            动画设置区域
                                        </PanelBody>
                                    </Panel>
                                )}
                            </div>
                            <div className="magick-ad-editor-preview">
                                <div className="magick-ad-preview">
                                    {preview || previewBody}
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </main>

            <aside className="magick-ad-right">
                {rightSidebar || (
                    <Card>
                        <CardBody>
                            <h3 className="magick-ad-section-title">
                                投放规则
                            </h3>
                            <div className="magick-ad-rule-block">
                                <SelectControl
                                    label="展示页面"
                                    value={adData?.options?.show_page || 'all'}
                                    options={[
                                        { label: '全站', value: 'all' },
                                        { label: '仅首页', value: 'home' },
                                        { label: '仅文章页', value: 'posts' },
                                        { label: '仅单页', value: 'pages' },
                                    ]}
                                    onChange={(value) =>
                                        onUpdateRule?.('show_page', value)
                                    }
                                />
                            </div>
                            <div className="magick-ad-rule-block">
                                <SelectControl
                                    label="设备限制"
                                    value={adData?.options?.device || 'all'}
                                    options={[
                                        { label: '全部设备', value: 'all' },
                                        { label: '仅移动端', value: 'mobile' },
                                        { label: '仅桌面端', value: 'desktop' },
                                    ]}
                                    onChange={(value) =>
                                        onUpdateRule?.('device', value)
                                    }
                                />
                            </div>
                            <div className="magick-ad-rule-block">
                                <SelectControl
                                    label="展示位置"
                                    value={
                                        adData?.options?.show_position ||
                                        'bottom'
                                    }
                                    options={[
                                        { label: '顶部', value: 'top' },
                                        {
                                            label: '内容前',
                                            value: 'content_before',
                                        },
                                        {
                                            label: '内容后',
                                            value: 'content_after',
                                        },
                                        { label: '底部', value: 'bottom' },
                                    ]}
                                    onChange={(value) =>
                                        onUpdateRule?.('show_position', value)
                                    }
                                />
                            </div>
                        </CardBody>
                    </Card>
                )}
            </aside>
        </div>
    );
};

export default Layout;
