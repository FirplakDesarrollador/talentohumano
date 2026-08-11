'use client'

import { useState } from 'react'
import { parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    X,
    User,
    Umbrella,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Clock,
    UserCheck,
    MapPin,
    Briefcase,
    Building2,
    Wallet
} from 'lucide-react'

interface VacacionesDetalleProps {
    solicitud: any
    isAdmin: boolean
    onClose: () => void
    onUpdate: () => void
}

export const VacacionesDetalle: React.FC<VacacionesDetalleProps> = ({ solicitud, isAdmin, onClose, onUpdate }) => {
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const supabase = createClient()

    const handleUpdateStatus = async (newStatus: 'Aprobado' | 'Rechazado') => {
        setIsSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const { error: updateError } = await (supabase as any)
                .from('Vacaciones')
                .update({
                    Aprobacion_Jefe: newStatus
                })
                .eq('id', solicitud.id)

            if (updateError) throw updateError

            // Al aprobar, registra de una vez el ausentismo correspondiente (motivo
            // Vacaciones) para que el periodo quede reflejado en el módulo de
            // Ausentismos sin doble digitación. No bloquea la aprobación si esto falla.
            let ausentismoWarning = false
            if (newStatus === 'Aprobado') {
                try {
                    const { data: userData } = await supabase.auth.getUser()

                    const { error: ausentismoError } = await (supabase as any)
                        .from('ausentismos')
                        .insert({
                            'Título': solicitud.Cedula,
                            'Nombre Completo': solicitud.Empleado_Que_Disfruta,
                            'Motivo Ausentismo': 'Vacaciones',
                            'FechaInicio': solicitud.FechaInicial,
                            'FechaFinal': solicitud.FechaFinal,
                            'Observaciones': 'Generado automáticamente al aprobar una solicitud de vacaciones',
                            'Planta': solicitud.Departamento || '',
                            'Jefe': solicitud['Nombre del Jefe'] || '',
                            'Contrato': solicitud.Empresa || '',
                            'Cargo': solicitud.Cargo || '',
                            'Descontar nomina': false,
                            'Creado por': userData.user?.email || 'Sistema',
                            'Creado': new Date().toISOString()
                        })

                    if (ausentismoError) throw ausentismoError
                } catch (ausentismoErr: any) {
                    console.error('Error creating linked ausentismo:', ausentismoErr)
                    ausentismoWarning = true
                }
            }

            setSuccess(
                ausentismoWarning
                    ? 'Solicitud aprobada, pero no se pudo registrar el ausentismo automáticamente.'
                    : `Solicitud ${newStatus.toLowerCase()} correctamente.`
            )
            setTimeout(() => {
                onUpdate()
                onClose()
            }, 1500)
        } catch (err: any) {
            console.error('Error updating vacation status:', err)
            setError(err.message || 'Error al actualizar la solicitud')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-none bg-white rounded-3xl">
                <CardHeader className="bg-[#2d4356] text-white sticky top-0 z-10 p-6">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Detalle de Vacaciones</CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 rounded-full">
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    {/* Header Info */}
                    <div className="flex items-start justify-between border-b pb-6">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cédula</p>
                            <h3 className="text-3xl font-black text-gray-800 tracking-tighter">{solicitud.Cedula}</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <User className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-bold text-gray-600">{solicitud.Empleado_Que_Disfruta}</span>
                            </div>
                        </div>
                        <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center border border-blue-100 rotate-3">
                            <Umbrella className="h-10 w-10 text-blue-600 -rotate-3" />
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Info General */}
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargo</p>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <Briefcase className="h-4 w-4 text-gray-400" />
                                    {solicitud.Cargo || 'N/A'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Empresa</p>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <Building2 className="h-4 w-4 text-gray-400" />
                                    {solicitud.Empresa || 'N/A'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Departamento / Planta</p>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    {solicitud.Departamento || 'N/A'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jefe Inmediato</p>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <UserCheck className="h-4 w-4 text-gray-400" />
                                    {solicitud['Nombre del Jefe'] || 'N/A'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Persona Encargada</p>
                                <div className="text-sm font-bold text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
                                    {solicitud.PersonaEncargada || 'No especificado'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Pago</p>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <Wallet className="h-4 w-4 text-gray-400" />
                                    {solicitud.TipoDePAgo || 'N/A'}
                                </div>
                            </div>
                        </div>

                        {/* Info Días */}
                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-6">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumen de Días</h4>
                            <div className="flex justify-around items-center">
                                <div className="text-center">
                                    <p className="text-3xl font-black text-blue-600 leading-none">{solicitud.DiasEnTiempo}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase mt-1">Tiempo</p>
                                </div>
                                <div className="w-[1px] h-10 bg-gray-200" />
                                <div className="text-center">
                                    <p className="text-3xl font-black text-green-600 leading-none">{solicitud.DiasEnDinero}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase mt-1">Dinero</p>
                                </div>
                            </div>
                        </div>

                        {/* Periodo y Fechas */}
                        <div className="md:col-span-2 bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 space-y-4">
                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Periodo de Disfrute</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-gray-400 uppercase">Fecha Salida</p>
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                        <Calendar className="h-4 w-4 text-blue-500" />
                                        {solicitud.FechaInicial ? parseISO(solicitud.FechaInicial).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-gray-400 uppercase">Fecha Fin</p>
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                        <Calendar className="h-4 w-4 text-red-500" />
                                        {solicitud.FechaFinal ? parseISO(solicitud.FechaFinal).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-gray-400 uppercase">Fecha Regreso</p>
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                        <Clock className="h-4 w-4 text-green-500" />
                                        {solicitud.FechaIngreso ? parseISO(solicitud.FechaIngreso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Estado */}
                        <div className="md:col-span-2 space-y-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado de la Solicitud</p>
                                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase ${solicitud.Aprobacion_Jefe === 'Aprobado' ? 'bg-green-100 text-green-700' :
                                        solicitud.Aprobacion_Jefe === 'Rechazado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        <span className={`w-2 h-2 rounded-full ${solicitud.Aprobacion_Jefe === 'Aprobado' ? 'bg-green-600' :
                                            solicitud.Aprobacion_Jefe === 'Rechazado' ? 'bg-red-600' : 'bg-yellow-600'
                                            } animate-pulse`} />
                                        {solicitud.Aprobacion_Jefe || 'Pendiente'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha de Solicitud</p>
                                    <p className="text-xs font-bold text-gray-500 italic">
                                        {solicitud['Fecha Solicitud'] ? new Date(solicitud['Fecha Solicitud']).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Actions if Pending — solo administradores pueden aprobar/rechazar */}
                            {isAdmin && solicitud.Aprobacion_Jefe === 'Pendiente' && (
                                <div className="flex gap-4 pt-4">
                                    <Button
                                        onClick={() => handleUpdateStatus('Rechazado')}
                                        variant="outline"
                                        disabled={isSaving}
                                        className="flex-1 h-12 border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 font-bold"
                                    >
                                        RECHAZAR
                                    </Button>
                                    <Button
                                        onClick={() => handleUpdateStatus('Aprobado')}
                                        disabled={isSaving}
                                        className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-200"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" /> : 'APROBAR SOLICITUD'}
                                    </Button>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-4 rounded-2xl border border-green-100">
                                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                                    {success}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="text-[10px] text-gray-300 text-center font-bold tracking-widest uppercase">
                        Creado por: {solicitud['Creado por'] || 'N/A'}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
