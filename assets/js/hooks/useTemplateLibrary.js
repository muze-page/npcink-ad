import { useCallback, useRef, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import {
    BLOCK_TEMPLATES,
    HTML_TEMPLATES,
    IMAGE_TEMPLATES,
    VIDEO_TEMPLATES,
} from '../constants/templates';

const presetsByType = {
    html: HTML_TEMPLATES,
    image: IMAGE_TEMPLATES,
    video: VIDEO_TEMPLATES,
    block: BLOCK_TEMPLATES,
};

const useTemplateLibrary = ({
    selectedAd,
    getCreativeTemplateData,
    onApplyTemplate,
    showNotice,
}) => {
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateType, setTemplateType] = useState('image');
    const [templateLibrary, setTemplateLibrary] = useState([]);
    const [templateSelection, setTemplateSelection] = useState([]);
    const fileInputRef = useRef(null);

    const loadTemplates = useCallback(async (type) => {
        const presets = presetsByType[type] || [];

        try {
            const response = await apiFetch({
                path: `/magick-ad/v1/templates?type=${type}`,
                method: 'GET',
            });
            const userTemplates = Array.isArray(response) ? response : [];
            setTemplateLibrary([
                ...presets,
                ...userTemplates.map((item) => ({
                    ...item,
                    source: 'user',
                })),
            ]);
        } catch (err) {
            setTemplateLibrary(presets);
        }
    }, []);

    const openTemplateLibrary = useCallback(
        async (type) => {
            setTemplateType(type);
            setTemplateSelection([]);
            setTemplateModalOpen(true);
            await loadTemplates(type);
        },
        [loadTemplates]
    );

    const handleSaveTemplate = useCallback(
        async (type) => {
            if (!selectedAd) {
                return;
            }
            const name = window.prompt('请输入模板名称');
            if (!name) {
                return;
            }
            const data = getCreativeTemplateData(type, selectedAd);
            try {
                await apiFetch({
                    path: '/magick-ad/v1/templates',
                    method: 'POST',
                    data: { name, type, data },
                });
                await loadTemplates(type);
                showNotice?.('success', '模板已保存');
            } catch (err) {
                showNotice?.('error', err?.message || '模板保存失败');
            }
        },
        [selectedAd, getCreativeTemplateData, loadTemplates, showNotice]
    );

    const handleApplyTemplate = useCallback(
        (template) => {
            onApplyTemplate?.(template);
            setTemplateModalOpen(false);
        },
        [onApplyTemplate]
    );

    const handleToggleTemplateSelect = useCallback((id) => {
        setTemplateSelection((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        );
    }, []);

    const handleExportTemplates = useCallback(() => {
        const selected = templateLibrary.filter((item) =>
            templateSelection.includes(item.id)
        );
        if (selected.length === 0) {
            return;
        }
        const payload = selected.map((item) => ({
            name: item.name,
            type: item.type,
            data: item.data,
        }));
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: 'application/json',
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

    const handleImportTemplates = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    }, []);

    const handleFileChange = useCallback(
        async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
                return;
            }
            try {
                const text = await file.text();
                const json = JSON.parse(text);
                const templates = Array.isArray(json) ? json : [];
                await apiFetch({
                    path: '/magick-ad/v1/templates/import',
                    method: 'POST',
                    data: { templates },
                });
                await loadTemplates(templateType);
                showNotice?.('success', '模板导入完成');
            } catch (err) {
                showNotice?.('error', err?.message || '模板导入失败');
            }
        },
        [loadTemplates, templateType, showNotice]
    );

    return {
        templateModalOpen,
        templateType,
        templateLibrary,
        templateSelection,
        fileInputRef,
        setTemplateModalOpen,
        openTemplateLibrary,
        handleSaveTemplate,
        handleApplyTemplate,
        handleToggleTemplateSelect,
        handleExportTemplates,
        handleImportTemplates,
        handleFileChange,
    };
};

export default useTemplateLibrary;
