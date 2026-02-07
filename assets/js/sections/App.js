import { lazy, Suspense } from '@wordpress/element';
import { Notice } from '@wordpress/components';
import AdsConfig from './AdsConfig';

const Dashboard = lazy(() => import('../Dashboard'));
const SETTINGS_LEVEL_STORAGE_KEY = 'magick_ad_settings_level';
const readDisplayLevel = () => {
    if (typeof window === 'undefined') {
        return 'simple';
    }
    try {
        const level = window.localStorage?.getItem(SETTINGS_LEVEL_STORAGE_KEY);
        return level === 'advanced' || level === 'lab' ? level : 'simple';
    } catch (err) {
        return 'simple';
    }
};

const App = () => {
    const initialTab =
        (typeof window !== 'undefined' &&
            window.MagickAD &&
            window.MagickAD.initialTab) ||
        'ads';

    if (initialTab === 'report') {
        if (readDisplayLevel() === 'simple') {
            return (
                <Notice status="info" isDismissible={false}>
                    简洁模式已隐藏统计看板。请在“系统与调试设置 → 实验与高级”切换为“高级/实验室”后使用。
                </Notice>
            );
        }
        return (
            <Suspense fallback={<Notice status="info">加载中…</Notice>}>
                <Dashboard />
            </Suspense>
        );
    }

    return <AdsConfig />;
};

export default App;
