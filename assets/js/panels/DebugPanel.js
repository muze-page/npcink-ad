import { useEffect, useState } from '@wordpress/element';
import {
    Button,
    Card,
    CardBody,
    Notice,
    Panel,
    PanelBody,
    TextControl,
    ToggleControl,
} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

const DIAGNOSTICS_DEFAULTS = {
    enabled: false,
    retentionDays: 7,
    autoOffDays: 7,
    expiresAt: 0,
};

const normalizeDiagnostics = (response) => ({
    enabled: Boolean(response?.stats_diagnostics),
    retentionDays: Number(response?.stats_diagnostics_retention_days || 7),
    autoOffDays: Number(response?.stats_diagnostics_auto_off_days || 7),
    expiresAt: Number(response?.stats_diagnostics_expires_at || 0),
});

const DebugPanel = ({ onNotice }) => {
    const [debugEnabled, setDebugEnabled] = useState(false);
    const [debugLoading, setDebugLoading] = useState(false);
    const [debugSaving, setDebugSaving] = useState(false);
    const [debugError, setDebugError] = useState(null);
    const [debugLocked, setDebugLocked] = useState(false);
    const [debugLogSettings, setDebugLogSettings] = useState(true);
    const [buildProbeEnabled, setBuildProbeEnabled] = useState(false);
    const [diagnostics, setDiagnostics] = useState(DIAGNOSTICS_DEFAULTS);
    const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
    const [diagnosticsSaving, setDiagnosticsSaving] = useState(false);
    const [diagnosticsError, setDiagnosticsError] = useState(null);
    const [openSection, setOpenSection] = useState('debug');

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
                setBuildProbeEnabled(Boolean(response?.build_probe));
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
        let isMounted = true;
        setDiagnosticsLoading(true);
        setDiagnosticsError(null);

        apiFetch({ path: '/magick-ad/v1/system-settings' })
            .then((response) => {
                if (!isMounted) {
                    return;
                }
                setDiagnostics(normalizeDiagnostics(response));
                setDiagnosticsLoading(false);
            })
            .catch((err) => {
                if (!isMounted) {
                    return;
                }
                setDiagnosticsError(err);
                setDiagnosticsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const diagnosticsExpiryLabel = (() => {
        if (!diagnostics.expiresAt) {
            return '';
        }
        const date = new Date(diagnostics.expiresAt * 1000);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        return date.toLocaleString();
    })();

    const updateDebug = (nextEnabled, nextLogSettings, nextBuildProbe, rollback) => {
        setDebugSaving(true);
        apiFetch({
            path: '/magick-ad/v1/debug',
            method: 'POST',
            data: {
                enabled: nextEnabled,
                log_settings: nextLogSettings,
                build_probe: nextBuildProbe,
            },
        })
            .then((response) => {
                setDebugSaving(false);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                        new CustomEvent('magick-ad-debug-updated', {
                            detail: response || {},
                        })
                    );
                }
                onNotice?.('success', '调试设置已更新');
            })
            .catch((err) => {
                setDebugSaving(false);
                rollback?.();
                setDebugError(err);
                onNotice?.('error', err?.message || '调试设置更新失败');
            });
    };

    const updateDiagnostics = (next, rollback) => {
        setDiagnosticsSaving(true);
        setDiagnosticsError(null);
        apiFetch({
            path: '/magick-ad/v1/system-settings',
            method: 'POST',
            data: {
                stats_diagnostics: Boolean(next.enabled),
                stats_diagnostics_retention_days: Number(next.retentionDays) || 7,
                stats_diagnostics_auto_off_days: Number(next.autoOffDays) || 7,
            },
        })
            .then((response) => {
                setDiagnostics(normalizeDiagnostics(response));
                setDiagnosticsSaving(false);
                onNotice?.('success', '诊断日志设置已更新');
            })
            .catch((err) => {
                setDiagnosticsSaving(false);
                rollback?.();
                setDiagnosticsError(err);
                onNotice?.('error', err?.message || '诊断日志设置更新失败');
            });
    };

    return (
        <Card>
            <CardBody>
                <div className="magick-ad-field__label">调试与诊断</div>
                <Panel>
                    <PanelBody
                        title="调试开关"
                        opened={openSection === 'debug'}
                        onToggle={() =>
                            setOpenSection((current) =>
                                current === 'debug' ? null : 'debug'
                            )
                        }
                    >
                        {debugLocked && (
                            <Notice status="warning" isDismissible={false}>
                                调试已在 wp-config.php 中强制开启。
                            </Notice>
                        )}
                        {debugError && (
                            <Notice status="error" isDismissible>
                                {debugError.message || '调试开关加载失败'}
                            </Notice>
                        )}
                        <ToggleControl
                            label="启用调试日志"
                            checked={debugEnabled}
                            disabled={debugLocked || debugLoading || debugSaving}
                            onChange={(value) => {
                                const previous = debugEnabled;
                                setDebugEnabled(value);
                                updateDebug(
                                    value,
                                    debugLogSettings,
                                    buildProbeEnabled,
                                    () => setDebugEnabled(previous)
                                );
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
                            disabled={debugLoading || debugSaving || !debugEnabled}
                            onChange={(value) => {
                                const previous = debugLogSettings;
                                setDebugLogSettings(value);
                                updateDebug(
                                    debugEnabled,
                                    value,
                                    buildProbeEnabled,
                                    () => setDebugLogSettings(previous)
                                );
                            }}
                            help="控制 settings=Array 是否写入 debug.log"
                        />
                        <ToggleControl
                            label="显示构建版本探针"
                            checked={buildProbeEnabled}
                            disabled={debugLoading || debugSaving}
                            onChange={(value) => {
                                const previous = buildProbeEnabled;
                                setBuildProbeEnabled(value);
                                updateDebug(
                                    debugEnabled,
                                    debugLogSettings,
                                    value,
                                    () => setBuildProbeEnabled(previous)
                                );
                            }}
                            help="右下角显示当前 build 时间与版本号"
                        />
                    </PanelBody>
                    <PanelBody
                        title="统计诊断日志"
                        opened={openSection === 'diagnostics'}
                        onToggle={() =>
                            setOpenSection((current) =>
                                current === 'diagnostics'
                                    ? null
                                    : 'diagnostics'
                            )
                        }
                    >
                        {diagnosticsError && (
                            <Notice status="error" isDismissible>
                                {diagnosticsError.message || '诊断日志配置加载失败'}
                            </Notice>
                        )}
                        <div className="magick-ad-settings-expiry">
                            <strong>诊断到期时间：</strong>
                            {diagnosticsExpiryLabel ? diagnosticsExpiryLabel : '未启用'}
                        </div>
                        <ToggleControl
                            label="启用统计诊断日志"
                            checked={Boolean(diagnostics.enabled)}
                            disabled={diagnosticsLoading || diagnosticsSaving}
                            onChange={(value) => {
                                const previous = diagnostics;
                                const next = { ...diagnostics, enabled: value };
                                setDiagnostics(next);
                                updateDiagnostics(next, () => setDiagnostics(previous));
                            }}
                            help="仅诊断时记录 page_url / user_agent / user_id。"
                        />
                        <TextControl
                            label="诊断日志保留天数"
                            type="number"
                            value={diagnostics.retentionDays}
                            disabled={diagnosticsLoading || diagnosticsSaving}
                            onChange={(value) => {
                                const previous = diagnostics;
                                const next = {
                                    ...diagnostics,
                                    retentionDays: Number(value) || 7,
                                };
                                setDiagnostics(next);
                                updateDiagnostics(next, () => setDiagnostics(previous));
                            }}
                            help="超过天数会自动清理诊断日志。"
                        />
                        <TextControl
                            label="诊断自动关闭天数"
                            type="number"
                            value={diagnostics.autoOffDays}
                            disabled={diagnosticsLoading || diagnosticsSaving}
                            onChange={(value) => {
                                const previous = diagnostics;
                                const next = {
                                    ...diagnostics,
                                    autoOffDays: Number(value) || 7,
                                };
                                setDiagnostics(next);
                                updateDiagnostics(next, () => setDiagnostics(previous));
                            }}
                            help="开启诊断后，超过天数将自动关闭诊断模式。"
                        />
                        {diagnostics.enabled && diagnosticsExpiryLabel && (
                            <Notice status="info" isDismissible={false}>
                                诊断模式将在 {diagnosticsExpiryLabel} 自动关闭。
                            </Notice>
                        )}
                        <div className="magick-ad-debug-actions">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    const url = window.MagickAD?.diagnoseUrl || '';
                                    if (!url) {
                                        onNotice?.('error', '诊断链接未配置');
                                        return;
                                    }
                                    window.open(url, '_blank');
                                }}
                            >
                                打开投放诊断
                            </Button>
                        </div>
                    </PanelBody>
                </Panel>
            </CardBody>
        </Card>
    );
};

export default DebugPanel;
