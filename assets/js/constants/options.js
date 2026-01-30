import { decodeEntities } from '@wordpress/html-entities';

export const DISPLAY_PAGE_OPTIONS = [
    { label: '全站', value: 'all' },
    { label: '仅首页', value: 'home' },
    { label: '仅文章页', value: 'posts' },
    { label: '仅单页', value: 'pages' },
    { label: '仅分类页', value: 'category' },
    { label: '仅标签页', value: 'tag' },
    { label: '仅搜索结果页', value: 'search' },
    { label: '仅404页', value: '404' },
    { label: '仅作者页', value: 'author' },
];

export const GENERIC_POSITION_OPTIONS = [
    { label: 'Head (脚本/像素)', value: 'head' },
    { label: '顶部', value: 'top' },
    { label: '内容前', value: 'content_before' },
    { label: '内容后', value: 'content_after' },
    { label: '底部', value: 'bottom' },
    { label: '指定节点（ID / class）', value: 'node' },
];

export const POST_POSITION_OPTIONS = [
    { label: 'Head (脚本/像素)', value: 'head' },
    { label: '顶部', value: 'top' },
    { label: '内容前', value: 'content_before' },
    { label: '文章顶部', value: 'post_top' },
    { label: '位置第三段', value: 'paragraph_3' },
    { label: '文章底部', value: 'post_bottom' },
    { label: '评论列表顶部', value: 'comments_top' },
    { label: '评论框上方', value: 'comment_form_before' },
    { label: '评论框下方', value: 'comment_form_after' },
    { label: '评论列表底部', value: 'comments_bottom' },
    { label: '内容后', value: 'content_after' },
    { label: '底部', value: 'bottom' },
    { label: '指定节点（ID / class）', value: 'node' },
];

export const TARGET_TYPE_OPTIONS = [
    { label: '文章页面', value: 'posts' },
    { label: '单页', value: 'pages' },
    { label: '分类页', value: 'category' },
    { label: '标签页', value: 'tag' },
    { label: '作者页', value: 'author' },
];

export const SHADOW_OPTIONS = [
    { label: '无', value: 'none' },
    { label: '轻微', value: 'soft' },
    { label: '悬浮', value: 'float' },
];

export const ANIMATION_OPTIONS = [
    { label: '无', value: 'none' },
    { label: '淡入 (FadeIn)', value: 'fade' },
    { label: '上浮 (SlideUp)', value: 'slide-up' },
    { label: '缩放 (ZoomIn)', value: 'zoom' },
];

export const isPostLikePage = (page) => page === 'posts' || page === 'pages';

export const getPositionOptions = (page) =>
    isPostLikePage(page) ? POST_POSITION_OPTIONS : GENERIC_POSITION_OPTIONS;

export const getTargetEndpoint = (type) => {
    switch (type) {
        case 'posts':
            return 'posts';
        case 'pages':
            return 'pages';
        case 'category':
            return 'categories';
        case 'tag':
            return 'tags';
        case 'author':
            return 'users';
        default:
            return '';
    }
};

export const normalizeTargetItem = (type, item) => {
    if (!item || typeof item !== 'object') {
        return null;
    }
    const labelSource =
        type === 'posts' || type === 'pages' ? item.title?.rendered : item.name;
    const label = decodeEntities(labelSource || item.slug || `#${item.id}`);
    return { id: Number(item.id), label };
};
