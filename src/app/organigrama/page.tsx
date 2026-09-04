'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Network } from 'lucide-react'
import { OrganigramaFlow, type OrgEmpleado } from '@/components/Gestor/OrganigramaFlow'

export default function OrganigramaPage() {
    const router = useRouter()
    const supabase = createClient()

    const [empleados, setEmpleados] = useState<OrgEmpleado[]>([])
    const [loading, setLoading] = useState(true)

    // Modulo visible para todos los empleados: sin filtro por rol, se muestra
    // la compania completa. La vista es de solo lectura (ver OrganigramaFlow).
    useEffect(() => {
        const fetchEmpleados = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('empleados')
                    .select('id, nombreCompleto, cargo, planta, foto, jefe')
                    .eq('activo', true)

                if (error) throw error
                setEmpleados(((data as any[]) || []).map((e) => ({
                    id: e.id,
                    nombreCompleto: e.nombreCompleto || 'Sin nombre',
                    cargo: e.cargo,
                    planta: e.planta,
                    foto: e.foto,
                    jefe: e.jefe,
                })))
            } catch (err) {
                console.error('Error cargando organigrama:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchEmpleados()
    }, [supabase])

    return (
        <div className="h-screen flex flex-col bg-[#F8FAFC]">
            <div className="bg-[#1e2f3d] h-14 flex items-center px-4 shadow-md text-white shrink-0 z-20">
                <button
                    onClick={() => router.push('/menu')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-4"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 flex items-center justify-center gap-2 font-medium text-lg tracking-wide">
                    <Network className="h-5 w-5 text-blue-300" />
                    Organigrama
                </div>
                <div className="w-8" />
            </div>

            <div className="flex-1 relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-10 w-10 text-[#1e2f3d] animate-spin" />
                        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Construyendo organigrama...</p>
                    </div>
                ) : empleados.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-4">
                        <Network className="h-14 w-14 text-slate-300" />
                        <p className="text-slate-500 font-bold">No se encontraron empleados para mostrar.</p>
                        <Button onClick={() => router.push('/menu')}>Volver</Button>
                    </div>
                ) : (
                    <OrganigramaFlow empleados={empleados} />
                )}
            </div>
        </div>
    )
}
