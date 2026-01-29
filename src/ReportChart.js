import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const ReportChart = ({ data }) => {
    return (
        <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#1e1e1e"
                    strokeWidth={2}
                    dot={false}
                    name="展示"
                />
                <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#2271b1"
                    strokeWidth={2}
                    dot={false}
                    name="点击"
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default ReportChart;
