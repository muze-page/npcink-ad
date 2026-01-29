import { useCallback, useEffect, useRef, useState } from '@wordpress/element';

const useNotice = () => {
    const [notice, setNotice] = useState(null);
    const timerRef = useRef(null);

    const clearNotice = useCallback(() => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setNotice(null);
    }, []);

    const showNotice = useCallback((status, message, timeout = 2500) => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setNotice({ status, message });
        if (timeout) {
            timerRef.current = window.setTimeout(() => {
                setNotice(null);
                timerRef.current = null;
            }, timeout);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                window.clearTimeout(timerRef.current);
            }
        };
    }, []);

    return {
        notice,
        setNotice,
        showNotice,
        clearNotice,
    };
};

export default useNotice;
