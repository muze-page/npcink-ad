<?php

namespace MagickAD\Utils;

if (!defined('ABSPATH')) {
    exit;
}

enum TrackingStrategy: string {
    case Request = 'request';
    case Session = 'session';
    case Cookie = 'cookie';
    case User = 'user';

    public static function from_value($value): self {
        $value = is_string($value) ? $value : '';
        return match ($value) {
            self::Request->value => self::Request,
            self::Session->value => self::Session,
            self::Cookie->value => self::Cookie,
            self::User->value => self::User,
            default => self::Session,
        };
    }
}
