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
import { desktop, tablet, mobile, video, image, code } from '@wordpress/icons';

const previewIcons = {
    desktop,
    tablet,
    mobile,
};

const Layout = ({
    adData = {},
    adType = 'image',
    devicePreview = 'desktop',
    onAdTypeChange,
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
                title: 'HTML广告',
                icon: code,
                onClick: () => onAdTypeChange?.('html'),
                isActive: adType === 'html',
            },
            {
                title: '图片广告',
                icon: image,
                onClick: () => onAdTypeChange?.('image'),
                isActive: adType === 'image',
            },
            {
                title: '视频广告',
                icon: video,
                onClick: () => onAdTypeChange?.('video'),
                isActive: adType === 'video',
            },
            {
                title: '弹窗广告',
                onClick: () => onAdTypeChange?.('popup'),
                isActive: adType === 'popup',
            },
            {
                title: '横栏广告',
                onClick: () => onAdTypeChange?.('bar'),
                isActive: adType === 'bar',
            },
        ],
        [adType, onAdTypeChange]
    );

    const previewBody = useMemo(() => {
        const content = adData?.content || {};
        if (adType === 'html' && content.html) {
            const containerStyle = content.container_style || {};
            if (containerStyle.mode === 'raw') {
                return (
                    <div
                        className="magick-ad-preview__html"
                        dangerouslySetInnerHTML={{ __html: content.html }}
                    />
                );
            }
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
                        <div
                            className="magick-ad-html-content"
                            dangerouslySetInnerHTML={{
                                __html: content.html,
                            }}
                        />
                    </div>
                </div>
            );
        }
        if (adType === 'image' && content.image?.url) {
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

            if (content.link) {
                return (
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
                );
            }
            return (
                imageNode
            );
        }
        return <div className="magick-ad-preview__empty">预览区域</div>;
    }, [adData, adType]);

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
                            <Button variant="secondary">新增广告组</Button>
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
                                    label="广告类型"
                                    controls={adTypeControls}
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
