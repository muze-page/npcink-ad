import { useEffect, useState } from '@wordpress/element';
import { Button, Card, CardBody, Notice, Panel, PanelBody, ToggleControl } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

const DebugPanel = ({ onNotice }) => {
    const [debugEnabled, setDebugEnabled] = useState(false);
    const [debugLoading, setDebugLoading] = useState(false);
    const [debugSaving, setDebugSaving] = useState(false);
    const [debugError, setDebugError] = useState(null);
    const [debugLocked, setDebugLocked] = useState(false);
    const [debugLogSettings, setDebugLogSettings] = useState(true);

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

    const updateDebug = (nextEnabled, nextLogSettings, rollback) => {
        setDebugSaving(true);
        apiFetch({
            path: '/magick-ad/v1/debug',
            method: 'POST',
            data: {
                enabled: nextEnabled,
                log_settings: nextLogSettings,
            },
        })
            .then(() => {
                setDebugSaving(false);
                onNotice?.('success', '调试设置已更新');
            })
            .catch((err) => {
                setDebugSaving(false);
                rollback?.();
                setDebugError(err);
                onNotice?.('error', err?.message || '调试设置更新失败');
            });
    };

    return (
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
                                updateDebug(value, debugLogSettings, () =>
                                    setDebugEnabled(previous)
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
                            disabled={
                                debugLoading || debugSaving || !debugEnabled
                            }
                            onChange={(value) => {
                                const previous = debugLogSettings;
                                setDebugLogSettings(value);
                                updateDebug(debugEnabled, value, () =>
                                    setDebugLogSettings(previous)
                                );
                            }}
                            help="控制 settings=Array 是否写入 debug.log"
                        />
                        <div className="magick-ad-debug-actions">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    const url =
                                        window.MagickAD?.diagnoseUrl || '';
                                    if (!url) {
                                        onNotice?.(
                                            'error',
                                            '诊断链接未配置'
                                        );
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
