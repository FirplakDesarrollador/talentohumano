'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Network } from 'lucide-react'
import { NIVELES_CARGO, ADMIN_LEVELS, ADMIN_EMAILS, GESTOR_EXCLUDED_EMAILS, JEFES_CON_ACCESO, JEFES_MUEBLES_CEFI, JEFES_ALMACEN_CEDI, JEFES_INGENIERIA_MOLDES, DIRECTORES_CON_ACCESO, ANALISTAS_CON_ACCESO, getPlantasPermitidas } from '@/lib/constants/roles'
import { OrganigramaFlow, type OrgEmpleado } from '@/components/Gestor/OrganigramaFlow'

export default function OrganigramaPage() {
    const router = useRouter()
    const supabase = createClient()

    const [user, setUser] = useState<any>(null)
    const [userLevel, setUserLevel] = useState<string>('')
    const [empleados, setEmpleados] = useState<OrgEmpleado[]>([])
    const [loading, setLoading] = useState(true)

    // Mismo control de acceso que /gestor-de-personal, para que el organigrama
    // solo muestre a quien ya podía ver a esa gente en el listado.
    const filterByRole = useCallback((empleado: { planta: string | null; correo_electronico: string | null }) => {
        if (!user) return false
        if (user?.email && GESTOR_EXCLUDED_EMAILS.includes(user.email)) return false

        const isSystemAdmin = (user?.email && ADMIN_EMAILS.includes(user.email)) || ADMIN_LEVELS.includes(userLevel as any)
        if (isSystemAdmin) return true
        if (!userLevel) return false
        if (user?.email && ANALISTAS_CON_ACCESO.includes(user.email)) return true

        const area = empleado.planta || ''
        const isRestrictedJefe = user?.email && (JEFES_CON_ACCESO.includes(user.email) || JEFES_MUEBLES_CEFI.includes(user.email) || JEFES_ALMACEN_CEDI.includes(user.email) || JEFES_INGENIERIA_MOLDES.includes(user.email))
        const isRestrictedDirector = user?.email && DIRECTORES_CON_ACCESO.includes(user.email)

        if (['Jefe', 'Analista'].includes(userLevel) && !isRestrictedJefe) {
            const productionAreas = ['Calidad', 'Fibra (Calidad)', 'Marmol (Calidad)', 'Muebles (Calidad)', 'Cefi', 'Fibra de vidrio', 'Mantenimiento', 'Manufactura', 'Marmol sintetico', 'Mercadeo', 'Muebles', 'Produccion', 'RR Moldes', 'Moldes', 'RTM']
            if (productionAreas.includes(area)) return true
        }
        if (userLevel === 'Director' && !isRestrictedDirector) return true

        const teamA = ['hector.chinchilla@firplak.com']
        if (teamA.includes(user.email)) {
            const teamAAreas = ['Calidad', 'Fibra (Calidad)', 'Marmol (Calidad)', 'Muebles (Calidad)', 'Cefi', 'Fibra de vidrio', 'Mantenimiento', 'Manufactura', 'Marmol sintetico', 'Moldes', 'Muebles', 'Produccion', 'RR Moldes', 'RTM']
            return teamAAreas.includes(area)
        }

        if (user?.email) {
            if (empleado.correo_electronico === user.email) return true
            const permittedPlants = getPlantasPermitidas(user.email)
            if (permittedPlants) return permittedPlants.includes(area)
        }
        return false
    }, [user, userLevel])

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }
            setUser(user)

            const { data: empleado } = await supabase
                .from('empleados')
                .select('nivelCargo')
                .eq('correo_electronico', user.email!)
                .maybeSingle()

            if ((empleado as any)?.nivelCargo) {
                setUserLevel((empleado as any).nivelCargo)
            } else {
                const { data: usuario } = await supabase
                    .from('usuarios')
                    .select('rol')
                    .eq('correo', user.email!)
                    .maybeSingle()
                if ((usuario as any)?.rol) {
                    const roleMap: Record<string, string> = {
                        admin: 'Jefe', desarrollador: 'Jefe', jefe: 'Jefe', gerente: 'Gerente',
                        director: 'Director', coordinador: 'Coordinador', analista: 'Analista',
                        supervisor: 'Jefe', visitante: 'Operario',
                    }
                    setUserLevel(roleMap[(usuario as any).rol] || (usuario as any).rol)
                }
            }
        }
        fetchUserData()
    }, [supabase])

    useEffect(() => {
        if (!user) return
        const fetchEmpleados = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('empleados')
                    .select('id, nombreCompleto, cargo, planta, foto, jefe, correo_electronico')
                    .eq('activo', true)

                if (error) throw error
                const visibles = ((data as any[]) || []).filter(filterByRole)
                setEmpleados(visibles.map((e) => ({
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
    }, [user, filterByRole, supabase])

    return (
        <div className="h-screen flex flex-col bg-[#F8FAFC]">
            <div className="bg-[#1e2f3d] h-14 flex items-center px-4 shadow-md text-white shrink-0 z-20">
                <button
                    onClick={() => router.push('/gestor-de-personal')}
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
                        <p className="text-slate-500 font-bold">No tienes acceso a ningún empleado para mostrar aquí.</p>
                        <Button onClick={() => router.push('/gestor-de-personal')}>Volver</Button>
                    </div>
                ) : (
                    <OrganigramaFlow empleados={empleados} />
                )}
            </div>
        </div>
    )
}
