import {
    createRoot,
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
    DropdownMenu,
    MenuGroup,
    MenuItem,
    Notice,
    Panel,
    PanelBody,
    SelectControl,
    TabPanel,
    TextControl,
    ToggleControl,
} from '@wordpress/components';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useStore } from './store';

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
    const noticeTimerRef = useRef(null);

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
        const globalAds = ads.filter(
            (ad) => ad.options?.ad_type === 'global'
        );
        if (
            globalAds.length === 0 ||
            globalAds.every((ad) => ad.options?.show_position)
        ) {
            setShowValidation(false);
        }
    }, [ads, showValidation]);

    const selectedAd = useMemo(
        () => ads.find((ad) => ad.id === selectedId),
        [ads, selectedId]
    );

    const positionOptions = useMemo(() => {
        const page = selectedAd?.options?.show_page || 'all';
        return [
            { label: '请选择展示位置', value: '' },
            ...getPositionOptions(page),
        ];
    }, [selectedAd?.options?.show_page]);

    const missingPositionIds = useMemo(() => {
        return new Set(
            ads
                .filter(
                    (ad) =>
                        ad.options?.ad_type === 'global' &&
                        !ad.options?.show_position
                )
                .map((ad) => ad.id)
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

    const handleSave = async () => {
        if (noticeTimerRef.current) {
            window.clearTimeout(noticeTimerRef.current);
            noticeTimerRef.current = null;
        }
        setNotice(null);

        const missingPosition = ads.filter(
            (ad) =>
                ad.options?.ad_type === 'global' &&
                !ad.options?.show_position
        );
        if (missingPosition.length > 0) {
            setShowValidation(true);
            setNotice({
                status: 'error',
                message: `请为 ${missingPosition.length} 个全局广告选择展示位置。`,
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

            <div className="magick-ad-grid">
                <aside className="magick-ad-sidebar">
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
                                            selectedId === ad.id
                                                ? 'is-active'
                                                : ''
                                        } ${
                                            missingPositionIds.has(ad.id)
                                                ? 'has-error'
                                                : ''
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
                                                {ad.options?.ad_type ===
                                                'targeted'
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
                </aside>

                <section className="magick-ad-main">
                    <Card className="magick-ad-main-card">
                        <CardBody>
                            {!selectedAd && (
                                <div className="magick-ad-empty">
                                    <p>请选择一个广告组进行配置。</p>
                                </div>
                            )}
                            {selectedAd && (
                                <TabPanel
                                    className="magick-ad-inner-tabs"
                                    tabs={[
                                        { name: 'content', title: '内容' },
                                        { name: 'rules', title: '配置' },
                                    ]}
                                >
                                    {(tab) =>
                                        tab.name === 'content' ? (
                                            <Panel>
                                                <PanelBody
                                                    title="内容配置"
                                                    initialOpen
                                                >
                                                    <TextControl
                                                        label="跳转链接"
                                                        value={
                                                            selectedAd.content
                                                                ?.link || ''
                                                        }
                                                        onChange={(value) =>
                                                            handleUpdateContent(
                                                                {
                                                                    link: value,
                                                                }
                                                            )
                                                        }
                                                    />
                                                    <TextControl
                                                        label="HTML 内容"
                                                        value={
                                                            selectedAd.content
                                                                ?.html || ''
                                                        }
                                                        onChange={(value) =>
                                                            handleUpdateContent(
                                                                {
                                                                    html: value,
                                                                }
                                                            )
                                                        }
                                                    />
                                                    <div className="magick-ad-field">
                                                        <p className="magick-ad-field__label">
                                                            图片
                                                        </p>
                                                        <ImagePicker
                                                            value={
                                                                selectedAd
                                                                    .content
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
                                                </PanelBody>
                                            </Panel>
                                        ) : (
                                            <Panel>
                                                <PanelBody
                                                    title="基础信息"
                                                    initialOpen
                                                >
                                                    <TextControl
                                                        label="广告名称"
                                                        value={
                                                            selectedAd.name ||
                                                            ''
                                                        }
                                                        onChange={(value) =>
                                                            updateAdGroup(
                                                                selectedAd.id,
                                                                { name: value }
                                                            )
                                                        }
                                                    />
                                                </PanelBody>

                                                {selectedAd.options
                                                    ?.ad_type ===
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
                                                                selectedAd
                                                                    .options
                                                                    ?.show_page ||
                                                                'all'
                                                            }
                                                            options={
                                                                DISPLAY_PAGE_OPTIONS
                                                            }
                                                            onChange={(
                                                                value
                                                            ) => {
                                                                const allowedPositions =
                                                                    getPositionOptions(
                                                                        value
                                                                    ).map(
                                                                        (
                                                                            option
                                                                        ) =>
                                                                            option.value
                                                                    );
                                                                const nextPosition =
                                                                    allowedPositions.includes(
                                                                        selectedAd
                                                                            .options
                                                                            ?.show_position
                                                                    )
                                                                        ? selectedAd
                                                                              .options
                                                                              ?.show_position
                                                                        : '';
                                                                handleUpdateOptions(
                                                                    {
                                                                        show_page:
                                                                            value,
                                                                        show_position:
                                                                            nextPosition,
                                                                    }
                                                                );
                                                            }}
                                                        />

                                                        <SelectControl
                                                            label="展示位置"
                                                            value={
                                                                selectedAd
                                                                    .options
                                                                    ?.show_position ||
                                                                ''
                                                            }
                                                            className={
                                                                showValidation &&
                                                                !selectedAd
                                                                    .options
                                                                    ?.show_position
                                                                    ? 'magick-ad-control--error'
                                                                    : undefined
                                                            }
                                                            help={
                                                                showValidation &&
                                                                !selectedAd
                                                                    .options
                                                                    ?.show_position
                                                                    ? '请选择展示位置'
                                                                    : undefined
                                                            }
                                                            options={
                                                                positionOptions
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateOptions(
                                                                    {
                                                                        show_position:
                                                                            value,
                                                                    }
                                                                )
                                                            }
                                                        />

                                                    </PanelBody>
                                                )}

                                                <PanelBody
                                                    title="展示规则"
                                                    initialOpen
                                                >
                                                    {selectedAd.options
                                                        ?.ad_type !==
                                                        'global' && (
                                                        <Notice
                                                            status="info"
                                                            isDismissible={false}
                                                        >
                                                            指定广告的展示位置由定向规则决定。
                                                        </Notice>
                                                    )}

                                                    <SelectControl
                                                        label="是否展示"
                                                        value={
                                                            selectedAd.options
                                                                ?.display_mode ||
                                                            'show'
                                                        }
                                                        options={[
                                                            {
                                                                label: '展示',
                                                                value: 'show',
                                                            },
                                                            {
                                                                label: '随机',
                                                                value: 'random',
                                                            },
                                                            {
                                                                label: '隐藏',
                                                                value: 'hide',
                                                            },
                                                        ]}
                                                        onChange={(value) =>
                                                            handleUpdateOptions(
                                                                {
                                                                    display_mode:
                                                                        value,
                                                                }
                                                            )
                                                        }
                                                        help="随机：每次页面请求随机展示或隐藏"
                                                    />

                                                    <TextControl
                                                        label="截止时间"
                                                        type="date"
                                                        value={
                                                            selectedAd.options
                                                                ?.end_date || ''
                                                        }
                                                        onChange={(value) =>
                                                            handleUpdateOptions(
                                                                {
                                                                    end_date:
                                                                        value,
                                                                }
                                                            )
                                                        }
                                                        help="到期后自动隐藏广告"
                                                    />

                                                    <SelectControl
                                                        label="设备限制"
                                                        value={
                                                            selectedAd.options
                                                                ?.device ||
                                                            'all'
                                                        }
                                                        options={[
                                                            {
                                                                label: '全部设备',
                                                                value: 'all',
                                                            },
                                                            {
                                                                label: '仅移动端',
                                                                value: 'mobile',
                                                            },
                                                            {
                                                                label: '仅桌面端',
                                                                value: 'desktop',
                                                            },
                                                        ]}
                                                        onChange={(value) =>
                                                            handleUpdateOptions(
                                                                {
                                                                    device:
                                                                        value,
                                                                }
                                                            )
                                                        }
                                                    />

                                                    <SelectControl
                                                        label="登录状态"
                                                        value={
                                                            selectedAd.options
                                                                ?.login || 'all'
                                                        }
                                                        options={[
                                                            {
                                                                label: '全部用户',
                                                                value: 'all',
                                                            },
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
                                                            handleUpdateOptions(
                                                                {
                                                                    login:
                                                                        value,
                                                                }
                                                            )
                                                        }
                                                    />
                                                </PanelBody>
                                            </Panel>
                                        )
                                    }
                                </TabPanel>
                            )}
                        </CardBody>
                    </Card>
                </section>

                <aside className="magick-ad-publish">
                    <Card>
                        <CardBody>
                            <div className="magick-ad-publish__header">
                                <h2>发布</h2>
                            </div>
                            <ToggleControl
                                label="启用此广告"
                                checked={selectedAd?.options?.enabled ?? true}
                                disabled={!selectedAd}
                                onChange={(value) =>
                                    selectedAd &&
                                    handleUpdateOptions({ enabled: value })
                                }
                            />
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                isBusy={isSaving}
                                disabled={isSaving || !selectedAd}
                            >
                                {isSaving ? '保存中...' : '保存'}
                            </Button>
                        </CardBody>
                    </Card>
                </aside>
            </div>

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

const Dashboard = () => {
    const [range, setRange] = useState('7');
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setError(null);

        apiFetch({ path: `/magick-ad/v1/report?days=${range}` })
            .then((response) => {
                if (!isMounted) {
                    return;
                }
                setData(Array.isArray(response) ? response : []);
                setIsLoading(false);
            })
            .catch((err) => {
                if (!isMounted) {
                    return;
                }
                setError(err);
                setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [range]);

    const summary = useMemo(() => {
        return data.reduce(
            (acc, item) => {
                acc.views += Number(item.views || 0);
                acc.clicks += Number(item.clicks || 0);
                return acc;
            },
            { views: 0, clicks: 0 }
        );
    }, [data]);

    const ctr = summary.views
        ? ((summary.clicks / summary.views) * 100).toFixed(2)
        : '0.00';

    return (
        <div className="magick-ad-dashboard">
            <div className="magick-ad-header">
                <div>
                    <h1>统计看板</h1>
                    <p className="description">近 7 / 30 天投放趋势</p>
                </div>
                <SelectControl
                    label="日期范围"
                    value={range}
                    options={[
                        { label: '最近 7 天', value: '7' },
                        { label: '最近 30 天', value: '30' },
                    ]}
                    onChange={(value) => setRange(value)}
                />
            </div>

            {isLoading && <Notice status="info">加载中…</Notice>}
            {error && (
                <Notice status="error" isDismissible>
                    {error.message || '请求失败'}
                </Notice>
            )}

            {!isLoading && !error && (
                <div className="magick-ad-dashboard__content">
                    <div className="magick-ad-dashboard__cards">
                        <Card>
                            <CardBody>
                                <p className="magick-ad-dashboard__label">
                                    总展示
                                </p>
                                <p className="magick-ad-dashboard__value">
                                    {summary.views}
                                </p>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardBody>
                                <p className="magick-ad-dashboard__label">
                                    总点击
                                </p>
                                <p className="magick-ad-dashboard__value">
                                    {summary.clicks}
                                </p>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardBody>
                                <p className="magick-ad-dashboard__label">
                                    平均 CTR
                                </p>
                                <p className="magick-ad-dashboard__value">
                                    {ctr}%
                                </p>
                            </CardBody>
                        </Card>
                    </div>

                    <Card>
                        <CardBody>
                            <div className="magick-ad-dashboard__chart">
                                <ResponsiveContainer width="100%" height={320}>
                                    <LineChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="views"
                                            stroke="#1e1e1e"
                                            strokeWidth={2}
                                            dot={false}
                                            name="展示"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="clicks"
                                            stroke="#2271b1"
                                            strokeWidth={2}
                                            dot={false}
                                            name="点击"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}
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
            {(tab) => (tab.name === 'report' ? <Dashboard /> : <AdsConfig />)}
        </TabPanel>
    );
};

const container = document.getElementById('magick-ad-app');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
