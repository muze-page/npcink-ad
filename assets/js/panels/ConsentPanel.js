import { useEffect, useState } from '@wordpress/element';
import {
    Card,
    CardBody,
    Notice,
    TextControl,
    ToggleControl,
} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

const DEFAULT_SETTINGS = {
    consent_guard_enabled: false,
    tracking_require_consent: false,
    consent_banner_enabled: true,
    consent_banner_text:
        '为了提供更好的体验，我们会使用必要的 Cookie/存储进行频控。',
    consent_banner_button: '同意',
};

const ConsentPanel = ({ onNotice }) => {
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
                onNotice?.('success', '同意与合规设置已更新');
            })
            .catch((err) => {
                setSaving(false);
                setError(err);
                onNotice?.('error', err?.message || '设置更新失败');
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
                <div className="magick-ad-field__label">同意与合规</div>
                {error && (
                    <Notice status="error" isDismissible>
                        {error.message || '设置加载失败'}
                    </Notice>
                )}
                <ToggleControl
                    label="启用同意/合规门控"
                    checked={Boolean(settings.consent_guard_enabled)}
                    disabled={loading || saving}
                    onChange={(value) =>
                        updateSettings({
                            consent_guard_enabled: value,
                        })
                    }
                    help="关闭后将忽略同意状态，直接写入频控/统计存储。"
                />
                {settings.consent_guard_enabled ? (
                    <>
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
                        {settings.tracking_require_consent && (
                            <Notice status="warning" isDismissible={false}>
                                已启用“需要同意”。如果站点未接入
                                magick_ad_has_consent，将默认视为未同意：统计不写入，
                                且前端不会写入 localStorage/sessionStorage。
                            </Notice>
                        )}
                        {settings.tracking_require_consent && (
                            <>
                                <ToggleControl
                                    label="启用同意提示条"
                                    checked={Boolean(
                                        settings.consent_banner_enabled
                                    )}
                                    disabled={loading || saving}
                                    onChange={(value) =>
                                        updateSettings({
                                            consent_banner_enabled: value,
                                        })
                                    }
                                    help="仅在需要同意且未同意时展示页面底部提示。"
                                />
                                <TextControl
                                    label="提示文案"
                                    value={settings.consent_banner_text}
                                    disabled={loading || saving}
                                    onChange={(value) =>
                                        updateSettings(
                                            {
                                                consent_banner_text: value,
                                            },
                                            false
                                        )
                                    }
                                    onBlur={() =>
                                        updateSettings(
                                            {
                                                consent_banner_text:
                                                    settings.consent_banner_text,
                                            },
                                            true
                                        )
                                    }
                                />
                                <TextControl
                                    label="同意按钮文案"
                                    value={settings.consent_banner_button}
                                    disabled={loading || saving}
                                    onChange={(value) =>
                                        updateSettings(
                                            {
                                                consent_banner_button: value,
                                            },
                                            false
                                        )
                                    }
                                    onBlur={() =>
                                        updateSettings(
                                            {
                                                consent_banner_button:
                                                    settings.consent_banner_button,
                                            },
                                            true
                                        )
                                    }
                                />
                            </>
                        )}
                    </>
                ) : (
                    <Notice status="info" isDismissible={false}>
                        已关闭同意门控：前端频控与统计将不受同意状态影响。
                    </Notice>
                )}
            </CardBody>
        </Card>
    );
};

export default ConsentPanel;
