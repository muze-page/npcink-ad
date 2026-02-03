export type TrackEvent = 'impression' | 'click';

export interface TrackPayload {
    adId: string;
    event: TrackEvent;
    sig?: string;
    sigTs?: string;
    sigRev?: string;
    slot?: string;
    position?: string;
    container?: string;
}

export interface TrackBatchItem {
    ad_id: string;
    event: TrackEvent;
    sig?: string;
    sig_ts?: string;
    sig_rev?: string;
    slot?: string;
    position?: string;
    container?: string;
}

export interface TrackConfig {
    restUrl?: string;
    nonce?: string;
    scriptUrl?: string;
    collectPageUrl?: boolean;
    hasConsent?: boolean;
    requireConsent?: boolean;
    batchSize?: number;
    batchInterval?: number;
    observeMutations?: boolean;
    dedupeScope?: 'ad' | 'placement';
}

export interface RenderCandidate {
    id: string;
    weight?: number;
    sig?: string;
    sig_ts?: string;
    sig_rev?: string;
}

export interface RenderArgs {
    slot?: string;
    position?: string;
    class?: string;
    container?: string;
    creative?: string;
}

export interface BehaviorConfig {
    renderUrl?: string;
    renderBatchUrl?: string;
    nonce?: string;
    requireConsent?: boolean | string | number;
    hasConsent?: boolean | string | number;
    consentGuardEnabled?: boolean | string | number;
    consentBannerEnabled?: boolean | string | number;
    consentBannerText?: string;
    consentBannerButton?: string;
    observeMutations?: boolean;
}

export type AdType = 'global' | 'targeted';
export type CreativeType = 'html' | 'image' | 'video' | 'block';
export type ContainerType =
    | 'inline'
    | 'popup'
    | 'banner'
    | 'floating'
    | 'interstitial';
export type DisplayMode = 'show' | 'random' | 'hide';
export type RandomStrategy = 'request' | 'session' | 'cookie';
export type HtmlMode = 'safe' | 'full';
export type EditorMode = 'quick' | 'design' | 'expert';
export type DeviceType = 'all' | 'mobile' | 'tablet' | 'desktop';
export type LoginType = 'all' | 'logged-in' | 'logged-out';
export type ShowPage =
    | 'all'
    | 'home'
    | 'posts'
    | 'pages'
    | 'category'
    | 'tag'
    | 'search'
    | '404'
    | 'author'
    | 'archive';
export type TargetType = '' | 'posts' | 'pages' | 'category' | 'tag' | 'author';
export type NodeTargetType = 'id' | 'class';
export type NodeInsert = 'append' | 'prepend' | 'before' | 'after';
export type NodeMatch = 'first' | 'nth' | 'all';
export type NodeFallback = 'hide' | 'footer';
export type ContainerMode = 'boxed' | 'raw';
export type MaxWidthUnit = '%' | 'px';
export type ShadowType = 'none' | 'soft' | 'float';
export type BadgeType = 'text' | 'image';
export type LayoutType = '' | 'centered';
export type AnimationType = 'none' | 'fade' | 'slide-up' | 'zoom';
export type FrequencyMode = 'none' | 'session' | 'day' | 'count';

export interface ImageAsset {
    id: number;
    url: string;
    alt: string;
}

export interface ContainerStyle {
    mode: ContainerMode;
    max_width: number;
    max_width_unit: MaxWidthUnit;
    reserve_height: number;
    padding_top: number;
    padding_right: number;
    padding_bottom: number;
    padding_left: number;
    background: string;
    radius: number;
    shadow: ShadowType;
    badge_enabled: boolean;
    badge_type: BadgeType;
    badge_text: string;
    badge_color: string;
    badge_image: ImageAsset;
    layout: LayoutType;
}

export interface BehaviorOptions {
    animation: AnimationType;
    close_button: boolean;
    close_on_esc: boolean;
    close_on_overlay: boolean;
    lock_scroll: boolean;
    frequency_mode: FrequencyMode;
    frequency_limit: number;
    delay: number;
}

export interface ImageSettings {
    watermark: boolean;
    radius: number;
    max_width: number;
    margin_top: number;
    margin_bottom: number;
    margin_left: number;
    margin_right: number;
}

export interface AdContent {
    html: string;
    blocks: string;
    video_url: string;
    link: string;
    link_target: boolean;
    link_rel?: string;
    cta_text: string;
    custom_html: string;
    custom_css: string;
    image: ImageAsset;
    container_style: ContainerStyle;
    behavior: BehaviorOptions;
    image_settings: ImageSettings;
}

export interface AdOptions {
    enabled: boolean;
    ad_type: AdType;
    creative_type: CreativeType;
    container_type: ContainerType;
    display_mode: DisplayMode;
    random_strategy: RandomStrategy;
    html_mode: HtmlMode;
    editor_mode: EditorMode;
    placement_hook: string;
    placement_position: string;
    placement_paragraph: number;
    show_page: ShowPage;
    device: DeviceType;
    login: LoginType;
    start_date: string;
    end_date: string;
    target_type: TargetType;
    target_ids: number[];
    priority: number;
    weight: number;
    node_target_type: NodeTargetType;
    node_target_value: string;
    node_insert: NodeInsert;
    node_match: NodeMatch;
    node_index: number;
    node_fallback: NodeFallback;
    node_compact: boolean;
    render_require_consent?: boolean;
}

export interface Ad {
    id: string;
    name?: string;
    status?: string;
    date?: string;
    options: AdOptions;
    content: AdContent;
}

export interface Slot {
    id: string;
    label: string;
    ad_ids: string[];
    weights: number[];
    limit: number;
}

export interface StoreState {
    ads: Ad[];
    slots: Slot[];
    isLoading: boolean;
    isSaving: boolean;
    error: unknown;
    addAdGroup: (type: AdType) => void;
    removeAdGroup: (id: string) => void;
    updateAdGroup: (id: string, updates: Partial<Ad>) => void;
    setSlots: (slots: Slot[]) => void;
    addSlot: () => void;
    updateSlot: (index: number, updates: Partial<Slot>) => void;
    removeSlot: (index: number) => void;
    saveToDB: () => Promise<unknown>;
    fetchFromDB: () => Promise<Ad[]>;
}
