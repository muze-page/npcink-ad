import { useEffect, useState } from '@wordpress/element';
import { Card, CardBody, Notice, ToggleControl } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

const DEFAULT_SETTINGS = {
    block_editor_enabled: false,
};

const ExperimentsPanel = ({ onNotice }) => {
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
                onNotice?.('success', '实验设置已更新');
            })
            .catch((err) => {
                setSaving(false);
                setError(err);
                onNotice?.('error', err?.message || '设置更新失败');
            });
    };

    const updateSettings = (patch) => {
        const next = { ...settings, ...patch };
        setSettings(next);
        persist(next);
    };

    return (
        <Card>
            <CardBody>
                <div className="magick-ad-field__label">实验与高级</div>
                {error && (
                    <Notice status="error" isDismissible>
                        {error.message || '设置加载失败'}
                    </Notice>
                )}
                <Notice status="info" isDismissible={false}>
                    实验功能可能存在兼容性或稳定性问题，建议先在测试环境验证后再启用。
                </Notice>
                <ToggleControl
                    label="启用可视化设计（实验）"
                    checked={Boolean(settings.block_editor_enabled)}
                    disabled={loading || saving}
                    onChange={(value) =>
                        updateSettings({ block_editor_enabled: value })
                    }
                    help="关闭后隐藏“可视化设计”创意类型，仅在需要时开启。"
                />
                {!settings.block_editor_enabled && (
                    <Notice status="info" isDismissible={false}>
                        可视化设计当前处于隐藏状态，不影响已有广告展示。
                    </Notice>
                )}
            </CardBody>
        </Card>
    );
};

export default ExperimentsPanel;
