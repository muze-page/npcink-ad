export type TrackEvent =
    | 'impression'
    | 'click'
    | 'video_play'
    | 'video_pause'
    | 'video_complete'
    | 'conversion'
    | (string & {});

export interface TrackPayload {
    adId: string;
    event: TrackEvent;
    sig?: string;
    sigTs?: string;
    sigRev?: string;
    variantId?: string;
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
    variant_id?: string;
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
    allowBeacon?: boolean;
    credentials?: RequestCredentials;
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
export type HtmlSandboxMode = 'inherit' | 'enable' | 'disable';
export type RenderProfile = 'inherit' | 'minimal' | 'isolated';
export type HtmlLoadStrategy = 'immediate' | 'delay' | 'viewport';
export type VariantStrategy = 'request' | 'session';
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
export type VideoType = 'mp4' | 'embed';
export type VideoPreload = 'metadata' | 'auto' | 'none';
export type VideoAspect = 'auto' | '16:9' | '4:3' | '1:1' | '9:16' | 'custom';
export type VideoPosterMode = 'manual' | 'auto';
export type BlockAlign = '' | 'center';
export type BlockLayout = 'content' | 'stack' | 'split' | 'split-reverse';
export type BlockShadow = 'none' | 'soft' | 'float';
export type FontWeight =
    | 'normal'
    | 'medium'
    | 'semibold'
    | 'bold'
    | 'black';

export interface ImageAsset {
    id: number;
    url: string;
    alt: string;
    width?: number;
    height?: number;
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

export interface VideoSettings {
    type: VideoType;
    autoplay: boolean;
    autoplay_first: boolean;
    repeat_muted: boolean;
    muted: boolean;
    loop: boolean;
    controls: boolean;
    playsinline: boolean;
    preload: VideoPreload;
    aspect_ratio: VideoAspect;
    aspect_ratio_custom: string;
    poster_mode: VideoPosterMode;
    poster: ImageAsset;
    fallback_text: string;
    track_events: boolean;
}

export interface BlockSettings {
    background: string;
    background_gradient: string;
    text_color: string;
    padding: number;
    radius: number;
    max_width: number;
    font_size: number;
    font_family: string;
    align: BlockAlign;
    background_image: ImageAsset;
    layout: BlockLayout;
    media_image: ImageAsset;
    heading: string;
    subheading: string;
    heading_size: number;
    heading_line_height: number;
    heading_weight: FontWeight;
    subheading_size: number;
    subheading_line_height: number;
    subheading_weight: FontWeight;
    cta_text: string;
    cta_link: string;
    cta_target: boolean;
    cta_text_color: string;
    cta_background: string;
    cta_radius: number;
    border_width: number;
    border_color: string;
    shadow: BlockShadow;
}

export interface ContentVariantPayload {
    html?: string;
    blocks?: string;
    video_url?: string;
}

export interface ContentVariant {
    id: string;
    label: string;
    weight: number;
    content: ContentVariantPayload;
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
    custom_js: string;
    html_script_allowlist: string[];
    html_script_blocklist: string[];
    html_runtime_vars: boolean;
    html_load_strategy: HtmlLoadStrategy;
    html_load_delay: number;
    html_placeholder_ratio?: string;
    variants_enabled: boolean;
    variants_strategy: VariantStrategy;
    variants: ContentVariant[];
    image: ImageAsset;
    container_style: ContainerStyle;
    behavior: BehaviorOptions;
    image_settings: ImageSettings;
    video_settings: VideoSettings;
    block_settings: BlockSettings;
}

export interface AdOptions {
    enabled: boolean;
    ad_type: AdType;
    creative_type: CreativeType;
    container_type: ContainerType;
    display_mode: DisplayMode;
    random_strategy: RandomStrategy;
    html_mode: HtmlMode;
    html_sandbox?: HtmlSandboxMode;
    render_profile?: RenderProfile;
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
