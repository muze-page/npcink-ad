import { useMemo, useState } from '@wordpress/element';
import {
    Button,
    Card,
    CardBody,
    FormTokenField,
    Modal,
    Notice,
    Panel,
    PanelBody,
    TextControl,
} from '@wordpress/components';
import { cleanForSlug } from '@wordpress/url';

const buildAdToken = (ad) => {
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
    onNotice,
}) => {
    const [open, setOpen] = useState(false);

    const adTokenMap = useMemo(() => {
        const map = new Map();
        const suggestions = [];
        const idSet = new Set();
        ads.forEach((ad) => {
            if (!ad?.id) {
                return;
            }
            idSet.add(ad.id);
            const token = buildAdToken(ad);
            map.set(ad.id, token);
            suggestions.push(token);
        });
        return { map, suggestions, idSet };
    }, [ads]);

    const slotIdCounts = useMemo(() => {
        const counts = {};
        slots.forEach((slot) => {
            const id = cleanForSlug(slot?.id || '');
            if (!id) {
                return;
            }
            counts[id] = (counts[id] || 0) + 1;
        });
        return counts;
    }, [slots]);

    const parseTokenToId = (token) => {
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
        tokens.forEach((token) => {
            const id = parseTokenToId(token);
            if (id && !ids.includes(id)) {
                ids.push(id);
            }
        });
        onUpdateSlot?.(index, { ad_ids: ids });
    };

    return (
        <>
            <Card>
                <CardBody>
                    <Panel>
                        <PanelBody title="广告位 Slots" initialOpen={false}>
                            <div className="magick-ad-slots-summary">
                                <span>已创建 {slots.length} 个广告位。</span>
                                <Button
                                    variant="secondary"
                                    onClick={() => setOpen(true)}
                                >
                                    管理 Slots
                                </Button>
                            </div>
                            <p className="description">
                                Slot 用于区块/短代码/模板函数调用，广告内容由 Slot
                                绑定决定。
                            </p>
                        </PanelBody>
                    </Panel>
                </CardBody>
            </Card>
            {open && (
                <Modal
                    className="magick-ad-slots-modal"
                    title="Slot 管理"
                    onRequestClose={() => setOpen(false)}
                >
                    <div className="magick-ad-slots-modal__toolbar">
                        <Button
                            variant="primary"
                            onClick={() => {
                                onAddSlot?.();
                            }}
                        >
                            新增 Slot
                        </Button>
                        <Button
                            variant="tertiary"
                            onClick={() => setOpen(false)}
                        >
                            完成
                        </Button>
                    </div>
                    {slots.length === 0 && (
                        <Notice status="info" isDismissible={false}>
                            暂无广告位，可点击“新增 Slot”创建。
                        </Notice>
                    )}
                    <div className="magick-ad-slots-modal__list">
                        {slots.map((slot, index) => {
                            const id = cleanForSlug(slot?.id || '');
                            const hasConflict =
                                id && slotIdCounts[id] > 1;
                            const adTokens = (slot?.ad_ids || []).map(
                                (adId) =>
                                    adTokenMap.map.get(adId) || adId
                            );

                            return (
                                <Card
                                    key={`${slot.id || 'slot'}-${index}`}
                                    className="magick-ad-slot-card"
                                >
                                    <CardBody>
                                        <TextControl
                                            label="Slot ID"
                                            value={slot.id || ''}
                                            onChange={(value) =>
                                                onUpdateSlot?.(index, {
                                                    id: value,
                                                })
                                            }
                                            onBlur={() => {
                                                const normalized = cleanForSlug(
                                                    slot.id || ''
                                                );
                                                if (
                                                    normalized &&
                                                    normalized !== slot.id
                                                ) {
                                                    onUpdateSlot?.(index, {
                                                        id: normalized,
                                                    });
                                                    onNotice?.(
                                                        'info',
                                                        'Slot 已规范化为可用 ID',
                                                        2000
                                                    );
                                                }
                                            }}
                                            help={
                                                hasConflict
                                                    ? '该 Slot 已重复，请修改为唯一值。'
                                                    : '建议使用小写字母、数字与短横线。'
                                            }
                                            className={
                                                hasConflict
                                                    ? 'magick-ad-field-error'
                                                    : ''
                                            }
                                        />
                                        <TextControl
                                            label="显示名称"
                                            value={slot.label || ''}
                                            onChange={(value) =>
                                                onUpdateSlot?.(index, {
                                                    label: value,
                                                })
                                            }
                                        />
                                        <FormTokenField
                                            label="绑定广告"
                                            value={adTokens}
                                            suggestions={adTokenMap.suggestions}
                                            onChange={(tokens) =>
                                                handleTokenChange(
                                                    index,
                                                    tokens
                                                )
                                            }
                                            help="可绑定多个广告，最终展示由优先级/权重决定。"
                                        />
                                        <div className="magick-ad-slot-card__actions">
                                            <Button
                                                isDestructive
                                                variant="tertiary"
                                                onClick={() =>
                                                    onRemoveSlot?.(index)
                                                }
                                            >
                                                删除 Slot
                                            </Button>
                                        </div>
                                    </CardBody>
                                </Card>
                            );
                        })}
                    </div>
                </Modal>
            )}
        </>
    );
};

export default SlotsPanel;
