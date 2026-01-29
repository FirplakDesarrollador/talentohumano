'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    X,
    User,
    Wallet,
    DollarSign,
    Calendar,
    CheckCircle2,
    AlertCircle,
    FileText,
    Upload,
    Loader2,
    ExternalLink,
    Paperclip
} from 'lucide-react'

interface SolicitudDetalleProps {
    solicitud: any
    onClose: () => void
    onUpdate: () => void
}

export const SolicitudDetalle: React.FC<SolicitudDetalleProps> = ({ solicitud, onClose, onUpdate }) => {
    const [isUploading, setIsUploading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [supportPaymentUrl, setSupportPaymentUrl] = useState(solicitud.soporteRetiro || '')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        setIsUploading(true)
        setError(null)
        const file = e.target.files[0]

        try {
            const fileName = `pago_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
            const filePath = `SoportePago/${solicitud.nombre}/${fileName}`

            const { data, error: uploadError } = await supabase.storage
                .from('Cesantias')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('Cesantias')
                .getPublicUrl(filePath)

            setSupportPaymentUrl(publicUrl)
            setSuccess('Soporte de pago subido. No olvides guardar los cambios.')
        } catch (err: any) {
            console.error('Error uploading payment support:', err)
            setError(err.message || 'Error al subir el archivo')
        } finally {
            setIsUploading(false)
        }
    }

    const handleSave = async () => {
        if (!supportPaymentUrl && !solicitud.EntregoSoporteDePago) {
            setError('Debes subir un soporte de pago antes de marcar como entregado.')
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            const { error: updateError } = await (supabase as any)
                .from('cesantias')
                .update({
                    EntregoSoporteDePago: true,
                    soporteRetiro: supportPaymentUrl,
                    aprobacionTHT: 'Aprobado' // Assuming payment means approval in this context
                })
                .eq('id', solicitud.id)

            if (updateError) throw updateError

            setSuccess('Solicitud actualizada correctamente.')
            setTimeout(() => {
                onUpdate()
                onClose()
            }, 1500)
        } catch (err: any) {
            console.error('Error updating record:', err)
            setError(err.message || 'Error al guardar los cambios')
        } finally {
            setIsSaving(false)
        }
    }

    const formatCurrency = (amount: string | number) => {
        const val = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9]/g, '')) : amount
        if (isNaN(val)) return '$0'
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-none">
                <CardHeader className="bg-[#2d4356] text-white sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">Detalle de Cesantías</CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                    {/* Header Info */}
                    <div className="flex items-start justify-between border-b pb-6">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cédula</p>
                            <h3 className="text-2xl font-black text-gray-800">{solicitud.cedula}</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <User className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-semibold text-gray-600">{solicitud.nombre}</span>
                            </div>
                        </div>
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <Wallet className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Info Personal/Contacto */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Correo Electrónico</p>
                                <p className="text-sm font-medium">{solicitud.correo || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Tipo de Cesantías</p>
                                <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-100 italic">
                                    {solicitud.tipoDeCesantias}
                                </div>
                            </div>
                        </div>

                        {/* Info Financiera */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Valor Solicitado</p>
                                <p className="text-xl font-black text-[#2a7b37]">{formatCurrency(solicitud.valor)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Aprobación THT</p>
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${solicitud.aprobacionTHT === 'Aprobado' ? 'bg-green-100 text-green-700' :
                                    solicitud.aprobacionTHT === 'Rechazado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${solicitud.aprobacionTHT === 'Aprobado' ? 'bg-green-600' :
                                        solicitud.aprobacionTHT === 'Rechazado' ? 'bg-red-600' : 'bg-yellow-600'
                                        }`} />
                                    {solicitud.aprobacionTHT}
                                </div>
                            </div>
                        </div>

                        {/* Motivo */}
                        <div className="md:col-span-2 space-y-1 pt-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Motivo del Retiro</p>
                            <p className="text-sm text-gray-700 leading-relaxed font-medium bg-gray-50 p-3 rounded-lg border border-gray-100">
                                {solicitud.motivo}
                            </p>
                        </div>

                        {/* Documentos Soporte */}
                        <div className="md:col-span-2 space-y-3">
                            <div className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-blue-600" />
                                <p className="text-xs font-bold text-gray-600 uppercase">Documentos de Soporte Subidos</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {solicitud.soporte && solicitud.soporte.length > 0 ? (
                                    solicitud.soporte.map((url: string, idx: number) => (
                                        <a
                                            key={idx}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 transition-colors rounded-lg border border-gray-100 group"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                                <span className="text-xs font-semibold text-gray-700 truncate">Soporte #{idx + 1}</span>
                                            </div>
                                            <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-blue-500" />
                                        </a>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-500 italic">No hay documentos adjuntos</p>
                                )}
                            </div>
                        </div>

                        {/* Registro Info */}
                        <div className="md:col-span-1 space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Fecha de Creación</p>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                                <Calendar className="h-4 w-4" />
                                {new Date(solicitud.created).toLocaleString()}
                            </div>
                        </div>

                        <div className="md:col-span-1 space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">¿Entregó Soporte de Pago?</p>
                            <div className="flex items-center gap-2">
                                {solicitud.EntregoSoporteDePago ? (
                                    <div className="flex items-center gap-1.5 text-green-600 font-bold text-sm">
                                        <CheckCircle2 className="h-4 w-4" />
                                        SÍ
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-yellow-600 font-bold text-sm italic">
                                        <AlertCircle className="h-4 w-4" />
                                        PENDIENTE
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Soporte de Pago Upload Section */}
                        <div className="md:col-span-2 border-t pt-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                    Acciones Administrativas
                                </h4>
                            </div>

                            {!solicitud.EntregoSoporteDePago ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500">Sube el comprobante de pago para finalizar esta solicitud.</p>

                                    <div
                                        onClick={() => !isUploading && fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer group ${supportPaymentUrl ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 hover:border-blue-400'
                                            }`}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            disabled={isUploading}
                                        />
                                        {isUploading ? (
                                            <div className="space-y-2">
                                                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
                                                <p className="text-sm font-bold text-blue-600">Subiendo archivo...</p>
                                            </div>
                                        ) : supportPaymentUrl ? (
                                            <div className="space-y-2">
                                                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                                                <p className="text-sm font-bold text-green-800 italic">¡Soporte de pago cargado!</p>
                                                <a href={supportPaymentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ver archivo subido</a>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Upload className="h-8 w-8 text-gray-400 mx-auto group-hover:text-blue-500 transition-colors" />
                                                <p className="text-sm font-bold text-gray-700">Subir soporte de retiro</p>
                                            </div>
                                        )}
                                    </div>

                                    {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
                                    {success && <p className="text-xs text-green-600 font-bold">{success}</p>}

                                    <Button
                                        onClick={handleSave}
                                        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold"
                                        disabled={isSaving || isUploading || !supportPaymentUrl}
                                    >
                                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : 'GUARDAR Y APROBAR'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                            <FileText className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-green-800">Soporte de Pago Entregado</p>
                                            <p className="text-xs text-green-600">Esta solicitud ya está procesada.</p>
                                        </div>
                                    </div>
                                    <a href={solicitud.soporteRetiro} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md text-sm font-bold border border-green-200 text-green-700 hover:bg-green-100 h-9 px-3 transition-colors">
                                        VER COMPROBANTE
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
