import React, { memo, useEffect, useRef } from 'react';
import EditorJS from '@editorjs/editorjs';
import { EDITOR_JS_TOOLS } from '../Tool/component';

interface EditorProps {
    data: EditorJS.OutputData;
    onChange: (data: EditorJS.OutputData) => void;
    editorBlock: string;
}

const Editor: React.FC<EditorProps> = ({ data, onChange, editorBlock }) => {
    const ref = useRef<EditorJS | null>(null);

    useEffect(() => {
        if (!ref.current) {
            const editor = new EditorJS({
                holder: editorBlock,
                data: data,
                tools: EDITOR_JS_TOOLS,
                async onChange(api) {
                    const data = await api.saver.save();
                    onChange(data);
                },
            });
            ref.current = editor;
        }

        return () => {
            if (ref.current && ref.current.destroy) {
                ref.current.destroy();
            }
        };
    }, [data, onChange, editorBlock]);

    return <div id={editorBlock} />;
};

export default memo(Editor);