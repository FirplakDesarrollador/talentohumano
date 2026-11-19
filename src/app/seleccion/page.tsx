'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Database, Users, GraduationCap, Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ADMIN_EMAILS } from '@/lib/constants/roles'
import { resolveUserProfile } from '@/lib/auth/resolveUserProfile'
import { VacantesTab } from '@/components/Seleccion/VacantesTab'
import { CandidatosInscritosTab } from '@/components/Seleccion/CandidatosInscritosTab'
import { PracticantesTab } from '@/components/Seleccion/PracticantesTab'
import { MisSolicitudesTab } from '@/components/Seleccion/MisSolicitudesTab'

type TabKey = 'vacantes' | 'candidatos' | 'practicantes'

export default function SeleccionPage() {
    const router = useRouter()
    const supabase = createClient()

    const [activeTab, setActiveTab] = useState<TabKey>('vacantes')
    const [authLoading, setAuthLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isJefe, setIsJefe] = useState(false)
    const [empleadoId, setEmpleadoId] = useState<number | null>(null)

    useEffect(() => {
        const fetchAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            const email = (user?.email || '').toLowerCase().trim()
            if (!email) {
                setAuthLoading(false)
                return
            }

            const admin = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)
            setIsAdmin(admin)

            if (!admin) {
                const profile = await resolveUserProfile(supabase, email)
                setIsJefe(profile.tienePersonalACargo)

                const { data: empleado } = await supabase
                    .from('empleados')
                    .select('id')
                    .ilike('correo_electronico', email)
                    .maybeSingle()
                setEmpleadoId((empleado as any)?.id ?? null)
            }

            setAuthLoading(false)
        }
        fetchAuth()
    }, [supabase])

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
        )
    }

    if (!isAdmin && (!isJefe || !empleadoId)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md">
                    <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4 opacity-20" />
                    <h1 className="text-2xl font-bold mb-2">Acceso Restringido</h1>
                    <p className="text-gray-600 mb-6">
                        No tienes permisos para acceder al módulo de Selección.
                    </p>
                    <Button onClick={() => router.push('/menu')} className="w-full">
                        Volver al inicio
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <div className="bg-[#2d4356] h-14 flex items-center px-4 sticky top-0 z-50 shadow-md">
                <button
                    onClick={() => router.push('/menu')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <h1 className="flex-1 text-center text-white font-medium text-lg">Selección</h1>
                <div className="w-8" />
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                {isAdmin ? (
                    <>
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
                            <button
                                onClick={() => setActiveTab('vacantes')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'vacantes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                            >
                                <Database className="h-4 w-4" />
                                Vacantes
                            </button>
                            <button
                                onClick={() => setActiveTab('candidatos')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'candidatos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                            >
                                <Users className="h-4 w-4" />
                                Candidatos Inscritos
                            </button>
                            <button
                                onClick={() => setActiveTab('practicantes')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'practicantes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                            >
                                <GraduationCap className="h-4 w-4" />
                                Practicantes
                            </button>
                        </div>

                        {activeTab === 'vacantes' && <VacantesTab />}
                        {activeTab === 'candidatos' && <CandidatosInscritosTab />}
                        {activeTab === 'practicantes' && <PracticantesTab />}
                    </>
                ) : (
                    <MisSolicitudesTab empleadoId={empleadoId!} />
                )}
            </div>
        </div>
    )
}
