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
    tracking_dedupe_ttl: 86400,
    tracking_dedupe_scope: 'ad',
    tracking_require_signature: true,
    stats_diagnostics: false,
    stats_diagnostics_retention_days: 7,
    stats_diagnostics_auto_off_days: 7,
    stats_diagnostics_expires_at: 0,
    slot_client_resolver: true,
    html_sandbox: false,
    brand_name: 'Magick AD',
    brand_tagline: '广告配置与投放规则管理',
    manage_capability: 'manage_options',
};

const SystemSettingsPanel = ({ onNotice }) => {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const diagnosticsExpiryLabel = (() => {
        if (!settings.stats_diagnostics_expires_at) {
            return '';
        }
        const date = new Date(settings.stats_diagnostics_expires_at * 1000);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        return date.toLocaleString();
    })();

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
                        <div className="magick-ad-settings-expiry">
                            <strong>诊断到期时间：</strong>
                            {diagnosticsExpiryLabel ? diagnosticsExpiryLabel : '未启用'}
                        </div>
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
                        {settings.tracking_strategy === 'cookie' && (
                            <Notice status="info" isDismissible={false}>
                                Cookie 策略依赖同意状态。未同意时会自动回退到无
                                Cookie 的策略。
                            </Notice>
                        )}
                        <TextControl
                            label="统计去重窗口（秒）"
                            type="number"
                            value={settings.tracking_dedupe_ttl}
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSettings({
                                    tracking_dedupe_ttl: Number(value) || 60,
                                })
                            }
                            help="用于去重/防刷；在窗口内同一广告只计一次。默认 86400 秒。"
                        />
                        <SelectControl
                            label="去重口径"
                            value={settings.tracking_dedupe_scope}
                            disabled={loading || saving}
                            options={[
                                {
                                    label: '按广告（同页同广告仅算一次）',
                                    value: 'ad',
                                },
                                {
                                    label: '按位置（同广告不同位置分别统计）',
                                    value: 'placement',
                                },
                            ]}
                            onChange={(value) =>
                                updateSettings({
                                    tracking_dedupe_scope: value,
                                })
                            }
                            help="默认按广告去重；如需按位置统计请选择“按位置”。"
                        />
                        <ToggleControl
                            label="强制签名校验"
                            checked={Boolean(settings.tracking_require_signature)}
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSettings({
                                    tracking_require_signature: value,
                                })
                            }
                            help="关闭后可接受无签名的 /track 请求（风险更高）。"
                        />
                        <ToggleControl
                            label="启用缓存友好 Slot 轮播（客户端选择）"
                            checked={Boolean(settings.slot_client_resolver)}
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSettings({
                                    slot_client_resolver: value,
                                })
                            }
                            help="开启后仅输出候选 ID，由前端按权重决定展示，适配全页缓存场景。"
                        />
                        <ToggleControl
                            label="Full HTML 启用 iframe 沙箱"
                            checked={Boolean(settings.html_sandbox)}
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSettings({
                                    html_sandbox: value,
                                })
                            }
                            help="仅对 Full HTML 生效，默认关闭；开启后将隔离第三方脚本。"
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
                            label="诊断日志保留天数"
                            type="number"
                            value={settings.stats_diagnostics_retention_days}
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSettings({
                                    stats_diagnostics_retention_days:
                                        Number(value) || 7,
                                })
                            }
                            help="超过天数会自动清理诊断日志。"
                        />
                        <TextControl
                            label="诊断自动关闭天数"
                            type="number"
                            value={settings.stats_diagnostics_auto_off_days}
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSettings({
                                    stats_diagnostics_auto_off_days:
                                        Number(value) || 7,
                                })
                            }
                            help="开启诊断后，超过天数将自动关闭诊断模式。"
                        />
                        {settings.stats_diagnostics &&
                            diagnosticsExpiryLabel && (
                                <Notice status="info" isDismissible={false}>
                                    诊断模式将在 {diagnosticsExpiryLabel} 自动关闭。
                                </Notice>
                            )}
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
