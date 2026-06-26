'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, FileText, X, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface EvidenciasComponentProps {
    evidencias: string[]
    onEvidenciasChange: (newEvidencias: string[]) => void
    readOnly?: boolean
    path: string // Storage path prompt
}

export function EvidenciasComponent({ evidencias = [], onEvidenciasChange, readOnly = false, path }: EvidenciasComponentProps) {
    const [uploading, setUploading] = useState(false)
    const [confirmIndex, setConfirmIndex] = useState<number | null>(null)
    const supabase = createClient()

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const file = e.target.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${path}/${fileName}`

        try {
            const { error: uploadError } = await supabase.storage
                .from('hilu')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data } = supabase.storage
                .from('hilu')
                .getPublicUrl(filePath)

            const newEvidencias = [...(evidencias || []), data.publicUrl]
            onEvidenciasChange(newEvidencias)
            alert('Archivo subido correctamente')
        } catch (error: any) {
            console.error('Error uploading file:', error)
            alert(`Error al subir el archivo: ${error?.message || error?.error_description || 'Error desconocido'}`)
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = (index: number) => {
        setConfirmIndex(index)
    }

    const handleConfirmRemove = () => {
        if (confirmIndex === null) return
        const newEvidencias = [...evidencias]
        newEvidencias.splice(confirmIndex, 1)
        onEvidenciasChange(newEvidencias)
        setConfirmIndex(null)
    }

    return (
        <div className="space-y-4">
            <ConfirmDialog
                isOpen={confirmIndex !== null}
                title="Eliminar evidencia"
                description="¿Estás seguro de que deseas quitar este archivo adjunto? Esta acción lo desvinculará de este registro."
                confirmLabel="Sí, eliminar"
                cancelLabel="Cancelar"
                variant="danger"
                onConfirm={handleConfirmRemove}
                onCancel={() => setConfirmIndex(null)}
            />


            <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Evidencias y Adjuntos</Label>
                {!readOnly && (
                    <div className="relative">
                        <Input
                            type="file"
                            className="hidden"
                            id={`file-upload-${path}`}
                            onChange={handleUpload}
                            disabled={uploading}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            disabled={uploading}
                            onClick={() => document.getElementById(`file-upload-${path}`)?.click()}
                        >
                            {uploading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4 mr-2" />
                            )}
                            Subir Archivo
                        </Button>
                    </div>
                )}
            </div>

            {(!evidencias || evidencias.length === 0) && (
                <div className="text-center p-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 text-sm">
                    No hay evidencias adjuntas
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {evidencias?.map((urlItem, index) => {
                    if (!urlItem) return null;
                    const url = typeof urlItem === 'string' ? urlItem : JSON.stringify(urlItem);
                    if (typeof urlItem !== 'string') return null; // Avoid crashing on old invalid objects
                    
                    return (
                        <Card key={index} className="overflow-hidden">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className="h-4 w-4 flex-shrink-0 text-blue-500" />
                                    <span className="text-sm truncate max-w-[150px] sm:max-w-[200px]">
                                        {url.split('/').pop()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-500 hover:text-blue-600"
                                        onClick={() => {
                                            if (url.toLowerCase().endsWith('.xlsx') || url.toLowerCase().endsWith('.xls')) {
                                                window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`, '_blank')
                                            } else {
                                                window.open(url, '_blank')
                                            }
                                        }}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    {!readOnly && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-500 hover:text-red-600"
                                            onClick={() => handleRemove(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
