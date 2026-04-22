'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { EmpleadoCard } from '@/components/EmpleadoCard'
import { ProcesoCard } from '@/components/Disciplinarios/ProcesoCard'
import { CrearProcesoModal } from '@/components/Disciplinarios/CrearProcesoModal'
import {
    ArrowLeft,
    Plus,
    History as HistoryIcon,
    Loader2,
    FileText,
    ShieldCheck
} from 'lucide-react'
import { toast } from 'sonner'

export default function DetalleProcesosDisciplinarioPage() {
    const router = useRouter()
    const { id } = useParams()
    const supabase = createClient()

    // Data State
    const [empleado, setEmpleado] = useState<any>(null)
    const [procesos, setProcesos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [editingProceso, setEditingProceso] = useState<any>(null)

    // 1. Fetch Data
    const fetchData = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            // Fetch Empleado
            const { data: emp, error: empError } = await supabase
                .from('empleados')
                .select('*')
                .eq('id', id)
                .single()

            if (empError) throw empError
            setEmpleado(emp)

            // Fetch History from view
            const { data: proc, error: procError } = await supabase
                .from('query_procesos_disciplinarios' as any)
                .select('*')
                .eq('empleado_id', id)
                .order('created_at', { ascending: false })

            if (procError) {
                console.warn('Error fetching processes from view:', procError)
                // Fallback to table
                const { data: procTable, error: procTableError } = await supabase
                    .from('procesos_disciplinarios' as any)
                    .select('*')
                    .eq('empleado_id', id)
                    .order('created_at', { ascending: false })

                if (procTableError) throw procTableError
                setProcesos(procTable || [])
            } else {
                setProcesos(proc || [])
            }
        } catch (err: any) {
            console.error('Error in DetalleProcesos:', err)
            toast.error('No se pudo cargar el historial')
        } finally {
            setLoading(false)
        }
    }, [supabase, id])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleEdit = (proceso: any) => {
        setEditingProceso(proceso)
        setIsCreateModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsCreateModalOpen(false)
        setEditingProceso(null)
    }

    return (
        <div className="min-h-screen bg-[#F1F4F8] flex flex-col">
            {/* Standard AppBar */}
            <div className="bg-[#2d4356] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.back()}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-2"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 text-center font-medium text-lg">
                    Expediente Disciplinario
                </div>
                <Button
                    onClick={() => {
                        setEditingProceso(null)
                        setIsCreateModalOpen(true)
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white h-9 px-4 rounded-full font-bold uppercase text-[10px] tracking-wider flex items-center gap-2 border border-white/20 shadow-none"
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Nuevo Registro</span>
                </Button>
            </div>

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="h-10 w-10 text-[#1D3557] animate-spin opacity-40" />
                        <p className="text-gray-400 font-medium text-sm animate-pulse">Abriendo expediente...</p>
                    </div>
                ) : (
                    <>
                        {/* Employee Card */}
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            {empleado && (
                                <EmpleadoCard empleado={{
                                    ...empleado,
                                    cedula: empleado.id
                                }} />
                            )}
                        </div>

                        {/* History Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-[#1D3557] h-8 w-1.5 rounded-full" />
                                    <h2 className="text-lg font-black text-[#1D3557] uppercase tracking-tight">Historial de Procesos</h2>
                                    <span className="bg-blue-100 text-[#1D3557] px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                        {procesos.length}
                                    </span>
                                </div>
                            </div>

                            {procesos.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 pb-20">
                                    {procesos.map((proceso, index) => (
                                        <div
                                            key={proceso.id}
                                            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <ProcesoCard 
                                                proceso={{
                                                    ...proceso,
                                                    created_at: proceso.created_at || proceso.createdAt,
                                                    created_by: proceso.created_by || proceso.createdBy
                                                }} 
                                                onEdit={handleEdit}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-[32px] p-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-100 shadow-sm">
                                    <div className="bg-green-50 p-6 rounded-full mb-6 text-green-500">
                                        <ShieldCheck className="h-12 w-12" />
                                    </div>
                                    <h3 className="text-lg font-bold text-[#1D3557] mb-1">Sin antecedentes</h3>
                                    <p className="text-gray-400 max-w-sm text-sm">
                                        No se han registrado procesos disciplinarios para este colaborador.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="mt-8 border-2 border-gray-100 hover:border-[#1D3557] text-gray-500 hover:text-[#1D3557] rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] px-8 h-12"
                                    >
                                        Crear primer registro
                                    </Button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {empleado && (
                <CrearProcesoModal
                    isOpen={isCreateModalOpen}
                    onClose={handleCloseModal}
                    empleadoId={empleado.id}
                    onSuccess={fetchData}
                    proceso={editingProceso}
                />
            )}
        </div>
    )
}
