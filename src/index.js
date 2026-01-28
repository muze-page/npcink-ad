import { createRoot, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import {
    Button,
    Panel,
    PanelBody,
    SelectControl,
    TextControl,
    ToggleControl,
} from '@wordpress/components';
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

const App = () => {
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

    return (
        <div className="magick-ad-root">
            <div className="magick-ad-header">
                <h1>Magick AD</h1>
                <Button
                    variant="primary"
                    onClick={saveToDB}
                    isBusy={isSaving}
                    disabled={isSaving}
                >
                    {isSaving ? '保存中...' : '保存'}
                </Button>
            </div>

            {isLoading && <p>加载中...</p>}
            {error && <p>错误: {error.message || '请求失败'}</p>}

            <div className="magick-ad-layout">
                <aside className="magick-ad-sidebar">
                    <div className="magick-ad-sidebar__header">
                        <h2>广告组</h2>
                        <Button variant="secondary" onClick={addAdGroup}>
                            新增
                        </Button>
                    </div>
                    {ads.length === 0 && <p>暂无广告组。</p>}
                    <div className="magick-ad-sidebar__list">
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
                    </div>
                </aside>

                <section className="magick-ad-detail">
                    {!selectedAd && (
                        <p>请选择一个广告组进行配置。</p>
                    )}
                    {selectedAd && (
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
                                    checked={selectedAd.options?.enabled ?? true}
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
                                        selectedAd.options?.displayPage || 'all'
                                    }
                                    options={[
                                        { label: '全站', value: 'all' },
                                        { label: '仅文章页', value: 'posts' },
                                        { label: '仅页面', value: 'pages' },
                                    ]}
                                    onChange={(value) =>
                                        handleUpdateOptions({
                                            displayPage: value,
                                        })
                                    }
                                />

                                {selectedAd.options?.displayPage === 'posts' && (
                                    <SelectControl
                                        label="文章内部位置"
                                        value={
                                            selectedAd.options?.postPosition ||
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
                                        selectedAd.options?.placement || 'sidebar'
                                    }
                                    options={[
                                        { label: '侧边栏', value: 'sidebar' },
                                        { label: '页眉', value: 'header' },
                                        { label: '页脚', value: 'footer' },
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
                                    value={selectedAd.content?.link || ''}
                                    onChange={(value) =>
                                        handleUpdateContent({ link: value })
                                    }
                                />
                                <TextControl
                                    label="HTML 内容"
                                    value={selectedAd.content?.html || ''}
                                    onChange={(value) =>
                                        handleUpdateContent({ html: value })
                                    }
                                />
                                <div className="magick-ad-field">
                                    <p className="magick-ad-field__label">
                                        图片
                                    </p>
                                    <ImagePicker
                                        value={selectedAd.content?.image || null}
                                        onChange={(value) =>
                                            handleUpdateContent({
                                                image: value,
                                            })
                                        }
                                    />
                                </div>
                            </PanelBody>
                        </Panel>
                    )}
                </section>
            </div>
        </div>
    );
};

const container = document.getElementById('magick-ad-app');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
