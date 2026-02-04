'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft, Download, Search, Filter, Eraser, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { limpiarTexto } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'

type NovedadConEmpleado = Database['public']['Tables']['novedades_nomina']['Row'] & {
    empleados: {
        nombreCompleto: string
        empresa: string | null
    }
}

const MESES = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
]

export default function ReporteNovedadesPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [novedades, setNovedades] = useState<NovedadConEmpleado[]>([])
    const [busqueda, setBusqueda] = useState('')
    const [mesFiltro, setMesFiltro] = useState('all')

    const supabase = createClient()

    const fetchNovedades = useCallback(async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('novedades_nomina')
                .select('*, empleados(nombreCompleto, empresa)')
                .order('created_at', { ascending: false })

            if (mesFiltro !== 'all') {
                query = query.eq('mes_aplicacion', mesFiltro)
            }

            const { data, error } = await query

            if (error) throw error

            let filteredData = data as NovedadConEmpleado[]

            if (busqueda) {
                const searchLower = busqueda.toLowerCase()
                filteredData = filteredData.filter(n =>
                    n.empleados?.nombreCompleto.toLowerCase().includes(searchLower) ||
                    n.empleado_id.toString().includes(searchLower) ||
                    n.concepto.toLowerCase().includes(searchLower)
                )
            }

            setNovedades(filteredData)
        } catch (error) {
            console.error('Error fetching novedades:', error)
            toast.error('Error al cargar reporte')
        } finally {
            setLoading(false)
        }
    }, [busqueda, mesFiltro, supabase])

    useEffect(() => {
        fetchNovedades()
    }, [fetchNovedades])

    const exportToCSV = () => {
        if (novedades.length === 0) {
            toast.error('No hay datos para exportar')
            return
        }

        const separador = ';'
        const headers = [
            'FECHA', 'EMPRESA', 'CEDULA', 'NOMBRE', 'CONCEPTO', 'TIPO CAMBIO',
            'ACTUAL', 'NUEVO', 'CAPITAL', 'NUMERO DE CUOTAS', 'PERIODICIDAD',
            'MES APLICACION', 'PERIODO', 'OBSERVACIONES'
        ]

        const csvRows = [headers.join(separador)]

        novedades.forEach(n => {
            const fecha = new Date(n.created_at).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).replace(/\//g, '-')

            const row = [
                fecha,
                limpiarTexto(n.empleados?.empresa || 'FIRPLAK S.A.S'),
                n.empleado_id,
                limpiarTexto(n.empleados?.nombreCompleto || 'N/A'),
                limpiarTexto(n.concepto),
                limpiarTexto(n.tipo_cambio),
                limpiarTexto(n.actual || ''),
                limpiarTexto(n.nuevo || ''),
                n.capital || 0,
                n.num_cuotas || 0,
                limpiarTexto(n.periodicidad),
                limpiarTexto(n.mes_aplicacion),
                limpiarTexto(n.periodo),
                limpiarTexto(n.observacion || '')
            ]
            csvRows.push(row.join(separador))
        })

        const csvContent = csvRows.join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `NovedadesNomina_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="min-h-screen bg-[#F1F4F8]">
            {/* Custom Header */}
            <div className="bg-[#1e2f3d] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.push('/novedades-nomina')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-4"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 text-center font-medium text-lg tracking-wide">
                    Reporte de Novedades
                </div>
                <div className="w-8" />
            </div>

            <div className="max-w-[1400px] mx-auto px-4 py-8">
                {/* Filters */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col lg:flex-row items-end gap-4">
                    <div className="w-full lg:w-48">
                        <Label className="mb-2 block text-xs font-bold text-gray-500 uppercase tracking-wider">Mes Aplicación</Label>
                        <select
                            value={mesFiltro}
                            onChange={(e) => setMesFiltro(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="all">Todos los meses</option>
                            {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 w-full">
                        <Label className="mb-2 block text-xs font-bold text-gray-500 uppercase tracking-wider">Búsqueda (Nombre, Cédula, Concepto)</Label>
                        <div className="relative">
                            <Input
                                placeholder="Escriba para filtrar..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="h-11 pl-11"
                            />
                            <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setBusqueda('')
                                setMesFiltro('all')
                            }}
                            className="h-11 px-4 border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                            <Eraser className="h-5 w-5 mr-2" />
                            Limpiar
                        </Button>
                        <Button
                            onClick={exportToCSV}
                            disabled={novedades.length === 0}
                            className="h-11 px-6 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-100"
                        >
                            <Download className="h-5 w-5 mr-2" />
                            Exportar CSV
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <Card className="border-none shadow-xl overflow-hidden">
                    <CardHeader className="bg-[#1e2f3d] py-4">
                        <CardTitle className="text-white text-sm font-bold flex items-center justify-between">
                            <span>REGISTROS ENCONTRADOS: {novedades.length}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Empleado</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Concepto</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aplicación</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Monto/Valor</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Periodicidad</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                                                <p className="mt-2 text-sm text-gray-400 font-medium">Cargando registros...</p>
                                            </td>
                                        </tr>
                                    ) : novedades.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center text-gray-400 italic">
                                                No se encontraron registros
                                            </td>
                                        </tr>
                                    ) : (
                                        novedades.map((n) => (
                                            <tr key={n.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-gray-700">{n.empleados?.nombreCompleto}</span>
                                                        <span className="text-[10px] text-gray-400 font-medium">C.C. {n.empleado_id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                        {n.concepto}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-bold text-gray-500">
                                                        {n.tipo_cambio}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[11px] font-black text-gray-700">{n.mes_aplicacion}</span>
                                                        <span className="text-[10px] text-orange-600 font-bold">{n.periodo}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs font-bold text-gray-700">
                                                            {n.nuevo || n.capital ? `$${(n.nuevo || n.capital?.toString() || '0')}` : 'N/A'}
                                                        </span>
                                                        {n.num_cuotas && (
                                                            <span className="text-[9px] text-gray-400">Cuotas: {n.num_cuotas}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                        {n.periodicidad}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
