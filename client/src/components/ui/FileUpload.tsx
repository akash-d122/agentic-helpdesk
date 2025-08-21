import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  File,
  Image,
  X,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

import { cn, formatFileSize } from '@utils/helpers'
import Button from './Button'
import LoadingSpinner from './LoadingSpinner'

interface FileUploadProps {
  onFilesChange?: (files: File[]) => void
  onUpload?: (files: File[]) => Promise<any[]>
  accept?: Record<string, string[]>
  maxFiles?: number
  maxSize?: number
  multiple?: boolean
  disabled?: boolean
  className?: string
  label?: string
  description?: string
  error?: string
  required?: boolean
  showPreview?: boolean
  existingFiles?: UploadedFile[]
  onRemoveFile?: (fileId: string) => void
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
  uploadedAt?: string
  status?: 'uploading' | 'success' | 'error'
  error?: string
}

export default function FileUpload({
  onFilesChange,
  onUpload,
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'application/pdf': ['.pdf'],
    'text/*': ['.txt', '.md'],
  },
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = true,
  disabled = false,
  className,
  label,
  description,
  error,
  required = false,
  showPreview = true,
  existingFiles = [],
  onRemoveFile,
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(existingFiles)
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (disabled) return

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        console.warn('Rejected files:', rejectedFiles)
      }

      // Check total file count
      const totalFiles = uploadedFiles.length + acceptedFiles.length
      if (totalFiles > maxFiles) {
        console.warn(`Maximum ${maxFiles} files allowed`)
        return
      }

      // Notify parent of file changes
      onFilesChange?.(acceptedFiles)

      // If upload handler is provided, upload files
      if (onUpload) {
        setUploading(true)
        
        // Add files to state with uploading status
        const newFiles: UploadedFile[] = acceptedFiles.map((file, index) => ({
          id: `temp-${Date.now()}-${index}`,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'uploading',
        }))
        
        setUploadedFiles(prev => [...prev, ...newFiles])

        try {
          const uploadResults = await onUpload(acceptedFiles)
          
          // Update files with upload results
          setUploadedFiles(prev => 
            prev.map((file, index) => {
              if (file.status === 'uploading') {
                const resultIndex = index - (prev.length - newFiles.length)
                const result = uploadResults[resultIndex]
                
                if (result) {
                  return {
                    ...file,
                    id: result.id || file.id,
                    url: result.url,
                    status: 'success',
                    uploadedAt: result.uploadedAt || new Date().toISOString(),
                  }
                }
              }
              return file
            })
          )
        } catch (uploadError) {
          // Mark files as failed
          setUploadedFiles(prev =>
            prev.map(file =>
              file.status === 'uploading'
                ? { ...file, status: 'error', error: 'Upload failed' }
                : file
            )
          )
        } finally {
          setUploading(false)
        }
      }
    },
    [disabled, uploadedFiles.length, maxFiles, onFilesChange, onUpload]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles - uploadedFiles.length,
    maxSize,
    multiple,
    disabled: disabled || uploading,
  })

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
    onRemoveFile?.(fileId)
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="h-8 w-8 text-primary-500" />
    }
    return <File className="h-8 w-8 text-secondary-500" />
  }

  const canUploadMore = uploadedFiles.length < maxFiles

  return (
    <div className={cn('space-y-4', className)}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}

      {/* Upload Area */}
      {canUploadMore && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            isDragActive && !isDragReject && 'border-primary-400 bg-primary-50',
            isDragReject && 'border-error-400 bg-error-50',
            !isDragActive && 'border-secondary-300 hover:border-secondary-400',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-2">
            <Upload className="h-12 w-12 mx-auto text-secondary-400" />
            
            {isDragActive ? (
              <p className="text-primary-600 font-medium">
                {isDragReject ? 'File type not supported' : 'Drop files here...'}
              </p>
            ) : (
              <div>
                <p className="text-secondary-700 font-medium">
                  Drag & drop files here, or click to select
                </p>
                {description && (
                  <p className="text-sm text-secondary-500 mt-1">{description}</p>
                )}
                <p className="text-xs text-secondary-500 mt-2">
                  Max {maxFiles} files, {formatFileSize(maxSize)} each
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-secondary-700">
            Uploaded Files ({uploadedFiles.length}/{maxFiles})
          </h4>
          
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                onRemove={() => removeFile(file.id)}
                showPreview={showPreview}
              />
            ))}
          </div>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

// File Item Component
interface FileItemProps {
  file: UploadedFile
  onRemove: () => void
  showPreview: boolean
}

function FileItem({ file, onRemove, showPreview }: FileItemProps) {
  const getStatusIcon = () => {
    switch (file.status) {
      case 'uploading':
        return <LoadingSpinner size="sm" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-error-500" />
      default:
        return null
    }
  }

  const isImage = file.type.startsWith('image/')

  return (
    <div className="flex items-center space-x-3 p-3 bg-secondary-50 rounded-lg">
      {/* File Icon/Preview */}
      <div className="flex-shrink-0">
        {showPreview && isImage && file.url ? (
          <img
            src={file.url}
            alt={file.name}
            className="h-12 w-12 object-cover rounded"
          />
        ) : (
          <div className="h-12 w-12 flex items-center justify-center bg-white rounded border">
            {isImage ? (
              <Image className="h-6 w-6 text-primary-500" />
            ) : (
              <File className="h-6 w-6 text-secondary-500" />
            )}
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-secondary-900 truncate">
          {file.name}
        </p>
        <div className="flex items-center space-x-2 text-xs text-secondary-500">
          <span>{formatFileSize(file.size)}</span>
          {file.uploadedAt && (
            <span>• {new Date(file.uploadedAt).toLocaleDateString()}</span>
          )}
        </div>
        {file.error && (
          <p className="text-xs text-error-600 mt-1">{file.error}</p>
        )}
      </div>

      {/* Status and Actions */}
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        
        {file.url && file.status === 'success' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(file.url, '_blank')}
            icon={<Eye className="h-4 w-4" />}
            title="Preview"
          />
        )}
        
        {file.url && file.status === 'success' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const link = document.createElement('a')
              link.href = file.url!
              link.download = file.name
              link.click()
            }}
            icon={<Download className="h-4 w-4" />}
            title="Download"
          />
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          icon={<X className="h-4 w-4" />}
          title="Remove"
        />
      </div>
    </div>
  )
}
