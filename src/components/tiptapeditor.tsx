import './tiptap.css'

import { Color } from '@tiptap/extension-color'
import ListItem from '@tiptap/extension-list-item'
import TextStyle from '@tiptap/extension-text-style'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import { EditorProvider, useCurrentEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React from 'react'

const extensions = [
    Table,
    TableRow,
    TableHeader,
    TableCell,
    Color.configure({ types: [TextStyle.name, ListItem.name] }),
    TextStyle,
    StarterKit.configure({
        bulletList: {
            keepMarks: true,
            keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
        },
        orderedList: {
            keepMarks: true,
            keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
        },
    }),
]

interface TipTapEditorProps {
    content: string;
    onUpdate?: (content: { editor: any }) => void;
}

export default function TipTapEditor({ content, onUpdate }: TipTapEditorProps) {
    return (
        <EditorProvider
            extensions={extensions}
            content={content}
            onUpdate={onUpdate}
        >
        </EditorProvider>
    )
}