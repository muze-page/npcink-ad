/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./assets/js/Layout.js"
/*!*****************************!*\
  !*** ./assets/js/Layout.js ***!
  \*****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/chevron-left.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/chevron-right.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/close-small.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/desktop.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/fullscreen.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/globe.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/mobile.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/tablet.js");




const previewIcons = {
  desktop: _wordpress_icons__WEBPACK_IMPORTED_MODULE_6__["default"],
  tablet: _wordpress_icons__WEBPACK_IMPORTED_MODULE_10__["default"],
  mobile: _wordpress_icons__WEBPACK_IMPORTED_MODULE_9__["default"]
};
const Layout = ({
  adData = {},
  creativeType = 'image',
  containerType = 'inline',
  devicePreview = 'desktop',
  onDevicePreviewChange,
  onUpdateRule,
  leftSidebar,
  rightSidebar,
  contentPanels,
  preview,
  previewTarget,
  previewLogin = 'auto',
  previewUsePage = false,
  onPreviewUsePageChange,
  toolbarActions,
  toolbarMiddle
}) => {
  const iframeRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const editorRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const resizingRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(false);
  const [previewReady, setPreviewReady] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [splitRatio, setSplitRatio] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(0.45);
  const [splitLocked, setSplitLocked] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [previewCollapsed] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [leftCollapsed, setLeftCollapsed] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [rightCollapsed, setRightCollapsed] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const previewBody = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    var _behavior$delay;
    const content = adData?.content || {};
    const options = adData?.options || {};
    const containerStyle = content.container_style || {};
    const behavior = content.behavior || {};
    const wrapperStyle = {};
    if (containerStyle.max_width) {
      wrapperStyle.maxWidth = `${containerStyle.max_width}${containerStyle.max_width_unit || '%'}`;
      if (containerStyle.max_width_unit === 'px') {
        wrapperStyle.width = '100%';
      }
    }
    if (containerStyle.padding_top || containerStyle.padding_right || containerStyle.padding_bottom || containerStyle.padding_left) {
      wrapperStyle.padding = `${containerStyle.padding_top || 0}px ${containerStyle.padding_right || 0}px ${containerStyle.padding_bottom || 0}px ${containerStyle.padding_left || 0}px`;
    }
    if (containerStyle.background && containerStyle.background !== 'transparent') {
      wrapperStyle.background = containerStyle.background;
    }
    if (containerStyle.reserve_height) {
      wrapperStyle.minHeight = `${containerStyle.reserve_height}px`;
    }
    if (containerStyle.radius) {
      wrapperStyle.borderRadius = `${containerStyle.radius}px`;
    }
    if (containerStyle.shadow === 'soft') {
      wrapperStyle.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.08)';
    } else if (containerStyle.shadow === 'float') {
      wrapperStyle.boxShadow = '0 16px 28px rgba(0, 0, 0, 0.16)';
    }
    if (containerStyle.layout === 'centered') {
      wrapperStyle.display = 'flex';
      wrapperStyle.justifyContent = 'center';
      wrapperStyle.marginLeft = 'auto';
      wrapperStyle.marginRight = 'auto';
    }
    const wrapContent = inner => {
      if (containerStyle.mode === 'raw') {
        if (containerStyle.reserve_height) {
          return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-preview__html",
            style: {
              minHeight: `${containerStyle.reserve_height}px`
            }
          }, inner);
        }
        return inner;
      }
      return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-preview__html"
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-html-container",
        style: wrapperStyle
      }, containerStyle.badge_enabled && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, containerStyle.badge_type === 'image' && containerStyle.badge_image?.url ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
        className: "magick-ad-badge is-image"
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("img", {
        src: containerStyle.badge_image.url,
        alt: containerStyle.badge_image.alt || containerStyle.badge_text || '广告'
      })) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
        className: "magick-ad-badge",
        style: {
          background: containerStyle.badge_color || '#1d2327'
        }
      }, containerStyle.badge_text || '广告')), content.behavior?.close_button && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
        className: "magick-ad-close"
      }, "\xD7"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-html-content"
      }, inner)));
    };
    let inner = null;
    if (creativeType === 'html' && content.html) {
      inner = (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        dangerouslySetInnerHTML: {
          __html: content.html
        }
      });
    } else if (creativeType === 'image' && content.image?.url) {
      const settings = content.image_settings || {};
      const imageStyle = {};
      if (settings.radius) {
        imageStyle.borderRadius = `${settings.radius}px`;
      }
      if (settings.max_width) {
        imageStyle.maxWidth = `${settings.max_width}px`;
        imageStyle.width = '100%';
      }
      if (settings.margin_top) {
        imageStyle.marginTop = `${settings.margin_top}px`;
      }
      if (settings.margin_bottom) {
        imageStyle.marginBottom = `${settings.margin_bottom}px`;
      }
      if (settings.margin_left) {
        imageStyle.marginLeft = `${settings.margin_left}px`;
      }
      if (settings.margin_right) {
        imageStyle.marginRight = `${settings.margin_right}px`;
      }
      const imageNode = (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("img", {
        src: content.image.url,
        alt: content.image.alt || '',
        style: imageStyle
      });
      const wrappedImage = content.link ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("a", {
        href: content.link,
        target: content.link_target ? '_blank' : undefined,
        rel: content.link_target ? 'noopener noreferrer' : undefined
      }, imageNode) : imageNode;
      const cta = content.link && content.cta_text ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("a", {
        className: "magick-ad-preview__cta",
        href: content.link,
        target: content.link_target ? '_blank' : undefined,
        rel: content.link_target ? 'noopener noreferrer' : undefined
      }, content.cta_text) : null;
      inner = (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, wrappedImage, cta);
    } else if (creativeType === 'video' && content.video_url) {
      const settings = content.video_settings || {};
      const isEmbed = settings.type === 'embed';
      const ratio = settings.aspect_ratio === 'custom' && settings.aspect_ratio_custom ? settings.aspect_ratio_custom : settings.aspect_ratio || '16:9';
      const ratioStyle = ratio && ratio !== 'auto' ? {
        aspectRatio: ratio.replace(':', ' / ')
      } : undefined;
      const videoNode = isEmbed ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("iframe", {
        className: "magick-ad-preview__video-media",
        src: content.video_url,
        title: "video",
        frameBorder: "0",
        allowFullScreen: true
      }) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("video", {
        className: "magick-ad-preview__video-media",
        src: content.video_url,
        autoPlay: Boolean(settings.autoplay),
        muted: Boolean(settings.muted || settings.autoplay),
        loop: Boolean(settings.loop),
        controls: settings.controls !== false,
        playsInline: settings.playsinline !== false,
        preload: settings.preload || 'metadata',
        poster: settings.poster_mode === 'auto' ? undefined : settings.poster?.url || undefined
      }, settings.fallback_text || '');
      inner = (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: `magick-ad-preview__video ${ratio && ratio !== 'auto' ? 'is-ratio' : ''}`,
        style: ratioStyle
      }, videoNode);
    } else if (creativeType === 'block' && content.blocks) {
      const blockSettings = content.block_settings || {};
      const blockStyle = {};
      if (blockSettings.background_gradient) {
        blockStyle.backgroundImage = blockSettings.background_gradient;
      } else if (blockSettings.background && blockSettings.background !== 'transparent') {
        blockStyle.background = blockSettings.background;
      }
      if (blockSettings.text_color && blockSettings.text_color !== 'transparent') {
        blockStyle.color = blockSettings.text_color;
      }
      if (blockSettings.padding) {
        blockStyle.padding = `${blockSettings.padding}px`;
      }
      if (blockSettings.radius) {
        blockStyle.borderRadius = `${blockSettings.radius}px`;
      }
      if (blockSettings.border_width) {
        blockStyle.border = `${blockSettings.border_width}px solid ${blockSettings.border_color || '#d0d7e2'}`;
      }
      if (blockSettings.shadow === 'soft') {
        blockStyle.boxShadow = '0 18px 40px rgba(15,23,42,0.12)';
      } else if (blockSettings.shadow === 'float') {
        blockStyle.boxShadow = '0 30px 60px rgba(15,23,42,0.18)';
      }
      if (blockSettings.max_width) {
        blockStyle.maxWidth = `${blockSettings.max_width}px`;
      }
      if (blockSettings.align === 'center' || blockSettings.max_width) {
        blockStyle.marginLeft = 'auto';
        blockStyle.marginRight = 'auto';
      }
      if (blockSettings.font_size) {
        blockStyle.fontSize = `${blockSettings.font_size}px`;
      }
      if (blockSettings.font_family) {
        blockStyle.fontFamily = blockSettings.font_family;
      }
      if (blockSettings.background_image?.url) {
        blockStyle.backgroundImage = `url(${blockSettings.background_image.url})`;
        blockStyle.backgroundSize = 'cover';
        blockStyle.backgroundPosition = 'center';
      }
      const mediaUrl = blockSettings.media_image?.url;
      const mediaNode = mediaUrl ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-block__media"
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("img", {
        className: "magick-ad-block__media-img",
        src: mediaUrl,
        alt: blockSettings.media_image?.alt || ''
      })) : null;
      const headingStyle = {};
      if (blockSettings.heading_size) {
        headingStyle.fontSize = `${blockSettings.heading_size}px`;
      }
      if (blockSettings.heading_line_height) {
        headingStyle.lineHeight = blockSettings.heading_line_height;
      }
      if (blockSettings.heading_weight) {
        headingStyle.fontWeight = blockSettings.heading_weight;
      }
      const subheadingStyle = {};
      if (blockSettings.subheading_size) {
        subheadingStyle.fontSize = `${blockSettings.subheading_size}px`;
      }
      if (blockSettings.subheading_line_height) {
        subheadingStyle.lineHeight = blockSettings.subheading_line_height;
      }
      if (blockSettings.subheading_weight) {
        subheadingStyle.fontWeight = blockSettings.subheading_weight;
      }
      const headingNode = blockSettings.heading ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-block__heading",
        style: headingStyle
      }, blockSettings.heading) : null;
      const subheadingNode = blockSettings.subheading ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-block__subheading",
        style: subheadingStyle
      }, blockSettings.subheading) : null;
      const ctaStyle = {};
      if (blockSettings.cta_text_color) {
        ctaStyle.color = blockSettings.cta_text_color;
      }
      if (blockSettings.cta_background) {
        ctaStyle.background = blockSettings.cta_background;
      }
      if (blockSettings.cta_radius) {
        ctaStyle.borderRadius = `${blockSettings.cta_radius}px`;
      }
      const ctaNode = blockSettings.cta_text && blockSettings.cta_link ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("a", {
        className: "magick-ad-block__cta",
        href: blockSettings.cta_link,
        target: blockSettings.cta_target ? '_blank' : undefined,
        rel: blockSettings.cta_target ? 'noopener noreferrer' : undefined,
        style: ctaStyle
      }, blockSettings.cta_text) : null;
      const showMedia = blockSettings.layout && blockSettings.layout !== 'content' && mediaNode;
      inner = (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-preview__block",
        style: blockStyle
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: `magick-ad-block magick-ad-block--${blockSettings.layout || 'content'} ${blockSettings.layout === 'split-reverse' ? 'magick-ad-block--reverse' : ''}`
      }, blockSettings.layout === 'split-reverse' ? null : showMedia, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-block__content"
      }, headingNode, subheadingNode, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        dangerouslySetInnerHTML: {
          __html: content.blocks
        }
      }), ctaNode), blockSettings.layout === 'split-reverse' ? showMedia : null));
    }
    const customHtml = content.custom_html ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-preview__custom",
      dangerouslySetInnerHTML: {
        __html: content.custom_html
      }
    }) : null;
    if (!inner) {
      return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-preview__empty"
      }, "\u9884\u89C8\u533A\u57DF");
    }
    const displayMode = options.display_mode || 'show';
    if (displayMode === 'hide') {
      return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-preview__empty"
      }, "\u5F53\u524D\u8BBE\u7F6E\u4E3A\u201C\u9690\u85CF\u201D\uFF0C\u524D\u53F0\u5C06\u4E0D\u5C55\u793A\u8BE5\u5E7F\u544A\u3002");
    }
    const wrapped = wrapContent((0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, inner, customHtml));
    const animation = behavior.animation || 'none';
    const delay = (_behavior$delay = behavior.delay) !== null && _behavior$delay !== void 0 ? _behavior$delay : 0;
    const animationClass = animation && animation !== 'none' ? `magick-ad-anim--${animation}` : '';
    const unitStyle = delay > 0 ? {
      animationDelay: `${delay}s`
    } : undefined;
    const placementParts = [];
    const placement = {
      hook: options.placement_hook || '',
      position: options.placement_position || '',
      paragraph: Number(options.placement_paragraph || 0)
    };
    if (placement.hook === 'content') {
      if (placement.position === 'paragraph' && placement.paragraph < 1) {
        placement.paragraph = 2;
      }
    } else {
      placement.position = '';
      placement.paragraph = 0;
    }
    const placementLabel = (() => {
      if (placement.hook === 'node') return 'node';
      if (placement.hook === 'head') return 'head';
      if (placement.hook === 'body_top') return 'body_top';
      if (placement.hook === 'footer') return 'footer';
      if (placement.hook === 'comments_top') return 'comments_top';
      if (placement.hook === 'comments_bottom') return 'comments_bottom';
      if (placement.hook === 'comment_form_before') return 'comment_form_before';
      if (placement.hook === 'comment_form_after') return 'comment_form_after';
      if (placement.hook === 'content') {
        if (placement.position === 'before') return 'content_before';
        if (placement.position === 'after') return 'content_after';
        if (placement.position === 'paragraph') {
          return `paragraph_${placement.paragraph || 2}`;
        }
      }
      return '';
    })();
    if (options.ad_type === 'targeted') {
      placementParts.push(options.target_type || '未选择类型');
    } else {
      placementParts.push(options.show_page || 'all');
    }
    if (placementLabel) {
      placementParts.push(placementLabel);
    }
    if (displayMode === 'random') {
      placementParts.unshift('随机');
    } else {
      placementParts.unshift('展示');
    }
    return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: `magick-ad-preview__stage magick-ad-preview__stage--${containerType}`
    }, content.custom_css && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("style", null, content.custom_css), (containerType === 'popup' || containerType === 'interstitial') && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-preview__overlay"
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: `magick-ad-preview__unit magick-ad-preview__unit--${containerType} ${animationClass}`,
      style: unitStyle
    }, wrapped), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-preview__placement"
    }, placementParts.join(' · '), delay > 0 && ` · 延迟${delay}s`));
  }, [adData, creativeType, containerType]);
  const previewSrc = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    const previewUrl = window?.MagickAD?.previewUrl;
    const previewNonce = window?.MagickAD?.previewNonce;
    if (!previewUrl || !previewNonce || !adData?.id) {
      return '';
    }
    const baseUrl = previewTarget && typeof previewTarget === 'string' ? previewTarget.trim() : '';
    let url;
    try {
      url = new URL(baseUrl || previewUrl, window.location.origin);
    } catch (err) {
      url = new URL(previewUrl, window.location.origin);
    }
    if (url.origin !== window.location.origin) {
      url = new URL(previewUrl, window.location.origin);
    }
    url.searchParams.set('magick_ad_preview', '1');
    url.searchParams.set('magick_ad_preview_ad', adData.id);
    url.searchParams.set('magick_ad_preview_nonce', previewNonce);
    url.searchParams.set('magick_ad_preview_device', devicePreview);
    if (baseUrl || previewUsePage) {
      url.searchParams.set('magick_ad_preview_mode', 'page');
    }
    return url.toString();
  }, [adData?.id, devicePreview, previewTarget, previewUsePage]);
  const isPagePreview = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    if (previewUsePage) {
      return true;
    }
    if (!previewTarget || typeof previewTarget !== 'string') {
      return false;
    }
    return previewTarget.trim().length > 0;
  }, [previewTarget, previewUsePage]);
  const previewFrame = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    if (!previewSrc) {
      return previewBody;
    }
    return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: `magick-ad-preview-frame magick-ad-preview-frame--${devicePreview}`
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-preview-frame__viewport"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("iframe", {
      ref: iframeRef,
      title: "Magick AD \u9884\u89C8",
      src: previewSrc,
      loading: "lazy",
      onLoad: () => setPreviewReady(true)
    })));
  }, [previewBody, previewSrc, devicePreview]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    setPreviewReady(false);
  }, [previewSrc]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    const handleMessage = event => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const payload = event.data;
      if (!payload?.type) {
        return;
      }
      if (payload.type === 'MAGICK_AD_PREVIEW_READY') {
        setPreviewReady(true);
        return;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (!previewReady || !iframeRef.current?.contentWindow) {
      return;
    }
    const previewAd = {
      ...adData,
      options: {
        ...(adData?.options || {}),
        creative_type: creativeType,
        container_type: containerType
      }
    };
    const handler = window.setTimeout(() => {
      const messageType = 'MAGICK_AD_PREVIEW_UPDATE';
      iframeRef.current?.contentWindow?.postMessage({
        type: messageType,
        payload: {
          ad: previewAd,
          device: devicePreview,
          login: previewLogin
        }
      }, window.location.origin);
    }, 200);
    return () => window.clearTimeout(handler);
  }, [previewReady, adData, creativeType, containerType, devicePreview, previewLogin, isPagePreview]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (splitLocked || previewCollapsed) {
      return;
    }
    setSplitRatio(creativeType === 'html' ? 0.6 : 0.45);
  }, [creativeType, splitLocked, previewCollapsed]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    const handleMove = event => {
      if (!resizingRef.current || !editorRef.current) {
        return;
      }
      const rect = editorRef.current.getBoundingClientRect();
      const next = (event.clientX - rect.left) / Math.max(rect.width, 1);
      const clamped = Math.min(0.7, Math.max(0.32, next));
      setSplitRatio(clamped);
    };
    const handleUp = () => {
      if (!resizingRef.current) {
        return;
      }
      resizingRef.current = false;
      document.body.classList.remove('magick-ad-is-resizing');
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);
  const handleResizeStart = event => {
    event.preventDefault();
    if (!editorRef.current || previewCollapsed) {
      return;
    }
    resizingRef.current = true;
    setSplitLocked(true);
    document.body.classList.add('magick-ad-is-resizing');
  };
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: `magick-ad-layout ${leftCollapsed ? 'is-left-collapsed' : ''} ${rightCollapsed ? 'is-right-collapsed' : ''}`
  }, !leftCollapsed ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("aside", {
    className: "magick-ad-left"
  }, leftSidebar || (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h3", {
    className: "magick-ad-section-title"
  }, "\u5E7F\u544A\u5217\u8868"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-list"
  }, "\u5DE6\u4FA7\u5217\u8868\u533A\u57DF"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary"
  }, "\u65B0\u589E")))) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-collapse-rail is-left"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    className: "magick-ad-collapse-rail__button",
    icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_4__["default"],
    label: "\u5C55\u5F00\u5DE6\u4FA7\u680F",
    variant: "tertiary",
    onClick: () => setLeftCollapsed(false)
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "magick-ad-collapse-rail__label"
  }, "\u5C55\u5F00")), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("main", {
    className: "magick-ad-main"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Toolbar, {
    className: "magick-ad-toolbar",
    label: "\u7F16\u8F91\u5DE5\u5177"
  }, toolbarMiddle ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToolbarGroup, {
    className: "magick-ad-toolbar__group magick-ad-toolbar__middle"
  }, toolbarMiddle) : null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToolbarGroup, {
    className: "magick-ad-toolbar__actions"
  }, toolbarActions, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    className: "magick-ad-toolbar-toggle",
    icon: leftCollapsed && rightCollapsed ? _wordpress_icons__WEBPACK_IMPORTED_MODULE_5__["default"] : _wordpress_icons__WEBPACK_IMPORTED_MODULE_7__["default"],
    label: leftCollapsed && rightCollapsed ? '退出全屏' : '全屏',
    variant: "tertiary",
    onClick: () => {
      const collapse = !(leftCollapsed && rightCollapsed);
      setLeftCollapsed(collapse);
      setRightCollapsed(collapse);
    }
  }))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: `magick-ad-editor ${previewCollapsed ? 'is-preview-collapsed' : ''}`,
    ref: editorRef,
    style: {
      gridTemplateColumns: previewCollapsed ? 'minmax(0, 1fr) 12px 56px' : `${Math.round(splitRatio * 100)}% 12px minmax(0, 1fr)`
    }
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-editor-left"
  }, contentPanels || (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Panel, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
    title: "\u5185\u5BB9\u914D\u7F6E",
    initialOpen: true
  }, "\u5185\u5BB9\u914D\u7F6E\u533A\u57DF"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
    title: "\u6837\u5F0F\u81EA\u5B9A\u4E49"
  }, "\u6837\u5F0F\u81EA\u5B9A\u4E49\u533A\u57DF"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
    title: "\u52A8\u753B\u8BBE\u7F6E"
  }, "\u52A8\u753B\u8BBE\u7F6E\u533A\u57DF"))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-editor-resizer",
    role: "separator",
    "aria-label": "\u8C03\u6574\u7F16\u8F91\u533A\u4E0E\u9884\u89C8\u533A\u5BBD\u5EA6",
    onMouseDown: handleResizeStart,
    "aria-hidden": previewCollapsed,
    style: {
      pointerEvents: previewCollapsed ? 'none' : 'auto',
      opacity: previewCollapsed ? 0.4 : 1
    }
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: `magick-ad-editor-preview ${previewCollapsed ? 'is-collapsed' : ''}`
  }, previewCollapsed ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-preview-drawer"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-preview-drawer__handle"
  }, "\u9884\u89C8"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-preview-drawer__panel"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-preview"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-preview-toolbar",
    role: "group",
    "aria-label": "\u8BBE\u5907\u9884\u89C8"
  }, ['desktop', 'tablet', 'mobile'].map(device => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    key: device,
    icon: previewIcons[device],
    className: `magick-ad-preview-toolbar__btn ${devicePreview === device ? 'is-active' : ''}`,
    onClick: () => onDevicePreviewChange?.(device),
    "aria-pressed": devicePreview === device,
    label: device === 'desktop' ? '桌面' : device === 'tablet' ? '平板' : '手机'
  })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    className: `magick-ad-preview-toolbar__toggle ${previewUsePage ? 'is-active' : ''}`,
    icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_8__["default"],
    label: previewUsePage ? '退出真实页面预览' : '真实页面预览',
    "aria-label": previewUsePage ? '退出真实页面预览' : '真实页面预览',
    title: previewUsePage ? '退出真实页面预览' : '真实页面预览',
    onClick: () => onPreviewUsePageChange?.(!previewUsePage),
    "aria-pressed": previewUsePage
  })), previewToast, preview || previewFrame))) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-preview"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-preview-toolbar",
    role: "group",
    "aria-label": "\u8BBE\u5907\u9884\u89C8"
  }, ['desktop', 'tablet', 'mobile'].map(device => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    key: device,
    icon: previewIcons[device],
    className: `magick-ad-preview-toolbar__btn ${devicePreview === device ? 'is-active' : ''}`,
    onClick: () => onDevicePreviewChange?.(device),
    "aria-pressed": devicePreview === device,
    label: device === 'desktop' ? '桌面' : device === 'tablet' ? '平板' : '手机'
  })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    className: `magick-ad-preview-toolbar__toggle ${previewUsePage ? 'is-active' : ''}`,
    icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_8__["default"],
    label: previewUsePage ? '退出真实页面预览' : '真实页面预览',
    "aria-label": previewUsePage ? '退出真实页面预览' : '真实页面预览',
    title: previewUsePage ? '退出真实页面预览' : '真实页面预览',
    onClick: () => onPreviewUsePageChange?.(!previewUsePage),
    "aria-pressed": previewUsePage
  })), preview || previewFrame)))))), !rightCollapsed ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("aside", {
    className: "magick-ad-right"
  }, rightSidebar || (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h3", {
    className: "magick-ad-section-title"
  }, "\u6295\u653E\u89C4\u5219"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-rule-block"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u5C55\u793A\u9875\u9762",
    value: adData?.options?.show_page || 'all',
    options: [{
      label: '全站',
      value: 'all'
    }, {
      label: '仅首页',
      value: 'home'
    }, {
      label: '仅文章页',
      value: 'posts'
    }, {
      label: '仅单页',
      value: 'pages'
    }],
    onChange: value => onUpdateRule?.('show_page', value)
  })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-rule-block"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u8BBE\u5907\u9650\u5236",
    value: adData?.options?.device || 'all',
    options: [{
      label: '全部设备',
      value: 'all'
    }, {
      label: '仅移动端',
      value: 'mobile'
    }, {
      label: '仅桌面端',
      value: 'desktop'
    }],
    onChange: value => onUpdateRule?.('device', value)
  })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-rule-block"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u5C55\u793A\u4F4D\u7F6E",
    value: (() => {
      const hook = adData?.options?.placement_hook || '';
      const position = adData?.options?.placement_position || '';
      const paragraph = Number(adData?.options?.placement_paragraph || 0);
      if (hook === 'body_top') {
        return 'top';
      }
      if (hook === 'footer') {
        return 'bottom';
      }
      if (hook === 'content') {
        if (position === 'before') {
          return 'content_before';
        }
        if (position === 'after') {
          return 'content_after';
        }
        if (position === 'paragraph') {
          return paragraph >= 1 ? 'paragraph_3' : '';
        }
      }
      return '';
    })(),
    options: [{
      label: '顶部',
      value: 'top'
    }, {
      label: '内容前',
      value: 'content_before'
    }, {
      label: '位置第三段',
      value: 'paragraph_3'
    }, {
      label: '内容后',
      value: 'content_after'
    }, {
      label: '底部',
      value: 'bottom'
    }],
    onChange: value => {
      const updates = {
        placement_hook: '',
        placement_position: '',
        placement_paragraph: 0
      };
      switch (value) {
        case 'top':
          updates.placement_hook = 'body_top';
          break;
        case 'bottom':
          updates.placement_hook = 'footer';
          break;
        case 'content_before':
          updates.placement_hook = 'content';
          updates.placement_position = 'before';
          break;
        case 'content_after':
          updates.placement_hook = 'content';
          updates.placement_position = 'after';
          break;
        case 'paragraph_3':
          updates.placement_hook = 'content';
          updates.placement_position = 'paragraph';
          updates.placement_paragraph = 3;
          break;
        default:
          updates.placement_hook = '';
      }
      Object.entries(updates).forEach(([key, nextValue]) => onUpdateRule?.(key, nextValue));
    }
  }))))) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-collapse-rail is-right"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    className: "magick-ad-collapse-rail__button",
    icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_3__["default"],
    label: "\u5C55\u5F00\u53F3\u4FA7\u680F",
    variant: "tertiary",
    onClick: () => setRightCollapsed(false)
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "magick-ad-collapse-rail__label"
  }, "\u5C55\u5F00")));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Layout);

/***/ },

/***/ "./assets/js/components/BlockEditor.js"
/*!*********************************************!*\
  !*** ./assets/js/components/BlockEditor.js ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/block-editor */ "@wordpress/block-editor");
/* harmony import */ var _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/blocks */ "@wordpress/blocks");
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_blocks__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _wordpress_block_library__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @wordpress/block-library */ "@wordpress/block-library");
/* harmony import */ var _wordpress_block_library__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_wordpress_block_library__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__);






let coreBlocksRegistered = false;
const ensureCoreBlocks = () => {
  if (!coreBlocksRegistered) {
    (0,_wordpress_block_library__WEBPACK_IMPORTED_MODULE_4__.registerCoreBlocks)();
    coreBlocksRegistered = true;
  }
};
const BlockEditor = ({
  value,
  onChange
}) => {
  const [blocks, setBlocks] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => (0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_3__.parse)(value || ''));
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    ensureCoreBlocks();
  }, []);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    setBlocks((0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_3__.parse)(value || ''));
  }, [value]);
  const handleAddDefaultBlock = () => {
    const nextBlocks = [(0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_3__.createBlock)('core/paragraph', {
      placeholder: '输入内容…'
    })];
    setBlocks(nextBlocks);
    onChange((0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_3__.serialize)(nextBlocks));
  };
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-block-editor editor-styles-wrapper"
  }, blocks.length === 0 && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-block-editor__empty"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, "\u70B9\u51FB\u5F00\u59CB\u53EF\u89C6\u5316\u8BBE\u8BA1\uFF0C\u6216\u6DFB\u52A0\u4E00\u4E2A\u6BB5\u843D"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.Button, {
    variant: "secondary",
    onClick: handleAddDefaultBlock
  }, "\u6DFB\u52A0\u6BB5\u843D")), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_2__.BlockEditorProvider, {
    value: blocks,
    onChange: nextBlocks => {
      setBlocks(nextBlocks);
      onChange((0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_3__.serialize)(nextBlocks));
    },
    settings: {
      hasFixedToolbar: true,
      allowWideBlocks: false
    }
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_2__.BlockTools, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_2__.WritingFlow, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_2__.ObserveTyping, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_2__.BlockList, {
    renderAppender: _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_2__.BlockListAppender
  }))))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (BlockEditor);

/***/ },

/***/ "./assets/js/components/BuildProbe.js"
/*!********************************************!*\
  !*** ./assets/js/components/BuildProbe.js ***!
  \********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2__);



const formatTime = timestamp => {
  if (!timestamp) {
    return '';
  }
  const date = new Date(Number(timestamp) * 1000);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString();
};
const BuildProbe = () => {
  const [visible, setVisible] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    let mounted = true;
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2___default()({
      path: '/magick-ad/v1/debug'
    }).then(response => {
      if (!mounted) {
        return;
      }
      setVisible(Boolean(response?.build_probe));
    }).catch(() => {});
    const handler = event => {
      const next = Boolean(event?.detail?.build_probe);
      setVisible(next);
    };
    window.addEventListener('magick-ad-debug-updated', handler);
    return () => {
      mounted = false;
      window.removeEventListener('magick-ad-debug-updated', handler);
    };
  }, []);
  if (!visible) {
    return null;
  }
  const buildTime = window.MagickAD?.buildTime;
  const buildVersion = window.MagickAD?.buildVersion;
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-build-probe"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-build-probe__title"
  }, "Build"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-build-probe__meta"
  }, buildVersion ? `v${buildVersion}` : 'dev'), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-build-probe__time"
  }, formatTime(buildTime) || 'unknown'));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (BuildProbe);

/***/ },

/***/ "./assets/js/components/ClassicEditor.js"
/*!***********************************************!*\
  !*** ./assets/js/components/ClassicEditor.js ***!
  \***********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);


const CLASSIC_EDITOR_ID = 'magick_ad_classic_editor';
const CLASSIC_EDITOR_HOST_ID = 'magick-ad-classic-editor-host';
const ClassicEditor = ({
  value,
  onChange,
  active
}) => {
  const containerRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const hostRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const initializedRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(false);
  const editorRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (!containerRef.current || initializedRef.current) {
      return;
    }
    const host = document.getElementById(CLASSIC_EDITOR_HOST_ID);
    if (!host) {
      return;
    }
    hostRef.current = host;
    while (host.firstChild) {
      containerRef.current.appendChild(host.firstChild);
    }
    initializedRef.current = true;
    return () => {
      if (!hostRef.current || !containerRef.current) {
        return;
      }
      while (containerRef.current.firstChild) {
        hostRef.current.appendChild(containerRef.current.firstChild);
      }
    };
  }, []);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (!active) {
      return;
    }
    const ensureEditor = () => {
      let editor = window.tinymce?.get(CLASSIC_EDITOR_ID);
      if (!editor && window.tinymce?.execCommand) {
        try {
          window.tinymce.execCommand('mceAddEditor', true, CLASSIC_EDITOR_ID);
        } catch (err) {
          editor = null;
        }
        editor = window.tinymce?.get(CLASSIC_EDITOR_ID);
      }
      if (editor) {
        editor.show();
        editor.fire('ResizeEditor');
        const container = editor.getContainer?.();
        if (container) {
          container.style.minHeight = '220px';
        }
        if (editor.iframeElement) {
          editor.iframeElement.style.minHeight = '220px';
        }
        if (value !== editor.getContent()) {
          editor.setContent(value || '');
          editor.save();
        }
      }
      const textarea = document.getElementById(CLASSIC_EDITOR_ID);
      if (textarea && textarea.value !== (value || '')) {
        textarea.value = value || '';
      }
    };
    ensureEditor();
    const timer = window.setTimeout(ensureEditor, 80);
    return () => window.clearTimeout(timer);
  }, [active, value]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    const handleChange = () => {
      if (!active) {
        return;
      }
      const currentEditor = editorRef.current;
      if (currentEditor) {
        onChange(currentEditor.getContent());
        return;
      }
      const textarea = document.getElementById(CLASSIC_EDITOR_ID);
      if (textarea) {
        onChange(textarea.value || '');
      }
    };
    const bindEditor = () => {
      const currentEditor = window.tinymce?.get(CLASSIC_EDITOR_ID);
      if (!currentEditor || currentEditor === editorRef.current) {
        return;
      }
      editorRef.current = currentEditor;
      currentEditor.on('change keyup input undo redo', handleChange);
    };
    const interval = window.setInterval(bindEditor, 300);
    bindEditor();
    const textarea = document.getElementById(CLASSIC_EDITOR_ID);
    if (textarea) {
      textarea.addEventListener('input', handleChange);
    }
    return () => {
      window.clearInterval(interval);
      if (editorRef.current) {
        editorRef.current.off('change keyup input undo redo', handleChange);
        editorRef.current = null;
      }
      if (textarea) {
        textarea.removeEventListener('input', handleChange);
      }
    };
  }, [active, onChange]);
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: `magick-ad-classic-host ${active ? 'is-active' : 'is-hidden'}`,
    ref: containerRef
  });
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ClassicEditor);

/***/ },

/***/ "./assets/js/components/ImagePicker.js"
/*!*********************************************!*\
  !*** ./assets/js/components/ImagePicker.js ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);



const ImagePicker = ({
  value,
  onChange
}) => {
  const frameRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const handleOpen = () => {
    if (!window.wp?.media) {
      // eslint-disable-next-line no-console
      console.error('wp.media is not available.');
      return;
    }
    if (frameRef.current) {
      frameRef.current.open();
      return;
    }
    const frame = window.wp.media({
      title: '选择图片',
      button: {
        text: '使用此图片'
      },
      library: {
        type: 'image'
      },
      multiple: false
    });
    frame.on('select', () => {
      const attachment = frame.state().get('selection').first().toJSON();
      onChange({
        id: attachment.id,
        url: attachment.url,
        alt: attachment.alt,
        width: attachment.width,
        height: attachment.height
      });
    });
    frameRef.current = frame;
    frame.open();
  };
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-image-picker"
  }, value?.url ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-image-preview"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("img", {
    src: value.url,
    alt: value.alt || ''
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-image-actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    onClick: handleOpen,
    variant: "secondary"
  }, "\u66F4\u6362\u56FE\u7247"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    onClick: () => onChange({
      id: null,
      url: '',
      alt: '',
      width: 0,
      height: 0
    }),
    variant: "tertiary",
    isDestructive: true
  }, "\u79FB\u9664"))) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    onClick: handleOpen,
    variant: "secondary"
  }, "\u9009\u62E9\u56FE\u7247"));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ImagePicker);

/***/ },

/***/ "./assets/js/components/LinkPicker.js"
/*!********************************************!*\
  !*** ./assets/js/components/LinkPicker.js ***!
  \********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);



const LinkPicker = ({
  value,
  target,
  onChange
}) => {
  const proxyIdRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(`magick-ad-link-proxy-${Math.random().toString(36).slice(2)}`);
  const openLinkModal = () => {
    if (!window.wpLink || !window.jQuery) {
      return;
    }
    const proxyId = proxyIdRef.current;
    const previousActiveEditor = window.wpActiveEditor;
    const originalUpdate = window.wpLink.update;
    window.wpLink.update = () => {
      const attrs = window.wpLink.getAttrs();
      onChange({
        url: attrs?.href || '',
        target: attrs?.target === '_blank'
      });
      originalUpdate.call(window.wpLink);
    };
    window.jQuery(document).one('wplink-close', () => {
      window.wpLink.update = originalUpdate;
      window.wpActiveEditor = previousActiveEditor;
    });
    window.wpActiveEditor = proxyId;
    window.wpLink.textarea = window.jQuery(`#${proxyId}`);
    window.wpLink.open(proxyId, value || '', '');
  };
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-link-picker"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-link-picker__row"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-link-picker__field"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u8DF3\u8F6C\u94FE\u63A5",
    value: value || '',
    onChange: next => onChange({
      url: next,
      target
    })
  })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-link-picker__actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    onClick: openLinkModal
  }, "\u9009\u62E9\u94FE\u63A5"), value && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "tertiary",
    onClick: () => onChange({
      url: '',
      target: false
    })
  }, "\u6E05\u9664"))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
    label: "\u5728\u65B0\u6807\u7B7E\u9875\u4E2D\u6253\u5F00\u94FE\u63A5",
    checked: Boolean(target),
    onChange: next => onChange({
      url: value || '',
      target: next
    })
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("textarea", {
    id: proxyIdRef.current,
    style: {
      display: 'none'
    },
    defaultValue: value || ''
  }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (LinkPicker);

/***/ },

/***/ "./assets/js/components/TemplateActions.js"
/*!*************************************************!*\
  !*** ./assets/js/components/TemplateActions.js ***!
  \*************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__);


const TemplateActions = ({
  onOpen,
  onSave,
  variant = 'toolbar'
}) => {
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: `magick-ad-template-actions ${variant ? `is-${variant}` : ''}`
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
    variant: "secondary",
    onClick: onOpen
  }, "\u6A21\u677F\u5E93"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
    variant: "tertiary",
    onClick: onSave
  }, "\u5B58\u4E3A\u6A21\u677F"));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TemplateActions);

/***/ },

/***/ "./assets/js/components/TemplateCard.js"
/*!**********************************************!*\
  !*** ./assets/js/components/TemplateCard.js ***!
  \**********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);



const getLabel = template => {
  if (template.type === 'image') return '图片';
  if (template.type === 'video') return '视频';
  if (template.type === 'block') return '可视化';
  return '代码/HTML';
};
const getContainerLabel = template => {
  const type = template.containerType || 'inline';
  if (type === 'popup') return '弹窗';
  if (type === 'banner') return '横栏';
  if (type === 'floating') return '悬浮';
  if (type === 'interstitial') return '插屏';
  return '默认嵌入';
};
const TemplateThumbnail = ({
  template
}) => {
  const thumb = template.thumbnail || template.thumbnailUrl;
  if (thumb) {
    return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("img", {
      src: thumb,
      alt: template.name || template.title || '',
      className: "magick-ad-template-thumb"
    });
  }
  const container = template.containerType || 'inline';
  const creative = template.type || 'html';
  const showPlay = creative === 'video';
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("svg", {
    viewBox: "0 0 100 60",
    className: "magick-ad-template-thumb",
    "aria-hidden": "true"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "0",
    y: "0",
    width: "100",
    height: "60",
    fill: "#F8FAFC"
  }), container === 'popup' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "0",
    y: "0",
    width: "100",
    height: "60",
    fill: "#0F172A",
    opacity: "0.08"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "28",
    y: "14",
    width: "44",
    height: "32",
    rx: "3",
    fill: "#FFFFFF",
    stroke: "#CBD5E1"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "34",
    y: "20",
    width: "26",
    height: "4",
    rx: "2",
    fill: "#E2E8F0"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "34",
    y: "28",
    width: "18",
    height: "4",
    rx: "2",
    fill: "#E2E8F0"
  })), container === 'banner' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "8",
    y: "10",
    width: "70",
    height: "3",
    rx: "1.5",
    fill: "#E2E8F0"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "8",
    y: "16",
    width: "56",
    height: "3",
    rx: "1.5",
    fill: "#E2E8F0"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "0",
    y: "46",
    width: "100",
    height: "14",
    fill: "#FFFFFF",
    stroke: "#CBD5E1"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "8",
    y: "50",
    width: "40",
    height: "6",
    rx: "3",
    fill: "#2563EB",
    opacity: "0.6"
  })), container === 'floating' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "10",
    y: "12",
    width: "60",
    height: "4",
    rx: "2",
    fill: "#E2E8F0"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "10",
    y: "20",
    width: "48",
    height: "4",
    rx: "2",
    fill: "#E2E8F0"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "64",
    y: "34",
    width: "28",
    height: "18",
    rx: "3",
    fill: "#FFFFFF",
    stroke: "#CBD5E1"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "68",
    y: "40",
    width: "16",
    height: "4",
    rx: "2",
    fill: "#E2E8F0"
  })), container === 'interstitial' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "8",
    y: "8",
    width: "84",
    height: "44",
    rx: "4",
    fill: "#FFFFFF",
    stroke: "#CBD5E1"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "16",
    y: "16",
    width: "40",
    height: "4",
    rx: "2",
    fill: "#E2E8F0"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "16",
    y: "24",
    width: "28",
    height: "4",
    rx: "2",
    fill: "#E2E8F0"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "16",
    y: "34",
    width: "24",
    height: "6",
    rx: "3",
    fill: "#2563EB",
    opacity: "0.6"
  })), container === 'inline' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "10",
    y: "12",
    width: "70",
    height: "4",
    rx: "2",
    fill: "#E2E8F0"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "10",
    y: "20",
    width: "62",
    height: "4",
    rx: "2",
    fill: "#E2E8F0"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("rect", {
    x: "10",
    y: "30",
    width: "50",
    height: "10",
    rx: "3",
    fill: "#FFFFFF",
    stroke: "#CBD5E1"
  })), showPlay && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("polygon", {
    points: "48,24 62,30 48,36",
    fill: "#2563EB",
    opacity: "0.8"
  }), creative === 'html' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("text", {
    x: "10",
    y: "56",
    fontSize: "8",
    fill: "#94A3B8"
  }, "</>"));
};
const TemplateCard = ({
  template,
  isSelected,
  selectionMode,
  onApply,
  onToggleSelect,
  onToggleFavorite,
  onTogglePinned,
  isFavorite,
  isPinned
}) => {
  const [hovered, setHovered] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const tags = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    const list = [{
      label: getLabel(template),
      className: `magick-ad-template-tag magick-ad-template-tag--type-${template.type || 'html'}`
    }, {
      label: getContainerLabel(template),
      className: 'magick-ad-template-tag magick-ad-template-tag--soft'
    }];
    if (template.category) {
      list.push({
        label: template.category,
        className: 'magick-ad-template-tag magick-ad-template-tag--category',
        style: {
          background: template.categoryColor || '#F3F4F6'
        }
      });
    }
    return list;
  }, [template]);
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: `magick-ad-template-card-new ${isSelected ? 'is-selected' : ''}`,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false)
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-media"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(TemplateThumbnail, {
    template: template
  }), (hovered || isSelected) && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "primary",
    size: "small",
    onClick: () => selectionMode ? onToggleSelect?.(template.id) : onApply?.(template)
  }, selectionMode ? '选择' : '应用')), (selectionMode || isSelected) && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: `magick-ad-template-select ${hovered || isSelected ? 'is-visible' : ''}`
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CheckboxControl, {
    checked: isSelected,
    onChange: () => onToggleSelect?.(template.id),
    label: ""
  })), (hovered || isPinned || isFavorite) && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-corner-actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("button", {
    type: "button",
    className: `magick-ad-template-icon-btn ${isPinned ? 'is-active' : ''}`,
    "aria-label": "\u7F6E\u9876",
    onClick: () => onTogglePinned?.(template.id)
  }, "\u2318"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("button", {
    type: "button",
    className: `magick-ad-template-icon-btn ${isFavorite ? 'is-active' : ''}`,
    "aria-label": "\u6536\u85CF",
    onClick: () => onToggleFavorite?.(template.id)
  }, "\u2605"))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-body"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-title"
  }, template.name || template.title), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-tags"
  }, tags.map(tag => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    key: `${template.id}-${tag.label}`,
    className: tag.className,
    style: tag.style
  }, tag.label)))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TemplateCard);

/***/ },

/***/ "./assets/js/components/TemplateLibrary.js"
/*!*************************************************!*\
  !*** ./assets/js/components/TemplateLibrary.js ***!
  \*************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/icon/index.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/search.js");
/* harmony import */ var _TemplateCard__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./TemplateCard */ "./assets/js/components/TemplateCard.js");





const TemplateLibrary = ({
  templates,
  query,
  onQueryChange,
  creativeOptions,
  containerOptions,
  categoryOptions,
  creativeFilter,
  containerFilter,
  categoryFilter,
  onFilterChange,
  onlyFavorites,
  onToggleFavoritesOnly,
  selectionMode,
  onToggleSelectionMode,
  selectedIds,
  onApply,
  onToggleSelect,
  onImport,
  onOpenCategoryDrawer,
  onExportSelected,
  onClearSelection,
  favoriteIds,
  pinnedIds,
  onToggleFavorite,
  onTogglePinned,
  categories,
  onUpdateCategories
}) => {
  const [drawerOpen, setDrawerOpen] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const categoryTokens = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => (categories || []).map(item => item.name), [categories]);
  const updateCategoryTokens = tokens => {
    const normalized = Array.from(new Set(tokens.map(item => item.trim()).filter(Boolean)));
    const next = normalized.map(name => {
      const existing = (categories || []).find(item => item.name === name);
      return existing || {
        name,
        color: '#E7E9EE'
      };
    });
    onUpdateCategories?.(next);
  };
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-library"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-actions-row"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-actions-left"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    onClick: onImport
  }, "\u5BFC\u5165\u6A21\u677F"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    onClick: () => {
      setDrawerOpen(true);
      onOpenCategoryDrawer?.();
    }
  }, "\u5206\u7C7B\u8BBE\u7F6E")), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-actions-right"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: selectionMode ? 'primary' : 'secondary',
    onClick: onToggleSelectionMode
  }, selectionMode ? '退出选择' : '选择模式'))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-filter-row"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-search"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "magick-ad-template-search-icon"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_icons__WEBPACK_IMPORTED_MODULE_3__["default"], {
    icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_4__["default"],
    size: 16
  })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    type: "text",
    value: query,
    onChange: event => onQueryChange?.(event.target.value),
    placeholder: "\u641C\u7D22\u6A21\u677F..."
  })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-filter-group"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-segment"
  }, creativeOptions.map(option => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("button", {
    key: option.value,
    type: "button",
    className: `magick-ad-template-segment-btn ${creativeFilter === option.value ? 'is-active' : ''}`,
    onClick: () => onFilterChange?.('creative', option.value)
  }, option.label)))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-filter-select"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u5BB9\u5668",
    hideLabelFromVision: true,
    value: containerFilter,
    options: containerOptions,
    onChange: value => onFilterChange?.('container', value)
  })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-filter-select"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u5206\u7C7B",
    hideLabelFromVision: true,
    value: categoryFilter,
    options: categoryOptions,
    onChange: value => onFilterChange?.('category', value)
  })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-filter-toggle"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
    label: "\u4EC5\u6536\u85CF",
    checked: onlyFavorites,
    onChange: onToggleFavoritesOnly
  }))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-gallery"
  }, templates.map(template => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_TemplateCard__WEBPACK_IMPORTED_MODULE_5__["default"], {
    key: template.id,
    template: template,
    isSelected: selectedIds.includes(template.id),
    selectionMode: selectionMode,
    onApply: onApply,
    onToggleSelect: onToggleSelect,
    onToggleFavorite: onToggleFavorite,
    onTogglePinned: onTogglePinned,
    isFavorite: favoriteIds.includes(template.id),
    isPinned: pinnedIds.includes(template.id)
  }))), selectedIds.length > 0 && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-floating"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", null, "\u5DF2\u9009\u62E9 ", selectedIds.length, " \u4E2A\u6A21\u677F"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-floating-actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    onClick: onClearSelection
  }, "\u53D6\u6D88\u9009\u62E9"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "primary",
    onClick: onExportSelected
  }, "\u5BFC\u51FA\u9009\u4E2D"))), drawerOpen && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-drawer-overlay",
    onClick: () => setDrawerOpen(false)
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("aside", {
    className: `magick-ad-template-drawer-new ${drawerOpen ? 'is-open' : ''}`
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-drawer-header"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("strong", null, "\u5206\u7C7B\u7BA1\u7406"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "tertiary",
    onClick: () => setDrawerOpen(false)
  }, "\u5173\u95ED")), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.FormTokenField, {
    label: "\u5206\u7C7B\u6807\u7B7E",
    value: categoryTokens,
    onChange: updateCategoryTokens,
    help: "\u8F93\u5165\u56DE\u8F66\u6DFB\u52A0\u5206\u7C7B"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-category-preview"
  }, (categories || []).map(category => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    key: category.name,
    className: "magick-ad-template-category-pill"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "magick-ad-template-category-dot",
    style: {
      background: category.color || '#E7E9EE'
    }
  }), category.name)))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TemplateLibrary);

/***/ },

/***/ "./assets/js/components/TemplateLibraryModal.js"
/*!******************************************************!*\
  !*** ./assets/js/components/TemplateLibraryModal.js ***!
  \******************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _TemplateLibrary__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./TemplateLibrary */ "./assets/js/components/TemplateLibrary.js");




const TemplateLibraryModal = ({
  isOpen,
  type,
  templates,
  categories,
  selected,
  favoriteIds,
  pinnedIds,
  onAddCategory,
  onRemoveCategory,
  onUpdateCategories,
  onToggleSelect,
  onToggleFavorite,
  onTogglePinned,
  onBulkFavorite,
  onBulkPinned,
  onClearFavorites,
  onClearPins,
  onRestorePreferences,
  onApply,
  onImport,
  onExport,
  onClose
}) => {
  if (!isOpen) {
    return null;
  }
  const [containerFilter, setContainerFilter] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('all');
  const [creativeFilter, setCreativeFilter] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(type || 'all');
  const [categoryFilter, setCategoryFilter] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('all');
  const [query, setQuery] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('');
  const [onlyFavorites, setOnlyFavorites] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(false);
  const [selectionMode, setSelectionMode] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(false);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useEffect)(() => {
    if (type) {
      setCreativeFilter(type);
    }
  }, [type]);
  const safeTemplates = Array.isArray(templates) ? templates : [];
  const systemTemplates = safeTemplates.filter(item => item.source === 'core');
  const userTemplates = safeTemplates.filter(item => item.source === 'user');
  const derivedCategories = Array.from(new Set(safeTemplates.map(item => item.category).filter(item => item && item.trim())));
  const availableCategories = Array.isArray(categories) && categories.length > 0 ? categories : derivedCategories.map(name => ({
    name,
    color: '#E7E9EE'
  }));
  const categoryNames = availableCategories.map(item => item.name);
  const categoryColors = availableCategories.reduce((acc, item) => {
    if (item?.name) {
      acc[item.name] = item.color;
    }
    return acc;
  }, {});
  const hasUncategorized = safeTemplates.some(item => !item.category || !item.category.trim());
  const selectedIds = Array.isArray(selected) ? selected : [];
  const favoriteList = Array.isArray(favoriteIds) ? favoriteIds : [];
  const pinnedList = Array.isArray(pinnedIds) ? pinnedIds : [];
  const filterByCreative = list => {
    if (creativeFilter === 'all') {
      return list;
    }
    return list.filter(item => item.type === creativeFilter);
  };
  const filterByContainer = list => {
    if (containerFilter === 'all') {
      return list;
    }
    return list.filter(item => (item.containerType || 'inline') === containerFilter);
  };
  const filterByCategory = list => {
    if (categoryFilter === 'all') {
      return list;
    }
    if (categoryFilter === '未分类') {
      return list.filter(item => !item.category || !item.category.trim());
    }
    return list.filter(item => (item.category || '') === categoryFilter);
  };
  const filterByQuery = list => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return list;
    }
    return list.filter(item => {
      const name = (item.name || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      return name.includes(keyword) || desc.includes(keyword);
    });
  };
  const filterByFavorites = list => {
    if (!onlyFavorites) {
      return list;
    }
    return list.filter(item => favoriteList.includes(item.id));
  };
  const sortByPinned = list => {
    return [...list].sort((a, b) => {
      const pinA = pinnedList.includes(a.id) ? 1 : 0;
      const pinB = pinnedList.includes(b.id) ? 1 : 0;
      if (pinA !== pinB) {
        return pinB - pinA;
      }
      const favA = favoriteList.includes(a.id) ? 1 : 0;
      const favB = favoriteList.includes(b.id) ? 1 : 0;
      if (favA !== favB) {
        return favB - favA;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  };
  const applyCategoryColors = list => list.map(item => ({
    ...item,
    categoryColor: item.category ? categoryColors[item.category] || '#f3f4f6' : '#f3f4f6'
  }));
  const buildFilteredList = list => applyCategoryColors(sortByPinned(filterByFavorites(filterByQuery(filterByCategory(filterByContainer(filterByCreative(list)))))));
  const filteredPresets = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useMemo)(() => buildFilteredList(systemTemplates), [systemTemplates, creativeFilter, containerFilter, categoryFilter, query, onlyFavorites, favoriteList, pinnedList, availableCategories]);
  const filteredUsers = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useMemo)(() => buildFilteredList(userTemplates), [userTemplates, creativeFilter, containerFilter, categoryFilter, query, onlyFavorites, favoriteList, pinnedList, availableCategories]);
  const handleFilterChange = (group, value) => {
    if (group === 'creative') {
      setCreativeFilter(value);
    } else if (group === 'container') {
      setContainerFilter(value);
    } else if (group === 'category') {
      setCategoryFilter(value);
    }
  };
  const clearSelection = () => {
    selectedIds.forEach(id => onToggleSelect?.(id));
  };
  const renderLibrary = list => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_TemplateLibrary__WEBPACK_IMPORTED_MODULE_3__["default"], {
    templates: list,
    query: query,
    onQueryChange: setQuery,
    creativeOptions: [{
      label: '全部',
      value: 'all'
    }, {
      label: '代码/HTML',
      value: 'html'
    }, {
      label: '图片',
      value: 'image'
    }, {
      label: '视频',
      value: 'video'
    }, {
      label: '可视化',
      value: 'block'
    }],
    containerOptions: [{
      label: '全部',
      value: 'all'
    }, {
      label: '默认嵌入',
      value: 'inline'
    }, {
      label: '弹窗',
      value: 'popup'
    }, {
      label: '横栏',
      value: 'banner'
    }, {
      label: '悬浮',
      value: 'floating'
    }, {
      label: '插屏',
      value: 'interstitial'
    }],
    categoryOptions: [{
      label: '全部',
      value: 'all'
    }, ...categoryNames.map(item => ({
      label: item,
      value: item
    })), ...(hasUncategorized ? [{
      label: '未分类',
      value: '未分类'
    }] : [])],
    creativeFilter: creativeFilter,
    containerFilter: containerFilter,
    categoryFilter: categoryFilter,
    onFilterChange: handleFilterChange,
    onlyFavorites: onlyFavorites,
    onToggleFavoritesOnly: setOnlyFavorites,
    selectionMode: selectionMode,
    onToggleSelectionMode: () => setSelectionMode(prev => !prev),
    selectedIds: selectedIds,
    onApply: onApply,
    onToggleSelect: onToggleSelect,
    onImport: onImport,
    onOpenCategoryDrawer: () => {},
    onExportSelected: onExport,
    onClearSelection: clearSelection,
    favoriteIds: favoriteList,
    pinnedIds: pinnedList,
    onToggleFavorite: onToggleFavorite,
    onTogglePinned: onTogglePinned,
    categories: availableCategories,
    onUpdateCategories: onUpdateCategories
  }), list.length === 0 && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Notice, {
    status: "info",
    isDismissible: false
  }, "\u6682\u65E0\u6A21\u677F\u3002"));
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Modal, {
    title: "\u6A21\u677F\u5E93",
    onRequestClose: onClose,
    size: "large",
    className: "magick-ad-modal magick-ad-template-modal"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-template-shell"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.TabPanel, {
    className: "magick-ad-template-tabs",
    tabs: [{
      name: 'preset',
      title: '系统预设'
    }, {
      name: 'user',
      title: '我的模板'
    }]
  }, tab => tab.name === 'preset' ? renderLibrary(filteredPresets) : renderLibrary(filteredUsers))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TemplateLibraryModal);

/***/ },

/***/ "./assets/js/components/VideoPicker.js"
/*!*********************************************!*\
  !*** ./assets/js/components/VideoPicker.js ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);



const VideoPicker = ({
  value,
  onChange,
  compact = false
}) => {
  const frameRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const handleOpen = () => {
    if (!window.wp?.media) {
      // eslint-disable-next-line no-console
      console.error('wp.media is not available.');
      return;
    }
    if (frameRef.current) {
      frameRef.current.open();
      return;
    }
    const frame = window.wp.media({
      title: '选择视频',
      button: {
        text: '使用此视频'
      },
      library: {
        type: 'video'
      },
      multiple: false
    });
    frame.on('select', () => {
      const attachment = frame.state().get('selection').first().toJSON();
      onChange(attachment.url || '');
    });
    frameRef.current = frame;
    frame.open();
  };
  if (compact) {
    return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-video-picker is-compact"
    }, value ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-image-actions"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
      onClick: handleOpen,
      variant: "secondary"
    }, "\u66F4\u6362\u89C6\u9891"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
      onClick: () => onChange(''),
      variant: "tertiary",
      isDestructive: true
    }, "\u79FB\u9664")) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
      onClick: handleOpen,
      variant: "secondary"
    }, "\u4ECE\u5A92\u4F53\u5E93\u9009\u62E9"));
  }
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-video-picker"
  }, value ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-video-preview"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("video", {
    src: value,
    controls: true
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-image-actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    onClick: handleOpen,
    variant: "secondary"
  }, "\u66F4\u6362\u89C6\u9891"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    onClick: () => onChange(''),
    variant: "tertiary",
    isDestructive: true
  }, "\u79FB\u9664"))) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    onClick: handleOpen,
    variant: "secondary"
  }, "\u4ECE\u5A92\u4F53\u5E93\u9009\u62E9"));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (VideoPicker);

/***/ },

/***/ "./assets/js/constants/options.js"
/*!****************************************!*\
  !*** ./assets/js/constants/options.js ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ANIMATION_OPTIONS: () => (/* binding */ ANIMATION_OPTIONS),
/* harmony export */   DISPLAY_PAGE_OPTIONS: () => (/* binding */ DISPLAY_PAGE_OPTIONS),
/* harmony export */   GENERIC_POSITION_OPTIONS: () => (/* binding */ GENERIC_POSITION_OPTIONS),
/* harmony export */   POST_POSITION_OPTIONS: () => (/* binding */ POST_POSITION_OPTIONS),
/* harmony export */   SHADOW_OPTIONS: () => (/* binding */ SHADOW_OPTIONS),
/* harmony export */   TARGET_TYPE_OPTIONS: () => (/* binding */ TARGET_TYPE_OPTIONS),
/* harmony export */   getPositionOptions: () => (/* binding */ getPositionOptions),
/* harmony export */   getTargetEndpoint: () => (/* binding */ getTargetEndpoint),
/* harmony export */   isPostLikePage: () => (/* binding */ isPostLikePage),
/* harmony export */   normalizeTargetItem: () => (/* binding */ normalizeTargetItem)
/* harmony export */ });
/* harmony import */ var _wordpress_html_entities__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/html-entities */ "@wordpress/html-entities");
/* harmony import */ var _wordpress_html_entities__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_html_entities__WEBPACK_IMPORTED_MODULE_0__);

const DISPLAY_PAGE_OPTIONS = [{
  label: '全站',
  value: 'all'
}, {
  label: '仅首页',
  value: 'home'
}, {
  label: '仅文章页',
  value: 'posts'
}, {
  label: '仅单页',
  value: 'pages'
}, {
  label: '仅分类页',
  value: 'category'
}, {
  label: '仅标签页',
  value: 'tag'
}, {
  label: '仅搜索结果页',
  value: 'search'
}, {
  label: '仅404页',
  value: '404'
}, {
  label: '仅作者页',
  value: 'author'
}];
const GENERIC_POSITION_OPTIONS = [{
  label: 'Head (脚本/像素)',
  value: 'head'
}, {
  label: '顶部',
  value: 'top'
}, {
  label: '内容前',
  value: 'content_before'
}, {
  label: '内容后',
  value: 'content_after'
}, {
  label: '底部',
  value: 'bottom'
}, {
  label: '指定节点（ID / class）',
  value: 'node'
}];
const POST_POSITION_OPTIONS = [{
  label: 'Head (脚本/像素)',
  value: 'head'
}, {
  label: '顶部',
  value: 'top'
}, {
  label: '内容前',
  value: 'content_before'
}, {
  label: '文章顶部',
  value: 'post_top'
}, {
  label: '位置第三段',
  value: 'paragraph_3'
}, {
  label: '文章底部',
  value: 'post_bottom'
}, {
  label: '评论列表顶部',
  value: 'comments_top'
}, {
  label: '评论框上方',
  value: 'comment_form_before'
}, {
  label: '评论框下方',
  value: 'comment_form_after'
}, {
  label: '评论列表底部',
  value: 'comments_bottom'
}, {
  label: '内容后',
  value: 'content_after'
}, {
  label: '底部',
  value: 'bottom'
}, {
  label: '指定节点（ID / class）',
  value: 'node'
}];
const TARGET_TYPE_OPTIONS = [{
  label: '文章页面',
  value: 'posts'
}, {
  label: '单页',
  value: 'pages'
}, {
  label: '分类页',
  value: 'category'
}, {
  label: '标签页',
  value: 'tag'
}, {
  label: '作者页',
  value: 'author'
}];
const SHADOW_OPTIONS = [{
  label: '无',
  value: 'none'
}, {
  label: '轻微',
  value: 'soft'
}, {
  label: '悬浮',
  value: 'float'
}];
const ANIMATION_OPTIONS = [{
  label: '无',
  value: 'none'
}, {
  label: '淡入 (FadeIn)',
  value: 'fade'
}, {
  label: '上浮 (SlideUp)',
  value: 'slide-up'
}, {
  label: '缩放 (ZoomIn)',
  value: 'zoom'
}];
const isPostLikePage = page => page === 'posts' || page === 'pages';
const getPositionOptions = page => isPostLikePage(page) ? POST_POSITION_OPTIONS : GENERIC_POSITION_OPTIONS;
const getTargetEndpoint = type => {
  switch (type) {
    case 'posts':
      return 'posts';
    case 'pages':
      return 'pages';
    case 'category':
      return 'categories';
    case 'tag':
      return 'tags';
    case 'author':
      return 'users';
    default:
      return '';
  }
};
const normalizeTargetItem = (type, item) => {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const labelSource = type === 'posts' || type === 'pages' ? item.title?.rendered : item.name;
  const label = (0,_wordpress_html_entities__WEBPACK_IMPORTED_MODULE_0__.decodeEntities)(labelSource || item.slug || `#${item.id}`);
  return {
    id: Number(item.id),
    label
  };
};

/***/ },

/***/ "./assets/js/hooks/useNotice.js"
/*!**************************************!*\
  !*** ./assets/js/hooks/useNotice.js ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);

const useNotice = () => {
  const [notice, setNotice] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const timerRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const clearNotice = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setNotice(null);
  }, []);
  const showNotice = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)((status, message, timeout = 2500) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setNotice({
      status,
      message
    });
    if (timeout) {
      timerRef.current = window.setTimeout(() => {
        setNotice(null);
        timerRef.current = null;
      }, timeout);
    }
  }, []);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
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
    clearNotice
  };
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (useNotice);

/***/ },

/***/ "./assets/js/hooks/useTargeting.js"
/*!*****************************************!*\
  !*** ./assets/js/hooks/useTargeting.js ***!
  \*****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _constants_options__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../constants/options */ "./assets/js/constants/options.js");



const useTargeting = selectedAd => {
  const [targetItems, setTargetItems] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [targetSuggestions, setTargetSuggestions] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [targetLoading, setTargetLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const targetSearchTimerRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const targetRequestRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)(0);
  const targetCacheRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)({});
  const targetIdsKey = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    const ids = selectedAd?.options?.target_ids || [];
    return Array.isArray(ids) ? ids.join(',') : '';
  }, [selectedAd?.options?.target_ids]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!selectedAd || selectedAd.options?.ad_type !== 'targeted') {
      setTargetItems([]);
      return;
    }
    const targetType = selectedAd.options?.target_type;
    const ids = Array.isArray(selectedAd.options?.target_ids) ? selectedAd.options?.target_ids : [];
    if (!targetType || ids.length === 0) {
      setTargetItems([]);
      return;
    }
    const endpoint = (0,_constants_options__WEBPACK_IMPORTED_MODULE_2__.getTargetEndpoint)(targetType);
    if (!endpoint) {
      setTargetItems([]);
      return;
    }
    const requestId = ++targetRequestRef.current;
    setTargetLoading(true);
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
      path: `/wp/v2/${endpoint}?include=${ids.join(',')}&per_page=${Math.min(ids.length, 100)}`
    }).then(items => {
      if (requestId !== targetRequestRef.current) {
        return;
      }
      const normalized = Array.isArray(items) ? items.map(item => (0,_constants_options__WEBPACK_IMPORTED_MODULE_2__.normalizeTargetItem)(targetType, item)).filter(Boolean) : [];
      setTargetItems(normalized);
    }).catch(() => {
      if (requestId !== targetRequestRef.current) {
        return;
      }
      setTargetItems([]);
    }).finally(() => {
      if (requestId !== targetRequestRef.current) {
        return;
      }
      setTargetLoading(false);
    });
  }, [selectedAd?.id, selectedAd?.options?.target_type, targetIdsKey]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
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
    const endpoint = (0,_constants_options__WEBPACK_IMPORTED_MODULE_2__.getTargetEndpoint)(targetType);
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
        const path = targetType === 'author' ? `${pathBase}&who=authors` : pathBase;
        const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
          path,
          parse: false
        });
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
    fetchAll().then(items => {
      if (requestId !== targetRequestRef.current) {
        return;
      }
      const normalized = Array.isArray(items) ? items.map(item => (0,_constants_options__WEBPACK_IMPORTED_MODULE_2__.normalizeTargetItem)(targetType, item)).filter(Boolean) : [];
      targetCacheRef.current[targetType] = normalized;
      setTargetSuggestions(normalized);
    }).catch(() => {
      if (requestId !== targetRequestRef.current) {
        return;
      }
      setTargetSuggestions([]);
    }).finally(() => {
      if (requestId !== targetRequestRef.current) {
        return;
      }
      setTargetLoading(false);
    });
  }, [selectedAd?.id, selectedAd?.options?.target_type]);
  const handleTargetSearch = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(value => {
    if (targetSearchTimerRef.current) {
      window.clearTimeout(targetSearchTimerRef.current);
    }
    targetSearchTimerRef.current = window.setTimeout(() => {
      if (!selectedAd || selectedAd.options?.ad_type !== 'targeted') {
        return;
      }
      const targetType = selectedAd.options?.target_type;
      const endpoint = (0,_constants_options__WEBPACK_IMPORTED_MODULE_2__.getTargetEndpoint)(targetType);
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
        setTargetSuggestions(cached.filter(item => item.label.toLowerCase().includes(keyword)));
        return;
      }
      const requestId = ++targetRequestRef.current;
      setTargetLoading(true);
      const baseQuery = `per_page=20&search=${encodeURIComponent(value || '')}`;
      const path = targetType === 'author' ? `/wp/v2/${endpoint}?${baseQuery}&who=authors` : `/wp/v2/${endpoint}?${baseQuery}`;
      _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
        path
      }).then(items => {
        if (requestId !== targetRequestRef.current) {
          return;
        }
        const normalized = Array.isArray(items) ? items.map(item => (0,_constants_options__WEBPACK_IMPORTED_MODULE_2__.normalizeTargetItem)(targetType, item)).filter(Boolean) : [];
        setTargetSuggestions(normalized);
      }).catch(() => {
        if (requestId !== targetRequestRef.current) {
          return;
        }
        setTargetSuggestions([]);
      }).finally(() => {
        if (requestId !== targetRequestRef.current) {
          return;
        }
        setTargetLoading(false);
      });
    }, 320);
  }, [selectedAd]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
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
    handleTargetSearch
  };
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (useTargeting);

/***/ },

/***/ "./assets/js/hooks/useTemplateLibrary.js"
/*!***********************************************!*\
  !*** ./assets/js/hooks/useTemplateLibrary.js ***!
  \***********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/blocks */ "@wordpress/blocks");
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_blocks__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_data__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/data */ "@wordpress/data");
/* harmony import */ var _wordpress_data__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_data__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _wordpress_core_data__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @wordpress/core-data */ "@wordpress/core-data");
/* harmony import */ var _wordpress_core_data__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_wordpress_core_data__WEBPACK_IMPORTED_MODULE_4__);





const MAGICK_BLOCK = 'magick-ad/ad';
const FAVORITES_KEY = 'magick_ad_template_favorites';
const PINNED_KEY = 'magick_ad_template_pins';
const walkBlocks = (blocks, matcher) => {
  for (const block of blocks) {
    if (matcher(block)) {
      return block;
    }
    if (block.innerBlocks?.length) {
      const found = walkBlocks(block.innerBlocks, matcher);
      if (found) {
        return found;
      }
    }
  }
  return null;
};
const extractTemplateFromContent = content => {
  if (!content) {
    return null;
  }
  const blocks = (0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_2__.parse)(content);
  const magickBlock = walkBlocks(blocks, block => block.name === MAGICK_BLOCK);
  if (!magickBlock) {
    return null;
  }
  const attrs = magickBlock.attributes || {};
  const type = attrs.creativeType || 'html';
  const containerType = attrs.containerType || 'inline';
  const category = typeof attrs.templateCategory === 'string' ? attrs.templateCategory : '';
  if (type === 'image') {
    return {
      type,
      containerType,
      category,
      data: {
        image: {
          id: Number(attrs.imageId || 0),
          url: attrs.imageUrl || '',
          alt: attrs.imageAlt || ''
        },
        link: attrs.link || '',
        link_target: Boolean(attrs.linkTarget)
      }
    };
  }
  if (type === 'video') {
    return {
      type,
      containerType,
      category,
      data: {
        video_url: attrs.videoUrl || ''
      }
    };
  }
  if (type === 'block') {
    return {
      type,
      containerType,
      category,
      data: {
        blocks: attrs.blocks || ''
      }
    };
  }
  return {
    type: 'html',
    containerType,
    category,
    data: {
      html: attrs.html || ''
    }
  };
};
const extractTemplateFromContentLoose = content => {
  if (!content || typeof content !== 'string') {
    return null;
  }
  const match = content.match(/<!--\s*wp:magick-ad\/ad\s+({[\s\S]*?})\s*\/-->/i);
  if (!match || !match[1]) {
    return null;
  }
  try {
    const attrs = JSON.parse(match[1]);
    const type = attrs.creativeType || 'html';
    const containerType = attrs.containerType || 'inline';
    const category = typeof attrs.templateCategory === 'string' ? attrs.templateCategory : '';
    if (type === 'image') {
      return {
        type,
        containerType,
        category,
        data: {
          image: {
            id: Number(attrs.imageId || 0),
            url: attrs.imageUrl || '',
            alt: attrs.imageAlt || ''
          },
          link: attrs.link || '',
          link_target: Boolean(attrs.linkTarget)
        }
      };
    }
    if (type === 'video') {
      return {
        type,
        containerType,
        category,
        data: {
          video_url: attrs.videoUrl || ''
        }
      };
    }
    if (type === 'block') {
      return {
        type,
        containerType,
        category,
        data: {
          blocks: attrs.blocks || ''
        }
      };
    }
    return {
      type: 'html',
      containerType,
      category,
      data: {
        html: attrs.html || ''
      }
    };
  } catch (err) {
    return null;
  }
};
const buildPatternContent = (type, data, containerType = 'inline', category = '') => {
  const attrs = {
    creativeType: type,
    containerType
  };
  if (category) {
    attrs.templateCategory = category;
  }
  if (type === 'image') {
    attrs.imageId = data.image?.id || 0;
    attrs.imageUrl = data.image?.url || '';
    attrs.imageAlt = data.image?.alt || '';
    attrs.link = data.link || '';
    attrs.linkTarget = Boolean(data.link_target);
  } else if (type === 'video') {
    attrs.videoUrl = data.video_url || '';
  } else if (type === 'block') {
    attrs.blocks = data.blocks || '';
  } else {
    attrs.html = data.html || '';
  }
  return (0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_2__.serialize)([(0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_2__.createBlock)(MAGICK_BLOCK, attrs)]);
};
const useTemplateLibrary = ({
  selectedAd,
  getCreativeTemplateData,
  onApplyTemplate,
  showNotice
}) => {
  const [templateModalOpen, setTemplateModalOpen] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [templateType, setTemplateType] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)('image');
  const [templateLibrary, setTemplateLibrary] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [templateSelection, setTemplateSelection] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [templateCategories, setTemplateCategories] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [favoriteIds, setFavoriteIds] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [pinnedIds, setPinnedIds] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const fileInputRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const favoritesRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)([]);
  const pinsRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)([]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const storedFavorites = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || '[]');
      const storedPins = JSON.parse(window.localStorage.getItem(PINNED_KEY) || '[]');
      setFavoriteIds(Array.isArray(storedFavorites) ? storedFavorites : []);
      setPinnedIds(Array.isArray(storedPins) ? storedPins : []);
    } catch (err) {
      setFavoriteIds([]);
      setPinnedIds([]);
    }
  }, []);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(PINNED_KEY, JSON.stringify(pinnedIds));
  }, [pinnedIds]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    favoritesRef.current = favoriteIds;
  }, [favoriteIds]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    pinsRef.current = pinnedIds;
  }, [pinnedIds]);
  const loadTemplates = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async type => {
    let corePatterns = [];
    try {
      const patterns = (0,_wordpress_data__WEBPACK_IMPORTED_MODULE_3__.select)(_wordpress_core_data__WEBPACK_IMPORTED_MODULE_4__.store)?.getBlockPatterns?.();
      if (Array.isArray(patterns)) {
        corePatterns = patterns;
      } else {
        corePatterns = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
          path: '/wp/v2/block-patterns/patterns',
          method: 'GET'
        });
      }
    } catch (err) {
      corePatterns = [];
    }
    if ((!Array.isArray(corePatterns) || corePatterns.length === 0) && typeof window !== 'undefined' && Array.isArray(window.MagickAD?.patterns)) {
      corePatterns = window.MagickAD.patterns;
    }
    const variationTemplates = [];
    try {
      const variations = (0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_2__.getBlockVariations)(MAGICK_BLOCK) || [];
      variations.forEach(variation => {
        if (!variation || !variation.attributes) {
          return;
        }
        const content = (0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_2__.serialize)([(0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_2__.createBlock)(MAGICK_BLOCK, variation.attributes)]);
        const extracted = extractTemplateFromContent(content) || extractTemplateFromContentLoose(content);
        if (!extracted) {
          return;
        }
        variationTemplates.push({
          id: `variation-${variation.name || variation.title}`,
          name: variation.title || '模板变体',
          description: variation.description || '',
          source: 'core',
          content,
          ...extracted
        });
      });
    } catch (err) {
      // ignore variations
    }
    const systemTemplates = (corePatterns || []).filter(pattern => Array.isArray(pattern.categories) ? pattern.categories.includes('magick-ad') : false).map(pattern => {
      const extracted = extractTemplateFromContent(pattern.content) || extractTemplateFromContentLoose(pattern.content);
      if (!extracted) {
        return null;
      }
      return {
        id: pattern.name || pattern.title,
        name: pattern.title,
        description: pattern.description || '',
        source: 'core',
        content: pattern.content,
        ...extracted
      };
    }).filter(Boolean);
    let userTemplates = [];
    try {
      const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
        path: '/wp/v2/wp_block?per_page=100',
        method: 'GET'
      });
      const posts = Array.isArray(response) ? response : [];
      userTemplates = posts.map(post => {
        const content = post?.content?.raw || post?.content?.rendered || '';
        const extracted = extractTemplateFromContent(content) || extractTemplateFromContentLoose(content);
        if (!extracted) {
          return null;
        }
        return {
          id: `user-${post.id}`,
          name: post.title?.rendered || post.title || '',
          description: '',
          source: 'user',
          content,
          ...extracted
        };
      }).filter(Boolean);
    } catch (err) {
      userTemplates = [];
    }
    const merged = [...variationTemplates, ...systemTemplates, ...userTemplates];
    setTemplateLibrary(merged);
  }, []);
  const loadTemplateCategories = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async () => {
    try {
      const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
        path: '/magick-ad/v1/template-categories',
        method: 'GET'
      });
      const categories = Array.isArray(response?.categories) ? response.categories : [];
      setTemplateCategories(categories);
    } catch (err) {
      setTemplateCategories([]);
    }
  }, []);
  const loadTemplatePreferences = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async () => {
    try {
      const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
        path: '/magick-ad/v1/template-preferences',
        method: 'GET'
      });
      const favorites = Array.isArray(response?.favorites) ? response.favorites : [];
      const pins = Array.isArray(response?.pins) ? response.pins : [];
      setFavoriteIds(favorites);
      setPinnedIds(pins);
    } catch (err) {
      // fallback to local storage only
    }
  }, []);
  const openTemplateLibrary = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async type => {
    setTemplateType(type);
    setTemplateSelection([]);
    setTemplateModalOpen(true);
    await loadTemplateCategories();
    await loadTemplatePreferences();
    await loadTemplates(type);
  }, [loadTemplates, loadTemplateCategories, loadTemplatePreferences]);
  const updateTemplateCategories = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async categories => {
    const payload = Array.isArray(categories) ? categories : [];
    const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
      path: '/magick-ad/v1/template-categories',
      method: 'POST',
      data: {
        categories: payload
      }
    });
    const next = Array.isArray(response?.categories) ? response.categories : payload;
    setTemplateCategories(next);
    return next;
  }, []);
  const saveTemplatePreferences = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async (favorites, pins) => {
    try {
      await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
        path: '/magick-ad/v1/template-preferences',
        method: 'POST',
        data: {
          favorites,
          pins
        }
      });
    } catch (err) {
      // ignore
    }
  }, []);
  const updatePreferences = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)((favorites, pins) => {
    setFavoriteIds(favorites);
    setPinnedIds(pins);
    saveTemplatePreferences(favorites, pins);
  }, [saveTemplatePreferences]);
  const addTemplateCategory = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async name => {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return;
    }
    const current = Array.isArray(templateCategories) ? templateCategories : [];
    const exists = current.some(item => item?.name === trimmed);
    if (exists) {
      return;
    }
    const next = [...current, {
      name: trimmed,
      color: '#E7E9EE'
    }];
    await updateTemplateCategories(next);
  }, [templateCategories, updateTemplateCategories]);
  const removeTemplateCategory = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async name => {
    const current = Array.isArray(templateCategories) ? templateCategories : [];
    const next = current.filter(item => item?.name !== name);
    await updateTemplateCategories(next);
  }, [templateCategories, updateTemplateCategories]);
  const toggleFavorite = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(id => {
    const current = favoritesRef.current || [];
    const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
    updatePreferences(next, pinsRef.current || []);
  }, [updatePreferences]);
  const togglePinned = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(id => {
    const current = pinsRef.current || [];
    const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
    updatePreferences(favoritesRef.current || [], next);
  }, [updatePreferences]);
  const bulkFavorite = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)((ids, enable) => {
    const current = new Set(favoritesRef.current || []);
    ids.forEach(id => {
      if (enable) {
        current.add(id);
      } else {
        current.delete(id);
      }
    });
    updatePreferences(Array.from(current), pinsRef.current || []);
  }, [updatePreferences]);
  const bulkPinned = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)((ids, enable) => {
    const current = new Set(pinsRef.current || []);
    ids.forEach(id => {
      if (enable) {
        current.add(id);
      } else {
        current.delete(id);
      }
    });
    updatePreferences(favoritesRef.current || [], Array.from(current));
  }, [updatePreferences]);
  const clearFavorites = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    updatePreferences([], pinsRef.current || []);
  }, [updatePreferences]);
  const clearPins = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    updatePreferences(favoritesRef.current || [], []);
  }, [updatePreferences]);
  const restorePreferences = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)((favorites, pins) => {
    updatePreferences(Array.isArray(favorites) ? favorites : [], Array.isArray(pins) ? pins : []);
  }, [updatePreferences]);
  const saveTemplate = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async (type, name, category, containerType) => {
    if (!selectedAd) {
      return;
    }
    if (!name) {
      return;
    }
    const data = getCreativeTemplateData(type, selectedAd);
    try {
      const content = buildPatternContent(type, data, containerType, category);
      await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
        path: '/wp/v2/wp_block',
        method: 'POST',
        data: {
          title: name,
          status: 'publish',
          content
        }
      });
      await loadTemplates(type);
      showNotice?.('success', '模板已保存');
    } catch (err) {
      showNotice?.('error', err?.message || '模板保存失败');
      throw err;
    }
  }, [selectedAd, getCreativeTemplateData, loadTemplates, showNotice]);
  const handleApplyTemplate = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(template => {
    onApplyTemplate?.(template);
    setTemplateModalOpen(false);
  }, [onApplyTemplate]);
  const handleToggleTemplateSelect = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(id => {
    setTemplateSelection(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  }, []);
  const handleExportTemplates = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    const selected = templateLibrary.filter(item => templateSelection.includes(item.id));
    if (selected.length === 0) {
      return;
    }
    const payload = selected.map(item => ({
      title: item.name || '',
      content: item.content || ''
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `magick-templates-${templateType}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [templateLibrary, templateSelection, templateType]);
  const handleImportTemplates = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);
  const handleFileChange = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async event => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const templates = Array.isArray(json) ? json : [];
      const createTasks = templates.map(item => {
        if (!item?.content) {
          return null;
        }
        return _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
          path: '/wp/v2/wp_block',
          method: 'POST',
          data: {
            title: item.title || '模板',
            status: 'publish',
            content: item.content
          }
        });
      });
      await Promise.all(createTasks.filter(Boolean));
      await loadTemplates(templateType);
      showNotice?.('success', '模板导入完成');
    } catch (err) {
      showNotice?.('error', err?.message || '模板导入失败');
    }
  }, [loadTemplates, templateType, showNotice]);
  return {
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
    updateTemplateCategories,
    addTemplateCategory,
    removeTemplateCategory,
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
    handleFileChange
  };
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (useTemplateLibrary);

/***/ },

/***/ "./assets/js/index.css"
/*!*****************************!*\
  !*** ./assets/js/index.css ***!
  \*****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ },

/***/ "./assets/js/panels/ConsentPanel.js"
/*!******************************************!*\
  !*** ./assets/js/panels/ConsentPanel.js ***!
  \******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3__);




const DEFAULT_SETTINGS = {
  consent_guard_enabled: false,
  tracking_require_consent: false,
  consent_banner_enabled: true,
  consent_banner_text: '为了提供更好的体验，我们会使用必要的 Cookie/存储进行频控。',
  consent_banner_button: '同意'
};
const ConsentPanel = ({
  onNotice
}) => {
  const [settings, setSettings] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(DEFAULT_SETTINGS);
  const [loading, setLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [saving, setSaving] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    let mounted = true;
    setLoading(true);
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3___default()({
      path: '/magick-ad/v1/system-settings'
    }).then(response => {
      if (!mounted) {
        return;
      }
      setSettings({
        ...DEFAULT_SETTINGS,
        ...response
      });
      setLoading(false);
    }).catch(err => {
      if (!mounted) {
        return;
      }
      setError(err);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);
  const persist = next => {
    setSaving(true);
    setError(null);
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3___default()({
      path: '/magick-ad/v1/system-settings',
      method: 'POST',
      data: next
    }).then(response => {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...response
      });
      setSaving(false);
      onNotice?.('success', '同意与合规设置已更新');
    }).catch(err => {
      setSaving(false);
      setError(err);
      onNotice?.('error', err?.message || '设置更新失败');
    });
  };
  const updateSettings = (patch, persistNow = true) => {
    const next = {
      ...settings,
      ...patch
    };
    setSettings(next);
    if (persistNow) {
      persist(next);
    }
  };
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-field__label"
  }, "\u540C\u610F\u4E0E\u5408\u89C4"), error && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "error",
    isDismissible: true
  }, error.message || '设置加载失败'), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
    label: "\u542F\u7528\u540C\u610F/\u5408\u89C4\u95E8\u63A7",
    checked: Boolean(settings.consent_guard_enabled),
    disabled: loading || saving,
    onChange: value => updateSettings({
      consent_guard_enabled: value
    }),
    help: "\u5173\u95ED\u540E\u5C06\u5FFD\u7565\u540C\u610F\u72B6\u6001\uFF0C\u76F4\u63A5\u5199\u5165\u9891\u63A7/\u7EDF\u8BA1\u5B58\u50A8\u3002"
  }), settings.consent_guard_enabled ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
    label: "\u7EDF\u8BA1\u9700\u8981\u540C\u610F\u540E\u624D\u5199\u5165",
    checked: Boolean(settings.tracking_require_consent),
    disabled: loading || saving,
    onChange: value => updateSettings({
      tracking_require_consent: value
    }),
    help: "\u53EF\u901A\u8FC7 magick_ad_has_consent \u63A5\u5165\u7AD9\u70B9\u540C\u610F\u903B\u8F91\u3002"
  }), settings.tracking_require_consent && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "warning",
    isDismissible: false
  }, "\u5DF2\u542F\u7528\u201C\u9700\u8981\u540C\u610F\u201D\u3002\u5982\u679C\u7AD9\u70B9\u672A\u63A5\u5165 magick_ad_has_consent\uFF0C\u5C06\u9ED8\u8BA4\u89C6\u4E3A\u672A\u540C\u610F\uFF1A\u7EDF\u8BA1\u4E0D\u5199\u5165\uFF0C \u4E14\u524D\u7AEF\u4E0D\u4F1A\u5199\u5165 localStorage/sessionStorage\u3002"), settings.tracking_require_consent && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
    label: "\u542F\u7528\u540C\u610F\u63D0\u793A\u6761",
    checked: Boolean(settings.consent_banner_enabled),
    disabled: loading || saving,
    onChange: value => updateSettings({
      consent_banner_enabled: value
    }),
    help: "\u4EC5\u5728\u9700\u8981\u540C\u610F\u4E14\u672A\u540C\u610F\u65F6\u5C55\u793A\u9875\u9762\u5E95\u90E8\u63D0\u793A\u3002"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u63D0\u793A\u6587\u6848",
    value: settings.consent_banner_text,
    disabled: loading || saving,
    onChange: value => updateSettings({
      consent_banner_text: value
    }, false),
    onBlur: () => updateSettings({
      consent_banner_text: settings.consent_banner_text
    }, true)
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u540C\u610F\u6309\u94AE\u6587\u6848",
    value: settings.consent_banner_button,
    disabled: loading || saving,
    onChange: value => updateSettings({
      consent_banner_button: value
    }, false),
    onBlur: () => updateSettings({
      consent_banner_button: settings.consent_banner_button
    }, true)
  }))) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "info",
    isDismissible: false
  }, "\u5DF2\u5173\u95ED\u540C\u610F\u95E8\u63A7\uFF1A\u524D\u7AEF\u9891\u63A7\u4E0E\u7EDF\u8BA1\u5C06\u4E0D\u53D7\u540C\u610F\u72B6\u6001\u5F71\u54CD\u3002")));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ConsentPanel);

/***/ },

/***/ "./assets/js/panels/DebugPanel.js"
/*!****************************************!*\
  !*** ./assets/js/panels/DebugPanel.js ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3__);




const DebugPanel = ({
  onNotice
}) => {
  const [debugEnabled, setDebugEnabled] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [debugLoading, setDebugLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [debugSaving, setDebugSaving] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [debugError, setDebugError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [debugLocked, setDebugLocked] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [debugLogSettings, setDebugLogSettings] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(true);
  const [buildProbeEnabled, setBuildProbeEnabled] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    let isMounted = true;
    setDebugLoading(true);
    setDebugError(null);
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3___default()({
      path: '/magick-ad/v1/debug'
    }).then(response => {
      if (!isMounted) {
        return;
      }
      const forced = Boolean(response?.forced);
      setDebugLocked(forced);
      setDebugEnabled(forced ? true : Boolean(response?.enabled));
      setDebugLogSettings(response?.log_settings !== undefined ? Boolean(response?.log_settings) : true);
      setBuildProbeEnabled(Boolean(response?.build_probe));
      setDebugLoading(false);
    }).catch(err => {
      if (!isMounted) {
        return;
      }
      setDebugError(err);
      setDebugLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);
  const updateDebug = (nextEnabled, nextLogSettings, nextBuildProbe, rollback) => {
    setDebugSaving(true);
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3___default()({
      path: '/magick-ad/v1/debug',
      method: 'POST',
      data: {
        enabled: nextEnabled,
        log_settings: nextLogSettings,
        build_probe: nextBuildProbe
      }
    }).then(response => {
      setDebugSaving(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('magick-ad-debug-updated', {
          detail: response || {}
        }));
      }
      onNotice?.('success', '调试设置已更新');
    }).catch(err => {
      setDebugSaving(false);
      rollback?.();
      setDebugError(err);
      onNotice?.('error', err?.message || '调试设置更新失败');
    });
  };
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-field__label"
  }, "\u8C03\u8BD5\u8BBE\u7F6E"), debugLocked && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "warning",
    isDismissible: false
  }, "\u8C03\u8BD5\u5DF2\u5728 wp-config.php \u4E2D\u5F3A\u5236\u5F00\u542F\u3002"), debugError && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "error",
    isDismissible: true
  }, debugError.message || '调试开关加载失败'), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
    label: "\u542F\u7528\u8C03\u8BD5\u65E5\u5FD7",
    checked: debugEnabled,
    disabled: debugLocked || debugLoading || debugSaving,
    onChange: value => {
      const previous = debugEnabled;
      setDebugEnabled(value);
      updateDebug(value, debugLogSettings, buildProbeEnabled, () => setDebugEnabled(previous));
    },
    help: debugLoading ? '正在加载调试状态…' : '开启后会将调试信息写入 debug.log'
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
    label: "\u8BB0\u5F55\u8BBE\u7F6E\u5FEB\u7167\uFF08settings=Array\uFF09",
    checked: debugLogSettings,
    disabled: debugLoading || debugSaving || !debugEnabled,
    onChange: value => {
      const previous = debugLogSettings;
      setDebugLogSettings(value);
      updateDebug(debugEnabled, value, buildProbeEnabled, () => setDebugLogSettings(previous));
    },
    help: "\u63A7\u5236 settings=Array \u662F\u5426\u5199\u5165 debug.log"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
    label: "\u663E\u793A\u6784\u5EFA\u7248\u672C\u63A2\u9488",
    checked: buildProbeEnabled,
    disabled: debugLoading || debugSaving,
    onChange: value => {
      const previous = buildProbeEnabled;
      setBuildProbeEnabled(value);
      updateDebug(debugEnabled, debugLogSettings, value, () => setBuildProbeEnabled(previous));
    },
    help: "\u53F3\u4E0B\u89D2\u663E\u793A\u5F53\u524D build \u65F6\u95F4\u4E0E\u7248\u672C\u53F7"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-debug-actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    onClick: () => {
      const url = window.MagickAD?.diagnoseUrl || '';
      if (!url) {
        onNotice?.('error', '诊断链接未配置');
        return;
      }
      window.open(url, '_blank');
    }
  }, "\u6253\u5F00\u6295\u653E\u8BCA\u65AD"))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (DebugPanel);

/***/ },

/***/ "./assets/js/panels/ExperimentsPanel.js"
/*!**********************************************!*\
  !*** ./assets/js/panels/ExperimentsPanel.js ***!
  \**********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3__);




const DEFAULT_SETTINGS = {
  block_editor_enabled: false
};
const ExperimentsPanel = ({
  onNotice
}) => {
  const [settings, setSettings] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(DEFAULT_SETTINGS);
  const [loading, setLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [saving, setSaving] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    let mounted = true;
    setLoading(true);
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3___default()({
      path: '/magick-ad/v1/system-settings'
    }).then(response => {
      if (!mounted) {
        return;
      }
      setSettings({
        ...DEFAULT_SETTINGS,
        ...response
      });
      setLoading(false);
    }).catch(err => {
      if (!mounted) {
        return;
      }
      setError(err);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);
  const persist = next => {
    setSaving(true);
    setError(null);
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3___default()({
      path: '/magick-ad/v1/system-settings',
      method: 'POST',
      data: next
    }).then(response => {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...response
      });
      setSaving(false);
      onNotice?.('success', '实验设置已更新');
    }).catch(err => {
      setSaving(false);
      setError(err);
      onNotice?.('error', err?.message || '设置更新失败');
    });
  };
  const updateSettings = patch => {
    const next = {
      ...settings,
      ...patch
    };
    setSettings(next);
    persist(next);
  };
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-field__label"
  }, "\u5B9E\u9A8C\u4E0E\u9AD8\u7EA7"), error && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "error",
    isDismissible: true
  }, error.message || '设置加载失败'), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "info",
    isDismissible: false
  }, "\u5B9E\u9A8C\u529F\u80FD\u53EF\u80FD\u5B58\u5728\u517C\u5BB9\u6027\u6216\u7A33\u5B9A\u6027\u95EE\u9898\uFF0C\u5EFA\u8BAE\u5148\u5728\u6D4B\u8BD5\u73AF\u5883\u9A8C\u8BC1\u540E\u518D\u542F\u7528\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
    label: "\u542F\u7528\u53EF\u89C6\u5316\u8BBE\u8BA1\uFF08\u5B9E\u9A8C\uFF09",
    checked: Boolean(settings.block_editor_enabled),
    disabled: loading || saving,
    onChange: value => updateSettings({
      block_editor_enabled: value
    }),
    help: "\u5173\u95ED\u540E\u9690\u85CF\u201C\u53EF\u89C6\u5316\u8BBE\u8BA1\u201D\u521B\u610F\u7C7B\u578B\uFF0C\u4EC5\u5728\u9700\u8981\u65F6\u5F00\u542F\u3002"
  }), !settings.block_editor_enabled && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "info",
    isDismissible: false
  }, "\u53EF\u89C6\u5316\u8BBE\u8BA1\u5F53\u524D\u5904\u4E8E\u9690\u85CF\u72B6\u6001\uFF0C\u4E0D\u5F71\u54CD\u5DF2\u6709\u5E7F\u544A\u5C55\u793A\u3002")));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ExperimentsPanel);

/***/ },

/***/ "./assets/js/panels/InsertHelpPanel.js"
/*!*********************************************!*\
  !*** ./assets/js/panels/InsertHelpPanel.js ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__);


const shortcodeExamples = ['[magick_ad slot="sidebar-top"]', '[magick_ad id="ad_123456"]', '[magick_ad slot="post-inline-1" class="my-ad"]'];
const templateExample = "<?php if (function_exists('magick_ad_the')) : ?>\n" + "  <?php magick_ad_the('sidebar-top'); ?>\n" + "<?php endif; ?>";
const InsertHelpPanel = () => {
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-field__label"
  }, "\u63D2\u5165\u5165\u53E3"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, "\u4EE5\u4E0B\u662F\u63A8\u8350\u7684\u4E09\u79CD\u63D2\u5165\u65B9\u5F0F\uFF0C\u9002\u914D\u4E0D\u540C\u7F16\u8F91\u73AF\u5883\u4E0E\u4E3B\u9898\u9700\u6C42\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("hr", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h3", null, "\u533A\u5757\uFF08Block\uFF09"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, "\u73B0\u4EE3 WP \u9996\u9009\uFF08Gutenberg / FSE\uFF09\uFF0C\u53EF\u5728\u7F16\u8F91\u5668\u4E2D\u76F4\u63A5\u63D2\u5165 \u201CMagick AD\u201D \u533A\u5757\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("ol", null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("li", null, "\u5728\u533A\u5757\u7F16\u8F91\u5668\u4E2D\u6DFB\u52A0 \u201CMagick AD\u201D \u533A\u5757\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("li", null, "\u5728\u533A\u5757\u8BBE\u7F6E\u4E2D\u9009\u62E9\u5E7F\u544A\u4F4D Slot\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("li", null, "\u9884\u89C8\u53EF\u5B9E\u65F6\u6E32\u67D3\uFF0C\u524D\u53F0\u6839\u636E\u6295\u653E\u89C4\u5219\u663E\u793A\u3002")), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h3", null, "\u77ED\u4EE3\u7801\uFF08Shortcode\uFF09"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, "\u517C\u5BB9\u7ECF\u5178\u7F16\u8F91\u5668/\u590D\u5236\u7C98\u8D34\u573A\u666F\uFF0C\u9002\u5408\u5185\u5BB9\u4E2D\u5FEB\u901F\u63D2\u5165\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("pre", null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("code", null, shortcodeExamples.join('\n'))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h3", null, "\u4E3B\u9898\u6A21\u677F\u51FD\u6570\uFF08Template Tag / PHP API\uFF09"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, "\u7ED9\u4E3B\u9898\u5F00\u53D1\u8005\u6216\u6A21\u677F\u6587\u4EF6\u4F7F\u7528\uFF0C\u9002\u5408\u653E\u5728\u4EFB\u610F\u4F4D\u7F6E\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("pre", null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("code", null, templateExample)), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h4", null, "Slot \u547D\u540D\u5EFA\u8BAE"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("ul", null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("li", null, "\u63A8\u8350\u4F7F\u7528\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u4E0E\u77ED\u6A2A\u7EBF\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("li", null, "\u4FDD\u6301\u552F\u4E00\u6027\uFF0C\u4FBF\u4E8E\u5728\u533A\u5757/\u77ED\u4EE3\u7801/\u6A21\u677F\u51FD\u6570\u4E2D\u7A33\u5B9A\u5F15\u7528\u3002"))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (InsertHelpPanel);

/***/ },

/***/ "./assets/js/panels/SlotsPanel.js"
/*!****************************************!*\
  !*** ./assets/js/panels/SlotsPanel.js ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_url__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/url */ "@wordpress/url");
/* harmony import */ var _wordpress_url__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_url__WEBPACK_IMPORTED_MODULE_3__);




const buildAdToken = ad => {
  const name = ad?.name || '未命名广告';
  const id = ad?.id || '';
  if (!id) {
    return name;
  }
  return `${name} · ${id}`;
};
const SlotsPanel = ({
  slots = [],
  ads = [],
  onAddSlot,
  onUpdateSlot,
  onRemoveSlot,
  onNotice
}) => {
  const [open, setOpen] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const adTokenMap = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    const map = new Map();
    const suggestions = [];
    const idSet = new Set();
    ads.forEach(ad => {
      if (!ad?.id) {
        return;
      }
      idSet.add(ad.id);
      const token = buildAdToken(ad);
      map.set(ad.id, token);
      suggestions.push(token);
    });
    return {
      map,
      suggestions,
      idSet
    };
  }, [ads]);
  const slotIdCounts = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    const counts = {};
    slots.forEach(slot => {
      const id = (0,_wordpress_url__WEBPACK_IMPORTED_MODULE_3__.cleanForSlug)(slot?.id || '');
      if (!id) {
        return;
      }
      counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, [slots]);
  const parseTokenToId = token => {
    if (adTokenMap.idSet.has(token)) {
      return token;
    }
    const parts = token.split('·');
    const maybeId = parts[parts.length - 1]?.trim() || '';
    if (adTokenMap.idSet.has(maybeId)) {
      return maybeId;
    }
    return '';
  };
  const handleTokenChange = (index, tokens) => {
    const ids = [];
    tokens.forEach(token => {
      const id = parseTokenToId(token);
      if (id && !ids.includes(id)) {
        ids.push(id);
      }
    });
    onUpdateSlot?.(index, {
      ad_ids: ids
    });
  };
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Panel, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
    title: "\u5E7F\u544A\u4F4D Slots",
    initialOpen: false
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-slots-summary"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", null, "\u5DF2\u521B\u5EFA ", slots.length, " \u4E2A\u5E7F\u544A\u4F4D\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    onClick: () => setOpen(true)
  }, "\u7BA1\u7406 Slots")), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "description"
  }, "Slot \u7528\u4E8E\u533A\u5757/\u77ED\u4EE3\u7801/\u6A21\u677F\u51FD\u6570\u8C03\u7528\uFF0C\u5E7F\u544A\u5185\u5BB9\u7531 Slot \u7ED1\u5B9A\u51B3\u5B9A\u3002"))))), open && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Modal, {
    className: "magick-ad-modal magick-ad-slots-modal",
    title: "Slot \u7BA1\u7406",
    onRequestClose: () => setOpen(false)
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-slots-modal__toolbar"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "primary",
    onClick: () => {
      onAddSlot?.();
    }
  }, "\u65B0\u589E Slot"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "tertiary",
    onClick: () => setOpen(false)
  }, "\u5B8C\u6210")), slots.length === 0 && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "info",
    isDismissible: false
  }, "\u6682\u65E0\u5E7F\u544A\u4F4D\uFF0C\u53EF\u70B9\u51FB\u201C\u65B0\u589E Slot\u201D\u521B\u5EFA\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-slots-modal__list"
  }, slots.map((slot, index) => {
    const id = (0,_wordpress_url__WEBPACK_IMPORTED_MODULE_3__.cleanForSlug)(slot?.id || '');
    const hasConflict = id && slotIdCounts[id] > 1;
    const adTokens = (slot?.ad_ids || []).map(adId => adTokenMap.map.get(adId) || adId);
    return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, {
      key: `${slot.id || 'slot'}-${index}`,
      className: "magick-ad-slot-card"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
      label: "Slot ID",
      value: slot.id || '',
      onChange: value => onUpdateSlot?.(index, {
        id: value
      }),
      onBlur: () => {
        const normalized = (0,_wordpress_url__WEBPACK_IMPORTED_MODULE_3__.cleanForSlug)(slot.id || '');
        if (normalized && normalized !== slot.id) {
          onUpdateSlot?.(index, {
            id: normalized
          });
          onNotice?.('info', 'Slot 已规范化为可用 ID', 2000);
        }
      },
      help: hasConflict ? '该 Slot 已重复，请修改为唯一值。' : '建议使用小写字母、数字与短横线。',
      className: hasConflict ? 'magick-ad-field-error' : ''
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
      label: "\u663E\u793A\u540D\u79F0",
      value: slot.label || '',
      onChange: value => onUpdateSlot?.(index, {
        label: value
      })
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.FormTokenField, {
      label: "\u7ED1\u5B9A\u5E7F\u544A",
      value: adTokens,
      suggestions: adTokenMap.suggestions,
      onChange: tokens => handleTokenChange(index, tokens),
      help: "\u53EF\u7ED1\u5B9A\u591A\u4E2A\u5E7F\u544A\uFF0C\u6700\u7EC8\u5C55\u793A\u7531\u4F18\u5148\u7EA7/\u6743\u91CD\u51B3\u5B9A\u3002"
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-slot-card__actions"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
      isDestructive: true,
      variant: "tertiary",
      onClick: () => onRemoveSlot?.(index)
    }, "\u5220\u9664 Slot"))));
  }))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (SlotsPanel);

/***/ },

/***/ "./assets/js/panels/SystemSettingsPanel.js"
/*!*************************************************!*\
  !*** ./assets/js/panels/SystemSettingsPanel.js ***!
  \*************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3__);




const DEFAULT_SETTINGS = {
  tracking_enabled: true,
  tracking_strategy: 'session',
  tracking_require_consent: false,
  tracking_dedupe_ttl: 86400,
  tracking_dedupe_scope: 'ad',
  tracking_require_signature: true,
  tracking_secret_rotated_at: 0,
  tracking_secret_has_prev: false,
  tracking_secret_grace_seconds: 3600,
  stats_diagnostics: false,
  stats_diagnostics_retention_days: 7,
  stats_diagnostics_auto_off_days: 7,
  stats_diagnostics_expires_at: 0,
  rate_limit_fallback: 'off',
  stats_write_mode: 'async',
  stats_queue_metrics: {
    enabled: false,
    stats: 0,
    dim: 0,
    variant: 0,
    event: 0,
    total: 0,
    oldest_age: 0,
    oldest_at: 0,
    queue_limit: 0,
    flush_limit: 0,
    alert_limit: 0,
    alert_age: 0
  },
  page_cache_detected: false,
  slot_client_resolver: true,
  html_sandbox: true,
  html_script_allowlist: [],
  html_script_blocklist: [],
  trusted_proxies: [],
  brand_name: 'Magick AD',
  brand_tagline: '广告配置与投放规则管理',
  manage_capability: 'manage_options'
};
const LEVEL_STORAGE_KEY = 'magick_ad_settings_level';
const LEVELS = [{
  value: 'simple',
  label: '简洁'
}, {
  value: 'advanced',
  label: '高级'
}, {
  value: 'lab',
  label: '实验室'
}];
const SystemSettingsPanel = ({
  onNotice
}) => {
  const [settings, setSettings] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(DEFAULT_SETTINGS);
  const [loading, setLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [saving, setSaving] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [openSection, setOpenSection] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('tracking');
  const [displayLevel, setDisplayLevel] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => {
    if (typeof window === 'undefined') {
      return 'simple';
    }
    try {
      return window.localStorage.getItem(LEVEL_STORAGE_KEY) || 'simple';
    } catch (err) {
      return 'simple';
    }
  });
  const parseDomainList = (value = '') => value.split(/[\s,;]+/).map(item => item.trim()).filter(Boolean);
  const formatDomainList = list => Array.isArray(list) ? list.join('\n') : '';
  const formatAge = seconds => {
    const value = Number(seconds || 0);
    if (!value) {
      return '0 秒';
    }
    if (value < 60) {
      return `${Math.round(value)} 秒`;
    }
    if (value < 3600) {
      return `${Math.ceil(value / 60)} 分钟`;
    }
    if (value < 86400) {
      const hours = value / 3600;
      return Number.isInteger(hours) ? `${hours} 小时` : `${hours.toFixed(1)} 小时`;
    }
    const days = value / 86400;
    return Number.isInteger(days) ? `${days} 天` : `${days.toFixed(1)} 天`;
  };
  const queueMetrics = settings.stats_queue_metrics || {};
  const queueEnabled = Boolean(queueMetrics.enabled);
  const queueTotal = Number(queueMetrics.total || 0);
  const queueOldestAge = Number(queueMetrics.oldest_age || 0);
  const queueAlertLimit = Number(queueMetrics.alert_limit || 0);
  const queueAlertAge = Number(queueMetrics.alert_age || 0);
  const isAdvanced = displayLevel !== 'simple';
  const isLab = displayLevel === 'lab';
  const diagnosticsExpiryLabel = (() => {
    if (!settings.stats_diagnostics_expires_at) {
      return '';
    }
    const date = new Date(settings.stats_diagnostics_expires_at * 1000);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString();
  })();
  const secretRotatedLabel = (() => {
    if (!settings.tracking_secret_rotated_at) {
      return '';
    }
    const date = new Date(settings.tracking_secret_rotated_at * 1000);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString();
  })();
  const secretGraceLabel = (() => {
    const seconds = Number(settings.tracking_secret_grace_seconds || 0);
    if (!seconds) {
      return '';
    }
    if (seconds < 3600) {
      return `${Math.round(seconds / 60)} 分钟`;
    }
    const hours = seconds / 3600;
    return hours % 1 === 0 ? `${hours} 小时` : `${hours.toFixed(1)} 小时`;
  })();
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    let mounted = true;
    setLoading(true);
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3___default()({
      path: '/magick-ad/v1/system-settings'
    }).then(response => {
      if (!mounted) {
        return;
      }
      setSettings({
        ...DEFAULT_SETTINGS,
        ...response
      });
      setLoading(false);
    }).catch(err => {
      if (!mounted) {
        return;
      }
      setError(err);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(LEVEL_STORAGE_KEY, displayLevel);
    } catch (err) {
      // ignore storage errors
    }
  }, [displayLevel]);
  const persist = next => {
    setSaving(true);
    setError(null);
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3___default()({
      path: '/magick-ad/v1/system-settings',
      method: 'POST',
      data: next
    }).then(response => {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...response
      });
      setSaving(false);
      onNotice?.('success', '系统设置已更新');
    }).catch(err => {
      setSaving(false);
      setError(err);
      onNotice?.('error', err?.message || '系统设置更新失败');
    });
  };
  const updateSettings = (patch, persistNow = true) => {
    const next = {
      ...settings,
      ...patch
    };
    setSettings(next);
    if (persistNow) {
      persist(next);
    }
  };
  const handleToggleSection = key => {
    setOpenSection(current => current === key ? null : key);
  };
  const rotateSecret = () => {
    if (!window.confirm('将立即轮换签名密钥。旧密钥仅在兼容窗口内有效，确认继续？')) {
      return;
    }
    setSaving(true);
    setError(null);
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_3___default()({
      path: '/magick-ad/v1/system-settings',
      method: 'POST',
      data: {
        rotate_track_secret: true
      }
    }).then(response => {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...response
      });
      setSaving(false);
      onNotice?.('success', '签名密钥已轮换');
    }).catch(err => {
      setSaving(false);
      setError(err);
      onNotice?.('error', err?.message || '签名密钥轮换失败');
    });
  };
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-field__label"
  }, "\u9690\u79C1\u4E0E\u7CFB\u7EDF\u8BBE\u7F6E"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-settings-expiry"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("strong", null, "\u663E\u793A\u7EA7\u522B\uFF1A"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ButtonGroup, null, LEVELS.map(level => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    key: level.value,
    variant: displayLevel === level.value ? 'primary' : 'secondary',
    onClick: () => setDisplayLevel(level.value),
    disabled: loading || saving
  }, level.label)))), isLab && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "warning",
    isDismissible: false
  }, "\u5B9E\u9A8C\u5BA4\u6A21\u5F0F\u4F1A\u663E\u793A\u6240\u6709\u9AD8\u7EA7\u9009\u9879\uFF0C\u8BF7\u8C28\u614E\u4FEE\u6539\u3002"), error && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "error",
    isDismissible: true
  }, error.message || '系统设置加载失败'), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Panel, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
    title: "\u7EDF\u8BA1\u4E0E\u53BB\u91CD",
    opened: openSection === 'tracking',
    onToggle: () => handleToggleSection('tracking')
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
    label: "\u542F\u7528\u524D\u53F0\u7EDF\u8BA1",
    checked: Boolean(settings.tracking_enabled),
    disabled: loading || saving,
    onChange: value => updateSettings({
      tracking_enabled: value
    }),
    help: "\u5173\u95ED\u540E\u4E0D\u52A0\u8F7D\u7EDF\u8BA1\u811A\u672C\uFF0C\u524D\u53F0\u4E0D\u518D\u4E0A\u62A5\u6570\u636E\u3002"
  }), !settings.tracking_enabled && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "warning",
    isDismissible: false
  }, "\u7EDF\u8BA1\u5DF2\u5173\u95ED\uFF0C\u62A5\u8868\u5C06\u6682\u505C\u66F4\u65B0\uFF08\u4E0D\u5F71\u54CD\u5E7F\u544A\u5C55\u793A\uFF09\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u7EDF\u8BA1\u53BB\u91CD\u7B56\u7565",
    value: settings.tracking_strategy,
    disabled: loading || saving,
    options: [{
      label: '无标识（每次请求随机）',
      value: 'request'
    }, {
      label: '会话级（sessionStorage）',
      value: 'session'
    }, {
      label: '持久 Cookie（需同意）',
      value: 'cookie'
    }, {
      label: '登录用户 ID',
      value: 'user'
    }],
    onChange: value => updateSettings({
      tracking_strategy: value
    }),
    help: "\u9ED8\u8BA4\u4E0D\u4F7F\u7528 Cookie\uFF0C\u53EF\u6309\u9700\u5207\u6362\u3002"
  }), settings.tracking_strategy === 'cookie' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "info",
    isDismissible: false
  }, "Cookie \u7B56\u7565\u4F9D\u8D56\u540C\u610F\u72B6\u6001\u3002\u672A\u540C\u610F\u65F6\u4F1A\u81EA\u52A8\u56DE\u9000\u5230\u65E0 Cookie \u7684\u7B56\u7565\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u7EDF\u8BA1\u53BB\u91CD\u7A97\u53E3\uFF08\u79D2\uFF09",
    type: "number",
    value: settings.tracking_dedupe_ttl,
    disabled: loading || saving,
    onChange: value => updateSettings({
      tracking_dedupe_ttl: Number(value) || 60
    }),
    help: "\u7528\u4E8E\u53BB\u91CD/\u9632\u5237\uFF1B\u5728\u7A97\u53E3\u5185\u540C\u4E00\u5E7F\u544A\u53EA\u8BA1\u4E00\u6B21\u3002\u9ED8\u8BA4 86400 \u79D2\u3002"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u53BB\u91CD\u53E3\u5F84",
    value: settings.tracking_dedupe_scope,
    disabled: loading || saving,
    options: [{
      label: '按广告（同页同广告仅算一次）',
      value: 'ad'
    }, {
      label: '按位置（同广告不同位置分别统计）',
      value: 'placement'
    }],
    onChange: value => updateSettings({
      tracking_dedupe_scope: value
    }),
    help: "\u9ED8\u8BA4\u6309\u5E7F\u544A\u53BB\u91CD\uFF1B\u5982\u9700\u6309\u4F4D\u7F6E\u7EDF\u8BA1\u8BF7\u9009\u62E9\u201C\u6309\u4F4D\u7F6E\u201D\u3002"
  }), isAdvanced && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u7EDF\u8BA1\u5199\u5165\u6A21\u5F0F",
    value: settings.stats_write_mode,
    disabled: loading || saving,
    options: [{
      label: '异步写入（推荐）',
      value: 'async'
    }, {
      label: '同步写入',
      value: 'sync'
    }],
    onChange: value => updateSettings({
      stats_write_mode: value
    }),
    help: "\u5F02\u6B65\u4F1A\u8FDB\u5165\u7EDF\u8BA1\u961F\u5217\uFF0C\u5B9A\u65F6\u6279\u91CF\u843D\u5E93\uFF1B\u540C\u6B65\u76F4\u63A5\u5199\u5E93\u3002"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-settings-expiry"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("strong", null, "\u7EDF\u8BA1\u961F\u5217\uFF1A"), queueEnabled ? `${queueTotal} 条` : '未启用', queueEnabled && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "magick-ad-settings-secret__hint"
  }, "\uFF08\u6700\u4E45\u7B49\u5F85 ", formatAge(queueOldestAge), "\uFF09")), queueEnabled && (queueTotal > 0 || queueOldestAge > 0) && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "info",
    isDismissible: false
  }, "\u5F53\u524D\u961F\u5217\uFF1A\u4E3B\u8868 ", queueMetrics.stats || 0, ' ', "/ \u7EF4\u5EA6 ", queueMetrics.dim || 0, " / \u53D8\u4F53", ' ', queueMetrics.variant || 0, " / \u4E8B\u4EF6", ' ', queueMetrics.event || 0), queueEnabled && (queueAlertLimit && queueTotal >= queueAlertLimit || queueAlertAge && queueOldestAge >= queueAlertAge) && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "warning",
    isDismissible: false
  }, "\u961F\u5217\u51FA\u73B0\u79EF\u538B\uFF0C\u8BF7\u68C0\u67E5 Cron \u662F\u5426\u8FD0\u884C\u6B63\u5E38\u53CA\u6570\u636E\u5E93\u5199\u5165\u6027\u80FD\u3002"))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
    title: "\u5B89\u5168\u4E0E\u7F13\u5B58",
    opened: openSection === 'security',
    onToggle: () => handleToggleSection('security')
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
    label: "\u5F3A\u5236\u7B7E\u540D\u6821\u9A8C",
    checked: Boolean(settings.tracking_require_signature),
    disabled: loading || saving,
    onChange: value => updateSettings({
      tracking_require_signature: value
    }),
    help: "\u5173\u95ED\u540E\u53EF\u63A5\u53D7\u65E0\u7B7E\u540D\u7684 /track \u8BF7\u6C42\uFF08\u98CE\u9669\u66F4\u9AD8\uFF09\u3002"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-settings-secret"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-settings-secret__meta"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("strong", null, "\u7B7E\u540D\u5BC6\u94A5\u8F6E\u6362\uFF1A"), secretRotatedLabel ? secretRotatedLabel : '未轮换', secretGraceLabel && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "magick-ad-settings-secret__hint"
  }, "\uFF08\u517C\u5BB9\u7A97\u53E3 ", secretGraceLabel, "\uFF09")), settings.tracking_secret_has_prev && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "info",
    isDismissible: false
  }, "\u65E7\u5BC6\u94A5\u5728\u517C\u5BB9\u7A97\u53E3\u5185\u4ECD\u53EF\u9A8C\u8BC1\uFF0C\u907F\u514D\u5DF2\u6E32\u67D3\u9875\u9762\u7ACB\u5373\u5931\u6548\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    disabled: loading || saving,
    onClick: rotateSecret
  }, "\u8F6E\u6362\u7B7E\u540D\u5BC6\u94A5")), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
    label: "\u542F\u7528\u7F13\u5B58\u53CB\u597D Slot \u8F6E\u64AD\uFF08\u5BA2\u6237\u7AEF\u9009\u62E9\uFF09",
    checked: Boolean(settings.slot_client_resolver),
    disabled: loading || saving,
    onChange: value => updateSettings({
      slot_client_resolver: value
    }),
    help: "\u5F00\u542F\u540E\u4EC5\u8F93\u51FA\u5019\u9009 ID\uFF0C\u7531\u524D\u7AEF\u6309\u6743\u91CD\u51B3\u5B9A\u5C55\u793A\uFF0C\u9002\u914D\u5168\u9875\u7F13\u5B58\u573A\u666F\u3002"
  }), isAdvanced && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u9650\u6D41\u56DE\u9000\u7B56\u7565\uFF08\u65E0\u6301\u4E45\u5316\u7F13\u5B58\u65F6\uFF09",
    value: settings.rate_limit_fallback,
    disabled: loading || saving,
    options: [{
      label: '关闭（推荐）',
      value: 'off'
    }, {
      label: '使用 transient（写入数据库）',
      value: 'transient'
    }],
    onChange: value => updateSettings({
      rate_limit_fallback: value
    }),
    help: "\u9ED8\u8BA4\u5173\u95ED\uFF1A\u5F53\u6CA1\u6709\u6301\u4E45\u5316\u7F13\u5B58\u65F6\u4E0D\u505A\u9650\u6D41\u56DE\u9000\uFF0C\u907F\u514D transient \u5199\u5165\u538B\u529B\u3002"
  }), settings.page_cache_detected && !settings.slot_client_resolver && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "warning",
    isDismissible: false
  }, "\u68C0\u6D4B\u5230\u53EF\u80FD\u542F\u7528\u4E86\u5168\u9875\u7F13\u5B58\uFF0C\u968F\u673A\u7B56\u7565=\u8BF7\u6C42\u5728\u7F13\u5B58\u9875\u9762\u4F1A\u5931\u6548\u3002 \u5EFA\u8BAE\u542F\u7528\u201C\u7F13\u5B58\u53CB\u597D Slot \u8F6E\u64AD\u201D\u6216\u6539\u7528\u968F\u673A=\u4F1A\u8BDD\u7B56\u7565\u3002", (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    style: {
      marginTop: 8
    }
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "primary",
    size: "small",
    disabled: loading || saving,
    onClick: () => updateSettings({
      slot_client_resolver: true
    })
  }, "\u4E00\u952E\u542F\u7528\u8F6E\u64AD"))), isAdvanced && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
    label: "Full HTML \u542F\u7528 iframe \u6C99\u7BB1",
    checked: Boolean(settings.html_sandbox),
    disabled: loading || saving,
    onChange: value => updateSettings({
      html_sandbox: value
    }),
    help: "\u4EC5\u5BF9 Full HTML \u751F\u6548\uFF0C\u5EFA\u8BAE\u4FDD\u6301\u5F00\u542F\u4EE5\u9694\u79BB\u7B2C\u4E09\u65B9\u811A\u672C\u3002"
  }), !settings.html_sandbox && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "warning",
    isDismissible: false
  }, "\u5DF2\u5173\u95ED\u6C99\u7BB1\uFF1AFull HTML \u5C06\u76F4\u63A5\u5728\u9875\u9762\u6267\u884C\u811A\u672C\uFF0C\u98CE\u9669\u8F83\u9AD8\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextareaControl, {
    label: "\u811A\u672C\u767D\u540D\u5355\uFF08\u7CFB\u7EDF\u7EA7\uFF09",
    value: formatDomainList(settings.html_script_allowlist),
    disabled: loading || saving,
    onChange: value => updateSettings({
      html_script_allowlist: parseDomainList(value)
    }),
    help: "\u9ED8\u8BA4\u53EA\u5141\u8BB8\u5F53\u524D\u7AD9\u70B9\u57DF\u540D\u3002\u6BCF\u884C\u4E00\u4E2A\u57DF\u540D\u6216\u7528\u9017\u53F7\u5206\u9694\u3002"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextareaControl, {
    label: "\u811A\u672C\u9ED1\u540D\u5355\uFF08\u7CFB\u7EDF\u7EA7\uFF09",
    value: formatDomainList(settings.html_script_blocklist),
    disabled: loading || saving,
    onChange: value => updateSettings({
      html_script_blocklist: parseDomainList(value)
    }),
    help: "\u7CFB\u7EDF\u7EA7\u9ED1\u540D\u5355\u4F18\u5148\u751F\u6548\uFF0C\u547D\u4E2D\u5373\u79FB\u9664\u811A\u672C\u3002"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextareaControl, {
    label: "\u53EF\u4FE1\u4EE3\u7406\u767D\u540D\u5355",
    value: formatDomainList(settings.trusted_proxies),
    disabled: loading || saving,
    onChange: value => updateSettings({
      trusted_proxies: parseDomainList(value)
    }),
    help: "\u4EC5\u5F53 REMOTE_ADDR \u5728\u6B64\u5217\u8868\u5185\uFF0C\u624D\u4FE1\u4EFB X-Forwarded-For/CF-Connecting-IP\u3002\u652F\u6301 CIDR\uFF0C\u6BCF\u884C\u4E00\u4E2A\u3002"
  }))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
    title: "\u8BCA\u65AD\u65E5\u5FD7",
    opened: openSection === 'diagnostics',
    onToggle: () => handleToggleSection('diagnostics')
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-settings-expiry"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("strong", null, "\u8BCA\u65AD\u5230\u671F\u65F6\u95F4\uFF1A"), diagnosticsExpiryLabel ? diagnosticsExpiryLabel : '未启用'), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
    label: "\u542F\u7528\u7EDF\u8BA1\u8BCA\u65AD\u65E5\u5FD7",
    checked: Boolean(settings.stats_diagnostics),
    disabled: loading || saving,
    onChange: value => updateSettings({
      stats_diagnostics: value
    }),
    help: "\u4EC5\u8BCA\u65AD\u65F6\u8BB0\u5F55 page_url / user_agent / user_id\u3002"
  }), isAdvanced && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u8BCA\u65AD\u65E5\u5FD7\u4FDD\u7559\u5929\u6570",
    type: "number",
    value: settings.stats_diagnostics_retention_days,
    disabled: loading || saving,
    onChange: value => updateSettings({
      stats_diagnostics_retention_days: Number(value) || 7
    }),
    help: "\u8D85\u8FC7\u5929\u6570\u4F1A\u81EA\u52A8\u6E05\u7406\u8BCA\u65AD\u65E5\u5FD7\u3002"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u8BCA\u65AD\u81EA\u52A8\u5173\u95ED\u5929\u6570",
    type: "number",
    value: settings.stats_diagnostics_auto_off_days,
    disabled: loading || saving,
    onChange: value => updateSettings({
      stats_diagnostics_auto_off_days: Number(value) || 7
    }),
    help: "\u5F00\u542F\u8BCA\u65AD\u540E\uFF0C\u8D85\u8FC7\u5929\u6570\u5C06\u81EA\u52A8\u5173\u95ED\u8BCA\u65AD\u6A21\u5F0F\u3002"
  }), settings.stats_diagnostics && diagnosticsExpiryLabel && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "info",
    isDismissible: false
  }, "\u8BCA\u65AD\u6A21\u5F0F\u5C06\u5728 ", diagnosticsExpiryLabel, " \u81EA\u52A8\u5173\u95ED\u3002"))), isAdvanced && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
    title: "\u54C1\u724C\u4E0E\u6743\u9650",
    opened: openSection === 'brand',
    onToggle: () => handleToggleSection('brand')
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u540E\u53F0\u540D\u79F0\uFF08\u767D\u6807\uFF09",
    value: settings.brand_name,
    disabled: loading || saving,
    onChange: value => updateSettings({
      brand_name: value
    }, false),
    onBlur: () => updateSettings({
      brand_name: settings.brand_name
    }, true)
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u540E\u53F0\u526F\u6807\u9898",
    value: settings.brand_tagline,
    disabled: loading || saving,
    onChange: value => updateSettings({
      brand_tagline: value
    }, false),
    onBlur: () => updateSettings({
      brand_tagline: settings.brand_tagline
    }, true)
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u540E\u53F0\u7BA1\u7406\u6743\u9650",
    value: settings.manage_capability,
    disabled: loading || saving,
    options: [{
      label: '仅管理员 (manage_options)',
      value: 'manage_options'
    }, {
      label: 'Magick AD 管理员',
      value: 'manage_magick_ads'
    }],
    onChange: value => updateSettings({
      manage_capability: value
    }),
    help: "\u5207\u6362\u540E\u53EF\u80FD\u9700\u8981\u91CD\u65B0\u767B\u5F55\u540E\u53F0\u3002"
  })))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (SystemSettingsPanel);

/***/ },

/***/ "./assets/js/sections/AdsConfig.js"
/*!*****************************************!*\
  !*** ./assets/js/sections/AdsConfig.js ***!
  \*****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/calendar.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/chevron-down.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/chevron-up.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/cog.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/external.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/globe.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/info.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/megaphone.js");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/more-horizontal.js");
/* harmony import */ var _store__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../store */ "./assets/js/store.ts");
/* harmony import */ var _Layout__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../Layout */ "./assets/js/Layout.js");
/* harmony import */ var _components_ImagePicker__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../components/ImagePicker */ "./assets/js/components/ImagePicker.js");
/* harmony import */ var _components_VideoPicker__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../components/VideoPicker */ "./assets/js/components/VideoPicker.js");
/* harmony import */ var _components_LinkPicker__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../components/LinkPicker */ "./assets/js/components/LinkPicker.js");
/* harmony import */ var _components_ClassicEditor__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ../components/ClassicEditor */ "./assets/js/components/ClassicEditor.js");
/* harmony import */ var _components_BlockEditor__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ../components/BlockEditor */ "./assets/js/components/BlockEditor.js");
/* harmony import */ var _components_TemplateLibraryModal__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ../components/TemplateLibraryModal */ "./assets/js/components/TemplateLibraryModal.js");
/* harmony import */ var _components_TemplateActions__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ../components/TemplateActions */ "./assets/js/components/TemplateActions.js");
/* harmony import */ var _components_BuildProbe__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ../components/BuildProbe */ "./assets/js/components/BuildProbe.js");
/* harmony import */ var _panels_DebugPanel__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ../panels/DebugPanel */ "./assets/js/panels/DebugPanel.js");
/* harmony import */ var _panels_SystemSettingsPanel__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ../panels/SystemSettingsPanel */ "./assets/js/panels/SystemSettingsPanel.js");
/* harmony import */ var _panels_ConsentPanel__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ../panels/ConsentPanel */ "./assets/js/panels/ConsentPanel.js");
/* harmony import */ var _panels_InsertHelpPanel__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ../panels/InsertHelpPanel */ "./assets/js/panels/InsertHelpPanel.js");
/* harmony import */ var _panels_SlotsPanel__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! ../panels/SlotsPanel */ "./assets/js/panels/SlotsPanel.js");
/* harmony import */ var _panels_ExperimentsPanel__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! ../panels/ExperimentsPanel */ "./assets/js/panels/ExperimentsPanel.js");
/* harmony import */ var _hooks_useNotice__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! ../hooks/useNotice */ "./assets/js/hooks/useNotice.js");
/* harmony import */ var _hooks_useTemplateLibrary__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(/*! ../hooks/useTemplateLibrary */ "./assets/js/hooks/useTemplateLibrary.js");
/* harmony import */ var _hooks_useTargeting__WEBPACK_IMPORTED_MODULE_30__ = __webpack_require__(/*! ../hooks/useTargeting */ "./assets/js/hooks/useTargeting.js");
/* harmony import */ var _constants_options__WEBPACK_IMPORTED_MODULE_31__ = __webpack_require__(/*! ../constants/options */ "./assets/js/constants/options.js");
/* harmony import */ var _wordpress_url__WEBPACK_IMPORTED_MODULE_32__ = __webpack_require__(/*! @wordpress/url */ "@wordpress/url");
/* harmony import */ var _wordpress_url__WEBPACK_IMPORTED_MODULE_32___default = /*#__PURE__*/__webpack_require__.n(_wordpress_url__WEBPACK_IMPORTED_MODULE_32__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_33__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_33___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_33__);


























const AdsConfig = () => {
  const headerStorageKey = 'magick_ad_header_collapsed';
  const quickPanelStorageKey = 'magick_ad_panel_quick';
  const containerTabStorageKey = 'magick_ad_container_tab';
  const frequencyPanelStorageKey = 'magick_ad_panel_frequency';
  const editorModeStorageKey = 'magick_ad_editor_mode';
  const allowedEditorModes = new Set(['quick', 'design', 'expert']);
  const ads = (0,_store__WEBPACK_IMPORTED_MODULE_12__.useStore)(state => state.ads);
  const isLoading = (0,_store__WEBPACK_IMPORTED_MODULE_12__.useStore)(state => state.isLoading);
  const isSaving = (0,_store__WEBPACK_IMPORTED_MODULE_12__.useStore)(state => state.isSaving);
  const error = (0,_store__WEBPACK_IMPORTED_MODULE_12__.useStore)(state => state.error);
  const slots = (0,_store__WEBPACK_IMPORTED_MODULE_12__.useStore)(state => state.slots);
  const addAdGroup = (0,_store__WEBPACK_IMPORTED_MODULE_12__.useStore)(state => state.addAdGroup);
  const removeAdGroup = (0,_store__WEBPACK_IMPORTED_MODULE_12__.useStore)(state => state.removeAdGroup);
  const updateAdGroup = (0,_store__WEBPACK_IMPORTED_MODULE_12__.useStore)(state => state.updateAdGroup);
  const addSlot = (0,_store__WEBPACK_IMPORTED_MODULE_12__.useStore)(state => state.addSlot);
  const updateSlot = (0,_store__WEBPACK_IMPORTED_MODULE_12__.useStore)(state => state.updateSlot);
  const removeSlot = (0,_store__WEBPACK_IMPORTED_MODULE_12__.useStore)(state => state.removeSlot);
  const saveToDB = (0,_store__WEBPACK_IMPORTED_MODULE_12__.useStore)(state => state.saveToDB);
  const fetchFromDB = (0,_store__WEBPACK_IMPORTED_MODULE_12__.useStore)(state => state.fetchFromDB);
  const [selectedId, setSelectedId] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [showValidation, setShowValidation] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [devicePreview, setDevicePreview] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('desktop');
  const {
    notice,
    showNotice,
    clearNotice
  } = (0,_hooks_useNotice__WEBPACK_IMPORTED_MODULE_28__["default"])();
  const [deleteTarget, setDeleteTarget] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [renameTarget, setRenameTarget] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [renameValue, setRenameValue] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [saveTemplateOpen, setSaveTemplateOpen] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [saveTemplateType, setSaveTemplateType] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('image');
  const [saveTemplateName, setSaveTemplateName] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [saveTemplateCategory, setSaveTemplateCategory] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [saveTemplateCategoryName, setSaveTemplateCategoryName] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [systemSettings, setSystemSettings] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)({
    block_editor_enabled: false
  });
  const [settingsOpen, setSettingsOpen] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [headerCollapsed, setHeaderCollapsed] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => {
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
  const readEditorMode = fallback => {
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
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_33___default()({
      path: '/magick-ad/v1/system-settings'
    }).then(response => {
      setSystemSettings({
        block_editor_enabled: Boolean(response?.block_editor_enabled)
      });
    }).catch(() => {});
  };
  const [storedEditorMode, setStoredEditorMode] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => readEditorMode('design'));
  const [publishModalOpen, setPublishModalOpen] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [placementModalOpen, setPlacementModalOpen] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [previewModalOpen, setPreviewModalOpen] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [placementTab, setPlacementTab] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('placement');
  const [advancedOpen, setAdvancedOpen] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
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
  const [quickPanelOpen, setQuickPanelOpen] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => readPanelState(quickPanelStorageKey, 'quick'));
  const [containerTab, setContainerTab] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => {
    const allowed = new Set(['base', 'size', 'spacing', 'appearance', 'badge']);
    const stored = readPanelState(containerTabStorageKey, 'base');
    return allowed.has(stored) ? stored : 'base';
  });
  const [frequencyPanelOpen, setFrequencyPanelOpen] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => readPanelState(frequencyPanelStorageKey, 'frequency'));
  const [previewTarget, setPreviewTarget] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [previewMode, setPreviewMode] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('url');
  const [previewSearch, setPreviewSearch] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [previewOptions, setPreviewOptions] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)([]);
  const [previewOptionLinks, setPreviewOptionLinks] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)({});
  const [previewSelected, setPreviewSelected] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [previewLoading, setPreviewLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [previewLogin, setPreviewLogin] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('auto');
  const [previewUsePage, setPreviewUsePage] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [htmlTab, setHtmlTab] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('content');
  const [htmlSettingsTab, setHtmlSettingsTab] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('mode');
  const [imageTab, setImageTab] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('content');
  const [videoTab, setVideoTab] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('content');
  const [videoSettingsTab, setVideoSettingsTab] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('basic');
  const [blockTab, setBlockTab] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('content');
  const [blockSettingsTab, setBlockSettingsTab] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('style');
  const [pickerConfirmOpen, setPickerConfirmOpen] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [pickerType, setPickerType] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('id');
  const [pickerValue, setPickerValue] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [pickerId, setPickerId] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [pickerClasses, setPickerClasses] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)([]);
  const [pickerLabel, setPickerLabel] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [debugEnabled, setDebugEnabled] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const branding = typeof window !== 'undefined' && window.MagickAD?.branding || {
    name: 'Magick AD',
    tagline: '广告配置与投放规则管理'
  };
  const canUnfilteredHtml = typeof window !== 'undefined' && window.MagickAD && window.MagickAD.canUnfilteredHtml;
  const pad = value => String(value).padStart(2, '0');
  const parseDateTime = value => {
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
  const formatDateTimeLocalInput = value => {
    const date = parseDateTime(value);
    if (!date) {
      return '';
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const formatDateTimeStorage = value => {
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
  const formatEndDateTimeLocalInput = value => {
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
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const formatDateFromDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
  const isFutureDate = value => {
    const date = parseDateTime(value);
    if (!date) {
      return false;
    }
    return date.getTime() > Date.now();
  };
  const resolveStatus = ad => {
    if (!ad) {
      return 'draft';
    }
    const enabled = ad?.options?.enabled !== false;
    if (!enabled) {
      return 'draft';
    }
    return ad.status || 'publish';
  };
  const statusMeta = ad => {
    const status = resolveStatus(ad);
    if (status === 'future') {
      return {
        label: '已排期',
        className: 'is-scheduled'
      };
    }
    if (status === 'pending') {
      return {
        label: '待审核',
        className: 'is-pending'
      };
    }
    if (status === 'publish') {
      return {
        label: '已发布',
        className: 'is-enabled'
      };
    }
    return {
      label: '已停用',
      className: 'is-disabled'
    };
  };
  const deviceOptions = [{
    label: '全部设备',
    value: 'all'
  }, {
    label: '仅移动端',
    value: 'mobile'
  }, {
    label: '仅平板',
    value: 'tablet'
  }, {
    label: '仅桌面端',
    value: 'desktop'
  }];
  const loginOptions = [{
    label: '全部用户',
    value: 'all'
  }, {
    label: '仅登录用户',
    value: 'logged-in'
  }, {
    label: '仅未登录用户',
    value: 'logged-out'
  }];
  const renderDeviceLoginControls = () => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u8BBE\u5907\u9650\u5236",
    value: selectedAd?.options?.device || 'all',
    options: deviceOptions,
    onChange: value => handleUpdateOptions({
      device: value
    })
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u767B\u5F55\u72B6\u6001",
    value: selectedAd?.options?.login || 'all',
    options: loginOptions,
    onChange: value => handleUpdateOptions({
      login: value
    })
  }));
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    fetchFromDB();
  }, [fetchFromDB]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    fetchSystemSettings();
  }, []);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (!selectedId && ads.length > 0) {
      setSelectedId(ads[0].id);
    }
  }, [ads, selectedId]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (!showValidation) {
      return;
    }
    const allPlaced = ads.every(ad => {
      const placement = resolvePlacement(ad.options || {});
      if (!placement.hook) {
        return false;
      }
      if (placement.hook === 'content' && !placement.position) {
        return false;
      }
      if (placement.hook === 'content' && placement.position === 'paragraph' && placement.paragraph < 1) {
        return false;
      }
      return true;
    });
    if (allPlaced) {
      setShowValidation(false);
    }
  }, [ads, showValidation]);
  const selectedAd = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => ads.find(ad => ad.id === selectedId), [ads, selectedId]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
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
            mode: 'raw'
          }
        }
      });
      return;
    }
    if (placement.hook !== 'head' && mode === 'raw') {
      updateAdGroup(selectedAd.id, {
        content: {
          ...selectedAd.content,
          container_style: {
            ...(selectedAd.content?.container_style || {}),
            mode: 'boxed'
          }
        }
      });
    }
  }, [selectedAd?.id, selectedAd?.options?.placement_hook, selectedAd?.options?.placement_position, selectedAd?.options?.placement_paragraph]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    let isMounted = true;
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_33___default()({
      path: '/magick-ad/v1/debug'
    }).then(response => {
      if (!isMounted) {
        return;
      }
      const forced = Boolean(response?.forced);
      setDebugEnabled(forced ? true : Boolean(response?.enabled));
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    const handler = event => {
      const detail = event?.detail || {};
      if (detail.enabled === undefined && detail.forced === undefined) {
        return;
      }
      setDebugEnabled(Boolean(detail.forced || detail.enabled));
    };
    window.addEventListener('magick-ad-debug-updated', handler);
    return () => window.removeEventListener('magick-ad-debug-updated', handler);
  }, []);
  const editorModeRaw = selectedAd?.options?.editor_mode || storedEditorMode || 'design';
  const effectiveEditorMode = editorModeRaw === 'expert' && !canUnfilteredHtml ? 'design' : editorModeRaw;
  const isQuickMode = effectiveEditorMode === 'quick';
  const isExpertMode = effectiveEditorMode === 'expert';
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    setPlacementTab('placement');
  }, [selectedId]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
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
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage?.setItem(headerStorageKey, headerCollapsed ? '1' : '0');
    } catch (err) {
      // ignore storage errors
    }
  }, [headerCollapsed]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage?.setItem(quickPanelStorageKey, quickPanelOpen || 'none');
    } catch (err) {
      // ignore storage errors
    }
  }, [quickPanelOpen]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage?.setItem(containerTabStorageKey, containerTab || 'base');
    } catch (err) {
      // ignore storage errors
    }
  }, [containerTab]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage?.setItem(frequencyPanelStorageKey, frequencyPanelOpen || 'none');
    } catch (err) {
      // ignore storage errors
    }
  }, [frequencyPanelOpen]);
  const {
    targetItems,
    targetSuggestions,
    targetLoading,
    handleTargetSearch
  } = (0,_hooks_useTargeting__WEBPACK_IMPORTED_MODULE_30__["default"])(selectedAd);
  const positionOptions = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    const page = selectedAd?.options?.show_page || 'all';
    return [{
      label: '请选择展示位置',
      value: ''
    }, ...(0,_constants_options__WEBPACK_IMPORTED_MODULE_31__.getPositionOptions)(page)];
  }, [selectedAd?.options?.show_page]);
  const targetPositionOptions = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    const targetType = selectedAd?.options?.target_type || '';
    if (!targetType) {
      return [{
        label: '请选择展示位置',
        value: ''
      }];
    }
    return [{
      label: '请选择展示位置',
      value: ''
    }, ...(0,_constants_options__WEBPACK_IMPORTED_MODULE_31__.getPositionOptions)(targetType)];
  }, [selectedAd?.options?.target_type]);
  const resolvePlacement = options => {
    const placement = {
      hook: options?.placement_hook || '',
      position: options?.placement_position || '',
      paragraph: Number(options?.placement_paragraph || 0)
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
  const isHeadPlacement = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    if (!selectedAd) {
      return false;
    }
    return resolvePlacement(selectedAd.options || {}).hook === 'head';
  }, [selectedAd?.options?.placement_hook, selectedAd?.options?.placement_position, selectedAd?.options?.placement_paragraph]);
  function fixDuplicateSlotIds() {
    const used = new Set();
    let fixed = 0;
    slots.forEach((slot, index) => {
      const raw = (0,_wordpress_url__WEBPACK_IMPORTED_MODULE_32__.cleanForSlug)(slot?.id || '');
      if (!raw) {
        return;
      }
      if (!used.has(raw)) {
        used.add(raw);
        if (slot.id !== raw) {
          updateSlot(index, {
            id: raw
          });
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
      updateSlot(index, {
        id: candidate
      });
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
      ...placementUpdates
    };
    if (placementUpdates.placement_hook === 'head') {
      updateAdGroup(selectedAd.id, {
        options: nextOptions,
        content: {
          ...selectedAd.content,
          container_style: {
            ...(selectedAd.content?.container_style || {}),
            mode: 'raw'
          }
        }
      });
      return;
    }
    updateAdGroup(selectedAd.id, {
      options: nextOptions
    });
  };
  const placementToSlotValue = placement => {
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
  const slotToPlacementUpdates = value => {
    const updates = {
      placement_hook: '',
      placement_position: '',
      placement_paragraph: 0
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
  const missingPositionIds = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    return new Set(ads.filter(ad => {
      const placement = resolvePlacement(ad.options || {});
      if (!placement.hook) {
        return true;
      }
      if (placement.hook === 'content' && !placement.position) {
        return true;
      }
      if (placement.hook === 'content' && placement.position === 'paragraph' && placement.paragraph < 1) {
        return true;
      }
      return false;
    }).map(ad => ad.id));
  }, [ads]);
  const handleUpdateOptions = updates => {
    if (!selectedAd) {
      return;
    }
    updateAdGroup(selectedAd.id, {
      options: {
        ...selectedAd.options,
        ...updates
      }
    });
  };
  const jumpToImageSettings = () => {
    handleUpdateOptions({
      creative_type: 'image'
    });
    setImageTab('settings');
  };
  const updateEditorMode = mode => {
    setStoredEditorMode(mode);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem(editorModeStorageKey, mode);
      } catch (err) {
        // ignore storage errors
      }
    }
    handleUpdateOptions({
      editor_mode: mode
    });
  };
  const openNodePicker = () => {
    const base = window.MagickAD?.previewUrl || window.location.origin;
    let url = base;
    try {
      const next = new URL(base);
      next.searchParams.set('magick_ad_picker', '1');
      next.searchParams.set('magick_ad_picker_origin', window.location.origin);
      if (window.MagickAD?.pickerNonce) {
        next.searchParams.set('magick_ad_picker_nonce', window.MagickAD.pickerNonce);
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
    const base = window.MagickAD?.previewUrl || window.location.origin;
    let url = base;
    try {
      const next = new URL(base, window.location.origin);
      next.searchParams.set('magick_ad_node_debug', '1');
      next.searchParams.set('magick_ad_node_type', selectedAd.options?.node_target_type || 'id');
      next.searchParams.set('magick_ad_node_value', selectedAd.options?.node_target_value || '');
      next.searchParams.set('magick_ad_node_match', selectedAd.options?.node_match || 'first');
      if (selectedAd.options?.node_match === 'nth') {
        next.searchParams.set('magick_ad_node_index', String(Number(selectedAd.options?.node_index || 1) || 1));
      }
      if (window.MagickAD?.nodeDebugNonce) {
        next.searchParams.set('magick_ad_node_debug_nonce', window.MagickAD.nodeDebugNonce);
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
    return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-node-placement"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h4", {
      className: "magick-ad-field__label"
    }, "\u8282\u70B9\u6295\u653E"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
      variant: "secondary",
      onClick: openNodePicker
    }, "\u53EF\u89C6\u5316\u9009\u62E9"), debugEnabled && selectedAd.options?.node_target_value && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-node-debug-actions"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
      variant: "secondary",
      onClick: () => {
        const url = buildNodeDebugUrl();
        if (!url) {
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(() => {
            showNotice('success', '测试链接已复制', 2000);
          }).catch(() => {});
          return;
        }
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          showNotice('success', '测试链接已复制', 2000);
        } catch (err) {}
        document.body.removeChild(textarea);
      }
    }, "\u590D\u5236\u6D4B\u8BD5\u94FE\u63A5"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
      variant: "primary",
      onClick: () => {
        const url = buildNodeDebugUrl();
        if (!url) {
          return;
        }
        window.open(url, 'magick-ad-node-debug');
      }
    }, "\u4E00\u952E\u9AD8\u4EAE"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
      className: "magick-ad-node-debug-help"
    }, "\u4EC5\u5728\u8C03\u8BD5\u6A21\u5F0F\u663E\u793A\uFF0C\u9ED8\u8BA4\u6253\u5F00\u7AD9\u70B9\u9996\u9875\u9AD8\u4EAE\u76EE\u6807\u8282\u70B9\u3002")), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
      label: "\u5B9A\u4F4D\u65B9\u5F0F",
      value: selectedAd.options?.node_target_type || 'id',
      options: [{
        label: 'ID',
        value: 'id'
      }, {
        label: 'Class',
        value: 'class'
      }],
      onChange: value => handleUpdateOptions({
        node_target_type: value
      })
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
      label: "\u8282\u70B9\u503C",
      value: selectedAd.options?.node_target_value || '',
      onChange: value => handleUpdateOptions({
        node_target_value: value.trim()
      }),
      help: "ID \u4E0D\u5E26 #\uFF0CClass \u4E0D\u5E26 ."
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
      label: "\u63D2\u5165\u65B9\u5F0F",
      value: selectedAd.options?.node_insert || 'append',
      options: [{
        label: '插入到节点内部末尾',
        value: 'append'
      }, {
        label: '插入到节点内部开头',
        value: 'prepend'
      }, {
        label: '插入到节点外部前面',
        value: 'before'
      }, {
        label: '插入到节点外部后面',
        value: 'after'
      }],
      onChange: value => handleUpdateOptions({
        node_insert: value
      })
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
      label: "\u5339\u914D\u7B56\u7565",
      value: selectedAd.options?.node_match || 'first',
      options: [{
        label: '仅第一个匹配',
        value: 'first'
      }, {
        label: '第 N 个',
        value: 'nth'
      }, {
        label: '全部匹配',
        value: 'all'
      }],
      onChange: value => handleUpdateOptions({
        node_match: value
      }),
      help: "Class \u53EF\u80FD\u5339\u914D\u591A\u4E2A\u5143\u7D20\uFF0C\u9ED8\u8BA4\u4EC5\u7B2C\u4E00\u4E2A\u3002"
    }), selectedAd.options?.node_match === 'nth' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
      label: "\u7B2C N \u4E2A",
      min: 1,
      max: 20,
      value: Number(selectedAd.options?.node_index || 1) || 1,
      onChange: value => handleUpdateOptions({
        node_index: Number(value)
      })
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
      label: "\u627E\u4E0D\u5230\u8282\u70B9\u65F6",
      value: selectedAd.options?.node_fallback || 'hide',
      options: [{
        label: '隐藏广告',
        value: 'hide'
      }, {
        label: '回退到页脚',
        value: 'footer'
      }],
      onChange: value => handleUpdateOptions({
        node_fallback: value
      })
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
      label: "\u7D27\u51D1\u6A21\u5F0F",
      checked: selectedAd.options?.node_compact !== false,
      onChange: value => handleUpdateOptions({
        node_compact: value
      }),
      help: "\u9ED8\u8BA4\u79FB\u9664\u5E7F\u544A\u5355\u5143\u5916\u8FB9\u8DDD\uFF0C\u907F\u514D\u6324\u538B\u5E03\u5C40\u3002"
    }));
  };
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    const handleMessage = event => {
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
      setPickerClasses(Array.isArray(data.classes) ? data.classes : []);
      setPickerLabel(data.label || '');
      setPickerConfirmOpen(true);
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [selectedAd, showNotice]);
  const handleUpdateMeta = updates => {
    if (!selectedAd) {
      return;
    }
    updateAdGroup(selectedAd.id, updates);
  };
  const handleUpdateContent = updates => {
    if (!selectedAd) {
      return;
    }
    updateAdGroup(selectedAd.id, {
      content: {
        ...selectedAd.content,
        ...updates
      }
    });
  };
  const handleUpdateImageSettings = updates => {
    if (!selectedAd) {
      return;
    }
    const currentSettings = selectedAd.content?.image_settings || {};
    handleUpdateContent({
      image_settings: {
        ...currentSettings,
        ...updates
      }
    });
  };
  const handleUpdateVideoSettings = updates => {
    if (!selectedAd) {
      return;
    }
    const currentSettings = selectedAd.content?.video_settings || {};
    handleUpdateContent({
      video_settings: {
        ...currentSettings,
        ...updates
      }
    });
  };
  const handleUpdateBlockSettings = updates => {
    if (!selectedAd) {
      return;
    }
    const currentSettings = selectedAd.content?.block_settings || {};
    handleUpdateContent({
      block_settings: {
        ...currentSettings,
        ...updates
      }
    });
  };
  const parseDomainList = (value = '') => value.split(/[\s,;]+/).map(item => item.trim()).filter(Boolean);
  const formatDomainList = list => Array.isArray(list) ? list.join('\n') : '';
  const extractScriptDomains = (html = '') => {
    if (!html || typeof html !== 'string') {
      return [];
    }
    const baseUrl = typeof window !== 'undefined' && window.location ? window.location.href : 'http://localhost';
    const domains = new Set();
    const addDomain = src => {
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
        doc.querySelectorAll('script[src]').forEach(script => {
          addDomain(script.getAttribute('src'));
        });
      } catch (err) {
        // ignore parse errors
      }
    } else {
      const matches = html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi);
      for (const match of matches) {
        addDomain(match[1]);
      }
    }
    return Array.from(domains);
  };
  const updateVariants = nextVariants => {
    if (!selectedAd) {
      return;
    }
    handleUpdateContent({
      variants: nextVariants
    });
  };
  const updateVariant = (index, updates) => {
    if (!selectedAd) {
      return;
    }
    const variants = Array.isArray(selectedAd.content?.variants) ? [...selectedAd.content.variants] : [];
    if (!variants[index]) {
      return;
    }
    variants[index] = {
      ...variants[index],
      ...updates,
      content: {
        ...(variants[index].content || {}),
        ...(updates.content || {})
      }
    };
    updateVariants(variants);
  };
  const removeVariant = index => {
    if (!selectedAd) {
      return;
    }
    const variants = Array.isArray(selectedAd.content?.variants) ? [...selectedAd.content.variants] : [];
    variants.splice(index, 1);
    updateVariants(variants);
  };
  const createVariantId = () => {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `var_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };
  const addVariant = type => {
    if (!selectedAd) {
      return;
    }
    const variants = Array.isArray(selectedAd.content?.variants) ? [...selectedAd.content.variants] : [];
    const baseContent = {};
    if (type === 'html') {
      baseContent.html = selectedAd.content?.html || '';
    } else if (type === 'image') {
      baseContent.image = selectedAd.content?.image || null;
      baseContent.link = selectedAd.content?.link || '';
      baseContent.link_target = Boolean(selectedAd.content?.link_target);
    } else if (type === 'video') {
      baseContent.video_url = selectedAd.content?.video_url || '';
    } else if (type === 'block') {
      baseContent.blocks = selectedAd.content?.blocks || '';
    }
    variants.push({
      id: createVariantId(),
      label: `版本 ${variants.length + 1}`,
      weight: 1,
      content: baseContent
    });
    updateVariants(variants);
  };
  const handleUpdateContainerStyle = updates => {
    if (!selectedAd) {
      return;
    }
    const currentStyle = selectedAd.content?.container_style || {};
    handleUpdateContent({
      container_style: {
        ...currentStyle,
        ...updates
      }
    });
  };
  const handleUpdateBehavior = updates => {
    if (!selectedAd) {
      return;
    }
    const currentBehavior = selectedAd.content?.behavior || {};
    handleUpdateContent({
      behavior: {
        ...currentBehavior,
        ...updates
      }
    });
  };
  const formatColorValue = color => {
    if (!color) {
      return 'transparent';
    }
    if (typeof color === 'string') {
      return color;
    }
    if (color.rgb) {
      const {
        r,
        g,
        b,
        a
      } = color.rgb;
      if (a === 1) {
        return color.hex;
      }
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return color.hex || 'transparent';
  };
  const renderVariantSection = type => {
    if (!selectedAd) {
      return null;
    }
    const variantsEnabled = Boolean(selectedAd.content?.variants_enabled);
    const variantsStrategy = selectedAd.content?.variants_strategy === 'session' ? 'session' : 'request';
    const variants = Array.isArray(selectedAd.content?.variants) ? selectedAd.content.variants : [];
    return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-variant-section"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
      label: "\u542F\u7528 A/B \u7248\u672C",
      checked: variantsEnabled,
      onChange: value => handleUpdateContent({
        variants_enabled: value
      }),
      help: "\u540C\u4E00\u5E7F\u544A\u53EF\u914D\u7F6E\u591A\u4E2A\u5185\u5BB9\u7248\u672C\uFF0C\u6309\u6743\u91CD\u968F\u673A\u5C55\u793A\u3002"
    }), variantsEnabled && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
      label: "\u968F\u673A\u7B56\u7565",
      value: variantsStrategy,
      options: [{
        label: '按请求随机',
        value: 'request'
      }, {
        label: '按会话固定',
        value: 'session'
      }],
      onChange: value => handleUpdateContent({
        variants_strategy: value
      }),
      help: "\u4F1A\u8BDD\u56FA\u5B9A\u53EF\u907F\u514D\u5237\u65B0\u95EA\u70C1\uFF1B\u6309\u8BF7\u6C42\u968F\u673A\u9002\u5408\u5FEB\u901F\u8BD5\u9A8C\u3002"
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-variant-list"
    }, variants.map((variant, index) => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-variant-card",
      key: variant.id || index
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-variant-card__head"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
      label: "\u7248\u672C\u540D\u79F0",
      value: variant.label || '',
      onChange: value => updateVariant(index, {
        label: value
      })
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
      label: "\u6743\u91CD",
      min: 1,
      max: 100,
      value: Number(variant.weight || 1),
      onChange: value => updateVariant(index, {
        weight: Number(value)
      })
    })), type === 'html' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextareaControl, {
      label: "HTML \u5185\u5BB9",
      value: variant.content?.html || '',
      onChange: value => updateVariant(index, {
        content: {
          html: value
        }
      })
    }), type === 'video' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
      className: "magick-ad-field__label"
    }, "\u89C6\u9891\u5730\u5740"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-video-input-row"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
      value: variant.content?.video_url || '',
      onChange: value => updateVariant(index, {
        content: {
          video_url: value
        }
      })
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_VideoPicker__WEBPACK_IMPORTED_MODULE_15__["default"], {
      value: variant.content?.video_url || '',
      onChange: value => updateVariant(index, {
        content: {
          video_url: value
        }
      }),
      compact: true
    }))), type === 'block' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextareaControl, {
      label: "\u533A\u5757\u5185\u5BB9",
      value: variant.content?.blocks || '',
      onChange: value => updateVariant(index, {
        content: {
          blocks: value
        }
      }),
      help: "\u8FD9\u91CC\u586B\u5199\u533A\u5757\u5185\u5BB9\uFF08HTML/\u533A\u5757\u5E8F\u5217\u5316\uFF09\u3002\u6837\u5F0F\u4ECD\u4F7F\u7528\u4E3B\u914D\u7F6E\u3002"
    }), type === 'image' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_LinkPicker__WEBPACK_IMPORTED_MODULE_16__["default"], {
      value: variant.content?.link || '',
      target: variant.content?.link_target,
      onChange: ({
        url,
        target
      }) => updateVariant(index, {
        content: {
          link: url,
          link_target: Boolean(target)
        }
      })
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-field"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
      className: "magick-ad-field__label"
    }, "\u56FE\u7247"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_ImagePicker__WEBPACK_IMPORTED_MODULE_14__["default"], {
      value: variant.content?.image || null,
      onChange: value => updateVariant(index, {
        content: {
          image: value
        }
      })
    }))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-variant-card__actions"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
      variant: "tertiary",
      isDestructive: true,
      onClick: () => removeVariant(index)
    }, "\u79FB\u9664\u7248\u672C")))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
      variant: "secondary",
      onClick: () => addVariant(type)
    }, "\u6DFB\u52A0\u7248\u672C"))));
  };
  const renderFrequencyControls = (behavior = {}) => {
    var _behavior$frequency_l;
    return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
      label: "\u9891\u63A7\u7B56\u7565",
      value: behavior.frequency_mode || 'none',
      options: [{
        label: '不限制',
        value: 'none'
      }, {
        label: '每会话一次',
        value: 'session'
      }, {
        label: '每天一次',
        value: 'day'
      }, {
        label: '最多 N 次',
        value: 'count'
      }],
      onChange: value => handleUpdateBehavior({
        frequency_mode: value
      }),
      help: "\u9ED8\u8BA4\u4E0D\u9650\u5236\u3002\u9891\u63A7\u4EC5\u5728\u524D\u53F0\u751F\u6548\u3002"
    }), behavior.frequency_mode === 'count' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
      label: "\u6700\u591A\u5C55\u793A\u6B21\u6570",
      type: "number",
      min: 1,
      value: (_behavior$frequency_l = behavior.frequency_limit) !== null && _behavior$frequency_l !== void 0 ? _behavior$frequency_l : 1,
      onChange: value => handleUpdateBehavior({
        frequency_limit: Math.max(1, Number(value || 1))
      })
    }));
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
      var _behavior$frequency_l2;
      const limit = Math.max(1, Number((_behavior$frequency_l2 = behavior.frequency_limit) !== null && _behavior$frequency_l2 !== void 0 ? _behavior$frequency_l2 : 1));
      return `最多 ${limit} 次`;
    }
    return '不限制';
  };
  const renderFrequencySummary = (behavior = {}, options = {}) => {
    const {
      showLink = true
    } = options;
    return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-right-subsection"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-right-subsection__title"
    }, "\u9891\u63A7\u6458\u8981"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-right-subsection__body"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-frequency-summary"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", null, "\u9891\u63A7\uFF1A", getFrequencySummary(behavior)), showLink && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
      variant: "link",
      onClick: () => setPlacementTab('frequency')
    }, "\u53BB\u8BBE\u7F6E"))));
  };
  const getCreativeTemplateData = (type, ad) => {
    const content = ad?.content || {};
    if (type === 'image') {
      return {
        image: content.image || {
          id: 0,
          url: '',
          alt: '',
          width: 0,
          height: 0
        },
        link: content.link || '',
        link_target: Boolean(content.link_target),
        image_settings: content.image_settings || {}
      };
    }
    if (type === 'video') {
      return {
        video_url: content.video_url || ''
      };
    }
    if (type === 'block') {
      return {
        blocks: content.blocks || ''
      };
    }
    return {
      html: content.html || ''
    };
  };
  const applyTemplate = template => {
    const updates = {
      creative_type: template.type
    };
    if (template.containerType) {
      updates.container_type = template.containerType;
      if (template.containerType !== 'inline') {
        updates.placement_hook = 'footer';
        updates.placement_position = '';
        updates.placement_paragraph = 0;
      }
    }
    handleUpdateOptions(updates);
    handleUpdateContent(template.data || {});
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
    handleFileChange
  } = (0,_hooks_useTemplateLibrary__WEBPACK_IMPORTED_MODULE_29__["default"])({
    selectedAd,
    getCreativeTemplateData,
    onApplyTemplate: applyTemplate,
    showNotice
  });
  const stripHtml = value => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : '';
  const buildPreviewOptions = items => {
    const links = {};
    const options = items.map(item => {
      const label = stripHtml(item?.title?.rendered) || `ID ${item.id}`;
      links[String(item.id)] = item?.link || '';
      return {
        label,
        value: String(item.id)
      };
    });
    setPreviewOptions(options);
    setPreviewOptionLinks(links);
  };
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
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
      _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_33___default()({
        path: `/wp/v2/${endpoint}?${params.toString()}`,
        signal: controller.signal
      }).then(items => {
        buildPreviewOptions(Array.isArray(items) ? items : []);
        setPreviewLoading(false);
      }).catch(() => {
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
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (previewMode !== 'url') {
      setPreviewSearch('');
      setPreviewSelected('');
    }
  }, [previewMode]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (previewTarget && typeof previewTarget === 'string' && previewTarget.trim().length > 0 && !previewUsePage) {
      setPreviewUsePage(true);
    }
  }, [previewTarget, previewUsePage]);
  const handlePreviewSelect = value => {
    setPreviewSelected(value || '');
    if (!value) {
      return;
    }
    const link = previewOptionLinks[value];
    if (link) {
      setPreviewTarget(link);
    }
  };
  const handleSave = async () => {
    clearNotice();
    const missingPosition = ads.filter(ad => {
      const placement = resolvePlacement(ad.options || {});
      if (!placement.hook) {
        return true;
      }
      if (placement.hook === 'content' && !placement.position) {
        return true;
      }
      if (placement.hook === 'content' && placement.position === 'paragraph' && placement.paragraph < 1) {
        return true;
      }
      return false;
    });
    if (missingPosition.length > 0) {
      setShowValidation(true);
      showNotice('error', `请为 ${missingPosition.length} 个广告选择展示位置。`, 4000);
      return;
    }
    setShowValidation(false);
    const slotFixed = fixDuplicateSlotIds();
    if (slotFixed > 0) {
      showNotice('warning', `已自动修复 ${slotFixed} 个重复 Slot，正在继续保存...`, 2500);
    }
    try {
      await saveToDB();
      showNotice('success', '保存成功', 2500);
    } catch (err) {
      const message = err?.data?.message || err?.message || '保存失败，请检查网络或权限设置。';
      showNotice('error', message, 4000);
    }
  };
  const handleSaveWithSlotCheck = async () => {
    const slotFixed = fixDuplicateSlotIds();
    if (slotFixed > 0) {
      showNotice('warning', `已自动修复 ${slotFixed} 个重复 Slot，正在继续保存...`, 2500);
    }
    return saveToDB();
  };
  const openSaveTemplate = async type => {
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
    const categoryName = isNewCategory ? saveTemplateCategoryName.trim() : saveTemplateCategory;
    const category = !categoryName || categoryName === 'uncategorized' ? '' : categoryName;
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
  const handleToggleEnabled = async ad => {
    var _ad$options$enabled;
    const nextEnabled = !((_ad$options$enabled = ad?.options?.enabled) !== null && _ad$options$enabled !== void 0 ? _ad$options$enabled : true);
    const nextStatus = nextEnabled ? isFutureDate(ad?.date) || ad?.status === 'future' ? 'future' : 'publish' : 'draft';
    updateAdGroup(ad.id, {
      status: nextStatus,
      options: {
        ...(ad.options || {}),
        enabled: nextEnabled
      }
    });
    try {
      await saveToDB();
      showNotice('success', nextEnabled ? '已启用该广告' : '已停用该广告', 2000);
    } catch (err) {
      const message = err?.data?.message || err?.message || '保存失败，请检查网络或权限设置。';
      showNotice('error', message, 4000);
    }
  };
  const leftSidebar = (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-left-stack"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-sidebar__header"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h2", null, "\u5E7F\u544A\u7EC4"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-sidebar__header-actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.DropdownMenu, {
    className: "magick-ad-add-menu",
    icon: null,
    text: "\u65B0\u589E",
    toggleProps: {
      variant: 'secondary'
    }
  }, ({
    onClose
  }) => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.MenuGroup, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.MenuItem, {
    onClick: () => {
      addAdGroup('global');
      onClose();
    }
  }, "\u5168\u5C40\u5E7F\u544A"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.MenuItem, {
    onClick: () => {
      addAdGroup('targeted');
      onClose();
    }
  }, "\u6307\u5B9A\u5E7F\u544A"))))), ads.length === 0 ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "description"
  }, "\u6682\u65E0\u5E7F\u544A\u7EC4\u3002") : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("nav", {
    className: "magick-ad-sidebar__list"
  }, [{
    key: 'global',
    title: '全局广告',
    items: ads.filter(ad => ad.options?.ad_type !== 'targeted')
  }, {
    key: 'targeted',
    title: '指定广告',
    items: ads.filter(ad => ad.options?.ad_type === 'targeted')
  }].map(section => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    key: section.key,
    className: "magick-ad-sidebar__section"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-sidebar__section-title"
  }, section.title, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "magick-ad-sidebar__section-count"
  }, section.items.length)), section.items.length === 0 ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "description"
  }, "\u6682\u65E0", section.title) : section.items.map((ad, index) => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    key: ad.id,
    className: `magick-ad-sidebar__item ${selectedId === ad.id ? 'is-active' : ''} ${missingPositionIds.has(ad.id) ? 'has-error' : ''} ${ad?.options?.enabled === false ? 'is-disabled' : ''}`
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-sidebar__body"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "tertiary",
    onClick: () => setSelectedId(ad.id),
    "aria-current": selectedId === ad.id ? 'true' : undefined,
    className: "magick-ad-sidebar__main"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "magick-ad-sidebar__title-row"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "magick-ad-sidebar__title"
  }, ad.name || `广告组 ${index + 1}`), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: `magick-ad-status-pill ${statusMeta(ad).className}`
  }, statusMeta(ad).label)), missingPositionIds.has(ad.id) && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "magick-ad-sidebar__alert"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "magick-ad-sidebar__dot"
  }), "\u9700\u914D\u7F6E\u4F4D\u7F6E"))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-sidebar__actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.DropdownMenu, {
    icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_11__["default"],
    label: "\u66F4\u591A\u64CD\u4F5C",
    className: "magick-ad-item-menu",
    toggleProps: {
      variant: 'tertiary',
      size: 'small',
      className: 'magick-ad-item-menu__toggle'
    }
  }, ({
    onClose
  }) => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.MenuGroup, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.MenuItem, {
    onClick: () => {
      setRenameTarget(ad);
      setRenameValue(ad.name || '');
      onClose();
    }
  }, "\u4FEE\u6539\u540D\u79F0"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.MenuItem, {
    onClick: () => {
      handleToggleEnabled(ad);
      onClose();
    }
  }, ad?.options?.enabled === false ? '设为启用' : '设为停用'), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.MenuItem, {
    isDestructive: true,
    onClick: () => {
      setDeleteTarget(ad);
      onClose();
    }
  }, "\u5220\u9664"))))))))))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_panels_SlotsPanel__WEBPACK_IMPORTED_MODULE_26__["default"], {
    slots: slots,
    ads: ads,
    onAddSlot: addSlot,
    onUpdateSlot: updateSlot,
    onRemoveSlot: removeSlot,
    onNotice: showNotice
  }));
  const activeCreativeType = selectedAd?.options?.creative_type || 'image';
  const isBlockEditorEnabled = Boolean(systemSettings.block_editor_enabled);
  const detectedScriptDomains = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    if (!selectedAd) {
      return [];
    }
    const html = `${selectedAd.content?.html || ''}\n${selectedAd.content?.custom_html || ''}`;
    return extractScriptDomains(html);
  }, [selectedAd?.content?.html, selectedAd?.content?.custom_html]);
  const creativeTabs = [{
    name: 'html',
    title: '代码/HTML'
  }, {
    name: 'image',
    title: '图片'
  }, {
    name: 'video',
    title: '视频'
  }, ...(isBlockEditorEnabled ? [{
    name: 'block',
    title: '可视化设计'
  }] : [])];
  const allowedCreativeTypes = new Set(creativeTabs.map(tab => tab.name));
  const resolvedCreativeType = allowedCreativeTypes.has(activeCreativeType) ? activeCreativeType : creativeTabs[0]?.name || 'image';
  const contentPanels = selectedAd ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TabPanel, {
    className: "magick-ad-sub-tabs",
    tabs: creativeTabs,
    initialTabName: resolvedCreativeType,
    key: selectedAd?.id || 'content',
    onSelect: name => handleUpdateOptions({
      creative_type: name
    })
  }, () => {
    const activeContentType = resolvedCreativeType;
    const blockEditorHidden = !isBlockEditorEnabled && selectedAd?.options?.creative_type === 'block';
    return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, blockEditorHidden && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
      status: "warning",
      isDismissible: false
    }, "\u5F53\u524D\u5E7F\u544A\u4F7F\u7528\u201C\u53EF\u89C6\u5316\u8BBE\u8BA1\uFF08\u5B9E\u9A8C\uFF09\u201D\uFF0C\u8BE5\u529F\u80FD\u5DF2\u5728\u7CFB\u7EDF\u8BBE\u7F6E\u4E2D\u5173\u95ED\u3002 \u5982\u9700\u7F16\u8F91\uFF0C\u8BF7\u5728\u201C\u7CFB\u7EDF\u4E0E\u8C03\u8BD5\u8BBE\u7F6E \u2192 \u5B9E\u9A8C\u4E0E\u9AD8\u7EA7\u201D\u4E2D\u5F00\u542F\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: `magick-ad-tab-panel ${activeContentType === 'image' ? '' : 'is-hidden'}`
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Panel, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
      initialOpen: true
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TabPanel, {
      className: "magick-ad-image-tabs",
      tabs: [{
        name: 'content',
        title: '内容'
      }, {
        name: 'settings',
        title: '配置'
      }],
      initialTabName: imageTab,
      onSelect: name => setImageTab(name),
      key: imageTab
    }, imageTabView => {
      var _selectedAd$content$i, _selectedAd$content$i2, _selectedAd$content$i3, _selectedAd$content$i4, _selectedAd$content$i5, _selectedAd$content$i6;
      return imageTabView.name === 'content' ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_LinkPicker__WEBPACK_IMPORTED_MODULE_16__["default"], {
        value: selectedAd.content?.link || '',
        target: selectedAd.content?.link_target,
        onChange: ({
          url,
          target
        }) => handleUpdateContent({
          link: url,
          link_target: Boolean(target)
        })
      }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-field"
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
        className: "magick-ad-field__label"
      }, "\u56FE\u7247"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_ImagePicker__WEBPACK_IMPORTED_MODULE_14__["default"], {
        value: selectedAd.content?.image || null,
        onChange: value => handleUpdateContent({
          image: value
        })
      })), renderVariantSection('image')) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
        status: "info",
        isDismissible: false
      }, "\u56FE\u7247\u914D\u7F6E\u4EC5\u5F71\u54CD\u56FE\u7247\u672C\u4F53\uFF08img\uFF09\u3002\u5BB9\u5668\u80CC\u666F\u3001\u5185\u8FB9\u8DDD\u3001 \u9634\u5F71\u7B49\u8BF7\u5728\u53F3\u4FA7\u201C\u5BB9\u5668\u5916\u89C2\u201D\u4E2D\u8BBE\u7F6E\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-field"
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
        className: "magick-ad-field__label"
      }, "\u6C34\u5370"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
        className: "description"
      }, "\u6C34\u5370\u5C06\u663E\u793A\u5728\u56FE\u7247\u4E2D\u7684\u53F3\u4E0B\u89D2\uFF0C\u9ED8\u8BA4\u9690\u85CF\u6C34\u5370\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
        label: selectedAd.content?.image_settings?.watermark ? '显示' : '隐藏',
        checked: Boolean(selectedAd.content?.image_settings?.watermark),
        onChange: value => handleUpdateImageSettings({
          watermark: value
        })
      })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-image-grid"
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
        label: "\u56FE\u7247\u5706\u89D2",
        type: "number",
        min: 0,
        value: (_selectedAd$content$i = selectedAd.content?.image_settings?.radius) !== null && _selectedAd$content$i !== void 0 ? _selectedAd$content$i : 0,
        onChange: value => handleUpdateImageSettings({
          radius: Number(value)
        }),
        help: "\u50CF\u7D20"
      }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
        label: "\u56FE\u7247\u6700\u5927\u5BBD\u5EA6",
        type: "number",
        min: 0,
        value: (_selectedAd$content$i2 = selectedAd.content?.image_settings?.max_width) !== null && _selectedAd$content$i2 !== void 0 ? _selectedAd$content$i2 : 1200,
        onChange: value => handleUpdateImageSettings({
          max_width: Number(value)
        }),
        help: "\u50CF\u7D20"
      }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
        label: "\u56FE\u7247\u8DDD\u79BB\u9876\u90E8",
        type: "number",
        min: 0,
        value: (_selectedAd$content$i3 = selectedAd.content?.image_settings?.margin_top) !== null && _selectedAd$content$i3 !== void 0 ? _selectedAd$content$i3 : 0,
        onChange: value => handleUpdateImageSettings({
          margin_top: Number(value)
        }),
        help: "\u50CF\u7D20"
      }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
        label: "\u56FE\u7247\u8DDD\u79BB\u5E95\u90E8",
        type: "number",
        min: 0,
        value: (_selectedAd$content$i4 = selectedAd.content?.image_settings?.margin_bottom) !== null && _selectedAd$content$i4 !== void 0 ? _selectedAd$content$i4 : 0,
        onChange: value => handleUpdateImageSettings({
          margin_bottom: Number(value)
        }),
        help: "\u50CF\u7D20"
      }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
        label: "\u56FE\u7247\u8DDD\u79BB\u5DE6\u8FB9",
        type: "number",
        min: 0,
        value: (_selectedAd$content$i5 = selectedAd.content?.image_settings?.margin_left) !== null && _selectedAd$content$i5 !== void 0 ? _selectedAd$content$i5 : 0,
        onChange: value => handleUpdateImageSettings({
          margin_left: Number(value)
        }),
        help: "\u50CF\u7D20"
      }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
        label: "\u56FE\u7247\u8DDD\u79BB\u53F3\u8FB9",
        type: "number",
        min: 0,
        value: (_selectedAd$content$i6 = selectedAd.content?.image_settings?.margin_right) !== null && _selectedAd$content$i6 !== void 0 ? _selectedAd$content$i6 : 0,
        onChange: value => handleUpdateImageSettings({
          margin_right: Number(value)
        }),
        help: "\u50CF\u7D20"
      })));
    })))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: `magick-ad-tab-panel ${activeContentType === 'html' ? '' : 'is-hidden'}`
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Panel, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
      initialOpen: true
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TabPanel, {
      className: "magick-ad-html-tabs",
      tabs: [{
        name: 'content',
        title: '内容'
      }, {
        name: 'settings',
        title: '配置'
      }],
      initialTabName: htmlTab,
      onSelect: name => setHtmlTab(name)
    }, () => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: `magick-ad-html-tab ${htmlTab === 'content' ? '' : 'is-hidden'}`
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_ClassicEditor__WEBPACK_IMPORTED_MODULE_17__["default"], {
      value: selectedAd.content?.html || '',
      active: activeContentType === 'html',
      onChange: value => handleUpdateContent({
        html: value
      })
    }), renderVariantSection('html')), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: `magick-ad-html-tab ${htmlTab === 'settings' ? '' : 'is-hidden'}`
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TabPanel, {
      className: "magick-ad-html-settings-tabs",
      tabs: [{
        name: 'mode',
        title: '模式/安全'
      }, {
        name: 'custom',
        title: '自定义'
      }, {
        name: 'runtime',
        title: '加载/变量'
      }, {
        name: 'scripts',
        title: '脚本域名'
      }],
      initialTabName: htmlSettingsTab,
      onSelect: name => setHtmlSettingsTab(name),
      key: htmlSettingsTab
    }, settingsTabView => {
      if (settingsTabView.name === 'mode') {
        return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, isExpertMode ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
          label: "HTML \u6A21\u5F0F",
          value: selectedAd.options?.html_mode || 'safe',
          options: [{
            label: '安全模式（默认，过滤脚本）',
            value: 'safe'
          }, {
            label: '完全模式（允许脚本）',
            value: 'full'
          }],
          onChange: value => {
            if (value === 'full' && !canUnfilteredHtml) {
              showNotice('error', '当前账号无 unfiltered_html 权限，无法启用完全模式。', 3500);
              handleUpdateOptions({
                html_mode: 'safe'
              });
              return;
            }
            handleUpdateOptions({
              html_mode: value
            });
          },
          help: "\u5B89\u5168\u6A21\u5F0F\u4F1A\u8FC7\u6EE4\u811A\u672C/iframe\uFF1B\u9700\u8981\u7B2C\u4E09\u65B9\u811A\u672C\u6216 head \u6295\u653E\u8BF7\u5207\u6362\u5B8C\u5168\u6A21\u5F0F\uFF08\u591A\u7AD9\u70B9\u5F3A\u5236\u5B89\u5168\uFF09\u3002"
        }) : !isQuickMode ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
          status: "info",
          isDismissible: false
        }, "\u5F53\u524D\u662F\u201C\u8BBE\u8BA1\u6A21\u5F0F\u201D\uFF1AHTML \u5F3A\u5236\u4F7F\u7528\u201C\u5B89\u5168\u6A21\u5F0F\uFF08\u8FC7\u6EE4\u811A\u672C\uFF09\u201D\u3002 \u5982\u9700\u542F\u7528\u811A\u672C\uFF0C\u8BF7\u5207\u6362\u5230\u201C\u4E13\u5BB6\u6A21\u5F0F\u201D\u3002") : null, selectedAd.options?.html_mode === 'full' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
          status: "error",
          isDismissible: false
        }, "\u5B8C\u5168\u6A21\u5F0F\u4F1A\u6267\u884C\u7B2C\u4E09\u65B9\u811A\u672C\u4E0E\u5185\u8054\u4EE3\u7801\uFF0C\u5B58\u5728\u5B89\u5168\u98CE\u9669\u3002\u8BF7\u4EC5\u4F7F\u7528\u53EF\u4FE1\u6765\u6E90\uFF0C\u5E76\u7ED3\u5408\u811A\u672C\u767D\u540D\u5355/\u6C99\u7BB1\u7B56\u7565\u3002"), selectedAd.options?.html_mode === 'safe' && /<script[\s>]/i.test(selectedAd.content?.html || '') && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
          status: "warning",
          isDismissible: false
        }, "\u68C0\u6D4B\u5230", ' ', (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("code", null, "<script>"), ' ', "\u6807\u7B7E\u3002\u5B89\u5168\u6A21\u5F0F\u4F1A\u79FB\u9664\u811A\u672C\uFF0C\u8BF7\u5207\u6362\u5230\u201C\u5B8C\u5168\u6A21\u5F0F\u201D\u5E76\u786E\u4FDD\u8D26\u53F7\u5177\u5907\u6743\u9650\u3002"), selectedAd.options?.html_mode === 'full' && !canUnfilteredHtml && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
          status: "error",
          isDismissible: false
        }, "\u5F53\u524D\u8D26\u53F7\u65E0 unfiltered_html \u6743\u9650\uFF0C\u811A\u672C\u4F1A\u88AB\u8FC7\u6EE4\u5E76\u81EA\u52A8\u56DE\u9000\u5230\u5B89\u5168\u6A21\u5F0F\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
          label: "iframe \u6C99\u7BB1",
          value: selectedAd.options?.html_sandbox || 'inherit',
          options: [{
            label: '跟随系统设置',
            value: 'inherit'
          }, {
            label: '强制启用',
            value: 'enable'
          }, {
            label: '强制关闭',
            value: 'disable'
          }],
          onChange: value => handleUpdateOptions({
            html_sandbox: value
          }),
          help: "\u4EC5\u5BF9 HTML \u5B8C\u5168\u6A21\u5F0F\u751F\u6548\uFF1B\u7CFB\u7EDF\u7EA7\u5F00\u5173\u5728\u201C\u7CFB\u7EDF\u8BBE\u7F6E\u201D\u4E2D\u3002"
        }), !isQuickMode && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
          status: "info",
          isDismissible: false
        }, "\u6C99\u7BB1\u53EA\u5BF9\u201C\u5B8C\u5168\u6A21\u5F0F\u201D\u751F\u6548\uFF1A\u542F\u7528\u540E HTML \u4F1A\u5728 iframe \u4E2D\u8FD0\u884C\uFF1B\u5173\u95ED\u5C06\u76F4\u63A5\u6267\u884C\u9875\u9762\u811A\u672C\u3002"));
      }
      if (settingsTabView.name === 'custom') {
        return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextareaControl, {
          label: "\u9644\u52A0 HTML\uFF08\u53EF\u9009\uFF09",
          value: selectedAd.content?.custom_html || '',
          onChange: value => handleUpdateContent({
            custom_html: value
          }),
          help: "\u4F1A\u8FFD\u52A0\u5728\u5E7F\u544A\u5185\u5BB9\u540E\u9762\u3002"
        }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextareaControl, {
          label: "\u81EA\u5B9A\u4E49 CSS\uFF08\u53EF\u9009\uFF09",
          value: selectedAd.content?.custom_css || '',
          onChange: value => handleUpdateContent({
            custom_css: value
          }),
          help: "\u65E0\u9700\u5199 <style> \u6807\u7B7E\uFF0C\u7CFB\u7EDF\u4F1A\u81EA\u52A8\u5305\u88F9\u3002"
        }), isExpertMode ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextareaControl, {
          label: "\u81EA\u5B9A\u4E49 JS\uFF08\u53EF\u9009\uFF09",
          value: selectedAd.content?.custom_js || '',
          onChange: value => handleUpdateContent({
            custom_js: value
          }),
          help: "\u4EC5\u4E13\u5BB6\u6A21\u5F0F\u53EF\u7528\uFF0C\u7CFB\u7EDF\u4F1A\u81EA\u52A8\u5305\u88F9 <script>\u3002"
        }) : null);
      }
      if (settingsTabView.name === 'runtime') {
        var _selectedAd$content$h;
        return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
          label: "\u542F\u7528\u53D8\u91CF\u66FF\u6362",
          checked: selectedAd.content?.html_runtime_vars !== false,
          onChange: value => handleUpdateContent({
            html_runtime_vars: value
          }),
          help: "\u652F\u6301 {site_url} / {page_url} / {ad_id}"
        }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
          label: "\u8F7D\u5165\u65B9\u5F0F",
          value: selectedAd.content?.html_load_strategy || 'immediate',
          options: [{
            label: '立即加载',
            value: 'immediate'
          }, {
            label: '延迟加载',
            value: 'delay'
          }, {
            label: '视窗内加载',
            value: 'viewport'
          }],
          onChange: value => handleUpdateContent({
            html_load_strategy: value
          }),
          help: "\u5EF6\u8FDF\u4E0E\u89C6\u7A97\u5185\u52A0\u8F7D\u53EF\u51CF\u5C11\u9996\u5C4F\u538B\u529B\u3002"
        }), selectedAd.content?.html_load_strategy === 'delay' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
          label: "\u5EF6\u8FDF\u65F6\u95F4\uFF08\u6BEB\u79D2\uFF09",
          type: "number",
          min: 0,
          value: (_selectedAd$content$h = selectedAd.content?.html_load_delay) !== null && _selectedAd$content$h !== void 0 ? _selectedAd$content$h : 0,
          onChange: value => handleUpdateContent({
            html_load_delay: Number(value)
          })
        }));
      }
      if (settingsTabView.name === 'scripts') {
        if (isQuickMode) {
          return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
            status: "info",
            isDismissible: false
          }, "\u5FEB\u901F\u6A21\u5F0F\u5DF2\u9690\u85CF\u811A\u672C\u57DF\u540D\u914D\u7F6E\uFF0C\u8BF7\u5207\u6362\u5230\u201C\u8BBE\u8BA1\u6A21\u5F0F/\u4E13\u5BB6\u6A21\u5F0F\u201D\u67E5\u770B\u3002");
        }
        const allowlist = Array.isArray(selectedAd.content?.html_script_allowlist) ? selectedAd.content?.html_script_allowlist : [];
        const blocklist = Array.isArray(selectedAd.content?.html_script_blocklist) ? selectedAd.content?.html_script_blocklist : [];
        const addDomain = (domain, listKey) => {
          const nextAllow = listKey === 'allow' ? Array.from(new Set([...allowlist, domain])) : allowlist.filter(item => item !== domain);
          const nextBlock = listKey === 'block' ? Array.from(new Set([...blocklist, domain])) : blocklist.filter(item => item !== domain);
          handleUpdateContent({
            html_script_allowlist: nextAllow,
            html_script_blocklist: nextBlock
          });
        };
        return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, detectedScriptDomains?.length > 0 && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
          className: "magick-ad-script-domains"
        }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
          className: "magick-ad-script-domains__title"
        }, "\u68C0\u6D4B\u5230\u811A\u672C\u57DF\u540D"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
          className: "magick-ad-script-domains__list"
        }, detectedScriptDomains.map(domain => {
          const isAllowed = allowlist.includes(domain);
          const isBlocked = blocklist.includes(domain);
          return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            key: domain,
            className: "magick-ad-script-domains__item"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
            className: "magick-ad-script-domains__domain"
          }, domain), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-script-domains__actions"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
            variant: isAllowed ? 'secondary' : 'primary',
            size: "small",
            disabled: isAllowed,
            onClick: () => addDomain(domain, 'allow')
          }, isAllowed ? '已在白名单' : '加入白名单'), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
            variant: isBlocked ? 'secondary' : 'tertiary',
            size: "small",
            disabled: isBlocked,
            onClick: () => addDomain(domain, 'block')
          }, isBlocked ? '已在黑名单' : '加入黑名单')));
        })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
          className: "magick-ad-script-domains__help"
        }, "\u7CFB\u7EDF\u9ED8\u8BA4\u4EC5\u5141\u8BB8\u672C\u7AD9\u57DF\u540D\u3002\u5C06\u5916\u90E8\u57DF\u540D\u52A0\u5165\u767D\u540D\u5355\u540E\uFF0C\u811A\u672C\u624D\u4F1A\u4FDD\u7559\u3002")), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextareaControl, {
          label: "\u811A\u672C\u767D\u540D\u5355\uFF08\u8FFD\u52A0\u57DF\u540D\uFF09",
          value: formatDomainList(selectedAd.content?.html_script_allowlist),
          onChange: value => handleUpdateContent({
            html_script_allowlist: parseDomainList(value)
          }),
          help: "\u7CFB\u7EDF\u9ED8\u8BA4\u4EC5\u5141\u8BB8\u5F53\u524D\u7AD9\u70B9\u57DF\u540D\uFF0C\u6B64\u5904\u4E3A\u8FFD\u52A0\u767D\u540D\u5355\u3002\u6BCF\u884C\u4E00\u4E2A\u57DF\u540D\u6216\u7528\u9017\u53F7\u5206\u9694\u3002"
        }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextareaControl, {
          label: "\u811A\u672C\u9ED1\u540D\u5355\uFF08\u8FFD\u52A0\u57DF\u540D\uFF09",
          value: formatDomainList(selectedAd.content?.html_script_blocklist),
          onChange: value => handleUpdateContent({
            html_script_blocklist: parseDomainList(value)
          }),
          help: "\u7CFB\u7EDF\u7EA7\u9ED1\u540D\u5355\u4F18\u5148\u751F\u6548\uFF0C\u6B64\u5904\u4E3A\u8FFD\u52A0\u9ED1\u540D\u5355\u3002\u547D\u4E2D\u5373\u79FB\u9664\u3002"
        }));
      }
      return null;
    }))))))), activeContentType === 'video' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Panel, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
      initialOpen: true
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TabPanel, {
      className: "magick-ad-video-tabs",
      tabs: [{
        name: 'content',
        title: '内容'
      }, {
        name: 'settings',
        title: '配置'
      }],
      initialTabName: videoTab,
      onSelect: name => setVideoTab(name),
      key: videoTab
    }, videoTabView => {
      const videoSettings = selectedAd.content?.video_settings || {};
      const isEmbed = videoSettings.type === 'embed';
      return videoTabView.name === 'content' ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-video-input"
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
        className: "magick-ad-field__label"
      }, isEmbed ? '嵌入地址' : '视频地址'), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-video-input-row"
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
        value: selectedAd.content?.video_url || '',
        onChange: value => handleUpdateContent({
          video_url: value
        })
      }), !isEmbed && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_VideoPicker__WEBPACK_IMPORTED_MODULE_15__["default"], {
        value: selectedAd.content?.video_url || '',
        onChange: value => handleUpdateContent({
          video_url: value
        }),
        compact: true
      })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
        className: "magick-ad-field__help"
      }, isEmbed ? '支持 YouTube/Bilibili 等嵌入链接' : '支持 MP4 链接')), !isEmbed && selectedAd.content?.video_url && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "magick-ad-video-preview"
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("video", {
        src: selectedAd.content?.video_url || '',
        controls: true
      })), renderVariantSection('video')) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TabPanel, {
        className: "magick-ad-video-settings-tabs",
        tabs: [{
          name: 'basic',
          title: '基础'
        }, {
          name: 'cover',
          title: '封面'
        }, {
          name: 'playback',
          title: '播放'
        }, {
          name: 'track',
          title: '追踪'
        }],
        initialTabName: videoSettingsTab,
        onSelect: name => setVideoSettingsTab(name),
        key: videoSettingsTab
      }, settingsTabView => {
        if (settingsTabView.name === 'basic') {
          return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
            label: "\u89C6\u9891\u7C7B\u578B",
            value: videoSettings.type || 'mp4',
            options: [{
              label: 'MP4',
              value: 'mp4'
            }, {
              label: '嵌入（iframe）',
              value: 'embed'
            }],
            onChange: value => handleUpdateVideoSettings({
              type: value
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
            label: "\u6BD4\u4F8B",
            value: videoSettings.aspect_ratio || '16:9',
            options: [{
              label: '自适应',
              value: 'auto'
            }, {
              label: '16:9',
              value: '16:9'
            }, {
              label: '4:3',
              value: '4:3'
            }, {
              label: '1:1',
              value: '1:1'
            }, {
              label: '9:16',
              value: '9:16'
            }, {
              label: '自定义',
              value: 'custom'
            }],
            onChange: value => handleUpdateVideoSettings({
              aspect_ratio: value
            })
          }), videoSettings.aspect_ratio === 'custom' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
            label: "\u81EA\u5B9A\u4E49\u6BD4\u4F8B\uFF08\u5982 3:2\uFF09",
            value: videoSettings.aspect_ratio_custom || '',
            onChange: value => handleUpdateVideoSettings({
              aspect_ratio_custom: value
            }),
            help: "\u683C\u5F0F\u5982 3:2\u300121:9\u3002"
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
            label: "\u9884\u52A0\u8F7D",
            value: videoSettings.preload || 'metadata',
            options: [{
              label: 'metadata',
              value: 'metadata'
            }, {
              label: 'auto',
              value: 'auto'
            }, {
              label: 'none',
              value: 'none'
            }],
            onChange: value => handleUpdateVideoSettings({
              preload: value
            })
          }));
        }
        if (settingsTabView.name === 'cover') {
          if (isEmbed) {
            return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
              status: "info",
              isDismissible: false
            }, "\u5D4C\u5165\u89C6\u9891\u7531\u7B2C\u4E09\u65B9\u64AD\u653E\u5668\u63A7\u5236\uFF0C\u5C01\u9762\u8BBE\u7F6E\u4E0D\u53EF\u7528\u3002");
          }
          return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
            label: "\u5C01\u9762\u7B56\u7565",
            value: videoSettings.poster_mode || 'manual',
            options: [{
              label: '使用封面图',
              value: 'manual'
            }, {
              label: '无封面时取首帧',
              value: 'auto'
            }],
            onChange: value => handleUpdateVideoSettings({
              poster_mode: value
            })
          }), videoSettings.poster_mode !== 'auto' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-field"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
            className: "magick-ad-field__label"
          }, "\u5C01\u9762\u56FE"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_ImagePicker__WEBPACK_IMPORTED_MODULE_14__["default"], {
            value: videoSettings.poster || {},
            onChange: value => handleUpdateVideoSettings({
              poster: value
            })
          })));
        }
        if (settingsTabView.name === 'playback') {
          return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-image-grid"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
            label: "\u81EA\u52A8\u64AD\u653E",
            checked: Boolean(videoSettings.autoplay),
            onChange: value => handleUpdateVideoSettings({
              autoplay: value,
              muted: value ? true : Boolean(videoSettings.muted)
            }),
            help: "\u81EA\u52A8\u64AD\u653E\u901A\u5E38\u9700\u8981\u9759\u97F3\u3002"
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
            label: "\u9996\u6B21\u5C55\u793A\u81EA\u52A8\u64AD\u653E",
            checked: Boolean(videoSettings.autoplay_first),
            onChange: value => handleUpdateVideoSettings({
              autoplay_first: value
            }),
            help: "\u4EC5\u9996\u6B21\u5C55\u793A\u65F6\u5C1D\u8BD5\u81EA\u52A8\u64AD\u653E\uFF08\u4F1A\u5F3A\u5236\u9759\u97F3\uFF09\u3002"
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
            label: "\u9759\u97F3",
            checked: Boolean(videoSettings.muted),
            onChange: value => handleUpdateVideoSettings({
              muted: value
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
            label: "\u4E8C\u6B21\u5C55\u793A\u5F3A\u5236\u9759\u97F3",
            checked: Boolean(videoSettings.repeat_muted),
            onChange: value => handleUpdateVideoSettings({
              repeat_muted: value
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
            label: "\u5FAA\u73AF",
            checked: Boolean(videoSettings.loop),
            onChange: value => handleUpdateVideoSettings({
              loop: value
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
            label: "\u663E\u793A\u63A7\u5236\u6761",
            checked: videoSettings.controls !== false,
            onChange: value => handleUpdateVideoSettings({
              controls: value
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
            label: "\u79FB\u52A8\u7AEF\u5185\u5D4C\u64AD\u653E",
            checked: videoSettings.playsinline !== false,
            onChange: value => handleUpdateVideoSettings({
              playsinline: value
            })
          })));
        }
        if (settingsTabView.name === 'track') {
          return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
            label: "\u8FFD\u8E2A\u64AD\u653E/\u6682\u505C/\u5B8C\u6210",
            checked: Boolean(videoSettings.track_events),
            onChange: value => handleUpdateVideoSettings({
              track_events: value
            }),
            help: "\u4F1A\u5411\u7EDF\u8BA1\u63A5\u53E3\u4E0A\u62A5\u64AD\u653E\u4E8B\u4EF6\u3002"
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
            label: "\u5907\u7528\u63D0\u793A\u6587\u6848",
            value: videoSettings.fallback_text || '',
            onChange: value => handleUpdateVideoSettings({
              fallback_text: value
            }),
            help: "\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u89C6\u9891\u65F6\u663E\u793A\u3002"
          }));
        }
        return null;
      });
    }))), activeContentType === 'block' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Panel, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
      initialOpen: true
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TabPanel, {
      className: "magick-ad-block-tabs",
      tabs: [{
        name: 'content',
        title: '内容'
      }, {
        name: 'settings',
        title: '配置'
      }],
      initialTabName: blockTab,
      onSelect: name => setBlockTab(name),
      key: blockTab
    }, blockTabView => {
      const blockSettings = selectedAd.content?.block_settings || {};
      return blockTabView.name === 'content' ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_BlockEditor__WEBPACK_IMPORTED_MODULE_18__["default"], {
        value: selectedAd.content?.blocks || '',
        onChange: value => handleUpdateContent({
          blocks: value
        })
      }), renderVariantSection('block')) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TabPanel, {
        className: "magick-ad-block-settings-tabs",
        tabs: [{
          name: 'style',
          title: '外观'
        }, {
          name: 'layout',
          title: '布局'
        }, {
          name: 'text',
          title: '标题/副标题'
        }, {
          name: 'cta',
          title: 'CTA'
        }],
        initialTabName: blockSettingsTab,
        onSelect: name => setBlockSettingsTab(name),
        key: blockSettingsTab
      }, settingsTabView => {
        if (settingsTabView.name === 'style') {
          var _blockSettings$paddin, _blockSettings$radius, _blockSettings$border, _blockSettings$max_wi, _blockSettings$font_s;
          return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-field"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
            className: "magick-ad-field__label"
          }, "\u80CC\u666F\u56FE"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_ImagePicker__WEBPACK_IMPORTED_MODULE_14__["default"], {
            value: blockSettings.background_image || {},
            onChange: value => handleUpdateBlockSettings({
              background_image: value
            })
          })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-field"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
            className: "magick-ad-field__label"
          }, "\u80CC\u666F\u8272"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ColorPicker, {
            color: blockSettings.background || 'transparent',
            onChangeComplete: value => handleUpdateBlockSettings({
              background: formatColorValue(value)
            }),
            enableAlpha: true
          })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
            label: "\u80CC\u666F\u6E10\u53D8\uFF08\u53EF\u9009\uFF09",
            value: blockSettings.background_gradient || '',
            onChange: value => handleUpdateBlockSettings({
              background_gradient: value
            }),
            help: "\u4F8B\u5982\uFF1Alinear-gradient(135deg,#60a5fa,#a78bfa)"
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-field"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
            className: "magick-ad-field__label"
          }, "\u6587\u5B57\u989C\u8272"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ColorPicker, {
            color: blockSettings.text_color || '#1d2327',
            onChangeComplete: value => handleUpdateBlockSettings({
              text_color: formatColorValue(value)
            }),
            enableAlpha: true
          })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-image-grid"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
            label: "\u5185\u8FB9\u8DDD",
            min: 0,
            max: 80,
            value: (_blockSettings$paddin = blockSettings.padding) !== null && _blockSettings$paddin !== void 0 ? _blockSettings$paddin : 0,
            onChange: value => handleUpdateBlockSettings({
              padding: Number(value)
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
            label: "\u5706\u89D2",
            min: 0,
            max: 50,
            value: (_blockSettings$radius = blockSettings.radius) !== null && _blockSettings$radius !== void 0 ? _blockSettings$radius : 0,
            onChange: value => handleUpdateBlockSettings({
              radius: Number(value)
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
            label: "\u8FB9\u6846",
            min: 0,
            max: 12,
            value: (_blockSettings$border = blockSettings.border_width) !== null && _blockSettings$border !== void 0 ? _blockSettings$border : 0,
            onChange: value => handleUpdateBlockSettings({
              border_width: Number(value)
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
            label: "\u6700\u5927\u5BBD\u5EA6",
            min: 0,
            max: 1400,
            value: (_blockSettings$max_wi = blockSettings.max_width) !== null && _blockSettings$max_wi !== void 0 ? _blockSettings$max_wi : 0,
            onChange: value => handleUpdateBlockSettings({
              max_width: Number(value)
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
            label: "\u5B57\u4F53\u5927\u5C0F",
            min: 10,
            max: 48,
            value: (_blockSettings$font_s = blockSettings.font_size) !== null && _blockSettings$font_s !== void 0 ? _blockSettings$font_s : 0,
            onChange: value => handleUpdateBlockSettings({
              font_size: Number(value)
            })
          })), blockSettings.border_width > 0 && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-field"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
            className: "magick-ad-field__label"
          }, "\u8FB9\u6846\u989C\u8272"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ColorPicker, {
            color: blockSettings.border_color || '#d0d7e2',
            onChangeComplete: value => handleUpdateBlockSettings({
              border_color: formatColorValue(value)
            })
          })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
            label: "\u9634\u5F71",
            value: blockSettings.shadow || 'none',
            options: _constants_options__WEBPACK_IMPORTED_MODULE_31__.SHADOW_OPTIONS,
            onChange: value => handleUpdateBlockSettings({
              shadow: value
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
            label: "\u5B57\u4F53\uFF08\u53EF\u9009\uFF09",
            value: blockSettings.font_family || '',
            onChange: value => handleUpdateBlockSettings({
              font_family: value
            }),
            help: "\u4F8B\u5982\uFF1APingFang SC, Arial, sans-serif"
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
            label: "\u5BF9\u9F50\u65B9\u5F0F",
            value: blockSettings.align || '',
            options: [{
              label: '默认',
              value: ''
            }, {
              label: '居中',
              value: 'center'
            }],
            onChange: value => handleUpdateBlockSettings({
              align: value
            })
          }));
        }
        if (settingsTabView.name === 'layout') {
          return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
            label: "\u5E03\u5C40",
            value: blockSettings.layout || 'content',
            options: [{
              label: '仅内容',
              value: 'content'
            }, {
              label: '上图下文',
              value: 'stack'
            }, {
              label: '左图右文',
              value: 'split'
            }, {
              label: '右图左文',
              value: 'split-reverse'
            }],
            onChange: value => handleUpdateBlockSettings({
              layout: value
            })
          }), blockSettings.layout && blockSettings.layout !== 'content' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-field"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
            className: "magick-ad-field__label"
          }, "\u5185\u5BB9\u914D\u56FE"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_ImagePicker__WEBPACK_IMPORTED_MODULE_14__["default"], {
            value: blockSettings.media_image || {},
            onChange: value => handleUpdateBlockSettings({
              media_image: value
            })
          })));
        }
        if (settingsTabView.name === 'text') {
          var _blockSettings$headin, _blockSettings$headin2, _blockSettings$subhea, _blockSettings$subhea2;
          return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
            label: "\u6807\u9898",
            value: blockSettings.heading || '',
            onChange: value => handleUpdateBlockSettings({
              heading: value
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
            label: "\u526F\u6807\u9898",
            value: blockSettings.subheading || '',
            onChange: value => handleUpdateBlockSettings({
              subheading: value
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-image-grid"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
            label: "\u6807\u9898\u5B57\u53F7",
            min: 12,
            max: 48,
            value: (_blockSettings$headin = blockSettings.heading_size) !== null && _blockSettings$headin !== void 0 ? _blockSettings$headin : 0,
            onChange: value => handleUpdateBlockSettings({
              heading_size: Number(value)
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
            label: "\u6807\u9898\u884C\u9AD8",
            min: 1,
            max: 2.4,
            step: 0.1,
            value: (_blockSettings$headin2 = blockSettings.heading_line_height) !== null && _blockSettings$headin2 !== void 0 ? _blockSettings$headin2 : 0,
            onChange: value => handleUpdateBlockSettings({
              heading_line_height: Number(value)
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
            label: "\u6807\u9898\u5B57\u91CD",
            value: blockSettings.heading_weight || 'semibold',
            options: [{
              label: 'Normal',
              value: 'normal'
            }, {
              label: 'Medium',
              value: 'medium'
            }, {
              label: 'Semibold',
              value: 'semibold'
            }, {
              label: 'Bold',
              value: 'bold'
            }, {
              label: 'Black',
              value: 'black'
            }],
            onChange: value => handleUpdateBlockSettings({
              heading_weight: value
            })
          })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-image-grid"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
            label: "\u526F\u6807\u9898\u5B57\u53F7",
            min: 10,
            max: 32,
            value: (_blockSettings$subhea = blockSettings.subheading_size) !== null && _blockSettings$subhea !== void 0 ? _blockSettings$subhea : 0,
            onChange: value => handleUpdateBlockSettings({
              subheading_size: Number(value)
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
            label: "\u526F\u6807\u9898\u884C\u9AD8",
            min: 1,
            max: 2.4,
            step: 0.1,
            value: (_blockSettings$subhea2 = blockSettings.subheading_line_height) !== null && _blockSettings$subhea2 !== void 0 ? _blockSettings$subhea2 : 0,
            onChange: value => handleUpdateBlockSettings({
              subheading_line_height: Number(value)
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
            label: "\u526F\u6807\u9898\u5B57\u91CD",
            value: blockSettings.subheading_weight || 'normal',
            options: [{
              label: 'Normal',
              value: 'normal'
            }, {
              label: 'Medium',
              value: 'medium'
            }, {
              label: 'Semibold',
              value: 'semibold'
            }, {
              label: 'Bold',
              value: 'bold'
            }, {
              label: 'Black',
              value: 'black'
            }],
            onChange: value => handleUpdateBlockSettings({
              subheading_weight: value
            })
          })));
        }
        if (settingsTabView.name === 'cta') {
          var _blockSettings$cta_ra;
          return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
            label: "\u6309\u94AE\u6587\u6848",
            value: blockSettings.cta_text || '',
            onChange: value => handleUpdateBlockSettings({
              cta_text: value
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_LinkPicker__WEBPACK_IMPORTED_MODULE_16__["default"], {
            value: blockSettings.cta_link || '',
            target: blockSettings.cta_target,
            onChange: ({
              url,
              target
            }) => handleUpdateBlockSettings({
              cta_link: url,
              cta_target: Boolean(target)
            })
          }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-image-grid"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-field"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
            className: "magick-ad-field__label"
          }, "\u6309\u94AE\u80CC\u666F"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ColorPicker, {
            color: blockSettings.cta_background || '#2563eb',
            onChangeComplete: value => handleUpdateBlockSettings({
              cta_background: formatColorValue(value)
            })
          })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-field"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
            className: "magick-ad-field__label"
          }, "\u6309\u94AE\u6587\u5B57"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ColorPicker, {
            color: blockSettings.cta_text_color || '#ffffff',
            onChangeComplete: value => handleUpdateBlockSettings({
              cta_text_color: formatColorValue(value)
            })
          }))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
            label: "\u6309\u94AE\u5706\u89D2",
            min: 0,
            max: 999,
            value: (_blockSettings$cta_ra = blockSettings.cta_radius) !== null && _blockSettings$cta_ra !== void 0 ? _blockSettings$cta_ra : 0,
            onChange: value => handleUpdateBlockSettings({
              cta_radius: Number(value)
            })
          }));
        }
        return null;
      });
    }))));
  }) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-empty"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, "\u8BF7\u9009\u62E9\u4E00\u4E2A\u5E7F\u544A\u7EC4\u8FDB\u884C\u914D\u7F6E\u3002"));
  const renderPublishSection = () => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-right-section"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-right-section__header"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-right-section__title"
  }, "\u53D1\u5E03\u4E0E\u6392\u671F"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-right-section__meta"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    className: "magick-ad-save-button",
    variant: "primary",
    onClick: handleSave,
    isBusy: isSaving,
    disabled: isSaving || !selectedAd
  }, isSaving ? '保存中...' : '保存'), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: `magick-ad-status-pill ${statusMeta(selectedAd).className}`
  }, statusMeta(selectedAd).label))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-right-section__body"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u53D1\u5E03\u72B6\u6001",
    value: resolveStatus(selectedAd),
    options: [{
      label: '已发布',
      value: 'publish'
    }, {
      label: '待审核',
      value: 'pending'
    }, {
      label: '草稿/停用',
      value: 'draft'
    }, ...(resolveStatus(selectedAd) === 'future' ? [{
      label: '已排期',
      value: 'future',
      disabled: true
    }] : [])],
    onChange: value => {
      if (!selectedAd) {
        return;
      }
      if (value === 'draft') {
        handleUpdateMeta({
          status: 'draft',
          options: {
            ...selectedAd.options,
            enabled: false
          }
        });
        return;
      }
      if (value === 'pending') {
        handleUpdateMeta({
          status: 'pending',
          options: {
            ...selectedAd.options,
            enabled: true
          }
        });
        return;
      }
      const nextDate = selectedAd.date && isFutureDate(selectedAd.date) ? formatDateFromDate(new Date()) : selectedAd.date || '';
      handleUpdateMeta({
        status: 'publish',
        date: nextDate,
        options: {
          ...selectedAd.options,
          enabled: true
        }
      });
    }
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-right-subsection"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-right-subsection__title"
  }, "\u6295\u653E\u5468\u671F"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-right-subsection__body"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u5F00\u59CB\u65F6\u95F4",
    type: "datetime-local",
    value: formatDateTimeLocalInput(selectedAd.options?.start_date),
    onChange: value => handleUpdateOptions({
      start_date: formatDateTimeStorage(value)
    }),
    help: "\u5F00\u59CB\u65F6\u95F4\u4E3A\u7A7A\u8868\u793A\u7ACB\u5373\u751F\u6548\u3002"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u7ED3\u675F\u65F6\u95F4",
    type: "datetime-local",
    value: formatEndDateTimeLocalInput(selectedAd.options?.end_date),
    onChange: value => handleUpdateOptions({
      end_date: formatDateTimeStorage(value)
    }),
    help: "\u7ED3\u675F\u65F6\u95F4\u4E3A\u7A7A\u8868\u793A\u957F\u671F\u6709\u6548\uFF0C\u652F\u6301\u5230\u5206\u949F\u3002"
  })))));
  const renderPreviewControls = () => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-preview-target"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-preview-target__title"
  }, "\u9884\u89C8\u9875\u9762"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-preview-target__mode"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ButtonGroup, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    isPressed: previewMode === 'url',
    onClick: () => setPreviewMode('url')
  }, "\u94FE\u63A5"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    isPressed: previewMode === 'post',
    onClick: () => setPreviewMode('post')
  }, "\u6587\u7AE0"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    isPressed: previewMode === 'page',
    onClick: () => setPreviewMode('page')
  }, "\u9875\u9762"))), previewMode === 'url' ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u9875\u9762\u94FE\u63A5\uFF08\u4EC5\u652F\u6301\u672C\u7AD9\uFF09",
    value: previewTarget,
    placeholder: "https://example.com/your-page",
    onChange: value => setPreviewTarget(value),
    help: "\u586B\u5199\u540E\u5C06\u4F7F\u7528\u8BE5\u9875\u9762\u4F5C\u4E3A\u9884\u89C8\u73AF\u5883\u3002"
  }) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ComboboxControl, {
    label: "\u9009\u62E9\u9875\u9762",
    value: previewSelected,
    options: previewOptions,
    onChange: handlePreviewSelect,
    onFilterValueChange: value => setPreviewSearch(value),
    placeholder: previewMode === 'page' ? '搜索页面...' : '搜索文章...',
    help: previewLoading ? '正在加载列表...' : '选择后将自动作为预览环境'
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-preview-target__actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    onClick: () => setPreviewTarget(window?.MagickAD?.previewUrl || '')
  }, "\u4F7F\u7528\u9996\u9875"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "tertiary",
    onClick: () => setPreviewTarget('')
  }, "\u6E05\u7A7A")), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u6A21\u62DF\u767B\u5F55\u6001",
    value: previewLogin,
    options: [{
      label: '跟随真实状态',
      value: 'auto'
    }, {
      label: '模拟已登录',
      value: 'logged-in'
    }, {
      label: '模拟未登录',
      value: 'logged-out'
    }],
    onChange: value => setPreviewLogin(value),
    help: "\u4EC5\u5F71\u54CD\u9884\u89C8\u547D\u4E2D\u5224\u65AD\uFF0C\u4E0D\u4F1A\u6539\u53D8\u771F\u5B9E\u767B\u5F55\u6001\u3002"
  }));
  const renderAdvancedControls = ({
    includePreview = true
  } = {}) => {
    var _selectedAd$options$p, _selectedAd$options$w;
    return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
      label: "\u4F18\u5148\u7EA7\uFF08\u8D8A\u5927\u8D8A\u5148\u5C55\u793A\uFF09",
      type: "number",
      min: 1,
      value: (_selectedAd$options$p = selectedAd.options?.priority) !== null && _selectedAd$options$p !== void 0 ? _selectedAd$options$p : 10,
      onChange: value => handleUpdateOptions({
        priority: Math.max(1, Number(value) || 1)
      }),
      help: "\u540C\u4E00 Slot \u5185\u4F18\u5148\u7EA7\u6700\u9AD8\u7684\u5E7F\u544A\u4F18\u5148\u51FA\u573A\u3002"
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
      label: "\u6743\u91CD\uFF08\u540C\u4F18\u5148\u7EA7\u4E0B\u968F\u673A\uFF09",
      type: "number",
      min: 1,
      value: (_selectedAd$options$w = selectedAd.options?.weight) !== null && _selectedAd$options$w !== void 0 ? _selectedAd$options$w : 1,
      onChange: value => handleUpdateOptions({
        weight: Math.max(1, Number(value) || 1)
      }),
      help: "\u4EC5\u5BF9\u540C\u4F18\u5148\u7EA7\u5E7F\u544A\u751F\u6548\uFF0C\u6743\u91CD\u8D8A\u5927\u8D8A\u5BB9\u6613\u88AB\u9009\u4E2D\u3002"
    }), includePreview && renderPreviewControls());
  };
  const renderFrequencyAdvancedTab = (behavior = {}, {
    showAdvanced = true
  } = {}) => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Panel, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
    title: "\u9891\u63A7",
    opened: frequencyPanelOpen === 'frequency',
    onToggle: () => setFrequencyPanelOpen(prev => prev === 'frequency' ? null : 'frequency')
  }, renderFrequencyControls(behavior)), showAdvanced && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
    title: "\u9AD8\u7EA7\u8BBE\u7F6E",
    opened: frequencyPanelOpen === 'advanced',
    onToggle: () => setFrequencyPanelOpen(prev => prev === 'advanced' ? null : 'advanced')
  }, renderAdvancedControls({
    includePreview: false
  })));
  const renderPlacementSection = () => {
    var _selectedAd$content$c;
    return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-right-section"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-right-section__body"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-mode-switch"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-mode-switch__label"
    }, "\u7F16\u8F91\u6A21\u5F0F"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ButtonGroup, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
      variant: "secondary",
      isPressed: effectiveEditorMode === 'quick',
      onClick: () => updateEditorMode('quick')
    }, "\u5FEB\u901F\u6A21\u5F0F"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
      variant: "secondary",
      isPressed: effectiveEditorMode === 'design',
      onClick: () => updateEditorMode('design')
    }, "\u8BBE\u8BA1\u6A21\u5F0F"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
      variant: "secondary",
      isPressed: effectiveEditorMode === 'expert',
      onClick: () => {
        if (!canUnfilteredHtml) {
          showNotice('error', '当前账号无 unfiltered_html 权限，无法启用专家模式。', 3500);
          return;
        }
        updateEditorMode('expert');
      },
      disabled: !canUnfilteredHtml
    }, "\u4E13\u5BB6\u6A21\u5F0F"))), editorModeRaw === 'expert' && !canUnfilteredHtml && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
      status: "warning",
      isDismissible: false
    }, "\u4E13\u5BB6\u6A21\u5F0F\u9700\u8981 unfiltered_html \u6743\u9650\uFF0C\u5DF2\u56DE\u9000\u4E3A\u8BBE\u8BA1\u6A21\u5F0F\u3002"), effectiveEditorMode === 'quick' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Panel, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
      title: "\u5FEB\u901F\u8BBE\u7F6E",
      opened: quickPanelOpen === 'quick',
      onToggle: () => setQuickPanelOpen(prev => prev === 'quick' ? null : 'quick')
    }, isHeadPlacement && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
      status: "warning",
      isDismissible: false
    }, "Head \u4F4D\u7F6E\u4EC5\u5141\u8BB8\u539F\u59CB\u8F93\u51FA\uFF0C\u5BB9\u5668\u6837\u5F0F\u5C06\u88AB\u5FFD\u7565\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-field"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
      className: "magick-ad-field__label"
    }, "\u4E3B\u8272"), !isHeadPlacement && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ColorPicker, {
      color: selectedAd.content?.container_style?.background || 'transparent',
      onChangeComplete: value => handleUpdateContainerStyle({
        background: formatColorValue(value)
      }),
      enableAlpha: true
    })), !isHeadPlacement && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
      label: "\u5706\u89D2",
      min: 0,
      max: 50,
      value: (_selectedAd$content$c = selectedAd.content?.container_style?.radius) !== null && _selectedAd$content$c !== void 0 ? _selectedAd$content$c : 0,
      onChange: value => handleUpdateContainerStyle({
        radius: Number(value)
      })
    }), selectedAd.options?.creative_type === 'image' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
      label: "\u6309\u94AE\u6587\u6848",
      value: selectedAd.content?.cta_text || '',
      onChange: value => handleUpdateContent({
        cta_text: value
      }),
      help: "\u56FE\u7247\u5E7F\u544A\u5C06\u5C55\u793A\u4E00\u4E2A\u6309\u94AE\uFF08\u9700\u8BBE\u7F6E\u8DF3\u8F6C\u94FE\u63A5\uFF09\u3002"
    })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
      title: "\u5C55\u793A\u4F4D\u7F6E",
      opened: quickPanelOpen === 'placement',
      onToggle: () => setQuickPanelOpen(prev => prev === 'placement' ? null : 'placement')
    }, showValidation && !resolvePlacement(selectedAd.options || {}).hook && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
      status: "error",
      isDismissible: false
    }, "\u8BF7\u5148\u9009\u62E9\u5C55\u793A\u4F4D\u7F6E"), selectedAd.options?.ad_type === 'global' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
      label: "\u5C55\u793A\u9875\u9762",
      value: selectedAd.options?.show_page || 'all',
      options: _constants_options__WEBPACK_IMPORTED_MODULE_31__.DISPLAY_PAGE_OPTIONS,
      onChange: value => {
        const allowedPositions = (0,_constants_options__WEBPACK_IMPORTED_MODULE_31__.getPositionOptions)(value).map(option => option.value);
        const currentPlacement = resolvePlacement(selectedAd.options || {});
        const currentValue = placementToSlotValue(currentPlacement);
        const nextPosition = allowedPositions.includes(currentValue) ? currentValue : '';
        applyPlacementSelection(nextPosition, {
          show_page: value
        });
      }
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
      label: "\u5C55\u793A\u4F4D\u7F6E",
      value: placementToSlotValue(resolvePlacement(selectedAd.options || {})),
      options: positionOptions,
      onChange: value => applyPlacementSelection(value)
    })), selectedAd.options?.ad_type === 'targeted' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
      label: "\u5C55\u793A\u7C7B\u578B",
      value: selectedAd.options?.target_type || '',
      options: _constants_options__WEBPACK_IMPORTED_MODULE_31__.TARGET_TYPE_OPTIONS,
      onChange: value => handleUpdateOptions({
        target_type: value,
        target_values: []
      })
    }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.FormTokenField, {
      label: "\u5C55\u793A\u9875\u9762",
      value: selectedAd.options?.target_values || [],
      onChange: value => handleUpdateOptions({
        target_values: value
      }),
      suggestions: selectedAd.options?.target_suggestions || [],
      help: selectedAd.options?.target_type ? '支持输入并搜索添加多个目标' : '请先选择展示类型',
      disabled: !selectedAd.options?.target_type
    })), renderDeviceLoginControls(), isExpertMode && renderNodePlacement(), renderFrequencySummary(selectedAd.content?.behavior || {}, {
      showLink: false
    }))), effectiveEditorMode !== 'quick' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TabPanel, {
      className: "magick-ad-right-tabs",
      tabs: [{
        name: 'container',
        title: '容器'
      }, {
        name: 'behavior',
        title: '交互'
      }, {
        name: 'placement',
        title: '投放'
      }, {
        name: 'frequency',
        title: '频控与高级'
      }],
      initialTabName: placementTab,
      onSelect: name => setPlacementTab(name),
      key: placementTab
    }, tab => {
      const containerStyle = selectedAd.content?.container_style || {};
      const behavior = selectedAd.content?.behavior || {};
      const isInlineContainer = (selectedAd.options?.container_type || 'inline') === 'inline';
      if (tab.name === 'frequency') {
        return renderFrequencyAdvancedTab(behavior, {
          showAdvanced: isExpertMode
        });
      }
      if (tab.name === 'container') {
        return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Panel, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
          title: (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
            className: "magick-ad-panel-title"
          }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", null, "\u5BB9\u5668\u5916\u89C2"), !isHeadPlacement && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Dropdown, {
            className: "magick-ad-panel-note",
            position: "bottom right",
            renderToggle: ({
              isOpen,
              onToggle
            }) => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
              className: "magick-ad-panel-note__trigger",
              icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_9__["default"],
              label: "\u8BF4\u660E",
              variant: "tertiary",
              size: "small",
              "aria-expanded": isOpen,
              onClick: event => {
                event.stopPropagation();
                onToggle();
              }
            }),
            renderContent: ({
              onClose
            }) => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
              className: "magick-ad-panel-note__content"
            }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, "\u5BB9\u5668\u5916\u89C2\u4EC5\u4F5C\u7528\u4E8E\u5305\u88F9\u5C42\uFF08div\uFF09\uFF0C\u4E0D\u4F1A\u5F71\u54CD\u56FE\u7247\u672C\u4F53\u3002 \u56FE\u7247\u5C3A\u5BF8\u3001\u5706\u89D2\u4E0E\u5916\u8FB9\u8DDD\u8BF7\u5728\u201C\u56FE\u7247\u914D\u7F6E\u201D\u91CC\u8C03\u6574\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
              variant: "secondary",
              size: "small",
              onClick: event => {
                event.stopPropagation();
                jumpToImageSettings();
                onClose();
              }
            }, "\u53BB\u56FE\u7247\u914D\u7F6E"))
          })),
          initialOpen: true
        }, isHeadPlacement && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
          status: "warning",
          isDismissible: false
        }, "Head \u4F4D\u7F6E\u4EC5\u5141\u8BB8\u8F93\u51FA <script>\u3001<style>\u3001<meta>\u3001 <link> \u7B49\u6807\u7B7E\uFF0C\u5DF2\u5F3A\u5236\u5207\u6362\u4E3A\u201C\u539F\u59CB\u8F93\u51FA\u201D\u6A21\u5F0F\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
          label: "\u5BB9\u5668\u6A21\u5F0F",
          value: "raw",
          options: [{
            label: '原始输出',
            value: 'raw'
          }],
          disabled: true
        })), !isHeadPlacement && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TabPanel, {
          className: "magick-ad-sub-tabs",
          tabs: [{
            name: 'base',
            title: '基础'
          }, {
            name: 'size',
            title: '尺寸'
          }, {
            name: 'spacing',
            title: '间距'
          }, {
            name: 'appearance',
            title: '外观'
          }, {
            name: 'badge',
            title: '角标'
          }],
          initialTabName: containerTab,
          onSelect: name => setContainerTab(name)
        }, subTab => {
          if (subTab.name === 'base') {
            return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
              label: "\u5BB9\u5668\u7C7B\u578B",
              value: selectedAd.options?.container_type || 'inline',
              options: [{
                label: '默认嵌入',
                value: 'inline'
              }, {
                label: '弹窗',
                value: 'popup'
              }, {
                label: '吸顶/吸底横栏',
                value: 'banner'
              }, {
                label: '角落悬浮',
                value: 'floating'
              }, {
                label: '全屏插屏',
                value: 'interstitial'
              }],
              onChange: value => {
                if (value !== 'inline') {
                  handleUpdateOptions({
                    container_type: value,
                    placement_hook: 'footer',
                    placement_position: '',
                    placement_paragraph: 0
                  });
                  return;
                }
                handleUpdateOptions({
                  container_type: value
                });
              },
              help: "\u5BB9\u5668\u51B3\u5B9A\u5C55\u793A\u5F62\u6001\uFF0C\u6295\u653E\u4F4D\u7F6E\u4ECD\u7531\u201C\u6295\u653E\u201D\u9875\u7B7E\u63A7\u5236\u3002"
            }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
              label: "\u5BB9\u5668\u6A21\u5F0F",
              value: containerStyle.mode || 'boxed',
              options: [{
                label: '包裹容器',
                value: 'boxed'
              }, {
                label: '原始输出',
                value: 'raw'
              }],
              onChange: value => handleUpdateContainerStyle({
                mode: value
              }),
              disabled: !isExpertMode,
              help: isExpertMode ? '' : '设计模式下仅允许包裹容器，切换到专家模式可修改。'
            }), containerStyle.mode === 'raw' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
              status: "info",
              isDismissible: false
            }, "\u539F\u59CB\u6A21\u5F0F\u4E0D\u4F1A\u5E94\u7528\u5BB9\u5668\u6837\u5F0F\u3002"));
          }
          if (containerStyle.mode === 'raw') {
            return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
              status: "info",
              isDismissible: false
            }, "\u5F53\u524D\u4E3A\u539F\u59CB\u8F93\u51FA\u6A21\u5F0F\uFF0C\u5C3A\u5BF8/\u5916\u89C2\u8BBE\u7F6E\u4E0D\u4F1A\u751F\u6548\u3002");
          }
          if (subTab.name === 'size') {
            var _containerStyle$max_w;
            return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
              className: "magick-ad-field"
            }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
              label: "\u6700\u5927\u5BBD\u5EA6",
              min: containerStyle.max_width_unit === 'px' ? 320 : 50,
              max: containerStyle.max_width_unit === 'px' ? 1200 : 100,
              value: (_containerStyle$max_w = containerStyle.max_width) !== null && _containerStyle$max_w !== void 0 ? _containerStyle$max_w : 100,
              onChange: value => handleUpdateContainerStyle({
                max_width: Number(value)
              })
            }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
              label: "\u5BBD\u5EA6\u5355\u4F4D",
              value: containerStyle.max_width_unit || '%',
              options: [{
                label: '百分比 (%)',
                value: '%'
              }, {
                label: '像素 (px)',
                value: 'px'
              }],
              onChange: value => handleUpdateContainerStyle({
                max_width_unit: value
              })
            }));
          }
          if (subTab.name === 'spacing') {
            var _containerStyle$paddi, _containerStyle$paddi2, _containerStyle$paddi3, _containerStyle$paddi4;
            return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
              label: "\u4E0A\u5185\u8FB9\u8DDD",
              min: 0,
              max: 60,
              value: (_containerStyle$paddi = containerStyle.padding_top) !== null && _containerStyle$paddi !== void 0 ? _containerStyle$paddi : 0,
              onChange: value => handleUpdateContainerStyle({
                padding_top: Number(value)
              })
            }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
              label: "\u4E0B\u5185\u8FB9\u8DDD",
              min: 0,
              max: 60,
              value: (_containerStyle$paddi2 = containerStyle.padding_bottom) !== null && _containerStyle$paddi2 !== void 0 ? _containerStyle$paddi2 : 0,
              onChange: value => handleUpdateContainerStyle({
                padding_bottom: Number(value)
              })
            }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
              label: "\u5DE6\u5185\u8FB9\u8DDD",
              min: 0,
              max: 60,
              value: (_containerStyle$paddi3 = containerStyle.padding_left) !== null && _containerStyle$paddi3 !== void 0 ? _containerStyle$paddi3 : 0,
              onChange: value => handleUpdateContainerStyle({
                padding_left: Number(value)
              })
            }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
              label: "\u53F3\u5185\u8FB9\u8DDD",
              min: 0,
              max: 60,
              value: (_containerStyle$paddi4 = containerStyle.padding_right) !== null && _containerStyle$paddi4 !== void 0 ? _containerStyle$paddi4 : 0,
              onChange: value => handleUpdateContainerStyle({
                padding_right: Number(value)
              })
            }));
          }
          if (subTab.name === 'appearance') {
            var _containerStyle$radiu;
            return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
              className: "magick-ad-field"
            }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
              className: "magick-ad-field__label"
            }, "\u80CC\u666F\u8272"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ColorPicker, {
              color: containerStyle.background || 'transparent',
              onChangeComplete: value => handleUpdateContainerStyle({
                background: formatColorValue(value)
              }),
              enableAlpha: true
            })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
              label: "\u5706\u89D2",
              min: 0,
              max: 50,
              value: (_containerStyle$radiu = containerStyle.radius) !== null && _containerStyle$radiu !== void 0 ? _containerStyle$radiu : 0,
              onChange: value => handleUpdateContainerStyle({
                radius: Number(value)
              })
            }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
              label: "\u9634\u5F71",
              value: containerStyle.shadow || 'none',
              options: _constants_options__WEBPACK_IMPORTED_MODULE_31__.SHADOW_OPTIONS,
              onChange: value => handleUpdateContainerStyle({
                shadow: value
              })
            }));
          }
          if (subTab.name === 'badge') {
            return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
              label: "\u663E\u793A\u89D2\u6807",
              checked: Boolean(containerStyle.badge_enabled),
              onChange: value => handleUpdateContainerStyle({
                badge_enabled: value
              })
            }), containerStyle.badge_enabled && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
              className: "magick-ad-field"
            }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
              className: "magick-ad-field__label"
            }, "\u89D2\u6807\u7C7B\u578B"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ButtonGroup, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
              variant: "secondary",
              isPressed: (containerStyle.badge_type || 'text') === 'text',
              onClick: () => handleUpdateContainerStyle({
                badge_type: 'text'
              })
            }, "\u6587\u672C"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
              variant: "secondary",
              isPressed: containerStyle.badge_type === 'image',
              onClick: () => handleUpdateContainerStyle({
                badge_type: 'image'
              })
            }, "\u56FE\u7247"))), (containerStyle.badge_type || 'text') === 'text' ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
              label: "\u89D2\u6807\u6587\u672C",
              value: containerStyle.badge_text || '广告',
              onChange: value => handleUpdateContainerStyle({
                badge_text: value
              })
            }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
              className: "magick-ad-field"
            }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
              className: "magick-ad-field__label"
            }, "\u89D2\u6807\u989C\u8272"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ColorPicker, {
              color: containerStyle.badge_color || '#1d2327',
              onChangeComplete: value => handleUpdateContainerStyle({
                badge_color: formatColorValue(value)
              })
            }))) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
              className: "magick-ad-field"
            }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
              className: "magick-ad-field__label"
            }, "\u89D2\u6807\u56FE\u7247"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_ImagePicker__WEBPACK_IMPORTED_MODULE_14__["default"], {
              value: containerStyle.badge_image || {},
              onChange: value => handleUpdateContainerStyle({
                badge_image: value,
                badge_type: 'image'
              })
            }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
              className: "magick-ad-field__help"
            }, "\u63A8\u8350\u5C3A\u5BF8\uFF1A56\xD728 \u6216 64\xD732\uFF082x\uFF09\uFF1B \u683C\u5F0F\uFF1APNG/SVG\uFF08\u900F\u660E\u80CC\u666F\uFF09\uFF0C\u5EFA\u8BAE \u2264 100KB\u3002"))));
          }
          return null;
        }))));
      }
      if (tab.name === 'behavior') {
        var _behavior$delay;
        return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Panel, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
          title: "\u4EA4\u4E92\u884C\u4E3A",
          initialOpen: true
        }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
          label: "\u8FDB\u573A\u52A8\u753B",
          value: behavior.animation || 'none',
          options: _constants_options__WEBPACK_IMPORTED_MODULE_31__.ANIMATION_OPTIONS,
          onChange: value => handleUpdateBehavior({
            animation: value
          })
        }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
          label: "\u663E\u793A\u5173\u95ED\u6309\u94AE",
          checked: Boolean(behavior.close_button),
          onChange: value => handleUpdateBehavior({
            close_button: value
          }),
          help: "\u9ED8\u8BA4\u5173\u95ED\u3002\u5F00\u542F\u540E\u5728\u5E7F\u544A\u53F3\u4E0A\u89D2\u663E\u793A\u5173\u95ED\u6309\u94AE\u3002"
        }), isExpertMode && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
          label: "ESC \u5173\u95ED",
          checked: behavior.close_on_esc !== false,
          onChange: value => handleUpdateBehavior({
            close_on_esc: value
          }),
          help: "\u9ED8\u8BA4\u5F00\u542F\u3002\u5F39\u7A97/\u6A2A\u680F\u53EF\u7528\uFF0C\u6309 ESC \u5173\u95ED\u3002"
        }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
          label: "\u70B9\u51FB\u906E\u7F69\u5173\u95ED",
          checked: behavior.close_on_overlay !== false,
          onChange: value => handleUpdateBehavior({
            close_on_overlay: value
          }),
          help: "\u9ED8\u8BA4\u5F00\u542F\u3002\u4EC5\u5F39\u7A97/\u63D2\u5C4F\u6709\u6548\uFF0C\u70B9\u51FB\u906E\u7F69\u5173\u95ED\u3002"
        }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
          label: "\u6253\u5F00\u65F6\u9501\u5B9A\u6EDA\u52A8",
          checked: Boolean(behavior.lock_scroll),
          onChange: value => handleUpdateBehavior({
            lock_scroll: value
          }),
          help: "\u9ED8\u8BA4\u5173\u95ED\u3002\u4EC5\u5F39\u7A97/\u63D2\u5C4F\u53EF\u7528\uFF0C\u6253\u5F00\u65F6\u9501\u5B9A\u9875\u9762\u6EDA\u52A8\u3002"
        })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
          label: "\u5EF6\u8FDF\u663E\u793A\uFF08\u79D2\uFF09",
          min: 0,
          max: 30,
          value: (_behavior$delay = behavior.delay) !== null && _behavior$delay !== void 0 ? _behavior$delay : 0,
          onChange: value => handleUpdateBehavior({
            delay: Number(value)
          }),
          help: "\u9ED8\u8BA4 0 \u79D2\u3002\u4EC5\u5BF9\u5F39\u7A97/\u6A2A\u680F/\u63D2\u5C4F\u751F\u6548\u3002"
        })));
      }
      return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Panel, null, !isInlineContainer && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
        status: "info",
        isDismissible: false
      }, "\u5F53\u524D\u5BB9\u5668\u4E3A\u201C\u975E\u5D4C\u5165\u201D\u6A21\u5F0F\uFF0C\u5C55\u793A\u4F4D\u7F6E\u5C06\u56FA\u5B9A\u5728\u9875\u811A\u8F93\u51FA\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
        title: "\u5C55\u793A\u4F4D\u7F6E",
        initialOpen: true
      }, showValidation && !resolvePlacement(selectedAd.options || {}).hook && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
        status: "error",
        isDismissible: false
      }, "\u8BF7\u5148\u9009\u62E9\u5C55\u793A\u4F4D\u7F6E"), selectedAd.options?.ad_type === 'global' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
        label: "\u5C55\u793A\u9875\u9762",
        value: selectedAd.options?.show_page || 'all',
        options: _constants_options__WEBPACK_IMPORTED_MODULE_31__.DISPLAY_PAGE_OPTIONS,
        onChange: value => {
          const allowedPositions = (0,_constants_options__WEBPACK_IMPORTED_MODULE_31__.getPositionOptions)(value).map(option => option.value);
          const currentPlacement = resolvePlacement(selectedAd.options || {});
          const currentValue = placementToSlotValue(currentPlacement);
          const nextPosition = allowedPositions.includes(currentValue) ? currentValue : '';
          applyPlacementSelection(nextPosition, {
            show_page: value
          });
        }
      }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
        label: "\u5C55\u793A\u4F4D\u7F6E",
        value: placementToSlotValue(resolvePlacement(selectedAd.options || {})),
        options: positionOptions,
        onChange: value => applyPlacementSelection(value)
      })), selectedAd.options?.ad_type === 'targeted' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
        label: "\u5C55\u793A\u7C7B\u578B",
        value: selectedAd.options?.target_type || '',
        options: _constants_options__WEBPACK_IMPORTED_MODULE_31__.TARGET_TYPE_OPTIONS,
        onChange: value => handleUpdateOptions({
          target_type: value,
          target_values: []
        })
      }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.FormTokenField, {
        label: "\u5C55\u793A\u9875\u9762",
        value: selectedAd.options?.target_values || [],
        onChange: value => handleUpdateOptions({
          target_values: value
        }),
        suggestions: selectedAd.options?.target_suggestions || [],
        help: selectedAd.options?.target_type ? '支持输入并搜索添加多个目标' : '请先选择展示类型',
        disabled: !selectedAd.options?.target_type
      })), renderDeviceLoginControls(), isExpertMode && renderNodePlacement(), renderFrequencySummary(behavior)));
    }))), effectiveEditorMode === 'quick' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-right-section"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-right-section__header"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-right-section__title"
    }, "\u9891\u63A7")), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-right-section__body"
    }, renderFrequencyControls(selectedAd.content?.behavior || {}))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-right-section"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-right-section__header"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-right-section__title"
    }, "\u9AD8\u7EA7\u8BBE\u7F6E"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
      className: "magick-ad-collapse-toggle",
      icon: advancedOpen ? _wordpress_icons__WEBPACK_IMPORTED_MODULE_5__["default"] : _wordpress_icons__WEBPACK_IMPORTED_MODULE_4__["default"],
      label: advancedOpen ? '折叠' : '展开',
      variant: "tertiary",
      onClick: () => setAdvancedOpen(prev => !prev)
    })), advancedOpen && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-right-section__body"
    }, renderAdvancedControls()))));
  };
  const toolbarActions = selectedAd ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    className: "magick-ad-toolbar-toggle",
    icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_10__["default"],
    label: "\u6295\u653E\u8BBE\u7F6E",
    variant: "tertiary",
    onClick: () => setPlacementModalOpen(true)
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    className: "magick-ad-toolbar-toggle",
    icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_3__["default"],
    label: "\u53D1\u5E03\u4E0E\u6392\u671F",
    variant: "tertiary",
    onClick: () => {
      setPublishModalOpen(true);
    }
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    className: "magick-ad-toolbar-toggle",
    icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_8__["default"],
    label: "\u9884\u89C8\u8BBE\u7F6E",
    variant: "tertiary",
    onClick: () => setPreviewModalOpen(true)
  })) : null;
  const handleCloseSettings = () => {
    setSettingsOpen(false);
    fetchSystemSettings();
  };
  const toolbarMiddle = selectedAd ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_TemplateActions__WEBPACK_IMPORTED_MODULE_20__["default"], {
    variant: "toolbar",
    onOpen: () => openTemplateLibrary(resolvedCreativeType),
    onSave: () => openSaveTemplate(resolvedCreativeType)
  }) : null;
  const rightSidebar = selectedAd ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-right-stack"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, {
    className: "magick-ad-right-panel"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, null, renderPublishSection(), renderPlacementSection()))) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "info",
    isDismissible: false
  }, "\u8BF7\u5148\u9009\u62E9\u4E00\u4E2A\u5E7F\u544A\u7EC4\u3002")));
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-config"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: `magick-ad-header ${headerCollapsed ? 'is-collapsed' : ''}`
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-header__left"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-header__breadcrumb"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("a", {
    className: "magick-ad-header__crumb",
    href: "admin.php?page=magick-ad"
  }, branding.name), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "magick-ad-header__crumb-sep"
  }, "/"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("a", {
    className: "magick-ad-header__crumb",
    href: "admin.php?page=magick-ad"
  }, "\u5E7F\u544A\u914D\u7F6E")), !headerCollapsed && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-header__title-row"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h1", {
    className: "magick-ad-header__title"
  }, branding.name), window?.MagickAD?.buildVersion && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "magick-ad-header__badge"
  }, "v", window.MagickAD.buildVersion)), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "description"
  }, branding.tagline))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-header__actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    className: "magick-ad-header__btn",
    icon: headerCollapsed ? _wordpress_icons__WEBPACK_IMPORTED_MODULE_4__["default"] : _wordpress_icons__WEBPACK_IMPORTED_MODULE_5__["default"],
    variant: "tertiary",
    onClick: () => setHeaderCollapsed(prev => !prev)
  }, headerCollapsed ? '展开' : '收起'), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    className: "magick-ad-header__btn",
    icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_7__["default"],
    variant: "secondary",
    onClick: () => {
      const url = window?.MagickAD?.diagnoseUrl || '';
      if (url) {
        window.open(url, '_blank', 'noopener');
      }
    }
  }, "\u8C03\u8BD5\u9762\u677F"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    className: "magick-ad-header__btn",
    icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_6__["default"],
    variant: "secondary",
    onClick: () => setSettingsOpen(true)
  }, "\u7CFB\u7EDF\u8BBE\u7F6E"))), notice && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: notice.status,
    isDismissible: true,
    onRemove: clearNotice
  }, notice.message), isLoading && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "info"
  }, "\u6B63\u5728\u52A0\u8F7D\u914D\u7F6E\u2026"), error && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "error",
    isDismissible: true
  }, error.message || '请求失败'), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_Layout__WEBPACK_IMPORTED_MODULE_13__["default"], {
    adData: selectedAd,
    creativeType: selectedAd?.options?.creative_type || 'image',
    containerType: selectedAd?.options?.container_type || 'inline',
    devicePreview: devicePreview,
    previewTarget: previewTarget,
    previewLogin: previewLogin,
    previewUsePage: previewUsePage,
    onPreviewUsePageChange: setPreviewUsePage,
    onCreativeChange: value => selectedAd && handleUpdateOptions({
      creative_type: value
    }),
    onContainerChange: value => {
      if (!selectedAd) {
        return;
      }
      if (value !== 'inline') {
        handleUpdateOptions({
          container_type: value,
          placement_hook: 'footer',
          placement_position: '',
          placement_paragraph: 0
        });
        return;
      }
      handleUpdateOptions({
        container_type: value
      });
    },
    onDevicePreviewChange: setDevicePreview,
    onUpdateRule: (key, value) => selectedAd && handleUpdateOptions({
      [key]: value
    }),
    toolbarActions: toolbarActions,
    toolbarMiddle: toolbarMiddle,
    leftSidebar: leftSidebar,
    rightSidebar: rightSidebar,
    contentPanels: contentPanels
  }), publishModalOpen && selectedAd && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Modal, {
    title: "\u53D1\u5E03\u4E0E\u6392\u671F",
    className: "magick-ad-modal magick-ad-config-modal",
    onRequestClose: () => setPublishModalOpen(false)
  }, renderPublishSection()), placementModalOpen && selectedAd && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Modal, {
    title: "\u6295\u653E\u8BBE\u7F6E",
    className: "magick-ad-modal magick-ad-config-modal",
    onRequestClose: () => setPlacementModalOpen(false)
  }, renderPlacementSection()), previewModalOpen && selectedAd && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Modal, {
    title: "\u9884\u89C8\u8BBE\u7F6E",
    className: "magick-ad-modal magick-ad-config-modal",
    onRequestClose: () => setPreviewModalOpen(false)
  }, renderPreviewControls()), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_TemplateLibraryModal__WEBPACK_IMPORTED_MODULE_19__["default"], {
    isOpen: templateModalOpen,
    type: templateType,
    templates: templateLibrary,
    selected: templateSelection,
    categories: templateCategories,
    onUpdateCategories: updateTemplateCategories,
    favoriteIds: favoriteIds,
    pinnedIds: pinnedIds,
    onAddCategory: addTemplateCategory,
    onRemoveCategory: removeTemplateCategory,
    onToggleSelect: handleToggleTemplateSelect,
    onToggleFavorite: toggleFavorite,
    onTogglePinned: togglePinned,
    onBulkFavorite: bulkFavorite,
    onBulkPinned: bulkPinned,
    onClearFavorites: clearFavorites,
    onClearPins: clearPins,
    onRestorePreferences: restorePreferences,
    onApply: handleApplyTemplate,
    onImport: handleImportTemplates,
    onExport: handleExportTemplates,
    onClose: () => setTemplateModalOpen(false)
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_BuildProbe__WEBPACK_IMPORTED_MODULE_21__["default"], null), saveTemplateOpen && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Modal, {
    title: "\u5B58\u4E3A\u6A21\u677F",
    onRequestClose: () => setSaveTemplateOpen(false),
    className: "magick-ad-modal magick-ad-rename-modal"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u6A21\u677F\u540D\u79F0",
    value: saveTemplateName,
    onChange: setSaveTemplateName,
    placeholder: "\u8BF7\u8F93\u5165\u6A21\u677F\u540D\u79F0"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u6A21\u677F\u5206\u7C7B",
    value: saveTemplateCategory || 'uncategorized',
    options: [{
      label: '未分类',
      value: 'uncategorized'
    }, ...(templateCategories || []).map(item => ({
      label: item.name,
      value: item.name
    })), {
      label: '新建分类…',
      value: 'new'
    }],
    onChange: value => {
      setSaveTemplateCategory(value);
      if (value !== 'new') {
        setSaveTemplateCategoryName('');
      }
    }
  }), saveTemplateCategory === 'new' && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u65B0\u5EFA\u5206\u7C7B\u540D\u79F0",
    value: saveTemplateCategoryName,
    onChange: setSaveTemplateCategoryName,
    placeholder: "\u8F93\u5165\u5206\u7C7B\u540D\u79F0"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-confirm-actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    onClick: () => setSaveTemplateOpen(false)
  }, "\u53D6\u6D88"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "primary",
    onClick: handleConfirmSaveTemplate
  }, "\u4FDD\u5B58\u6A21\u677F"))), pickerConfirmOpen && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Modal, {
    title: "\u786E\u8BA4\u8282\u70B9",
    onRequestClose: () => setPickerConfirmOpen(false),
    className: "magick-ad-modal magick-ad-rename-modal"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
    label: "\u5B9A\u4F4D\u65B9\u5F0F",
    value: pickerType,
    options: [{
      label: 'ID',
      value: 'id'
    }, {
      label: 'Class',
      value: 'class'
    }],
    onChange: value => setPickerType(value)
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u8282\u70B9\u503C",
    value: pickerValue,
    onChange: value => setPickerValue(value.trim()),
    help: pickerType === 'id' ? pickerId ? `可用 ID: #${pickerId}` : 'ID 不带 #' : pickerClasses.length ? `可用 Class: ${pickerClasses.map(item => `.${item}`).join(' ')}` : 'Class 不带 .'
  }), pickerLabel && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
    status: "info",
    isDismissible: false
  }, "\u5DF2\u9009\u5143\u7D20\uFF1A", pickerLabel), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-confirm-actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    onClick: () => setPickerConfirmOpen(false)
  }, "\u53D6\u6D88"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "primary",
    onClick: () => {
      if (!pickerValue) {
        showNotice('error', '请输入节点值', 2000);
        return;
      }
      handleUpdateOptions({
        node_target_type: pickerType,
        node_target_value: pickerValue
      });
      setPickerConfirmOpen(false);
      showNotice('success', '已更新节点', 2000);
    }
  }, "\u786E\u8BA4"))), deleteTarget && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Modal, {
    title: "\u786E\u8BA4\u5220\u9664\u5E7F\u544A\u7EC4",
    onRequestClose: () => setDeleteTarget(null),
    className: "magick-ad-modal magick-ad-confirm-modal"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, "\u786E\u8BA4\u5220\u9664\u201C", deleteTarget.name || '未命名广告组', "\u201D\u5417\uFF1F \u5220\u9664\u540E\u65E0\u6CD5\u6062\u590D\u3002"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-confirm-actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    onClick: () => setDeleteTarget(null)
  }, "\u53D6\u6D88"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "primary",
    isDestructive: true,
    onClick: () => {
      const targetId = deleteTarget.id;
      setDeleteTarget(null);
      removeAdGroup(targetId);
      if (selectedId === targetId) {
        setSelectedId(null);
      }
      handleSaveWithSlotCheck().then(() => {
        showNotice('success', '广告组已删除', 2000);
      }).catch(err => {
        const message = err?.data?.message || err?.message || '删除失败，请检查网络或权限设置。';
        showNotice('error', message, 4000);
        fetchFromDB();
      });
    }
  }, "\u786E\u8BA4\u5220\u9664"))), renameTarget && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Modal, {
    title: "\u4FEE\u6539\u5E7F\u544A\u540D\u79F0",
    onRequestClose: () => setRenameTarget(null),
    className: "magick-ad-modal magick-ad-rename-modal"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
    label: "\u5E7F\u544A\u540D\u79F0",
    value: renameValue,
    onChange: setRenameValue,
    placeholder: "\u8BF7\u8F93\u5165\u5E7F\u544A\u540D\u79F0"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-confirm-actions"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "secondary",
    onClick: () => setRenameTarget(null)
  }, "\u53D6\u6D88"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
    variant: "primary",
    onClick: () => {
      const targetId = renameTarget.id;
      updateAdGroup(targetId, {
        name: renameValue.trim()
      });
      setRenameTarget(null);
      handleSaveWithSlotCheck().then(() => {
        showNotice('success', '名称已更新', 2000);
      }).catch(err => {
        const message = err?.data?.message || err?.message || '保存失败，请检查网络或权限设置。';
        showNotice('error', message, 4000);
      });
    }
  }, "\u4FDD\u5B58"))), settingsOpen && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Modal, {
    title: "\u7CFB\u7EDF\u4E0E\u8C03\u8BD5\u8BBE\u7F6E",
    className: "magick-ad-modal magick-ad-settings-modal",
    onRequestClose: handleCloseSettings
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TabPanel, {
    className: "magick-ad-settings-tabs",
    tabs: [{
      name: 'system',
      title: '系统设置'
    }, {
      name: 'consent',
      title: '同意与合规'
    }, {
      name: 'insert',
      title: '插入入口'
    }, {
      name: 'experiments',
      title: '实验与高级'
    }, {
      name: 'debug',
      title: '调试设置'
    }],
    initialTabName: "system"
  }, tab => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-settings-body"
  }, tab.name === 'system' ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_panels_SystemSettingsPanel__WEBPACK_IMPORTED_MODULE_23__["default"], {
    onNotice: showNotice
  }) : tab.name === 'consent' ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_panels_ConsentPanel__WEBPACK_IMPORTED_MODULE_24__["default"], {
    onNotice: showNotice
  }) : tab.name === 'insert' ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_panels_InsertHelpPanel__WEBPACK_IMPORTED_MODULE_25__["default"], null) : tab.name === 'experiments' ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_panels_ExperimentsPanel__WEBPACK_IMPORTED_MODULE_27__["default"], {
    onNotice: showNotice
  }) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_panels_DebugPanel__WEBPACK_IMPORTED_MODULE_22__["default"], {
    onNotice: showNotice
  })))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    ref: fileInputRef,
    type: "file",
    accept: "application/json",
    style: {
      display: 'none'
    },
    onChange: handleFileChange
  }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (AdsConfig);

/***/ },

/***/ "./assets/js/sections/App.js"
/*!***********************************!*\
  !*** ./assets/js/sections/App.js ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _AdsConfig__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./AdsConfig */ "./assets/js/sections/AdsConfig.js");




const Dashboard = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.lazy)(() => __webpack_require__.e(/*! import() */ "assets_js_Dashboard_js").then(__webpack_require__.bind(__webpack_require__, /*! ../Dashboard */ "./assets/js/Dashboard.js")));
const App = () => {
  const initialTab = typeof window !== 'undefined' && window.MagickAD && window.MagickAD.initialTab || 'ads';
  if (initialTab === 'report') {
    return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.Suspense, {
      fallback: (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
        status: "info"
      }, "\u52A0\u8F7D\u4E2D\u2026")
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(Dashboard, null));
  }
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_AdsConfig__WEBPACK_IMPORTED_MODULE_3__["default"], null);
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (App);

/***/ },

/***/ "./assets/js/store.ts"
/*!****************************!*\
  !*** ./assets/js/store.ts ***!
  \****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useStore: () => (/* binding */ useStore)
/* harmony export */ });
/* harmony import */ var zustand__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zustand */ "./node_modules/.pnpm/zustand@5.0.10_@types+react@18.3.27_react@18.3.1_use-sync-external-store@1.6.0_react@18.3.1_/node_modules/zustand/esm/react.mjs");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_url__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/url */ "@wordpress/url");
/* harmony import */ var _wordpress_url__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_url__WEBPACK_IMPORTED_MODULE_2__);



const createAdGroupTemplate = (type = 'global', ads = []) => ({
  id: `ad_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  name: type === 'targeted' ? '指定广告' : '全局广告',
  status: 'publish',
  date: '',
  options: {
    enabled: true,
    ad_type: type,
    creative_type: 'image',
    container_type: 'inline',
    display_mode: 'show',
    random_strategy: 'request',
    html_mode: 'safe',
    html_sandbox: 'inherit',
    editor_mode: 'design',
    placement_hook: 'footer',
    placement_position: '',
    placement_paragraph: 0,
    show_page: 'all',
    device: 'all',
    login: 'all',
    start_date: '',
    end_date: '',
    target_type: '',
    target_ids: [],
    priority: 10,
    weight: 1,
    node_target_type: 'id',
    node_target_value: '',
    node_insert: 'append',
    node_match: 'first',
    node_index: 1,
    node_fallback: 'hide',
    node_compact: true,
    render_require_consent: false
  },
  content: {
    html: '',
    blocks: '',
    video_url: '',
    image: {
      id: 0,
      url: '',
      alt: '',
      width: 0,
      height: 0
    },
    link: '',
    link_target: false,
    link_rel: '',
    cta_text: '',
    custom_html: '',
    custom_css: '',
    custom_js: '',
    html_script_allowlist: [],
    html_script_blocklist: [],
    html_runtime_vars: true,
    html_load_strategy: 'immediate',
    html_load_delay: 0,
    html_placeholder_ratio: '',
    variants_enabled: false,
    variants_strategy: 'request',
    variants: [],
    video_settings: {
      type: 'mp4',
      autoplay: false,
      autoplay_first: false,
      repeat_muted: false,
      muted: false,
      loop: false,
      controls: true,
      playsinline: true,
      preload: 'metadata',
      aspect_ratio: '16:9',
      aspect_ratio_custom: '',
      poster_mode: 'manual',
      poster: {
        id: 0,
        url: '',
        alt: '',
        width: 0,
        height: 0
      },
      fallback_text: '',
      track_events: false
    },
    block_settings: {
      background: 'transparent',
      background_gradient: '',
      text_color: '',
      padding: 0,
      radius: 0,
      max_width: 0,
      font_size: 0,
      font_family: '',
      align: '',
      background_image: {
        id: 0,
        url: '',
        alt: '',
        width: 0,
        height: 0
      },
      layout: 'content',
      media_image: {
        id: 0,
        url: '',
        alt: '',
        width: 0,
        height: 0
      },
      heading: '',
      subheading: '',
      heading_size: 0,
      heading_line_height: 0,
      heading_weight: 'semibold',
      subheading_size: 0,
      subheading_line_height: 0,
      subheading_weight: 'normal',
      cta_text: '',
      cta_link: '',
      cta_target: false,
      cta_text_color: '#ffffff',
      cta_background: '#2563eb',
      cta_radius: 999,
      border_width: 0,
      border_color: '#d0d7e2',
      shadow: 'none'
    },
    container_style: {
      mode: 'boxed',
      max_width: 100,
      max_width_unit: '%',
      reserve_height: 0,
      padding_top: 0,
      padding_right: 0,
      padding_bottom: 0,
      padding_left: 0,
      background: 'transparent',
      radius: 0,
      shadow: 'none',
      badge_enabled: false,
      badge_type: 'text',
      badge_text: '广告',
      badge_color: '#1d2327',
      badge_image: {
        id: 0,
        url: '',
        alt: ''
      },
      layout: ''
    },
    behavior: {
      animation: 'none',
      close_button: false,
      close_on_esc: true,
      close_on_overlay: true,
      lock_scroll: false,
      frequency_mode: 'none',
      frequency_limit: 1,
      delay: 0
    },
    image_settings: {
      watermark: false,
      radius: 0,
      max_width: 1200,
      margin_top: 0,
      margin_bottom: 0,
      margin_left: 0,
      margin_right: 0
    }
  }
});
const createSlotTemplate = (slots = []) => {
  const existing = new Set((slots || []).map(slot => (0,_wordpress_url__WEBPACK_IMPORTED_MODULE_2__.cleanForSlug)(slot?.id || '')));
  let candidate = 'slot';
  let index = 2;
  while (candidate && existing.has(candidate)) {
    candidate = `slot-${index}`;
    index += 1;
  }
  return {
    id: candidate || 'slot',
    label: '新广告位',
    ad_ids: [],
    weights: [],
    limit: 1
  };
};
const normalizePlacement = options => {
  const placement = {
    hook: options.placement_hook || 'footer',
    position: options.placement_position || '',
    paragraph: Number(options.placement_paragraph || 0)
  };
  if (placement.hook === 'content') {
    placement.position = placement.position || 'before';
    if (placement.position === 'paragraph') {
      placement.paragraph = placement.paragraph > 0 ? placement.paragraph : 2;
    } else {
      placement.paragraph = 0;
    }
  } else {
    placement.position = '';
    placement.paragraph = 0;
  }
  return placement;
};
const normalizeAd = ad => {
  var _options$enabled;
  const safeAd = ad && typeof ad === 'object' ? ad : {};
  const options = safeAd.options && typeof safeAd.options === 'object' ? safeAd.options : {};
  const content = safeAd.content && typeof safeAd.content === 'object' ? safeAd.content : {};
  const image = content.image && typeof content.image === 'object' ? content.image : {};
  const containerStyle = content.container_style && typeof content.container_style === 'object' ? content.container_style : {};
  const videoSettings = content.video_settings && typeof content.video_settings === 'object' ? content.video_settings : {};
  const blockSettings = content.block_settings && typeof content.block_settings === 'object' ? content.block_settings : {};
  const variantsRaw = Array.isArray(content.variants) ? content.variants : [];
  const behavior = content.behavior && typeof content.behavior === 'object' ? content.behavior : {};
  const placement = normalizePlacement(options);
  const imageSettings = content.image_settings && typeof content.image_settings === 'object' ? content.image_settings : {};
  const contentTypeRaw = options.creative_type || options.content_type || options.type || 'image';
  const contentType = contentTypeRaw === 'popup' || contentTypeRaw === 'bar' ? 'html' : contentTypeRaw;
  const containerType = options.container_type || options.container || options.content_type === 'popup' && 'popup' || options.content_type === 'bar' && 'banner' || 'inline';
  return {
    ...safeAd,
    status: safeAd.status || safeAd.post_status || (options.enabled === false ? 'draft' : 'publish'),
    date: safeAd.date || safeAd.post_date || '',
    options: {
      enabled: (_options$enabled = options.enabled) !== null && _options$enabled !== void 0 ? _options$enabled : true,
      ad_type: options.ad_type || 'global',
      creative_type: ['html', 'image', 'video', 'block'].includes(contentType) ? contentType : 'image',
      container_type: ['inline', 'popup', 'banner', 'floating', 'interstitial'].includes(containerType) ? containerType : 'inline',
      display_mode: options.display_mode || 'show',
      random_strategy: ['request', 'session', 'cookie'].includes(options.random_strategy) ? options.random_strategy : 'request',
      html_mode: ['safe', 'full'].includes(options.html_mode) ? options.html_mode : 'safe',
      html_sandbox: ['inherit', 'enable', 'disable'].includes(options.html_sandbox) ? options.html_sandbox : 'inherit',
      editor_mode: ['quick', 'design', 'expert'].includes(options.editor_mode) ? options.editor_mode : 'design',
      placement_hook: placement.hook || 'footer',
      placement_position: placement.hook === 'content' ? placement.position || 'before' : '',
      placement_paragraph: placement.hook === 'content' && placement.position === 'paragraph' ? Number(placement.paragraph || 2) : 0,
      show_page: options.show_page || 'all',
      device: options.device || 'all',
      login: options.login || 'all',
      start_date: options.start_date || '',
      end_date: options.end_date || '',
      target_type: options.target_type || '',
      target_ids: Array.isArray(options.target_ids) ? options.target_ids.map(id => Number(id)).filter(Boolean) : [],
      priority: Number(options.priority || 10),
      weight: Number(options.weight || 1),
      node_target_type: ['id', 'class'].includes(options.node_target_type) ? options.node_target_type : 'id',
      node_target_value: typeof options.node_target_value === 'string' ? options.node_target_value : '',
      node_insert: ['append', 'prepend', 'before', 'after'].includes(options.node_insert) ? options.node_insert : 'append',
      node_match: ['first', 'nth', 'all'].includes(options.node_match) ? options.node_match : 'first',
      node_index: Number(options.node_index || 1) || 1,
      node_fallback: ['hide', 'footer'].includes(options.node_fallback) ? options.node_fallback : 'hide',
      node_compact: options.node_compact === false ? false : true,
      render_require_consent: Boolean(options.render_require_consent)
    },
    content: {
      html: content.html || '',
      blocks: content.blocks || '',
      video_url: content.video_url || '',
      link: content.link || '',
      link_target: Boolean(content.link_target),
      link_rel: content.link_rel || '',
      cta_text: content.cta_text || '',
      custom_html: content.custom_html || '',
      custom_css: content.custom_css || '',
      custom_js: content.custom_js || '',
      html_script_allowlist: Array.isArray(content.html_script_allowlist) ? content.html_script_allowlist.filter(Boolean) : [],
      html_script_blocklist: Array.isArray(content.html_script_blocklist) ? content.html_script_blocklist.filter(Boolean) : [],
      html_runtime_vars: content.html_runtime_vars !== false,
      html_load_strategy: ['immediate', 'delay', 'viewport'].includes(content.html_load_strategy) ? content.html_load_strategy : 'immediate',
      html_load_delay: Number(content.html_load_delay || 0),
      html_placeholder_ratio: content.html_placeholder_ratio || '',
      variants_enabled: Boolean(content.variants_enabled),
      variants_strategy: content.variants_strategy === 'session' ? 'session' : 'request',
      variants: variantsRaw.map(variant => {
        const safeVariant = variant && typeof variant === 'object' ? variant : {};
        const variantContent = safeVariant.content && typeof safeVariant.content === 'object' ? safeVariant.content : {};
        return {
          id: String(safeVariant.id || ''),
          label: String(safeVariant.label || ''),
          weight: Number(safeVariant.weight || 1) || 1,
          content: {
            html: variantContent.html || '',
            blocks: variantContent.blocks || '',
            video_url: variantContent.video_url || ''
          }
        };
      }),
      image: {
        id: Number(image.id || 0),
        url: image.url || '',
        alt: image.alt || ''
      },
      video_settings: {
        type: ['mp4', 'embed'].includes(videoSettings.type) ? videoSettings.type : 'mp4',
        autoplay: Boolean(videoSettings.autoplay),
        autoplay_first: Boolean(videoSettings.autoplay_first),
        repeat_muted: Boolean(videoSettings.repeat_muted),
        muted: Boolean(videoSettings.muted),
        loop: Boolean(videoSettings.loop),
        controls: videoSettings.controls !== false,
        playsinline: videoSettings.playsinline !== false,
        preload: ['metadata', 'auto', 'none'].includes(videoSettings.preload) ? videoSettings.preload : 'metadata',
        aspect_ratio: ['auto', '16:9', '4:3', '1:1', '9:16', 'custom'].includes(videoSettings.aspect_ratio) ? videoSettings.aspect_ratio : '16:9',
        aspect_ratio_custom: typeof videoSettings.aspect_ratio_custom === 'string' ? videoSettings.aspect_ratio_custom : '',
        poster_mode: videoSettings.poster_mode === 'auto' ? 'auto' : 'manual',
        poster: {
          id: Number(videoSettings.poster?.id || 0),
          url: videoSettings.poster?.url || '',
          alt: videoSettings.poster?.alt || ''
        },
        fallback_text: videoSettings.fallback_text || '',
        track_events: Boolean(videoSettings.track_events)
      },
      block_settings: {
        background: blockSettings.background || 'transparent',
        background_gradient: blockSettings.background_gradient || '',
        text_color: blockSettings.text_color || '',
        padding: Number(blockSettings.padding || 0),
        radius: Number(blockSettings.radius || 0),
        max_width: Number(blockSettings.max_width || 0),
        font_size: Number(blockSettings.font_size || 0),
        font_family: blockSettings.font_family || '',
        align: blockSettings.align === 'center' ? 'center' : '',
        background_image: {
          id: Number(blockSettings.background_image?.id || 0),
          url: blockSettings.background_image?.url || '',
          alt: blockSettings.background_image?.alt || ''
        },
        layout: ['content', 'stack', 'split', 'split-reverse'].includes(blockSettings.layout) ? blockSettings.layout : 'content',
        media_image: {
          id: Number(blockSettings.media_image?.id || 0),
          url: blockSettings.media_image?.url || '',
          alt: blockSettings.media_image?.alt || ''
        },
        heading: blockSettings.heading || '',
        subheading: blockSettings.subheading || '',
        heading_size: Number(blockSettings.heading_size || 0),
        heading_line_height: Number(blockSettings.heading_line_height || 0),
        heading_weight: typeof blockSettings.heading_weight === 'string' ? blockSettings.heading_weight : 'semibold',
        subheading_size: Number(blockSettings.subheading_size || 0),
        subheading_line_height: Number(blockSettings.subheading_line_height || 0),
        subheading_weight: typeof blockSettings.subheading_weight === 'string' ? blockSettings.subheading_weight : 'normal',
        cta_text: blockSettings.cta_text || '',
        cta_link: blockSettings.cta_link || '',
        cta_target: Boolean(blockSettings.cta_target),
        cta_text_color: blockSettings.cta_text_color || '#ffffff',
        cta_background: blockSettings.cta_background || '#2563eb',
        cta_radius: Number(blockSettings.cta_radius || 0),
        border_width: Number(blockSettings.border_width || 0),
        border_color: blockSettings.border_color || '#d0d7e2',
        shadow: ['none', 'soft', 'float'].includes(blockSettings.shadow) ? blockSettings.shadow : 'none'
      },
      container_style: {
        mode: containerStyle.mode === 'raw' ? 'raw' : 'boxed',
        max_width: Number(containerStyle.max_width || 100),
        max_width_unit: containerStyle.max_width_unit === 'px' ? 'px' : '%',
        reserve_height: Number(containerStyle.reserve_height || 0),
        padding_top: Number(containerStyle.padding_top || 0),
        padding_right: Number(containerStyle.padding_right || 0),
        padding_bottom: Number(containerStyle.padding_bottom || 0),
        padding_left: Number(containerStyle.padding_left || 0),
        background: containerStyle.background || 'transparent',
        radius: Number(containerStyle.radius || 0),
        shadow: ['none', 'soft', 'float'].includes(containerStyle.shadow) ? containerStyle.shadow : 'none',
        badge_enabled: Boolean(containerStyle.badge_enabled),
        badge_type: ['text', 'image'].includes(containerStyle.badge_type) ? containerStyle.badge_type : 'text',
        badge_text: containerStyle.badge_text || '广告',
        badge_color: containerStyle.badge_color || '#1d2327',
        badge_image: {
          id: Number(containerStyle.badge_image?.id || 0),
          url: containerStyle.badge_image?.url || '',
          alt: containerStyle.badge_image?.alt || ''
        },
        layout: containerStyle.layout === 'centered' ? 'centered' : ''
      },
      behavior: {
        animation: ['none', 'fade', 'slide-up', 'zoom'].includes(behavior.animation) ? behavior.animation : 'none',
        close_button: Boolean(behavior.close_button),
        close_on_esc: behavior.close_on_esc === false ? false : true,
        close_on_overlay: behavior.close_on_overlay === false ? false : true,
        lock_scroll: Boolean(behavior.lock_scroll),
        frequency_mode: ['none', 'session', 'day', 'count'].includes(behavior.frequency_mode) ? behavior.frequency_mode : 'none',
        frequency_limit: Number(behavior.frequency_limit || 1),
        delay: Number(behavior.delay || 0)
      },
      image_settings: {
        watermark: Boolean(imageSettings.watermark),
        radius: Number(imageSettings.radius || 0),
        max_width: Number(imageSettings.max_width || 1200),
        margin_top: Number(imageSettings.margin_top || 0),
        margin_bottom: Number(imageSettings.margin_bottom || 0),
        margin_left: Number(imageSettings.margin_left || 0),
        margin_right: Number(imageSettings.margin_right || 0)
      }
    }
  };
};
const normalizeSlot = slot => {
  const safeSlot = slot && typeof slot === 'object' ? slot : {};
  return {
    id: typeof safeSlot.id === 'string' ? safeSlot.id : '',
    label: typeof safeSlot.label === 'string' ? safeSlot.label : '',
    ad_ids: Array.isArray(safeSlot.ad_ids) ? safeSlot.ad_ids.filter(Boolean) : [],
    weights: Array.isArray(safeSlot.weights) ? safeSlot.weights.map(value => Number(value) || 1) : [],
    limit: Number(safeSlot.limit || 1)
  };
};
const useStore = (0,zustand__WEBPACK_IMPORTED_MODULE_0__.create)((set, get) => ({
  ads: [],
  slots: [],
  isLoading: false,
  isSaving: false,
  error: null,
  addAdGroup: type => {
    set(state => {
      const draft = createAdGroupTemplate(type, state.ads);
      return {
        ads: [...state.ads, draft]
      };
    });
  },
  removeAdGroup: id => {
    set(state => ({
      ads: state.ads.filter(ad => ad.id !== id)
    }));
  },
  updateAdGroup: (id, updates) => {
    set(state => ({
      ads: state.ads.map(ad => ad.id === id ? {
        ...ad,
        ...updates
      } : ad)
    }));
  },
  setSlots: slots => {
    set({
      slots: Array.isArray(slots) ? slots : []
    });
  },
  addSlot: () => {
    set(state => ({
      slots: [...state.slots, createSlotTemplate(state.slots)]
    }));
  },
  updateSlot: (index, updates) => {
    set(state => {
      const next = [...state.slots];
      if (!next[index]) {
        return state;
      }
      next[index] = {
        ...next[index],
        ...updates
      };
      return {
        slots: next
      };
    });
  },
  removeSlot: index => {
    set(state => ({
      slots: state.slots.filter((_, idx) => idx !== index)
    }));
  },
  saveToDB: async () => {
    set({
      isSaving: true,
      error: null
    });
    try {
      const {
        ads,
        slots
      } = get();
      const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
        path: '/magick-ad/v1/save-settings',
        method: 'POST',
        data: {
          ads,
          slots
        }
      });
      set({
        isSaving: false
      });
      return response;
    } catch (error) {
      set({
        isSaving: false,
        error
      });
      throw error;
    }
  },
  fetchFromDB: async () => {
    set({
      isLoading: true,
      error: null
    });
    try {
      const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
        path: '/magick-ad/v1/save-settings',
        method: 'GET'
      });
      let ads = [];
      let slots = [];
      if (Array.isArray(response)) {
        ads = response;
      } else if (Array.isArray(response?.ads)) {
        ads = response.ads;
        if (Array.isArray(response?.slots)) {
          slots = response.slots;
        }
      } else if (Array.isArray(response?.saved?.ads)) {
        ads = response.saved.ads;
        if (Array.isArray(response?.saved?.slots)) {
          slots = response.saved.slots;
        }
      }
      set({
        ads: ads.map(ad => normalizeAd(ad)),
        slots: slots.map(slot => normalizeSlot(slot)),
        isLoading: false
      });
      return ads;
    } catch (error) {
      set({
        isLoading: false,
        error
      });
      return [];
    }
  }
}));

/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/icon/index.js"
/*!**************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/icon/index.js ***!
  \**************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ icon_default)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);

var icon_default = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.forwardRef)(
  ({ icon, size = 24, ...props }, ref) => {
    return (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.cloneElement)(icon, {
      width: size,
      height: size,
      ...props,
      ref
    });
  }
);

//# sourceMappingURL=index.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/calendar.js"
/*!********************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/calendar.js ***!
  \********************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ calendar_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var calendar_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path, { d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm.5 16c0 .3-.2.5-.5.5H5c-.3 0-.5-.2-.5-.5V7h15v12zM9 10H7v2h2v-2zm0 4H7v2h2v-2zm4-4h-2v2h2v-2zm4 0h-2v2h2v-2zm-4 4h-2v2h2v-2zm4 0h-2v2h2v-2z" }) });

//# sourceMappingURL=calendar.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/chevron-down.js"
/*!************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/chevron-down.js ***!
  \************************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ chevron_down_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var chevron_down_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path, { d: "M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z" }) });

//# sourceMappingURL=chevron-down.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/chevron-left.js"
/*!************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/chevron-left.js ***!
  \************************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ chevron_left_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var chevron_left_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path, { d: "M14.6 7l-1.2-1L8 12l5.4 6 1.2-1-4.6-5z" }) });

//# sourceMappingURL=chevron-left.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/chevron-right.js"
/*!*************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/chevron-right.js ***!
  \*************************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ chevron_right_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var chevron_right_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path, { d: "M10.6 6L9.4 7l4.6 5-4.6 5 1.2 1 5.4-6z" }) });

//# sourceMappingURL=chevron-right.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/chevron-up.js"
/*!**********************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/chevron-up.js ***!
  \**********************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ chevron_up_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var chevron_up_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path, { d: "M6.5 12.4L12 8l5.5 4.4-.9 1.2L12 10l-4.5 3.6-1-1.2z" }) });

//# sourceMappingURL=chevron-up.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/close-small.js"
/*!***********************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/close-small.js ***!
  \***********************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ close_small_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var close_small_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path, { d: "M12 13.06l3.712 3.713 1.061-1.06L13.061 12l3.712-3.712-1.06-1.06L12 10.938 8.288 7.227l-1.061 1.06L10.939 12l-3.712 3.712 1.06 1.061L12 13.061z" }) });

//# sourceMappingURL=close-small.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/cog.js"
/*!***************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/cog.js ***!
  \***************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ cog_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var cog_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(
  _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path,
  {
    fillRule: "evenodd",
    d: "M10.289 4.836A1 1 0 0111.275 4h1.306a1 1 0 01.987.836l.244 1.466c.787.26 1.503.679 2.108 1.218l1.393-.522a1 1 0 011.216.437l.653 1.13a1 1 0 01-.23 1.273l-1.148.944a6.025 6.025 0 010 2.435l1.149.946a1 1 0 01.23 1.272l-.653 1.13a1 1 0 01-1.216.437l-1.394-.522c-.605.54-1.32.958-2.108 1.218l-.244 1.466a1 1 0 01-.987.836h-1.306a1 1 0 01-.986-.836l-.244-1.466a5.995 5.995 0 01-2.108-1.218l-1.394.522a1 1 0 01-1.217-.436l-.653-1.131a1 1 0 01.23-1.272l1.149-.946a6.026 6.026 0 010-2.435l-1.148-.944a1 1 0 01-.23-1.272l.653-1.131a1 1 0 011.217-.437l1.393.522a5.994 5.994 0 012.108-1.218l.244-1.466zM14.929 12a3 3 0 11-6 0 3 3 0 016 0z",
    clipRule: "evenodd"
  }
) });

//# sourceMappingURL=cog.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/desktop.js"
/*!*******************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/desktop.js ***!
  \*******************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ desktop_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var desktop_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path, { d: "M20.5 16h-.7V8c0-1.1-.9-2-2-2H6.2c-1.1 0-2 .9-2 2v8h-.7c-.8 0-1.5.7-1.5 1.5h20c0-.8-.7-1.5-1.5-1.5zM5.7 8c0-.3.2-.5.5-.5h11.6c.3 0 .5.2.5.5v7.6H5.7V8z" }) });

//# sourceMappingURL=desktop.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/external.js"
/*!********************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/external.js ***!
  \********************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ external_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var external_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path, { d: "M19.5 4.5h-7V6h4.44l-5.97 5.97 1.06 1.06L18 7.06v4.44h1.5v-7Zm-13 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3H17v3a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h3V5.5h-3Z" }) });

//# sourceMappingURL=external.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/fullscreen.js"
/*!**********************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/fullscreen.js ***!
  \**********************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ fullscreen_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var fullscreen_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path, { d: "M6 4a2 2 0 0 0-2 2v3h1.5V6a.5.5 0 0 1 .5-.5h3V4H6Zm3 14.5H6a.5.5 0 0 1-.5-.5v-3H4v3a2 2 0 0 0 2 2h3v-1.5Zm6 1.5v-1.5h3a.5.5 0 0 0 .5-.5v-3H20v3a2 2 0 0 1-2 2h-3Zm3-16a2 2 0 0 1 2 2v3h-1.5V6a.5.5 0 0 0-.5-.5h-3V4h3Z" }) });

//# sourceMappingURL=fullscreen.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/globe.js"
/*!*****************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/globe.js ***!
  \*****************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ globe_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var globe_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path, { d: "M12 4c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8Zm6.5 8c0 .6 0 1.2-.2 1.8h-2.7c0-.6.2-1.1.2-1.8s0-1.2-.2-1.8h2.7c.2.6.2 1.1.2 1.8Zm-.9-3.2h-2.4c-.3-.9-.7-1.8-1.1-2.4-.1-.2-.2-.4-.3-.5 1.6.5 3 1.6 3.8 3ZM12.8 17c-.3.5-.6 1-.8 1.3-.2-.3-.5-.8-.8-1.3-.3-.5-.6-1.1-.8-1.7h3.3c-.2.6-.5 1.2-.8 1.7Zm-2.9-3.2c-.1-.6-.2-1.1-.2-1.8s0-1.2.2-1.8H14c.1.6.2 1.1.2 1.8s0 1.2-.2 1.8H9.9ZM11.2 7c.3-.5.6-1 .8-1.3.2.3.5.8.8 1.3.3.5.6 1.1.8 1.7h-3.3c.2-.6.5-1.2.8-1.7Zm-1-1.2c-.1.2-.2.3-.3.5-.4.7-.8 1.5-1.1 2.4H6.4c.8-1.4 2.2-2.5 3.8-3Zm-1.8 8H5.7c-.2-.6-.2-1.1-.2-1.8s0-1.2.2-1.8h2.7c0 .6-.2 1.1-.2 1.8s0 1.2.2 1.8Zm-2 1.4h2.4c.3.9.7 1.8 1.1 2.4.1.2.2.4.3.5-1.6-.5-3-1.6-3.8-3Zm7.4 3c.1-.2.2-.3.3-.5.4-.7.8-1.5 1.1-2.4h2.4c-.8 1.4-2.2 2.5-3.8 3Z" }) });

//# sourceMappingURL=globe.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/info.js"
/*!****************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/info.js ***!
  \****************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ info_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var info_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(
  _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path,
  {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M5.5 12a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0ZM12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.75 4v1.5h-1.5V8h1.5Zm0 8v-5h-1.5v5h1.5Z"
  }
) });

//# sourceMappingURL=info.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/megaphone.js"
/*!*********************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/megaphone.js ***!
  \*********************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ megaphone_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var megaphone_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(
  _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path,
  {
    fillRule: "evenodd",
    d: "M6.863 13.644L5 13.25h-.5a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5H5L18 6.5h2V16h-2l-3.854-.815.026.008a3.75 3.75 0 01-7.31-1.549zm1.477.313a2.251 2.251 0 004.356.921l-4.356-.921zm-2.84-3.28L18.157 8h.343v6.5h-.343L5.5 11.823v-1.146z",
    clipRule: "evenodd"
  }
) });

//# sourceMappingURL=megaphone.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/mobile.js"
/*!******************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/mobile.js ***!
  \******************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ mobile_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var mobile_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path, { d: "M15 4H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm.5 14c0 .3-.2.5-.5.5H9c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h6c.3 0 .5.2.5.5v12zm-4.5-.5h2V16h-2v1.5z" }) });

//# sourceMappingURL=mobile.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/more-horizontal.js"
/*!***************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/more-horizontal.js ***!
  \***************************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ more_horizontal_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var more_horizontal_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path, { d: "M11 13h2v-2h-2v2zm-6 0h2v-2H5v2zm12-2v2h2v-2h-2z" }) });

//# sourceMappingURL=more-horizontal.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/search.js"
/*!******************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/search.js ***!
  \******************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ search_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var search_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path, { d: "M13 5c-3.3 0-6 2.7-6 6 0 1.4.5 2.7 1.3 3.7l-3.8 3.8 1.1 1.1 3.8-3.8c1 .8 2.3 1.3 3.7 1.3 3.3 0 6-2.7 6-6S16.3 5 13 5zm0 10.5c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z" }) });

//# sourceMappingURL=search.js.map


/***/ },

/***/ "./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/tablet.js"
/*!******************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@wordpress+icons@11.0.1_react@18.3.1/node_modules/@wordpress/icons/build-module/library/tablet.js ***!
  \******************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ tablet_default)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__);


var tablet_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_1__.Path, { d: "M17 4H7c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm.5 14c0 .3-.2.5-.5.5H7c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h10c.3 0 .5.2.5.5v12zm-7.5-.5h4V16h-4v1.5z" }) });

//# sourceMappingURL=tablet.js.map


/***/ },

/***/ "./node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react-jsx-runtime.development.js"
/*!*************************************************************************************************!*\
  !*** ./node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react-jsx-runtime.development.js ***!
  \*************************************************************************************************/
(__unused_webpack_module, exports, __webpack_require__) {

/**
 * @license React
 * react-jsx-runtime.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */



if (true) {
  (function() {
'use strict';

var React = __webpack_require__(/*! react */ "react");

// ATTENTION
// When adding new symbols to this file,
// Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'
// The Symbol used to tag the ReactElement-like types.
var REACT_ELEMENT_TYPE = Symbol.for('react.element');
var REACT_PORTAL_TYPE = Symbol.for('react.portal');
var REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');
var REACT_STRICT_MODE_TYPE = Symbol.for('react.strict_mode');
var REACT_PROFILER_TYPE = Symbol.for('react.profiler');
var REACT_PROVIDER_TYPE = Symbol.for('react.provider');
var REACT_CONTEXT_TYPE = Symbol.for('react.context');
var REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
var REACT_SUSPENSE_TYPE = Symbol.for('react.suspense');
var REACT_SUSPENSE_LIST_TYPE = Symbol.for('react.suspense_list');
var REACT_MEMO_TYPE = Symbol.for('react.memo');
var REACT_LAZY_TYPE = Symbol.for('react.lazy');
var REACT_OFFSCREEN_TYPE = Symbol.for('react.offscreen');
var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
var FAUX_ITERATOR_SYMBOL = '@@iterator';
function getIteratorFn(maybeIterable) {
  if (maybeIterable === null || typeof maybeIterable !== 'object') {
    return null;
  }

  var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];

  if (typeof maybeIterator === 'function') {
    return maybeIterator;
  }

  return null;
}

var ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

function error(format) {
  {
    {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      printWarning('error', format, args);
    }
  }
}

function printWarning(level, format, args) {
  // When changing this logic, you might want to also
  // update consoleWithStackDev.www.js as well.
  {
    var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
    var stack = ReactDebugCurrentFrame.getStackAddendum();

    if (stack !== '') {
      format += '%s';
      args = args.concat([stack]);
    } // eslint-disable-next-line react-internal/safe-string-coercion


    var argsWithFormat = args.map(function (item) {
      return String(item);
    }); // Careful: RN currently depends on this prefix

    argsWithFormat.unshift('Warning: ' + format); // We intentionally don't use spread (or .apply) directly because it
    // breaks IE9: https://github.com/facebook/react/issues/13610
    // eslint-disable-next-line react-internal/no-production-logging

    Function.prototype.apply.call(console[level], console, argsWithFormat);
  }
}

// -----------------------------------------------------------------------------

var enableScopeAPI = false; // Experimental Create Event Handle API.
var enableCacheElement = false;
var enableTransitionTracing = false; // No known bugs, but needs performance testing

var enableLegacyHidden = false; // Enables unstable_avoidThisFallback feature in Fiber
// stuff. Intended to enable React core members to more easily debug scheduling
// issues in DEV builds.

var enableDebugTracing = false; // Track which Fiber(s) schedule render work.

var REACT_MODULE_REFERENCE;

{
  REACT_MODULE_REFERENCE = Symbol.for('react.module.reference');
}

function isValidElementType(type) {
  if (typeof type === 'string' || typeof type === 'function') {
    return true;
  } // Note: typeof might be other than 'symbol' or 'number' (e.g. if it's a polyfill).


  if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing  || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden  || type === REACT_OFFSCREEN_TYPE || enableScopeAPI  || enableCacheElement  || enableTransitionTracing ) {
    return true;
  }

  if (typeof type === 'object' && type !== null) {
    if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
    // types supported by any Flight configuration anywhere since
    // we don't know which Flight build this will end up being used
    // with.
    type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== undefined) {
      return true;
    }
  }

  return false;
}

function getWrappedName(outerType, innerType, wrapperName) {
  var displayName = outerType.displayName;

  if (displayName) {
    return displayName;
  }

  var functionName = innerType.displayName || innerType.name || '';
  return functionName !== '' ? wrapperName + "(" + functionName + ")" : wrapperName;
} // Keep in sync with react-reconciler/getComponentNameFromFiber


function getContextName(type) {
  return type.displayName || 'Context';
} // Note that the reconciler package should generally prefer to use getComponentNameFromFiber() instead.


function getComponentNameFromType(type) {
  if (type == null) {
    // Host root, text node or just invalid type.
    return null;
  }

  {
    if (typeof type.tag === 'number') {
      error('Received an unexpected object in getComponentNameFromType(). ' + 'This is likely a bug in React. Please file an issue.');
    }
  }

  if (typeof type === 'function') {
    return type.displayName || type.name || null;
  }

  if (typeof type === 'string') {
    return type;
  }

  switch (type) {
    case REACT_FRAGMENT_TYPE:
      return 'Fragment';

    case REACT_PORTAL_TYPE:
      return 'Portal';

    case REACT_PROFILER_TYPE:
      return 'Profiler';

    case REACT_STRICT_MODE_TYPE:
      return 'StrictMode';

    case REACT_SUSPENSE_TYPE:
      return 'Suspense';

    case REACT_SUSPENSE_LIST_TYPE:
      return 'SuspenseList';

  }

  if (typeof type === 'object') {
    switch (type.$$typeof) {
      case REACT_CONTEXT_TYPE:
        var context = type;
        return getContextName(context) + '.Consumer';

      case REACT_PROVIDER_TYPE:
        var provider = type;
        return getContextName(provider._context) + '.Provider';

      case REACT_FORWARD_REF_TYPE:
        return getWrappedName(type, type.render, 'ForwardRef');

      case REACT_MEMO_TYPE:
        var outerName = type.displayName || null;

        if (outerName !== null) {
          return outerName;
        }

        return getComponentNameFromType(type.type) || 'Memo';

      case REACT_LAZY_TYPE:
        {
          var lazyComponent = type;
          var payload = lazyComponent._payload;
          var init = lazyComponent._init;

          try {
            return getComponentNameFromType(init(payload));
          } catch (x) {
            return null;
          }
        }

      // eslint-disable-next-line no-fallthrough
    }
  }

  return null;
}

var assign = Object.assign;

// Helpers to patch console.logs to avoid logging during side-effect free
// replaying on render function. This currently only patches the object
// lazily which won't cover if the log function was extracted eagerly.
// We could also eagerly patch the method.
var disabledDepth = 0;
var prevLog;
var prevInfo;
var prevWarn;
var prevError;
var prevGroup;
var prevGroupCollapsed;
var prevGroupEnd;

function disabledLog() {}

disabledLog.__reactDisabledLog = true;
function disableLogs() {
  {
    if (disabledDepth === 0) {
      /* eslint-disable react-internal/no-production-logging */
      prevLog = console.log;
      prevInfo = console.info;
      prevWarn = console.warn;
      prevError = console.error;
      prevGroup = console.group;
      prevGroupCollapsed = console.groupCollapsed;
      prevGroupEnd = console.groupEnd; // https://github.com/facebook/react/issues/19099

      var props = {
        configurable: true,
        enumerable: true,
        value: disabledLog,
        writable: true
      }; // $FlowFixMe Flow thinks console is immutable.

      Object.defineProperties(console, {
        info: props,
        log: props,
        warn: props,
        error: props,
        group: props,
        groupCollapsed: props,
        groupEnd: props
      });
      /* eslint-enable react-internal/no-production-logging */
    }

    disabledDepth++;
  }
}
function reenableLogs() {
  {
    disabledDepth--;

    if (disabledDepth === 0) {
      /* eslint-disable react-internal/no-production-logging */
      var props = {
        configurable: true,
        enumerable: true,
        writable: true
      }; // $FlowFixMe Flow thinks console is immutable.

      Object.defineProperties(console, {
        log: assign({}, props, {
          value: prevLog
        }),
        info: assign({}, props, {
          value: prevInfo
        }),
        warn: assign({}, props, {
          value: prevWarn
        }),
        error: assign({}, props, {
          value: prevError
        }),
        group: assign({}, props, {
          value: prevGroup
        }),
        groupCollapsed: assign({}, props, {
          value: prevGroupCollapsed
        }),
        groupEnd: assign({}, props, {
          value: prevGroupEnd
        })
      });
      /* eslint-enable react-internal/no-production-logging */
    }

    if (disabledDepth < 0) {
      error('disabledDepth fell below zero. ' + 'This is a bug in React. Please file an issue.');
    }
  }
}

var ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;
var prefix;
function describeBuiltInComponentFrame(name, source, ownerFn) {
  {
    if (prefix === undefined) {
      // Extract the VM specific prefix used by each line.
      try {
        throw Error();
      } catch (x) {
        var match = x.stack.trim().match(/\n( *(at )?)/);
        prefix = match && match[1] || '';
      }
    } // We use the prefix to ensure our stacks line up with native stack frames.


    return '\n' + prefix + name;
  }
}
var reentry = false;
var componentFrameCache;

{
  var PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;
  componentFrameCache = new PossiblyWeakMap();
}

function describeNativeComponentFrame(fn, construct) {
  // If something asked for a stack inside a fake render, it should get ignored.
  if ( !fn || reentry) {
    return '';
  }

  {
    var frame = componentFrameCache.get(fn);

    if (frame !== undefined) {
      return frame;
    }
  }

  var control;
  reentry = true;
  var previousPrepareStackTrace = Error.prepareStackTrace; // $FlowFixMe It does accept undefined.

  Error.prepareStackTrace = undefined;
  var previousDispatcher;

  {
    previousDispatcher = ReactCurrentDispatcher.current; // Set the dispatcher in DEV because this might be call in the render function
    // for warnings.

    ReactCurrentDispatcher.current = null;
    disableLogs();
  }

  try {
    // This should throw.
    if (construct) {
      // Something should be setting the props in the constructor.
      var Fake = function () {
        throw Error();
      }; // $FlowFixMe


      Object.defineProperty(Fake.prototype, 'props', {
        set: function () {
          // We use a throwing setter instead of frozen or non-writable props
          // because that won't throw in a non-strict mode function.
          throw Error();
        }
      });

      if (typeof Reflect === 'object' && Reflect.construct) {
        // We construct a different control for this case to include any extra
        // frames added by the construct call.
        try {
          Reflect.construct(Fake, []);
        } catch (x) {
          control = x;
        }

        Reflect.construct(fn, [], Fake);
      } else {
        try {
          Fake.call();
        } catch (x) {
          control = x;
        }

        fn.call(Fake.prototype);
      }
    } else {
      try {
        throw Error();
      } catch (x) {
        control = x;
      }

      fn();
    }
  } catch (sample) {
    // This is inlined manually because closure doesn't do it for us.
    if (sample && control && typeof sample.stack === 'string') {
      // This extracts the first frame from the sample that isn't also in the control.
      // Skipping one frame that we assume is the frame that calls the two.
      var sampleLines = sample.stack.split('\n');
      var controlLines = control.stack.split('\n');
      var s = sampleLines.length - 1;
      var c = controlLines.length - 1;

      while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
        // We expect at least one stack frame to be shared.
        // Typically this will be the root most one. However, stack frames may be
        // cut off due to maximum stack limits. In this case, one maybe cut off
        // earlier than the other. We assume that the sample is longer or the same
        // and there for cut off earlier. So we should find the root most frame in
        // the sample somewhere in the control.
        c--;
      }

      for (; s >= 1 && c >= 0; s--, c--) {
        // Next we find the first one that isn't the same which should be the
        // frame that called our sample function and the control.
        if (sampleLines[s] !== controlLines[c]) {
          // In V8, the first line is describing the message but other VMs don't.
          // If we're about to return the first line, and the control is also on the same
          // line, that's a pretty good indicator that our sample threw at same line as
          // the control. I.e. before we entered the sample frame. So we ignore this result.
          // This can happen if you passed a class to function component, or non-function.
          if (s !== 1 || c !== 1) {
            do {
              s--;
              c--; // We may still have similar intermediate frames from the construct call.
              // The next one that isn't the same should be our match though.

              if (c < 0 || sampleLines[s] !== controlLines[c]) {
                // V8 adds a "new" prefix for native classes. Let's remove it to make it prettier.
                var _frame = '\n' + sampleLines[s].replace(' at new ', ' at '); // If our component frame is labeled "<anonymous>"
                // but we have a user-provided "displayName"
                // splice it in to make the stack more readable.


                if (fn.displayName && _frame.includes('<anonymous>')) {
                  _frame = _frame.replace('<anonymous>', fn.displayName);
                }

                {
                  if (typeof fn === 'function') {
                    componentFrameCache.set(fn, _frame);
                  }
                } // Return the line we found.


                return _frame;
              }
            } while (s >= 1 && c >= 0);
          }

          break;
        }
      }
    }
  } finally {
    reentry = false;

    {
      ReactCurrentDispatcher.current = previousDispatcher;
      reenableLogs();
    }

    Error.prepareStackTrace = previousPrepareStackTrace;
  } // Fallback to just using the name if we couldn't make it throw.


  var name = fn ? fn.displayName || fn.name : '';
  var syntheticFrame = name ? describeBuiltInComponentFrame(name) : '';

  {
    if (typeof fn === 'function') {
      componentFrameCache.set(fn, syntheticFrame);
    }
  }

  return syntheticFrame;
}
function describeFunctionComponentFrame(fn, source, ownerFn) {
  {
    return describeNativeComponentFrame(fn, false);
  }
}

function shouldConstruct(Component) {
  var prototype = Component.prototype;
  return !!(prototype && prototype.isReactComponent);
}

function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {

  if (type == null) {
    return '';
  }

  if (typeof type === 'function') {
    {
      return describeNativeComponentFrame(type, shouldConstruct(type));
    }
  }

  if (typeof type === 'string') {
    return describeBuiltInComponentFrame(type);
  }

  switch (type) {
    case REACT_SUSPENSE_TYPE:
      return describeBuiltInComponentFrame('Suspense');

    case REACT_SUSPENSE_LIST_TYPE:
      return describeBuiltInComponentFrame('SuspenseList');
  }

  if (typeof type === 'object') {
    switch (type.$$typeof) {
      case REACT_FORWARD_REF_TYPE:
        return describeFunctionComponentFrame(type.render);

      case REACT_MEMO_TYPE:
        // Memo may contain any component type so we recursively resolve it.
        return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);

      case REACT_LAZY_TYPE:
        {
          var lazyComponent = type;
          var payload = lazyComponent._payload;
          var init = lazyComponent._init;

          try {
            // Lazy may contain any component type so we recursively resolve it.
            return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
          } catch (x) {}
        }
    }
  }

  return '';
}

var hasOwnProperty = Object.prototype.hasOwnProperty;

var loggedTypeFailures = {};
var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;

function setCurrentlyValidatingElement(element) {
  {
    if (element) {
      var owner = element._owner;
      var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
      ReactDebugCurrentFrame.setExtraStackFrame(stack);
    } else {
      ReactDebugCurrentFrame.setExtraStackFrame(null);
    }
  }
}

function checkPropTypes(typeSpecs, values, location, componentName, element) {
  {
    // $FlowFixMe This is okay but Flow doesn't know it.
    var has = Function.call.bind(hasOwnProperty);

    for (var typeSpecName in typeSpecs) {
      if (has(typeSpecs, typeSpecName)) {
        var error$1 = void 0; // Prop type validation may throw. In case they do, we don't want to
        // fail the render phase where it didn't fail before. So we log it.
        // After these have been cleaned up, we'll let them throw.

        try {
          // This is intentionally an invariant that gets caught. It's the same
          // behavior as without this statement except with a better message.
          if (typeof typeSpecs[typeSpecName] !== 'function') {
            // eslint-disable-next-line react-internal/prod-error-codes
            var err = Error((componentName || 'React class') + ': ' + location + ' type `' + typeSpecName + '` is invalid; ' + 'it must be a function, usually from the `prop-types` package, but received `' + typeof typeSpecs[typeSpecName] + '`.' + 'This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.');
            err.name = 'Invariant Violation';
            throw err;
          }

          error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED');
        } catch (ex) {
          error$1 = ex;
        }

        if (error$1 && !(error$1 instanceof Error)) {
          setCurrentlyValidatingElement(element);

          error('%s: type specification of %s' + ' `%s` is invalid; the type checker ' + 'function must return `null` or an `Error` but returned a %s. ' + 'You may have forgotten to pass an argument to the type checker ' + 'creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and ' + 'shape all require an argument).', componentName || 'React class', location, typeSpecName, typeof error$1);

          setCurrentlyValidatingElement(null);
        }

        if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
          // Only monitor this failure once because there tends to be a lot of the
          // same error.
          loggedTypeFailures[error$1.message] = true;
          setCurrentlyValidatingElement(element);

          error('Failed %s type: %s', location, error$1.message);

          setCurrentlyValidatingElement(null);
        }
      }
    }
  }
}

var isArrayImpl = Array.isArray; // eslint-disable-next-line no-redeclare

function isArray(a) {
  return isArrayImpl(a);
}

/*
 * The `'' + value` pattern (used in in perf-sensitive code) throws for Symbol
 * and Temporal.* types. See https://github.com/facebook/react/pull/22064.
 *
 * The functions in this module will throw an easier-to-understand,
 * easier-to-debug exception with a clear errors message message explaining the
 * problem. (Instead of a confusing exception thrown inside the implementation
 * of the `value` object).
 */
// $FlowFixMe only called in DEV, so void return is not possible.
function typeName(value) {
  {
    // toStringTag is needed for namespaced types like Temporal.Instant
    var hasToStringTag = typeof Symbol === 'function' && Symbol.toStringTag;
    var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || 'Object';
    return type;
  }
} // $FlowFixMe only called in DEV, so void return is not possible.


function willCoercionThrow(value) {
  {
    try {
      testStringCoercion(value);
      return false;
    } catch (e) {
      return true;
    }
  }
}

function testStringCoercion(value) {
  // If you ended up here by following an exception call stack, here's what's
  // happened: you supplied an object or symbol value to React (as a prop, key,
  // DOM attribute, CSS property, string ref, etc.) and when React tried to
  // coerce it to a string using `'' + value`, an exception was thrown.
  //
  // The most common types that will cause this exception are `Symbol` instances
  // and Temporal objects like `Temporal.Instant`. But any object that has a
  // `valueOf` or `[Symbol.toPrimitive]` method that throws will also cause this
  // exception. (Library authors do this to prevent users from using built-in
  // numeric operators like `+` or comparison operators like `>=` because custom
  // methods are needed to perform accurate arithmetic or comparison.)
  //
  // To fix the problem, coerce this object or symbol value to a string before
  // passing it to React. The most reliable way is usually `String(value)`.
  //
  // To find which value is throwing, check the browser or debugger console.
  // Before this exception was thrown, there should be `console.error` output
  // that shows the type (Symbol, Temporal.PlainDate, etc.) that caused the
  // problem and how that type was used: key, atrribute, input value prop, etc.
  // In most cases, this console output also shows the component and its
  // ancestor components where the exception happened.
  //
  // eslint-disable-next-line react-internal/safe-string-coercion
  return '' + value;
}
function checkKeyStringCoercion(value) {
  {
    if (willCoercionThrow(value)) {
      error('The provided key is an unsupported type %s.' + ' This value must be coerced to a string before before using it here.', typeName(value));

      return testStringCoercion(value); // throw (to help callers find troubleshooting comments)
    }
  }
}

var ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;
var RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true
};
var specialPropKeyWarningShown;
var specialPropRefWarningShown;
var didWarnAboutStringRefs;

{
  didWarnAboutStringRefs = {};
}

function hasValidRef(config) {
  {
    if (hasOwnProperty.call(config, 'ref')) {
      var getter = Object.getOwnPropertyDescriptor(config, 'ref').get;

      if (getter && getter.isReactWarning) {
        return false;
      }
    }
  }

  return config.ref !== undefined;
}

function hasValidKey(config) {
  {
    if (hasOwnProperty.call(config, 'key')) {
      var getter = Object.getOwnPropertyDescriptor(config, 'key').get;

      if (getter && getter.isReactWarning) {
        return false;
      }
    }
  }

  return config.key !== undefined;
}

function warnIfStringRefCannotBeAutoConverted(config, self) {
  {
    if (typeof config.ref === 'string' && ReactCurrentOwner.current && self && ReactCurrentOwner.current.stateNode !== self) {
      var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);

      if (!didWarnAboutStringRefs[componentName]) {
        error('Component "%s" contains the string ref "%s". ' + 'Support for string refs will be removed in a future major release. ' + 'This case cannot be automatically converted to an arrow function. ' + 'We ask you to manually fix this case by using useRef() or createRef() instead. ' + 'Learn more about using refs safely here: ' + 'https://reactjs.org/link/strict-mode-string-ref', getComponentNameFromType(ReactCurrentOwner.current.type), config.ref);

        didWarnAboutStringRefs[componentName] = true;
      }
    }
  }
}

function defineKeyPropWarningGetter(props, displayName) {
  {
    var warnAboutAccessingKey = function () {
      if (!specialPropKeyWarningShown) {
        specialPropKeyWarningShown = true;

        error('%s: `key` is not a prop. Trying to access it will result ' + 'in `undefined` being returned. If you need to access the same ' + 'value within the child component, you should pass it as a different ' + 'prop. (https://reactjs.org/link/special-props)', displayName);
      }
    };

    warnAboutAccessingKey.isReactWarning = true;
    Object.defineProperty(props, 'key', {
      get: warnAboutAccessingKey,
      configurable: true
    });
  }
}

function defineRefPropWarningGetter(props, displayName) {
  {
    var warnAboutAccessingRef = function () {
      if (!specialPropRefWarningShown) {
        specialPropRefWarningShown = true;

        error('%s: `ref` is not a prop. Trying to access it will result ' + 'in `undefined` being returned. If you need to access the same ' + 'value within the child component, you should pass it as a different ' + 'prop. (https://reactjs.org/link/special-props)', displayName);
      }
    };

    warnAboutAccessingRef.isReactWarning = true;
    Object.defineProperty(props, 'ref', {
      get: warnAboutAccessingRef,
      configurable: true
    });
  }
}
/**
 * Factory method to create a new React element. This no longer adheres to
 * the class pattern, so do not use new to call it. Also, instanceof check
 * will not work. Instead test $$typeof field against Symbol.for('react.element') to check
 * if something is a React Element.
 *
 * @param {*} type
 * @param {*} props
 * @param {*} key
 * @param {string|object} ref
 * @param {*} owner
 * @param {*} self A *temporary* helper to detect places where `this` is
 * different from the `owner` when React.createElement is called, so that we
 * can warn. We want to get rid of owner and replace string `ref`s with arrow
 * functions, and as long as `this` and owner are the same, there will be no
 * change in behavior.
 * @param {*} source An annotation object (added by a transpiler or otherwise)
 * indicating filename, line number, and/or other information.
 * @internal
 */


var ReactElement = function (type, key, ref, self, source, owner, props) {
  var element = {
    // This tag allows us to uniquely identify this as a React Element
    $$typeof: REACT_ELEMENT_TYPE,
    // Built-in properties that belong on the element
    type: type,
    key: key,
    ref: ref,
    props: props,
    // Record the component responsible for creating this element.
    _owner: owner
  };

  {
    // The validation flag is currently mutative. We put it on
    // an external backing store so that we can freeze the whole object.
    // This can be replaced with a WeakMap once they are implemented in
    // commonly used development environments.
    element._store = {}; // To make comparing ReactElements easier for testing purposes, we make
    // the validation flag non-enumerable (where possible, which should
    // include every environment we run tests in), so the test framework
    // ignores it.

    Object.defineProperty(element._store, 'validated', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: false
    }); // self and source are DEV only properties.

    Object.defineProperty(element, '_self', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: self
    }); // Two elements created in two different places should be considered
    // equal for testing purposes and therefore we hide it from enumeration.

    Object.defineProperty(element, '_source', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: source
    });

    if (Object.freeze) {
      Object.freeze(element.props);
      Object.freeze(element);
    }
  }

  return element;
};
/**
 * https://github.com/reactjs/rfcs/pull/107
 * @param {*} type
 * @param {object} props
 * @param {string} key
 */

function jsxDEV(type, config, maybeKey, source, self) {
  {
    var propName; // Reserved names are extracted

    var props = {};
    var key = null;
    var ref = null; // Currently, key can be spread in as a prop. This causes a potential
    // issue if key is also explicitly declared (ie. <div {...props} key="Hi" />
    // or <div key="Hi" {...props} /> ). We want to deprecate key spread,
    // but as an intermediary step, we will use jsxDEV for everything except
    // <div {...props} key="Hi" />, because we aren't currently able to tell if
    // key is explicitly declared to be undefined or not.

    if (maybeKey !== undefined) {
      {
        checkKeyStringCoercion(maybeKey);
      }

      key = '' + maybeKey;
    }

    if (hasValidKey(config)) {
      {
        checkKeyStringCoercion(config.key);
      }

      key = '' + config.key;
    }

    if (hasValidRef(config)) {
      ref = config.ref;
      warnIfStringRefCannotBeAutoConverted(config, self);
    } // Remaining properties are added to a new props object


    for (propName in config) {
      if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
        props[propName] = config[propName];
      }
    } // Resolve default props


    if (type && type.defaultProps) {
      var defaultProps = type.defaultProps;

      for (propName in defaultProps) {
        if (props[propName] === undefined) {
          props[propName] = defaultProps[propName];
        }
      }
    }

    if (key || ref) {
      var displayName = typeof type === 'function' ? type.displayName || type.name || 'Unknown' : type;

      if (key) {
        defineKeyPropWarningGetter(props, displayName);
      }

      if (ref) {
        defineRefPropWarningGetter(props, displayName);
      }
    }

    return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
  }
}

var ReactCurrentOwner$1 = ReactSharedInternals.ReactCurrentOwner;
var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;

function setCurrentlyValidatingElement$1(element) {
  {
    if (element) {
      var owner = element._owner;
      var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
      ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
    } else {
      ReactDebugCurrentFrame$1.setExtraStackFrame(null);
    }
  }
}

var propTypesMisspellWarningShown;

{
  propTypesMisspellWarningShown = false;
}
/**
 * Verifies the object is a ReactElement.
 * See https://reactjs.org/docs/react-api.html#isvalidelement
 * @param {?object} object
 * @return {boolean} True if `object` is a ReactElement.
 * @final
 */


function isValidElement(object) {
  {
    return typeof object === 'object' && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
  }
}

function getDeclarationErrorAddendum() {
  {
    if (ReactCurrentOwner$1.current) {
      var name = getComponentNameFromType(ReactCurrentOwner$1.current.type);

      if (name) {
        return '\n\nCheck the render method of `' + name + '`.';
      }
    }

    return '';
  }
}

function getSourceInfoErrorAddendum(source) {
  {
    if (source !== undefined) {
      var fileName = source.fileName.replace(/^.*[\\\/]/, '');
      var lineNumber = source.lineNumber;
      return '\n\nCheck your code at ' + fileName + ':' + lineNumber + '.';
    }

    return '';
  }
}
/**
 * Warn if there's no key explicitly set on dynamic arrays of children or
 * object keys are not valid. This allows us to keep track of children between
 * updates.
 */


var ownerHasKeyUseWarning = {};

function getCurrentComponentErrorInfo(parentType) {
  {
    var info = getDeclarationErrorAddendum();

    if (!info) {
      var parentName = typeof parentType === 'string' ? parentType : parentType.displayName || parentType.name;

      if (parentName) {
        info = "\n\nCheck the top-level render call using <" + parentName + ">.";
      }
    }

    return info;
  }
}
/**
 * Warn if the element doesn't have an explicit key assigned to it.
 * This element is in an array. The array could grow and shrink or be
 * reordered. All children that haven't already been validated are required to
 * have a "key" property assigned to it. Error statuses are cached so a warning
 * will only be shown once.
 *
 * @internal
 * @param {ReactElement} element Element that requires a key.
 * @param {*} parentType element's parent's type.
 */


function validateExplicitKey(element, parentType) {
  {
    if (!element._store || element._store.validated || element.key != null) {
      return;
    }

    element._store.validated = true;
    var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);

    if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
      return;
    }

    ownerHasKeyUseWarning[currentComponentErrorInfo] = true; // Usually the current owner is the offender, but if it accepts children as a
    // property, it may be the creator of the child that's responsible for
    // assigning it a key.

    var childOwner = '';

    if (element && element._owner && element._owner !== ReactCurrentOwner$1.current) {
      // Give the component that originally created this child.
      childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
    }

    setCurrentlyValidatingElement$1(element);

    error('Each child in a list should have a unique "key" prop.' + '%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);

    setCurrentlyValidatingElement$1(null);
  }
}
/**
 * Ensure that every element either is passed in a static location, in an
 * array with an explicit keys property defined, or in an object literal
 * with valid key property.
 *
 * @internal
 * @param {ReactNode} node Statically passed child of any type.
 * @param {*} parentType node's parent's type.
 */


function validateChildKeys(node, parentType) {
  {
    if (typeof node !== 'object') {
      return;
    }

    if (isArray(node)) {
      for (var i = 0; i < node.length; i++) {
        var child = node[i];

        if (isValidElement(child)) {
          validateExplicitKey(child, parentType);
        }
      }
    } else if (isValidElement(node)) {
      // This element was passed in a valid location.
      if (node._store) {
        node._store.validated = true;
      }
    } else if (node) {
      var iteratorFn = getIteratorFn(node);

      if (typeof iteratorFn === 'function') {
        // Entry iterators used to provide implicit keys,
        // but now we print a separate warning for them later.
        if (iteratorFn !== node.entries) {
          var iterator = iteratorFn.call(node);
          var step;

          while (!(step = iterator.next()).done) {
            if (isValidElement(step.value)) {
              validateExplicitKey(step.value, parentType);
            }
          }
        }
      }
    }
  }
}
/**
 * Given an element, validate that its props follow the propTypes definition,
 * provided by the type.
 *
 * @param {ReactElement} element
 */


function validatePropTypes(element) {
  {
    var type = element.type;

    if (type === null || type === undefined || typeof type === 'string') {
      return;
    }

    var propTypes;

    if (typeof type === 'function') {
      propTypes = type.propTypes;
    } else if (typeof type === 'object' && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
    // Inner props are checked in the reconciler.
    type.$$typeof === REACT_MEMO_TYPE)) {
      propTypes = type.propTypes;
    } else {
      return;
    }

    if (propTypes) {
      // Intentionally inside to avoid triggering lazy initializers:
      var name = getComponentNameFromType(type);
      checkPropTypes(propTypes, element.props, 'prop', name, element);
    } else if (type.PropTypes !== undefined && !propTypesMisspellWarningShown) {
      propTypesMisspellWarningShown = true; // Intentionally inside to avoid triggering lazy initializers:

      var _name = getComponentNameFromType(type);

      error('Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?', _name || 'Unknown');
    }

    if (typeof type.getDefaultProps === 'function' && !type.getDefaultProps.isReactClassApproved) {
      error('getDefaultProps is only used on classic React.createClass ' + 'definitions. Use a static property named `defaultProps` instead.');
    }
  }
}
/**
 * Given a fragment, validate that it can only be provided with fragment props
 * @param {ReactElement} fragment
 */


function validateFragmentProps(fragment) {
  {
    var keys = Object.keys(fragment.props);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];

      if (key !== 'children' && key !== 'key') {
        setCurrentlyValidatingElement$1(fragment);

        error('Invalid prop `%s` supplied to `React.Fragment`. ' + 'React.Fragment can only have `key` and `children` props.', key);

        setCurrentlyValidatingElement$1(null);
        break;
      }
    }

    if (fragment.ref !== null) {
      setCurrentlyValidatingElement$1(fragment);

      error('Invalid attribute `ref` supplied to `React.Fragment`.');

      setCurrentlyValidatingElement$1(null);
    }
  }
}

var didWarnAboutKeySpread = {};
function jsxWithValidation(type, props, key, isStaticChildren, source, self) {
  {
    var validType = isValidElementType(type); // We warn in this case but don't throw. We expect the element creation to
    // succeed and there will likely be errors in render.

    if (!validType) {
      var info = '';

      if (type === undefined || typeof type === 'object' && type !== null && Object.keys(type).length === 0) {
        info += ' You likely forgot to export your component from the file ' + "it's defined in, or you might have mixed up default and named imports.";
      }

      var sourceInfo = getSourceInfoErrorAddendum(source);

      if (sourceInfo) {
        info += sourceInfo;
      } else {
        info += getDeclarationErrorAddendum();
      }

      var typeString;

      if (type === null) {
        typeString = 'null';
      } else if (isArray(type)) {
        typeString = 'array';
      } else if (type !== undefined && type.$$typeof === REACT_ELEMENT_TYPE) {
        typeString = "<" + (getComponentNameFromType(type.type) || 'Unknown') + " />";
        info = ' Did you accidentally export a JSX literal instead of a component?';
      } else {
        typeString = typeof type;
      }

      error('React.jsx: type is invalid -- expected a string (for ' + 'built-in components) or a class/function (for composite ' + 'components) but got: %s.%s', typeString, info);
    }

    var element = jsxDEV(type, props, key, source, self); // The result can be nullish if a mock or a custom function is used.
    // TODO: Drop this when these are no longer allowed as the type argument.

    if (element == null) {
      return element;
    } // Skip key warning if the type isn't valid since our key validation logic
    // doesn't expect a non-string/function type and can throw confusing errors.
    // We don't want exception behavior to differ between dev and prod.
    // (Rendering will throw with a helpful message and as soon as the type is
    // fixed, the key warnings will appear.)


    if (validType) {
      var children = props.children;

      if (children !== undefined) {
        if (isStaticChildren) {
          if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
              validateChildKeys(children[i], type);
            }

            if (Object.freeze) {
              Object.freeze(children);
            }
          } else {
            error('React.jsx: Static children should always be an array. ' + 'You are likely explicitly calling React.jsxs or React.jsxDEV. ' + 'Use the Babel transform instead.');
          }
        } else {
          validateChildKeys(children, type);
        }
      }
    }

    {
      if (hasOwnProperty.call(props, 'key')) {
        var componentName = getComponentNameFromType(type);
        var keys = Object.keys(props).filter(function (k) {
          return k !== 'key';
        });
        var beforeExample = keys.length > 0 ? '{key: someKey, ' + keys.join(': ..., ') + ': ...}' : '{key: someKey}';

        if (!didWarnAboutKeySpread[componentName + beforeExample]) {
          var afterExample = keys.length > 0 ? '{' + keys.join(': ..., ') + ': ...}' : '{}';

          error('A props object containing a "key" prop is being spread into JSX:\n' + '  let props = %s;\n' + '  <%s {...props} />\n' + 'React keys must be passed directly to JSX without using spread:\n' + '  let props = %s;\n' + '  <%s key={someKey} {...props} />', beforeExample, componentName, afterExample, componentName);

          didWarnAboutKeySpread[componentName + beforeExample] = true;
        }
      }
    }

    if (type === REACT_FRAGMENT_TYPE) {
      validateFragmentProps(element);
    } else {
      validatePropTypes(element);
    }

    return element;
  }
} // These two functions exist to still get child warnings in dev
// even with the prod transform. This means that jsxDEV is purely
// opt-in behavior for better messages but that we won't stop
// giving you warnings if you use production apis.

function jsxWithValidationStatic(type, props, key) {
  {
    return jsxWithValidation(type, props, key, true);
  }
}
function jsxWithValidationDynamic(type, props, key) {
  {
    return jsxWithValidation(type, props, key, false);
  }
}

var jsx =  jsxWithValidationDynamic ; // we may want to special case jsxs internally to take advantage of static children.
// for now we can ship identical prod functions

var jsxs =  jsxWithValidationStatic ;

exports.Fragment = REACT_FRAGMENT_TYPE;
exports.jsx = jsx;
exports.jsxs = jsxs;
  })();
}


/***/ },

/***/ "./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js"
/*!***************************************************************************!*\
  !*** ./node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js ***!
  \***************************************************************************/
(module, __unused_webpack_exports, __webpack_require__) {



if (false) // removed by dead control flow
{} else {
  module.exports = __webpack_require__(/*! ./cjs/react-jsx-runtime.development.js */ "./node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react-jsx-runtime.development.js");
}


/***/ },

/***/ "./node_modules/.pnpm/zustand@5.0.10_@types+react@18.3.27_react@18.3.1_use-sync-external-store@1.6.0_react@18.3.1_/node_modules/zustand/esm/react.mjs"
/*!************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/zustand@5.0.10_@types+react@18.3.27_react@18.3.1_use-sync-external-store@1.6.0_react@18.3.1_/node_modules/zustand/esm/react.mjs ***!
  \************************************************************************************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   create: () => (/* binding */ create),
/* harmony export */   useStore: () => (/* binding */ useStore)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var zustand_vanilla__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! zustand/vanilla */ "./node_modules/.pnpm/zustand@5.0.10_@types+react@18.3.27_react@18.3.1_use-sync-external-store@1.6.0_react@18.3.1_/node_modules/zustand/esm/vanilla.mjs");



const identity = (arg) => arg;
function useStore(api, selector = identity) {
  const slice = react__WEBPACK_IMPORTED_MODULE_0__.useSyncExternalStore(
    api.subscribe,
    react__WEBPACK_IMPORTED_MODULE_0__.useCallback(() => selector(api.getState()), [api, selector]),
    react__WEBPACK_IMPORTED_MODULE_0__.useCallback(() => selector(api.getInitialState()), [api, selector])
  );
  react__WEBPACK_IMPORTED_MODULE_0__.useDebugValue(slice);
  return slice;
}
const createImpl = (createState) => {
  const api = (0,zustand_vanilla__WEBPACK_IMPORTED_MODULE_1__.createStore)(createState);
  const useBoundStore = (selector) => useStore(api, selector);
  Object.assign(useBoundStore, api);
  return useBoundStore;
};
const create = ((createState) => createState ? createImpl(createState) : createImpl);




/***/ },

/***/ "./node_modules/.pnpm/zustand@5.0.10_@types+react@18.3.27_react@18.3.1_use-sync-external-store@1.6.0_react@18.3.1_/node_modules/zustand/esm/vanilla.mjs"
/*!**************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/zustand@5.0.10_@types+react@18.3.27_react@18.3.1_use-sync-external-store@1.6.0_react@18.3.1_/node_modules/zustand/esm/vanilla.mjs ***!
  \**************************************************************************************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createStore: () => (/* binding */ createStore)
/* harmony export */ });
const createStoreImpl = (createState) => {
  let state;
  const listeners = /* @__PURE__ */ new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const getInitialState = () => initialState;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const api = { setState, getState, getInitialState, subscribe };
  const initialState = state = createState(setState, getState, api);
  return api;
};
const createStore = ((createState) => createState ? createStoreImpl(createState) : createStoreImpl);




/***/ },

/***/ "@wordpress/api-fetch"
/*!**********************************!*\
  !*** external ["wp","apiFetch"] ***!
  \**********************************/
(module) {

module.exports = window["wp"]["apiFetch"];

/***/ },

/***/ "@wordpress/block-editor"
/*!*************************************!*\
  !*** external ["wp","blockEditor"] ***!
  \*************************************/
(module) {

module.exports = window["wp"]["blockEditor"];

/***/ },

/***/ "@wordpress/block-library"
/*!**************************************!*\
  !*** external ["wp","blockLibrary"] ***!
  \**************************************/
(module) {

module.exports = window["wp"]["blockLibrary"];

/***/ },

/***/ "@wordpress/blocks"
/*!********************************!*\
  !*** external ["wp","blocks"] ***!
  \********************************/
(module) {

module.exports = window["wp"]["blocks"];

/***/ },

/***/ "@wordpress/components"
/*!************************************!*\
  !*** external ["wp","components"] ***!
  \************************************/
(module) {

module.exports = window["wp"]["components"];

/***/ },

/***/ "@wordpress/core-data"
/*!**********************************!*\
  !*** external ["wp","coreData"] ***!
  \**********************************/
(module) {

module.exports = window["wp"]["coreData"];

/***/ },

/***/ "@wordpress/data"
/*!******************************!*\
  !*** external ["wp","data"] ***!
  \******************************/
(module) {

module.exports = window["wp"]["data"];

/***/ },

/***/ "@wordpress/element"
/*!*********************************!*\
  !*** external ["wp","element"] ***!
  \*********************************/
(module) {

module.exports = window["wp"]["element"];

/***/ },

/***/ "@wordpress/html-entities"
/*!**************************************!*\
  !*** external ["wp","htmlEntities"] ***!
  \**************************************/
(module) {

module.exports = window["wp"]["htmlEntities"];

/***/ },

/***/ "@wordpress/primitives"
/*!************************************!*\
  !*** external ["wp","primitives"] ***!
  \************************************/
(module) {

module.exports = window["wp"]["primitives"];

/***/ },

/***/ "@wordpress/url"
/*!*****************************!*\
  !*** external ["wp","url"] ***!
  \*****************************/
(module) {

module.exports = window["wp"]["url"];

/***/ },

/***/ "react"
/*!************************!*\
  !*** external "React" ***!
  \************************/
(module) {

module.exports = window["React"];

/***/ },

/***/ "react-dom"
/*!***************************!*\
  !*** external "ReactDOM" ***!
  \***************************/
(module) {

module.exports = window["ReactDOM"];

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get mini-css chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.miniCssF = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return undefined;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		var dataWebpackPrefix = "magick-ad:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
/******/ 		
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (globalThis.importScripts) scriptUrl = globalThis.location + "";
/******/ 		var document = globalThis.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT')
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/^blob:/, "").replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"index": 0
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if(true) { // all chunks have JS
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId, chunkId);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 		
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = globalThis["webpackChunkmagick_ad"] = globalThis["webpackChunkmagick_ad"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!****************************!*\
  !*** ./assets/js/index.js ***!
  \****************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _index_css__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./index.css */ "./assets/js/index.css");
/* harmony import */ var _sections_App__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./sections/App */ "./assets/js/sections/App.js");





_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2___default().use((options, next) => {
  return next({
    ...options,
    headers: {
      ...options.headers,
      'X-WP-Nonce': window.MagickAD?.nonce
    }
  });
});
const container = document.getElementById('magick-ad-app');
if (container) {
  const root = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.createRoot)(container);
  root.render((0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_sections_App__WEBPACK_IMPORTED_MODULE_4__["default"], null));
}
})();

/******/ })()
;
//# sourceMappingURL=index.js.map