import { useCallback, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { getTargetEndpoint, normalizeTargetItem } from '../constants/options';

const useTargeting = (selectedAd) => {
    const [targetItems, setTargetItems] = useState([]);
    const [targetSuggestions, setTargetSuggestions] = useState([]);
    const [targetLoading, setTargetLoading] = useState(false);
    const targetSearchTimerRef = useRef(null);
    const targetRequestRef = useRef(0);
    const targetCacheRef = useRef({});

    const targetIdsKey = useMemo(() => {
        const ids = selectedAd?.options?.target_ids || [];
        return Array.isArray(ids) ? ids.join(',') : '';
    }, [selectedAd?.options?.target_ids]);

    useEffect(() => {
        if (!selectedAd || selectedAd.options?.ad_type !== 'targeted') {
            setTargetItems([]);
            return;
        }
        const targetType = selectedAd.options?.target_type;
        const ids = Array.isArray(selectedAd.options?.target_ids)
            ? selectedAd.options?.target_ids
            : [];
        if (!targetType || ids.length === 0) {
            setTargetItems([]);
            return;
        }
        const endpoint = getTargetEndpoint(targetType);
        if (!endpoint) {
            setTargetItems([]);
            return;
        }
        const requestId = ++targetRequestRef.current;
        setTargetLoading(true);
        apiFetch({
            path: `/wp/v2/${endpoint}?include=${ids.join(',')}&per_page=${Math.min(
                ids.length,
                100
            )}`,
        })
            .then((items) => {
                if (requestId !== targetRequestRef.current) {
                    return;
                }
                const normalized = Array.isArray(items)
                    ? items
                          .map((item) => normalizeTargetItem(targetType, item))
                          .filter(Boolean)
                    : [];
                setTargetItems(normalized);
            })
            .catch(() => {
                if (requestId !== targetRequestRef.current) {
                    return;
                }
                setTargetItems([]);
            })
            .finally(() => {
                if (requestId !== targetRequestRef.current) {
                    return;
                }
                setTargetLoading(false);
            });
    }, [selectedAd?.id, selectedAd?.options?.target_type, targetIdsKey]);

    useEffect(() => {
        if (!selectedAd || selectedAd.options?.ad_type !== 'targeted') {
            setTargetSuggestions([]);
            return;
        }
        const targetType = selectedAd.options?.target_type;
        if (!targetType) {
            setTargetSuggestions([]);
            return;
        }
        const cached = targetCacheRef.current[targetType];
        if (cached && cached.length) {
            setTargetSuggestions(cached);
            return;
        }
        const endpoint = getTargetEndpoint(targetType);
        if (!endpoint) {
            setTargetSuggestions([]);
            return;
        }
        const requestId = ++targetRequestRef.current;
        setTargetLoading(true);
        const fetchAll = async () => {
            let page = 1;
            let totalPages = 1;
            let allItems = [];
            do {
                const pathBase = `/wp/v2/${endpoint}?per_page=100&page=${page}`;
                const path =
                    targetType === 'author'
                        ? `${pathBase}&who=authors`
                        : pathBase;
                const response = await apiFetch({ path, parse: false });
                const data = await response.json();
                if (!Array.isArray(data)) {
                    break;
                }
                allItems = allItems.concat(data);
                const totalHeader = response.headers.get('X-WP-TotalPages');
                totalPages = totalHeader ? Number(totalHeader) : 1;
                page += 1;
            } while (page <= totalPages);
            return allItems;
        };

        fetchAll()
            .then((items) => {
                if (requestId !== targetRequestRef.current) {
                    return;
                }
                const normalized = Array.isArray(items)
                    ? items
                          .map((item) => normalizeTargetItem(targetType, item))
                          .filter(Boolean)
                    : [];
                targetCacheRef.current[targetType] = normalized;
                setTargetSuggestions(normalized);
            })
            .catch(() => {
                if (requestId !== targetRequestRef.current) {
                    return;
                }
                setTargetSuggestions([]);
            })
            .finally(() => {
                if (requestId !== targetRequestRef.current) {
                    return;
                }
                setTargetLoading(false);
            });
    }, [selectedAd?.id, selectedAd?.options?.target_type]);

    const handleTargetSearch = useCallback(
        (value) => {
            if (targetSearchTimerRef.current) {
                window.clearTimeout(targetSearchTimerRef.current);
            }
            targetSearchTimerRef.current = window.setTimeout(() => {
                if (!selectedAd || selectedAd.options?.ad_type !== 'targeted') {
                    return;
                }
                const targetType = selectedAd.options?.target_type;
                const endpoint = getTargetEndpoint(targetType);
                if (!endpoint) {
                    return;
                }
                const cached = targetCacheRef.current[targetType];
                if (cached && cached.length) {
                    const keyword = (value || '').trim().toLowerCase();
                    if (!keyword) {
                        setTargetSuggestions(cached);
                        return;
                    }
                    setTargetSuggestions(
                        cached.filter((item) =>
                            item.label.toLowerCase().includes(keyword)
                        )
                    );
                    return;
                }
                const requestId = ++targetRequestRef.current;
                setTargetLoading(true);
                const baseQuery = `per_page=20&search=${encodeURIComponent(
                    value || ''
                )}`;
                const path =
                    targetType === 'author'
                        ? `/wp/v2/${endpoint}?${baseQuery}&who=authors`
                        : `/wp/v2/${endpoint}?${baseQuery}`;
                apiFetch({ path })
                    .then((items) => {
                        if (requestId !== targetRequestRef.current) {
                            return;
                        }
                        const normalized = Array.isArray(items)
                            ? items
                                  .map((item) =>
                                      normalizeTargetItem(targetType, item)
                                  )
                                  .filter(Boolean)
                            : [];
                        setTargetSuggestions(normalized);
                    })
                    .catch(() => {
                        if (requestId !== targetRequestRef.current) {
                            return;
                        }
                        setTargetSuggestions([]);
                    })
                    .finally(() => {
                        if (requestId !== targetRequestRef.current) {
                            return;
                        }
                        setTargetLoading(false);
                    });
            }, 320);
        },
        [selectedAd]
    );

    useEffect(() => {
        return () => {
            if (targetSearchTimerRef.current) {
                window.clearTimeout(targetSearchTimerRef.current);
            }
        };
    }, []);

    return {
        targetItems,
        targetSuggestions,
        targetLoading,
        handleTargetSearch,
    };
};

export default useTargeting;
