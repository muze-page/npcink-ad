const pad = (value) => String(value).padStart(2, '0');

export const parseDateTime = (value) => {
    if (!value) {
        return null;
    }
    const normalized = value.includes('T') ? value.replace('T', ' ') : value;
    const [datePart, timePart = ''] = normalized.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) {
        return null;
    }
    const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
};

export const formatDateTimeLocalInput = (value) => {
    const date = parseDateTime(value);
    if (!date) {
        return '';
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatDateTimeStorage = (value) => {
    if (!value) {
        return '';
    }
    if (value.includes('T')) {
        const [datePart, timePart] = value.split('T');
        const [hour = '00', minute = '00'] = timePart.split(':');
        return `${datePart} ${pad(hour)}:${pad(minute)}:00`;
    }
    return value.length === 16 ? `${value}:00` : value;
};

export const formatEndDateTimeLocalInput = (value) => {
    if (!value) {
        return '';
    }
    const date = parseDateTime(value);
    if (!date) {
        return '';
    }
    if (!value.includes('T') && !value.includes(':')) {
        date.setHours(23, 59, 0, 0);
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatDateFromDate = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;

export const isFutureDate = (value) => {
    const date = parseDateTime(value);
    if (!date) {
        return false;
    }
    return date.getTime() > Date.now();
};

export const formatDateTimeDisplay = (value) => {
    const date = parseDateTime(value);
    if (!date) {
        return '';
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
