import React, { useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { lowlight } from 'lowlight'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Type,
  Heading1,
  Heading2,
  Heading3,
} from 'lucide-react'

import { cn } from '@utils/helpers'
import Button from './Button'

interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
  error?: string
  label?: string
  required?: boolean
}

export default function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Start writing...',
  editable = true,
  className,
  error,
  label,
  required = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 underline hover:text-primary-700',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-secondary-100 rounded-lg p-4 font-mono text-sm',
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
          'prose-headings:font-semibold prose-headings:text-secondary-900',
          'prose-p:text-secondary-700 prose-p:leading-relaxed',
          'prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline',
          'prose-strong:text-secondary-900 prose-strong:font-semibold',
          'prose-code:text-primary-600 prose-code:bg-primary-50 prose-code:px-1 prose-code:rounded',
          'prose-pre:bg-secondary-100 prose-pre:border prose-pre:border-secondary-200',
          'prose-blockquote:border-l-primary-500 prose-blockquote:text-secondary-600',
          'prose-ul:text-secondary-700 prose-ol:text-secondary-700',
          'prose-li:text-secondary-700'
        ),
      },
    },
  })

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:')
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const addLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href
    const url = window.prompt('Enter URL:', previousUrl)

    if (url === null) return

    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}

      <div
        className={cn(
          'border border-secondary-300 rounded-lg overflow-hidden bg-white',
          error && 'border-error-300',
          !editable && 'bg-secondary-50'
        )}
      >
        {/* Toolbar */}
        {editable && (
          <div className="border-b border-secondary-200 p-2 flex flex-wrap items-center gap-1">
            {/* Text Formatting */}
            <div className="flex items-center border-r border-secondary-200 pr-2 mr-2">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                icon={<Bold className="h-4 w-4" />}
                tooltip="Bold"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                icon={<Italic className="h-4 w-4" />}
                tooltip="Italic"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                icon={<Strikethrough className="h-4 w-4" />}
                tooltip="Strikethrough"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive('code')}
                icon={<Code className="h-4 w-4" />}
                tooltip="Inline Code"
              />
            </div>

            {/* Headings */}
            <div className="flex items-center border-r border-secondary-200 pr-2 mr-2">
              <ToolbarButton
                onClick={() => editor.chain().focus().setParagraph().run()}
                isActive={editor.isActive('paragraph')}
                icon={<Type className="h-4 w-4" />}
                tooltip="Paragraph"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                icon={<Heading1 className="h-4 w-4" />}
                tooltip="Heading 1"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                icon={<Heading2 className="h-4 w-4" />}
                tooltip="Heading 2"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                icon={<Heading3 className="h-4 w-4" />}
                tooltip="Heading 3"
              />
            </div>

            {/* Lists and Quotes */}
            <div className="flex items-center border-r border-secondary-200 pr-2 mr-2">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                icon={<List className="h-4 w-4" />}
                tooltip="Bullet List"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                icon={<ListOrdered className="h-4 w-4" />}
                tooltip="Numbered List"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                icon={<Quote className="h-4 w-4" />}
                tooltip="Quote"
              />
            </div>

            {/* Media and Links */}
            <div className="flex items-center border-r border-secondary-200 pr-2 mr-2">
              <ToolbarButton
                onClick={addLink}
                isActive={editor.isActive('link')}
                icon={<LinkIcon className="h-4 w-4" />}
                tooltip="Add Link"
              />
              <ToolbarButton
                onClick={addImage}
                icon={<ImageIcon className="h-4 w-4" />}
                tooltip="Add Image"
              />
            </div>

            {/* Undo/Redo */}
            <div className="flex items-center">
              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                icon={<Undo className="h-4 w-4" />}
                tooltip="Undo"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                icon={<Redo className="h-4 w-4" />}
                tooltip="Redo"
              />
            </div>
          </div>
        )}

        {/* Editor Content */}
        <EditorContent
          editor={editor}
          className={cn(
            'min-h-[200px]',
            !editable && 'cursor-default'
          )}
        />

        {/* Placeholder */}
        {editable && editor.isEmpty && (
          <div className="absolute top-[60px] left-4 text-secondary-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

// Toolbar Button Component
interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  icon: React.ReactNode
  tooltip: string
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  icon,
  tooltip,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-1.5 rounded hover:bg-secondary-100 transition-colors',
        isActive && 'bg-primary-100 text-primary-700',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      title={tooltip}
    >
      {icon}
    </button>
  )
}
