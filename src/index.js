import {
    createRoot,
    lazy,
    Suspense,
    useEffect,
    useMemo,
    useRef,
    useState,
} from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import './index.css';
import {
    Button,
    Card,
    CardBody,
    ColorPicker,
    CheckboxControl,
    DropdownMenu,
    FormTokenField,
    MenuGroup,
    MenuItem,
    Modal,
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
import {
    BlockEditorProvider,
    BlockList,
    BlockListAppender,
    BlockTools,
    ObserveTyping,
    WritingFlow,
} from '@wordpress/block-editor';
import { parse, serialize } from '@wordpress/blocks';
import { registerCoreBlocks } from '@wordpress/block-library';
import { useStore } from './store';
import { decodeEntities } from '@wordpress/html-entities';
import Layout from './Layout';
const Dashboard = lazy(() => import('./Dashboard'));
const CLASSIC_EDITOR_ID = 'magick_ad_classic_editor';
const CLASSIC_EDITOR_HOST_ID = 'magick-ad-classic-editor-host';

apiFetch.use((options, next) => {
    return next({
        ...options,
        headers: {
            ...options.headers,
            'X-WP-Nonce': window.MagickAD?.nonce,
        },
    });
});

const ImagePicker = ({ value, onChange }) => {
    const frameRef = useRef(null);

    const handleOpen = () => {
        if (!window.wp?.media) {
            // eslint-disable-next-line no-console
            console.error('wp.media is not available.');
            return;
        }

        if (frameRef.current) {
            frameRef.current.open();
            return;
        }

        const frame = window.wp.media({
            title: '选择图片',
            button: { text: '使用此图片' },
            library: { type: 'image' },
            multiple: false,
        });

        frame.on('select', () => {
            const attachment = frame
                .state()
                .get('selection')
                .first()
                .toJSON();
            onChange({
                id: attachment.id,
                url: attachment.url,
                alt: attachment.alt,
            });
        });

        frameRef.current = frame;
        frame.open();
    };

    return (
        <div className="magick-ad-image-picker">
            {value?.url ? (
                <div className="magick-ad-image-preview">
                    <img src={value.url} alt={value.alt || ''} />
                    <div className="magick-ad-image-actions">
                        <Button onClick={handleOpen} variant="secondary">
                            更换图片
                        </Button>
                        <Button
                            onClick={() => onChange({ id: null, url: '', alt: '' })}
                            variant="tertiary"
                            isDestructive
                        >
                            移除
                        </Button>
                    </div>
                </div>
            ) : (
                <Button onClick={handleOpen} variant="secondary">
                    选择图片
                </Button>
            )}
        </div>
    );
};

const LinkPicker = ({ value, target, onChange }) => {
    const proxyIdRef = useRef(
        `magick-ad-link-proxy-${Math.random().toString(36).slice(2)}`
    );

    const openLinkModal = () => {
        if (!window.wpLink || !window.jQuery) {
            return;
        }
        const proxyId = proxyIdRef.current;
        const previousActiveEditor = window.wpActiveEditor;
        const originalUpdate = window.wpLink.update;

        window.wpLink.update = () => {
            const attrs = window.wpLink.getAttrs();
            onChange({
                url: attrs?.href || '',
                target: attrs?.target === '_blank',
            });
            originalUpdate.call(window.wpLink);
        };

        window.jQuery(document).one('wplink-close', () => {
            window.wpLink.update = originalUpdate;
            window.wpActiveEditor = previousActiveEditor;
        });

        window.wpActiveEditor = proxyId;
        window.wpLink.textarea = window.jQuery(`#${proxyId}`);
        window.wpLink.open(proxyId, value || '', '');
    };

    return (
        <div className="magick-ad-link-picker">
            <div className="magick-ad-link-picker__row">
                <div className="magick-ad-link-picker__field">
                    <TextControl
                        label="跳转链接"
                        value={value || ''}
                        onChange={(next) =>
                            onChange({ url: next, target })
                        }
                    />
                </div>
                <div className="magick-ad-link-picker__actions">
                    <Button variant="secondary" onClick={openLinkModal}>
                        选择链接
                    </Button>
                    {value && (
                        <Button
                            variant="tertiary"
                            onClick={() =>
                                onChange({ url: '', target: false })
                            }
                        >
                            清除
                        </Button>
                    )}
                </div>
            </div>
            <ToggleControl
                label="在新标签页中打开链接"
                checked={Boolean(target)}
                onChange={(next) =>
                    onChange({ url: value || '', target: next })
                }
            />
            <textarea
                id={proxyIdRef.current}
                style={{ display: 'none' }}
                defaultValue={value || ''}
            />
        </div>
    );
};

const ClassicEditor = ({ value, onChange, active }) => {
    const containerRef = useRef(null);
    const initializedRef = useRef(false);
    const editorRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || initializedRef.current) {
            return;
        }
        const host = document.getElementById(CLASSIC_EDITOR_HOST_ID);
        if (!host) {
            return;
        }
        while (host.firstChild) {
            containerRef.current.appendChild(host.firstChild);
        }
        initializedRef.current = true;
    }, []);

    useEffect(() => {
        if (!active) {
            return;
        }
        const editor = window.tinymce?.get(CLASSIC_EDITOR_ID);
        if (editor && value !== editor.getContent()) {
            editor.setContent(value || '');
            editor.save();
        }
        const textarea = document.getElementById(CLASSIC_EDITOR_ID);
        if (textarea && textarea.value !== (value || '')) {
            textarea.value = value || '';
        }
    }, [active, value]);

    useEffect(() => {
        const handleChange = () => {
            if (!active) {
                return;
            }
            const currentEditor = editorRef.current;
            if (currentEditor) {
                onChange(currentEditor.getContent());
                return;
            }
            const textarea = document.getElementById(CLASSIC_EDITOR_ID);
            if (textarea) {
                onChange(textarea.value || '');
            }
        };
        const bindEditor = () => {
            const currentEditor = window.tinymce?.get(CLASSIC_EDITOR_ID);
            if (!currentEditor || currentEditor === editorRef.current) {
                return;
            }
            editorRef.current = currentEditor;
            currentEditor.on(
                'change keyup input undo redo',
                handleChange
            );
        };
        const interval = window.setInterval(bindEditor, 300);
        bindEditor();

        const textarea = document.getElementById(CLASSIC_EDITOR_ID);
        if (textarea) {
            textarea.addEventListener('input', handleChange);
        }
        return () => {
            window.clearInterval(interval);
            if (editorRef.current) {
                editorRef.current.off(
                    'change keyup input undo redo',
                    handleChange
                );
                editorRef.current = null;
            }
            if (textarea) {
                textarea.removeEventListener('input', handleChange);
            }
        };
    }, [active, onChange]);

    return (
        <div
            className={`magick-ad-classic-host ${
                active ? 'is-active' : 'is-hidden'
            }`}
            ref={containerRef}
        />
    );
};

