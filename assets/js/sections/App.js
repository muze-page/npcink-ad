import { lazy, Suspense } from '@wordpress/element';
import { Notice, TabPanel } from '@wordpress/components';
import AdsConfig from './AdsConfig';

const Dashboard = lazy(() => import('../Dashboard'));

const App = () => {
    const tabs = [
        { name: 'ads', title: '广告配置', className: 'magick-ad-tab' },
        { name: 'report', title: '统计看板', className: 'magick-ad-tab' },
    ];

    return (
        <TabPanel tabs={tabs}>
            {(tab) =>
                tab.name === 'report' ? (
                    <Suspense fallback={<Notice status="info">加载中…</Notice>}>
                        <Dashboard />
                    </Suspense>
                ) : (
                    <AdsConfig />
                )
            }
        </TabPanel>
    );
};

export default App;
