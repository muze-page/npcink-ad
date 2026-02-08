import {
    lazy,
    Suspense,
    useEffect,
    useMemo,
    useRef,
    useState,
} from '@wordpress/element';
import {
    Button,
    ButtonGroup,
    Card,
    CardBody,
    ColorPicker,
    ComboboxControl,
    DropdownMenu,
    Dropdown,
    FormTokenField,
    Modal,
    MenuGroup,
    MenuItem,
    Notice,
    Panel,
    PanelBody,
    RangeControl,
    SelectControl,
    Spinner,
    TabPanel,
    TextControl,
    TextareaControl,
    ToggleControl,
} from '@wordpress/components';
import {
    calendar,
    chevronDown,
    chevronUp,
    cog,
    external,
    globe,
    info,
    megaphone,
    moreHorizontal,
} from '@wordpress/icons';
import { useStore } from '../store';
import Layout from '../Layout';
import ImagePicker from '../components/ImagePicker';
import VideoPicker from '../components/VideoPicker';
import LinkPicker from '../components/LinkPicker';
import ClassicEditor from '../components/ClassicEditor';
import TemplateActions from '../components/TemplateActions';
import SlotsPanel from '../panels/SlotsPanel';
import useNotice from '../hooks/useNotice';
import useTemplateLibrary from '../hooks/useTemplateLibrary';
import useTargeting from '../hooks/useTargeting';
import {
    ANIMATION_OPTIONS,
    DISPLAY_PAGE_OPTIONS,
    SHADOW_OPTIONS,
    TARGET_TYPE_OPTIONS,
    getPositionOptions,
} from '../constants/options';
import { cleanForSlug } from '@wordpress/url';
import apiFetch from '@wordpress/api-fetch';
import {
    DISPLAY_LEVEL_LABELS,
    normalizeDisplayLevel,
    readDisplayLevel,
} from './ads-config/display-level';
import {
    formatDateFromDate,
    formatDateTimeLocalInput,
    formatDateTimeStorage,
    formatEndDateTimeLocalInput,
    isFutureDate,
} from './ads-config/date-time';
import {
    resolveStatus,
    runtimeMeta,
    statusMeta,
} from './ads-config/runtime-status';
import {
    enforceUsageTypeRules,
    getUsageLabel,
    isDecorativeUsage,
    normalizeUsageType,
    usageOptions,
} from './ads-config/usage-type';
import { deviceOptions, loginOptions } from './ads-config/audience-options';
import {
    buildTemplateBehaviorDefaults,
    buildTemplateContainerStyleDefaults,
    getCreativeTemplateData,
} from './ads-config/template-defaults';

const BlockEditor = lazy(() => import('../components/BlockEditor'));
const TemplateLibraryModal = lazy(
    () => import('../components/TemplateLibraryModal')
);
const BuildProbe = lazy(() => import('../components/BuildProbe'));
const SystemSettingsPanel = lazy(() => import('../panels/SystemSettingsPanel'));
const ConsentPanel = lazy(() => import('../panels/ConsentPanel'));
const InsertHelpPanel = lazy(() => import('../panels/InsertHelpPanel'));
const ExperimentsPanel = lazy(() => import('../panels/ExperimentsPanel'));
const DebugPanel = lazy(() => import('../panels/DebugPanel'));

const SIDEBAR_FILTERS = [
    { value: 'all', label: '全部' },
    { value: 'active', label: '生效' },
    { value: 'risk', label: '待处理' },
    { value: 'paused', label: '停用' },
];

const SIDEBAR_TYPE_VIEWS = [
    { value: 'all', label: '全部类型' },
    { value: 'global', label: '全局广告' },
    { value: 'targeted', label: '指定广告' },
];

const buildSaveSignature = (ads, slots) => {
    try {
        return JSON.stringify({ ads, slots });
    } catch (err) {
        const adCount = Array.isArray(ads) ? ads.length : 0;
        const slotCount = Array.isArray(slots) ? slots.length : 0;
        return `${adCount}:${slotCount}`;
    }
};

