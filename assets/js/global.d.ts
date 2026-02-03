import type { BehaviorConfig, TrackConfig } from './types';

declare global {
    interface Window {
        MagickADBehavior?: BehaviorConfig;
        MagickADTrack?: TrackConfig;
        MagickADTrackLoaded?: boolean;
        MagickADInteractivity?: {
            open: (ad: HTMLElement | null) => void;
            close: (ad: HTMLElement | null) => void;
            initAd: (ad: HTMLElement | null) => void;
            initAll: () => void;
            isActive: boolean;
        };
        wp?: {
            interactivity?: unknown;
        };
    }
}

export {};
