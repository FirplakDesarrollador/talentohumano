'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Download, Loader2, FileSpreadsheet, X } from 'lucide-react'

interface ExportarProcesosModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ExportarProcesosModal({ isOpen, onClose }: ExportarProcesosModalProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [fechaDesde, setFechaDesde] = useState(new Date().toISOString().split('T')[0])
    const [incluirRetirados, setIncluirRetirados] = useState(false)

    const handleExport = async () => {
        if (!fechaDesde) return toast.error('Seleccione una fecha de inicio')

        setLoading(true)
        try {
            // Build the query
            let query = supabase
                .from('query_procesos_disciplinarios' as any)
                .select('*')
                .gte('created_at', fechaDesde)

            // Filtering by status
            if (!incluirRetirados) {
                query = query.eq('empleado_activo', true)
            }

            const { data, error } = await query

            if (error) throw error

            if (!data || data.length === 0) {
                toast.info('No se encontraron registros para exportar en el rango seleccionado')
                return
            }

            // Helper to match FF logic
            const safeValue = (value: any) => {
                return value !== null && value !== "" && value !== undefined
                    ? String(value)
                        .replace(/\n/g, '') // Reemplazar saltos de línea
                        .replace(/,/g, '-') // Reemplazar comas por guiones
                    : 'null';
            };

            // Generate CSV with exact FF headers
            const headers = ['id', 'fecha', 'cedula', 'empleado', 'planta', 'jefe', 'tipo', 'motivo', 'comentario', 'creado_por']
            const csvRows = [headers.join(',')]

            data.forEach((row: any) => {
                const csvRow = [
                    safeValue(row.id),
                    safeValue(row.created_at || row.createdAt),
                    safeValue(row.empleado_id),
                    safeValue(row.nombre_completo || row.nombreCompleto),
                    safeValue(row.planta),
                    safeValue(row.jefe),
                    safeValue(row.tipo),
                    safeValue(row.motivo),
                    safeValue(row.comentario),
                    safeValue(row.created_by || row.createdBy)
                ]
                csvRows.push(csvRow.join(','))
            })

            const csvContent = csvRows.join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.setAttribute('href', url)
            link.setAttribute('download', `reporte_disciplinarios_${fechaDesde}.csv`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            toast.success('Archivo exportado correctamente')
            onClose()
        } catch (error: any) {
            console.error('Error exporting CSV:', error)
            toast.error('Error al exportar los datos: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[28px] w-full max-w-[400px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
                {/* Header */}
                <div className="bg-[#2A9D8F] text-white p-7 relative">
                    <button
                        onClick={onClose}
                        className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors p-1"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-white/10 p-2.5 rounded-2xl">
                            <FileSpreadsheet className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Exportar CSV</h3>
                            <p className="text-[#E9F5F3] text-xs font-bold uppercase tracking-widest mt-0.5">
                                Reporte Disciplinario
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Fecha Desde */}
                    <div className="space-y-3">
                        <Label className="text-[#1D3557] font-black uppercase text-[10px] tracking-[0.2em] ml-1">
                            Exportar desde la fecha:
                        </Label>
                        <div className="relative">
                            <Input
                                type="date"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                                className="border-2 border-gray-50 bg-gray-50 focus:border-[#2A9D8F] focus:ring-0 transition-all rounded-2xl h-14 px-5 font-semibold text-[#1D3557]"
                            />
                        </div>
                    </div>

                    {/* Incluir Retirados */}
                    <div className="flex items-center justify-between bg-gray-50 p-5 rounded-[24px] border-2 border-dashed border-gray-100">
                        <div className="space-y-0.5">
                            <Label className="text-[#1D3557] font-bold text-sm">Incluir retirados</Label>
                            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">Personal inactivo</p>
                        </div>
                        <Switch
                            checked={incluirRetirados}
                            onCheckedChange={setIncluirRetirados}
                            className="data-[state=checked]:bg-[#2A9D8F]"
                        />
                    </div>
                </div>

                <div className="p-8 pt-0 flex flex-col sm:flex-row gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 font-black uppercase text-[10px] tracking-[0.2em] text-gray-400 hover:text-gray-600 hover:bg-gray-50 h-14 rounded-2xl"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={loading || !fechaDesde}
                        className="bg-[#2A9D8F] hover:bg-[#2A9D8F]/90 text-white flex-[2] rounded-2xl h-14 px-8 font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-teal-900/20 transition-all active:scale-95"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Download className="h-5 w-5" />
                        )}
                        Descargar
                    </Button>
                </div>
            </div>
        </div>
    )
}
