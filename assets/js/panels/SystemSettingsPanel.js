import { useEffect, useState } from '@wordpress/element';
import {
    Button,
    Card,
    CardBody,
    Notice,
    Panel,
    PanelBody,
    SelectControl,
    TextControl,
    TextareaControl,
    ToggleControl,
} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

const DEFAULT_SETTINGS = {
    tracking_enabled: true,
    tracking_strategy: 'session',
    tracking_require_consent: false,
    tracking_dedupe_ttl: 86400,
    tracking_dedupe_scope: 'ad',
    tracking_require_signature: true,
    tracking_secret_rotated_at: 0,
    tracking_secret_has_prev: false,
    tracking_secret_grace_seconds: 3600,
    stats_diagnostics: false,
    stats_diagnostics_retention_days: 7,
    stats_diagnostics_auto_off_days: 7,
    stats_diagnostics_expires_at: 0,
    rate_limit_fallback: 'off',
    stats_write_mode: 'async',
    stats_queue_metrics: {
        enabled: false,
        stats: 0,
        dim: 0,
        variant: 0,
        event: 0,
        total: 0,
        oldest_age: 0,
        oldest_at: 0,
        queue_limit: 0,
        flush_limit: 0,
        alert_limit: 0,
        alert_age: 0,
    },
    page_cache_detected: false,
    slot_client_resolver: true,
    html_sandbox: true,
    html_script_allowlist: [],
    html_script_blocklist: [],
    trusted_proxies: [],
    brand_name: 'Magick AD',
    brand_tagline: '广告配置与投放规则管理',
    manage_capability: 'manage_options',
    compatibility_checks: {
        checks: {},
        status: 'unknown',
    },
};

const LEVEL_STORAGE_KEY = 'magick_ad_settings_level';
const normalizeLevel = (value) =>
    value === 'advanced' || value === 'lab' ? value : 'simple';
const normalizeCheckStatus = (value) => {
    if (value === 'critical' || value === 'recommended' || value === 'good') {
        return value;
    }
    return 'unknown';
};

