'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save, X, Search, User, Briefcase, Building2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/lib/supabase/types'

type Empleado = Database['public']['Tables']['empleados']['Row']

interface NovedadesFormProps {
    cedulaViene?: string
    onSuccess?: () => void
}

const CONCEPTOS = [
    'AGUINALDO', 'SALUD', 'PÉNSION', 'COMISIONES', 'AUXILIO MONETARIO',
    'INCENTIVO', 'AUXILIO DE RODAMIENTO', 'ALIMENTACIÓN', 'BONIFICACIÓN CANASTA',
    'BONO POR SERVICIO', 'BONO PRODUCTIVIDAD', 'REINTEGRO', 'RETENCIÓN EN LA FUENTE',
    'OTROS DESCUENTOS', 'OTRAS BONIFICACIONES', 'SALARIO', 'AUXILIO VIVIENDA',
    'PRIMA DE SERVICIOS - LEGAL', 'AUXILIO DE FUNERARIA', 'VARIACIÓN DE SALARIO', 'DESCUENTO DE CASINO'
]

const TIPO_CAMBIOS = [
    'INGRESO', 'NOVEDAD', 'RETIRO', 'OTRO'
]

const PERIODICIDADES = [
    'QUINCENAL', 'MENSUAL', 'UNICA VEZ'
]

const PERIODOS = [
    'P1', 'P2', 'AMBOS'
]

const MESES = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
]

