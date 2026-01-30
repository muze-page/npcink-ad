(function (blocks, blockEditor, components, element, data, serverSideRender) {
    if (!blocks || !blockEditor || !components || !element || !data) {
        return;
    }

    var registerBlockType = blocks.registerBlockType;
    var Fragment = element.Fragment;
    var InspectorControls = blockEditor.InspectorControls;
    var TextControl = components.TextControl;
    var PanelBody = components.PanelBody;
    var SelectControl = components.SelectControl;
    var Button = components.Button;
    var ToggleControl = components.ToggleControl;
    var RangeControl = components.RangeControl;
    var useSelect = data.useSelect;
    var ServerSideRender = serverSideRender;

    registerBlockType('magick-ad/ad', {
        edit: function (props) {
            var attributes = props.attributes;
            var setAttributes = props.setAttributes;
            var ads = useSelect(function (select) {
                return select('core').getEntityRecords('postType', 'magick_ad', {
                    per_page: 100,
                    status: ['publish', 'draft', 'future', 'private'],
                    _fields: 'id,title,meta',
                });
            }, []);

            var slotsData =
                (window.MagickADSlots && window.MagickADSlots.slots) || [];
            var slotOptions = [{ label: '请选择广告位', value: '' }];
            var slotMap = {};

            if (slotsData && slotsData.length) {
                slotsData.forEach(function (slotItem) {
                    var slotId = slotItem.id || '';
                    if (!slotId || slotMap[slotId]) {
                        return;
                    }
                    var label = slotItem.label || slotId;
                    slotMap[slotId] =
                        slotItem.ad_ids && slotItem.ad_ids.length > 0;
                    slotOptions.push({
                        label: label + ' · ' + slotId,
                        value: slotId,
                    });
                });
            } else if (ads && ads.length) {
                ads.forEach(function (post) {
                    var title =
                        (post.title &&
                            (post.title.raw || post.title.rendered)) ||
                        '未命名广告';
                    var meta = post.meta || {};
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

            var currentSlot = attributes.slot || '';
            var displayLabel = attributes.label || currentSlot || '未命名广告位';
            var hasConfig = currentSlot && slotMap[currentSlot];
            var previewCard = element.createElement(
                'div',
                {
                    style: {
                        padding: '16px',
                        border: '1px dashed #cbd5e1',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        color: '#475569',
                    },
                },
                element.createElement(
                    'div',
                    { style: { fontWeight: 600, marginBottom: '6px' } },
                    'Magick AD 广告位'
                ),
                element.createElement(
                    'div',
                    { style: { fontSize: '13px' } },
                    'Slot：',
                    currentSlot || '未选择'
                ),
                element.createElement(
                    'div',
                    { style: { fontSize: '12px', color: '#6b7280', marginTop: '8px' } },
                    hasConfig ? '已配置广告内容' : '未配置广告内容'
                ),
                element.createElement(
                    Button,
                    {
                        variant: 'secondary',
                        style: { marginTop: '12px' },
                        onClick: function () {
                            window.location.href = 'admin.php?page=magick-ad';
                        },
                    },
                    '打开 Magick AD 设置'
                )
            );

            var hasSSR = typeof ServerSideRender === 'function';
            var previewNode =
                hasSSR && attributes.preview
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
                    : previewCard;

            return element.createElement(
                Fragment,
                null,
                element.createElement(
                    InspectorControls,
                    null,
                    element.createElement(
                        PanelBody,
                        { title: '广告位设置', initialOpen: true },
                        element.createElement(SelectControl, {
                            label: '选择广告位',
                            value: attributes.slot || '',
                            options: slotOptions,
                            onChange: function (value) {
                                setAttributes({ slot: value || '' });
                            },
                        }),
                        element.createElement(TextControl, {
                            label: '广告位 Slot（可手动输入）',
                            value: attributes.slot || '',
                            onChange: function (value) {
                                setAttributes({ slot: value || '' });
                            },
                            help: '区块只保存 Slot，广告内容在 Magick AD 设置中配置。',
                        }),
                        element.createElement(TextControl, {
                            label: '显示名称（编辑器显示）',
                            value: attributes.label || '',
                            onChange: function (value) {
                                setAttributes({ label: value || '' });
                            },
                        }),
                        element.createElement(RangeControl, {
                            label: '预留高度（减少 CLS）',
                            min: 0,
                            max: 600,
                            value: attributes.reserveHeight || 0,
                            onChange: function (value) {
                                setAttributes({ reserveHeight: Number(value) || 0 });
                            },
                        }),
                        element.createElement(ToggleControl, {
                            label: '启用真实预览',
                            checked: Boolean(attributes.preview),
                            onChange: function (value) {
                                setAttributes({ preview: value });
                            },
                            help: '默认关闭，避免加载第三方广告脚本。',
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
})(
    window.wp.blocks,
    window.wp.blockEditor,
    window.wp.components,
    window.wp.element,
    window.wp.data,
    window.wp.serverSideRender
);
