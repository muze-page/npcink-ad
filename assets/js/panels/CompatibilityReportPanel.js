import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { Button, Card, CardBody, Notice, Spinner } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

const STATUS_LABELS = {
    good: '正常',
    recommended: '建议处理',
    critical: '高风险',
};

const downloadText = (content, filename, mime) => {
    const blob = new Blob([content], {
        type: mime || 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const CompatibilityReportPanel = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exporting, setExporting] = useState(false);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiFetch({
                path: '/magick-ad/v1/compatibility-report',
            });
            setReport(response || null);
        } catch (err) {
            setError(err);
            setReport(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const generatedAt = useMemo(() => {
        const value = Number(report?.generated_at || 0);
        if (!value) {
            return '';
        }
        const date = new Date(value * 1000);
        return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
    }, [report]);

    const exportJson = async () => {
        if (!report) {
            return;
        }
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        downloadText(
            JSON.stringify(report, null, 2),
            `magick-ad-compatibility-${stamp}.json`,
            'application/json;charset=utf-8'
        );
    };

    const exportMarkdown = async () => {
        setExporting(true);
        try {
            const response = await apiFetch({
                path: '/magick-ad/v1/compatibility-report?format=markdown',
            });
            const content = typeof response?.content === 'string' ? response.content : '';
            if (!content) {
                throw new Error('兼容报告导出失败');
            }
            const filename =
                response?.filename ||
                `magick-ad-compatibility-${Date.now()}.md`;
            downloadText(content, filename, 'text/markdown;charset=utf-8');
        } catch (err) {
            setError(err);
        } finally {
            setExporting(false);
        }
    };

    return (
        <Card>
            <CardBody>
                <div className="magick-ad-field__label">兼容报告</div>
                <Notice status="info" isDismissible={false}>
                    一键导出当前环境、风险项与建议动作，方便部署排查与跨团队协作。
                </Notice>
                {error && (
                    <Notice status="error" isDismissible>
                        {error.message || '兼容报告加载失败'}
                    </Notice>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <Button variant="secondary" onClick={fetchReport} disabled={loading}>
                        刷新报告
                    </Button>
                    <Button variant="secondary" onClick={exportJson} disabled={!report || loading}>
                        导出 JSON
                    </Button>
                    <Button
                        variant="primary"
                        onClick={exportMarkdown}
                        disabled={!report || loading || exporting}
                    >
                        {exporting ? '导出中…' : '导出 Markdown'}
                    </Button>
                    <Button
                        variant="tertiary"
                        href={window?.MagickAD?.siteHealthUrl}
                        target="_blank"
                        rel="noreferrer"
                    >
                        打开站点健康
                    </Button>
                </div>
                {loading && (
                    <div style={{ padding: '20px 0' }}>
                        <Spinner />
                    </div>
                )}
                {!loading && report && (
                    <div className="magick-ad-compatibility-report">
                        <div className={`magick-ad-compatibility-overall is-${report.overall_status || 'recommended'}`}>
                            <strong>
                                总体状态：
                                {STATUS_LABELS[report.overall_status] || '待检查'}
                            </strong>
                            {generatedAt && <span>生成时间：{generatedAt}</span>}
                        </div>

                        {Array.isArray(report.risks) && report.risks.length > 0 && (
                            <div className="magick-ad-compatibility-report__section">
                                <h3>风险项</h3>
                                <div className="magick-ad-compatibility-grid">
                                    {report.risks.map((risk) => (
                                        <div
                                            key={risk.key || risk.title}
                                            className={`magick-ad-compatibility-card is-${risk.level || 'recommended'}`}
                                        >
                                            <div className="magick-ad-compatibility-card__head">
                                                <strong>{risk.title || '未命名风险'}</strong>
                                                <span className="magick-ad-compatibility-card__status">
                                                    {STATUS_LABELS[risk.level] || risk.level || '待检查'}
                                                </span>
                                            </div>
                                            {risk.action && <p className="description">{risk.action}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {report.checks && (
                            <div className="magick-ad-compatibility-report__section">
                                <h3>体检检查项</h3>
                                <div className="magick-ad-compatibility-grid">
                                    {Object.entries(report.checks).map(([key, check]) => (
                                        <div
                                            key={key}
                                            className={`magick-ad-compatibility-card is-${check?.status || 'recommended'}`}
                                        >
                                            <div className="magick-ad-compatibility-card__head">
                                                <strong>{check?.summary || key}</strong>
                                                <span className="magick-ad-compatibility-card__status">
                                                    {STATUS_LABELS[check?.status] || check?.status || '待检查'}
                                                </span>
                                            </div>
                                            {check?.action && (
                                                <p className="description">{check.action}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="magick-ad-compatibility-report__section">
                            <h3>运行环境</h3>
                            <div className="magick-ad-compatibility-report__kv">
                                {Object.entries(report.environment || {}).map(([key, value]) => (
                                    <div className="magick-ad-compatibility-report__row" key={key}>
                                        <span>{key}</span>
                                        <code>{String(value)}</code>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default CompatibilityReportPanel;
