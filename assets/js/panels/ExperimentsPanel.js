import { useEffect, useState } from '@wordpress/element';
import {
    Button,
    ButtonGroup,
    Card,
    CardBody,
    Notice,
    ToggleControl,
} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

const DEFAULT_SETTINGS = {
    block_editor_enabled: false,
    settings_level: 'simple',
};

const LEVEL_STORAGE_KEY = 'magick_ad_settings_level';
const LEVELS = [
    { value: 'simple', label: '简洁' },
    { value: 'advanced', label: '高级' },
    { value: 'lab', label: '实验室' },
];
const normalizeLevel = (value) =>
    value === 'advanced' || value === 'lab' ? value : 'simple';

const ExperimentsPanel = ({ onNotice }) => {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [displayLevel, setDisplayLevel] = useState(() => {
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

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        apiFetch({ path: '/magick-ad/v1/system-settings' })
            .then((response) => {
                if (!mounted) {
                    return;
                }
                setSettings({ ...DEFAULT_SETTINGS, ...response });
                setDisplayLevel(normalizeLevel(response?.settings_level));
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

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            window.localStorage.setItem(LEVEL_STORAGE_KEY, displayLevel);
            if (window.MagickAD) {
                window.MagickAD.settingsLevel = displayLevel;
            }
            window.dispatchEvent(
                new CustomEvent('magick-ad-display-level-updated', {
                    detail: { level: displayLevel },
                })
            );
        } catch (err) {
            // ignore storage errors
        }
    }, [displayLevel]);

    useEffect(() => {
        if (loading || saving) {
            return;
        }
        const currentLevel = normalizeLevel(settings.settings_level);
        if (currentLevel === displayLevel) {
            return;
        }
        updateSettings({ settings_level: displayLevel });
    }, [displayLevel, loading, saving, settings.settings_level]);

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
                <div className="magick-ad-settings-expiry">
                    <strong>显示级别：</strong>
                    <ButtonGroup>
                        {LEVELS.map((level) => (
                            <Button
                                key={level.value}
                                variant={
                                    displayLevel === level.value
                                        ? 'primary'
                                        : 'secondary'
                                }
                                onClick={() => setDisplayLevel(level.value)}
                                disabled={loading || saving}
                            >
                                {level.label}
                            </Button>
                        ))}
                    </ButtonGroup>
                </div>
                {displayLevel === 'lab' && (
                    <Notice status="warning" isDismissible={false}>
                        实验室模式会显示所有高级选项，请谨慎修改。
                    </Notice>
                )}
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
