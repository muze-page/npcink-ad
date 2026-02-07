import { formatDateTimeDisplay, parseDateTime } from './date-time';

export const resolveStatus = (ad) => {
    if (!ad) {
        return 'draft';
    }
    const enabled = ad?.options?.enabled !== false;
    if (!enabled) {
        return 'draft';
    }
    return ad.status || 'publish';
};

export const statusMeta = (ad) => {
    const status = resolveStatus(ad);
    if (status === 'future') {
        return { label: '已排期', className: 'is-scheduled' };
    }
    if (status === 'pending') {
        return { label: '待审核', className: 'is-pending' };
    }
    if (status === 'publish') {
        return { label: '已发布', className: 'is-enabled' };
    }
    return { label: '已停用', className: 'is-disabled' };
};

export const runtimeMeta = (ad) => {
    if (!ad) {
        return {
            code: 'unknown',
            label: '未知',
            className: 'is-pending',
            blocked: true,
            message: '当前状态未知，请刷新后重试。',
        };
    }

    const options = ad.options || {};
    if (options.enabled === false) {
        return {
            code: 'option_disabled',
            label: '已停用',
            className: 'is-disabled',
            blocked: true,
            message: '当前不会展示：广告已停用。',
        };
    }

    const status = ad.status || 'publish';
    if (status === 'pending') {
        return {
            code: 'status_pending',
            label: '待审核',
            className: 'is-pending',
            blocked: true,
            message: '当前不会展示：发布状态为待审核。',
        };
    }
    if (status === 'future') {
        const dateText = formatDateTimeDisplay(ad.date);
        return {
            code: 'status_future',
            label: '已排期',
            className: 'is-scheduled',
            blocked: true,
            message: dateText
                ? `当前不会展示：发布排期未到（${dateText}）。`
                : '当前不会展示：发布状态为已排期。',
        };
    }
    if (status !== 'publish') {
        return {
            code: 'status_unpublished',
            label: '未发布',
            className: 'is-disabled',
            blocked: true,
            message: '当前不会展示：发布状态不是“已发布”。',
        };
    }

    const now = Date.now();
    const startDate = parseDateTime(options.start_date);
    if (startDate && startDate.getTime() > now) {
        return {
            code: 'schedule_not_started',
            label: '未到开始时间',
            className: 'is-scheduled',
            blocked: true,
            message: `当前不会展示：将于 ${formatDateTimeDisplay(
                options.start_date
            )} 生效。`,
        };
    }

    const endDate = parseDateTime(options.end_date);
    if (endDate && endDate.getTime() < now) {
        return {
            code: 'schedule_expired',
            label: '已过期',
            className: 'is-disabled',
            blocked: true,
            message: `当前不会展示：已于 ${formatDateTimeDisplay(
                options.end_date
            )} 过期。`,
        };
    }

    return {
        code: 'active',
        label: '生效中',
        className: 'is-enabled',
        blocked: false,
        message: '当前满足发布与排期条件。',
    };
};
