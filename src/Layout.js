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
            return (
                <div
                    className="magick-ad-preview__html"
                    dangerouslySetInnerHTML={{ __html: content.html }}
                />
            );
        }
        if (adType === 'image' && content.image?.url) {
            return (
                <img
                    src={content.image.url}
                    alt={content.image.alt || ''}
                />
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