let coreBlocksRegistered = false;
const ensureCoreBlocks = () => {
    if (!coreBlocksRegistered) {
        registerCoreBlocks();
        coreBlocksRegistered = true;
    }
};

const BlockEditor = ({ value, onChange }) => {
    const [blocks, setBlocks] = useState(() => parse(value || ''));

    useEffect(() => {
        ensureCoreBlocks();
    }, []);

    useEffect(() => {
        setBlocks(parse(value || ''));
    }, [value]);

    return (
        <div className="magick-ad-block-editor editor-styles-wrapper">
            <BlockEditorProvider
                value={blocks}
                onChange={(nextBlocks) => {
                    setBlocks(nextBlocks);
                    onChange(serialize(nextBlocks));
                }}
                settings={{
                    hasFixedToolbar: true,
                    allowWideBlocks: false,
                }}
            >
                <BlockTools>
                    <WritingFlow>
                        <ObserveTyping>
                            <BlockList renderAppender={BlockListAppender} />
                        </ObserveTyping>
                    </WritingFlow>
                </BlockTools>
            </BlockEditorProvider>
        </div>
    );
};

const TemplateLibraryModal = ({
    isOpen,
    type,
    templates,
    selected,
    onToggleSelect,
    onApply,
    onImport,
    onExport,
    onClose,
}) => {
    if (!isOpen) {
        return null;
    }

    const systemTemplates = templates.filter(
        (item) => item.source === 'preset'
    );
    const userTemplates = templates.filter(
        (item) => item.source === 'user'
    );

    return (
        <Modal title="模板库" onRequestClose={onClose} size="large">
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
                </div>
            </div>

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
                    if (list.length === 0) {
                        return (
                            <Notice status="info" isDismissible={false}>
                                暂无模板。
                            </Notice>
                        );
                    }
                    return (
                        <div className="magick-ad-template-grid">
                            {list.map((template) => (
                                <div
                                    key={template.id}
                                    className="magick-ad-template-card"
                                >
                                    <div className="magick-ad-template-card__body">
                                        <h4>{template.name}</h4>
                                        <p>{template.description || ''}</p>
                                    </div>
                                    <div className="magick-ad-template-card__actions">
                                        <Button
                                            variant="primary"
                                            onClick={() =>
                                                onApply(template)
                                            }
                                        >
                                            应用
                                        </Button>
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
        </Modal>
    );
};

const DISPLAY_PAGE_OPTIONS = [
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

const GENERIC_POSITION_OPTIONS = [
    { label: '顶部', value: 'top' },
    { label: '内容前', value: 'content_before' },
    { label: '内容后', value: 'content_after' },
    { label: '底部', value: 'bottom' },
];

const POST_POSITION_OPTIONS = [
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
];

const isPostLikePage = (page) => page === 'posts' || page === 'pages';

const getPositionOptions = (page) =>
    isPostLikePage(page) ? POST_POSITION_OPTIONS : GENERIC_POSITION_OPTIONS;

const TARGET_TYPE_OPTIONS = [
    { label: '文章页面', value: 'posts' },
    { label: '单页', value: 'pages' },
    { label: '分类页', value: 'category' },
    { label: '标签页', value: 'tag' },
    { label: '作者页', value: 'author' },
];

const getTargetEndpoint = (type) => {
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

const normalizeTargetItem = (type, item) => {
    if (!item || typeof item !== 'object') {
        return null;
    }
    const labelSource =
        type === 'posts' || type === 'pages'
            ? item.title?.rendered
            : item.name;
    const label = decodeEntities(
        labelSource || item.slug || `#${item.id}`
    );
    return { id: Number(item.id), label };
};

const SHADOW_OPTIONS = [
    { label: '无', value: 'none' },
    { label: '轻微', value: 'soft' },
    { label: '悬浮', value: 'float' },
];

const ANIMATION_OPTIONS = [
    { label: '无', value: 'none' },
    { label: '淡入 (FadeIn)', value: 'fade' },
    { label: '上浮 (SlideUp)', value: 'slide-up' },
    { label: '缩放 (ZoomIn)', value: 'zoom' },
];

const HTML_TEMPLATES = [
    {
        id: 'adsense',
        title: 'AdSense 响应式容器',
        description: '标准 AdSense 响应式代码骨架',
        html:
            '<div class="adsense-slot">请在此替换为 AdSense 代码</div>',
        container_style: {
            mode: 'boxed',
            max_width: 100,
            max_width_unit: '%',
            padding_top: 0,
            padding_right: 0,
            padding_bottom: 0,
            padding_left: 0,
            background: 'transparent',
            radius: 0,
            shadow: 'none',
            badge_enabled: false,
            badge_text: '广告',
            badge_color: '#1d2327',
            layout: '',
        },
    },
    {
        id: 'centered',
        title: '居中横幅',
        description: 'Flex 居中，背景透明',
        html: '<div class="banner-slot">横幅广告内容</div>',
        container_style: {
            mode: 'boxed',
            max_width: 728,
            max_width_unit: 'px',
            padding_top: 8,
            padding_right: 8,
            padding_bottom: 8,
            padding_left: 8,
            background: 'transparent',
            radius: 0,
            shadow: 'none',
            badge_enabled: false,
            badge_text: '广告',
            badge_color: '#1d2327',
            layout: 'centered',
        },
    },
    {
        id: 'card',
        title: '卡片式推广',
        description: '白底、圆角、阴影适合文字广告',
        html:
            '<div class="promo-card"><h3>推广标题</h3><p>这里是推广文案内容。</p></div>',
        container_style: {
            mode: 'boxed',
            max_width: 600,
            max_width_unit: 'px',
            padding_top: 16,
            padding_right: 16,
            padding_bottom: 16,
            padding_left: 16,
            background: '#ffffff',
            radius: 8,
            shadow: 'soft',
            badge_enabled: true,
            badge_text: '推广',
            badge_color: '#2271b1',
            layout: '',
        },
    },
    {
        id: 'raw',
        title: '原始代码 (Raw)',
        description: '不包裹额外样式，保持原样输出',
        html: '<div>粘贴你的原始 HTML 代码</div>',
        container_style: {
            mode: 'raw',
            max_width: 100,
            max_width_unit: '%',
            padding_top: 0,
            padding_right: 0,
            padding_bottom: 0,
            padding_left: 0,
            background: 'transparent',
            radius: 0,
            shadow: 'none',
            badge_enabled: false,
            badge_text: '广告',
            badge_color: '#1d2327',
            layout: '',
        },
    },
];

const IMAGE_TEMPLATES = [
    {
        id: 'img-banner',
        name: '横幅占位图',
        description: '适合文章内或横幅广告位',
        type: 'image',
        source: 'preset',
        data: {
            image: {
                id: 0,
                url: 'https://via.placeholder.com/728x90?text=Banner',
                alt: 'Banner',
            },
            link: '',
            link_target: false,
            image_settings: {
                radius: 0,
                max_width: 728,
                margin_top: 0,
                margin_bottom: 0,
                margin_left: 0,
                margin_right: 0,
            },
        },
    },
    {
        id: 'img-poster',
        name: '竖版海报',
        description: '适合侧边栏或弹窗容器',
        type: 'image',
        source: 'preset',
        data: {
            image: {
                id: 0,
                url: 'https://via.placeholder.com/600x900?text=Poster',
                alt: 'Poster',
            },
            link: '',
            link_target: false,
            image_settings: {
                radius: 8,
                max_width: 600,
                margin_top: 0,
                margin_bottom: 0,
                margin_left: 0,
                margin_right: 0,
            },
        },
    },
];

const VIDEO_TEMPLATES = [
    {
        id: 'video-demo',
        name: '标准视频模板',
        description: 'MP4 示例视频',
        type: 'video',
        source: 'preset',
        data: {
            video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        },
    },
];

const BLOCK_TEMPLATES = [
    {
        id: 'block-price',
        name: '价格卡片',
        description: '标题 + 文案 + 按钮',
        type: 'block',
        source: 'preset',
        data: {
            blocks:
                '<!-- wp:heading {"level":3} --><h3>限时特惠</h3><!-- /wp:heading --><!-- wp:paragraph --><p>今天下单享受 8 折优惠。</p><!-- /wp:paragraph --><!-- wp:buttons --><div class="wp-block-buttons"><div class="wp-block-button"><a class="wp-block-button__link">立即查看</a></div></div><!-- /wp:buttons -->',
        },
    },
    {
        id: 'block-feature',
        name: '图文卖点',
        description: '左右分栏图文排版',
        type: 'block',
        source: 'preset',
        data: {
            blocks:
                '<!-- wp:columns --><div class="wp-block-columns"><!-- wp:column --><div class="wp-block-column"><!-- wp:paragraph --><p>高转化广告位推荐</p><!-- /wp:paragraph --><!-- wp:list --><ul><li>快速配置</li><li>多端适配</li><li>自动统计</li></ul><!-- /wp:list --></div><!-- /wp:column --><!-- wp:column --><div class="wp-block-column"><!-- wp:image {"sizeSlug":"large"} --><figure class="wp-block-image size-large"><img src="https://via.placeholder.com/400x240?text=Image" alt=""/></figure><!-- /wp:image --></div><!-- /wp:column --></div><!-- /wp:columns -->',
        },
    },
];

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
    const [notice, setNotice] = useState(null);
    const [showValidation, setShowValidation] = useState(false);
    const [debugEnabled, setDebugEnabled] = useState(false);
    const [debugLoading, setDebugLoading] = useState(false);
    const [debugSaving, setDebugSaving] = useState(false);
    const [debugError, setDebugError] = useState(null);
    const [debugLocked, setDebugLocked] = useState(false);
    const [debugLogSettings, setDebugLogSettings] = useState(true);
    const [targetItems, setTargetItems] = useState([]);
    const [targetSuggestions, setTargetSuggestions] = useState([]);
    const [targetLoading, setTargetLoading] = useState(false);
    const [devicePreview, setDevicePreview] = useState('desktop');
    const [htmlTab, setHtmlTab] = useState('content');
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateType, setTemplateType] = useState('image');
    const [templateLibrary, setTemplateLibrary] = useState([]);
    const [templateSelection, setTemplateSelection] = useState([]);
    const fileInputRef = useRef(null);
    const noticeTimerRef = useRef(null);
    const targetSearchTimerRef = useRef(null);
    const targetRequestRef = useRef(0);
    const targetCacheRef = useRef({});

    useEffect(() => {
        fetchFromDB();
    }, [fetchFromDB]);

    useEffect(() => {
        let isMounted = true;
        setDebugLoading(true);
        setDebugError(null);

        apiFetch({ path: '/magick-ad/v1/debug' })
            .then((response) => {
                if (!isMounted) {
                    return;
                }
                const forced = Boolean(response?.forced);
                setDebugLocked(forced);
                setDebugEnabled(forced ? true : Boolean(response?.enabled));
                setDebugLogSettings(
                    response?.log_settings !== undefined
                        ? Boolean(response?.log_settings)
                        : true
                );
                setDebugLoading(false);
            })
            .catch((err) => {
                if (!isMounted) {
                    return;
                }
                setDebugError(err);
                setDebugLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

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

    useEffect(() => {
        if (!['content', 'templates'].includes(htmlTab)) {
            setHtmlTab('content');
        }
    }, [htmlTab]);

    const selectedAd = useMemo(
        () => ads.find((ad) => ad.id === selectedId),
        [ads, selectedId]
    );

    useEffect(() => {
        setHtmlTab('content');
    }, [selectedAd?.id]);

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

    const targetIdsKey = useMemo(() => {
        const ids = selectedAd?.options?.target_ids || [];
        return Array.isArray(ids) ? ids.join(',') : '';
    }, [selectedAd?.options?.target_ids]);

    useEffect(() => {
        if (!selectedAd || selectedAd.options?.ad_type !== 'targeted') {
            setTargetItems([]);
            return;
        }
        const targetType = selectedAd.options?.target_type;
        const ids = Array.isArray(selectedAd.options?.target_ids)
            ? selectedAd.options?.target_ids
            : [];
        if (!targetType || ids.length === 0) {
            setTargetItems([]);
            return;
        }
        const endpoint = getTargetEndpoint(targetType);
        if (!endpoint) {
            setTargetItems([]);
            return;
        }
        const requestId = ++targetRequestRef.current;
        setTargetLoading(true);
        apiFetch({
            path: `/wp/v2/${endpoint}?include=${ids.join(
                ','
            )}&per_page=${Math.min(ids.length, 100)}`,
        })
            .then((items) => {
                if (requestId !== targetRequestRef.current) {
                    return;
                }
                const normalized = Array.isArray(items)
                    ? items
                          .map((item) => normalizeTargetItem(targetType, item))
                          .filter(Boolean)
                    : [];
                setTargetItems(normalized);
            })
            .catch(() => {
                if (requestId !== targetRequestRef.current) {
                    return;
                }
                setTargetItems([]);
            })
            .finally(() => {
                if (requestId !== targetRequestRef.current) {
                    return;
                }
                setTargetLoading(false);
            });
    }, [selectedAd?.id, selectedAd?.options?.target_type, targetIdsKey]);

    useEffect(() => {
        if (!selectedAd || selectedAd.options?.ad_type !== 'targeted') {
            setTargetSuggestions([]);
            return;
        }
        const targetType = selectedAd.options?.target_type;
        if (!targetType) {
            setTargetSuggestions([]);
            return;
        }
        const cached = targetCacheRef.current[targetType];
        if (cached && cached.length) {
            setTargetSuggestions(cached);
            return;
        }
        const endpoint = getTargetEndpoint(targetType);
        if (!endpoint) {
            setTargetSuggestions([]);
            return;
        }
        const requestId = ++targetRequestRef.current;
        setTargetLoading(true);
        const fetchAll = async () => {
            let page = 1;
            let totalPages = 1;
            let allItems = [];
            do {
                const pathBase = `/wp/v2/${endpoint}?per_page=100&page=${page}`;
                const path =
                    targetType === 'author'
                        ? `${pathBase}&who=authors`
                        : pathBase;
                // apiFetch parse: false lets us read headers for pagination.
                const response = await apiFetch({ path, parse: false });
                const data = await response.json();
                if (!Array.isArray(data)) {
                    break;
                }
                allItems = allItems.concat(data);
                const totalHeader = response.headers.get('X-WP-TotalPages');
                totalPages = totalHeader ? Number(totalHeader) : 1;
                page += 1;
            } while (page <= totalPages);
            return allItems;
        };

        fetchAll()
            .then((items) => {
                if (requestId !== targetRequestRef.current) {
                    return;
                }
                const normalized = Array.isArray(items)
                    ? items
                          .map((item) =>
                              normalizeTargetItem(targetType, item)
                          )
                          .filter(Boolean)
                    : [];
                targetCacheRef.current[targetType] = normalized;
                setTargetSuggestions(normalized);
            })
            .catch(() => {
                if (requestId !== targetRequestRef.current) {
                    return;
                }
                setTargetSuggestions([]);
            })
            .finally(() => {
                if (requestId !== targetRequestRef.current) {
                    return;
                }
                setTargetLoading(false);
            });
    }, [selectedAd?.id, selectedAd?.options?.target_type]);

    const handleTargetSearch = (query) => {
        if (targetSearchTimerRef.current) {
            window.clearTimeout(targetSearchTimerRef.current);
        }
        targetSearchTimerRef.current = window.setTimeout(() => {
            if (
                !selectedAd ||
                selectedAd.options?.ad_type !== 'targeted'
            ) {
                setTargetSuggestions([]);
                return;
            }
            const targetType = selectedAd.options?.target_type;
            const endpoint = getTargetEndpoint(targetType);
            if (!endpoint) {
                setTargetSuggestions([]);
                return;
            }
            const cached = targetCacheRef.current[targetType];
            if (cached && cached.length) {
                const keyword = (query || '').trim().toLowerCase();
                if (!keyword) {
                    setTargetSuggestions(cached);
                    return;
                }
                setTargetSuggestions(
                    cached.filter((item) =>
                        item.label.toLowerCase().includes(keyword)
                    )
                );
                return;
            }
            const requestId = ++targetRequestRef.current;
            setTargetLoading(true);
            const baseQuery = `per_page=20&search=${encodeURIComponent(
                query || ''
            )}`;
            const path =
                targetType === 'author'
                    ? `/wp/v2/${endpoint}?${baseQuery}&who=authors`
                    : `/wp/v2/${endpoint}?${baseQuery}`;
            apiFetch({ path })
                .then((items) => {
                    if (requestId !== targetRequestRef.current) {
                        return;
                    }
                    const normalized = Array.isArray(items)
                        ? items
                              .map((item) =>
                                  normalizeTargetItem(targetType, item)
                              )
                              .filter(Boolean)
                        : [];
                    setTargetSuggestions(normalized);
                })
                .catch(() => {
                    if (requestId !== targetRequestRef.current) {
                        return;
                    }
                    setTargetSuggestions([]);
                })
                .finally(() => {
                    if (requestId !== targetRequestRef.current) {
                        return;
                    }
                    setTargetLoading(false);
                });
        }, 300);
    };

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

    const loadTemplates = async (type) => {
        const presets = [
            ...IMAGE_TEMPLATES,
            ...VIDEO_TEMPLATES,
            ...BLOCK_TEMPLATES,
        ].filter((item) => item.type === type);

        try {
            const response = await apiFetch({
                path: `/magick-ad/v1/templates?type=${type}`,
                method: 'GET',
            });
            const userTemplates = Array.isArray(response) ? response : [];
            setTemplateLibrary([
                ...presets,
                ...userTemplates.map((item) => ({
                    ...item,
                    source: 'user',
                })),
            ]);
        } catch (err) {
            setTemplateLibrary(presets);
        }
    };

    const openTemplateLibrary = async (type) => {
        setTemplateType(type);
        setTemplateSelection([]);
        setTemplateModalOpen(true);
        await loadTemplates(type);
    };

    const handleSaveTemplate = async (type) => {
        if (!selectedAd) {
            return;
        }
        const name = window.prompt('请输入模板名称');
        if (!name) {
            return;
        }
        const data = getCreativeTemplateData(type, selectedAd);
        try {
            await apiFetch({
                path: '/magick-ad/v1/templates',
                method: 'POST',
                data: { name, type, data },
            });
            await loadTemplates(type);
            setNotice({
                status: 'success',
                message: '模板已保存',
            });
        } catch (err) {
            setNotice({
                status: 'error',
                message: err?.message || '模板保存失败',
            });
        }
    };

    const handleApplyTemplate = (template) => {
        handleUpdateOptions({ creative_type: template.type });
        handleUpdateContent(template.data || {});
        setTemplateModalOpen(false);
    };

    const handleToggleTemplateSelect = (id) => {
        setTemplateSelection((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        );
    };

    const handleExportTemplates = () => {
        const selected = templateLibrary.filter((item) =>
            templateSelection.includes(item.id)
        );
        if (selected.length === 0) {
            return;
        }
        const payload = selected.map((item) => ({
            name: item.name,
            type: item.type,
            data: item.data,
        }));
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `magick-templates-${templateType}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const handleImportTemplates = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            const templates = Array.isArray(json) ? json : [];
            await apiFetch({
                path: '/magick-ad/v1/templates/import',
                method: 'POST',
                data: { templates },
            });
            await loadTemplates(templateType);
            setNotice({
                status: 'success',
                message: '模板导入完成',
            });
        } catch (err) {
            setNotice({
                status: 'error',
                message: err?.message || '模板导入失败',
            });
        }
    };

    const handleSave = async () => {
        if (noticeTimerRef.current) {
            window.clearTimeout(noticeTimerRef.current);
            noticeTimerRef.current = null;
        }
        setNotice(null);

        const missingPosition = ads.filter(
            (ad) => !ad.options?.show_position
        );
        if (missingPosition.length > 0) {
            setShowValidation(true);
            setNotice({
                status: 'error',
                message: `请为 ${missingPosition.length} 个广告选择展示位置。`,
            });
            noticeTimerRef.current = window.setTimeout(() => {
                setNotice(null);
                noticeTimerRef.current = null;
            }, 4000);
            return;
        }
        setShowValidation(false);

        try {
            await saveToDB();
            setNotice({ status: 'success', message: '保存成功' });
            noticeTimerRef.current = window.setTimeout(() => {
                setNotice(null);
                noticeTimerRef.current = null;
            }, 2500);
        } catch (err) {
            const message =
                err?.data?.message ||
                err?.message ||
                '保存失败，请检查网络或权限设置。';
            setNotice({ status: 'error', message });
            noticeTimerRef.current = window.setTimeout(() => {
                setNotice(null);
                noticeTimerRef.current = null;
            }, 4000);
        }
    };

    useEffect(() => {
        return () => {
            if (noticeTimerRef.current) {
                window.clearTimeout(noticeTimerRef.current);
            }
        };
    }, []);

    const leftSidebar = (
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
                                missingPositionIds.has(ad.id) ? 'has-error' : ''
                            }`}
                        >
                            <Button
                                variant="tertiary"
                                isPressed={selectedId === ad.id}
                                onClick={() => setSelectedId(ad.id)}
                            >
                                <span className="magick-ad-sidebar__label">
                                    {ad.name || `广告组 ${index + 1}`}
                                </span>
                                <span className="magick-ad-type">
                                    {ad.options?.ad_type === 'targeted'
                                        ? '指定广告'
                                        : '全局广告'}
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
                                onClick={() => removeAdGroup(ad.id)}
                            >
                                删除
                            </Button>
                        </div>
                    ))}
                </nav>
            </CardBody>
        </Card>
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
                                    <div className="magick-ad-template-actions">
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                openTemplateLibrary('image')
                                            }
                                        >
                                            模板库
                                        </Button>
                                        <Button
                                            variant="tertiary"
                                            onClick={() =>
                                                handleSaveTemplate('image')
                                            }
                                        >
                                            存为模板
                                        </Button>
                                    </div>
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
                                                            label="圆角效果"
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
                                                            label="最大宽度"
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
                                                            label="距离顶部"
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
                                                            label="距离底部"
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
                                                            label="距离左边"
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
                                                            label="距离右边"
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
                                    <TabPanel
                                        key={selectedAd.id}
                                        className="magick-ad-html-tabs"
                                        tabs={[
                                            { name: 'content', title: '内容' },
                                            {
                                                name: 'templates',
                                                title: '模板库',
                                            },
                                        ]}
                                        initialTabName="content"
                                        onSelect={(name) =>
                                            setHtmlTab(name)
                                        }
                                    >
                                        {() => null}
                                    </TabPanel>

                                    <div
                                        className={`magick-ad-html-tab ${
                                            htmlTab === 'content'
                                                ? ''
                                                : 'is-hidden'
                                        }`}
                                    >
                                        <ClassicEditor
                                            value={
                                                selectedAd.content?.html || ''
                                            }
                                            active={
                                                activeContentType === 'html' &&
                                                htmlTab === 'content'
                                            }
                                            onChange={(value) =>
                                                handleUpdateContent({
                                                    html: value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div
                                        className={`magick-ad-html-tab ${
                                            htmlTab === 'templates'
                                                ? ''
                                                : 'is-hidden'
                                        }`}
                                    >
                                        <div className="magick-ad-template-grid">
                                            {HTML_TEMPLATES.map((template) => (
                                                <div
                                                    key={template.id}
                                                    className="magick-ad-template-card"
                                                >
                                                    <div className="magick-ad-template-card__body">
                                                        <h4>
                                                            {template.title}
                                                        </h4>
                                                        <p>
                                                            {
                                                                template.description
                                                            }
                                                        </p>
                                                    </div>
                                                    <div className="magick-ad-template-card__actions">
                                                        <Button
                                                            variant="primary"
                                                            onClick={() =>
                                                                handleUpdateContent(
                                                                    {
                                                                        html: template.html,
                                                                        container_style:
                                                                            template.container_style,
                                                                    }
                                                                )
                                                            }
                                                        >
                                                            应用
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </PanelBody>
                            </Panel>
                        </div>

                        {activeContentType === 'video' && (
                            <Panel>
                                <PanelBody title="内容配置" initialOpen>
                                    <div className="magick-ad-template-actions">
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                openTemplateLibrary('video')
                                            }
                                        >
                                            模板库
                                        </Button>
                                        <Button
                                            variant="tertiary"
                                            onClick={() =>
                                                handleSaveTemplate('video')
                                            }
                                        >
                                            存为模板
                                        </Button>
                                    </div>
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
                                    <div className="magick-ad-template-actions">
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                openTemplateLibrary('block')
                                            }
                                        >
                                            模板库
                                        </Button>
                                        <Button
                                            variant="tertiary"
                                            onClick={() =>
                                                handleSaveTemplate('block')
                                            }
                                        >
                                            存为模板
                                        </Button>
                                    </div>
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

            <Card>
                <CardBody>
                    <div className="magick-ad-publish__header">
                        <h2>发布</h2>
                    </div>
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
                    onRemove={() => setNotice(null)}
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

            <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            <Card>
                <CardBody>
                    <Panel>
                        <PanelBody title="调试设置" initialOpen={false}>
                            {debugLocked && (
                                <Notice status="warning" isDismissible={false}>
                                    调试已在 wp-config.php 中强制开启。
                                </Notice>
                            )}
                            {debugError && (
                                <Notice status="error" isDismissible>
                                    {debugError.message ||
                                        '调试开关加载失败'}
                                </Notice>
                            )}
                            <ToggleControl
                                label="启用调试日志"
                                checked={debugEnabled}
                                disabled={
                                    debugLocked || debugLoading || debugSaving
                                }
                                onChange={(value) => {
                                    setDebugEnabled(value);
                                    setDebugSaving(true);
                                    apiFetch({
                                        path: '/magick-ad/v1/debug',
                                        method: 'POST',
                                        data: {
                                            enabled: value,
                                            log_settings: debugLogSettings,
                                        },
                                    })
                                        .then(() => {
                                            setDebugSaving(false);
                                            setNotice({
                                                status: 'success',
                                                message: '调试设置已更新',
                                            });
                                            noticeTimerRef.current =
                                                window.setTimeout(() => {
                                                    setNotice(null);
                                                    noticeTimerRef.current =
                                                        null;
                                                }, 2500);
                                        })
                                        .catch((err) => {
                                            setDebugSaving(false);
                                            setDebugEnabled(!value);
                                            setDebugError(err);
                                            setNotice({
                                                status: 'error',
                                                message:
                                                    err?.message ||
                                                    '调试设置更新失败',
                                            });
                                        });
                                }}
                                help={
                                    debugLoading
                                        ? '正在加载调试状态…'
                                        : '开启后会将调试信息写入 debug.log'
                                }
                            />
                            <ToggleControl
                                label="记录设置快照（settings=Array）"
                                checked={debugLogSettings}
                                disabled={
                                    debugLoading || debugSaving || !debugEnabled
                                }
                                onChange={(value) => {
                                    setDebugLogSettings(value);
                                    setDebugSaving(true);
                                    apiFetch({
                                        path: '/magick-ad/v1/debug',
                                        method: 'POST',
                                        data: {
                                            enabled: debugEnabled,
                                            log_settings: value,
                                        },
                                    })
                                        .then(() => {
                                            setDebugSaving(false);
                                            setNotice({
                                                status: 'success',
                                                message: '调试设置已更新',
                                            });
                                            noticeTimerRef.current =
                                                window.setTimeout(() => {
                                                    setNotice(null);
                                                    noticeTimerRef.current =
                                                        null;
                                                }, 2500);
                                        })
                                        .catch((err) => {
                                            setDebugSaving(false);
                                            setDebugLogSettings(!value);
                                            setDebugError(err);
                                            setNotice({
                                                status: 'error',
                                                message:
                                                    err?.message ||
                                                    '调试设置更新失败',
                                            });
                                        });
                                }}
                                help="控制 settings=Array 是否写入 debug.log"
                            />
                        </PanelBody>
                    </Panel>
                </CardBody>
            </Card>
        </div>
    );
};

const App = () => {
    const tabs = [
        { name: 'ads', title: '广告配置', className: 'magick-ad-tab' },
        { name: 'report', title: '统计看板', className: 'magick-ad-tab' },
    ];

    return (
        <TabPanel tabs={tabs}>
            {(tab) =>
                tab.name === 'report' ? (
                    <Suspense fallback={<Notice status="info">加载中…</Notice>}>
                        <Dashboard />
                    </Suspense>
                ) : (
                    <AdsConfig />
                )
            }
        </TabPanel>
    );
};

const container = document.getElementById('magick-ad-app');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