const AdsConfig = () => {
    const headerStorageKey = 'magick_ad_header_collapsed';
    const containerTabStorageKey = 'magick_ad_container_tab';
    const frequencyPanelStorageKey = 'magick_ad_panel_frequency';
    const placementTabStorageKey = 'magick_ad_panel_placement_tab';
    const placementDrawerScrollStorageKey = 'magick_ad_placement_drawer_scroll';
    const rightSidebarTabStorageKey = 'magick_ad_right_sidebar_tab';
    const editorModeStorageKey = 'magick_ad_editor_mode';
    const allowedEditorModes = new Set(['quick', 'design', 'expert']);
    const editorModeLabels = {
        quick: '快速',
        design: '设计',
        expert: '专家',
    };
    const ads = useStore((state) => state.ads);
    const isLoading = useStore((state) => state.isLoading);
    const isSaving = useStore((state) => state.isSaving);
    const error = useStore((state) => state.error);
    const slots = useStore((state) => state.slots);
    const addAdGroup = useStore((state) => state.addAdGroup);
    const removeAdGroup = useStore((state) => state.removeAdGroup);
    const updateAdGroup = useStore((state) => state.updateAdGroup);
    const addSlot = useStore((state) => state.addSlot);
    const updateSlot = useStore((state) => state.updateSlot);
    const removeSlot = useStore((state) => state.removeSlot);
    const saveToDB = useStore((state) => state.saveToDB);
    const fetchFromDB = useStore((state) => state.fetchFromDB);
    const [lastSavedSignature, setLastSavedSignature] = useState(null);
    const prevLoadingRef = useRef(isLoading);
    const currentSaveSignature = useMemo(
        () => buildSaveSignature(ads, slots),
        [ads, slots]
    );
    const hasUnsavedChanges =
        lastSavedSignature !== null &&
        currentSaveSignature !== lastSavedSignature;

    const [selectedId, setSelectedId] = useState(null);
    const [switchConfirmTargetId, setSwitchConfirmTargetId] = useState(null);
    const [showValidation, setShowValidation] = useState(false);
    const [devicePreview, setDevicePreview] = useState('desktop');
    const { notice, showNotice, clearNotice } = useNotice();
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [renameTarget, setRenameTarget] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
    const [saveTemplateType, setSaveTemplateType] = useState('image');
    const [saveTemplateName, setSaveTemplateName] = useState('');
    const [saveTemplateCategory, setSaveTemplateCategory] = useState('');
    const [saveTemplateCategoryName, setSaveTemplateCategoryName] =
        useState('');
    const [systemSettings, setSystemSettings] = useState({
        block_editor_enabled: false,
    });
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [headerCollapsed, setHeaderCollapsed] = useState(() => {
        if (typeof window === 'undefined') {
            return true;
        }
        try {
            const stored = window.localStorage?.getItem(headerStorageKey);
            if (stored === null) {
                return true;
            }
            return stored === '1';
        } catch (err) {
            return true;
        }
    });
    const readEditorMode = (fallback) => {
        if (typeof window === 'undefined') {
            return fallback;
        }
        try {
            const stored = window.localStorage?.getItem(editorModeStorageKey);
            if (!stored) {
                return fallback;
            }
            return allowedEditorModes.has(stored) ? stored : fallback;
        } catch (err) {
            return fallback;
        }
    };
    const fetchSystemSettings = () => {
        apiFetch({ path: '/magick-ad/v1/system-settings' })
            .then((response) => {
                setSystemSettings({
                    block_editor_enabled: Boolean(
                        response?.block_editor_enabled
                    ),
                });
            })
            .catch(() => {});
    };
    const [storedEditorMode, setStoredEditorMode] = useState(() =>
        readEditorMode('design')
    );
    const [publishModalOpen, setPublishModalOpen] = useState(false);
    const [placementModalOpen, setPlacementModalOpen] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [placementTab, setPlacementTab] = useState(() => {
        if (typeof window === 'undefined') {
            return 'placement';
        }
        try {
            const stored =
                window.localStorage?.getItem(placementTabStorageKey) ||
                'placement';
            const allowed = new Set([
                'rules',
                'container',
                'behavior',
                'placement',
                'frequency',
            ]);
            return allowed.has(stored) ? stored : 'placement';
        } catch (err) {
            return 'placement';
        }
    });
    const quickPlacementTabStorageKey = 'magick_ad_quick_placement_tab';
    const readPanelState = (key, fallback) => {
        if (typeof window === 'undefined') {
            return fallback;
        }
        try {
            const stored = window.localStorage?.getItem(key);
            if (!stored) {
                return fallback;
            }
            return stored === 'none' ? null : stored;
        } catch (err) {
            return fallback;
        }
    };

    const [placementDetailsOpen, setPlacementDetailsOpen] = useState(false);
    const [placementAdvancedOpen, setPlacementAdvancedOpen] = useState(null);
    const [quickPlacementTab, setQuickPlacementTab] = useState(() => {
        const allowed = new Set(['insert', 'rules', 'node']);
        const stored = readPanelState(quickPlacementTabStorageKey, 'insert');
        return allowed.has(stored) ? stored : 'insert';
    });
    const [quickPlacementPanelOpen, setQuickPlacementPanelOpen] =
        useState('insert');
    const [behaviorAdvancedOpen, setBehaviorAdvancedOpen] = useState(false);
    const [containerAdvancedOpen, setContainerAdvancedOpen] = useState(false);
    const [containerTab, setContainerTab] = useState(() => {
        const allowed = new Set([
            'base',
            'size',
            'spacing',
            'appearance',
            'badge',
        ]);
        const stored = readPanelState(containerTabStorageKey, 'base');
        return allowed.has(stored) ? stored : 'base';
    });
    const [frequencyPanelOpen, setFrequencyPanelOpen] = useState(() =>
        readPanelState(frequencyPanelStorageKey, 'frequency')
    );
    const [rightSidebarTab, setRightSidebarTab] = useState(() => {
        const allowed = new Set(['publish', 'runtime', 'placement']);
        const stored = readPanelState(rightSidebarTabStorageKey, 'placement');
        return allowed.has(stored) ? stored : 'placement';
    });
    const [runtimeDetailsOpen, setRuntimeDetailsOpen] = useState(false);
    const [previewTarget, setPreviewTarget] = useState('');
    const [previewMode, setPreviewMode] = useState('url');
    const [previewSearch, setPreviewSearch] = useState('');
    const [previewOptions, setPreviewOptions] = useState([]);
    const [previewOptionLinks, setPreviewOptionLinks] = useState({});
    const [previewSelected, setPreviewSelected] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewLogin, setPreviewLogin] = useState('auto');
    const [previewUsePage, setPreviewUsePage] = useState(false);
    const placementDrawerBodyRef = useRef(null);
    const placementDrawerWasOpenRef = useRef(false);
    const [placementDrawerScrollTop, setPlacementDrawerScrollTop] = useState(
        () => {
            if (typeof window === 'undefined') {
                return 0;
            }
            try {
                const stored = Number(
                    window.localStorage?.getItem(
                        placementDrawerScrollStorageKey
                    ) || 0
                );
                return Number.isFinite(stored) && stored >= 0 ? stored : 0;
            } catch (err) {
                return 0;
            }
        }
    );
    const [htmlTab, setHtmlTab] = useState('content');
    const [htmlSettingsTab, setHtmlSettingsTab] = useState('mode');
    const [imageTab, setImageTab] = useState('content');
    const [videoTab, setVideoTab] = useState('content');
    const [videoSettingsAdvancedOpen, setVideoSettingsAdvancedOpen] = useState(false);
    const [htmlScriptsAdvancedOpen, setHtmlScriptsAdvancedOpen] = useState(false);
    const [blockTab, setBlockTab] = useState('content');
    const [blockSettingsTab, setBlockSettingsTab] = useState('style');
    const [pickerConfirmOpen, setPickerConfirmOpen] = useState(false);
    const [pickerType, setPickerType] = useState('id');
    const [pickerValue, setPickerValue] = useState('');
    const [pickerId, setPickerId] = useState('');
    const [pickerClasses, setPickerClasses] = useState([]);
    const [pickerLabel, setPickerLabel] = useState('');
    const [debugEnabled, setDebugEnabled] = useState(false);
    const [displayLevel, setDisplayLevel] = useState(() => readDisplayLevel());
    const [displayLevelSaving, setDisplayLevelSaving] = useState(false);
    const [adSearch, setAdSearch] = useState('');
    const [adFilter, setAdFilter] = useState('all');
    const [adTypeView, setAdTypeView] = useState('all');
    const [contentPanelOpenState, setContentPanelOpenState] = useState(() => ({
        image: true,
        html: true,
        video: false,
        block: false,
    }));
    const isSimpleLevel = displayLevel === 'simple';
    const branding =
        (typeof window !== 'undefined' && window.MagickAD?.branding) || {
            name: 'Magick AD',
            tagline: '广告配置与投放规则管理',
        };
    const canUnfilteredHtml =
        typeof window !== 'undefined' &&
        window.MagickAD &&
        window.MagickAD.canUnfilteredHtml;

    const getOptionLabel = (options, value, fallback) => {
        const hit = (options || []).find((item) => item.value === value);
        if (hit && hit.label) {
            return hit.label;
        }
        return fallback || value || '';
    };

    const renderDeviceLoginControls = () => (
        <>
            <SelectControl
                label="设备限制"
                value={selectedAd?.options?.device || 'all'}
                options={deviceOptions}
                onChange={(value) =>
                    handleUpdateOptions({
                        device: value,
                    })
                }
            />
            <SelectControl
                label="登录状态"
                value={selectedAd?.options?.login || 'all'}
                options={loginOptions}
                onChange={(value) =>
                    handleUpdateOptions({
                        login: value,
                    })
                }
            />
            {runtimeContextMeta?.deviceMismatch && (
                <Notice status="warning" isDismissible={false}>
                    当前模拟设备为“{runtimeContextMeta.currentDeviceLabel}”，
                    但广告限制为“{runtimeContextMeta.deviceRuleLabel}”，预计不会展示。
                </Notice>
            )}
            {runtimeContextMeta?.loginMismatch && (
                <Notice status="warning" isDismissible={false}>
                    当前模拟登录态为“{runtimeContextMeta.currentLoginLabel}”，
                    但广告限制为“{runtimeContextMeta.loginRuleLabel}”，预计不会展示。
                </Notice>
            )}
        </>
    );

    useEffect(() => {
        fetchFromDB();
    }, [fetchFromDB]);

    useEffect(() => {
        const wasLoading = prevLoadingRef.current;
        if ((wasLoading && !isLoading) || (lastSavedSignature === null && !isLoading)) {
            setLastSavedSignature(buildSaveSignature(ads, slots));
        }
        prevLoadingRef.current = isLoading;
    }, [isLoading, ads, slots, lastSavedSignature]);

    useEffect(() => {
        fetchSystemSettings();
    }, []);

    useEffect(() => {
        if (!selectedId && ads.length > 0) {
            setSelectedId(ads[0].id);
        }
    }, [ads, selectedId]);

    useEffect(() => {
        if (!hasUnsavedChanges && switchConfirmTargetId) {
            setSwitchConfirmTargetId(null);
        }
    }, [hasUnsavedChanges, switchConfirmTargetId]);

    useEffect(() => {
        if (displayLevel === 'simple') {
            setContentPanelOpenState({
                image: true,
                html: true,
                video: true,
                block: true,
            });
            return;
        }
        setContentPanelOpenState((prev) => ({
            image: prev.image ?? true,
            html: prev.html ?? true,
            video: prev.video ?? false,
            block: prev.block ?? false,
        }));
    }, [displayLevel]);

    const toggleContentPanelOpen = (key) => {
        setContentPanelOpenState((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    useEffect(() => {
        if (!showValidation) {
            return;
        }
        const allPlaced = ads.every((ad) => {
            const placement = resolvePlacement(ad.options || {});
            if (!placement.hook) {
                return false;
            }
            if (placement.hook === 'content' && !placement.position) {
                return false;
            }
            if (
                placement.hook === 'content' &&
                placement.position === 'paragraph' &&
                placement.paragraph < 1
            ) {
                return false;
            }
            return true;
        });
        if (allPlaced) {
            setShowValidation(false);
        }
    }, [ads, showValidation]);

    const selectedAd = useMemo(
        () => ads.find((ad) => ad.id === selectedId),
        [ads, selectedId]
    );

    useEffect(() => {
        setPlacementDetailsOpen(false);
        setRuntimeDetailsOpen(false);
    }, [selectedId]);

    useEffect(() => {
        if (!selectedAd) {
            return;
        }
        const placement = resolvePlacement(selectedAd.options || {});
        const mode = selectedAd.content?.container_style?.mode || 'boxed';
        if (placement.hook === 'head' && mode !== 'raw') {
            updateAdGroup(selectedAd.id, {
                content: {
                    ...selectedAd.content,
                    container_style: {
                        ...(selectedAd.content?.container_style || {}),
                        mode: 'raw',
                    },
                },
            });
            return;
        }
        if (placement.hook !== 'head' && mode === 'raw') {
            updateAdGroup(selectedAd.id, {
                content: {
                    ...selectedAd.content,
                    container_style: {
                        ...(selectedAd.content?.container_style || {}),
                        mode: 'boxed',
                    },
                },
            });
        }
    }, [
        selectedAd?.id,
        selectedAd?.options?.placement_hook,
        selectedAd?.options?.placement_position,
        selectedAd?.options?.placement_paragraph,
    ]);

    useEffect(() => {
        let isMounted = true;
        apiFetch({ path: '/magick-ad/v1/debug' })
            .then((response) => {
                if (!isMounted) {
                    return;
                }
                const forced = Boolean(response?.forced);
                setDebugEnabled(forced ? true : Boolean(response?.enabled));
            })
            .catch(() => {});
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const handler = (event) => {
            const detail = event?.detail || {};
            if (detail.enabled === undefined && detail.forced === undefined) {
                return;
            }
            setDebugEnabled(Boolean(detail.forced || detail.enabled));
        };
        window.addEventListener('magick-ad-debug-updated', handler);
        return () => window.removeEventListener('magick-ad-debug-updated', handler);
    }, []);

    const editorModeRaw =
        selectedAd?.options?.editor_mode || storedEditorMode || 'design';
    const effectiveEditorMode = isSimpleLevel
        ? 'quick'
        : editorModeRaw === 'expert' && !canUnfilteredHtml
          ? 'design'
          : editorModeRaw;
    const isQuickMode = effectiveEditorMode === 'quick';
    const isExpertMode = !isSimpleLevel && effectiveEditorMode === 'expert';

    useEffect(() => {
        setPlacementTab('placement');
    }, [selectedId]);

    useEffect(() => {
        if (!selectedAd?.options?.editor_mode) {
            return;
        }
        const nextMode = selectedAd.options.editor_mode;
        if (!nextMode || !allowedEditorModes.has(nextMode)) {
            return;
        }
        setStoredEditorMode(nextMode);
        if (typeof window === 'undefined') {
            return;
        }
        try {
            window.localStorage?.setItem(editorModeStorageKey, nextMode);
        } catch (err) {
            // ignore storage errors
        }
    }, [selectedAd?.options?.editor_mode]);


    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            window.localStorage?.setItem(
                headerStorageKey,
                headerCollapsed ? '1' : '0'
            );
        } catch (err) {
            // ignore storage errors
        }
    }, [headerCollapsed]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const syncDisplayLevel = () => {
            setDisplayLevel(readDisplayLevel());
        };
        window.addEventListener('storage', syncDisplayLevel);
        window.addEventListener(
            'magick-ad-display-level-updated',
            syncDisplayLevel
        );
        return () => {
            window.removeEventListener('storage', syncDisplayLevel);
            window.removeEventListener(
                'magick-ad-display-level-updated',
                syncDisplayLevel
            );
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            window.localStorage?.setItem(
                containerTabStorageKey,
                containerTab || 'base'
            );
        } catch (err) {
            // ignore storage errors
        }
    }, [containerTab]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            window.localStorage?.setItem(
                quickPlacementTabStorageKey,
                quickPlacementTab || 'insert'
            );
        } catch (err) {
            // ignore storage errors
        }
    }, [quickPlacementTab]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            window.localStorage?.setItem(
                placementTabStorageKey,
                placementTab || 'placement'
            );
        } catch (err) {
            // ignore storage errors
        }
    }, [placementTab]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            window.localStorage?.setItem(
                placementDrawerScrollStorageKey,
                String(Math.max(0, Math.floor(placementDrawerScrollTop || 0)))
            );
        } catch (err) {
            // ignore storage errors
        }
    }, [placementDrawerScrollTop]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const wasOpen = placementDrawerWasOpenRef.current;
        if (placementModalOpen && !wasOpen) {
            window.requestAnimationFrame(() => {
                if (placementDrawerBodyRef.current) {
                    placementDrawerBodyRef.current.scrollTop =
                        placementDrawerScrollTop;
                }
            });
        }
        placementDrawerWasOpenRef.current = placementModalOpen;
    }, [placementModalOpen, placementDrawerScrollTop]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            window.localStorage?.setItem(
                frequencyPanelStorageKey,
                frequencyPanelOpen || 'none'
            );
        } catch (err) {
            // ignore storage errors
        }
    }, [frequencyPanelOpen]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            window.localStorage?.setItem(
                rightSidebarTabStorageKey,
                rightSidebarTab || 'placement'
            );
        } catch (err) {
            // ignore storage errors
        }
    }, [rightSidebarTab]);

    const { targetItems, targetSuggestions, targetLoading, handleTargetSearch } =
        useTargeting(selectedAd);

    const positionOptions = useMemo(() => {
        const page = selectedAd?.options?.show_page || 'all';
        const usageType = normalizeUsageType(selectedAd?.options?.usage_type || 'ad');
        const options = getPositionOptions(page);
        const filteredOptions =
            usageType === 'decorative'
                ? options.filter(
                      (item) => !['head', 'node'].includes(item.value)
                  )
                : options;
        return [
            { label: '请选择展示位置', value: '' },
            ...filteredOptions,
        ];
    }, [selectedAd?.options?.show_page, selectedAd?.options?.usage_type]);

    const targetPositionOptions = useMemo(() => {
        const targetType = selectedAd?.options?.target_type || '';
        if (!targetType) {
            return [{ label: '请选择展示位置', value: '' }];
        }
        const usageType = normalizeUsageType(selectedAd?.options?.usage_type || 'ad');
        const options = getPositionOptions(targetType);
        const filteredOptions =
            usageType === 'decorative'
                ? options.filter(
                      (item) => !['head', 'node'].includes(item.value)
                  )
                : options;
        return [
            { label: '请选择展示位置', value: '' },
            ...filteredOptions,
        ];
    }, [selectedAd?.options?.target_type, selectedAd?.options?.usage_type]);

    const resolvePlacement = (options) => {
        const placement = {
            hook: options?.placement_hook || '',
            position: options?.placement_position || '',
            paragraph: Number(options?.placement_paragraph || 0),
        };

        if (placement.hook === 'content') {
            if (placement.position !== 'paragraph') {
                placement.paragraph = 0;
            }
        } else {
            placement.position = '';
            placement.paragraph = 0;
        }

        return placement;
    };

    const isHeadPlacement = useMemo(() => {
        if (!selectedAd) {
            return false;
        }
        return resolvePlacement(selectedAd.options || {}).hook === 'head';
    }, [selectedAd?.options?.placement_hook, selectedAd?.options?.placement_position, selectedAd?.options?.placement_paragraph]);

    function fixDuplicateSlotIds() {
        const used = new Set();
        let fixed = 0;
        slots.forEach((slot, index) => {
            const raw = cleanForSlug(slot?.id || '');
            if (!raw) {
                return;
            }
            if (!used.has(raw)) {
                used.add(raw);
                if (slot.id !== raw) {
                    updateSlot(index, { id: raw });
                }
                return;
            }
            let candidate = raw;
            let suffix = 2;
            while (used.has(candidate)) {
                candidate = `${raw}-${suffix}`;
                suffix += 1;
            }
            used.add(candidate);
            updateSlot(index, { id: candidate });
            fixed += 1;
        });
        return fixed;
    }

    const applyPlacementSelection = (positionValue, extraOptions = {}) => {
        if (!selectedAd) {
            return;
        }
        const placementUpdates = slotToPlacementUpdates(positionValue);
        const nextOptions = {
            ...selectedAd.options,
            ...extraOptions,
            ...placementUpdates,
        };
        const enforced = enforceUsageTypeRules(nextOptions, selectedAd.content || {});
        const resolvedPlacement = resolvePlacement(enforced.options || {});
        if (
            isDecorativeUsage(selectedAd.options || {}) &&
            resolvedPlacement.hook !== placementUpdates.placement_hook
        ) {
            showNotice(
                'warning',
                '装饰组件仅支持“顶部 / 内容前后 / 底部”位置，已自动回退。',
                2800
            );
        }
        if (resolvedPlacement.hook === 'head') {
            updateAdGroup(selectedAd.id, {
                options: enforced.options,
                content: {
                    ...enforced.content,
                    container_style: {
                        ...(enforced.content?.container_style || {}),
                        mode: 'raw',
                    },
                },
            });
            return;
        }
        updateAdGroup(selectedAd.id, {
            options: enforced.options,
            content: enforced.content,
        });
    };

    const placementToSlotValue = (placement) => {
        if (!placement?.hook) {
            return '';
        }
        if (placement.hook === 'node') {
            return 'node';
        }
        if (placement.hook === 'head') {
            return 'head';
        }
        if (placement.hook === 'body_top') {
            return 'top';
        }
        if (placement.hook === 'footer') {
            return 'bottom';
        }
        if (placement.hook === 'comments_top') {
            return 'comments_top';
        }
        if (placement.hook === 'comments_bottom') {
            return 'comments_bottom';
        }
        if (placement.hook === 'comment_form_before') {
            return 'comment_form_before';
        }
        if (placement.hook === 'comment_form_after') {
            return 'comment_form_after';
        }
        if (placement.hook === 'content') {
            if (placement.position === 'before') {
                return 'content_before';
            }
            if (placement.position === 'after') {
                return 'content_after';
            }
            if (placement.position === 'paragraph') {
                return 'paragraph_3';
            }
        }
        return '';
    };

    const slotToPlacementUpdates = (value) => {
        const updates = {
            placement_hook: '',
            placement_position: '',
            placement_paragraph: 0,
        };

        switch (value) {
            case 'node':
                updates.placement_hook = 'node';
                break;
            case 'head':
                updates.placement_hook = 'head';
                break;
            case 'top':
                updates.placement_hook = 'body_top';
                break;
            case 'bottom':
            case 'footer':
                updates.placement_hook = 'footer';
                break;
            case 'content_before':
            case 'post_top':
                updates.placement_hook = 'content';
                updates.placement_position = 'before';
                break;
            case 'content_after':
            case 'post_bottom':
                updates.placement_hook = 'content';
                updates.placement_position = 'after';
                break;
            case 'paragraph_3':
                updates.placement_hook = 'content';
                updates.placement_position = 'paragraph';
                updates.placement_paragraph = 3;
                break;
            case 'comments_top':
                updates.placement_hook = 'comments_top';
                break;
            case 'comments_bottom':
                updates.placement_hook = 'comments_bottom';
                break;
            case 'comment_form_before':
                updates.placement_hook = 'comment_form_before';
                break;
            case 'comment_form_after':
                updates.placement_hook = 'comment_form_after';
                break;
            default:
                updates.placement_hook = '';
        }

        return updates;
    };

    const resolvePlacementLabel = (options = {}) => {
        const placement = resolvePlacement(options);
        if (placement.hook === 'head') {
            return 'Head (脚本/像素)';
        }
        if (placement.hook === 'body_top') {
            return '顶部';
        }
        if (placement.hook === 'footer') {
            return '底部';
        }
        if (placement.hook === 'node') {
            return '指定节点';
        }
        if (placement.hook === 'comments_top') {
            return '评论列表顶部';
        }
        if (placement.hook === 'comments_bottom') {
            return '评论列表底部';
        }
        if (placement.hook === 'comment_form_before') {
            return '评论框上方';
        }
        if (placement.hook === 'comment_form_after') {
            return '评论框下方';
        }
        if (placement.hook === 'content') {
            if (placement.position === 'before') {
                return '内容前';
            }
            if (placement.position === 'after') {
                return '内容后';
            }
            if (placement.position === 'paragraph') {
                return `第 ${placement.paragraph || 3} 段后`;
            }
        }
        return '未设置';
    };

    const resolveContainerTypeLabel = (options = {}) => {
        const containerType = options.container_type || 'inline';
        if (containerType === 'popup') {
            return '弹窗';
        }
        if (containerType === 'banner') {
            return '横栏';
        }
        if (containerType === 'floating') {
            return '悬浮';
        }
        if (containerType === 'interstitial') {
            return '插屏';
        }
        return '默认嵌入';
    };

    const getEffectBaseUrl = () => {
        const fallback =
            window?.MagickAD?.previewUrl || window.location.origin;
        const preferred =
            typeof previewTarget === 'string' && previewTarget.trim()
                ? previewTarget.trim()
                : fallback;
        let url;
        try {
            url = new URL(preferred, window.location.origin);
        } catch (err) {
            url = new URL(fallback, window.location.origin);
        }
        if (url.origin !== window.location.origin) {
            url = new URL(fallback, window.location.origin);
        }
        return url;
    };

    const stripEffectParams = (url) => {
        [
            'magick_ad_preview',
            'magick_ad_preview_ad',
            'magick_ad_preview_nonce',
            'magick_ad_preview_device',
            'magick_ad_preview_mode',
            'magick_ad_preview_force',
            'magick_ad_diagnose',
            'magick_ad_diagnose_nonce',
            'magick_ad_debug_device',
            'magick_ad_debug_login',
        ].forEach((key) => url.searchParams.delete(key));
    };

    const buildRuntimePreviewUrl = () => {
        const previewNonce = window?.MagickAD?.previewNonce;
        if (!previewNonce || !selectedAd?.id) {
            return '';
        }
        const url = getEffectBaseUrl();
        stripEffectParams(url);
        url.searchParams.set('magick_ad_preview', '1');
        url.searchParams.set('magick_ad_preview_ad', selectedAd.id);
        url.searchParams.set('magick_ad_preview_nonce', previewNonce);
        url.searchParams.set('magick_ad_preview_device', devicePreview);
        if (
            (typeof previewTarget === 'string' && previewTarget.trim()) ||
            previewUsePage
        ) {
            url.searchParams.set('magick_ad_preview_mode', 'page');
        }
        return url.toString();
    };

    const buildRuntimeDiagnoseUrl = () => {
        const diagnoseNonce = window?.MagickAD?.diagnoseNonce;
        if (!diagnoseNonce) {
            return '';
        }
        const url = getEffectBaseUrl();
        stripEffectParams(url);
        const debugDevice = ['mobile', 'tablet', 'desktop'].includes(
            devicePreview
        )
            ? devicePreview
            : 'auto';
        const debugLogin = ['auto', 'logged-in', 'logged-out'].includes(
            previewLogin
        )
            ? previewLogin
            : 'auto';
        url.searchParams.set('magick_ad_diagnose', '1');
        url.searchParams.set('magick_ad_diagnose_nonce', diagnoseNonce);
        url.searchParams.set('magick_ad_debug_device', debugDevice);
        url.searchParams.set('magick_ad_debug_login', debugLogin);
        return url.toString();
    };

    const runtimeContextMeta = useMemo(() => {
        if (!selectedAd) {
            return null;
        }
        const options = selectedAd.options || {};
        const runtime = runtimeMeta(selectedAd);
        const usageType = normalizeUsageType(options.usage_type || 'ad');
        const deviceRule = options.device || 'all';
        const loginRule = options.login || 'all';
        const effectiveLogin =
            previewLogin === 'auto' ? 'logged-in' : previewLogin;
        const currentDeviceLabel = getOptionLabel(
            deviceOptions,
            devicePreview,
            '桌面端'
        );
        const currentLoginLabel =
            previewLogin === 'auto'
                ? '自动（当前已登录）'
                : getOptionLabel(loginOptions, effectiveLogin, '已登录');
        const deviceRuleLabel = getOptionLabel(
            deviceOptions,
            deviceRule,
            '全部设备'
        );
        const loginRuleLabel = getOptionLabel(
            loginOptions,
            loginRule,
            '全部用户'
        );
        const deviceMismatch =
            deviceRule !== 'all' && deviceRule !== devicePreview;
        const loginMismatch =
            loginRule !== 'all' && loginRule !== effectiveLogin;
        const targetCount = Array.isArray(options.target_ids)
            ? options.target_ids.length
            : Array.isArray(options.target_values)
              ? options.target_values.length
              : 0;
        const pageLabel =
            options.ad_type === 'targeted' && options.target_type
                ? `${getOptionLabel(
                      TARGET_TYPE_OPTIONS,
                      options.target_type,
                      '指定类型'
                  )}（${targetCount} 项）`
                : getOptionLabel(
                      DISPLAY_PAGE_OPTIONS,
                      options.show_page || 'all',
                      '全站'
                  );
        const reasons = [];
        if (runtime.blocked) {
            reasons.push(runtime.label);
        }
        if (deviceMismatch) {
            reasons.push('设备不匹配');
        }
        if (loginMismatch) {
            reasons.push('登录状态不匹配');
        }
        return {
            placementLabel: resolvePlacementLabel(options),
            usageType,
            usageLabel: getUsageLabel(usageType),
            pageLabel,
            deviceRuleLabel,
            loginRuleLabel,
            currentDeviceLabel,
            currentLoginLabel,
            deviceMismatch,
            loginMismatch,
            blocked: reasons.length > 0,
            reasonText:
                reasons.length > 0
                    ? `当前模拟环境下预计不展示：${reasons.join(' · ')}`
                    : '当前模拟环境下预计可展示。',
            statusClassName:
                reasons.length > 0 ? 'is-disabled' : 'is-enabled',
            statusLabel: reasons.length > 0 ? '预计不展示' : '预计展示',
            previewUrl: buildRuntimePreviewUrl(),
            diagnoseUrl: buildRuntimeDiagnoseUrl(),
        };
    }, [
        selectedAd?.id,
        selectedAd?.status,
        selectedAd?.date,
        selectedAd?.options?.enabled,
        selectedAd?.options?.ad_type,
        selectedAd?.options?.show_page,
        selectedAd?.options?.target_type,
        selectedAd?.options?.target_ids,
        selectedAd?.options?.target_values,
        selectedAd?.options?.usage_type,
        selectedAd?.options?.placement_hook,
        selectedAd?.options?.placement_position,
        selectedAd?.options?.placement_paragraph,
        selectedAd?.options?.device,
        selectedAd?.options?.login,
        selectedAd?.options?.start_date,
        selectedAd?.options?.end_date,
        devicePreview,
        previewLogin,
        previewTarget,
        previewUsePage,
    ]);

    const missingPositionIds = useMemo(() => {
        return new Set(
            ads.filter((ad) => {
                const placement = resolvePlacement(ad.options || {});
                if (!placement.hook) {
                    return true;
                }
                if (placement.hook === 'content' && !placement.position) {
                    return true;
                }
                if (
                    placement.hook === 'content' &&
                    placement.position === 'paragraph' &&
                    placement.paragraph < 1
                ) {
                    return true;
                }
                return false;
            }).map((ad) => ad.id)
        );
    }, [ads]);

    const buildSimpleLevelPatch = (ad) => {
        if (!ad) {
            return null;
        }
        const options = ad.options || {};
        const content = ad.content || {};
        const optionPatch = {};
        const contentPatch = {};

        if (options.editor_mode !== 'quick') {
            optionPatch.editor_mode = 'quick';
        }
        if (options.creative_type === 'block') {
            optionPatch.creative_type = 'html';
            if (
                (!content.html || !String(content.html).trim()) &&
                typeof content.blocks === 'string' &&
                content.blocks.trim()
            ) {
                contentPatch.html = content.blocks;
            }
        }
        if (options.placement_hook === 'node') {
            optionPatch.placement_hook = 'footer';
            optionPatch.placement_position = '';
            optionPatch.placement_paragraph = 0;
        }
        if (options.html_mode === 'full') {
            optionPatch.html_mode = 'safe';
        }
        if (options.html_sandbox === 'disable') {
            optionPatch.html_sandbox = 'inherit';
        }

        if (content.variants_enabled) {
            contentPatch.variants_enabled = false;
        }
        if (content.variants_strategy === 'session') {
            contentPatch.variants_strategy = 'request';
        }
        if (Array.isArray(content.variants) && content.variants.length > 0) {
            contentPatch.variants = [];
        }
        if (
            typeof content.custom_js === 'string' &&
            content.custom_js.trim() !== ''
        ) {
            contentPatch.custom_js = '';
        }

        const hasOptionPatch = Object.keys(optionPatch).length > 0;
        const hasContentPatch = Object.keys(contentPatch).length > 0;
        if (!hasOptionPatch && !hasContentPatch) {
            return null;
        }
        return {
            ...(hasOptionPatch ? { options: { ...options, ...optionPatch } } : {}),
            ...(hasContentPatch ? { content: { ...content, ...contentPatch } } : {}),
        };
    };

    useEffect(() => {
        if (!isSimpleLevel || !Array.isArray(ads) || ads.length === 0) {
            return;
        }
        ads.forEach((ad) => {
            const patch = buildSimpleLevelPatch(ad);
            if (!patch) {
                return;
            }
            updateAdGroup(ad.id, patch);
        });
    }, [isSimpleLevel, ads, updateAdGroup]);

    useEffect(() => {
        if (!selectedAd) {
            return;
        }
        const currentOptions = selectedAd.options || {};
        const currentContent = selectedAd.content || {};
        const enforced = enforceUsageTypeRules(currentOptions, currentContent);
        const behavior = currentContent.behavior || {};
        const nextBehavior = enforced.content?.behavior || {};
        const videoSettings = currentContent.video_settings || {};
        const nextVideoSettings = enforced.content?.video_settings || {};
        const optionsChanged =
            currentOptions.usage_type !== enforced.options.usage_type ||
            currentOptions.container_type !== enforced.options.container_type ||
            currentOptions.placement_hook !== enforced.options.placement_hook ||
            currentOptions.placement_position !==
                enforced.options.placement_position ||
            Number(currentOptions.placement_paragraph || 0) !==
                Number(enforced.options.placement_paragraph || 0) ||
            Boolean(currentOptions.render_require_consent) !==
                Boolean(enforced.options.render_require_consent);
        const contentChanged =
            Boolean(currentContent.variants_enabled) !==
                Boolean(enforced.content?.variants_enabled) ||
            (currentContent.variants_strategy || 'request') !==
                (enforced.content?.variants_strategy || 'request') ||
            (Array.isArray(currentContent.variants)
                ? currentContent.variants.length
                : 0) !==
                (Array.isArray(enforced.content?.variants)
                    ? enforced.content.variants.length
                    : 0) ||
            (behavior.frequency_mode || 'none') !==
                (nextBehavior.frequency_mode || 'none') ||
            Number(behavior.frequency_limit || 1) !==
                Number(nextBehavior.frequency_limit || 1) ||
            Number(behavior.delay || 0) !== Number(nextBehavior.delay || 0) ||
            Boolean(videoSettings.track_events) !==
                Boolean(nextVideoSettings.track_events);
        if (!optionsChanged && !contentChanged) {
            return;
        }
        updateAdGroup(selectedAd.id, {
            options: enforced.options,
            content: enforced.content,
        });
    }, [
        selectedAd?.id,
        selectedAd?.options?.usage_type,
        selectedAd?.options?.container_type,
        selectedAd?.options?.placement_hook,
        selectedAd?.options?.placement_position,
        selectedAd?.options?.placement_paragraph,
        selectedAd?.options?.render_require_consent,
        selectedAd?.content?.variants_enabled,
        selectedAd?.content?.variants_strategy,
        selectedAd?.content?.variants,
        selectedAd?.content?.behavior?.frequency_mode,
        selectedAd?.content?.behavior?.frequency_limit,
        selectedAd?.content?.behavior?.delay,
        selectedAd?.content?.video_settings?.track_events,
        updateAdGroup,
    ]);

    const handleUpdateOptions = (updates) => {
        if (!selectedAd) {
            return;
        }
        let nextOptions = {
            ...selectedAd.options,
            ...updates,
        };
        if (isSimpleLevel) {
            nextOptions.editor_mode = 'quick';
            if (nextOptions.creative_type === 'block') {
                nextOptions.creative_type = 'html';
            }
            if (nextOptions.placement_hook === 'node') {
                nextOptions.placement_hook = 'footer';
                nextOptions.placement_position = '';
                nextOptions.placement_paragraph = 0;
            }
            if (nextOptions.html_mode === 'full') {
                nextOptions.html_mode = 'safe';
            }
            if (nextOptions.html_sandbox === 'disable') {
                nextOptions.html_sandbox = 'inherit';
            }
        }
        const enforced = enforceUsageTypeRules(nextOptions, selectedAd.content || {});
        nextOptions = enforced.options;
        const shouldSyncContent =
            enforced.changed || isDecorativeUsage(nextOptions);
        updateAdGroup(selectedAd.id, {
            options: nextOptions,
            ...(shouldSyncContent ? { content: enforced.content } : {}),
        });
        if (
            Object.prototype.hasOwnProperty.call(updates, 'usage_type') &&
            enforced.reasons.length > 0
        ) {
            showNotice(
                'info',
                `已按“装饰组件”规则自动收敛：${enforced.reasons.join('；')}`,
                3200
            );
        }
    };

    const jumpToImageSettings = () => {
        handleUpdateOptions({ creative_type: 'image' });
        setImageTab('settings');
    };

    const updateEditorMode = (mode) => {
        const nextMode = isSimpleLevel ? 'quick' : mode;
        setStoredEditorMode(nextMode);
        if (typeof window !== 'undefined') {
            try {
                window.localStorage?.setItem(editorModeStorageKey, nextMode);
            } catch (err) {
                // ignore storage errors
            }
        }
        handleUpdateOptions({ editor_mode: nextMode });
    };

    const openNodePicker = () => {
        const base =
            window.MagickAD?.previewUrl || window.location.origin;
        let url = base;
        try {
            const next = new URL(base);
            next.searchParams.set('magick_ad_picker', '1');
            next.searchParams.set(
                'magick_ad_picker_origin',
                window.location.origin
            );
            if (window.MagickAD?.pickerNonce) {
                next.searchParams.set(
                    'magick_ad_picker_nonce',
                    window.MagickAD.pickerNonce
                );
            }
            url = next.toString();
        } catch (err) {
            url = base;
        }
        window.open(url, 'magick-ad-picker');
    };

    const buildNodeDebugUrl = () => {
        if (!selectedAd) {
            return '';
        }
        const base =
            window.MagickAD?.previewUrl || window.location.origin;
        let url = base;
        try {
            const next = new URL(base, window.location.origin);
            next.searchParams.set('magick_ad_node_debug', '1');
            next.searchParams.set(
                'magick_ad_node_type',
                selectedAd.options?.node_target_type || 'id'
            );
            next.searchParams.set(
                'magick_ad_node_value',
                selectedAd.options?.node_target_value || ''
            );
            next.searchParams.set(
                'magick_ad_node_match',
                selectedAd.options?.node_match || 'first'
            );
            if (selectedAd.options?.node_match === 'nth') {
                next.searchParams.set(
                    'magick_ad_node_index',
                    String(Number(selectedAd.options?.node_index || 1) || 1)
                );
            }
            if (window.MagickAD?.nodeDebugNonce) {
                next.searchParams.set(
                    'magick_ad_node_debug_nonce',
                    window.MagickAD.nodeDebugNonce
                );
            }
            url = next.toString();
        } catch (err) {
            url = base;
        }
        return url;
    };

    const renderNodePlacement = () => {
        if (!selectedAd) {
            return null;
        }
        if (resolvePlacement(selectedAd.options || {}).hook !== 'node') {
            return null;
        }
        return (
            <div className="magick-ad-node-placement">
                <h4 className="magick-ad-field__label">节点投放</h4>
                <Button variant="secondary" onClick={openNodePicker}>
                    可视化选择
                </Button>
                {debugEnabled &&
                    selectedAd.options?.node_target_value && (
                        <div className="magick-ad-node-debug-actions">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    const url = buildNodeDebugUrl();
                                    if (!url) {
                                        return;
                                    }
                                    if (
                                        navigator.clipboard &&
                                        navigator.clipboard.writeText
                                    ) {
                                        navigator.clipboard
                                            .writeText(url)
                                            .then(() => {
                                                showNotice(
                                                    'success',
                                                    '测试链接已复制',
                                                    2000
                                                );
                                            })
                                            .catch(() => {});
                                        return;
                                    }
                                    const textarea =
                                        document.createElement('textarea');
                                    textarea.value = url;
                                    document.body.appendChild(textarea);
                                    textarea.select();
                                    try {
                                        document.execCommand('copy');
                                        showNotice(
                                            'success',
                                            '测试链接已复制',
                                            2000
                                        );
                                    } catch (err) {}
                                    document.body.removeChild(textarea);
                                }}
                            >
                                复制测试链接
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    const url = buildNodeDebugUrl();
                                    if (!url) {
                                        return;
                                    }
                                    window.open(url, 'magick-ad-node-debug');
                                }}
                            >
                                一键高亮
                            </Button>
                            <p className="magick-ad-node-debug-help">
                                仅在调试模式显示，默认打开站点首页高亮目标节点。
                            </p>
                        </div>
                    )}
                <SelectControl
                    label="定位方式"
                    value={selectedAd.options?.node_target_type || 'id'}
                    options={[
                        { label: 'ID', value: 'id' },
                        { label: 'Class', value: 'class' },
                    ]}
                    onChange={(value) =>
                        handleUpdateOptions({
                            node_target_type: value,
                        })
                    }
                />
                <TextControl
                    label="节点值"
                    value={selectedAd.options?.node_target_value || ''}
                    onChange={(value) =>
                        handleUpdateOptions({
                            node_target_value: value.trim(),
                        })
                    }
                    help="ID 不带 #，Class 不带 ."
                />
                <SelectControl
                    label="插入方式"
                    value={selectedAd.options?.node_insert || 'append'}
                    options={[
                        { label: '插入到节点内部末尾', value: 'append' },
                        { label: '插入到节点内部开头', value: 'prepend' },
                        { label: '插入到节点外部前面', value: 'before' },
                        { label: '插入到节点外部后面', value: 'after' },
                    ]}
                    onChange={(value) =>
                        handleUpdateOptions({
                            node_insert: value,
                        })
                    }
                />
                <SelectControl
                    label="匹配策略"
                    value={selectedAd.options?.node_match || 'first'}
                    options={[
                        { label: '仅第一个匹配', value: 'first' },
                        { label: '第 N 个', value: 'nth' },
                        { label: '全部匹配', value: 'all' },
                    ]}
                    onChange={(value) =>
                        handleUpdateOptions({
                            node_match: value,
                        })
                    }
                    help="Class 可能匹配多个元素，默认仅第一个。"
                />
                {selectedAd.options?.node_match === 'nth' && (
                    <RangeControl
                        label="第 N 个"
                        min={1}
                        max={20}
                        value={Number(selectedAd.options?.node_index || 1) || 1}
                        onChange={(value) =>
                            handleUpdateOptions({
                                node_index: Number(value),
                            })
                        }
                    />
                )}
                <SelectControl
                    label="找不到节点时"
                    value={selectedAd.options?.node_fallback || 'hide'}
                    options={[
                        { label: '隐藏广告', value: 'hide' },
                        { label: '回退到页脚', value: 'footer' },
                    ]}
                    onChange={(value) =>
                        handleUpdateOptions({
                            node_fallback: value,
                        })
                    }
                />
                <ToggleControl
                    label="紧凑模式"
                    checked={selectedAd.options?.node_compact !== false}
                    onChange={(value) =>
                        handleUpdateOptions({
                            node_compact: value,
                        })
                    }
                    help="默认移除广告单元外边距，避免挤压布局。"
                />
            </div>
        );
    };

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin !== window.location.origin) {
                return;
            }
            const data = event.data || {};
            if (data.type !== 'magick-ad-node-picked') {
                return;
            }
            if (!selectedAd) {
                return;
            }
            const nextType = data.targetType || 'id';
            setPickerType(nextType);
            setPickerValue(data.value || '');
            setPickerId(data.id || '');
            setPickerClasses(
                Array.isArray(data.classes) ? data.classes : []
            );
            setPickerLabel(data.label || '');
            setPickerConfirmOpen(true);
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [selectedAd, showNotice]);

    const handleUpdateMeta = (updates) => {
        if (!selectedAd) {
            return;
        }
        updateAdGroup(selectedAd.id, updates);
    };

    const handleUpdateContent = (updates) => {
        if (!selectedAd) {
            return;
        }
        const mergedContent = {
            ...selectedAd.content,
            ...updates,
        };
        const enforced = enforceUsageTypeRules(
            selectedAd.options || {},
            mergedContent
        );
        updateAdGroup(selectedAd.id, {
            options: enforced.options,
            content: enforced.content,
        });
    };

    const handleUpdateImageSettings = (updates) => {
        if (!selectedAd) {
            return;
        }
        const currentSettings =
            selectedAd.content?.image_settings || {};
        handleUpdateContent({
            image_settings: {
                ...currentSettings,
                ...updates,
            },
        });
    };

    const handleUpdateVideoSettings = (updates) => {
        if (!selectedAd) {
            return;
        }
        const currentSettings =
            selectedAd.content?.video_settings || {};
        handleUpdateContent({
            video_settings: {
                ...currentSettings,
                ...updates,
            },
        });
    };

    const handleUpdateBlockSettings = (updates) => {
        if (!selectedAd) {
            return;
        }
        const currentSettings =
            selectedAd.content?.block_settings || {};
        handleUpdateContent({
            block_settings: {
                ...currentSettings,
                ...updates,
            },
        });
    };

    const parseDomainList = (value = '') =>
        value
            .split(/[\s,;]+/)
            .map((item) => item.trim())
            .filter(Boolean);

    const formatDomainList = (list) =>
        Array.isArray(list) ? list.join('\n') : '';

    const extractScriptDomains = (html = '') => {
        if (!html || typeof html !== 'string') {
            return [];
        }
        const baseUrl =
            typeof window !== 'undefined' && window.location
                ? window.location.href
                : 'http://localhost';
        const domains = new Set();
        const addDomain = (src) => {
            if (!src) {
                return;
            }
            try {
                const url = new URL(src, baseUrl);
                if (url.hostname) {
                    domains.add(url.hostname.toLowerCase());
                }
            } catch (err) {
                // ignore invalid URL
            }
        };
        if (typeof DOMParser !== 'undefined') {
            try {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                doc.querySelectorAll('script[src]').forEach((script) => {
                    addDomain(script.getAttribute('src'));
                });
            } catch (err) {
                // ignore parse errors
            }
        } else {
            const matches = html.matchAll(
                /<script[^>]+src=["']([^"']+)["'][^>]*>/gi
            );
            for (const match of matches) {
                addDomain(match[1]);
            }
        }
        return Array.from(domains);
    };

    const updateVariants = (nextVariants) => {
        if (!selectedAd) {
            return;
        }
        handleUpdateContent({
            variants: nextVariants,
        });
    };

    const updateVariant = (index, updates) => {
        if (!selectedAd) {
            return;
        }
        const variants = Array.isArray(selectedAd.content?.variants)
            ? [...selectedAd.content.variants]
            : [];
        if (!variants[index]) {
            return;
        }
        variants[index] = {
            ...variants[index],
            ...updates,
            content: {
                ...(variants[index].content || {}),
                ...(updates.content || {}),
            },
        };
        updateVariants(variants);
    };

    const removeVariant = (index) => {
        if (!selectedAd) {
            return;
        }
        const variants = Array.isArray(selectedAd.content?.variants)
            ? [...selectedAd.content.variants]
            : [];
        variants.splice(index, 1);
        updateVariants(variants);
    };

    const createVariantId = () => {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }
        return `var_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    };

    const addVariant = (type) => {
        if (!selectedAd) {
            return;
        }
        const variants = Array.isArray(selectedAd.content?.variants)
            ? [...selectedAd.content.variants]
            : [];
        const baseContent = {};
        if (type === 'html') {
            baseContent.html = selectedAd.content?.html || '';
        } else if (type === 'image') {
            baseContent.image = selectedAd.content?.image || null;
            baseContent.link = selectedAd.content?.link || '';
            baseContent.link_target = Boolean(
                selectedAd.content?.link_target
            );
        } else if (type === 'video') {
            baseContent.video_url = selectedAd.content?.video_url || '';
        } else if (type === 'block') {
            baseContent.blocks = selectedAd.content?.blocks || '';
        }
        variants.push({
            id: createVariantId(),
            label: `版本 ${variants.length + 1}`,
            weight: 1,
            content: baseContent,
        });
        updateVariants(variants);
    };

    const handleUpdateContainerStyle = (updates) => {
        if (!selectedAd) {
            return;
        }
        const currentStyle =
            selectedAd.content?.container_style || {};
        handleUpdateContent({
            container_style: {
                ...currentStyle,
                ...updates,
            },
        });
    };

    const handleUpdateBehavior = (updates) => {
        if (!selectedAd) {
            return;
        }
        const currentBehavior = selectedAd.content?.behavior || {};
        handleUpdateContent({
            behavior: {
                ...currentBehavior,
                ...updates,
            },
        });
    };

    const formatColorValue = (color) => {
        if (!color) {
            return 'transparent';
        }
        if (typeof color === 'string') {
            return color;
        }
        if (color.rgb) {
            const { r, g, b, a } = color.rgb;
            if (a === 1) {
                return color.hex;
            }
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        }
        return color.hex || 'transparent';
    };

    const renderVariantSection = (type) => {
        if (!selectedAd) {
            return null;
        }
        if (displayLevel === 'simple') {
            return null;
        }
        if (isDecorativeUsage(selectedAd?.options || {})) {
            return (
                <Notice status="info" isDismissible={false}>
                    装饰组件不参与 A/B 版本测试。
                </Notice>
            );
        }
        const variantsEnabled = Boolean(
            selectedAd.content?.variants_enabled
        );
        const variantsStrategy =
            selectedAd.content?.variants_strategy === 'session'
                ? 'session'
                : 'request';
        const variants = Array.isArray(selectedAd.content?.variants)
            ? selectedAd.content.variants
            : [];

        return (
            <div className="magick-ad-variant-section">
                <ToggleControl
                    label="启用 A/B 版本"
                    checked={variantsEnabled}
                    onChange={(value) =>
                        handleUpdateContent({
                            variants_enabled: value,
                        })
                    }
                    help="同一广告可配置多个内容版本，按权重随机展示。"
                />
                {variantsEnabled && (
                    <>
                        <SelectControl
                            label="随机策略"
                            value={variantsStrategy}
                            options={[
                                { label: '按请求随机', value: 'request' },
                                { label: '按会话固定', value: 'session' },
                            ]}
                            onChange={(value) =>
                                handleUpdateContent({
                                    variants_strategy: value,
                                })
                            }
                            help="会话固定可避免刷新闪烁；按请求随机适合快速试验。"
                        />
                        <div className="magick-ad-variant-list">
                            {variants.map((variant, index) => (
                                <div
                                    className="magick-ad-variant-card"
                                    key={variant.id || index}
                                >
                                    <div className="magick-ad-variant-card__head">
                                        <TextControl
                                            label="版本名称"
                                            value={variant.label || ''}
                                            onChange={(value) =>
                                                updateVariant(index, {
                                                    label: value,
                                                })
                                            }
                                        />
                                        <RangeControl
                                            label="权重"
                                            min={1}
                                            max={100}
                                            value={Number(variant.weight || 1)}
                                            onChange={(value) =>
                                                updateVariant(index, {
                                                    weight: Number(value),
                                                })
                                            }
                                        />
                                    </div>
                                    {type === 'html' && (
                                        <TextareaControl
                                            label="HTML 内容"
                                            value={variant.content?.html || ''}
                                            onChange={(value) =>
                                                updateVariant(index, {
                                                    content: {
                                                        html: value,
                                                    },
                                                })
                                            }
                                        />
                                    )}
                                    {type === 'video' && (
                                        <>
                                            <p className="magick-ad-field__label">
                                                视频地址
                                            </p>
                                            <div className="magick-ad-video-input-row">
                                                <TextControl
                                                    value={
                                                        variant.content
                                                            ?.video_url || ''
                                                    }
                                                    onChange={(value) =>
                                                        updateVariant(index, {
                                                            content: {
                                                                video_url:
                                                                    value,
                                                            },
                                                        })
                                                    }
                                                />
                                                <VideoPicker
                                                    value={
                                                        variant.content
                                                            ?.video_url || ''
                                                    }
                                                    onChange={(value) =>
                                                        updateVariant(index, {
                                                            content: {
                                                                video_url:
                                                                    value,
                                                            },
                                                        })
                                                    }
                                                    compact
                                                />
                                            </div>
                                        </>
                                    )}
                                    {type === 'block' && (
                                        <TextareaControl
                                            label="区块内容"
                                            value={
                                                variant.content?.blocks || ''
                                            }
                                            onChange={(value) =>
                                                updateVariant(index, {
                                                    content: {
                                                        blocks: value,
                                                    },
                                                })
                                            }
                                            help="这里填写区块内容（HTML/区块序列化）。样式仍使用主配置。"
                                        />
                                    )}
                                    {type === 'image' && (
                                        <>
                                            <LinkPicker
                                                value={
                                                    variant.content?.link || ''
                                                }
                                                target={
                                                    variant.content
                                                        ?.link_target
                                                }
                                                onChange={({
                                                    url,
                                                    target,
                                                }) =>
                                                    updateVariant(index, {
                                                        content: {
                                                            link: url,
                                                            link_target:
                                                                Boolean(
                                                                    target
                                                                ),
                                                        },
                                                    })
                                                }
                                            />
                                            <div className="magick-ad-field">
                                                <p className="magick-ad-field__label">
                                                    图片
                                                </p>
                                                <ImagePicker
                                                    value={
                                                        variant.content
                                                            ?.image || null
                                                    }
                                                    onChange={(value) =>
                                                        updateVariant(index, {
                                                            content: {
                                                                image: value,
                                                            },
                                                        })
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}
                                    <div className="magick-ad-variant-card__actions">
                                        <Button
                                            variant="tertiary"
                                            isDestructive
                                            onClick={() =>
                                                removeVariant(index)
                                            }
                                        >
                                            移除版本
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <Button
                                variant="secondary"
                                onClick={() => addVariant(type)}
                            >
                                添加版本
                            </Button>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const renderFrequencyControls = (behavior = {}) => {
        if (isDecorativeUsage(selectedAd?.options || {})) {
            return (
                <Notice status="info" isDismissible={false}>
                    装饰组件不参与频控，系统会固定为“不限制”。
                </Notice>
            );
        }
        return (
            <>
            <SelectControl
                label="频控策略"
                value={behavior.frequency_mode || 'none'}
                options={[
                    { label: '不限制', value: 'none' },
                    { label: '每会话一次', value: 'session' },
                    { label: '每天一次', value: 'day' },
                    { label: '最多 N 次', value: 'count' },
                ]}
                onChange={(value) =>
                    handleUpdateBehavior({ frequency_mode: value })
                }
                help="默认不限制。频控仅在前台生效。"
            />
            {behavior.frequency_mode === 'count' && (
                <TextControl
                    label="最多展示次数"
                    type="number"
                    min={1}
                    value={behavior.frequency_limit ?? 1}
                    onChange={(value) =>
                        handleUpdateBehavior({
                            frequency_limit: Math.max(
                                1,
                                Number(value || 1)
                            ),
                        })
                    }
                    />
                )}
            </>
        );
    };

    const getFrequencySummary = (behavior = {}) => {
        const mode = behavior.frequency_mode || 'none';
        if (mode === 'session') {
            return '每会话一次';
        }
        if (mode === 'day') {
            return '每天一次';
        }
        if (mode === 'count') {
            const limit = Math.max(
                1,
                Number(behavior.frequency_limit ?? 1)
            );
            return `最多 ${limit} 次`;
        }
        return '不限制';
    };

    const renderFrequencySummary = (behavior = {}, options = {}) => {
        const { showLink = true } = options;
        const decorative = isDecorativeUsage(selectedAd?.options || {});
        return (
        <div className="magick-ad-right-subsection">
            <div className="magick-ad-right-subsection__title">
                频控摘要
            </div>
            <div className="magick-ad-right-subsection__body">
                <div className="magick-ad-frequency-summary">
                    <span>
                        频控：
                        {decorative
                            ? '装饰组件不参与频控'
                            : getFrequencySummary(behavior)}
                    </span>
                    {showLink && !decorative && (
                        <Button
                            variant="link"
                            onClick={() => setPlacementTab('frequency')}
                        >
                            去设置
                        </Button>
                    )}
                </div>
            </div>
        </div>
        );
    };

    const renderContainerBadgeControls = (containerStyle = {}) => (
        <>
            <ToggleControl
                label="显示角标"
                checked={Boolean(containerStyle.badge_enabled)}
                onChange={(value) =>
                    handleUpdateContainerStyle({
                        badge_enabled: value,
                    })
                }
            />
            {containerStyle.badge_enabled && (
                <>
                    <div className="magick-ad-field">
                        <p className="magick-ad-field__label">角标类型</p>
                        <ButtonGroup>
                            <Button
                                variant="secondary"
                                isPressed={
                                    (containerStyle.badge_type || 'text') ===
                                    'text'
                                }
                                onClick={() =>
                                    handleUpdateContainerStyle({
                                        badge_type: 'text',
                                    })
                                }
                            >
                                文本
                            </Button>
                            <Button
                                variant="secondary"
                                isPressed={
                                    containerStyle.badge_type === 'image'
                                }
                                onClick={() =>
                                    handleUpdateContainerStyle({
                                        badge_type: 'image',
                                    })
                                }
                            >
                                图片
                            </Button>
                        </ButtonGroup>
                    </div>
                    {(containerStyle.badge_type || 'text') === 'text' ? (
                        <>
                            <TextControl
                                label="角标文本"
                                value={containerStyle.badge_text || '广告'}
                                onChange={(value) =>
                                    handleUpdateContainerStyle({
                                        badge_text: value,
                                    })
                                }
                            />
                            <div className="magick-ad-field">
                                <p className="magick-ad-field__label">
                                    角标颜色
                                </p>
                                <ColorPicker
                                    color={
                                        containerStyle.badge_color ||
                                        '#1d2327'
                                    }
                                    onChangeComplete={(value) =>
                                        handleUpdateContainerStyle({
                                            badge_color:
                                                formatColorValue(value),
                                        })
                                    }
                                />
                            </div>
                        </>
                    ) : (
                        <div className="magick-ad-field">
                            <p className="magick-ad-field__label">
                                角标图片
                            </p>
                            <ImagePicker
                                value={containerStyle.badge_image || {}}
                                onChange={(value) =>
                                    handleUpdateContainerStyle({
                                        badge_image: value,
                                        badge_type: 'image',
                                    })
                                }
                            />
                            <p className="magick-ad-field__help">
                                推荐尺寸：56×28 或 64×32（2x）；格式：PNG/SVG（透明背景），建议 ≤ 100KB。
                            </p>
                        </div>
                    )}
                </>
            )}
        </>
    );

    const renderHtmlScriptsAdvanced = () => {
        if (isQuickMode) {
            return (
                <Notice status="info" isDismissible={false}>
                    快速模式已隐藏脚本域名配置，请切换到“设计模式/专家模式”查看。
                </Notice>
            );
        }
        const allowlist = Array.isArray(
            selectedAd?.content?.html_script_allowlist
        )
            ? selectedAd.content?.html_script_allowlist
            : [];
        const blocklist = Array.isArray(
            selectedAd?.content?.html_script_blocklist
        )
            ? selectedAd.content?.html_script_blocklist
            : [];
        const addDomain = (domain, listKey) => {
            const nextAllow =
                listKey === 'allow'
                    ? Array.from(new Set([...allowlist, domain]))
                    : allowlist.filter((item) => item !== domain);
            const nextBlock =
                listKey === 'block'
                    ? Array.from(new Set([...blocklist, domain]))
                    : blocklist.filter((item) => item !== domain);
            handleUpdateContent({
                html_script_allowlist: nextAllow,
                html_script_blocklist: nextBlock,
            });
        };
        return (
            <>
                {detectedScriptDomains?.length > 0 && (
                    <div className="magick-ad-script-domains">
                        <div className="magick-ad-script-domains__title">
                            检测到脚本域名
                        </div>
                        <div className="magick-ad-script-domains__list">
                            {detectedScriptDomains.map((domain) => {
                                const isAllowed = allowlist.includes(domain);
                                const isBlocked = blocklist.includes(domain);
                                return (
                                    <div
                                        key={domain}
                                        className="magick-ad-script-domains__item"
                                    >
                                        <span className="magick-ad-script-domains__domain">
                                            {domain}
                                        </span>
                                        <div className="magick-ad-script-domains__actions">
                                            <Button
                                                variant={
                                                    isAllowed
                                                        ? 'secondary'
                                                        : 'primary'
                                                }
                                                size="small"
                                                disabled={isAllowed}
                                                onClick={() =>
                                                    addDomain(domain, 'allow')
                                                }
                                            >
                                                {isAllowed
                                                    ? '已在白名单'
                                                    : '加入白名单'}
                                            </Button>
                                            <Button
                                                variant={
                                                    isBlocked
                                                        ? 'secondary'
                                                        : 'tertiary'
                                                }
                                                size="small"
                                                disabled={isBlocked}
                                                onClick={() =>
                                                    addDomain(domain, 'block')
                                                }
                                            >
                                                {isBlocked
                                                    ? '已在黑名单'
                                                    : '加入黑名单'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="magick-ad-script-domains__help">
                            系统默认仅允许本站域名。将外部域名加入白名单后，脚本才会保留。
                        </div>
                    </div>
                )}
                <TextareaControl
                    label="脚本白名单（追加域名）"
                    value={formatDomainList(
                        selectedAd?.content?.html_script_allowlist
                    )}
                    onChange={(value) =>
                        handleUpdateContent({
                            html_script_allowlist: parseDomainList(value),
                        })
                    }
                    help="系统默认仅允许当前站点域名，此处为追加白名单。每行一个域名或用逗号分隔。"
                />
                <TextareaControl
                    label="脚本黑名单（追加域名）"
                    value={formatDomainList(
                        selectedAd?.content?.html_script_blocklist
                    )}
                    onChange={(value) =>
                        handleUpdateContent({
                            html_script_blocklist: parseDomainList(value),
                        })
                    }
                    help="系统级黑名单优先生效，此处为追加黑名单。命中即移除。"
                />
            </>
        );
    };

    const applyTemplate = (template) => {
        if (!selectedAd || !template) {
            return;
        }

        const nextOptions = {
            ...selectedAd.options,
            creative_type: template.type,
            usage_type: normalizeUsageType(
                template.usageType || selectedAd.options?.usage_type || 'ad'
            ),
        };

        if (template.containerType) {
            nextOptions.container_type = template.containerType;
            if (template.containerType !== 'inline') {
                nextOptions.placement_hook = 'footer';
                nextOptions.placement_position = '';
                nextOptions.placement_paragraph = 0;
            }
        }

        const containerType =
            nextOptions.container_type || selectedAd.options?.container_type || 'inline';
        const placementHook = nextOptions.placement_hook || '';
        const nextContent = {
            ...selectedAd.content,
            ...(template.data || {}),
            variants_enabled: false,
            variants_strategy: 'request',
            variants: [],
            container_style: buildTemplateContainerStyleDefaults(placementHook),
            behavior: buildTemplateBehaviorDefaults(containerType),
        };
        const enforced = enforceUsageTypeRules(nextOptions, nextContent);

        updateAdGroup(selectedAd.id, {
            options: enforced.options,
            content: enforced.content,
        });
        if (enforced.reasons.length > 0) {
            showNotice(
                'info',
                `已按“装饰组件”规则自动收敛：${enforced.reasons.join('；')}`,
                3200
            );
        }
    };

    const {
        templateModalOpen,
        templateType,
        templateLibrary,
        templateSelection,
        templateCategories,
        favoriteIds,
        pinnedIds,
        fileInputRef,
        setTemplateModalOpen,
        openTemplateLibrary,
        loadTemplateCategories,
        saveTemplate,
        addTemplateCategory,
        removeTemplateCategory,
        updateTemplateCategories,
        toggleFavorite,
        togglePinned,
        bulkFavorite,
        bulkPinned,
        clearFavorites,
        clearPins,
        restorePreferences,
        handleApplyTemplate,
        handleToggleTemplateSelect,
        handleExportTemplates,
        handleImportTemplates,
        handleFileChange,
    } = useTemplateLibrary({
        selectedAd,
        getCreativeTemplateData,
        onApplyTemplate: applyTemplate,
        showNotice,
    });

    const stripHtml = (value) =>
        typeof value === 'string'
            ? value.replace(/<[^>]*>/g, '').trim()
            : '';

    const buildPreviewOptions = (items) => {
        const links = {};
        const options = items.map((item) => {
            const label = stripHtml(item?.title?.rendered) || `ID ${item.id}`;
            links[String(item.id)] = item?.link || '';
            return {
                label,
                value: String(item.id),
            };
        });
        setPreviewOptions(options);
        setPreviewOptionLinks(links);
    };

    useEffect(() => {
        if (previewMode === 'url') {
            setPreviewSearch('');
            setPreviewOptions([]);
            setPreviewOptionLinks({});
            setPreviewSelected('');
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            const endpoint = previewMode === 'page' ? 'pages' : 'posts';
            const params = new URLSearchParams();
            params.set('per_page', '10');
            params.set('_fields', 'id,title,link');
            if (previewSearch.trim()) {
                params.set('search', previewSearch.trim());
            }
            setPreviewLoading(true);
            apiFetch({
                path: `/wp/v2/${endpoint}?${params.toString()}`,
                signal: controller.signal,
            })
                .then((items) => {
                    buildPreviewOptions(Array.isArray(items) ? items : []);
                    setPreviewLoading(false);
                })
                .catch(() => {
                    setPreviewOptions([]);
                    setPreviewOptionLinks({});
                    setPreviewLoading(false);
                });
        }, 250);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [previewMode, previewSearch]);

    useEffect(() => {
        if (previewMode !== 'url') {
            setPreviewSearch('');
            setPreviewSelected('');
        }
    }, [previewMode]);

    useEffect(() => {
        if (
            previewTarget &&
            typeof previewTarget === 'string' &&
            previewTarget.trim().length > 0 &&
            !previewUsePage
        ) {
            setPreviewUsePage(true);
        }
    }, [previewTarget, previewUsePage]);

    const handlePreviewSelect = (value) => {
        setPreviewSelected(value || '');
        if (!value) {
            return;
        }
        const link = previewOptionLinks[value];
        if (link) {
            setPreviewTarget(link);
        }
    };

    const handleSelectAd = (nextId) => {
        if (!nextId || nextId === selectedId) {
            setSwitchConfirmTargetId(null);
            return;
        }
        if (!hasUnsavedChanges) {
            setSwitchConfirmTargetId(null);
            setSelectedId(nextId);
            return;
        }
        if (switchConfirmTargetId !== nextId) {
            setSwitchConfirmTargetId(nextId);
            showNotice(
                'warning',
                '当前广告有未保存改动，再点一次该广告可切换。',
                2600
            );
            return;
        }
        setSwitchConfirmTargetId(null);
        setSelectedId(nextId);
    };

    const handleSave = async () => {
        clearNotice();

        const missingPosition = ads.filter((ad) => {
            const placement = resolvePlacement(ad.options || {});
            if (!placement.hook) {
                return true;
            }
            if (placement.hook === 'content' && !placement.position) {
                return true;
            }
            if (
                placement.hook === 'content' &&
                placement.position === 'paragraph' &&
                placement.paragraph < 1
            ) {
                return true;
            }
            return false;
        });
        if (missingPosition.length > 0) {
            setShowValidation(true);
            showNotice(
                'error',
                `请为 ${missingPosition.length} 个广告选择展示位置。`,
                4000
            );
            return;
        }
        setShowValidation(false);

        const slotFixed = fixDuplicateSlotIds();
        if (slotFixed > 0) {
            showNotice(
                'warning',
                `已自动修复 ${slotFixed} 个重复 Slot，正在继续保存...`,
                2500
            );
        }

        try {
            await saveToDB();
            setLastSavedSignature(buildSaveSignature(ads, slots));
            showNotice('success', '保存成功', 2500);
        } catch (err) {
            const message =
                err?.data?.message ||
                err?.message ||
                '保存失败，请检查网络或权限设置。';
            showNotice('error', message, 4000);
        }
    };

    const handleSaveWithSlotCheck = async () => {
        const slotFixed = fixDuplicateSlotIds();
        if (slotFixed > 0) {
            showNotice(
                'warning',
                `已自动修复 ${slotFixed} 个重复 Slot，正在继续保存...`,
                2500
            );
        }
        const response = await saveToDB();
        setLastSavedSignature(buildSaveSignature(ads, slots));
        return response;
    };

    const openSaveTemplate = async (type) => {
        setSaveTemplateType(type);
        setSaveTemplateName('');
        setSaveTemplateCategory('');
        setSaveTemplateCategoryName('');
        setSaveTemplateOpen(true);
        await loadTemplateCategories();
    };

    const handleConfirmSaveTemplate = async () => {
        const name = saveTemplateName.trim();
        if (!name) {
            showNotice('error', '请输入模板名称', 3000);
            return;
        }
        const containerType = selectedAd?.options?.container_type || 'inline';
        const isNewCategory = saveTemplateCategory === 'new';
        const categoryName = isNewCategory
            ? saveTemplateCategoryName.trim()
            : saveTemplateCategory;
        const category =
            !categoryName || categoryName === 'uncategorized'
                ? ''
                : categoryName;
        if (isNewCategory && !categoryName) {
            showNotice('error', '请输入新分类名称', 3000);
            return;
        }
        try {
            if (isNewCategory && categoryName) {
                await addTemplateCategory(categoryName);
            }
            await saveTemplate(saveTemplateType, name, category, containerType);
            setSaveTemplateOpen(false);
        } catch (err) {
            // keep modal open for retry
        }
    };

    const handleToggleEnabled = async (ad) => {
        const nextEnabled = !(ad?.options?.enabled ?? true);
        const nextStatus = nextEnabled
            ? isFutureDate(ad?.date) || ad?.status === 'future'
                ? 'future'
                : 'publish'
            : 'draft';
        updateAdGroup(ad.id, {
            status: nextStatus,
            options: {
                ...(ad.options || {}),
                enabled: nextEnabled,
            },
        });

        try {
            await saveToDB();
            showNotice(
                'success',
                nextEnabled ? '已启用该广告' : '已停用该广告',
                2000
            );
        } catch (err) {
            const message =
                err?.data?.message ||
                err?.message ||
                '保存失败，请检查网络或权限设置。';
            showNotice('error', message, 4000);
        }
    };

    const normalizedAdSearch = adSearch.trim().toLowerCase();

    const matchesSidebarFilter = (ad) => {
        const runtime = runtimeMeta(ad);
        if (adFilter === 'active') {
            return runtime.code === 'active';
        }
        if (adFilter === 'risk') {
            return runtime.code !== 'active' || missingPositionIds.has(ad.id);
        }
        if (adFilter === 'paused') {
            return ad?.options?.enabled === false;
        }
        return true;
    };

    const matchesSidebarSearch = (ad) => {
        if (!normalizedAdSearch) {
            return true;
        }
        const options = ad?.options || {};
        const usageLabel = getUsageLabel(
            normalizeUsageType(options.usage_type || 'ad')
        );
        const pageLabel =
            options.ad_type === 'targeted'
                ? getOptionLabel(
                      TARGET_TYPE_OPTIONS,
                      options.target_type || '',
                      '指定页面'
                  )
                : getOptionLabel(
                      DISPLAY_PAGE_OPTIONS,
                      options.show_page || 'all',
                      '全站'
                  );
        const haystack = [
            ad?.name || '',
            ad?.id || '',
            usageLabel,
            pageLabel,
            resolvePlacementLabel(options),
        ]
            .join(' ')
            .toLowerCase();
        return haystack.includes(normalizedAdSearch);
    };

    const matchesSidebarTypeView = (ad) => {
        if (adTypeView === 'global') {
            return ad?.options?.ad_type !== 'targeted';
        }
        if (adTypeView === 'targeted') {
            return ad?.options?.ad_type === 'targeted';
        }
        return true;
    };

    const visibleAdIds = useMemo(() => {
        return new Set(
            ads.filter(
                (ad) =>
                    matchesSidebarTypeView(ad) &&
                    matchesSidebarFilter(ad) &&
                    matchesSidebarSearch(ad)
            ).map((ad) => ad.id)
        );
    }, [ads, adFilter, adTypeView, normalizedAdSearch, missingPositionIds]);

    const filteredAdCount = visibleAdIds.size;
    const hasSidebarFilter =
        adFilter !== 'all' ||
        adTypeView !== 'all' ||
        Boolean(normalizedAdSearch);
    const selectedHiddenByFilter = Boolean(
        selectedAd?.id && !visibleAdIds.has(selectedAd.id)
    );

    const filterStats = useMemo(() => {
        const stats = {
            all: ads.length,
            active: 0,
            risk: 0,
            paused: 0,
        };
        ads.forEach((ad) => {
            const runtime = runtimeMeta(ad);
            if (runtime.code === 'active') {
                stats.active += 1;
            }
            if (runtime.code !== 'active' || missingPositionIds.has(ad.id)) {
                stats.risk += 1;
            }
            if (ad?.options?.enabled === false) {
                stats.paused += 1;
            }
        });
        return stats;
    }, [ads, missingPositionIds]);

    const typeStats = useMemo(() => {
        const stats = {
            all: ads.length,
            global: 0,
            targeted: 0,
        };
        ads.forEach((ad) => {
            if (ad?.options?.ad_type === 'targeted') {
                stats.targeted += 1;
                return;
            }
            stats.global += 1;
        });
        return stats;
    }, [ads]);

    const activeFilterCount = Number(adFilter !== 'all') + Number(adTypeView !== 'all');
    const activeFilterLabel = getOptionLabel(
        SIDEBAR_FILTERS,
        adFilter,
        '全部'
    );
    const activeTypeLabel = getOptionLabel(
        SIDEBAR_TYPE_VIEWS,
        adTypeView,
        '全部类型'
    );

    const sidebarSections = useMemo(() => {
        const sections = [
            {
                key: 'global',
                title: '全局广告',
                items: ads.filter((ad) => ad.options?.ad_type !== 'targeted'),
            },
            {
                key: 'targeted',
                title: '指定广告',
                items: ads.filter((ad) => ad.options?.ad_type === 'targeted'),
            },
        ];
        if (adTypeView === 'global') {
            return sections.filter((section) => section.key === 'global');
        }
        if (adTypeView === 'targeted') {
            return sections.filter((section) => section.key === 'targeted');
        }
        return sections;
    }, [ads, adTypeView]);

    const leftSidebar = (
        <div className="magick-ad-left-stack">
            <Card>
                <CardBody>
                    <div className="magick-ad-sidebar__header">
                        <div className="magick-ad-sidebar__title-wrap">
                            <h2 className="magick-ad-sidebar__heading">
                                广告组
                            </h2>
                            <span className="magick-ad-sidebar__total">
                                {hasSidebarFilter
                                    ? `${filteredAdCount}/${ads.length}`
                                    : ads.length}
                            </span>
                        </div>
                        <div className="magick-ad-sidebar__header-actions">
                            <DropdownMenu
                                className="magick-ad-add-menu"
                                icon={null}
                                text="新增"
                                toggleProps={{
                                    variant: 'secondary',
                                    className: 'magick-ad-sidebar__add-btn',
                                }}
                            >
                                {({ onClose }) => (
                                    <MenuGroup>
                                        <MenuItem
                                            onClick={() => {
                                                addAdGroup('global');
                                                onClose();
                                            }}
                                        >
                                            全局广告
                                        </MenuItem>
                                        <MenuItem
                                            onClick={() => {
                                                addAdGroup('targeted');
                                                onClose();
                                            }}
                                        >
                                            指定广告
                                        </MenuItem>
                                    </MenuGroup>
                                )}
                            </DropdownMenu>
                        </div>
                    </div>
                    <div className="magick-ad-sidebar__tools">
                        <TextControl
                            className="magick-ad-sidebar__search"
                            placeholder="搜索名称 / ID / 位置 / 页面规则"
                            value={adSearch}
                            onChange={(value) => setAdSearch(value)}
                        />
                        <div className="magick-ad-sidebar__tool-row">
                            <DropdownMenu
                                className="magick-ad-sidebar__filter-menu"
                                icon={null}
                                text={`筛选：${activeFilterLabel} · ${activeTypeLabel}`}
                                toggleProps={{
                                    variant: 'secondary',
                                    className: 'magick-ad-sidebar__filter-trigger',
                                }}
                            >
                                {({ onClose }) => (
                                    <>
                                        <MenuGroup label="状态">
                                            {SIDEBAR_FILTERS.map((item) => (
                                                <MenuItem
                                                    key={`filter-${item.value}`}
                                                    onClick={() => {
                                                        setAdFilter(item.value);
                                                        onClose();
                                                    }}
                                                >
                                                    {item.label}（
                                                    {filterStats[item.value] || 0}
                                                    ）
                                                    {adFilter === item.value
                                                        ? ' 当前'
                                                        : ''}
                                                </MenuItem>
                                            ))}
                                        </MenuGroup>
                                        <MenuGroup label="类型">
                                            {SIDEBAR_TYPE_VIEWS.map((item) => (
                                                <MenuItem
                                                    key={`type-${item.value}`}
                                                    onClick={() => {
                                                        setAdTypeView(item.value);
                                                        onClose();
                                                    }}
                                                >
                                                    {item.label}（
                                                    {typeStats[item.value] || 0}
                                                    ）
                                                    {adTypeView === item.value
                                                        ? ' 当前'
                                                        : ''}
                                                </MenuItem>
                                            ))}
                                        </MenuGroup>
                                    </>
                                )}
                            </DropdownMenu>
                            {(hasSidebarFilter || selectedHiddenByFilter) && (
                                <Button
                                    variant="tertiary"
                                    className="magick-ad-sidebar__clear-btn"
                                    onClick={() => {
                                        setAdFilter('all');
                                        setAdSearch('');
                                        setAdTypeView('all');
                                    }}
                                >
                                    清空
                                </Button>
                            )}
                        </div>
                        {(hasSidebarFilter || selectedHiddenByFilter) && (
                            <div className="magick-ad-sidebar__tool-meta">
                                <span className="magick-ad-sidebar__tool-tip">
                                    {selectedHiddenByFilter
                                        ? '当前编辑项已被筛选隐藏。'
                                        : '已应用筛选条件。'}
                                </span>
                                {hasSidebarFilter && (
                                    <span className="magick-ad-sidebar__tool-chip">
                                        已筛选 {activeFilterCount} 项
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    {ads.length === 0 ? (
                        <p className="description">暂无广告组。</p>
                    ) : (
                        <nav className="magick-ad-sidebar__list">
                            {sidebarSections.map((section) => (
                                <div
                                    key={section.key}
                                    className="magick-ad-sidebar__section"
                                >
                                    {(() => {
                                        const visibleItems = section.items.filter(
                                            (item) => visibleAdIds.has(item.id)
                                        );
                                        return (
                                            <>
                                    <div className="magick-ad-sidebar__section-title">
                                        {section.title}
                                        <span className="magick-ad-sidebar__section-count">
                                            {hasSidebarFilter
                                                ? `${visibleItems.length}/${section.items.length}`
                                                : section.items.length}
                                        </span>
                                    </div>
                                    {visibleItems.length === 0 ? (
                                        <p className="description magick-ad-sidebar__empty">
                                            {hasSidebarFilter
                                                ? `筛选条件下暂无${section.title}`
                                                : `暂无${section.title}`}
                                        </p>
                                    ) : (
                                        visibleItems.map((ad, index) => {
                                            const status = statusMeta(ad);
                                            const runtime = runtimeMeta(ad);
                                            const options = ad.options || {};
                                            const hasMissingPosition =
                                                missingPositionIds.has(ad.id);
                                            const pageLabel =
                                                options.ad_type === 'targeted' &&
                                                options.target_type
                                                    ? getOptionLabel(
                                                          TARGET_TYPE_OPTIONS,
                                                          options.target_type,
                                                          '指定页面'
                                                      )
                                                    : getOptionLabel(
                                                          DISPLAY_PAGE_OPTIONS,
                                                          options.show_page || 'all',
                                                          '全站'
                                                );

                                            return (
                                                <div
                                                    key={ad.id}
                                                    className={`magick-ad-sidebar__item ${
                                                        selectedId === ad.id
                                                            ? 'is-active'
                                                            : ''
                                                    } ${
                                                        hasMissingPosition
                                                            ? 'has-error'
                                                            : ''
                                                    } ${
                                                        ad?.options?.enabled ===
                                                        false
                                                            ? 'is-disabled'
                                                            : ''
                                                    } ${
                                                        switchConfirmTargetId ===
                                                        ad.id
                                                            ? 'is-switch-confirm'
                                                            : ''
                                                    }`}
                                                >
                                                    <div className="magick-ad-sidebar__body">
                                                        <Button
                                                            variant="tertiary"
                                                            onClick={() =>
                                                                handleSelectAd(
                                                                    ad.id
                                                                )
                                                            }
                                                            aria-current={
                                                                selectedId ===
                                                                ad.id
                                                                    ? 'true'
                                                                    : undefined
                                                            }
                                                            className="magick-ad-sidebar__main"
                                                        >
                                                            <span className="magick-ad-sidebar__title-row">
                                                                <span className="magick-ad-sidebar__title">
                                                                    {ad.name ||
                                                                        `广告组 ${index + 1}`}
                                                                </span>
                                                            </span>
                                                            <span className="magick-ad-sidebar__badges">
                                                                <span
                                                                    className={`magick-ad-sidebar__state ${status.className}`}
                                                                >
                                                                    <span className="magick-ad-sidebar__state-dot" />
                                                                    <span className="magick-ad-sidebar__state-label">
                                                                        {status.label}
                                                                    </span>
                                                                </span>
                                                                {hasMissingPosition && (
                                                                    <span className="magick-ad-sidebar__alert">
                                                                        <span className="magick-ad-sidebar__dot" />
                                                                        需配置位置
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="magick-ad-sidebar__meta-row">
                                                                <span className="magick-ad-sidebar__meta-summary">
                                                                    {runtime.label}{' '}
                                                                    ·{' '}
                                                                    {resolvePlacementLabel(
                                                                        options
                                                                    )}{' '}
                                                                    ·{' '}
                                                                    {pageLabel}
                                                                </span>
                                                            </span>
                                                        </Button>
                                                    </div>
                                                    <div className="magick-ad-sidebar__actions">
                                                        <DropdownMenu
                                                            icon={moreHorizontal}
                                                            label="更多操作"
                                                            className="magick-ad-item-menu"
                                                            toggleProps={{
                                                                variant:
                                                                    'tertiary',
                                                                size: 'small',
                                                                className:
                                                                    'magick-ad-item-menu__toggle',
                                                            }}
                                                        >
                                                            {({ onClose }) => (
                                                                <MenuGroup>
                                                                    <MenuItem
                                                                        onClick={() => {
                                                                            setRenameTarget(
                                                                                ad
                                                                            );
                                                                            setRenameValue(
                                                                                ad.name ||
                                                                                    ''
                                                                            );
                                                                            onClose();
                                                                        }}
                                                                    >
                                                                        修改名称
                                                                    </MenuItem>
                                                                    <MenuItem
                                                                        onClick={() => {
                                                                            handleToggleEnabled(
                                                                                ad
                                                                            );
                                                                            onClose();
                                                                        }}
                                                                    >
                                                                        {ad
                                                                            ?.options
                                                                            ?.enabled ===
                                                                        false
                                                                            ? '设为启用'
                                                                            : '设为停用'}
                                                                    </MenuItem>
                                                                    <MenuItem
                                                                        isDestructive
                                                                        onClick={() => {
                                                                            setDeleteTarget(
                                                                                ad
                                                                            );
                                                                            onClose();
                                                                        }}
                                                                    >
                                                                        删除
                                                                    </MenuItem>
                                                                </MenuGroup>
                                                            )}
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                            </>
                                        );
                                    })()}
                                </div>
                            ))}
                        </nav>
                    )}
                    <div className="magick-ad-sidebar__slots">
                        <SlotsPanel
                            embedded
                            slots={slots}
                            ads={ads}
                            onAddSlot={addSlot}
                            onUpdateSlot={updateSlot}
                            onRemoveSlot={removeSlot}
                            onNotice={showNotice}
                        />
                    </div>
                </CardBody>
            </Card>
        </div>
    );

    const activeCreativeType =
        selectedAd?.options?.creative_type || 'image';
    const isBlockEditorEnabled = Boolean(
        systemSettings.block_editor_enabled
    );
    const detectedScriptDomains = useMemo(() => {
        if (!selectedAd) {
            return [];
        }
        const html = `${selectedAd.content?.html || ''}\n${
            selectedAd.content?.custom_html || ''
        }`;
        return extractScriptDomains(html);
    }, [selectedAd?.content?.html, selectedAd?.content?.custom_html]);
    const creativeTabs = [
        { name: 'html', title: '代码/HTML' },
        { name: 'image', title: '图片' },
        { name: 'video', title: '视频' },
        ...(displayLevel !== 'simple' && isBlockEditorEnabled
            ? [{ name: 'block', title: '可视化设计' }]
            : []),
    ];
    const allowedCreativeTypes = new Set(
        creativeTabs.map((tab) => tab.name)
    );
    const resolvedCreativeType = allowedCreativeTypes.has(
        activeCreativeType
    )
        ? activeCreativeType
        : creativeTabs[0]?.name || 'image';
    const htmlSettingsTabResolved = ['mode', 'custom', 'runtime'].includes(
        htmlSettingsTab
    )
        ? htmlSettingsTab
        : 'mode';

    const contentPanels = selectedAd ? (
        <TabPanel
            className="magick-ad-sub-tabs"
            tabs={creativeTabs}
            initialTabName={resolvedCreativeType}
            key={selectedAd?.id || 'content'}
            onSelect={(name) =>
                handleUpdateOptions({
                    creative_type: name,
                })
            }
        >
            {() => {
                const activeContentType = resolvedCreativeType;

                const blockEditorHidden =
                    !isBlockEditorEnabled &&
                    selectedAd?.options?.creative_type === 'block';
                return (
                    <>
                        {blockEditorHidden && (
                            <Notice status="warning" isDismissible={false}>
                                当前广告使用“可视化设计（实验）”，该功能已在系统设置中关闭。
                                如需编辑，请在“系统与调试设置 → 实验与高级”中开启。
                            </Notice>
                        )}
                        <div
                            className={`magick-ad-tab-panel ${
                                activeContentType === 'image'
                                    ? ''
                                    : 'is-hidden'
                            }`}
                        >
                            <Panel>
                                <PanelBody
                                    title="图片编辑"
                                    opened={contentPanelOpenState.image}
                                    onToggle={() =>
                                        toggleContentPanelOpen('image')
                                    }
                                >
                                    <TabPanel
                                        className="magick-ad-image-tabs"
                                        tabs={[
                                            { name: 'content', title: '内容' },
                                            { name: 'settings', title: '配置' },
                                        ]}
                                        initialTabName={imageTab}
                                        onSelect={(name) =>
                                            setImageTab(name)
                                        }
                                        key={imageTab}
                                    >
                                        {(imageTabView) =>
                                            imageTabView.name === 'content' ? (
                                                <>
                                                    <LinkPicker
                                                        value={
                                                            selectedAd.content
                                                                ?.link || ''
                                                        }
                                                        target={
                                                            selectedAd.content
                                                                ?.link_target
                                                        }
                                                        onChange={({
                                                            url,
                                                            target,
                                                        }) =>
                                                            handleUpdateContent({
                                                                link: url,
                                                                link_target:
                                                                    Boolean(
                                                                        target
                                                                    ),
                                                            })
                                                        }
                                                    />
                                                    <div className="magick-ad-field">
                                                        <p className="magick-ad-field__label">
                                                            图片
                                                        </p>
                                                        <ImagePicker
                                                            value={
                                                                selectedAd.content
                                                                    ?.image ||
                                                                null
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateContent(
                                                                    {
                                                                        image: value,
                                                                    }
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    {renderVariantSection(
                                                        'image'
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <Notice status="info" isDismissible={false}>
                                                        图片配置仅影响图片本体（img）。容器背景、内边距、
                                                        阴影等请在右侧“容器外观”中设置。
                                                    </Notice>
                                                    <div className="magick-ad-field">
                                                        <p className="magick-ad-field__label">
                                                            水印
                                                        </p>
                                                        <p className="description">
                                                            水印将显示在图片中的右下角，默认隐藏水印。
                                                        </p>
                                                        <ToggleControl
                                                            label={
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.watermark
                                                                    ? '显示'
                                                                    : '隐藏'
                                                            }
                                                            checked={Boolean(
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.watermark
                                                            )}
                                                            onChange={(value) =>
                                                                handleUpdateImageSettings(
                                                                    {
                                                                        watermark:
                                                                            value,
                                                                    }
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="magick-ad-image-grid">
                                                        <TextControl
                                                            label="图片圆角"
                                                            type="number"
                                                            min={0}
                                                            value={
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.radius ??
                                                                0
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateImageSettings(
                                                                    {
                                                                        radius:
                                                                            Number(
                                                                                value
                                                                            ),
                                                                    }
                                                                )
                                                            }
                                                            help="像素"
                                                        />
                                                        <TextControl
                                                            label="图片最大宽度"
                                                            type="number"
                                                            min={0}
                                                            value={
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.max_width ??
                                                                1200
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateImageSettings(
                                                                    {
                                                                        max_width:
                                                                            Number(
                                                                                value
                                                                            ),
                                                                    }
                                                                )
                                                            }
                                                            help="像素"
                                                        />
                                                        <TextControl
                                                            label="图片距离顶部"
                                                            type="number"
                                                            min={0}
                                                            value={
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.margin_top ??
                                                                0
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateImageSettings(
                                                                    {
                                                                        margin_top:
                                                                            Number(
                                                                                value
                                                                            ),
                                                                    }
                                                                )
                                                            }
                                                            help="像素"
                                                        />
                                                        <TextControl
                                                            label="图片距离底部"
                                                            type="number"
                                                            min={0}
                                                            value={
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.margin_bottom ??
                                                                0
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateImageSettings(
                                                                    {
                                                                        margin_bottom:
                                                                            Number(
                                                                                value
                                                                            ),
                                                                    }
                                                                )
                                                            }
                                                            help="像素"
                                                        />
                                                        <TextControl
                                                            label="图片距离左边"
                                                            type="number"
                                                            min={0}
                                                            value={
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.margin_left ??
                                                                0
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateImageSettings(
                                                                    {
                                                                        margin_left:
                                                                            Number(
                                                                                value
                                                                            ),
                                                                    }
                                                                )
                                                            }
                                                            help="像素"
                                                        />
                                                        <TextControl
                                                            label="图片距离右边"
                                                            type="number"
                                                            min={0}
                                                            value={
                                                                selectedAd.content
                                                                    ?.image_settings
                                                                    ?.margin_right ??
                                                                0
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateImageSettings(
                                                                    {
                                                                        margin_right:
                                                                            Number(
                                                                                value
                                                                            ),
                                                                    }
                                                                )
                                                            }
                                                            help="像素"
                                                        />
                                                    </div>
                                                </>
                                            )
                                        }
                                    </TabPanel>
                                </PanelBody>
                            </Panel>
                        </div>

                        <div
                            className={`magick-ad-tab-panel ${
                                activeContentType === 'html'
                                    ? ''
                                    : 'is-hidden'
                            }`}
                        >
                            <Panel>
                                <PanelBody
                                    title="HTML 编辑"
                                    opened={contentPanelOpenState.html}
                                    onToggle={() =>
                                        toggleContentPanelOpen('html')
                                    }
                                >
                                    <TabPanel
                                        className="magick-ad-html-tabs"
                                        tabs={[
                                            { name: 'content', title: '内容' },
                                            { name: 'settings', title: '配置' },
                                        ]}
                                        initialTabName={htmlTab}
                                        onSelect={(name) => setHtmlTab(name)}
                                    >
                                        {() => (
                                            <>
                                                <div
                                                    className={`magick-ad-html-tab ${
                                                        htmlTab === 'content'
                                                            ? ''
                                                            : 'is-hidden'
                                                    }`}
                                                >
                                                    <ClassicEditor
                                                        value={
                                                            selectedAd.content
                                                                ?.html || ''
                                                        }
                                                        active={
                                                            activeContentType ===
                                                            'html'
                                                        }
                                                        onChange={(value) =>
                                                            handleUpdateContent({
                                                                html: value,
                                                            })
                                                        }
                                                    />
                                                    {renderVariantSection(
                                                        'html'
                                                    )}
                                                </div>
                                                <div
                                                    className={`magick-ad-html-tab ${
                                                        htmlTab === 'settings'
                                                            ? ''
                                                            : 'is-hidden'
                                                    }`}
                                                >
                                                    <TabPanel
                                                        className="magick-ad-html-settings-tabs"
                                                        tabs={[
                                                            {
                                                                name: 'mode',
                                                                title:
                                                                    '模式/安全',
                                                            },
                                                            {
                                                                name: 'custom',
                                                                title: '自定义',
                                                            },
                                                            {
                                                                name: 'runtime',
                                                                title:
                                                                    '加载/变量',
                                                            },
                                                        ]}
                                                        initialTabName={
                                                            htmlSettingsTabResolved
                                                        }
                                                        onSelect={(name) =>
                                                            setHtmlSettingsTab(
                                                                name
                                                            )
                                                        }
                                                        key={htmlSettingsTabResolved}
                                                    >
                                                        {(settingsTabView) => {
                                                        if (
                                                            settingsTabView.name ===
                                                            'mode'
                                                        ) {
                                                            return (
                                                                <>
                                                                    {isExpertMode ? (
                                                                        <SelectControl
                                                                            label="HTML 模式"
                                                                            value={
                                                                                selectedAd
                                                                                    .options
                                                                                    ?.html_mode ||
                                                                                'safe'
                                                                            }
                                                                            options={[
                                                                                {
                                                                                    label:
                                                                                        '安全模式（默认，过滤脚本）',
                                                                                    value: 'safe',
                                                                                },
                                                                                {
                                                                                    label:
                                                                                        '完全模式（允许脚本）',
                                                                                    value: 'full',
                                                                                },
                                                                            ]}
                                                                            onChange={(
                                                                                value
                                                                            ) => {
                                                                                if (
                                                                                    value ===
                                                                                        'full' &&
                                                                                    !canUnfilteredHtml
                                                                                ) {
                                                                                    showNotice(
                                                                                        'error',
                                                                                        '当前账号无 unfiltered_html 权限，无法启用完全模式。',
                                                                                        3500
                                                                                    );
                                                                                    handleUpdateOptions(
                                                                                        {
                                                                                            html_mode:
                                                                                                'safe',
                                                                                        }
                                                                                    );
                                                                                    return;
                                                                                }
                                                                                handleUpdateOptions(
                                                                                    {
                                                                                        html_mode:
                                                                                            value,
                                                                                    }
                                                                                );
                                                                            }}
                                                                            help="安全模式会过滤脚本/iframe；需要第三方脚本或 head 投放请切换完全模式（多站点强制安全）。"
                                                                        />
                                                                    ) : !isQuickMode ? (
                                                                        <Notice
                                                                            status="info"
                                                                            isDismissible={
                                                                                false
                                                                            }
                                                                        >
                                                                            当前是“设计模式”：HTML
                                                                            强制使用“安全模式（过滤脚本）”。
                                                                            如需启用脚本，请切换到“专家模式”。
                                                                        </Notice>
                                                                    ) : null}
                                                                    {selectedAd.options
                                                                        ?.html_mode ===
                                                                        'full' && (
                                                                        <Notice
                                                                            status="error"
                                                                            isDismissible={
                                                                                false
                                                                            }
                                                                        >
                                                                            完全模式会执行第三方脚本与内联代码，存在安全风险。请仅使用可信来源，并结合脚本白名单/沙箱策略。
                                                                        </Notice>
                                                                    )}
                                                                    {selectedAd.options
                                                                        ?.html_mode ===
                                                                        'safe' &&
                                                                        /<script[\s>]/i.test(
                                                                            selectedAd
                                                                                .content
                                                                                ?.html ||
                                                                                ''
                                                                        ) && (
                                                                            <Notice
                                                                                status="warning"
                                                                                isDismissible={
                                                                                    false
                                                                                }
                                                                            >
                                                                                检测到{' '}
                                                                                <code>
                                                                                    &lt;script&gt;
                                                                                </code>{' '}
                                                                                标签。安全模式会移除脚本，请切换到“完全模式”并确保账号具备权限。
                                                                            </Notice>
                                                                        )}
                                                                    {selectedAd.options
                                                                        ?.html_mode ===
                                                                        'full' &&
                                                                        !canUnfilteredHtml && (
                                                                            <Notice
                                                                                status="error"
                                                                                isDismissible={
                                                                                    false
                                                                                }
                                                                            >
                                                                                当前账号无 unfiltered_html 权限，脚本会被过滤并自动回退到安全模式。
                                                                            </Notice>
                                                                        )}
                                                                    <SelectControl
                                                                        label="iframe 沙箱"
                                                                        value={
                                                                            selectedAd
                                                                                .options
                                                                                ?.html_sandbox ||
                                                                            'inherit'
                                                                        }
                                                                        options={[
                                                                            {
                                                                                label:
                                                                                    '跟随系统设置',
                                                                                value: 'inherit',
                                                                            },
                                                                            {
                                                                                label:
                                                                                    '强制启用',
                                                                                value: 'enable',
                                                                            },
                                                                            {
                                                                                label:
                                                                                    '强制关闭',
                                                                                value: 'disable',
                                                                            },
                                                                        ]}
                                                                        onChange={(value) =>
                                                                            handleUpdateOptions(
                                                                                {
                                                                                    html_sandbox:
                                                                                        value,
                                                                                }
                                                                            )
                                                                        }
                                                                        help="仅对 HTML 完全模式生效；系统级开关在“系统设置”中。"
                                                                    />
                                                                    {!isQuickMode && (
                                                                        <Notice
                                                                            status="info"
                                                                            isDismissible={
                                                                                false
                                                                            }
                                                                        >
                                                                            沙箱只对“完全模式”生效：启用后 HTML 会在 iframe 中运行；关闭将直接执行页面脚本。
                                                                        </Notice>
                                                                    )}
                                                                </>
                                                            );
                                                        }
                                                        if (
                                                            settingsTabView.name ===
                                                            'custom'
                                                        ) {
                                                            return (
                                                                <>
                                                                    <TextareaControl
                                                                        label="附加 HTML（可选）"
                                                                        value={
                                                                            selectedAd
                                                                                .content
                                                                                ?.custom_html ||
                                                                            ''
                                                                        }
                                                                        onChange={(value) =>
                                                                            handleUpdateContent(
                                                                                {
                                                                                    custom_html:
                                                                                        value,
                                                                                }
                                                                            )
                                                                        }
                                                                        help="会追加在广告内容后面。"
                                                                    />
                                                                    <TextareaControl
                                                                        label="自定义 CSS（可选）"
                                                                        value={
                                                                            selectedAd
                                                                                .content
                                                                                ?.custom_css ||
                                                                            ''
                                                                        }
                                                                        onChange={(value) =>
                                                                            handleUpdateContent(
                                                                                {
                                                                                    custom_css:
                                                                                        value,
                                                                                }
                                                                            )
                                                                        }
                                                                        help="无需写 <style> 标签，系统会自动包裹。"
                                                                    />
                                                                    {isExpertMode ? (
                                                                        <TextareaControl
                                                                            label="自定义 JS（可选）"
                                                                            value={
                                                                                selectedAd
                                                                                    .content
                                                                                    ?.custom_js ||
                                                                                ''
                                                                            }
                                                                            onChange={(value) =>
                                                                                handleUpdateContent(
                                                                                    {
                                                                                        custom_js:
                                                                                            value,
                                                                                    }
                                                                                )
                                                                            }
                                                                            help="仅专家模式可用，系统会自动包裹 <script>。"
                                                                        />
                                                                    ) : null}
                                                                </>
                                                            );
                                                        }
                                                        if (
                                                            settingsTabView.name ===
                                                            'runtime'
                                                        ) {
                                                            return (
                                                                <>
                                                                    <ToggleControl
                                                                        label="启用变量替换"
                                                                        checked={
                                                                            selectedAd
                                                                                .content
                                                                                ?.html_runtime_vars !==
                                                                            false
                                                                        }
                                                                        onChange={(value) =>
                                                                            handleUpdateContent(
                                                                                {
                                                                                    html_runtime_vars:
                                                                                        value,
                                                                                }
                                                                            )
                                                                        }
                                                                        help="支持 {site_url} / {page_url} / {ad_id}"
                                                                    />
                                                                    <SelectControl
                                                                        label="载入方式"
                                                                        value={
                                                                            selectedAd
                                                                                .content
                                                                                ?.html_load_strategy ||
                                                                            'immediate'
                                                                        }
                                                                        options={[
                                                                            {
                                                                                label:
                                                                                    '立即加载',
                                                                                value: 'immediate',
                                                                            },
                                                                            {
                                                                                label:
                                                                                    '延迟加载',
                                                                                value: 'delay',
                                                                            },
                                                                            {
                                                                                label:
                                                                                    '视窗内加载',
                                                                                value: 'viewport',
                                                                            },
                                                                        ]}
                                                                        onChange={(value) =>
                                                                            handleUpdateContent(
                                                                                {
                                                                                    html_load_strategy:
                                                                                        value,
                                                                                }
                                                                            )
                                                                        }
                                                                        help="延迟与视窗内加载可减少首屏压力。"
                                                                    />
                                                                    {selectedAd
                                                                        .content
                                                                        ?.html_load_strategy ===
                                                                        'delay' && (
                                                                        <TextControl
                                                                            label="延迟时间（毫秒）"
                                                                            type="number"
                                                                            min={0}
                                                                            value={
                                                                                selectedAd
                                                                                    .content
                                                                                    ?.html_load_delay ??
                                                                                0
                                                                            }
                                                                            onChange={(value) =>
                                                                                handleUpdateContent(
                                                                                    {
                                                                                        html_load_delay:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                    )}
                                                                </>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                    </TabPanel>
                                                    <Panel className="magick-ad-right-inline-panel">
                                                        <PanelBody
                                                            title="脚本域名（高级）"
                                                            opened={htmlScriptsAdvancedOpen}
                                                            onToggle={() =>
                                                                setHtmlScriptsAdvancedOpen((prev) => !prev)
                                                            }
                                                        >
                                                            <p className="magick-ad-right-inline-note">
                                                                脚本域名白名单/黑名单属于低频项，仅在接入第三方脚本时需要调整。
                                                            </p>
                                                            {renderHtmlScriptsAdvanced()}
                                                        </PanelBody>
                                                    </Panel>
                                                </div>
                                            </>
                                        )}
                                    </TabPanel>
                                </PanelBody>
                            </Panel>
                        </div>

                        {activeContentType === 'video' && (
                            <Panel>
                                <PanelBody
                                    title="视频编辑"
                                    opened={contentPanelOpenState.video}
                                    onToggle={() =>
                                        toggleContentPanelOpen('video')
                                    }
                                >
                                    <TabPanel
                                        className="magick-ad-video-tabs"
                                        tabs={[
                                            { name: 'content', title: '内容' },
                                            { name: 'settings', title: '配置' },
                                        ]}
                                        initialTabName={videoTab}
                                        onSelect={(name) =>
                                            setVideoTab(name)
                                        }
                                        key={videoTab}
                                    >
                                        {(videoTabView) => {
                                            const videoSettings =
                                                selectedAd.content
                                                    ?.video_settings || {};
                                            const isEmbed =
                                                videoSettings.type === 'embed';
                                            return videoTabView.name ===
                                                'content' ? (
                                                <>
                                                    <div className="magick-ad-video-input">
                                                        <p className="magick-ad-field__label">
                                                            {isEmbed
                                                                ? '嵌入地址'
                                                                : '视频地址'}
                                                        </p>
                                                        <div className="magick-ad-video-input-row">
                                                            <TextControl
                                                                value={
                                                                    selectedAd
                                                                        .content
                                                                        ?.video_url ||
                                                                    ''
                                                                }
                                                                onChange={(
                                                                    value
                                                                ) =>
                                                                    handleUpdateContent(
                                                                        {
                                                                            video_url:
                                                                                value,
                                                                        }
                                                                    )
                                                                }
                                                            />
                                                            {!isEmbed && (
                                                                <VideoPicker
                                                                    value={
                                                                        selectedAd
                                                                            .content
                                                                            ?.video_url ||
                                                                        ''
                                                                    }
                                                                    onChange={(
                                                                        value
                                                                    ) =>
                                                                        handleUpdateContent(
                                                                            {
                                                                                video_url:
                                                                                    value,
                                                                            }
                                                                        )
                                                                    }
                                                                    compact
                                                                />
                                                            )}
                                                        </div>
                                                        <p className="magick-ad-field__help">
                                                            {isEmbed
                                                                ? '支持 YouTube/Bilibili 等嵌入链接'
                                                                : '支持 MP4 链接'}
                                                        </p>
                                                    </div>
                                                    {!isEmbed &&
                                                        selectedAd.content
                                                            ?.video_url && (
                                                            <div className="magick-ad-video-preview">
                                                                <video
                                                                    src={
                                                                        selectedAd
                                                                            .content
                                                                            ?.video_url ||
                                                                        ''
                                                                    }
                                                                    controls
                                                                />
                                                            </div>
                                                        )}
                                                    {renderVariantSection(
                                                        'video'
                                                    )}
                                                </>
                                            ) : (
                                                <Panel className="magick-ad-video-settings-panel">
                                                    <PanelBody title="核心视频设置" initialOpen>
                                                        <SelectControl
                                                            label="视频类型"
                                                            value={
                                                                videoSettings.type ||
                                                                'mp4'
                                                            }
                                                            options={[
                                                                {
                                                                    label: 'MP4',
                                                                    value: 'mp4',
                                                                },
                                                                {
                                                                    label: '嵌入（iframe）',
                                                                    value: 'embed',
                                                                },
                                                            ]}
                                                            onChange={(value) =>
                                                                handleUpdateVideoSettings(
                                                                    {
                                                                        type: value,
                                                                    }
                                                                )
                                                            }
                                                        />
                                                        <SelectControl
                                                            label="比例"
                                                            value={
                                                                videoSettings.aspect_ratio ||
                                                                '16:9'
                                                            }
                                                            options={[
                                                                {
                                                                    label: '自适应',
                                                                    value: 'auto',
                                                                },
                                                                {
                                                                    label: '16:9',
                                                                    value: '16:9',
                                                                },
                                                                {
                                                                    label: '4:3',
                                                                    value: '4:3',
                                                                },
                                                                {
                                                                    label: '1:1',
                                                                    value: '1:1',
                                                                },
                                                                {
                                                                    label: '9:16',
                                                                    value: '9:16',
                                                                },
                                                                {
                                                                    label: '自定义',
                                                                    value: 'custom',
                                                                },
                                                            ]}
                                                            onChange={(value) =>
                                                                handleUpdateVideoSettings(
                                                                    {
                                                                        aspect_ratio:
                                                                            value,
                                                                    }
                                                                )
                                                            }
                                                        />
                                                        {videoSettings.aspect_ratio ===
                                                            'custom' && (
                                                            <TextControl
                                                                label="自定义比例（如 3:2）"
                                                                value={
                                                                    videoSettings.aspect_ratio_custom ||
                                                                    ''
                                                                }
                                                                onChange={(value) =>
                                                                    handleUpdateVideoSettings(
                                                                        {
                                                                            aspect_ratio_custom:
                                                                                value,
                                                                        }
                                                                    )
                                                                }
                                                                help="格式如 3:2、21:9。"
                                                            />
                                                        )}
                                                        {isEmbed ? (
                                                            <Notice
                                                                status="info"
                                                                isDismissible={
                                                                    false
                                                                }
                                                            >
                                                                嵌入视频由第三方播放器控制，封面设置不可用。
                                                            </Notice>
                                                        ) : (
                                                            <>
                                                                <SelectControl
                                                                    label="封面策略"
                                                                    value={
                                                                        videoSettings.poster_mode ||
                                                                        'manual'
                                                                    }
                                                                    options={[
                                                                        {
                                                                            label: '使用封面图',
                                                                            value: 'manual',
                                                                        },
                                                                        {
                                                                            label: '无封面时取首帧',
                                                                            value: 'auto',
                                                                        },
                                                                    ]}
                                                                    onChange={(value) =>
                                                                        handleUpdateVideoSettings(
                                                                            {
                                                                                poster_mode:
                                                                                    value,
                                                                            }
                                                                        )
                                                                    }
                                                                />
                                                                {videoSettings.poster_mode !==
                                                                    'auto' && (
                                                                    <div className="magick-ad-field">
                                                                        <p className="magick-ad-field__label">
                                                                            封面图
                                                                        </p>
                                                                        <ImagePicker
                                                                            value={
                                                                                videoSettings.poster ||
                                                                                {}
                                                                            }
                                                                            onChange={(value) =>
                                                                                handleUpdateVideoSettings(
                                                                                    {
                                                                                        poster:
                                                                                            value,
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </PanelBody>
                                                    <PanelBody
                                                        title="高级视频设置"
                                                        opened={videoSettingsAdvancedOpen}
                                                        onToggle={() =>
                                                            setVideoSettingsAdvancedOpen((prev) => !prev)
                                                        }
                                                    >
                                                        <SelectControl
                                                            label="预加载"
                                                            value={
                                                                videoSettings.preload ||
                                                                'metadata'
                                                            }
                                                            options={[
                                                                {
                                                                    label: 'metadata',
                                                                    value: 'metadata',
                                                                },
                                                                {
                                                                    label: 'auto',
                                                                    value: 'auto',
                                                                },
                                                                {
                                                                    label: 'none',
                                                                    value: 'none',
                                                                },
                                                            ]}
                                                            onChange={(value) =>
                                                                handleUpdateVideoSettings(
                                                                    {
                                                                        preload:
                                                                            value,
                                                                    }
                                                                )
                                                            }
                                                        />
                                                        <div className="magick-ad-image-grid">
                                                            <ToggleControl
                                                                label="自动播放"
                                                                checked={Boolean(
                                                                    videoSettings.autoplay
                                                                )}
                                                                onChange={(value) =>
                                                                    handleUpdateVideoSettings(
                                                                        {
                                                                            autoplay:
                                                                                value,
                                                                            muted:
                                                                                value
                                                                                    ? true
                                                                                    : Boolean(
                                                                                          videoSettings.muted
                                                                                      ),
                                                                        }
                                                                    )
                                                                }
                                                                help="自动播放通常需要静音。"
                                                            />
                                                            <ToggleControl
                                                                label="首次展示自动播放"
                                                                checked={Boolean(
                                                                    videoSettings.autoplay_first
                                                                )}
                                                                onChange={(value) =>
                                                                    handleUpdateVideoSettings(
                                                                        {
                                                                            autoplay_first:
                                                                                value,
                                                                        }
                                                                    )
                                                                }
                                                                help="仅首次展示时尝试自动播放（会强制静音）。"
                                                            />
                                                            <ToggleControl
                                                                label="静音"
                                                                checked={Boolean(
                                                                    videoSettings.muted
                                                                )}
                                                                onChange={(value) =>
                                                                    handleUpdateVideoSettings(
                                                                        {
                                                                            muted:
                                                                                value,
                                                                        }
                                                                    )
                                                                }
                                                            />
                                                            <ToggleControl
                                                                label="二次展示强制静音"
                                                                checked={Boolean(
                                                                    videoSettings.repeat_muted
                                                                )}
                                                                onChange={(value) =>
                                                                    handleUpdateVideoSettings(
                                                                        {
                                                                            repeat_muted:
                                                                                value,
                                                                        }
                                                                    )
                                                                }
                                                            />
                                                            <ToggleControl
                                                                label="循环"
                                                                checked={Boolean(
                                                                    videoSettings.loop
                                                                )}
                                                                onChange={(value) =>
                                                                    handleUpdateVideoSettings(
                                                                        {
                                                                            loop:
                                                                                value,
                                                                        }
                                                                    )
                                                                }
                                                            />
                                                            <ToggleControl
                                                                label="显示控制条"
                                                                checked={
                                                                    videoSettings.controls !==
                                                                    false
                                                                }
                                                                onChange={(value) =>
                                                                    handleUpdateVideoSettings(
                                                                        {
                                                                            controls:
                                                                                value,
                                                                        }
                                                                    )
                                                                }
                                                            />
                                                            <ToggleControl
                                                                label="移动端内嵌播放"
                                                                checked={
                                                                    videoSettings.playsinline !==
                                                                    false
                                                                }
                                                                onChange={(value) =>
                                                                    handleUpdateVideoSettings(
                                                                        {
                                                                            playsinline:
                                                                                value,
                                                                        }
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <ToggleControl
                                                            label="追踪播放/暂停/完成"
                                                            checked={Boolean(
                                                                videoSettings.track_events
                                                            )}
                                                            onChange={(value) =>
                                                                handleUpdateVideoSettings(
                                                                    {
                                                                        track_events:
                                                                            value,
                                                                    }
                                                                )
                                                            }
                                                            disabled={isDecorativeUsage(
                                                                selectedAd?.options || {}
                                                            )}
                                                            help={
                                                                isDecorativeUsage(
                                                                    selectedAd?.options || {}
                                                                )
                                                                    ? '装饰组件不参与统计，已禁用。'
                                                                    : '会向统计接口上报播放事件。'
                                                            }
                                                        />
                                                        <TextControl
                                                            label="备用提示文案"
                                                            value={
                                                                videoSettings.fallback_text ||
                                                                ''
                                                            }
                                                            onChange={(value) =>
                                                                handleUpdateVideoSettings(
                                                                    {
                                                                        fallback_text:
                                                                            value,
                                                                    }
                                                                )
                                                            }
                                                            help="浏览器不支持视频时显示。"
                                                        />
                                                    </PanelBody>
                                                </Panel>
                                            );
                                        }}
                                    </TabPanel>
                                </PanelBody>
                            </Panel>
                        )}

                        {activeContentType === 'block' && (
                            <Panel>
                                <PanelBody
                                    title="可视化编辑"
                                    opened={contentPanelOpenState.block}
                                    onToggle={() =>
                                        toggleContentPanelOpen('block')
                                    }
                                >
                                    <TabPanel
                                        className="magick-ad-block-tabs"
                                        tabs={[
                                            { name: 'content', title: '内容' },
                                            { name: 'settings', title: '配置' },
                                        ]}
                                        initialTabName={blockTab}
                                        onSelect={(name) =>
                                            setBlockTab(name)
                                        }
                                        key={blockTab}
                                    >
                                        {(blockTabView) => {
                                            const blockSettings =
                                                selectedAd.content
                                                    ?.block_settings || {};
                                            return blockTabView.name ===
                                                'content' ? (
                                                <>
                                                    <Suspense
                                                        fallback={<Spinner />}
                                                    >
                                                        <BlockEditor
                                                            value={
                                                                selectedAd
                                                                    .content
                                                                    ?.blocks ||
                                                                ''
                                                            }
                                                            onChange={(
                                                                value
                                                            ) =>
                                                                handleUpdateContent(
                                                                    {
                                                                        blocks:
                                                                            value,
                                                                    }
                                                                )
                                                            }
                                                        />
                                                    </Suspense>
                                                    {renderVariantSection(
                                                        'block'
                                                    )}
                                                </>
                                            ) : (
                                                <TabPanel
                                                    className="magick-ad-block-settings-tabs"
                                                    tabs={[
                                                        {
                                                            name: 'style',
                                                            title: '外观',
                                                        },
                                                        {
                                                            name: 'layout',
                                                            title: '布局',
                                                        },
                                                        {
                                                            name: 'text',
                                                            title:
                                                                '标题/副标题',
                                                        },
                                                        {
                                                            name: 'cta',
                                                            title: 'CTA',
                                                        },
                                                    ]}
                                                    initialTabName={
                                                        blockSettingsTab
                                                    }
                                                    onSelect={(name) =>
                                                        setBlockSettingsTab(
                                                            name
                                                        )
                                                    }
                                                    key={blockSettingsTab}
                                                >
                                                    {(settingsTabView) => {
                                                        if (
                                                            settingsTabView.name ===
                                                            'style'
                                                        ) {
                                                            return (
                                                                <>
                                                                    <div className="magick-ad-field">
                                                                        <p className="magick-ad-field__label">
                                                                            背景图
                                                                        </p>
                                                                        <ImagePicker
                                                                            value={
                                                                                blockSettings.background_image ||
                                                                                {}
                                                                            }
                                                                            onChange={(
                                                                                value
                                                                            ) =>
                                                                                handleUpdateBlockSettings(
                                                                                    {
                                                                                        background_image:
                                                                                            value,
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div className="magick-ad-field">
                                                                        <p className="magick-ad-field__label">
                                                                            背景色
                                                                        </p>
                                                                        <ColorPicker
                                                                            color={
                                                                                blockSettings.background ||
                                                                                'transparent'
                                                                            }
                                                                            onChangeComplete={(
                                                                                value
                                                                            ) =>
                                                                                handleUpdateBlockSettings(
                                                                                    {
                                                                                        background:
                                                                                            formatColorValue(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                            enableAlpha
                                                                        />
                                                                    </div>
                                                                    <TextControl
                                                                        label="背景渐变（可选）"
                                                                        value={
                                                                            blockSettings.background_gradient ||
                                                                            ''
                                                                        }
                                                                        onChange={(value) =>
                                                                            handleUpdateBlockSettings(
                                                                                {
                                                                                    background_gradient:
                                                                                        value,
                                                                                }
                                                                            )
                                                                        }
                                                                        help="例如：linear-gradient(135deg,#60a5fa,#a78bfa)"
                                                                    />
                                                                    <div className="magick-ad-field">
                                                                        <p className="magick-ad-field__label">
                                                                            文字颜色
                                                                        </p>
                                                                        <ColorPicker
                                                                            color={
                                                                                blockSettings.text_color ||
                                                                                '#1d2327'
                                                                            }
                                                                            onChangeComplete={(
                                                                                value
                                                                            ) =>
                                                                                handleUpdateBlockSettings(
                                                                                    {
                                                                                        text_color:
                                                                                            formatColorValue(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                            enableAlpha
                                                                        />
                                                                    </div>
                                                                    <div className="magick-ad-image-grid">
                                                                        <RangeControl
                                                                            label="内边距"
                                                                            min={0}
                                                                            max={80}
                                                                            value={
                                                                                blockSettings.padding ??
                                                                                0
                                                                            }
                                                                            onChange={(value) =>
                                                                                handleUpdateBlockSettings(
                                                                                    {
                                                                                        padding:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                        <RangeControl
                                                                            label="圆角"
                                                                            min={0}
                                                                            max={50}
                                                                            value={
                                                                                blockSettings.radius ??
                                                                                0
                                                                            }
                                                                            onChange={(value) =>
                                                                                handleUpdateBlockSettings(
                                                                                    {
                                                                                        radius:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                        <RangeControl
                                                                            label="边框"
                                                                            min={0}
                                                                            max={12}
                                                                            value={
                                                                                blockSettings.border_width ??
                                                                                0
                                                                            }
                                                                            onChange={(value) =>
                                                                                handleUpdateBlockSettings(
                                                                                    {
                                                                                        border_width:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                        <RangeControl
                                                                            label="最大宽度"
                                                                            min={0}
                                                                            max={1400}
                                                                            value={
                                                                                blockSettings.max_width ??
                                                                                0
                                                                            }
                                                                            onChange={(value) =>
                                                                                handleUpdateBlockSettings(
                                                                                    {
                                                                                        max_width:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                        <RangeControl
                                                                            label="字体大小"
                                                                            min={10}
                                                                            max={48}
                                                                            value={
                                                                                blockSettings.font_size ??
                                                                                0
                                                                            }
                                                                            onChange={(value) =>
                                                                                handleUpdateBlockSettings(
                                                                                    {
                                                                                        font_size:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                    {blockSettings.border_width >
                                                                        0 && (
                                                                        <div className="magick-ad-field">
                                                                            <p className="magick-ad-field__label">
                                                                                边框颜色
                                                                            </p>
                                                                            <ColorPicker
                                                                                color={
                                                                                    blockSettings.border_color ||
                                                                                    '#d0d7e2'
                                                                                }
                                                                                onChangeComplete={(
                                                                                    value
                                                                                ) =>
                                                                                    handleUpdateBlockSettings(
                                                                                        {
                                                                                            border_color:
                                                                                                formatColorValue(
                                                                                                    value
                                                                                                ),
                                                                                        }
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    <SelectControl
                                                                        label="阴影"
                                                                        value={
                                                                            blockSettings.shadow ||
                                                                            'none'
                                                                        }
                                                                        options={
                                                                            SHADOW_OPTIONS
                                                                        }
                                                                        onChange={(value) =>
                                                                            handleUpdateBlockSettings(
                                                                                {
                                                                                    shadow: value,
                                                                                }
                                                                            )
                                                                        }
                                                                    />
                                                                    <TextControl
                                                                        label="字体（可选）"
                                                                        value={
                                                                            blockSettings.font_family ||
                                                                            ''
                                                                        }
                                                                        onChange={(value) =>
                                                                            handleUpdateBlockSettings(
                                                                                {
                                                                                    font_family:
                                                                                        value,
                                                                                }
                                                                            )
                                                                        }
                                                                        help="例如：PingFang SC, Arial, sans-serif"
                                                                    />
                                                                    <SelectControl
                                                                        label="对齐方式"
                                                                        value={
                                                                            blockSettings.align ||
                                                                            ''
                                                                        }
                                                                        options={[
                                                                            {
                                                                                label: '默认',
                                                                                value: '',
                                                                            },
                                                                            {
                                                                                label: '居中',
                                                                                value: 'center',
                                                                            },
                                                                        ]}
                                                                        onChange={(value) =>
                                                                            handleUpdateBlockSettings(
                                                                                {
                                                                                    align: value,
                                                                                }
                                                                            )
                                                                        }
                                                                    />
                                                                </>
                                                            );
                                                        }
                                                        if (
                                                            settingsTabView.name ===
                                                            'layout'
                                                        ) {
                                                            return (
                                                                <>
                                                                    <SelectControl
                                                                        label="布局"
                                                                        value={
                                                                            blockSettings.layout ||
                                                                            'content'
                                                                        }
                                                                        options={[
                                                                            {
                                                                                label:
                                                                                    '仅内容',
                                                                                value: 'content',
                                                                            },
                                                                            {
                                                                                label:
                                                                                    '上图下文',
                                                                                value: 'stack',
                                                                            },
                                                                            {
                                                                                label:
                                                                                    '左图右文',
                                                                                value: 'split',
                                                                            },
                                                                            {
                                                                                label:
                                                                                    '右图左文',
                                                                                value: 'split-reverse',
                                                                            },
                                                                        ]}
                                                                        onChange={(value) =>
                                                                            handleUpdateBlockSettings(
                                                                                {
                                                                                    layout: value,
                                                                                }
                                                                            )
                                                                        }
                                                                    />
                                                                    {blockSettings.layout &&
                                                                        blockSettings.layout !==
                                                                            'content' && (
                                                                            <div className="magick-ad-field">
                                                                                <p className="magick-ad-field__label">
                                                                                    内容配图
                                                                                </p>
                                                                                <ImagePicker
                                                                                    value={
                                                                                        blockSettings.media_image ||
                                                                                        {}
                                                                                    }
                                                                                    onChange={(
                                                                                        value
                                                                                    ) =>
                                                                                        handleUpdateBlockSettings(
                                                                                            {
                                                                                                media_image:
                                                                                                    value,
                                                                                            }
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        )}
                                                                </>
                                                            );
                                                        }
                                                        if (
                                                            settingsTabView.name ===
                                                            'text'
                                                        ) {
                                                            return (
                                                                <>
                                                                    <TextControl
                                                                        label="标题"
                                                                        value={
                                                                            blockSettings.heading ||
                                                                            ''
                                                                        }
                                                                        onChange={(value) =>
                                                                            handleUpdateBlockSettings(
                                                                                {
                                                                                    heading:
                                                                                        value,
                                                                                }
                                                                            )
                                                                        }
                                                                    />
                                                                    <TextControl
                                                                        label="副标题"
                                                                        value={
                                                                            blockSettings.subheading ||
                                                                            ''
                                                                        }
                                                                        onChange={(value) =>
                                                                            handleUpdateBlockSettings(
                                                                                {
                                                                                    subheading:
                                                                                        value,
                                                                                }
                                                                            )
                                                                        }
                                                                    />
                                                                    <div className="magick-ad-image-grid">
                                                                        <RangeControl
                                                                            label="标题字号"
                                                                            min={12}
                                                                            max={48}
                                                                            value={
                                                                                blockSettings.heading_size ??
                                                                                0
                                                                            }
                                                                            onChange={(value) =>
                                                                                handleUpdateBlockSettings(
                                                                                    {
                                                                                        heading_size:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                        <RangeControl
                                                                            label="标题行高"
                                                                            min={1}
                                                                            max={2.4}
                                                                            step={0.1}
                                                                            value={
                                                                                blockSettings.heading_line_height ??
                                                                                0
                                                                            }
                                                                            onChange={(value) =>
                                                                                handleUpdateBlockSettings(
                                                                                    {
                                                                                        heading_line_height:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                        <SelectControl
                                                                            label="标题字重"
                                                                            value={
                                                                                blockSettings.heading_weight ||
                                                                                'semibold'
                                                                            }
                                                                            options={[
                                                                                {
                                                                                    label:
                                                                                        'Normal',
                                                                                    value: 'normal',
                                                                                },
                                                                                {
                                                                                    label:
                                                                                        'Medium',
                                                                                    value: 'medium',
                                                                                },
                                                                                {
                                                                                    label:
                                                                                        'Semibold',
                                                                                    value: 'semibold',
                                                                                },
                                                                                {
                                                                                    label:
                                                                                        'Bold',
                                                                                    value: 'bold',
                                                                                },
                                                                                {
                                                                                    label:
                                                                                        'Black',
                                                                                    value: 'black',
                                                                                },
                                                                            ]}
                                                                            onChange={(value) =>
                                                                                handleUpdateBlockSettings(
                                                                                    {
                                                                                        heading_weight:
                                                                                            value,
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div className="magick-ad-image-grid">
                                                                        <RangeControl
                                                                            label="副标题字号"
                                                                            min={10}
                                                                            max={32}
                                                                            value={
                                                                                blockSettings.subheading_size ??
                                                                                0
                                                                            }
                                                                            onChange={(value) =>
                                                                                handleUpdateBlockSettings(
                                                                                    {
                                                                                        subheading_size:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                        <RangeControl
                                                                            label="副标题行高"
                                                                            min={1}
                                                                            max={2.4}
                                                                            step={0.1}
                                                                            value={
                                                                                blockSettings.subheading_line_height ??
                                                                                0
                                                                            }
                                                                            onChange={(value) =>
                                                                                handleUpdateBlockSettings(
                                                                                    {
                                                                                        subheading_line_height:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                        <SelectControl
                                                                            label="副标题字重"
                                                                            value={
                                                                                blockSettings.subheading_weight ||
                                                                                'normal'
                                                                            }
                                                                            options={[
                                                                                {
                                                                                    label:
                                                                                        'Normal',
                                                                                    value: 'normal',
                                                                                },
                                                                                {
                                                                                    label:
                                                                                        'Medium',
                                                                                    value: 'medium',
                                                                                },
                                                                                {
                                                                                    label:
                                                                                        'Semibold',
                                                                                    value: 'semibold',
                                                                                },
                                                                                {
                                                                                    label:
                                                                                        'Bold',
                                                                                    value: 'bold',
                                                                                },
                                                                                {
                                                                                    label:
                                                                                        'Black',
                                                                                    value: 'black',
                                                                                },
                                                                            ]}
                                                                            onChange={(value) =>
                                                                                handleUpdateBlockSettings(
                                                                                    {
                                                                                        subheading_weight:
                                                                                            value,
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                </>
                                                            );
                                                        }
                                                        if (
                                                            settingsTabView.name ===
                                                            'cta'
                                                        ) {
                                                            return (
                                                                <>
                                                                    <TextControl
                                                                        label="按钮文案"
                                                                        value={
                                                                            blockSettings.cta_text ||
                                                                            ''
                                                                        }
                                                                        onChange={(value) =>
                                                                            handleUpdateBlockSettings(
                                                                                {
                                                                                    cta_text:
                                                                                        value,
                                                                                }
                                                                            )
                                                                        }
                                                                    />
                                                                    <LinkPicker
                                                                        value={
                                                                            blockSettings.cta_link ||
                                                                            ''
                                                                        }
                                                                        target={
                                                                            blockSettings.cta_target
                                                                        }
                                                                        onChange={({
                                                                            url,
                                                                            target,
                                                                        }) =>
                                                                            handleUpdateBlockSettings(
                                                                                {
                                                                                    cta_link:
                                                                                        url,
                                                                                    cta_target:
                                                                                        Boolean(
                                                                                            target
                                                                                        ),
                                                                                }
                                                                            )
                                                                        }
                                                                    />
                                                                    <div className="magick-ad-image-grid">
                                                                        <div className="magick-ad-field">
                                                                            <p className="magick-ad-field__label">
                                                                                按钮背景
                                                                            </p>
                                                                            <ColorPicker
                                                                                color={
                                                                                    blockSettings.cta_background ||
                                                                                    '#2563eb'
                                                                                }
                                                                                onChangeComplete={(
                                                                                    value
                                                                                ) =>
                                                                                    handleUpdateBlockSettings(
                                                                                        {
                                                                                            cta_background:
                                                                                                formatColorValue(
                                                                                                    value
                                                                                                ),
                                                                                        }
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                        <div className="magick-ad-field">
                                                                            <p className="magick-ad-field__label">
                                                                                按钮文字
                                                                            </p>
                                                                            <ColorPicker
                                                                                color={
                                                                                    blockSettings.cta_text_color ||
                                                                                    '#ffffff'
                                                                                }
                                                                                onChangeComplete={(
                                                                                    value
                                                                                ) =>
                                                                                    handleUpdateBlockSettings(
                                                                                        {
                                                                                            cta_text_color:
                                                                                                formatColorValue(
                                                                                                    value
                                                                                                ),
                                                                                        }
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <RangeControl
                                                                        label="按钮圆角"
                                                                        min={0}
                                                                        max={999}
                                                                        value={
                                                                            blockSettings.cta_radius ??
                                                                            0
                                                                        }
                                                                        onChange={(value) =>
                                                                            handleUpdateBlockSettings(
                                                                                {
                                                                                    cta_radius:
                                                                                        Number(
                                                                                            value
                                                                                        ),
                                                                                }
                                                                            )
                                                                        }
                                                                    />
                                                                </>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                </TabPanel>
                                            );
                                        }}
                                    </TabPanel>
                                </PanelBody>
                            </Panel>
                        )}
                    </>
                );
            }}
        </TabPanel>
    ) : (
        <div className="magick-ad-empty">
            <p>请选择一个广告组进行配置。</p>
        </div>
    );

    const openRuntimeUrl = (url, fallbackMessage) => {
        if (!url) {
            showNotice('error', fallbackMessage, 2600);
            return;
        }
        window.open(url, '_blank', 'noopener');
    };

    const renderRuntimeSummaryBar = ({
        compact = false,
        showTitle = true,
        showActions = !compact,
        showDetails = !compact,
        detailsOpen = false,
        onToggleDetails = null,
    } = {}) => {
        if (!selectedAd || !runtimeContextMeta) {
            return null;
        }
        const canToggleDetails = compact && typeof onToggleDetails === 'function';
        const summaryClassName = compact
            ? 'magick-ad-runtime-summary is-compact'
            : 'magick-ad-runtime-summary';
        return (
            <div className={summaryClassName}>
                <div className="magick-ad-runtime-summary__body">
                    {showTitle && (
                        <div className="magick-ad-runtime-summary__title">
                            运行条件速览
                        </div>
                    )}
                    {compact ? (
                        <div className="magick-ad-runtime-summary__compact">
                            <div className="magick-ad-runtime-summary__line">
                                规则：{runtimeContextMeta.placementLabel} ·{' '}
                                {runtimeContextMeta.pageLabel}
                            </div>
                            <div className="magick-ad-runtime-summary__line">
                                环境：{runtimeContextMeta.currentDeviceLabel} /{' '}
                                {runtimeContextMeta.currentLoginLabel}
                            </div>
                        </div>
                    ) : showDetails ? (
                        <>
                            <div className="magick-ad-runtime-summary__line">
                                规则：位置 {runtimeContextMeta.placementLabel} · 页面 {runtimeContextMeta.pageLabel} · 用途{' '}
                                {runtimeContextMeta.usageLabel} · 设备{' '}
                                {runtimeContextMeta.deviceRuleLabel} · 登录 {runtimeContextMeta.loginRuleLabel}
                            </div>
                            <div className="magick-ad-runtime-summary__line">
                                环境：设备 {runtimeContextMeta.currentDeviceLabel} · 登录{' '}
                                {runtimeContextMeta.currentLoginLabel}
                            </div>
                        </>
                    ) : null}
                    {compact && showDetails && (
                        <div className="magick-ad-runtime-summary__details">
                            <div className="magick-ad-runtime-summary__line">
                                规则：位置 {runtimeContextMeta.placementLabel} · 页面 {runtimeContextMeta.pageLabel} · 用途{' '}
                                {runtimeContextMeta.usageLabel} · 设备{' '}
                                {runtimeContextMeta.deviceRuleLabel} · 登录 {runtimeContextMeta.loginRuleLabel}
                            </div>
                            <div className="magick-ad-runtime-summary__line">
                                环境：设备 {runtimeContextMeta.currentDeviceLabel} · 登录{' '}
                                {runtimeContextMeta.currentLoginLabel}
                            </div>
                        </div>
                    )}
                    <div className="magick-ad-runtime-summary__status">
                        <span
                            className={`magick-ad-status-pill ${runtimeContextMeta.statusClassName}`}
                        >
                            {runtimeContextMeta.statusLabel}
                        </span>
                        <span className="magick-ad-runtime-summary__reason">
                            {runtimeContextMeta.reasonText}
                        </span>
                    </div>
                </div>
                {(showActions || canToggleDetails) && (
                    <div className="magick-ad-runtime-summary__actions">
                        {canToggleDetails && (
                            <Button
                                variant="tertiary"
                                onClick={onToggleDetails}
                            >
                                {detailsOpen ? '收起详情' : '查看详情'}
                            </Button>
                        )}
                        {showActions && (
                            <>
                                <Button
                                    variant="secondary"
                                    onClick={() =>
                                        openRuntimeUrl(
                                            runtimeContextMeta.previewUrl,
                                            '预览地址生成失败，请检查预览配置。'
                                        )
                                    }
                                >
                                    查看预览壳
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() =>
                                        openRuntimeUrl(
                                            runtimeContextMeta.diagnoseUrl,
                                            '诊断地址生成失败，请刷新后台后重试。'
                                        )
                                    }
                                >
                                    查看真实诊断
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderPublishMeta = (className = 'magick-ad-right-section__meta') => (
        <div className={className}>
            <Button
                className="magick-ad-save-button"
                variant="primary"
                onClick={handleSave}
                isBusy={isSaving}
                disabled={isSaving || !selectedAd}
            >
                {isSaving ? '保存中...' : '保存'}
            </Button>
        </div>
    );

    const renderPublishBody = () => {
        const toLocalInputValue = (date) => {
            const pad = (num) => String(num).padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
                date.getDate()
            )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        };
        const applyQuickSchedule = (preset) => {
            if (preset === 'immediate') {
                handleUpdateOptions({
                    start_date: '',
                });
                return;
            }
            if (preset === 'week') {
                const next = new Date();
                next.setDate(next.getDate() + 7);
                next.setHours(23, 59, 0, 0);
                handleUpdateOptions({
                    end_date: formatDateTimeStorage(toLocalInputValue(next)),
                });
                return;
            }
            if (preset === 'long') {
                handleUpdateOptions({
                    end_date: '',
                });
            }
        };
        const publishStatusValue = resolveStatus(selectedAd);
        const publishStatusOptions = [
            { label: '已发布', value: 'publish' },
            { label: '待审核', value: 'pending' },
            { label: '草稿/停用', value: 'draft' },
            ...(publishStatusValue === 'future'
                ? [
                      {
                          label: '已排期',
                          value: 'future',
                          disabled: true,
                      },
                  ]
                : []),
        ];
        const publishStatusLabel = getOptionLabel(
            publishStatusOptions,
            publishStatusValue,
            '已发布'
        );
        const publishScheduleSummary = `${
            selectedAd.options?.start_date ? '已设开始' : '立即生效'
        } · ${selectedAd.options?.end_date ? '已设结束' : '长期有效'}`;

        return (
            <>
                <div className="magick-ad-publish-compact">
                    <div className="magick-ad-publish-compact__main">
                        <span className="magick-ad-publish-compact__title">
                            {publishStatusLabel}
                        </span>
                        <span className="magick-ad-publish-compact__desc">
                            {publishScheduleSummary}
                        </span>
                    </div>
                </div>
                <div className="magick-ad-publish-quick">
                    <Button
                        variant="secondary"
                        onClick={() => applyQuickSchedule('immediate')}
                    >
                        立即生效
                    </Button>
                    <DropdownMenu
                        icon={moreHorizontal}
                        label="更多快捷排期"
                        toggleProps={{
                            variant: 'tertiary',
                            className: 'magick-ad-publish-quick__more',
                        }}
                    >
                        {({ onClose }) => (
                            <MenuGroup>
                                <MenuItem
                                    onClick={() => {
                                        onClose();
                                        applyQuickSchedule('week');
                                    }}
                                >
                                    一周后结束
                                </MenuItem>
                                <MenuItem
                                    onClick={() => {
                                        onClose();
                                        applyQuickSchedule('long');
                                    }}
                                >
                                    长期有效
                                </MenuItem>
                            </MenuGroup>
                        )}
                    </DropdownMenu>
                </div>
                <div className="magick-ad-right-inline-panel magick-ad-right-inline-panel--static">
                    <div className="magick-ad-right-inline-panel__heading">
                        发布详情
                    </div>
                    <SelectControl
                        label="发布状态"
                        value={publishStatusValue}
                        options={publishStatusOptions}
                        onChange={(value) => {
                            if (!selectedAd) {
                                return;
                            }
                            if (value === 'draft') {
                                handleUpdateMeta({
                                    status: 'draft',
                                    options: {
                                        ...selectedAd.options,
                                        enabled: false,
                                    },
                                });
                                return;
                            }
                            if (value === 'pending') {
                                handleUpdateMeta({
                                    status: 'pending',
                                    options: {
                                        ...selectedAd.options,
                                        enabled: true,
                                    },
                                });
                                return;
                            }
                            const nextDate =
                                selectedAd.date &&
                                isFutureDate(selectedAd.date)
                                    ? formatDateFromDate(new Date())
                                    : selectedAd.date || '';
                            handleUpdateMeta({
                                status: 'publish',
                                date: nextDate,
                                options: {
                                    ...selectedAd.options,
                                    enabled: true,
                                },
                            });
                        }}
                    />
                    {(() => {
                        const runtime = runtimeMeta(selectedAd);
                        if (!runtime.blocked) {
                            return null;
                        }
                        const noticeStatus =
                            runtime.code === 'schedule_not_started' ||
                            runtime.code === 'schedule_expired'
                                ? 'warning'
                                : 'info';
                        return (
                            <Notice
                                status={noticeStatus}
                                isDismissible={false}
                            >
                                {runtime.message}
                            </Notice>
                        );
                    })()}
                </div>
                <div className="magick-ad-right-inline-panel magick-ad-right-inline-panel--static">
                    <div className="magick-ad-right-inline-panel__heading">
                        高级排期
                    </div>
                    <TextControl
                        label="开始时间"
                        type="datetime-local"
                        value={formatDateTimeLocalInput(
                            selectedAd.options?.start_date
                        )}
                        onChange={(value) =>
                            handleUpdateOptions({
                                start_date:
                                    formatDateTimeStorage(
                                        value
                                    ),
                            })
                        }
                        help="开始时间为空表示立即生效。"
                    />
                    <TextControl
                        label="结束时间"
                        type="datetime-local"
                        value={formatEndDateTimeLocalInput(
                            selectedAd.options?.end_date
                        )}
                        onChange={(value) =>
                            handleUpdateOptions({
                                end_date:
                                    formatDateTimeStorage(
                                        value
                                    ),
                            })
                        }
                        help="结束时间为空表示长期有效，支持到分钟。"
                    />
                </div>
            </>
        );
    };

    const renderPublishSection = ({ compactHeader = false } = {}) => (
        <div className="magick-ad-right-section">
            {!compactHeader && (
                <div className="magick-ad-right-section__header">
                    <div className="magick-ad-right-section__title">
                        发布与排期
                    </div>
                    {renderPublishMeta()}
                </div>
            )}
            <div className="magick-ad-right-section__body">
                {renderPublishBody()}
            </div>
        </div>
    );

    const renderRightSaveBar = () => {
        if (!selectedAd) {
            return null;
        }
        const publish = statusMeta(selectedAd);
        const runtime = runtimeMeta(selectedAd);
        const saveStateLabel = isSaving
            ? '保存中...'
            : hasUnsavedChanges
              ? '未保存更改'
              : '已保存';
        return (
            <div className="magick-ad-right-savebar">
                <div className="magick-ad-right-savebar__meta">
                    <span className="magick-ad-right-savebar__label">
                        {publish.label} · {runtime.label}
                    </span>
                    <span
                        className={`magick-ad-right-savebar__state ${
                            hasUnsavedChanges ? 'is-dirty' : 'is-clean'
                        }`}
                    >
                        <span className="magick-ad-right-savebar__state-dot" />
                        {saveStateLabel}
                    </span>
                </div>
                <Button
                    className="magick-ad-save-button"
                    variant="primary"
                    onClick={handleSave}
                    isBusy={isSaving}
                    disabled={isSaving || !selectedAd}
                >
                    {isSaving ? '保存中...' : '保存'}
                </Button>
            </div>
        );
    };

    const renderRightPrioritySummary = () => {
        if (!selectedAd || !runtimeContextMeta) {
            return null;
        }
        const publish = statusMeta(selectedAd);
        const reasonText = runtimeContextMeta.reasonText || '可按当前规则展示。';
        const compactReasonText =
            reasonText.length > 32
                ? `${reasonText.slice(0, 32)}...`
                : reasonText;
        return (
            <div className="magick-ad-right-priority">
                <div className="magick-ad-right-priority__head">
                    <div className="magick-ad-right-priority__title">
                        运行结论
                    </div>
                    <div className="magick-ad-right-priority__status">
                        <span
                            className={`magick-ad-status-pill ${publish.className}`}
                        >
                            {publish.label}
                        </span>
                        <span
                            className={`magick-ad-status-pill ${runtimeContextMeta.statusClassName}`}
                        >
                            {runtimeContextMeta.statusLabel}
                        </span>
                    </div>
                </div>
                <div className="magick-ad-right-priority__line">
                    <p className="magick-ad-right-priority__reason">
                        {compactReasonText}
                    </p>
                    <Button
                        variant="tertiary"
                        onClick={() => {
                            setRightSidebarTab('runtime');
                            setRuntimeDetailsOpen(true);
                        }}
                    >
                        查看详情
                    </Button>
                </div>
            </div>
        );
    };

    const renderPublishModalSection = () => renderPublishSection();

    const renderPreviewControls = () => (
        <div className="magick-ad-preview-target">
            <div className="magick-ad-preview-target__title">预览页面</div>
            <div className="magick-ad-preview-target__mode">
                <ButtonGroup>
                    <Button
                        variant="secondary"
                        isPressed={previewMode === 'url'}
                        onClick={() => setPreviewMode('url')}
                    >
                        链接
                    </Button>
                    <Button
                        variant="secondary"
                        isPressed={previewMode === 'post'}
                        onClick={() => setPreviewMode('post')}
                    >
                        文章
                    </Button>
                    <Button
                        variant="secondary"
                        isPressed={previewMode === 'page'}
                        onClick={() => setPreviewMode('page')}
                    >
                        页面
                    </Button>
                </ButtonGroup>
            </div>
            {previewMode === 'url' ? (
                <TextControl
                    label="页面链接（仅支持本站）"
                    value={previewTarget}
                    placeholder="https://example.com/your-page"
                    onChange={(value) => setPreviewTarget(value)}
                    help="填写后将使用该页面作为预览环境。"
                />
            ) : (
                <ComboboxControl
                    label="选择页面"
                    value={previewSelected}
                    options={previewOptions}
                    onChange={handlePreviewSelect}
                    onFilterValueChange={(value) => setPreviewSearch(value)}
                    placeholder={
                        previewMode === 'page'
                            ? '搜索页面...'
                            : '搜索文章...'
                    }
                    help={
                        previewLoading
                            ? '正在加载列表...'
                            : '选择后将自动作为预览环境'
                    }
                />
            )}
            <div className="magick-ad-preview-target__actions">
                <Button
                    variant="secondary"
                    onClick={() =>
                        setPreviewTarget(window?.MagickAD?.previewUrl || '')
                    }
                >
                    使用首页
                </Button>
                <Button
                    variant="tertiary"
                    onClick={() => setPreviewTarget('')}
                >
                    清空
                </Button>
            </div>
            <SelectControl
                label="模拟登录态"
                value={previewLogin}
                options={[
                    { label: '跟随真实状态', value: 'auto' },
                    { label: '模拟已登录', value: 'logged-in' },
                    { label: '模拟未登录', value: 'logged-out' },
                ]}
                onChange={(value) => setPreviewLogin(value)}
                help="仅影响预览命中判断，不会改变真实登录态。"
            />
        </div>
    );

    const renderAdvancedControls = ({ includePreview = true } = {}) => (
        <>
            <TextControl
                label="优先级（越大越先展示）"
                type="number"
                min={1}
                value={selectedAd.options?.priority ?? 10}
                onChange={(value) =>
                    handleUpdateOptions({
                        priority: Math.max(1, Number(value) || 1),
                    })
                }
                help="同一 Slot 内优先级最高的广告优先出场。"
            />
            <TextControl
                label="权重（同优先级下随机）"
                type="number"
                min={1}
                value={selectedAd.options?.weight ?? 1}
                onChange={(value) =>
                    handleUpdateOptions({
                        weight: Math.max(1, Number(value) || 1),
                    })
                }
                help="仅对同优先级广告生效，权重越大越容易被选中。"
            />
            {includePreview && renderPreviewControls()}
        </>
    );

    const renderPanelTitleWithSummary = (title, summary = '') => (
        <div className="magick-ad-panel-title magick-ad-panel-title--compact">
            <span>{title}</span>
            {summary ? (
                <span className="magick-ad-panel-title__summary">
                    {summary}
                </span>
            ) : null}
        </div>
    );

    const renderUsageModeControls = () => (
        <>
            <p className="magick-ad-right-inline-note">
                调整用途类型、编辑模式和专家能力。日常投放可保持默认。
            </p>
            <SelectControl
                label="用途类型"
                value={normalizeUsageType(selectedAd?.options?.usage_type || 'ad')}
                options={usageOptions}
                onChange={(value) =>
                    handleUpdateOptions({
                        usage_type: normalizeUsageType(value),
                    })
                }
                help="“装饰组件”会自动禁用统计、频控和 A/B，并限制到非侵入位置。"
            />
            {isDecorativeUsage(selectedAd?.options || {}) && (
                <Notice status="info" isDismissible={false}>
                    当前为“装饰组件”：仅支持顶部/内容区/底部位置，且不参与统计与频控。
                </Notice>
            )}
            <div className="magick-ad-mode-switch">
                <div className="magick-ad-mode-switch__label">编辑模式</div>
                <ButtonGroup className="magick-ad-mode-switch__group">
                    <Button
                        variant="secondary"
                        isPressed={effectiveEditorMode === 'quick'}
                        onClick={() => updateEditorMode('quick')}
                    >
                        快速模式
                    </Button>
                    <Button
                        variant="secondary"
                        isPressed={effectiveEditorMode === 'design'}
                        onClick={() => updateEditorMode('design')}
                    >
                        设计模式
                    </Button>
                    <Button
                        variant="secondary"
                        isPressed={effectiveEditorMode === 'expert'}
                        onClick={() => {
                            if (!canUnfilteredHtml) {
                                showNotice(
                                    'error',
                                    '当前账号无 unfiltered_html 权限，无法启用专家模式。',
                                    3500
                                );
                                return;
                            }
                            updateEditorMode('expert');
                        }}
                        disabled={!canUnfilteredHtml}
                    >
                        专家模式
                    </Button>
                </ButtonGroup>
            </div>
            {editorModeRaw === 'expert' && !canUnfilteredHtml && (
                <Notice status="warning" isDismissible={false}>
                    专家模式需要 unfiltered_html 权限，已回退为设计模式。
                </Notice>
            )}
        </>
    );

    const renderFrequencyAdvancedTab = (
        behavior = {},
        { showAdvanced = true } = {}
    ) => {
        const frequencySummary = isDecorativeUsage(selectedAd?.options || {})
            ? '装饰组件不参与频控'
            : getFrequencySummary(behavior);
        const advancedSummary = `优先级 ${selectedAd.options?.priority ?? 10} · 权重 ${selectedAd.options?.weight ?? 1}`;
        return (
            <Panel>
                <PanelBody
                    title={renderPanelTitleWithSummary(
                        '核心频控',
                        frequencySummary
                    )}
                    opened={frequencyPanelOpen === 'frequency'}
                    onToggle={() =>
                        setFrequencyPanelOpen((prev) =>
                            prev === 'frequency' ? null : 'frequency'
                        )
                    }
                >
                    {renderFrequencyControls(behavior)}
                </PanelBody>
                {showAdvanced && (
                    <PanelBody
                        title={renderPanelTitleWithSummary(
                            '高级规则（优先级/权重）',
                            advancedSummary
                        )}
                        opened={frequencyPanelOpen === 'advanced'}
                        onToggle={() =>
                            setFrequencyPanelOpen((prev) =>
                                prev === 'advanced' ? null : 'advanced'
                            )
                        }
                    >
                        {renderAdvancedControls({ includePreview: false })}
                    </PanelBody>
                )}
            </Panel>
        );
    };

    const renderPlacementRulesControls = ({
        includeValidation = false,
        includePlacementCompact = false,
        includeAudience = false,
        includeNode = false,
        includeFrequency = false,
        behavior = {},
    } = {}) => {
        const isGlobal = selectedAd.options?.ad_type === 'global';
        const isTargeted = selectedAd.options?.ad_type === 'targeted';
        const canTogglePlacementDetails =
            includePlacementCompact && (isGlobal || isTargeted);
        const showPlacementDetails =
            !canTogglePlacementDetails || placementDetailsOpen;
        const pageLabel = getOptionLabel(
            DISPLAY_PAGE_OPTIONS,
            selectedAd.options?.show_page || 'all',
            '全站'
        );
        const placementLabel = resolvePlacementLabel(selectedAd.options || {});
        const targetTypeLabel = getOptionLabel(
            TARGET_TYPE_OPTIONS,
            selectedAd.options?.target_type || '',
            '未设置'
        );
        const targetCount = Array.isArray(selectedAd.options?.target_values)
            ? selectedAd.options.target_values.length
            : 0;
        const placementCompactSummary = isGlobal
            ? `页面 ${pageLabel} · 位置 ${placementLabel}`
            : `定向 ${targetTypeLabel} · 目标 ${targetCount} 项`;
        return (
            <>
                {includeValidation &&
                    showValidation &&
                    !resolvePlacement(selectedAd.options || {}).hook && (
                        <Notice status="error" isDismissible={false}>
                            请先选择展示位置
                        </Notice>
                    )}
                {canTogglePlacementDetails && (
                    <div className="magick-ad-placement-compact">
                        <div className="magick-ad-placement-compact__main">
                            <span className="magick-ad-placement-compact__title">
                                当前投放
                            </span>
                            <span className="magick-ad-placement-compact__desc">
                                {placementCompactSummary}
                            </span>
                        </div>
                        <Button
                            variant="tertiary"
                            className="magick-ad-placement-compact__toggle"
                            onClick={() =>
                                setPlacementDetailsOpen((prev) => !prev)
                            }
                        >
                            {placementDetailsOpen ? '收起详情' : '查看详情'}
                        </Button>
                    </div>
                )}
                {showPlacementDetails && isGlobal && (
                    <>
                        <SelectControl
                            label="展示页面"
                            value={selectedAd.options?.show_page || 'all'}
                            options={DISPLAY_PAGE_OPTIONS}
                            onChange={(value) => {
                                const usageType = normalizeUsageType(
                                    selectedAd.options?.usage_type || 'ad'
                                );
                                const allowedPositions = getPositionOptions(value)
                                    .filter((option) =>
                                        usageType === 'decorative'
                                            ? !['head', 'node'].includes(
                                                  option.value
                                              )
                                            : true
                                    )
                                    .map((option) => option.value);
                                const currentPlacement = resolvePlacement(
                                    selectedAd.options || {}
                                );
                                const currentValue =
                                    placementToSlotValue(currentPlacement);
                                const nextPosition =
                                    allowedPositions.includes(currentValue)
                                        ? currentValue
                                        : '';
                                applyPlacementSelection(nextPosition, {
                                    show_page: value,
                                });
                            }}
                        />
                        <SelectControl
                            label="展示位置"
                            value={placementToSlotValue(
                                resolvePlacement(selectedAd.options || {})
                            )}
                            options={positionOptions}
                            onChange={(value) => applyPlacementSelection(value)}
                        />
                    </>
                )}
                {showPlacementDetails && isTargeted && (
                    <>
                        <SelectControl
                            label="展示类型"
                            value={selectedAd.options?.target_type || ''}
                            options={TARGET_TYPE_OPTIONS}
                            onChange={(value) =>
                                handleUpdateOptions({
                                    target_type: value,
                                    target_values: [],
                                })
                            }
                        />
                        <FormTokenField
                            label="展示页面"
                            value={selectedAd.options?.target_values || []}
                            onChange={(value) =>
                                handleUpdateOptions({
                                    target_values: value,
                                })
                            }
                            suggestions={
                                selectedAd.options?.target_suggestions || []
                            }
                            help={
                                selectedAd.options?.target_type
                                    ? '支持输入并搜索添加多个目标'
                                    : '请先选择展示类型'
                            }
                            disabled={!selectedAd.options?.target_type}
                        />
                    </>
                )}
                {includeAudience && renderDeviceLoginControls()}
                {includeNode && renderNodePlacement()}
                {includeFrequency && renderFrequencySummary(behavior)}
            </>
        );
    };

    const renderPlacementSection = ({ variant = 'full' } = {}) => {
        const isSidebarPlacement = variant === 'sidebar';
        const usageLabel = getUsageLabel(
            normalizeUsageType(selectedAd?.options?.usage_type || 'ad')
        );
        const modeLabel = editorModeLabels[effectiveEditorMode] || '设计';
        const pageLabel =
            selectedAd?.options?.ad_type === 'targeted' &&
            selectedAd?.options?.target_type
                ? getOptionLabel(
                      TARGET_TYPE_OPTIONS,
                      selectedAd.options.target_type,
                      '指定页面'
                  )
                : getOptionLabel(
                  DISPLAY_PAGE_OPTIONS,
                  selectedAd?.options?.show_page || 'all',
                  '全站'
              );
        const behaviorSummary = selectedAd?.content?.behavior || {};
        const advancedPlacementSummary = [
            `设备 ${runtimeContextMeta?.deviceRuleLabel || '全部设备'}`,
            `登录 ${runtimeContextMeta?.loginRuleLabel || '全部用户'}`,
            `频控 ${
                isDecorativeUsage(selectedAd?.options || {})
                    ? '装饰组件不参与'
                    : getFrequencySummary(behaviorSummary)
            }`,
            `优先级 ${selectedAd?.options?.priority ?? 10}`,
            `权重 ${selectedAd?.options?.weight ?? 1}`,
        ].join(' · ');
        const quickPlacementTabs = [
            { name: 'insert', title: '页面插入' },
            ...(!isSimpleLevel && !isSidebarPlacement
                ? [
                      { name: 'rules', title: '用途与模式' },
                      { name: 'node', title: '节点规则' },
                  ]
                : []),
        ];
        const placementTabs =
            effectiveEditorMode !== 'quick'
                ? isSidebarPlacement
                    ? [
                          { name: 'placement', title: '投放' },
                          { name: 'container', title: '容器' },
                          { name: 'behavior', title: '交互' },
                      ]
                    : [
                          { name: 'rules', title: '规则' },
                          { name: 'container', title: '容器' },
                          { name: 'behavior', title: '交互' },
                          { name: 'placement', title: '投放' },
                          { name: 'frequency', title: '频控' },
                      ]
                : [];
        const resolvedPlacementTab = placementTabs.some(
            (tab) => tab.name === placementTab
        )
            ? placementTab
            : 'placement';
        const resolvedQuickPlacementTab = quickPlacementTabs.some(
            (tab) => tab.name === quickPlacementTab
        )
            ? quickPlacementTab
            : 'insert';
        return (
            <>
                <div className="magick-ad-right-section">
                    <div className="magick-ad-right-section__body">
                        <div className="magick-ad-right-overview">
                            <span className="magick-ad-right-overview__item">
                                编辑
                                <strong>
                                    {usageLabel} · {modeLabel}
                                </strong>
                            </span>
                            <span className="magick-ad-right-overview__item">
                                投放
                                <strong>
                                    {resolvePlacementLabel(
                                        selectedAd?.options || {}
                                    )}{' '}
                                    · {pageLabel}
                                </strong>
                            </span>
                        </div>
                        {effectiveEditorMode === 'quick' && (
                            <TabPanel
                                className="magick-ad-right-tabs"
                                tabs={quickPlacementTabs}
                                initialTabName={resolvedQuickPlacementTab}
                                onSelect={(name) => {
                                    setQuickPlacementTab(name);
                                    setQuickPlacementPanelOpen(name);
                                }}
                                key={`quick-${resolvedQuickPlacementTab}`}
                            >
                                {(tab) => {
                                    if (tab.name === 'rules') {
                                        return (
                                            <Panel className="magick-ad-right-inline-panel">
                                                <PanelBody
                                                    title="高级规则（用途与模式）"
                                                    opened={
                                                        quickPlacementPanelOpen ===
                                                        'rules'
                                                    }
                                                    onToggle={() =>
                                                        setQuickPlacementPanelOpen(
                                                            (prev) =>
                                                                prev === 'rules'
                                                                    ? null
                                                                    : 'rules'
                                                        )
                                                    }
                                                >
                                                    {renderUsageModeControls()}
                                                </PanelBody>
                                            </Panel>
                                        );
                                    }

                                    if (tab.name === 'node') {
                                        return (
                                            <Panel className="magick-ad-right-inline-panel">
                                                <PanelBody
                                                    title="高级规则（节点）"
                                                    opened={
                                                        quickPlacementPanelOpen ===
                                                        'node'
                                                    }
                                                    onToggle={() =>
                                                        setQuickPlacementPanelOpen(
                                                            (prev) =>
                                                                prev === 'node'
                                                                    ? null
                                                                    : 'node'
                                                        )
                                                    }
                                                >
                                                    <p className="magick-ad-right-inline-note">
                                                        仅在“位置=节点”时需要配置，普通投放可忽略。
                                                    </p>
                                                    {renderPlacementRulesControls({
                                                        includeNode: true,
                                                    })}
                                                </PanelBody>
                                            </Panel>
                                        );
                                    }

                                    return (
                                        <Panel className="magick-ad-right-inline-panel">
                                            <PanelBody
                                                title="页面插入"
                                                opened={
                                                    quickPlacementPanelOpen ===
                                                    'insert'
                                                }
                                                onToggle={() =>
                                                    setQuickPlacementPanelOpen(
                                                        (prev) =>
                                                            prev === 'insert'
                                                                ? null
                                                                : 'insert'
                                                    )
                                                }
                                            >
                                                <p className="magick-ad-right-inline-note">
                                                    {isSimpleLevel
                                                        ? '简洁级别仅保留页面插入能力。'
                                                        : '快速模式仅保留页面插入能力；样式、频控与高级能力请切换到设计模式/专家模式。'}
                                                </p>
                                                {isSimpleLevel && (
                                                    <Notice
                                                        status="info"
                                                        isDismissible={false}
                                                    >
                                                        简洁级别已锁定为“快速模式”，仅保留页面插入与基础投放能力。
                                                    </Notice>
                                                )}
                                                {renderPlacementRulesControls({
                                                    includeValidation: true,
                                                    includePlacementCompact: true,
                                                })}
                                                {isSidebarPlacement &&
                                                    !isSimpleLevel && (
                                                        <div className="magick-ad-right-advanced-entry">
                                                            <div className="magick-ad-right-advanced-entry__title">
                                                                高级规则已迁移
                                                            </div>
                                                            <p className="magick-ad-right-advanced-entry__desc">
                                                                不影响广告外观预览的设置项（如频控、优先级/权重、设备登录与节点规则）已迁移到弹窗。
                                                            </p>
                                                            <p className="magick-ad-right-advanced-entry__meta">
                                                                {advancedPlacementSummary}
                                                            </p>
                                                            <Button
                                                                variant="secondary"
                                                                onClick={() =>
                                                                    setPlacementModalOpen(
                                                                        true
                                                                    )
                                                                }
                                                            >
                                                                打开高级投放设置
                                                            </Button>
                                                        </div>
                                                    )}
                                            </PanelBody>
                                        </Panel>
                                    );
                                }}
                            </TabPanel>
                        )}
                        {effectiveEditorMode !== 'quick' && (
                            <TabPanel
                                className="magick-ad-right-tabs"
                                tabs={placementTabs}
                                initialTabName={resolvedPlacementTab}
                                onSelect={(name) => setPlacementTab(name)}
                                key={resolvedPlacementTab}
                            >
                                {(tab) => {
                                    const containerStyle =
                                        selectedAd.content?.container_style ||
                                        {};
                                    const behavior =
                                        selectedAd.content?.behavior || {};

                                    const isInlineContainer =
                                        (selectedAd.options?.container_type ||
                                            'inline') === 'inline';
                                    const advancedRulesSummary = [
                                        `设备 ${
                                            runtimeContextMeta?.deviceRuleLabel ||
                                            '全部设备'
                                        }`,
                                        `登录 ${
                                            runtimeContextMeta?.loginRuleLabel ||
                                            '全部用户'
                                        }`,
                                        `频控 ${getFrequencySummary(behavior)}`,
                                        isExpertMode ? '含节点规则' : null,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ');

                                    if (tab.name === 'rules') {
                                        return (
                                            <Panel className="magick-ad-right-inline-panel">
                                                <PanelBody
                                                    title="高级规则（用途与模式）"
                                                    opened={
                                                        placementAdvancedOpen ===
                                                        'rules'
                                                    }
                                                    onToggle={() =>
                                                        setPlacementAdvancedOpen(
                                                            (prev) =>
                                                                prev === 'rules'
                                                                    ? null
                                                                    : 'rules'
                                                        )
                                                    }
                                                >
                                                    {renderUsageModeControls()}
                                                </PanelBody>
                                            </Panel>
                                        );
                                    }

                                    if (tab.name === 'frequency') {
                                        return renderFrequencyAdvancedTab(
                                            behavior,
                                            {
                                                showAdvanced: isExpertMode,
                                            }
                                        );
                                    }

                                    if (tab.name === 'container') {
                                        return (
                                            <Panel>
                                                <PanelBody
                                                    title={
                                                        <div className="magick-ad-panel-title">
                                                            <span>容器外观</span>
                                                            {!isHeadPlacement && (
                                                                <Dropdown
                                                                    className="magick-ad-panel-note"
                                                                    position="bottom right"
                                                                    renderToggle={({
                                                                        isOpen,
                                                                        onToggle,
                                                                    }) => (
                                                                        <Button
                                                                            className="magick-ad-panel-note__trigger"
                                                                            icon={info}
                                                                            label="说明"
                                                                            variant="tertiary"
                                                                            size="small"
                                                                            aria-expanded={isOpen}
                                                                            onClick={(event) => {
                                                                                event.stopPropagation();
                                                                                onToggle();
                                                                            }}
                                                                        />
                                                                    )}
                                                                    renderContent={({
                                                                        onClose,
                                                                    }) => (
                                                                        <div className="magick-ad-panel-note__content">
                                                                            <p>
                                                                                容器外观仅作用于包裹层（div），不会影响图片本体。
                                                                                图片尺寸、圆角与外边距请在“图片配置”里调整。
                                                                            </p>
                                                                            <Button
                                                                                variant="secondary"
                                                                                size="small"
                                                                                onClick={(event) => {
                                                                                    event.stopPropagation();
                                                                                    jumpToImageSettings();
                                                                                    onClose();
                                                                                }}
                                                                            >
                                                                                去图片配置
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                />
                                                            )}
                                                        </div>
                                                    }
                                                    initialOpen
                                                >
                                            {isHeadPlacement && (
                                                <>
                                                    <Notice
                                                        status="warning"
                                                        isDismissible={
                                                            false
                                                        }
                                                    >
                                                        Head
                                                        位置仅允许输出
                                                        &lt;script&gt;、&lt;style&gt;、&lt;meta&gt;、
                                                        &lt;link&gt;
                                                        等标签，已强制切换为“原始输出”模式。
                                                    </Notice>
                                                    <SelectControl
                                                        label="容器模式"
                                                        value="raw"
                                                        options={[
                                                            {
                                                                label: '原始输出',
                                                                value: 'raw',
                                                            },
                                                        ]}
                                                        disabled
                                                    />
                                                </>
                                            )}
                                            {!isHeadPlacement && (
                                                <>
                                                    <TabPanel
                                                        className="magick-ad-sub-tabs"
                                                        tabs={[
                                                            {
                                                                name: 'base',
                                                                title: '基础',
                                                            },
                                                            {
                                                                name: 'size',
                                                                title: '尺寸',
                                                            },
                                                            {
                                                                name: 'spacing',
                                                                title: '间距',
                                                            },
                                                            {
                                                                name: 'appearance',
                                                                title: '外观',
                                                            },
                                                        ]}
                                                        initialTabName={
                                                            containerTab
                                                        }
                                                        onSelect={(name) =>
                                                            setContainerTab(
                                                                name
                                                            )
                                                        }
                                                    >
                                                        {(subTab) => {
                                                            if (
                                                                subTab.name ===
                                                                'base'
                                                            ) {
                                                                return (
                                                                    <>
                                                                        <SelectControl
                                                                            label="容器类型"
                                                                            value={
                                                                                selectedAd
                                                                                    .options
                                                                                    ?.container_type ||
                                                                                'inline'
                                                                            }
                                                                            options={[
                                                                                {
                                                                                    label: '默认嵌入',
                                                                                    value: 'inline',
                                                                                },
                                                                                {
                                                                                    label: '弹窗',
                                                                                    value: 'popup',
                                                                                },
                                                                                {
                                                                                    label: '吸顶/吸底横栏',
                                                                                    value: 'banner',
                                                                                },
                                                                                {
                                                                                    label: '角落悬浮',
                                                                                    value: 'floating',
                                                                                },
                                                                                {
                                                                                    label: '全屏插屏',
                                                                                    value: 'interstitial',
                                                                                },
                                                                            ]}
                                                                            onChange={(
                                                                                value
                                                                            ) => {
                                                                                const usageType =
                                                                                    normalizeUsageType(
                                                                                        selectedAd
                                                                                            .options
                                                                                            ?.usage_type ||
                                                                                            'ad'
                                                                                    );
                                                                                if (
                                                                                    usageType ===
                                                                                        'decorative' &&
                                                                                    value !==
                                                                                        'inline'
                                                                                ) {
                                                                                    showNotice(
                                                                                        'warning',
                                                                                        '装饰组件仅支持“默认嵌入”容器。',
                                                                                        2600
                                                                                    );
                                                                                    handleUpdateOptions(
                                                                                        {
                                                                                            container_type:
                                                                                                'inline',
                                                                                        }
                                                                                    );
                                                                                    return;
                                                                                }
                                                                                if (
                                                                                    value !==
                                                                                    'inline'
                                                                                ) {
                                                                                    handleUpdateOptions(
                                                                                        {
                                                                                            container_type:
                                                                                                value,
                                                                                            placement_hook:
                                                                                                'footer',
                                                                                            placement_position:
                                                                                                '',
                                                                                            placement_paragraph:
                                                                                                0,
                                                                                        }
                                                                                    );
                                                                                    return;
                                                                                }
                                                                                handleUpdateOptions(
                                                                                    {
                                                                                        container_type:
                                                                                            value,
                                                                                    }
                                                                                );
                                                                            }}
                                                                            help="容器决定展示形态，投放位置仍由“投放”页签控制。"
                                                                        />
                                                                        <SelectControl
                                                                            label="容器模式"
                                                                            value={
                                                                                containerStyle.mode ||
                                                                                'boxed'
                                                        }
                                                        options={[
                                                            {
                                                                label: '包裹容器',
                                                                value: 'boxed',
                                                            },
                                                            {
                                                                label: '原始输出',
                                                                value: 'raw',
                                                            },
                                                        ]}
                                                        onChange={(
                                                            value
                                                        ) =>
                                                            handleUpdateContainerStyle(
                                                                {
                                                                    mode: value,
                                                                }
                                                            )
                                                        }
                                                        disabled={!isExpertMode}
                                                        help={
                                                            isExpertMode
                                                                ? ''
                                                                : '设计模式下仅允许包裹容器，切换到专家模式可修改。'
                                                        }
                                                    />
                                                                        <SelectControl
                                                                            label="渲染风格"
                                                                            value={
                                                                                selectedAd
                                                                                    .options
                                                                                    ?.render_profile ||
                                                                                'minimal'
                                                                            }
                                                                            options={[
                                                                                {
                                                                                    label: '平衡默认（minimal）',
                                                                                    value: 'minimal',
                                                                                },
                                                                                {
                                                                                    label: '跟随主题（inherit）',
                                                                                    value: 'inherit',
                                                                                },
                                                                                {
                                                                                    label: '隔离稳定（isolated）',
                                                                                    value: 'isolated',
                                                                                },
                                                                            ]}
                                                                            onChange={(
                                                                                value
                                                                            ) =>
                                                                                handleUpdateOptions(
                                                                                    {
                                                                                        render_profile:
                                                                                            value,
                                                                                    }
                                                                                )
                                                                            }
                                                                            help="跨站点模板推荐使用 isolated，最大限度降低主题样式干扰。"
                                                                        />
                                                    {containerStyle.mode ===
                                                        'raw' && (
                                                        <Notice
                                                            status="info"
                                                            isDismissible={
                                                                false
                                                            }
                                                        >
                                                            原始模式不会应用容器样式。
                                                        </Notice>
                                                    )}
                                                                    </>
                                                                );
                                                            }

                                                            if (
                                                                containerStyle.mode ===
                                                                'raw'
                                                            ) {
                                                                return (
                                                                    <Notice
                                                                        status="info"
                                                                        isDismissible={
                                                                            false
                                                                        }
                                                                    >
                                                                        当前为原始输出模式，尺寸/外观设置不会生效。
                                                                    </Notice>
                                                                );
                                                            }

                                                            if (
                                                                subTab.name ===
                                                                'size'
                                                            ) {
                                                                return (
                                                                    <div className="magick-ad-field">
                                                                        <RangeControl
                                                                            label="最大宽度"
                                                                            min={
                                                                                containerStyle.max_width_unit ===
                                                                                'px'
                                                                                    ? 320
                                                                                    : 50
                                                                            }
                                                                            max={
                                                                                containerStyle.max_width_unit ===
                                                                                'px'
                                                                                    ? 1200
                                                                                    : 100
                                                                            }
                                                                            value={
                                                                                containerStyle.max_width ??
                                                                                100
                                                                            }
                                                                            onChange={(
                                                                                value
                                                                            ) =>
                                                                                handleUpdateContainerStyle(
                                                                                    {
                                                                                        max_width:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                        <SelectControl
                                                                            label="宽度单位"
                                                                            value={
                                                                                containerStyle.max_width_unit ||
                                                                                '%'
                                                                            }
                                                                            options={[
                                                                                {
                                                                                    label: '百分比 (%)',
                                                                                    value: '%',
                                                                                },
                                                                                {
                                                                                    label: '像素 (px)',
                                                                                    value: 'px',
                                                                                },
                                                                            ]}
                                                                            onChange={(
                                                                                value
                                                                            ) =>
                                                                                handleUpdateContainerStyle(
                                                                                    {
                                                                                        max_width_unit:
                                                                                            value,
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                );
                                                            }

                                                            if (
                                                                subTab.name ===
                                                                'spacing'
                                                            ) {
                                                                return (
                                                                    <>
                                                                        <RangeControl
                                                                            label="上内边距"
                                                                            min={0}
                                                                            max={60}
                                                                            value={
                                                                                containerStyle.padding_top ??
                                                                                0
                                                                            }
                                                                            onChange={(
                                                                                value
                                                                            ) =>
                                                                                handleUpdateContainerStyle(
                                                                                    {
                                                                                        padding_top:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                        <RangeControl
                                                                            label="下内边距"
                                                                            min={0}
                                                                            max={60}
                                                                            value={
                                                                                containerStyle.padding_bottom ??
                                                                                0
                                                                            }
                                                                            onChange={(
                                                                                value
                                                                            ) =>
                                                                                handleUpdateContainerStyle(
                                                                                    {
                                                                                        padding_bottom:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                        <RangeControl
                                                                            label="左内边距"
                                                                            min={0}
                                                                            max={60}
                                                                            value={
                                                                                containerStyle.padding_left ??
                                                                                0
                                                                            }
                                                                            onChange={(
                                                                                value
                                                                            ) =>
                                                                                handleUpdateContainerStyle(
                                                                                    {
                                                                                        padding_left:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                        <RangeControl
                                                                            label="右内边距"
                                                                            min={0}
                                                                            max={60}
                                                                            value={
                                                                                containerStyle.padding_right ??
                                                                                0
                                                                            }
                                                                            onChange={(
                                                                                value
                                                                            ) =>
                                                                                handleUpdateContainerStyle(
                                                                                    {
                                                                                        padding_right:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                    </>
                                                                );
                                                            }

                                                            if (
                                                                subTab.name ===
                                                                'appearance'
                                                            ) {
                                                                return (
                                                                    <>
                                                                        <div className="magick-ad-field">
                                                                            <p className="magick-ad-field__label">
                                                                                背景色
                                                                            </p>
                                                                            <ColorPicker
                                                                                color={
                                                                                    containerStyle.background ||
                                                                                    'transparent'
                                                                                }
                                                                                onChangeComplete={(
                                                                                    value
                                                                                ) =>
                                                                                    handleUpdateContainerStyle(
                                                                                        {
                                                                                            background:
                                                                                                formatColorValue(
                                                                                                    value
                                                                                                ),
                                                                                        }
                                                                                    )
                                                                                }
                                                                                enableAlpha
                                                                            />
                                                                        </div>
                                                                        <RangeControl
                                                                            label="圆角"
                                                                            min={0}
                                                                            max={50}
                                                                            value={
                                                                                containerStyle.radius ??
                                                                                0
                                                                            }
                                                                            onChange={(
                                                                                value
                                                                            ) =>
                                                                                handleUpdateContainerStyle(
                                                                                    {
                                                                                        radius:
                                                                                            Number(
                                                                                                value
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                        <SelectControl
                                                                            label="阴影"
                                                                            value={
                                                                                containerStyle.shadow ||
                                                                                'none'
                                                                            }
                                                                            options={SHADOW_OPTIONS}
                                                                            onChange={(
                                                                                value
                                                                            ) =>
                                                                                handleUpdateContainerStyle(
                                                                                    {
                                                                                        shadow:
                                                                                            value,
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                    </>
                                                                );
                                                            }

                                                            return null;
                                                        }}
                                                    </TabPanel>
                                                    <Panel className="magick-ad-right-inline-panel">
                                                        <PanelBody
                                                            title="高级外观（角标）"
                                                            opened={containerAdvancedOpen}
                                                            onToggle={() =>
                                                                setContainerAdvancedOpen((prev) => !prev)
                                                            }
                                                        >
                                                            <p className="magick-ad-right-inline-note">
                                                                角标属于低频项，建议完成基础外观后再配置。
                                                            </p>
                                                            {renderContainerBadgeControls(
                                                                containerStyle
                                                            )}
                                                        </PanelBody>
                                                    </Panel>
                                                </>
                                            )}
                                        </PanelBody>
                                    </Panel>
                                );
                            }

                            if (tab.name === 'behavior') {
                                return (
                                    <Panel>
                                        <PanelBody
                                            title="核心交互"
                                            initialOpen
                                        >
                                            <SelectControl
                                                label="进场动画"
                                                value={
                                                    behavior.animation ||
                                                    'none'
                                                }
                                                options={
                                                    ANIMATION_OPTIONS
                                                }
                                                onChange={(value) =>
                                                    handleUpdateBehavior(
                                                        {
                                                            animation:
                                                                value,
                                                        }
                                                    )
                                                }
                                            />
                                            <ToggleControl
                                                label="显示关闭按钮"
                                                checked={Boolean(
                                                    behavior.close_button
                                                )}
                                                onChange={(value) =>
                                                    handleUpdateBehavior(
                                                        {
                                                            close_button:
                                                                value,
                                                        }
                                                    )
                                                }
                                                help="默认关闭。开启后在广告右上角显示关闭按钮。"
                                            />
                                            <RangeControl
                                                label="延迟显示（秒）"
                                                min={0}
                                                max={30}
                                                value={
                                                    behavior.delay ??
                                                    0
                                                }
                                                onChange={(value) =>
                                                    handleUpdateBehavior(
                                                        {
                                                            delay: Number(
                                                                value
                                                            ),
                                                        }
                                                    )
                                                }
                                                help="默认 0 秒。仅对弹窗/横栏/插屏生效。"
                                            />
                                        </PanelBody>
                                        <PanelBody
                                            title="高级交互"
                                            opened={behaviorAdvancedOpen}
                                            onToggle={() =>
                                                setBehaviorAdvancedOpen((prev) => !prev)
                                            }
                                        >
                                            {!isExpertMode && (
                                                <Notice status="info" isDismissible={false}>
                                                    切换到专家模式可配置 ESC 关闭、遮罩关闭与锁滚动。
                                                </Notice>
                                            )}
                                            {isExpertMode && (
                                                <>
                                                    <ToggleControl
                                                        label="ESC 关闭"
                                                        checked={
                                                            behavior.close_on_esc !==
                                                            false
                                                        }
                                                        onChange={(value) =>
                                                            handleUpdateBehavior(
                                                                {
                                                                    close_on_esc:
                                                                        value,
                                                                }
                                                            )
                                                        }
                                                        help="默认开启。弹窗/横栏可用，按 ESC 关闭。"
                                                    />
                                                    <ToggleControl
                                                        label="点击遮罩关闭"
                                                        checked={
                                                            behavior.close_on_overlay !==
                                                            false
                                                        }
                                                        onChange={(value) =>
                                                            handleUpdateBehavior(
                                                                {
                                                                    close_on_overlay:
                                                                        value,
                                                                }
                                                            )
                                                        }
                                                        help="默认开启。仅弹窗/插屏有效，点击遮罩关闭。"
                                                    />
                                                    <ToggleControl
                                                        label="打开时锁定滚动"
                                                        checked={Boolean(
                                                            behavior.lock_scroll
                                                        )}
                                                        onChange={(value) =>
                                                            handleUpdateBehavior(
                                                                {
                                                                    lock_scroll:
                                                                        value,
                                                                }
                                                            )
                                                        }
                                                        help="默认关闭。仅弹窗/插屏可用，打开时锁定页面滚动。"
                                                    />
                                                </>
                                            )}
                                        </PanelBody>
                                    </Panel>
                                );
                            }

                            return (
                                <Panel>
                                    <PanelBody
                                        title="核心投放"
                                        initialOpen
                                    >
                                        {!isInlineContainer && (
                                            <Notice
                                                status="info"
                                                isDismissible={false}
                                            >
                                                当前容器为“非嵌入”模式，展示位置将固定在页脚输出。
                                            </Notice>
                                        )}
                                        {renderPlacementRulesControls({
                                            includeValidation: true,
                                            includePlacementCompact: true,
                                        })}
                                    </PanelBody>
                                    {!isSidebarPlacement && (
                                        <PanelBody
                                            title={renderPanelTitleWithSummary(
                                                '高级规则',
                                                advancedRulesSummary
                                            )}
                                            opened={
                                                placementAdvancedOpen === 'design'
                                            }
                                            onToggle={() =>
                                                setPlacementAdvancedOpen((prev) =>
                                                    prev === 'design'
                                                        ? null
                                                        : 'design'
                                                )
                                            }
                                        >
                                            {renderPlacementRulesControls({
                                                includeAudience: true,
                                                includeNode: isExpertMode,
                                                includeFrequency: true,
                                                behavior,
                                            })}
                                        </PanelBody>
                                    )}
                                    {isSidebarPlacement && (
                                        <div className="magick-ad-right-advanced-entry">
                                            <div className="magick-ad-right-advanced-entry__title">
                                                高级规则已迁移
                                            </div>
                                            <p className="magick-ad-right-advanced-entry__desc">
                                                不影响广告外观预览的设置项（如频控、优先级/权重、设备登录与节点规则）已迁移到弹窗。
                                            </p>
                                            <p className="magick-ad-right-advanced-entry__meta">
                                                {advancedPlacementSummary}
                                            </p>
                                            <Button
                                                variant="secondary"
                                                onClick={() =>
                                                    setPlacementModalOpen(true)
                                                }
                                            >
                                                打开高级投放设置
                                            </Button>
                                        </div>
                                    )}
                                </Panel>
                            );
                        }}
                    </TabPanel>
                )}
            </div>
        </div>
            </>
        );
    };

    const toolbarActions = selectedAd ? (
        <div className="magick-ad-toolbar-actions">
            <div className="magick-ad-toolbar-actions__primary">
                <Button
                    className="magick-ad-toolbar-toggle magick-ad-toolbar-toggle--text"
                    icon={megaphone}
                    label="投放设置"
                    variant="tertiary"
                    onClick={() => setPlacementModalOpen(true)}
                >
                    投放
                </Button>
                <Button
                    className="magick-ad-toolbar-toggle magick-ad-toolbar-toggle--text"
                    icon={calendar}
                    label="发布与排期"
                    variant="tertiary"
                    onClick={() => {
                        setPublishModalOpen(true);
                    }}
                >
                    排期
                </Button>
            </div>
            <DropdownMenu
                className="magick-ad-toolbar-actions__more"
                icon={moreHorizontal}
                label="高级工具"
                toggleProps={{
                    variant: 'tertiary',
                    className: 'magick-ad-toolbar-toggle',
                }}
            >
                {({ onClose }) => (
                    <MenuGroup>
                        <MenuItem
                            icon={globe}
                            onClick={() => {
                                onClose();
                                setPreviewModalOpen(true);
                            }}
                        >
                            预览设置
                        </MenuItem>
                        <MenuItem
                            icon={megaphone}
                            onClick={() => {
                                onClose();
                                setPlacementModalOpen(true);
                            }}
                        >
                            投放设置
                        </MenuItem>
                        <MenuItem
                            icon={calendar}
                            onClick={() => {
                                onClose();
                                setPublishModalOpen(true);
                            }}
                        >
                            发布与排期
                        </MenuItem>
                    </MenuGroup>
                )}
            </DropdownMenu>
        </div>
    ) : null;

    const handleCloseSettings = () => {
        setSettingsOpen(false);
        fetchSystemSettings();
    };

    const applyDisplayLevel = (nextLevelRaw) => {
        const nextLevel = normalizeDisplayLevel(nextLevelRaw);
        setDisplayLevel(nextLevel);
        if (typeof window === 'undefined') {
            return nextLevel;
        }
        try {
            window.localStorage?.setItem(SETTINGS_LEVEL_STORAGE_KEY, nextLevel);
        } catch (err) {
            // ignore storage errors
        }
        if (window.MagickAD) {
            window.MagickAD.settingsLevel = nextLevel;
        }
        window.dispatchEvent(
            new CustomEvent('magick-ad-display-level-updated', {
                detail: { level: nextLevel },
            })
        );
        return nextLevel;
    };

    const handleDisplayLevelQuickChange = (nextLevelRaw) => {
        const nextLevel = normalizeDisplayLevel(nextLevelRaw);
        if (nextLevel === displayLevel || displayLevelSaving) {
            return;
        }
        const prevLevel = displayLevel;
        applyDisplayLevel(nextLevel);
        setDisplayLevelSaving(true);
        apiFetch({
            path: '/magick-ad/v1/system-settings',
            method: 'POST',
            data: { settings_level: nextLevel },
        })
            .then(() => {
                showNotice(
                    'success',
                    `显示级别已切换为“${DISPLAY_LEVEL_LABELS[nextLevel]}”，刷新后台后左侧菜单会同步更新。`,
                    2600
                );
            })
            .catch((err) => {
                applyDisplayLevel(prevLevel);
                const message =
                    err?.data?.message ||
                    err?.message ||
                    '显示级别更新失败，请重试。';
                showNotice('error', message, 4000);
            })
            .finally(() => {
                setDisplayLevelSaving(false);
            });
    };

    const toolbarMiddle = selectedAd ? (
        <TemplateActions
            variant="toolbar"
            onOpen={() => openTemplateLibrary(resolvedCreativeType)}
            onSave={() => openSaveTemplate(resolvedCreativeType)}
        />
    ) : null;

    const rightSidebarTabs = [
        { name: 'runtime', title: '运行条件' },
        { name: 'publish', title: '发布排期' },
        { name: 'placement', title: '投放设置' },
    ];
    const resolvedRightSidebarTab = rightSidebarTabs.some(
        (tab) => tab.name === rightSidebarTab
    )
        ? rightSidebarTab
        : 'placement';

    const rightSidebar = selectedAd ? (
        <div className="magick-ad-right-stack">
            {renderRightSaveBar()}
            {renderRightPrioritySummary()}
            <Card className="magick-ad-right-panel">
                <CardBody>
                    <TabPanel
                        className="magick-ad-right-tabs magick-ad-right-tabs--primary"
                        tabs={rightSidebarTabs}
                        initialTabName={resolvedRightSidebarTab}
                        onSelect={(name) => setRightSidebarTab(name)}
                        key={`right-${resolvedRightSidebarTab}`}
                    >
                        {(tab) => {
                            if (tab.name === 'runtime') {
                                return (
                                    <div className="magick-ad-right-section magick-ad-right-section--runtime">
                                        {renderRuntimeSummaryBar({
                                            compact: true,
                                            showTitle: false,
                                            showActions: runtimeDetailsOpen,
                                            showDetails: runtimeDetailsOpen,
                                            detailsOpen: runtimeDetailsOpen,
                                            onToggleDetails: () =>
                                                setRuntimeDetailsOpen((prev) => !prev),
                                        })}
                                    </div>
                                );
                            }
                            if (tab.name === 'publish') {
                                return renderPublishSection({
                                    compactHeader: true,
                                });
                            }
                            return renderPlacementSection({
                                variant: 'sidebar',
                            });
                        }}
                    </TabPanel>
                </CardBody>
            </Card>
        </div>
    ) : (
        <Card>
            <CardBody>
                <Notice status="info" isDismissible={false}>
                    请先选择一个广告组。
                </Notice>
            </CardBody>
        </Card>
    );

    const headerContextText = selectedAd
        ? `当前广告：${selectedAd.name || '未命名广告组'} · 位置 ${resolvePlacementLabel(
              selectedAd.options || {}
          )}`
        : '请选择一个广告组开始配置。';

    return (
        <div className="magick-ad-config">
            <div
                className={`magick-ad-header ${
                    headerCollapsed ? 'is-collapsed' : ''
                }`}
            >
                <div className="magick-ad-header__left">
                    <div className="magick-ad-header__breadcrumb">
                        <a
                            className="magick-ad-header__crumb"
                            href="admin.php?page=magick-ad"
                        >
                            {branding.name}
                        </a>
                        <span className="magick-ad-header__crumb-sep">/</span>
                        <a
                            className="magick-ad-header__crumb"
                            href="admin.php?page=magick-ad"
                        >
                            广告配置
                        </a>
                    </div>
                    {!headerCollapsed && (
                        <>
                            <div className="magick-ad-header__title-row">
                                <h1 className="magick-ad-header__title">
                                    {branding.name}
                                </h1>
                                {window?.MagickAD?.buildVersion && (
                                    <span className="magick-ad-header__badge">
                                        v{window.MagickAD.buildVersion}
                                    </span>
                                )}
                            </div>
                            <p className="description">
                                {branding.tagline}
                            </p>
                            <p className="magick-ad-header__context">
                                {headerContextText}
                            </p>
                        </>
                    )}
                </div>
                <div className="magick-ad-header__actions">
                    <Button
                        className="magick-ad-header__btn magick-ad-header__btn--icon"
                        icon={headerCollapsed ? chevronDown : chevronUp}
                        variant="tertiary"
                        onClick={() =>
                            setHeaderCollapsed((prev) => !prev)
                        }
                        label={headerCollapsed ? '展开头部' : '收起头部'}
                        showTooltip
                    />
                    <div className="magick-ad-header__level">
                        <span className="magick-ad-header__level-badge">
                            {DISPLAY_LEVEL_LABELS[displayLevel] || '简洁'}
                        </span>
                        <DropdownMenu
                            className="magick-ad-header__more"
                            icon={moreHorizontal}
                            label="更多操作"
                            toggleProps={{
                                variant: 'secondary',
                                className:
                                    'magick-ad-header__btn magick-ad-header__btn--icon',
                            }}
                        >
                            {({ onClose }) => (
                                <>
                                <MenuGroup>
                                    <MenuItem
                                        disabled={displayLevelSaving}
                                        onClick={() => {
                                            onClose();
                                            handleDisplayLevelQuickChange('simple');
                                        }}
                                    >
                                        切换到简洁
                                    </MenuItem>
                                    <MenuItem
                                        disabled={displayLevelSaving}
                                        onClick={() => {
                                            onClose();
                                            handleDisplayLevelQuickChange('advanced');
                                        }}
                                    >
                                        切换到高级
                                    </MenuItem>
                                    <MenuItem
                                        disabled={displayLevelSaving}
                                        onClick={() => {
                                            onClose();
                                            handleDisplayLevelQuickChange('lab');
                                        }}
                                    >
                                        切换到实验室
                                    </MenuItem>
                                </MenuGroup>
                                <MenuGroup>
                                    {!isSimpleLevel && (
                                        <MenuItem
                                            icon={external}
                                            onClick={() => {
                                                onClose();
                                                const url = window?.MagickAD?.diagnoseUrl || '';
                                                if (url) {
                                                    window.open(url, '_blank', 'noopener');
                                                }
                                            }}
                                        >
                                            诊断
                                        </MenuItem>
                                    )}
                                    <MenuItem
                                        icon={cog}
                                        onClick={() => {
                                            onClose();
                                            setSettingsOpen(true);
                                        }}
                                    >
                                        系统设置
                                    </MenuItem>
                                </MenuGroup>
                                </>
                            )}
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {notice && (
                <Notice
                    status={notice.status}
                    isDismissible
                    onRemove={clearNotice}
                >
                    {notice.message}
                </Notice>
            )}

            {isLoading && <Notice status="info">正在加载配置…</Notice>}
            {error && (
                <Notice status="error" isDismissible>
                    {error.message || '请求失败'}
                </Notice>
            )}
            <Layout
                adData={selectedAd}
                creativeType={selectedAd?.options?.creative_type || 'image'}
                containerType={selectedAd?.options?.container_type || 'inline'}
                devicePreview={devicePreview}
                previewTarget={previewTarget}
                previewLogin={previewLogin}
                previewUsePage={previewUsePage}
                onPreviewUsePageChange={setPreviewUsePage}
                onCreativeChange={(value) =>
                    selectedAd && handleUpdateOptions({ creative_type: value })
                }
                onContainerChange={(value) => {
                    if (!selectedAd) {
                        return;
                    }
                    const usageType = normalizeUsageType(
                        selectedAd.options?.usage_type || 'ad'
                    );
                    if (usageType === 'decorative' && value !== 'inline') {
                        showNotice(
                            'warning',
                            '装饰组件仅支持“默认嵌入”容器。',
                            2600
                        );
                        handleUpdateOptions({
                            container_type: 'inline',
                        });
                        return;
                    }
                    if (value !== 'inline') {
                        handleUpdateOptions({
                            container_type: value,
                            placement_hook: 'footer',
                            placement_position: '',
                            placement_paragraph: 0,
                        });
                        return;
                    }
                    handleUpdateOptions({
                        container_type: value,
                    });
                }}
                onDevicePreviewChange={setDevicePreview}
                onUpdateRule={(key, value) =>
                    selectedAd && handleUpdateOptions({ [key]: value })
                }
                toolbarActions={toolbarActions}
                toolbarMiddle={toolbarMiddle}
                leftSidebar={leftSidebar}
                rightSidebar={rightSidebar}
                contentPanels={contentPanels}
            />

            {publishModalOpen && selectedAd && (
                <Modal
                    title="发布与排期"
                    className="magick-ad-modal magick-ad-config-modal"
                    onRequestClose={() => setPublishModalOpen(false)}
                >
                    {renderPublishModalSection()}
                </Modal>
            )}

            {placementModalOpen && selectedAd && (
                <Modal
                    title="高级投放设置"
                    className="magick-ad-modal magick-ad-config-modal magick-ad-drawer-modal"
                    onRequestClose={() => setPlacementModalOpen(false)}
                >
                    <div
                        className="magick-ad-drawer-modal__content"
                        ref={placementDrawerBodyRef}
                        onScroll={(event) =>
                            setPlacementDrawerScrollTop(
                                event.currentTarget.scrollTop
                            )
                        }
                    >
                        {renderPlacementSection({ variant: 'full' })}
                    </div>
                </Modal>
            )}

            {previewModalOpen && selectedAd && (
                <Modal
                    title="预览设置"
                    className="magick-ad-modal magick-ad-config-modal"
                    onRequestClose={() => setPreviewModalOpen(false)}
                >
                    {renderPreviewControls()}
                </Modal>
            )}

            {templateModalOpen && (
                <Suspense fallback={<Spinner />}>
                    <TemplateLibraryModal
                        isOpen={templateModalOpen}
                        type={templateType}
                        showVisualTemplateType={
                            displayLevel !== 'simple' && isBlockEditorEnabled
                        }
                        templates={templateLibrary}
                        selected={templateSelection}
                        categories={templateCategories}
                        onUpdateCategories={updateTemplateCategories}
                        favoriteIds={favoriteIds}
                        pinnedIds={pinnedIds}
                        onAddCategory={addTemplateCategory}
                        onRemoveCategory={removeTemplateCategory}
                        onToggleSelect={handleToggleTemplateSelect}
                        onToggleFavorite={toggleFavorite}
                        onTogglePinned={togglePinned}
                        onBulkFavorite={bulkFavorite}
                        onBulkPinned={bulkPinned}
                        onClearFavorites={clearFavorites}
                        onClearPins={clearPins}
                        onRestorePreferences={restorePreferences}
                        onApply={handleApplyTemplate}
                        onImport={handleImportTemplates}
                        onExport={handleExportTemplates}
                        onClose={() => setTemplateModalOpen(false)}
                    />
                </Suspense>
            )}

            <Suspense fallback={null}>
                <BuildProbe />
            </Suspense>

            {saveTemplateOpen && (
                <Modal
                    title="存为模板"
                    onRequestClose={() => setSaveTemplateOpen(false)}
                    className="magick-ad-modal magick-ad-rename-modal"
                >
                    <TextControl
                        label="模板名称"
                        value={saveTemplateName}
                        onChange={setSaveTemplateName}
                        placeholder="请输入模板名称"
                    />
                    <SelectControl
                        label="模板分类"
                        value={saveTemplateCategory || 'uncategorized'}
                        options={[
                            { label: '未分类', value: 'uncategorized' },
                            ...(templateCategories || []).map((item) => ({
                                label: item.name,
                                value: item.name,
                            })),
                            { label: '新建分类…', value: 'new' },
                        ]}
                        onChange={(value) => {
                            setSaveTemplateCategory(value);
                            if (value !== 'new') {
                                setSaveTemplateCategoryName('');
                            }
                        }}
                    />
                    {saveTemplateCategory === 'new' && (
                        <TextControl
                            label="新建分类名称"
                            value={saveTemplateCategoryName}
                            onChange={setSaveTemplateCategoryName}
                            placeholder="输入分类名称"
                        />
                    )}
                    <div className="magick-ad-confirm-actions">
                        <Button
                            variant="secondary"
                            onClick={() => setSaveTemplateOpen(false)}
                        >
                            取消
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirmSaveTemplate}
                        >
                            保存模板
                        </Button>
                    </div>
                </Modal>
            )}

            {pickerConfirmOpen && (
                <Modal
                    title="确认节点"
                    onRequestClose={() => setPickerConfirmOpen(false)}
                    className="magick-ad-modal magick-ad-rename-modal"
                >
                    <SelectControl
                        label="定位方式"
                        value={pickerType}
                        options={[
                            { label: 'ID', value: 'id' },
                            { label: 'Class', value: 'class' },
                        ]}
                        onChange={(value) => setPickerType(value)}
                    />
                    <TextControl
                        label="节点值"
                        value={pickerValue}
                        onChange={(value) => setPickerValue(value.trim())}
                        help={
                            pickerType === 'id'
                                ? pickerId
                                    ? `可用 ID: #${pickerId}`
                                    : 'ID 不带 #'
                                : pickerClasses.length
                                  ? `可用 Class: ${pickerClasses
                                        .map((item) => `.${item}`)
                                        .join(' ')}`
                                  : 'Class 不带 .'
                        }
                    />
                    {pickerLabel && (
                        <Notice status="info" isDismissible={false}>
                            已选元素：{pickerLabel}
                        </Notice>
                    )}
                    <div className="magick-ad-confirm-actions">
                        <Button
                            variant="secondary"
                            onClick={() => setPickerConfirmOpen(false)}
                        >
                            取消
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                if (!pickerValue) {
                                    showNotice('error', '请输入节点值', 2000);
                                    return;
                                }
                                handleUpdateOptions({
                                    node_target_type: pickerType,
                                    node_target_value: pickerValue,
                                });
                                setPickerConfirmOpen(false);
                                showNotice('success', '已更新节点', 2000);
                            }}
                        >
                            确认
                        </Button>
                    </div>
                </Modal>
            )}

            {deleteTarget && (
                <Modal
                    title="确认删除广告组"
                    onRequestClose={() => setDeleteTarget(null)}
                    className="magick-ad-modal magick-ad-confirm-modal"
                >
                    <p>
                        确认删除“{deleteTarget.name || '未命名广告组'}”吗？
                        删除后无法恢复。
                    </p>
                    <div className="magick-ad-confirm-actions">
                        <Button
                            variant="secondary"
                            onClick={() => setDeleteTarget(null)}
                        >
                            取消
                        </Button>
                        <Button
                            variant="primary"
                            isDestructive
                            onClick={() => {
                                const targetId = deleteTarget.id;
                                setDeleteTarget(null);
                                removeAdGroup(targetId);
                                if (selectedId === targetId) {
                                    setSelectedId(null);
                                }
                                handleSaveWithSlotCheck()
                                    .then(() => {
                                        showNotice(
                                            'success',
                                            '广告组已删除',
                                            2000
                                        );
                                    })
                                    .catch((err) => {
                                        const message =
                                            err?.data?.message ||
                                            err?.message ||
                                            '删除失败，请检查网络或权限设置。';
                                        showNotice('error', message, 4000);
                                        fetchFromDB();
                                    });
                            }}
                        >
                            确认删除
                        </Button>
                    </div>
                </Modal>
            )}

            {renameTarget && (
                <Modal
                    title="修改广告名称"
                    onRequestClose={() => setRenameTarget(null)}
                    className="magick-ad-modal magick-ad-rename-modal"
                >
                    <TextControl
                        label="广告名称"
                        value={renameValue}
                        onChange={setRenameValue}
                        placeholder="请输入广告名称"
                    />
                    <div className="magick-ad-confirm-actions">
                        <Button
                            variant="secondary"
                            onClick={() => setRenameTarget(null)}
                        >
                            取消
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                const targetId = renameTarget.id;
                                updateAdGroup(targetId, {
                                    name: renameValue.trim(),
                                });
                                setRenameTarget(null);
                                handleSaveWithSlotCheck()
                                    .then(() => {
                                        showNotice('success', '名称已更新', 2000);
                                    })
                                    .catch((err) => {
                                        const message =
                                            err?.data?.message ||
                                            err?.message ||
                                            '保存失败，请检查网络或权限设置。';
                                        showNotice('error', message, 4000);
                                    });
                            }}
                        >
                            保存
                        </Button>
                    </div>
                </Modal>
            )}

            {settingsOpen && (
                <Modal
                    title="系统与调试设置"
                    className="magick-ad-modal magick-ad-settings-modal"
                    onRequestClose={handleCloseSettings}
                >
                    <TabPanel
                        className="magick-ad-settings-tabs"
                        tabs={[
                            { name: 'system', title: '系统设置' },
                            { name: 'consent', title: '同意与合规' },
                            { name: 'insert', title: '插入入口' },
                            ...(!isSimpleLevel
                                ? [
                                      {
                                          name: 'experiments',
                                          title: '实验与高级',
                                      },
                                      { name: 'debug', title: '调试设置' },
                                  ]
                                : []),
                        ]}
                        initialTabName="system"
                    >
                        {(tab) => (
                            <div className="magick-ad-settings-body">
                                <Suspense fallback={<Spinner />}>
                                    {tab.name === 'system' ? (
                                        <SystemSettingsPanel
                                            onNotice={showNotice}
                                        />
                                    ) : tab.name === 'consent' ? (
                                        <ConsentPanel onNotice={showNotice} />
                                    ) : tab.name === 'insert' ? (
                                        <InsertHelpPanel />
                                    ) : tab.name === 'experiments' ? (
                                        <ExperimentsPanel
                                            onNotice={showNotice}
                                        />
                                    ) : tab.name === 'debug' ? (
                                        <DebugPanel onNotice={showNotice} />
                                    ) : null}
                                </Suspense>
                            </div>
                        )}
                    </TabPanel>
                </Modal>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

        </div>
    );
};
export default AdsConfig;
