import { useMemo } from '@wordpress/element';
import { Button, CheckboxControl } from '@wordpress/components';

const getLabel = (template) => {
    if (template.type === 'image') return '图片';
    if (template.type === 'video') return '视频';
    if (template.type === 'block') return '可视化';
    return '代码/HTML';
};

const getContainerLabel = (template) => {
    const type = template.containerType || 'inline';
    if (type === 'popup') return '弹窗';
    if (type === 'banner') return '横栏';
    if (type === 'floating') return '悬浮';
    if (type === 'interstitial') return '插屏';
    return '默认嵌入';
};

const getSourceLabel = (template) =>
    template.source === 'user' ? '我的模板' : '系统预设';

const TemplateThumbnail = ({ template }) => {
    const thumb = template.thumbnail || template.thumbnailUrl;
    if (thumb) {
        return (
            <img
                src={thumb}
                alt={template.name || template.title || ''}
                className="magick-ad-template-thumb"
            />
        );
    }

    const container = template.containerType || 'inline';
    const creative = template.type || 'html';
    const showPlay = creative === 'video';

    return (
        <svg
            viewBox="0 0 100 60"
            className="magick-ad-template-thumb"
            aria-hidden="true"
        >
            <rect x="0" y="0" width="100" height="60" fill="#F8FAFC" />
            {container === 'popup' && (
                <>
                    <rect x="0" y="0" width="100" height="60" fill="#0F172A" opacity="0.08" />
                    <rect x="28" y="14" width="44" height="32" rx="3" fill="#FFFFFF" stroke="#CBD5E1" />
                    <rect x="34" y="20" width="26" height="4" rx="2" fill="#E2E8F0" />
                    <rect x="34" y="28" width="18" height="4" rx="2" fill="#E2E8F0" />
                </>
            )}
            {container === 'banner' && (
                <>
                    <rect x="8" y="10" width="70" height="3" rx="1.5" fill="#E2E8F0" />
                    <rect x="8" y="16" width="56" height="3" rx="1.5" fill="#E2E8F0" />
                    <rect x="0" y="46" width="100" height="14" fill="#FFFFFF" stroke="#CBD5E1" />
                    <rect x="8" y="50" width="40" height="6" rx="3" fill="#2563EB" opacity="0.6" />
                </>
            )}
            {container === 'floating' && (
                <>
                    <rect x="10" y="12" width="60" height="4" rx="2" fill="#E2E8F0" />
                    <rect x="10" y="20" width="48" height="4" rx="2" fill="#E2E8F0" />
                    <rect x="64" y="34" width="28" height="18" rx="3" fill="#FFFFFF" stroke="#CBD5E1" />
                    <rect x="68" y="40" width="16" height="4" rx="2" fill="#E2E8F0" />
                </>
            )}
            {container === 'interstitial' && (
                <>
                    <rect x="8" y="8" width="84" height="44" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
                    <rect x="16" y="16" width="40" height="4" rx="2" fill="#E2E8F0" />
                    <rect x="16" y="24" width="28" height="4" rx="2" fill="#E2E8F0" />
                    <rect x="16" y="34" width="24" height="6" rx="3" fill="#2563EB" opacity="0.6" />
                </>
            )}
            {container === 'inline' && (
                <>
                    <rect x="10" y="12" width="70" height="4" rx="2" fill="#E2E8F0" />
                    <rect x="10" y="20" width="62" height="4" rx="2" fill="#E2E8F0" />
                    <rect x="10" y="30" width="50" height="10" rx="3" fill="#FFFFFF" stroke="#CBD5E1" />
                </>
            )}
            {showPlay && (
                <polygon points="48,24 62,30 48,36" fill="#2563EB" opacity="0.8" />
            )}
            {creative === 'html' && (
                <text x="10" y="56" fontSize="8" fill="#94A3B8">
                    &lt;/&gt;
                </text>
            )}
        </svg>
    );
};

const TemplateCard = ({
    template,
    isSelected,
    selectionMode,
    onApply,
    onToggleSelect,
    onToggleFavorite,
    onTogglePinned,
    isFavorite,
    isPinned,
}) => {
    const tags = useMemo(() => {
        const list = [
            {
                label: getLabel(template),
                className: `magick-ad-template-tag magick-ad-template-tag--type-${
                    template.type || 'html'
                }`,
            },
            {
                label: getContainerLabel(template),
                className: 'magick-ad-template-tag magick-ad-template-tag--soft',
            },
        ];
        if (template.category) {
            list.push({
                label: template.category,
                className: 'magick-ad-template-tag magick-ad-template-tag--category',
                style: {
                    background: template.categoryColor || '#F3F4F6',
                },
            });
        }
        return list;
    }, [template]);

    return (
        <div
            className={`magick-ad-template-card-new ${
                isSelected ? 'is-selected' : ''
            }`}
        >
            <div className="magick-ad-template-media">
                <TemplateThumbnail template={template} />
                <span className="magick-ad-template-source-badge">
                    {getSourceLabel(template)}
                </span>
                {selectionMode && (
                    <div
                        className={`magick-ad-template-select ${
                            selectionMode ? 'is-visible' : ''
                        }`}
                    >
                        <CheckboxControl
                            checked={isSelected}
                            onChange={() => onToggleSelect?.(template.id)}
                            label=""
                        />
                    </div>
                )}
            </div>
            <div className="magick-ad-template-body">
                <div className="magick-ad-template-title">
                    {template.name || template.title}
                </div>
                <div className="magick-ad-template-description">
                    {template.description || '模板内容可应用后继续编辑。'}
                </div>
                <div className="magick-ad-template-tags">
                    {tags.map((tag) => (
                        <span
                            key={`${template.id}-${tag.label}`}
                            className={tag.className}
                            style={tag.style}
                        >
                            {tag.label}
                        </span>
                    ))}
                </div>
                <div className="magick-ad-template-card-footer">
                    <div className="magick-ad-template-card-footer__meta">
                        <Button
                            variant="tertiary"
                            size="small"
                            className={`magick-ad-template-pill-btn ${
                                isPinned ? 'is-active' : ''
                            }`}
                            onClick={() => onTogglePinned?.(template.id)}
                        >
                            {isPinned ? '已置顶' : '置顶'}
                        </Button>
                        <Button
                            variant="tertiary"
                            size="small"
                            className={`magick-ad-template-pill-btn ${
                                isFavorite ? 'is-active' : ''
                            }`}
                            onClick={() => onToggleFavorite?.(template.id)}
                        >
                            {isFavorite ? '已收藏' : '收藏'}
                        </Button>
                    </div>
                    <Button
                        variant={
                            selectionMode
                                ? isSelected
                                    ? 'primary'
                                    : 'secondary'
                                : 'primary'
                        }
                        size="small"
                        onClick={() =>
                            selectionMode
                                ? onToggleSelect?.(template.id)
                                : onApply?.(template)
                        }
                    >
                        {selectionMode
                            ? isSelected
                                ? '已选择'
                                : '选择'
                            : '应用模板'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TemplateCard;