export function NovedadesForm({ cedulaViene, onSuccess }: NovedadesFormProps) {
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)
    const [cedulaBusqueda, setCedulaBusqueda] = useState(cedulaViene || '')
    const [empleado, setEmpleado] = useState<Empleado | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [form, setForm] = useState({
        concepto: '',
        tipo_cambio: '',
        actual: '',
        nuevo: '',
        capital: '',
        num_cuotas: '',
        periodicidad: 'UNICA VEZ',
        mes_aplicacion: MESES[new Date().getMonth()],
        periodo: 'P1',
        observacion: ''
    })

    const supabase = createClient()

    useEffect(() => {
        if (cedulaViene) {
            buscarEmpleado(cedulaViene)
        }
    }, [cedulaViene])

    const buscarEmpleado = async (cedula: string) => {
        if (!cedula) return
        setSearching(true)
        try {
            const { data, error } = await supabase
                .from('empleados')
                .select('*')
                .eq('cedula', parseInt(cedula))
                .single()

            if (error) {
                toast.error('Empleado no encontrado')
                setEmpleado(null)
            } else {
                setEmpleado(data)
            }
        } catch (error) {
            console.error('Error buscando empleado:', error)
            toast.error('Error al buscar empleado')
        } finally {
            setSearching(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!empleado) {
            toast.error('Debe seleccionar un empleado')
            return
        }

        if (!form.concepto || !form.tipo_cambio) {
            toast.error('Concepto y Tipo de Cambio son requeridos')
            return
        }

        setIsSubmitting(true)
        try {
            const { error } = await supabase
                .from('novedades_nomina')
                .insert({
                    empleado_id: empleado.cedula,
                    concepto: form.concepto,
                    tipo_cambio: form.tipo_cambio,
                    actual: form.actual || null,
                    nuevo: form.nuevo || null,
                    capital: form.capital ? parseFloat(form.capital) : null,
                    num_cuotas: form.num_cuotas ? parseInt(form.num_cuotas) : null,
                    periodicidad: form.periodicidad,
                    mes_aplicacion: form.mes_aplicacion,
                    periodo: form.periodo,
                    observacion: form.observacion || null
                })

            if (error) throw error

            toast.success('Novedad registrada exitosamente')
            setForm({
                concepto: '',
                tipo_cambio: '',
                actual: '',
                nuevo: '',
                capital: '',
                num_cuotas: '',
                periodicidad: 'UNICA VEZ',
                mes_aplicacion: MESES[new Date().getMonth()],
                periodo: 'P1',
                observacion: ''
            })
            if (onSuccess) onSuccess()
        } catch (error: any) {
            console.error('Error guardando novedad:', error)
            toast.error(`Error: ${error.message || 'No se pudo guardar la novedad'}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: value }))
    }

    return (
        <Card className="w-full max-w-4xl mx-auto shadow-xl border-t-4 border-t-[#1e2f3d]">
            <CardHeader className="bg-gray-50/50">
                <CardTitle className="text-xl font-bold text-[#1e2f3d] flex items-center gap-2">
                    <Newspaper className="h-6 w-6 text-blue-600" />
                    Registro de Novedad de Nómina
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                {/* Búsqueda de Empleado */}
                <div className="space-y-4">
                    <Label htmlFor="cedulaBusqueda" className="text-sm font-bold text-gray-700">Buscar Empleado por Cédula</Label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                id="cedulaBusqueda"
                                type="number"
                                placeholder="Ingrese la cédula..."
                                value={cedulaBusqueda}
                                onChange={(e) => setCedulaBusqueda(e.target.value)}
                                className="pl-10 h-11"
                                onKeyDown={(e) => e.key === 'Enter' && buscarEmpleado(cedulaBusqueda)}
                            />
                            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        </div>
                        <Button
                            onClick={() => buscarEmpleado(cedulaBusqueda)}
                            disabled={searching}
                            className="h-11 bg-[#1e2f3d] hover:bg-[#2d4356]"
                        >
                            {searching ? <Loader2 className="animate-spin h-5 w-5" /> : 'Buscar'}
                        </Button>
                    </div>

                    {empleado && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <User className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Nombre</span>
                                    <span className="text-sm font-bold text-blue-900">{empleado.nombreCompleto}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Briefcase className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Cargo</span>
                                    <span className="text-sm font-bold text-blue-900">{empleado.cargo || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Planta</span>
                                    <span className="text-sm font-bold text-blue-900">{empleado.planta || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="concepto" className="text-sm font-bold text-gray-700">Concepto <span className="text-red-500">*</span></Label>
                            <select
                                id="concepto"
                                name="concepto"
                                value={form.concepto}
                                onChange={handleChange}
                                className="flex h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                required
                            >
                                <option value="">Seleccione un concepto...</option>
                                {CONCEPTOS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tipo_cambio" className="text-sm font-bold text-gray-700">Tipo de Cambio <span className="text-red-500">*</span></Label>
                            <select
                                id="tipo_cambio"
                                name="tipo_cambio"
                                value={form.tipo_cambio}
                                onChange={handleChange}
                                className="flex h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                required
                            >
                                <option value="">Seleccione tipo...</option>
                                {TIPO_CAMBIOS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="actual" className="text-sm font-bold text-gray-700">Actual (Opcional)</Label>
                            <Input
                                id="actual"
                                name="actual"
                                value={form.actual}
                                onChange={handleChange}
                                placeholder="Valor actual..."
                                className="h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="nuevo" className="text-sm font-bold text-gray-700">Nuevo (Opcional)</Label>
                            <Input
                                id="nuevo"
                                name="nuevo"
                                value={form.nuevo}
                                onChange={handleChange}
                                placeholder="Valor nuevo..."
                                className="h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="capital" className="text-sm font-bold text-gray-700">Capital (Opcional)</Label>
                            <Input
                                id="capital"
                                name="capital"
                                type="number"
                                value={form.capital}
                                onChange={handleChange}
                                placeholder="0"
                                className="h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="num_cuotas" className="text-sm font-bold text-gray-700">N° de Cuotas (Opcional)</Label>
                            <Input
                                id="num_cuotas"
                                name="num_cuotas"
                                type="number"
                                value={form.num_cuotas}
                                onChange={handleChange}
                                placeholder="1"
                                className="h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="periodicidad" className="text-sm font-bold text-gray-700">Periodicidad</Label>
                            <select
                                id="periodicidad"
                                name="periodicidad"
                                value={form.periodicidad}
                                onChange={handleChange}
                                className="flex h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                {PERIODICIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="mes_aplicacion" className="text-sm font-bold text-gray-700">Mes Aplicación</Label>
                                <select
                                    id="mes_aplicacion"
                                    name="mes_aplicacion"
                                    value={form.mes_aplicacion}
                                    onChange={handleChange}
                                    className="flex h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="periodo" className="text-sm font-bold text-gray-700">Periodo</Label>
                                <select
                                    id="periodo"
                                    name="periodo"
                                    value={form.periodo}
                                    onChange={handleChange}
                                    className="flex h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="observacion" className="text-sm font-bold text-gray-700">Observación</Label>
                        <Textarea
                            id="observacion"
                            name="observacion"
                            value={form.observacion}
                            onChange={handleChange}
                            placeholder="Detalles adicionales..."
                            rows={3}
                            className="resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setForm({
                                    concepto: '',
                                    tipo_cambio: '',
                                    actual: '',
                                    nuevo: '',
                                    capital: '',
                                    num_cuotas: '',
                                    periodicidad: 'UNICA VEZ',
                                    mes_aplicacion: MESES[new Date().getMonth()],
                                    periodo: 'P1',
                                    observacion: ''
                                })
                                setEmpleado(null)
                                setCedulaBusqueda('')
                            }}
                            className="h-11 px-8 rounded-lg"
                        >
                            Limpiar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !empleado}
                            className="h-11 px-8 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Guardar Novedad
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

import { Newspaper } from 'lucide-react'
