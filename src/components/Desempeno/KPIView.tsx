'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Target, Loader2, Plus, Calendar as CalendarIcon, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface KPIViewProps {
    cedula: number
    nombre: string
}

interface Indicador {
    id: number
    nombre_indicador: string
    tipo: string
    meta: number
    activo: boolean
}

interface Registro {
    id: number
    empleado_indicador_id: number
    fecha_inicio: string
    fecha_fin: string
    valor_logrado: number
    meta_snapshot: number
    porcentaje_cumplimiento: number
    comentario: string
    created_at?: string
    indicador?: Indicador
}

export function KPIView({ cedula, nombre }: KPIViewProps) {
    const supabase = createClient()
    const [indicadores, setIndicadores] = useState<Indicador[]>([])
    const [registros, setRegistros] = useState<Registro[]>([])
    const [loading, setLoading] = useState(true)

    // Form states
    const [isCreatingIndicador, setIsCreatingIndicador] = useState(false)
    const [selectedIndicadorId, setSelectedIndicadorId] = useState<string>('new')
    
    // New Indicador Form
    const [newIndNombre, setNewIndNombre] = useState('')
    const [newIndTipo, setNewIndTipo] = useState('')
    const [newIndMeta, setNewIndMeta] = useState('')

    // Record Form
    const [recFechaInicio, setRecFechaInicio] = useState('')
    const [recFechaFin, setRecFechaFin] = useState('')
    const [recValor, setRecValor] = useState('')
    const [recMeta, setRecMeta] = useState('')
    const [recComentario, setRecComentario] = useState('')
    const [saving, setSaving] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            // 1. Fetch indicadores
            const { data: indData, error: indError } = await (supabase.from('empleado_indicadores') as any)
                .select('*')
                .eq('cedula_empleado', String(cedula))
            
            if (indError) console.error('Error fetching indicadores:', indError)
            else setIndicadores(indData || [])

            // 2. Fetch records
            if (indData && indData.length > 0) {
                const ids = indData.map((i: any) => i.id)
                const { data: regData, error: regError } = await (supabase.from('empleado_indicador_registros') as any)
                    .select('*')
                    .in('empleado_indicador_id', ids)
                    .order('created_at', { ascending: false })
                
                if (regError) console.error('Error fetching registros:', regError)
                else {
                    // Enrich records with indicator info mapping
                    const enriched = regData.map((r: any) => ({
                        ...r,
                        indicador: indData.find((i: any) => i.id === r.empleado_indicador_id)
                    }))
                    setRegistros(enriched)
                }
            }
        } catch (error) {
            console.error('General error fetching KPI data:', error)
        } finally {
            setLoading(false)
        }
    }, [cedula, supabase])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Update meta input when an indicator is selected
    useEffect(() => {
        if (selectedIndicadorId && selectedIndicadorId !== 'new') {
            const ind = indicadores.find(i => i.id.toString() === selectedIndicadorId)
            if (ind) setRecMeta(ind.meta.toString())
        } else {
            setRecMeta('')
        }
    }, [selectedIndicadorId, indicadores])

    const handleSaveIndicador = async () => {
        if (!newIndNombre || !newIndTipo || !newIndMeta) return alert('Completa todos los campos del indicador')
        
        setSaving(true)
        try {
            const { data, error } = await (supabase.from('empleado_indicadores') as any).insert({
                cedula_empleado: String(cedula),
                nombre_empleado: nombre,
                nombre_indicador: newIndNombre,
                tipo: newIndTipo,
                meta: parseFloat(newIndMeta),
                activo: true
            }).select()

            if (error) throw error
            
            await fetchData()
            setIsCreatingIndicador(false)
            if (data && data[0]) {
                setSelectedIndicadorId(data[0].id.toString())
            }
            // Reset fields
            setNewIndNombre('')
            setNewIndTipo('')
            setNewIndMeta('')
        } catch (error) {
            console.error('Error saving indicador', error)
            alert('Error al guardar el indicador')
        } finally {
            setSaving(false)
        }
    }

    const handleSaveRegistro = async () => {
        if (!selectedIndicadorId || selectedIndicadorId === 'new') return alert('Selecciona un indicador')
        if (!recFechaInicio || !recFechaFin || !recValor || !recMeta) return alert('Completa las fechas, el valor logrado y la meta')

        setSaving(true)
        try {
            const valor = parseFloat(recValor)
            const meta = parseFloat(recMeta)
            const ind = indicadores.find(i => i.id.toString() === selectedIndicadorId)
            
            let porcentaje = 0
            if (ind?.tipo === 'porcentaje') {
                porcentaje = valor // Si es porcentaje, el valor ya es el % (ej: 80%) o se calcula. Asumimos valor directo.
                // Ajuste estándar si se captura como n/META
            }
            porcentaje = meta > 0 ? (valor / meta) * 100 : 0
            
            if (porcentaje > 100) porcentaje = 100

            const { error: errorReg } = await (supabase.from('empleado_indicador_registros') as any).insert({
                empleado_indicador_id: parseInt(selectedIndicadorId),
                fecha_inicio: recFechaInicio,
                fecha_fin: recFechaFin,
                valor_logrado: valor,
                meta_snapshot: meta,
                porcentaje_cumplimiento: porcentaje,
                comentario: recComentario
            })

            if (errorReg) throw errorReg

            await fetchData()
            // Reset record fields
            setRecValor('')
            setRecComentario('')
            setRecFechaInicio('')
            setRecFechaFin('')
        } catch (error) {
            console.error('Error al guardar registro:', error)
            alert('Error al guardar el registro')
        } finally {
            setSaving(false)
        }
    }

    const getStatusColor = (percent: number) => {
        if (percent >= 90) return 'text-green-600'
        if (percent >= 70) return 'text-yellow-500'
        return 'text-red-500'
    }

    const getStatusBgColor = (percent: number) => {
        if (percent >= 90) return 'bg-green-600'
        if (percent >= 70) return 'bg-yellow-500'
        return 'bg-red-500'
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 text-[#2d4356] animate-spin opacity-20" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-3 px-2">
                <div className="bg-[#2d4356] p-2 rounded-xl text-white shadow-sm">
                    <Target className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-[#2d4356]">KPIs y Métricas</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Panel Nuevo Registro */}
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex flex-col gap-6">
                    <div className="flex items-center gap-2 text-xl font-bold text-[#2d4356]">
                        <Plus className="h-6 w-6" /> Nuevo Registro
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Período</label>
                        <div className="flex gap-4">
                            <Input type="date" value={recFechaInicio} onChange={(e) => setRecFechaInicio(e.target.value)} className="rounded-xl flex-1 bg-gray-50/50" />
                            <Input type="date" value={recFechaFin} onChange={(e) => setRecFechaFin(e.target.value)} className="rounded-xl flex-1 bg-gray-50/50" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Indicador</label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Select value={selectedIndicadorId} onValueChange={(val: string) => {
                                    if(val === 'new') setIsCreatingIndicador(true)
                                    else setIsCreatingIndicador(false)
                                    setSelectedIndicadorId(val)
                                }}>
                                    <SelectTrigger className="rounded-xl bg-gray-50/50">
                                        <SelectValue placeholder="Selecciona un indicador..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="new" className="font-semibold text-blue-600">
                                            + Crear un indicador primero
                                        </SelectItem>
                                        {indicadores.map(ind => (
                                            <SelectItem key={ind.id} value={ind.id.toString()}>{ind.nombre_indicador}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button 
                                variant="outline" 
                                className="rounded-xl text-[#2d4356] bg-slate-50 border-slate-200"
                                onClick={() => {
                                    setSelectedIndicadorId('new')
                                    setIsCreatingIndicador(true)
                                }}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Sub-formulario Crear Indicador */}
                    {isCreatingIndicador && (
                        <div className="bg-[#f8f9fa] rounded-2xl p-5 border border-dashed border-gray-300 space-y-4 relative">
                            <p className="text-sm font-bold text-[#2d4356] mb-2">Definir Nuevo Indicador</p>
                            
                            <Select value={newIndTipo} onValueChange={setNewIndTipo}>
                                <SelectTrigger className="rounded-xl bg-white">
                                    <SelectValue placeholder="Tipo de indicador..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="monetario">Monetario ($)</SelectItem>
                                    <SelectItem value="unidad">Unidad (#)</SelectItem>
                                    <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                                </SelectContent>
                            </Select>

                            <Input 
                                placeholder="Ingrese nombre del indicador" 
                                value={newIndNombre} onChange={e => setNewIndNombre(e.target.value)}
                                className="rounded-xl bg-white" 
                            />
                            <Input 
                                type="number" 
                                placeholder="Ingrese meta general" 
                                value={newIndMeta} onChange={e => setNewIndMeta(e.target.value)}
                                className="rounded-xl bg-white" 
                            />
                            
                            <Button 
                                onClick={handleSaveIndicador} 
                                disabled={saving}
                                className="w-full rounded-xl bg-[#2d4356] hover:bg-[#1a2835] text-white"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Guardar nuevo indicador
                            </Button>
                        </div>
                    )}

                    {/* Formulario Registro */}
                    {!isCreatingIndicador && selectedIndicadorId !== 'new' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">Ingresa valor de cumplimiento</label>
                                <Input 
                                    type="number" 
                                    placeholder="Valor logrado en el periodo"
                                    value={recValor} onChange={e => setRecValor(e.target.value)}
                                    className="rounded-xl bg-gray-50/50" 
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">Meta (Snapshot para este periodo)</label>
                                <Input 
                                    type="number" 
                                    value={recMeta} onChange={e => setRecMeta(e.target.value)}
                                    className="rounded-xl bg-gray-50/50" 
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">Observaciones</label>
                                <Textarea 
                                    placeholder="Comentarios adicionales" 
                                    value={recComentario} onChange={e => setRecComentario(e.target.value)}
                                    className="rounded-xl bg-gray-50/50 resize-none" 
                                    rows={3}
                                />
                            </div>

                            <Button 
                                onClick={handleSaveRegistro} 
                                disabled={saving}
                                className="w-full rounded-xl bg-[#2d4356] hover:bg-[#1a2835] text-white py-6"
                            >
                                {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                                Registrar Cumplimiento
                            </Button>
                        </div>
                    )}
                </div>

                {/* Panel Histórico */}
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2 text-xl font-bold text-[#2d4356]">
                            Histórico
                        </div>
                        <div className="bg-blue-50 text-blue-600 rounded-full w-10 h-10 flex items-center justify-center">
                            <Target className="h-5 w-5" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                        {registros.length === 0 ? (
                            <div className="text-center text-gray-400 py-10 uppercase text-sm font-bold tracking-wider">
                                No hay registros históricos
                            </div>
                        ) : (
                            registros.map((reg) => {
                                const percent = Math.round(reg.porcentaje_cumplimiento || 0)
                                const fechaReg = new Date(reg.created_at || reg.fecha_fin)
                                
                                return (
                                    <div key={reg.id} className="relative group p-4 border rounded-2xl border-gray-50 hover:border-gray-100 hover:shadow-sm transition-all bg-slate-50/30">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-[#2d4356]">{reg.indicador?.nombre_indicador || 'Indicador'}</h4>
                                            <span className="text-xs font-medium text-gray-400">
                                                {format(fechaReg, "dd MMM yyyy", { locale: es })}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase rounded-lg tracking-wider">
                                                Registro
                                            </span>
                                            <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                                                <CalendarIcon className="h-3 w-3" />
                                                {reg.fecha_inicio && reg.fecha_fin 
                                                    ? `${format(new Date(reg.fecha_inicio), 'dd/MM/yyyy')} - ${format(new Date(reg.fecha_fin), 'dd/MM/yyyy')}`
                                                    : 'Fechas no definidas'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${getStatusBgColor(percent)} transition-all duration-500`} 
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                            <span className={`text-sm font-black ${getStatusColor(percent)} w-10 text-right`}>
                                                {percent}%
                                            </span>
                                        </div>

                                        {reg.comentario && (
                                            <div className="mt-3 text-xs text-gray-500 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                <span className="font-bold">Nota:</span> {reg.comentario}
                                            </div>
                                        )}
                                        <div className="mt-2 flex justify-between text-[10px] uppercase font-bold text-gray-400 px-1">
                                            <span>Avance: {reg.valor_logrado} {reg.indicador?.tipo === 'monetario' ? '$' : ''}</span>
                                            <span>Meta: {reg.meta_snapshot}</span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
