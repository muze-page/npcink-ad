(function (blocks, blockEditor, components, element, data, serverSideRender) {
    if (!blocks || !blockEditor || !components || !element || !data) {
        return;
    }

    var registerBlockType = blocks.registerBlockType;
    var registerBlockVariation = blocks.registerBlockVariation;
    var Fragment = element.Fragment;
    var InspectorControls = blockEditor.InspectorControls;
    var MediaUpload = blockEditor.MediaUpload;
    var MediaUploadCheck = blockEditor.MediaUploadCheck;
    var TextareaControl = components.TextareaControl;
    var TextControl = components.TextControl;
    var PanelBody = components.PanelBody;
    var SelectControl = components.SelectControl;
    var Button = components.Button;
    var useSelect = data.useSelect;
    var ServerSideRender = serverSideRender;

    registerBlockType('magick-ad/ad', {
        edit: function (props) {
            var attributes = props.attributes;
            var setAttributes = props.setAttributes;
            var creativeType = attributes.creativeType || 'html';
            var sourceMode = attributes.slot
                ? 'slot'
                : attributes.adId
                ? 'adId'
                : 'manual';

            var ads = useSelect(function (select) {
                return select('core').getEntityRecords('postType', 'magick_ad', {
                    per_page: 100,
                    status: ['publish', 'draft', 'future', 'private'],
                    _fields: 'id,title,meta',
                });
            }, []);

            var adOptions = [{ label: '请选择广告', value: '' }];
            var slotOptions = [{ label: '请选择广告位', value: '' }];
            var slotMap = {};
            if (ads && ads.length) {
                ads.forEach(function (post) {
                    var title =
                        (post.title &&
                            (post.title.raw || post.title.rendered)) ||
                        '未命名广告';
                    var meta = post.meta || {};
                    var adId =
                        meta._magick_ad_id ||
                        (post.id ? 'ad_' + post.id : '');
                    if (adId) {
                        adOptions.push({
                            label: title + ' · ' + adId,
                            value: adId,
                        });
                    }

                    var dataMeta = meta._magick_ad_data || {};
                    var options = dataMeta.options || {};
                    var slot = options.slot || '';
                    if (slot && !slotMap[slot]) {
                        slotMap[slot] = true;
                        slotOptions.push({
                            label: title + ' · ' + slot,
                            value: slot,
                        });
                    }
                });
            }

            var onSelectImage = function (media) {
                if (!media || !media.url) {
                    return;
                }
                setAttributes({
                    imageId: media.id || 0,
                    imageUrl: media.url,
                    imageAlt: media.alt || media.title || '',
                });
            };

            var preview = null;
            if (sourceMode !== 'manual') {
                var label =
                    sourceMode === 'slot'
                        ? attributes.slot
                            ? '将渲染广告位：' + attributes.slot
                            : '请选择广告位'
                        : attributes.adId
                        ? '将渲染广告 ID：' + attributes.adId
                        : '请选择广告';
                preview = element.createElement(
                    'div',
                    {
                        style: {
                            padding: '16px',
                            border: '1px dashed #cbd5e1',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            color: '#475569',
                        },
                    },
                    label
                );
            } else if (creativeType === 'html' && attributes.html) {
                preview = element.createElement('div', {
                    dangerouslySetInnerHTML: { __html: attributes.html },
                });
            } else if (creativeType === 'image' && attributes.imageUrl) {
                preview = element.createElement('img', {
                    src: attributes.imageUrl,
                    alt: attributes.imageAlt || '',
                    style: { maxWidth: '100%' },
                });
            } else if (creativeType === 'video' && attributes.videoUrl) {
                preview = element.createElement('video', {
                    controls: true,
                    src: attributes.videoUrl,
                    style: { maxWidth: '100%' },
                });
            }
            var hasSSR = typeof ServerSideRender === 'function';
            var previewNode = hasSSR
                ? element.createElement(ServerSideRender, {
                      block: 'magick-ad/ad',
                      attributes: attributes,
                      LoadingResponsePlaceholder: function () {
                          return element.createElement(
                              'div',
                              {
                                  style: {
                                      padding: '16px',
                                      border: '1px dashed #cbd5e1',
                                      background: '#f8fafc',
                                      borderRadius: '8px',
                                      color: '#64748b',
                                  },
                              },
                              '正在加载预览...'
                          );
                      },
                      EmptyResponsePlaceholder: function () {
                          return element.createElement(
                              'div',
                              {
                                  style: {
                                      padding: '16px',
                                      border: '1px dashed #cbd5e1',
                                      background: '#f8fafc',
                                      borderRadius: '8px',
                                      color: '#64748b',
                                  },
                              },
                              '暂无可预览内容'
                          );
                      },
                  })
                : preview ||
                  element.createElement(
                      'div',
                      { style: { color: '#6b7280' } },
                      '请选择内容类型并填写内容。'
                  );

            return element.createElement(
                Fragment,
                null,
                element.createElement(
                    InspectorControls,
                    null,
                    element.createElement(
                        PanelBody,
                        { title: '广告引用', initialOpen: true },
                        element.createElement(SelectControl, {
                            label: '选择方式',
                            value: sourceMode,
                            options: [
                                { label: '使用区块内容', value: 'manual' },
                                { label: '按广告 ID', value: 'adId' },
                                { label: '按广告位 Slot', value: 'slot' },
                            ],
                            onChange: function (value) {
                                if (value === 'manual') {
                                    setAttributes({ adId: '', slot: '' });
                                } else if (value === 'adId') {
                                    setAttributes({ slot: '' });
                                } else {
                                    setAttributes({ adId: '' });
                                }
                            },
                        }),
                        sourceMode === 'adId' &&
                            element.createElement(SelectControl, {
                                label: '选择广告',
                                value: attributes.adId || '',
                                options: adOptions,
                                onChange: function (value) {
                                    setAttributes({ adId: value || '', slot: '' });
                                },
                                help: '选择后，区块内容将被忽略。',
                            }),
                        sourceMode === 'adId' &&
                            element.createElement(TextControl, {
                                label: '广告 ID（可选手动输入）',
                                value: attributes.adId || '',
                                onChange: function (value) {
                                    setAttributes({ adId: value || '', slot: '' });
                                },
                            }),
                        sourceMode === 'slot' &&
                            element.createElement(SelectControl, {
                                label: '选择广告位',
                                value: attributes.slot || '',
                                options: slotOptions,
                                onChange: function (value) {
                                    setAttributes({ slot: value || '', adId: '' });
                                },
                                help: '选择后，区块内容将被忽略。',
                            }),
                        sourceMode === 'slot' &&
                            element.createElement(TextControl, {
                                label: '广告位 Slot（可选手动输入）',
                                value: attributes.slot || '',
                                onChange: function (value) {
                                    setAttributes({ slot: value || '', adId: '' });
                                },
                            })
                    ),
                    element.createElement(
                        PanelBody,
                        { title: '广告素材', initialOpen: true },
                        sourceMode !== 'manual' &&
                            element.createElement(
                                'div',
                                {
                                    style: {
                                        fontSize: '12px',
                                        color: '#64748b',
                                        marginBottom: '12px',
                                    },
                                },
                                '当前模式使用已配置的广告，以下内容将不会生效。'
                            ),
                        element.createElement(SelectControl, {
                            label: '内容类型',
                            value: creativeType,
                            options: [
                                { label: 'HTML/代码', value: 'html' },
                                { label: '图片', value: 'image' },
                                { label: '视频', value: 'video' },
                                { label: '可视化设计', value: 'block' },
                            ],
                            onChange: function (value) {
                                setAttributes({ creativeType: value });
                            },
                        }),
                        sourceMode === 'manual' &&
                            creativeType === 'html' &&
                            element.createElement(TextareaControl, {
                                label: 'HTML 内容',
                                value: attributes.html || '',
                                onChange: function (value) {
                                    setAttributes({ html: value });
                                },
                                rows: 6,
                            }),
                        sourceMode === 'manual' &&
                            creativeType === 'image' &&
                            element.createElement(
                                Fragment,
                                null,
                                element.createElement(
                                    MediaUploadCheck,
                                    null,
                                    element.createElement(MediaUpload, {
                                        onSelect: onSelectImage,
                                        allowedTypes: ['image'],
                                        value: attributes.imageId,
                                        render: function (mediaProps) {
                                            return element.createElement(
                                                Button,
                                                {
                                                    onClick: mediaProps.open,
                                                    variant: 'secondary',
                                                },
                                                attributes.imageUrl
                                                    ? '更换图片'
                                                    : '选择图片'
                                            );
                                        },
                                    })
                                ),
                                element.createElement(TextControl, {
                                    label: '跳转链接',
                                    value: attributes.link || '',
                                    onChange: function (value) {
                                        setAttributes({ link: value });
                                    },
                                })
                            ),
                        sourceMode === 'manual' &&
                            creativeType === 'video' &&
                            element.createElement(TextControl, {
                                label: '视频地址',
                                value: attributes.videoUrl || '',
                                onChange: function (value) {
                                    setAttributes({ videoUrl: value });
                                },
                            }),
                        sourceMode === 'manual' &&
                            creativeType === 'block' &&
                            element.createElement(TextareaControl, {
                                label: '区块内容（序列化）',
                                help: '这里存放 Gutenberg 序列化内容，用于模板化渲染。',
                                value: attributes.blocks || '',
                                onChange: function (value) {
                                    setAttributes({ blocks: value });
                                },
                                rows: 6,
                            })
                    )
                ),
                element.createElement(
                    'div',
                    { className: 'magick-ad-block-preview' },
                    previewNode
                )
            );
        },
        save: function () {
            return null;
        },
    });

    if (registerBlockVariation) {
        registerBlockVariation('magick-ad/ad', [
            {
                name: 'adsense-responsive',
                title: 'AdSense 响应式',
                description: '预置 adsbygoogle 响应式结构',
                attributes: {
                    creativeType: 'html',
                    html: '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXXXX" data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true"></ins>',
                },
            },
            {
                name: 'image-banner',
                title: '横幅图片',
                description: '适用于文章内横幅',
                attributes: {
                    creativeType: 'image',
                    imageUrl: 'https://via.placeholder.com/1200x240?text=Banner',
                    imageAlt: 'Banner',
                },
            },
            {
                name: 'video-inline',
                title: '内嵌视频',
                description: '贴合正文的视频广告',
                attributes: {
                    creativeType: 'video',
                    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
                },
            },
        ]);
    }
})(
    window.wp.blocks,
    window.wp.blockEditor,
    window.wp.components,
    window.wp.element,
    window.wp.data,
    window.wp.serverSideRender
);
