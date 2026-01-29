import { lazy, Suspense, useEffect, useMemo, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Card, CardBody, Notice, SelectControl } from '@wordpress/components';
const ReportChart = lazy(() => import('./ReportChart'));

const Dashboard = () => {
    const [range, setRange] = useState('7');
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setError(null);

        apiFetch({ path: `/magick-ad/v1/report?days=${range}` })
            .then((response) => {
                if (!isMounted) {
                    return;
                }
                setData(Array.isArray(response) ? response : []);
                setIsLoading(false);
            })
            .catch((err) => {
                if (!isMounted) {
                    return;
                }
                setError(err);
                setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [range]);

    const summary = useMemo(() => {
        return data.reduce(
            (acc, item) => {
                acc.views += Number(item.views || 0);
                acc.clicks += Number(item.clicks || 0);
                return acc;
            },
            { views: 0, clicks: 0 }
        );
    }, [data]);

    const ctr = summary.views
        ? ((summary.clicks / summary.views) * 100).toFixed(2)
        : '0.00';

    return (
        <div className="magick-ad-dashboard">
            <div className="magick-ad-header">
                <div>
                    <h1>统计看板</h1>
                    <p className="description">近 7 / 30 天投放趋势</p>
                </div>
                <SelectControl
                    label="日期范围"
                    value={range}
                    options={[
                        { label: '最近 7 天', value: '7' },
                        { label: '最近 30 天', value: '30' },
                    ]}
                    onChange={(value) => setRange(value)}
                />
            </div>

            {isLoading && <Notice status="info">加载中…</Notice>}
            {error && (
                <Notice status="error" isDismissible>
                    {error.message || '请求失败'}
                </Notice>
            )}

            {!isLoading && !error && (
                <div className="magick-ad-dashboard__content">
                    <div className="magick-ad-dashboard__cards">
                        <Card>
                            <CardBody>
                                <p className="magick-ad-dashboard__label">
                                    总展示
                                </p>
                                <p className="magick-ad-dashboard__value">
                                    {summary.views}
                                </p>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardBody>
                                <p className="magick-ad-dashboard__label">
                                    总点击
                                </p>
                                <p className="magick-ad-dashboard__value">
                                    {summary.clicks}
                                </p>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardBody>
                                <p className="magick-ad-dashboard__label">
                                    平均 CTR
                                </p>
                                <p className="magick-ad-dashboard__value">
                                    {ctr}%
                                </p>
                            </CardBody>
                        </Card>
                    </div>

                    <Card>
                        <CardBody>
                            <div className="magick-ad-dashboard__chart">
                                <Suspense
                                    fallback={
                                        <Notice status="info">图表加载中…</Notice>
                                    }
                                >
                                    <ReportChart data={data} />
                                </Suspense>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
