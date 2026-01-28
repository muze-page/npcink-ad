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
    const noticeTimerRef = useRef(null);

    useEffect(() => {
        fetchFromDB();
    }, [fetchFromDB]);

    useEffect(() => {
        if (!selectedId && ads.length > 0) {
            setSelectedId(ads[0].id);
        }
    }, [ads, selectedId]);

    const selectedAd = useMemo(
        () => ads.find((ad) => ad.id === selectedId),
        [ads, selectedId]
    );

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
                <Button
                    variant="primary"
                    onClick={handleSave}
                    isBusy={isSaving}
                    disabled={isSaving}
                >
                    {isSaving ? '保存中...' : '保存更改'}
                </Button>
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

            <div className="magick-ad-layout">
                <aside className="magick-ad-sidebar">
                    <Card>
                        <CardBody>
                            <div className="magick-ad-sidebar__header">
                                <h2>广告组</h2>
                                <Button variant="secondary" onClick={addAdGroup}>
                                    新增广告组
                                </Button>
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
                                        }`}
                                    >
                                        <Button
                                            variant="tertiary"
                                            isPressed={selectedId === ad.id}
                                            onClick={() => setSelectedId(ad.id)}
                                        >
                                            {ad.name || `广告组 ${index + 1}`}
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

                <section className="magick-ad-detail">
                    {!selectedAd && (
                        <Card>
                            <CardBody>
                                <p>请选择一个广告组进行配置。</p>
                            </CardBody>
                        </Card>
                    )}
                    {selectedAd && (
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
                                            checked={
                                                selectedAd.options?.enabled ??
                                                true
                                            }
                                            onChange={(value) =>
                                                handleUpdateOptions({
                                                    enabled: value,
                                                })
                                            }
                                        />
                                    </PanelBody>

                                    <PanelBody title="展示规则" initialOpen>
                                        <SelectControl
                                            label="展示页面"
                                            value={
                                                selectedAd.options?.displayPage ||
                                                'all'
                                            }
                                            options={[
                                                { label: '全站', value: 'all' },
                                                {
                                                    label: '仅文章页',
                                                    value: 'posts',
                                                },
                                                {
                                                    label: '仅页面',
                                                    value: 'pages',
                                                },
                                            ]}
                                            onChange={(value) =>
                                                handleUpdateOptions({
                                                    displayPage: value,
                                                })
                                            }
                                        />

                                        {selectedAd.options?.displayPage ===
                                            'posts' && (
                                            <SelectControl
                                                label="文章内部位置"
                                                value={
                                                    selectedAd.options
                                                        ?.postPosition ||
                                                    'content-bottom'
                                                }
                                                options={[
                                                    {
                                                        label: '正文开头',
                                                        value: 'content-top',
                                                    },
                                                    {
                                                        label: '正文中间',
                                                        value: 'content-middle',
                                                    },
                                                    {
                                                        label: '正文结尾',
                                                        value: 'content-bottom',
                                                    },
                                                ]}
                                                onChange={(value) =>
                                                    handleUpdateOptions({
                                                        postPosition: value,
                                                    })
                                                }
                                            />
                                        )}

                                        <SelectControl
                                            label="展示位置"
                                            value={
                                                selectedAd.options?.placement ||
                                                'sidebar'
                                            }
                                            options={[
                                                {
                                                    label: '侧边栏',
                                                    value: 'sidebar',
                                                },
                                                {
                                                    label: '页眉',
                                                    value: 'header',
                                                },
                                                {
                                                    label: '页脚',
                                                    value: 'footer',
                                                },
                                            ]}
                                            onChange={(value) =>
                                                handleUpdateOptions({
                                                    placement: value,
                                                })
                                            }
                                        />
                                    </PanelBody>

                                    <PanelBody title="内容配置" initialOpen>
                                        <TextControl
                                            label="跳转链接"
                                            value={
                                                selectedAd.content?.link || ''
                                            }
                                            onChange={(value) =>
                                                handleUpdateContent({
                                                    link: value,
                                                })
                                            }
                                        />
                                        <TextControl
                                            label="HTML 内容"
                                            value={
                                                selectedAd.content?.html || ''
                                            }
                                            onChange={(value) =>
                                                handleUpdateContent({
                                                    html: value,
                                                })
                                            }
                                        />
                                        <div className="magick-ad-field">
                                            <p className="magick-ad-field__label">
                                                图片
                                            </p>
                                            <ImagePicker
                                                value={
                                                    selectedAd.content?.image ||
                                                    null
                                                }
                                                onChange={(value) =>
                                                    handleUpdateContent({
                                                        image: value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </PanelBody>
                                </Panel>
                            </CardBody>
                        </Card>
                    )}
                </section>
            </div>
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
