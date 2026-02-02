import { lazy, Suspense, useEffect, useMemo, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import {
    Button,
    Card,
    CardBody,
    Notice,
    SelectControl,
    TextControl,
} from '@wordpress/components';
const ReportChart = lazy(() => import('./ReportChart'));

const Dashboard = () => {
    const [range, setRange] = useState('7');
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [breakdowns, setBreakdowns] = useState({
        slot: [],
        position: [],
        container: [],
        ad_id: [],
    });
    const [breakdownError, setBreakdownError] = useState(null);
    const [breakdownFilter, setBreakdownFilter] = useState('');
    const [breakdownSort, setBreakdownSort] = useState('views_desc');

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

    useEffect(() => {
        let isMounted = true;
        setBreakdownError(null);
        const groups = ['slot', 'position', 'container', 'ad_id'];

        Promise.all(
            groups.map((group) =>
                apiFetch({
                    path: `/magick-ad/v1/report-dim?days=${range}&group_by=${group}`,
                }).then((response) =>
                    Array.isArray(response) ? response : []
                )
            )
        )
            .then((responses) => {
                if (!isMounted) {
                    return;
                }
                setBreakdowns({
                    slot: responses[0] || [],
                    position: responses[1] || [],
                    container: responses[2] || [],
                    ad_id: responses[3] || [],
                });
            })
            .catch((err) => {
                if (!isMounted) {
                    return;
                }
                setBreakdownError(err);
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

    const applyBreakdownFilter = (items) => {
        const term = breakdownFilter.trim().toLowerCase();
        if (!term) {
            return items;
        }
        return items.filter((item) =>
            String(item.dimension || '')
                .toLowerCase()
                .includes(term)
        );
    };

    const applyBreakdownSort = (items) => {
        const [key, direction] = breakdownSort.split('_');
        const dir = direction === 'asc' ? 1 : -1;
        return [...items].sort((a, b) => {
            const viewsA = Number(a.views || 0);
            const viewsB = Number(b.views || 0);
            const clicksA = Number(a.clicks || 0);
            const clicksB = Number(b.clicks || 0);
            const ctrA = viewsA ? clicksA / viewsA : 0;
            const ctrB = viewsB ? clicksB / viewsB : 0;

            switch (key) {
                case 'clicks':
                    return dir * (clicksA - clicksB);
                case 'ctr':
                    return dir * (ctrA - ctrB);
                case 'views':
                default:
                    return dir * (viewsA - viewsB);
            }
        });
    };

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, '0');
        const day = `${date.getDate()}`.padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getRangeDates = () => {
        const days = Number(range) || 7;
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (days - 1));
        return {
            start: formatDate(start),
            end: formatDate(end),
        };
    };

    const downloadCsv = (filename, items) => {
        if (!items.length) {
            return;
        }
        const rangeDates = getRangeDates();
        const rows = [
            ['dimension', 'views', 'clicks', 'ctr', 'range_start', 'range_end'],
            ...items.map((item) => {
                const views = Number(item.views || 0);
                const clicks = Number(item.clicks || 0);
                const rowCtr = views ? (clicks / views) * 100 : 0;
                return [
                    String(item.dimension || ''),
                    String(views),
                    String(clicks),
                    rowCtr.toFixed(2),
                    rangeDates.start,
                    rangeDates.end,
                ];
            }),
        ];
        const csv = rows
            .map((row) =>
                row
                    .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                    .join(',')
            )
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const renderBreakdown = (title, items, key) => {
        const filtered = applyBreakdownFilter(items);
        const sorted = applyBreakdownSort(filtered);
        return (
            <Card>
                <CardBody>
                    <div className="magick-ad-dashboard__section-header">
                        <p className="magick-ad-dashboard__section-title">
                            {title}
                        </p>
                        <Button
                            variant="secondary"
                            onClick={() =>
                                downloadCsv(
                                    `magick-ad-${key}-${range}d.csv`,
                                    sorted
                                )
                            }
                            disabled={!sorted.length}
                        >
                            导出 CSV
                        </Button>
                    </div>
                    {!sorted.length && (
                        <p className="description">暂无数据</p>
                    )}
                    {!!sorted.length && (
                        <table className="magick-ad-dashboard__table">
                            <thead>
                                <tr>
                                    <th>维度</th>
                                    <th>展示</th>
                                    <th>点击</th>
                                    <th>CTR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.slice(0, 10).map((item) => {
                                    const views = Number(item.views || 0);
                                    const clicks = Number(item.clicks || 0);
                                    const rowCtr = views
                                        ? ((clicks / views) * 100).toFixed(2)
                                        : '0.00';
                                    return (
                                        <tr key={item.dimension}>
                                            <td>{item.dimension}</td>
                                            <td>{views}</td>
                                            <td>{clicks}</td>
                                            <td>{rowCtr}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </CardBody>
            </Card>
        );
    };

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

                    {breakdownError && (
                        <Notice status="error" isDismissible>
                            {breakdownError.message || '维度报表加载失败'}
                        </Notice>
                    )}
                    {!breakdownError && (
                        <div className="magick-ad-dashboard__breakdowns">
                            <div className="magick-ad-dashboard__filters">
                                <TextControl
                                    label="筛选维度"
                                    value={breakdownFilter}
                                    onChange={(value) =>
                                        setBreakdownFilter(value)
                                    }
                                    placeholder="输入关键词过滤"
                                />
                                <SelectControl
                                    label="排序"
                                    value={breakdownSort}
                                    options={[
                                        {
                                            label: '展示量（高→低）',
                                            value: 'views_desc',
                                        },
                                        {
                                            label: '展示量（低→高）',
                                            value: 'views_asc',
                                        },
                                        {
                                            label: '点击量（高→低）',
                                            value: 'clicks_desc',
                                        },
                                        {
                                            label: '点击量（低→高）',
                                            value: 'clicks_asc',
                                        },
                                        {
                                            label: 'CTR（高→低）',
                                            value: 'ctr_desc',
                                        },
                                        {
                                            label: 'CTR（低→高）',
                                            value: 'ctr_asc',
                                        },
                                    ]}
                                    onChange={(value) =>
                                        setBreakdownSort(value)
                                    }
                                />
                            </div>
                            {renderBreakdown(
                                'Slot 表现',
                                breakdowns.slot,
                                'slot'
                            )}
                            {renderBreakdown(
                                '位置表现',
                                breakdowns.position,
                                'position'
                            )}
                            {renderBreakdown(
                                '容器表现',
                                breakdowns.container,
                                'container'
                            )}
                            {renderBreakdown(
                                '广告表现（ad_id）',
                                breakdowns.ad_id,
                                'ad_id'
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
