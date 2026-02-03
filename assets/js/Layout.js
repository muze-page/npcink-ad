import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import {
    Button,
    Card,
    CardBody,
    Panel,
    PanelBody,
    SelectControl,
    Toolbar,
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
    fullscreen,
    closeSmall,
    chevronLeft,
    chevronRight,
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
    contentHeader,
    contentPanels,
    preview,
    previewTarget,
    previewLogin = 'auto',
    previewUsePage = false,
    onPreviewUsePageChange,
}) => {
    const iframeRef = useRef(null);
    const editorRef = useRef(null);
    const resizingRef = useRef(false);
    const [previewReady, setPreviewReady] = useState(false);
    const [previewStatus, setPreviewStatus] = useState(null);
    const [splitRatio, setSplitRatio] = useState(0.45);
    const [splitLocked, setSplitLocked] = useState(false);
    const [previewCollapsed, setPreviewCollapsed] = useState(false);
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);
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
        if (containerStyle.reserve_height) {
            wrapperStyle.minHeight = `${containerStyle.reserve_height}px`;
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
                if (containerStyle.reserve_height) {
                    return (
                        <div
                            className="magick-ad-preview__html"
                            style={{
                                minHeight: `${containerStyle.reserve_height}px`,
                            }}
                        >
                            {inner}
                        </div>
                    );
                }
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

            const cta =
                content.link && content.cta_text ? (
                    <a
                        className="magick-ad-preview__cta"
                        href={content.link}
                        target={
                            content.link_target ? '_blank' : undefined
                        }
                        rel={
                            content.link_target
                                ? 'noopener noreferrer'
                                : undefined
                        }
                    >
                        {content.cta_text}
                    </a>
                ) : null;

            inner = (
                <>
                    {wrappedImage}
                    {cta}
                </>
            );
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

        const customHtml = content.custom_html ? (
            <div
                className="magick-ad-preview__custom"
                dangerouslySetInnerHTML={{ __html: content.custom_html }}
            />
        ) : null;

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

        const wrapped = wrapContent(
            <>
                {inner}
                {customHtml}
            </>
        );
        const animation = behavior.animation || 'none';
        const delay = behavior.delay ?? 0;
        const animationClass =
            animation && animation !== 'none'
                ? `magick-ad-anim--${animation}`
                : '';
        const unitStyle =
            delay > 0 ? { animationDelay: `${delay}s` } : undefined;

        const placementParts = [];
        const placement = {
            hook: options.placement_hook || '',
            position: options.placement_position || '',
            paragraph: Number(options.placement_paragraph || 0),
        };
        if (placement.hook === 'content') {
            if (placement.position === 'paragraph' && placement.paragraph < 1) {
                placement.paragraph = 2;
            }
        } else {
            placement.position = '';
            placement.paragraph = 0;
        }
        const placementLabel = (() => {
            if (placement.hook === 'node') return 'node';
            if (placement.hook === 'head') return 'head';
            if (placement.hook === 'body_top') return 'body_top';
            if (placement.hook === 'footer') return 'footer';
            if (placement.hook === 'comments_top') return 'comments_top';
            if (placement.hook === 'comments_bottom') return 'comments_bottom';
            if (placement.hook === 'comment_form_before') return 'comment_form_before';
            if (placement.hook === 'comment_form_after') return 'comment_form_after';
            if (placement.hook === 'content') {
                if (placement.position === 'before') return 'content_before';
                if (placement.position === 'after') return 'content_after';
                if (placement.position === 'paragraph') {
                    return `paragraph_${placement.paragraph || 2}`;
                }
            }
            return '';
        })();

        if (options.ad_type === 'targeted') {
            placementParts.push(options.target_type || '未选择类型');
        } else {
            placementParts.push(options.show_page || 'all');
        }
        if (placementLabel) {
            placementParts.push(placementLabel);
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
                {content.custom_css && (
                    <style>{content.custom_css}</style>
                )}
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

    const previewSrc = useMemo(() => {
        const previewUrl = window?.MagickAD?.previewUrl;
        const previewNonce = window?.MagickAD?.previewNonce;
        if (!previewUrl || !previewNonce || !adData?.id) {
            return '';
        }
        const baseUrl =
            previewTarget && typeof previewTarget === 'string'
                ? previewTarget.trim()
                : '';
        let url;
        try {
            url = new URL(baseUrl || previewUrl, window.location.origin);
        } catch (err) {
            url = new URL(previewUrl, window.location.origin);
        }
        if (url.origin !== window.location.origin) {
            url = new URL(previewUrl, window.location.origin);
        }
        url.searchParams.set('magick_ad_preview', '1');
        url.searchParams.set('magick_ad_preview_ad', adData.id);
        url.searchParams.set('magick_ad_preview_nonce', previewNonce);
        url.searchParams.set('magick_ad_preview_device', devicePreview);
        if (baseUrl || previewUsePage) {
            url.searchParams.set('magick_ad_preview_mode', 'page');
        }
        return url.toString();
    }, [adData?.id, devicePreview, previewTarget, previewUsePage]);

    const isPagePreview = useMemo(() => {
        if (previewUsePage) {
            return true;
        }
        if (!previewTarget || typeof previewTarget !== 'string') {
            return false;
        }
        return previewTarget.trim().length > 0;
    }, [previewTarget, previewUsePage]);

    const previewFrame = useMemo(() => {
        if (!previewSrc) {
            return previewBody;
        }
        return (
            <div
                className={`magick-ad-preview-frame magick-ad-preview-frame--${devicePreview}`}
            >
                <div className="magick-ad-preview-frame__viewport">
                    <div className="magick-ad-preview-frame__label">
                        {devicePreview === 'desktop'
                            ? '桌面'
                            : devicePreview === 'tablet'
                            ? '平板'
                            : '手机'}
                    </div>
                    <iframe
                        ref={iframeRef}
                        title="Magick AD 预览"
                        src={previewSrc}
                        loading="lazy"
                        onLoad={() => setPreviewReady(true)}
                    />
                </div>
            </div>
        );
    }, [previewBody, previewSrc, devicePreview]);

    const previewToast = useMemo(() => {
        if (!previewStatus) {
            return null;
        }
        const label = previewStatus.allowed ? '命中' : '未命中';
        const reason =
            !previewStatus.allowed && previewStatus.reasonText
                ? previewStatus.reasonText
                : '';
        return (
            <div
                className={`magick-ad-preview-toast ${
                    previewStatus.allowed ? 'is-hit' : 'is-miss'
                }`}
            >
                <span className="magick-ad-preview-toast__label">{label}</span>
                {reason && (
                    <span className="magick-ad-preview-toast__reason">
                        {reason}
                    </span>
                )}
            </div>
        );
    }, [previewStatus]);

    useEffect(() => {
        setPreviewReady(false);
        setPreviewStatus(null);
    }, [previewSrc]);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin !== window.location.origin) {
                return;
            }
            const payload = event.data;
            if (!payload?.type) {
                return;
            }
            if (payload.type === 'MAGICK_AD_PREVIEW_READY') {
                setPreviewReady(true);
                return;
            }
            if (payload.type === 'MAGICK_AD_PREVIEW_STATUS') {
                setPreviewStatus(payload.payload || null);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        if (!previewReady || !iframeRef.current?.contentWindow) {
            return;
        }
        const previewAd = {
            ...adData,
            options: {
                ...(adData?.options || {}),
                creative_type: creativeType,
                container_type: containerType,
            },
        };

        const handler = window.setTimeout(() => {
            const messageType = 'MAGICK_AD_PREVIEW_UPDATE';
            iframeRef.current?.contentWindow?.postMessage(
                {
                    type: messageType,
                    payload: {
                        ad: previewAd,
                        device: devicePreview,
                        login: previewLogin,
                    },
                },
                window.location.origin
            );
        }, 200);

        return () => window.clearTimeout(handler);
    }, [
        previewReady,
        adData,
        creativeType,
        containerType,
        devicePreview,
        previewLogin,
        isPagePreview,
    ]);

    useEffect(() => {
        if (splitLocked || previewCollapsed) {
            return;
        }
        setSplitRatio(creativeType === 'html' ? 0.6 : 0.45);
    }, [creativeType, splitLocked, previewCollapsed]);

    useEffect(() => {
        const handleMove = (event) => {
            if (!resizingRef.current || !editorRef.current) {
                return;
            }
            const rect = editorRef.current.getBoundingClientRect();
            const next =
                (event.clientX - rect.left) / Math.max(rect.width, 1);
            const clamped = Math.min(0.7, Math.max(0.32, next));
            setSplitRatio(clamped);
        };

        const handleUp = () => {
            if (!resizingRef.current) {
                return;
            }
            resizingRef.current = false;
            document.body.classList.remove('magick-ad-is-resizing');
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, []);

    const handleResizeStart = (event) => {
        event.preventDefault();
        if (!editorRef.current || previewCollapsed) {
            return;
        }
        resizingRef.current = true;
        setSplitLocked(true);
        document.body.classList.add('magick-ad-is-resizing');
    };

    return (
        <div
            className={`magick-ad-layout ${
                leftCollapsed ? 'is-left-collapsed' : ''
            } ${rightCollapsed ? 'is-right-collapsed' : ''}`}
        >
            {!leftCollapsed ? (
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
            ) : (
                <div className="magick-ad-collapse-rail is-left">
                    <Button
                        className="magick-ad-collapse-rail__button"
                        icon={chevronRight}
                        label="展开左侧栏"
                        variant="tertiary"
                        onClick={() => setLeftCollapsed(false)}
                    />
                    <span className="magick-ad-collapse-rail__label">
                        展开
                    </span>
                </div>
            )}

            <main className="magick-ad-main">
                <Card>
                    <CardBody>
                        <Toolbar
                            className="magick-ad-toolbar"
                            label="编辑工具"
                        >
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
                                <Button
                                    className="magick-ad-toolbar-toggle"
                                    icon={
                                        leftCollapsed
                                            ? chevronRight
                                            : chevronLeft
                                    }
                                    label={
                                        leftCollapsed
                                            ? '展开左侧栏'
                                            : '折叠左侧栏'
                                    }
                                    variant="tertiary"
                                    onClick={() =>
                                        setLeftCollapsed((prev) => !prev)
                                    }
                                />
                                <Button
                                    className="magick-ad-toolbar-toggle"
                                    icon={
                                        rightCollapsed
                                            ? chevronLeft
                                            : chevronRight
                                    }
                                    label={
                                        rightCollapsed
                                            ? '展开右侧栏'
                                            : '折叠右侧栏'
                                    }
                                    variant="tertiary"
                                    onClick={() =>
                                        setRightCollapsed((prev) => !prev)
                                    }
                                />
                            </ToolbarGroup>
                        </Toolbar>

                        <div
                            className={`magick-ad-editor ${
                                previewCollapsed
                                    ? 'is-preview-collapsed'
                                    : ''
                            }`}
                            ref={editorRef}
                            style={{
                                gridTemplateColumns: previewCollapsed
                                    ? 'minmax(0, 1fr) 12px 56px'
                                    : `${Math.round(
                                          splitRatio * 100
                                      )}% 12px minmax(0, 1fr)`,
                            }}
                        >
                            <div className="magick-ad-editor-left">
                                {contentHeader && (
                                    <div className="magick-ad-editor-header">
                                        <div className="magick-ad-editor-title">
                                            内容配置
                                        </div>
                                        <div className="magick-ad-editor-header-actions">
                                            {contentHeader}
                                            <Button
                                                className="magick-ad-preview-toggle"
                                                icon={
                                                    previewCollapsed
                                                        ? fullscreen
                                                        : closeSmall
                                                }
                                                variant="tertiary"
                                                label={
                                                    previewCollapsed
                                                        ? '展开预览'
                                                        : '专注模式'
                                                }
                                                onClick={() =>
                                                    setPreviewCollapsed(
                                                        (prev) => !prev
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
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
                            <div
                                className="magick-ad-editor-resizer"
                                role="separator"
                                aria-label="调整编辑区与预览区宽度"
                                onMouseDown={handleResizeStart}
                                aria-hidden={previewCollapsed}
                                style={{
                                    pointerEvents: previewCollapsed
                                        ? 'none'
                                        : 'auto',
                                    opacity: previewCollapsed ? 0.4 : 1,
                                }}
                            />
                            <div
                                className={`magick-ad-editor-preview ${
                                    previewCollapsed ? 'is-collapsed' : ''
                                }`}
                            >
                                {previewCollapsed ? (
                                    <div className="magick-ad-preview-drawer">
                                        <div className="magick-ad-preview-drawer__handle">
                                            预览
                                        </div>
                                        <div className="magick-ad-preview-drawer__panel">
                                            <div className="magick-ad-preview">
                                                <div
                                                    className="magick-ad-preview-toolbar"
                                                    role="group"
                                                    aria-label="设备预览"
                                                >
                                                    {[
                                                        'desktop',
                                                        'tablet',
                                                        'mobile',
                                                    ].map((device) => (
                                                        <Button
                                                            key={device}
                                                            icon={
                                                                previewIcons[
                                                                    device
                                                                ]
                                                            }
                                                            className={`magick-ad-preview-toolbar__btn ${
                                                                devicePreview ===
                                                                device
                                                                    ? 'is-active'
                                                                    : ''
                                                            }`}
                                                            onClick={() =>
                                                                onDevicePreviewChange?.(
                                                                    device
                                                                )
                                                            }
                                                            aria-pressed={
                                                                devicePreview ===
                                                                device
                                                            }
                                                            label={
                                                                device ===
                                                                'desktop'
                                                                    ? '桌面'
                                                                    : device ===
                                                                      'tablet'
                                                                    ? '平板'
                                                                    : '手机'
                                                            }
                                                        />
                                                    ))}
                                                    <Button
                                                        className={`magick-ad-preview-toolbar__toggle ${
                                                            previewUsePage
                                                                ? 'is-active'
                                                                : ''
                                                        }`}
                                                        onClick={() =>
                                                            onPreviewUsePageChange?.(
                                                                !previewUsePage
                                                            )
                                                        }
                                                        aria-pressed={
                                                            previewUsePage
                                                        }
                                                    >
                                                        真实页面
                                                    </Button>
                                                </div>
                                                {previewToast}
                                                {preview || previewFrame}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="magick-ad-preview">
                                        <div
                                            className="magick-ad-preview-toolbar"
                                            role="group"
                                            aria-label="设备预览"
                                        >
                                            {[
                                                'desktop',
                                                'tablet',
                                                'mobile',
                                            ].map((device) => (
                                                <Button
                                                    key={device}
                                                    icon={previewIcons[device]}
                                                    className={`magick-ad-preview-toolbar__btn ${
                                                        devicePreview ===
                                                        device
                                                            ? 'is-active'
                                                            : ''
                                                    }`}
                                                    onClick={() =>
                                                        onDevicePreviewChange?.(
                                                            device
                                                        )
                                                    }
                                                    aria-pressed={
                                                        devicePreview ===
                                                        device
                                                    }
                                                    label={
                                                        device === 'desktop'
                                                            ? '桌面'
                                                            : device ===
                                                              'tablet'
                                                            ? '平板'
                                                            : '手机'
                                                        }
                                                    />
                                                ))}
                                            <Button
                                                className={`magick-ad-preview-toolbar__toggle ${
                                                    previewUsePage
                                                        ? 'is-active'
                                                        : ''
                                                }`}
                                                onClick={() =>
                                                    onPreviewUsePageChange?.(
                                                        !previewUsePage
                                                    )
                                                }
                                                aria-pressed={previewUsePage}
                                            >
                                                真实页面
                                            </Button>
                                        </div>
                                        {previewToast}
                                        {preview || previewFrame}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </main>

            {!rightCollapsed ? (
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
                                        value={(() => {
                                            const hook =
                                                adData?.options
                                                    ?.placement_hook || '';
                                            const position =
                                                adData?.options
                                                    ?.placement_position || '';
                                            const paragraph =
                                                Number(
                                                    adData?.options
                                                        ?.placement_paragraph || 0
                                                );
                                            if (hook === 'body_top') {
                                                return 'top';
                                            }
                                            if (hook === 'footer') {
                                                return 'bottom';
                                            }
                                            if (hook === 'content') {
                                                if (position === 'before') {
                                                    return 'content_before';
                                                }
                                                if (position === 'after') {
                                                    return 'content_after';
                                                }
                                                if (position === 'paragraph') {
                                                    return paragraph >= 1
                                                        ? 'paragraph_3'
                                                        : '';
                                                }
                                            }
                                            return '';
                                        })()}
                                        options={[
                                            { label: '顶部', value: 'top' },
                                            {
                                                label: '内容前',
                                                value: 'content_before',
                                            },
                                            {
                                                label: '位置第三段',
                                                value: 'paragraph_3',
                                            },
                                            {
                                                label: '内容后',
                                                value: 'content_after',
                                            },
                                            { label: '底部', value: 'bottom' },
                                        ]}
                                        onChange={(value) => {
                                            const updates = {
                                                placement_hook: '',
                                                placement_position: '',
                                                placement_paragraph: 0,
                                            };
                                            switch (value) {
                                                case 'top':
                                                    updates.placement_hook =
                                                        'body_top';
                                                    break;
                                                case 'bottom':
                                                    updates.placement_hook =
                                                        'footer';
                                                    break;
                                                case 'content_before':
                                                    updates.placement_hook =
                                                        'content';
                                                    updates.placement_position =
                                                        'before';
                                                    break;
                                                case 'content_after':
                                                    updates.placement_hook =
                                                        'content';
                                                    updates.placement_position =
                                                        'after';
                                                    break;
                                                case 'paragraph_3':
                                                    updates.placement_hook =
                                                        'content';
                                                    updates.placement_position =
                                                        'paragraph';
                                                    updates.placement_paragraph =
                                                        3;
                                                    break;
                                                default:
                                                    updates.placement_hook = '';
                                            }
                                            Object.entries(updates).forEach(
                                                ([key, nextValue]) =>
                                                    onUpdateRule?.(
                                                        key,
                                                        nextValue
                                                    )
                                            );
                                        }}
                                    />
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </aside>
            ) : (
                <div className="magick-ad-collapse-rail is-right">
                    <Button
                        className="magick-ad-collapse-rail__button"
                        icon={chevronLeft}
                        label="展开右侧栏"
                        variant="tertiary"
                        onClick={() => setRightCollapsed(false)}
                    />
                    <span className="magick-ad-collapse-rail__label">
                        展开
                    </span>
                </div>
            )}
        </div>
    );
};

export default Layout;
