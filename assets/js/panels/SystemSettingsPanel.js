import { useEffect, useState } from '@wordpress/element';
import {
    Card,
    CardBody,
    Notice,
    Panel,
    PanelBody,
    SelectControl,
    TextControl,
    ToggleControl,
} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

const DEFAULT_SETTINGS = {
    tracking_strategy: 'session',
    tracking_require_consent: false,
    stats_diagnostics: false,
    brand_name: 'Magick AD',
    brand_tagline: '广告配置与投放规则管理',
    manage_capability: 'manage_options',
};

const SystemSettingsPanel = ({ onNotice }) => {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        apiFetch({ path: '/magick-ad/v1/system-settings' })
            .then((response) => {
                if (!mounted) {
                    return;
                }
                setSettings({ ...DEFAULT_SETTINGS, ...response });
                setLoading(false);
            })
            .catch((err) => {
                if (!mounted) {
                    return;
                }
                setError(err);
                setLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const persist = (next) => {
        setSaving(true);
        setError(null);
        apiFetch({
            path: '/magick-ad/v1/system-settings',
            method: 'POST',
            data: next,
        })
            .then((response) => {
                setSettings({ ...DEFAULT_SETTINGS, ...response });
                setSaving(false);
                onNotice?.('success', '系统设置已更新');
            })
            .catch((err) => {
                setSaving(false);
                setError(err);
                onNotice?.('error', err?.message || '系统设置更新失败');
            });
    };

    const updateSettings = (patch, persistNow = true) => {
        const next = { ...settings, ...patch };
        setSettings(next);
        if (persistNow) {
            persist(next);
        }
    };

    return (
        <Card>
            <CardBody>
                <Panel>
                    <PanelBody title="隐私与系统设置" initialOpen={false}>
                        {error && (
                            <Notice status="error" isDismissible>
                                {error.message || '系统设置加载失败'}
                            </Notice>
                        )}
                        <SelectControl
                            label="统计去重策略"
                            value={settings.tracking_strategy}
                            disabled={loading || saving}
                            options={[
                                { label: '无标识（每次请求随机）', value: 'request' },
                                { label: '会话级（sessionStorage）', value: 'session' },
                                { label: '持久 Cookie（需同意）', value: 'cookie' },
                                { label: '登录用户 ID', value: 'user' },
                            ]}
                            onChange={(value) =>
                                updateSettings({ tracking_strategy: value })
                            }
                            help="默认不使用 Cookie，可按需切换。"
                        />
                        <ToggleControl
                            label="统计需要同意后才写入"
                            checked={Boolean(settings.tracking_require_consent)}
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSettings({
                                    tracking_require_consent: value,
                                })
                            }
                            help="可通过 magick_ad_has_consent 接入站点同意逻辑。"
                        />
                        <ToggleControl
                            label="启用统计诊断日志"
                            checked={Boolean(settings.stats_diagnostics)}
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSettings({ stats_diagnostics: value })
                            }
                            help="仅诊断时记录 page_url / user_agent / user_id。"
                        />
                        <TextControl
                            label="后台名称（白标）"
                            value={settings.brand_name}
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSettings({ brand_name: value }, false)
                            }
                            onBlur={() =>
                                updateSettings(
                                    { brand_name: settings.brand_name },
                                    true
                                )
                            }
                        />
                        <TextControl
                            label="后台副标题"
                            value={settings.brand_tagline}
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSettings(
                                    { brand_tagline: value },
                                    false
                                )
                            }
                            onBlur={() =>
                                updateSettings(
                                    { brand_tagline: settings.brand_tagline },
                                    true
                                )
                            }
                        />
                        <SelectControl
                            label="后台管理权限"
                            value={settings.manage_capability}
                            disabled={loading || saving}
                            options={[
                                { label: '仅管理员 (manage_options)', value: 'manage_options' },
                                { label: 'Magick AD 管理员', value: 'manage_magick_ads' },
                            ]}
                            onChange={(value) =>
                                updateSettings({ manage_capability: value })
                            }
                            help="切换后可能需要重新登录后台。"
                        />
                    </PanelBody>
                </Panel>
            </CardBody>
        </Card>
    );
};

export default SystemSettingsPanel;
