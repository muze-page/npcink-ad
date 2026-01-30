import { useState } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { Icon, check } from '@wordpress/icons';
import styled from '@emotion/styled';

const Card = styled.div`
    position: relative;
    border: 1px solid ${props => (props.$selected ? '#3b82f6' : '#e5e7eb')};
    border-radius: 16px;
    background: #ffffff;
    overflow: hidden;
    transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
    box-shadow: ${props =>
        props.$selected
            ? '0 16px 28px rgba(59, 130, 246, 0.2)'
            : '0 8px 20px rgba(15, 23, 42, 0.06)'};
`;

const CardMedia = styled.div`
    height: 140px;
    background: ${props =>
        props.$image
            ? `url(${props.$image}) center/cover no-repeat`
            : 'linear-gradient(135deg, #e5e7eb 0%, #f8fafc 100%)'};
    position: relative;
`;

const MediaSkeleton = styled.div`
    position: absolute;
    inset: 0;
    background: linear-gradient(
        110deg,
        rgba(255, 255, 255, 0.3) 0%,
        rgba(255, 255, 255, 0.6) 45%,
        rgba(255, 255, 255, 0.3) 80%
    );
    background-size: 200% 100%;
    animation: magick-shimmer 1.8s ease-in-out infinite;
    opacity: ${props => (props.$show ? 1 : 0)};
`;

const CardContent = styled.div`
    padding: 14px 16px 16px;
`;

const Title = styled.div`
    font-size: 15px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 6px;
`;

const MetaRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const Tag = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: ${props => props.$bg || '#f3f4f6'};
    color: ${props => props.$color || '#1f2937'};
`;

const HoverActions = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 12px;
    opacity: ${props => (props.$visible ? 1 : 0)};
    pointer-events: ${props => (props.$visible ? 'auto' : 'none')};
    transition: opacity 0.2s ease;
`;

const ApplyButton = styled(Button)`
    &&& {
        background: #2563eb;
        color: #fff;
        border-radius: 999px;
        padding: 0 16px;
        height: 32px;
        box-shadow: 0 8px 16px rgba(37, 99, 235, 0.25);
    }
`;

const SelectionBox = styled.label`
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1px solid ${props => (props.$checked ? '#2563eb' : '#d1d5db')};
    background: ${props => (props.$checked ? '#2563eb' : '#fff')};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
`;

const HiddenCheckbox = styled.input`
    position: absolute;
    opacity: 0;
    pointer-events: none;
`;

const CornerActions = styled.div`
    position: absolute;
    top: 10px;
    left: 10px;
    display: flex;
    gap: 6px;
`;

const IconButton = styled.button`
    width: 28px;
    height: 28px;
    border-radius: 999px;
    border: none;
    background: rgba(255, 255, 255, 0.9);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 6px 12px rgba(15, 23, 42, 0.12);
`;

const SelectCorner = styled.div`
    position: absolute;
    top: 10px;
    right: 10px;
    opacity: ${props => (props.$visible ? 1 : 0)};
    transition: opacity 0.2s ease;
`;

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
    const [hovered, setHovered] = useState(false);
    const showActions = hovered || isSelected;
    const tags = [
        {
            label:
                template.type === 'image'
                    ? '图片'
                    : template.type === 'video'
                      ? '视频'
                      : template.type === 'block'
                        ? '可视化'
                        : '代码/HTML',
            bg: template.type === 'image'
                ? '#e0f2fe'
                : template.type === 'video'
                  ? '#ede9fe'
                  : template.type === 'block'
                    ? '#dcfce7'
                    : '#f3f4f6',
            color: template.type === 'image'
                ? '#075985'
                : template.type === 'video'
                  ? '#5b21b6'
                  : template.type === 'block'
                    ? '#166534'
                    : '#1f2937',
        },
        template.category
            ? {
                  label: template.category,
                  bg: template.categoryColor || '#f3f4f6',
                  color: '#1f2937',
              }
            : null,
        {
            label:
                (template.containerType || 'inline') === 'popup'
                    ? '弹窗'
                    : (template.containerType || 'inline') === 'banner'
                      ? '横栏'
                      : (template.containerType || 'inline') === 'floating'
                        ? '悬浮'
                        : (template.containerType || 'inline') === 'interstitial'
                          ? '插屏'
                          : '默认嵌入',
            bg: '#f8fafc',
            color: '#475569',
        },
    ].filter(Boolean);

    return (
        <Card
            $selected={isSelected}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <CardMedia $image={template.thumbnail || ''}>
                <MediaSkeleton $show={!template.thumbnail} />
                <HoverActions $visible={showActions}>
                    <ApplyButton
                        onClick={() =>
                            selectionMode ? onToggleSelect?.(template.id) : onApply?.(template)
                        }
                    >
                        {selectionMode ? '选择' : '应用'}
                    </ApplyButton>
                </HoverActions>
                {(selectionMode || isSelected) && (
                    <SelectCorner $visible={showActions || isSelected}>
                        <SelectionBox $checked={isSelected}>
                            <HiddenCheckbox
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onToggleSelect?.(template.id)}
                            />
                            {isSelected && <Icon icon={check} size={16} />}
                        </SelectionBox>
                    </SelectCorner>
                )}
                {hovered && (
                    <CornerActions>
                        <IconButton
                            type="button"
                            onClick={() => onTogglePinned?.(template.id)}
                            aria-label="置顶"
                        >
                            <span
                                style={{
                                    color: isPinned ? '#2563eb' : '#94a3b8',
                                    fontWeight: 700,
                                }}
                            >
                                ⌘
                            </span>
                        </IconButton>
                        <IconButton
                            type="button"
                            onClick={() => onToggleFavorite?.(template.id)}
                            aria-label="收藏"
                        >
                            <span
                                style={{
                                    color: isFavorite ? '#f59e0b' : '#94a3b8',
                                    fontWeight: 700,
                                }}
                            >
                                ★
                            </span>
                        </IconButton>
                    </CornerActions>
                )}
            </CardMedia>
            <CardContent>
                <Title>{template.name || template.title}</Title>
                <MetaRow>
                    {tags.map((tag) => (
                        <Tag
                            key={`${template.id}-${tag.label}`}
                            $bg={tag.bg}
                            $color={tag.color}
                        >
                            {tag.label}
                        </Tag>
                    ))}
                </MetaRow>
            </CardContent>
        </Card>
    );
};

export default TemplateCard;
