import { lazy, Suspense } from '@wordpress/element';
import { Notice } from '@wordpress/components';
import AdsConfig from './AdsConfig';

const Dashboard = lazy(() => import('../Dashboard'));

const App = () => {
    const initialTab =
        (typeof window !== 'undefined' &&
            window.MagickAD &&
            window.MagickAD.initialTab) ||
        'ads';

    if (initialTab === 'report') {
        return (
            <Suspense fallback={<Notice status="info">加载中…</Notice>}>
                <Dashboard />
            </Suspense>
        );
    }

    return <AdsConfig />;
};

export default App;