const SystemSettingsPanel = ({ onNotice }) => {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [openSection, setOpenSection] = useState('compatibility');
    const [displayLevel] = useState(() => {
        if (typeof window === 'undefined') {
            return 'simple';
        }
        try {
            const fromBoot = window.MagickAD?.settingsLevel;
            if (fromBoot) {
                return normalizeLevel(fromBoot);
            }
            return normalizeLevel(
                window.localStorage.getItem(LEVEL_STORAGE_KEY) || 'simple'
            );
        } catch (err) {
            return 'simple';
        }
    });

    const parseDomainList = (value = '') =>
        value
            .split(/[\s,;]+/)
            .map((item) => item.trim())
            .filter(Boolean);

    const formatDomainList = (list) =>
        Array.isArray(list) ? list.join('\n') : '';

    const formatAge = (seconds) => {
        const value = Number(seconds || 0);
        if (!value) {
            return '0 秒';
        }
        if (value < 60) {
            return `${Math.round(value)} 秒`;
        }
        if (value < 3600) {
            return `${Math.ceil(value / 60)} 分钟`;
        }
        if (value < 86400) {
            const hours = value / 3600;
            return Number.isInteger(hours)
                ? `${hours} 小时`
                : `${hours.toFixed(1)} 小时`;
        }
        const days = value / 86400;
        return Number.isInteger(days) ? `${days} 天` : `${days.toFixed(1)} 天`;
    };

    const queueMetrics = settings.stats_queue_metrics || {};
    const queueEnabled = Boolean(queueMetrics.enabled);
    const queueTotal = Number(queueMetrics.total || 0);
    const queueOldestAge = Number(queueMetrics.oldest_age || 0);
    const queueAlertLimit = Number(queueMetrics.alert_limit || 0);
    const queueAlertAge = Number(queueMetrics.alert_age || 0);
    const siteHealthUrl =
        window?.MagickAD?.siteHealthUrl || '/wp-admin/site-health.php?tab=direct';
    const isAdvanced = displayLevel !== 'simple';
    const isLab = displayLevel === 'lab';
    const queueStatus =
        queueEnabled &&
        ((queueAlertLimit && queueTotal >= queueAlertLimit * 2) ||
            (queueAlertAge && queueOldestAge >= queueAlertAge * 2))
            ? 'critical'
            : queueEnabled &&
                ((queueAlertLimit && queueTotal >= queueAlertLimit) ||
                    (queueAlertAge && queueOldestAge >= queueAlertAge))
              ? 'recommended'
              : 'good';

    const queueSummary = queueEnabled
        ? `队列 ${queueTotal} 条，最久等待 ${formatAge(queueOldestAge)}。`
        : '队列未启用（当前非异步写入或启用了其他聚合策略）。';

    const backendChecks = settings.compatibility_checks?.checks || {};
    const checkCards = [
        {
            key: 'node',
            title: '节点插入',
            status: normalizeCheckStatus(backendChecks.node?.status),
            summary:
                backendChecks.node?.summary ||
                '请在站点健康中检查节点目标选择器与回退策略。',
            action:
                backendChecks.node?.action ||
                '若节点可能变化，建议回退策略选择 footer。',
        },
        {
            key: 'cron',
            title: 'Cron 任务',
            status: normalizeCheckStatus(backendChecks.cron?.status),
            summary:
                backendChecks.cron?.summary ||
                '请在站点健康中确认统计刷新和清理任务已计划。',
            action:
                backendChecks.cron?.action ||
                '若缺失任务，请启用 WP-Cron 或服务器 Crontab。',
        },
        {
            key: 'queue',
            title: '统计队列',
            status: normalizeCheckStatus(backendChecks.queue?.status || queueStatus),
            summary: backendChecks.queue?.summary || queueSummary,
            action:
                backendChecks.queue?.action ||
                '出现积压时请优先检查 Cron 与数据库写入性能。',
        },
        {
            key: 'consent',
            title: '同意钩子',
            status: normalizeCheckStatus(backendChecks.consent?.status),
            summary: backendChecks.consent?.summary
                || (settings.tracking_require_consent
                    ? '已开启同意门控，请确认 magick_ad_has_consent 已接入。'
                    : '未开启同意门控。'),
            action:
                backendChecks.consent?.action ||
                '若启用同意门控但无钩子，默认视为未同意且不写统计。',
        },
    ];

    const secretRotatedLabel = (() => {
        if (!settings.tracking_secret_rotated_at) {
            return '';
        }
        const date = new Date(settings.tracking_secret_rotated_at * 1000);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        return date.toLocaleString();
    })();

    const secretGraceLabel = (() => {
        const seconds = Number(settings.tracking_secret_grace_seconds || 0);
        if (!seconds) {
            return '';
        }
        if (seconds < 3600) {
            return `${Math.round(seconds / 60)} 分钟`;
        }
        const hours = seconds / 3600;
        return hours % 1 === 0 ? `${hours} 小时` : `${hours.toFixed(1)} 小时`;
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

    const handleToggleSection = (key) => {
        setOpenSection((current) => (current === key ? null : key));
    };

    const rotateSecret = () => {
        if (
            !window.confirm(
                '将立即轮换签名密钥。旧密钥仅在兼容窗口内有效，确认继续？'
            )
        ) {
            return;
        }
        setSaving(true);
        setError(null);
        apiFetch({
            path: '/magick-ad/v1/system-settings',
            method: 'POST',
            data: { rotate_track_secret: true },
        })
            .then((response) => {
                setSettings({ ...DEFAULT_SETTINGS, ...response });
                setSaving(false);
                onNotice?.('success', '签名密钥已轮换');
            })
            .catch((err) => {
                setSaving(false);
                setError(err);
                onNotice?.('error', err?.message || '签名密钥轮换失败');
            });
    };

    return (
        <Card>
            <CardBody>
                <div className="magick-ad-field__label">隐私与系统设置</div>
                <Notice status="info" isDismissible={false}>
                    显示级别入口已调整到“实验与高级”标签页。
                </Notice>
                {isLab && (
                    <Notice status="warning" isDismissible={false}>
                        实验室模式会显示所有高级选项，请谨慎修改。
                    </Notice>
                )}
                {error && (
                    <Notice status="error" isDismissible>
                        {error.message || '系统设置加载失败'}
                    </Notice>
                )}
                <Panel>
                    <PanelBody
                        title="兼容体检"
                        opened={openSection === 'compatibility'}
                        onToggle={() => handleToggleSection('compatibility')}
                    >
                        <Notice status="info" isDismissible={false}>
                            建议先完成兼容体检，再调整统计与安全参数。
                        </Notice>
                        <div className="magick-ad-compatibility-grid">
                            {checkCards.map((card) => (
                                <div
                                    key={card.key}
                                    className={`magick-ad-compatibility-card is-${card.status}`}
                                >
                                    <div className="magick-ad-compatibility-card__head">
                                        <strong>{card.title}</strong>
                                        <span className="magick-ad-compatibility-card__status">
                                            {card.status === 'good'
                                                ? '正常'
                                                : card.status === 'recommended'
                                                  ? '建议处理'
                                                  : card.status === 'critical'
                                                    ? '高风险'
                                                    : '待检查'}
                                        </span>
                                    </div>
                                    <p>{card.summary}</p>
                                    <p className="description">{card.action}</p>
                                </div>
                            ))}
                        </div>
                        <Button
                            variant="secondary"
                            href={siteHealthUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                            打开站点健康（Magick AD）
                        </Button>
                    </PanelBody>
                    <PanelBody
                        title="统计与去重"
                        opened={openSection === 'tracking'}
                        onToggle={() => handleToggleSection('tracking')}
                    >
                        <ToggleControl
                            label="启用前台统计"
                            checked={Boolean(settings.tracking_enabled)}
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSettings({ tracking_enabled: value })
                            }
                            help="关闭后不加载统计脚本，前台不再上报数据。"
                        />
                        {!settings.tracking_enabled && (
                            <Notice status="warning" isDismissible={false}>
                                统计已关闭，报表将暂停更新（不影响广告展示）。
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
                        {isAdvanced && (
                            <>
                                <SelectControl
                                    label="统计写入模式"
                                    value={settings.stats_write_mode}
                                    disabled={loading || saving}
                                    options={[
                                        { label: '异步写入（推荐）', value: 'async' },
                                        { label: '同步写入', value: 'sync' },
                                    ]}
                                    onChange={(value) =>
                                        updateSettings({
                                            stats_write_mode: value,
                                        })
                                    }
                                    help="异步会进入统计队列，定时批量落库；同步直接写库。"
                                />
                                <div className="magick-ad-settings-expiry">
                                    <strong>统计队列：</strong>
                                    {queueEnabled
                                        ? `${queueTotal} 条`
                                        : '未启用'}
                                    {queueEnabled && (
                                        <span className="magick-ad-settings-secret__hint">
                                            （最久等待 {formatAge(queueOldestAge)}）
                                        </span>
                                    )}
                                </div>
                                {queueEnabled &&
                                    (queueTotal > 0 || queueOldestAge > 0) && (
                                        <Notice status="info" isDismissible={false}>
                                            当前队列：主表 {queueMetrics.stats || 0}{' '}
                                            / 维度 {queueMetrics.dim || 0} / 变体{' '}
                                            {queueMetrics.variant || 0} / 事件{' '}
                                            {queueMetrics.event || 0}
                                        </Notice>
                                    )}
                                {queueEnabled &&
                                    ((queueAlertLimit &&
                                        queueTotal >= queueAlertLimit) ||
                                        (queueAlertAge &&
                                            queueOldestAge >= queueAlertAge)) && (
                                        <Notice status="warning" isDismissible={false}>
                                            队列出现积压，请检查 Cron 是否运行正常及数据库写入性能。
                                        </Notice>
                                    )}
                            </>
                        )}
                    </PanelBody>
                    <PanelBody
                        title="安全与缓存"
                        opened={openSection === 'security'}
                        onToggle={() => handleToggleSection('security')}
                    >
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
                        <div className="magick-ad-settings-secret">
                            <div className="magick-ad-settings-secret__meta">
                                <strong>签名密钥轮换：</strong>
                                {secretRotatedLabel ? secretRotatedLabel : '未轮换'}
                                {secretGraceLabel && (
                                    <span className="magick-ad-settings-secret__hint">
                                        （兼容窗口 {secretGraceLabel}）
                                    </span>
                                )}
                            </div>
                            {settings.tracking_secret_has_prev && (
                                <Notice status="info" isDismissible={false}>
                                    旧密钥在兼容窗口内仍可验证，避免已渲染页面立即失效。
                                </Notice>
                            )}
                            <Button
                                variant="secondary"
                                disabled={loading || saving}
                                onClick={rotateSecret}
                            >
                                轮换签名密钥
                            </Button>
                        </div>
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
                        {isAdvanced && (
                            <SelectControl
                                label="限流回退策略（无持久化缓存时）"
                                value={settings.rate_limit_fallback}
                                disabled={loading || saving}
                                options={[
                                    { label: '关闭（推荐）', value: 'off' },
                                    {
                                        label: '使用 transient（写入数据库）',
                                        value: 'transient',
                                    },
                                ]}
                                onChange={(value) =>
                                    updateSettings({
                                        rate_limit_fallback: value,
                                    })
                                }
                                help="默认关闭：当没有持久化缓存时不做限流回退，避免 transient 写入压力。"
                            />
                        )}
                        {settings.page_cache_detected &&
                            !settings.slot_client_resolver && (
                                <Notice status="warning" isDismissible={false}>
                                    检测到可能启用了全页缓存，随机策略=请求在缓存页面会失效。
                                    建议启用“缓存友好 Slot 轮播”或改用随机=会话策略。
                                    <div style={{ marginTop: 8 }}>
                                        <Button
                                            variant="primary"
                                            size="small"
                                            disabled={loading || saving}
                                            onClick={() =>
                                                updateSettings({
                                                    slot_client_resolver: true,
                                                })
                                            }
                                        >
                                            一键启用轮播
                                        </Button>
                                    </div>
                                </Notice>
                            )}
                        {isAdvanced && (
                            <>
                                <ToggleControl
                                    label="Full HTML 启用 iframe 沙箱"
                                    checked={Boolean(settings.html_sandbox)}
                                    disabled={loading || saving}
                                    onChange={(value) =>
                                        updateSettings({
                                            html_sandbox: value,
                                        })
                                    }
                                    help="仅对 Full HTML 生效，建议保持开启以隔离第三方脚本。"
                                />
                                {!settings.html_sandbox && (
                                    <Notice status="warning" isDismissible={false}>
                                        已关闭沙箱：Full HTML 将直接在页面执行脚本，风险较高。
                                    </Notice>
                                )}
                                <TextareaControl
                                    label="脚本白名单（系统级）"
                                    value={formatDomainList(
                                        settings.html_script_allowlist
                                    )}
                                    disabled={loading || saving}
                                    onChange={(value) =>
                                        updateSettings({
                                            html_script_allowlist:
                                                parseDomainList(value),
                                        })
                                    }
                                    help="默认只允许当前站点域名。每行一个域名或用逗号分隔。"
                                />
                                <TextareaControl
                                    label="脚本黑名单（系统级）"
                                    value={formatDomainList(
                                        settings.html_script_blocklist
                                    )}
                                    disabled={loading || saving}
                                    onChange={(value) =>
                                        updateSettings({
                                            html_script_blocklist:
                                                parseDomainList(value),
                                        })
                                    }
                                    help="系统级黑名单优先生效，命中即移除脚本。"
                                />
                                <TextareaControl
                                    label="可信代理白名单"
                                    value={formatDomainList(settings.trusted_proxies)}
                                    disabled={loading || saving}
                                    onChange={(value) =>
                                        updateSettings({
                                            trusted_proxies: parseDomainList(value),
                                        })
                                    }
                                    help="仅当 REMOTE_ADDR 在此列表内，才信任 X-Forwarded-For/CF-Connecting-IP。支持 CIDR，每行一个。"
                                />
                            </>
                        )}
                    </PanelBody>
                    {isAdvanced && (
                        <PanelBody
                            title="品牌与权限"
                            opened={openSection === 'brand'}
                            onToggle={() => handleToggleSection('brand')}
                        >
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
                                    {
                                        label: '仅管理员 (manage_options)',
                                        value: 'manage_options',
                                    },
                                    {
                                        label: 'Magick AD 管理员',
                                        value: 'manage_magick_ads',
                                    },
                                ]}
                                onChange={(value) =>
                                    updateSettings({ manage_capability: value })
                                }
                                help="切换后可能需要重新登录后台。"
                            />
                        </PanelBody>
                    )}
                </Panel>
            </CardBody>
        </Card>
    );
};

export default SystemSettingsPanel;
