(function (blocks, blockEditor, components, element) {
    if (!blocks || !blockEditor || !components || !element) {
        return;
    }

    var registerBlockType = blocks.registerBlockType;
    var Fragment = element.Fragment;
    var InspectorControls = blockEditor.InspectorControls;
    var MediaUpload = blockEditor.MediaUpload;
    var MediaUploadCheck = blockEditor.MediaUploadCheck;
    var TextareaControl = components.TextareaControl;
    var TextControl = components.TextControl;
    var PanelBody = components.PanelBody;
    var SelectControl = components.SelectControl;
    var Button = components.Button;

    registerBlockType('magick-ad/ad', {
        edit: function (props) {
            var attributes = props.attributes;
            var setAttributes = props.setAttributes;
            var creativeType = attributes.creativeType || 'html';

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
            if (creativeType === 'html' && attributes.html) {
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

            return element.createElement(
                Fragment,
                null,
                element.createElement(
                    InspectorControls,
                    null,
                    element.createElement(
                        PanelBody,
                        { title: '广告素材', initialOpen: true },
                        element.createElement(SelectControl, {
                            label: '内容类型',
                            value: creativeType,
                            options: [
                                { label: 'HTML/代码', value: 'html' },
                                { label: '图片', value: 'image' },
                                { label: '视频', value: 'video' },
                            ],
                            onChange: function (value) {
                                setAttributes({ creativeType: value });
                            },
                        }),
                        creativeType === 'html' &&
                            element.createElement(TextareaControl, {
                                label: 'HTML 内容',
                                value: attributes.html || '',
                                onChange: function (value) {
                                    setAttributes({ html: value });
                                },
                                rows: 6,
                            }),
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
                        creativeType === 'video' &&
                            element.createElement(TextControl, {
                                label: '视频地址',
                                value: attributes.videoUrl || '',
                                onChange: function (value) {
                                    setAttributes({ videoUrl: value });
                                },
                            })
                    )
                ),
                element.createElement(
                    'div',
                    { className: 'magick-ad-block-preview' },
                    preview ||
                        element.createElement(
                            'div',
                            { style: { color: '#6b7280' } },
                            '请选择内容类型并填写内容。'
                        )
                )
            );
        },
        save: function () {
            return null;
        },
    });
})(window.wp.blocks, window.wp.blockEditor, window.wp.components, window.wp.element);
