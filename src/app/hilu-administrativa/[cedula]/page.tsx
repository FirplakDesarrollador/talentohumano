'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_EMAILS, ADMIN_LEVELS } from '@/lib/constants/roles'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, User, Briefcase, Building2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { HiluAdministrativaComponent } from '@/components/HILU/HiluAdministrativaComponent'
import { FeedbackAdminCard } from '@/components/HILU/FeedbackAdminCard'
import { ReentrenamientoCard } from '@/components/HILU/ReentrenamientoCard'
import { HiluComponent } from '@/components/HILU/HiluComponent'

export default function HiluAdministrativaPage() {
    const params = useParams()
    const router = useRouter()
    const idParam = params.cedula as string

    const [empleado, setEmpleado] = useState<any>(null)
    const [hiluData, setHiluData] = useState<any>(null)
    const [operativeHiluRecord, setOperativeHiluRecord] = useState<any>(null)
    const [auditorias, setAuditorias] = useState<any[]>([])
    const [reentrenamientos, setReentrenamientos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'administrativa' | 'sistema'>('administrativa')

    const supabase = createClient()

    const canEdit = () => {
        if (!currentUser) return false
        const email = currentUser.email || ''
        const isAdmin = ADMIN_EMAILS.includes(email) || (ADMIN_LEVELS as any).includes(currentUser.nivelCargo || '')
        return isAdmin || ['Jefe', 'Director', 'Gerente', 'Coordinador'].includes(currentUser.nivelCargo)
    }

    const fetchAuditorias = async (cedula: string) => {
        const { data: auditData } = await supabase.from('auditorias').select('*').eq('empleado_id', cedula).order('created_at', { ascending: false })
        if (auditData) setAuditorias(auditData)

        const { data: reentrenData } = await supabase.from('reentrenamientos').select('*').eq('empleado_id', cedula).order('created_at', { ascending: false })
        if (reentrenData) setReentrenamientos(reentrenData)
    }

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                // Get Current User
                const { data: { session } } = await supabase.auth.getSession()
                let userLevel = ''
                if (session?.user) {
                    const { data: empData } = await supabase
                        .from('empleados')
                        .select('nivelCargo')
                        .eq('correo_electronico', session.user.email!)
                        .maybeSingle()
                    userLevel = (empData as any)?.nivelCargo || ''
                    setCurrentUser({ ...session.user, nivelCargo: userLevel })
                }

                // Fetch Employee Info
                const isNumericId = /^\d+$/.test(idParam)
                let query = supabase.from('query_estado_hilu').select('*')
                query = query.eq('id', idParam)

                const { data: empRecord, error: empError } = await query.maybeSingle()
                const empRecordAny = empRecord as any
                if (empError || !empRecordAny) {
                    toast.error('Empleado no encontrado')
                    router.push('/hilu-administrativa')
                    return
                }

                setEmpleado(empRecordAny)

                await fetchAuditorias(empRecordAny.id)

                // Fetch Operative HILU Record (for HILU Sistema)
                const { data: opHilu } = await supabase
                    .from('query_hilu')
                    .select('*')
                    .eq('cedula', Number(empRecordAny.cedula || empRecordAny.id))
                    .eq('cargo', empRecordAny.cargo)
                    .maybeSingle()

                if (opHilu) setOperativeHiluRecord(opHilu)

                // Fetch or Create HILU Administrativa record
                const { data: hiluRecord, error: hiluError } = await supabase
                    .from('hilu_administrativa')
                    .select('*')
                    .eq('empleado_id', empRecordAny.id)
                    .eq('cargo', empRecordAny.cargo)
                    .maybeSingle()

                if (!hiluRecord) {
                    // Create new
                    const { data: newRecord, error: insertError } = await (supabase as any)
                        .from('hilu_administrativa')
                        .insert([{
                            empleado_id: empRecordAny.id,
                            cargo: empRecordAny.cargo || 'No especificado'
                        }])
                        .select('*')
                        .single()

                    if (insertError) {
                        // Might be a race condition from React Strict Mode double-mount
                        const { data: retryRecord } = await supabase
                            .from('hilu_administrativa')
                            .select('*')
                            .eq('empleado_id', empRecordAny.id)
                            .eq('cargo', empRecordAny.cargo)
                            .maybeSingle()

                        if (retryRecord) {
                            setHiluData(retryRecord)
                        } else {
                            console.error('Error creating admin HILU:', insertError)
                            toast.error('Error al inicializar HILU Administrativa')
                        }
                    } else {
                        setHiluData(newRecord)
                    }
                } else {
                    setHiluData(hiluRecord)
                }

            } catch (error) {
                console.error(error)
                toast.error('Error al cargar datos')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [idParam, router, supabase])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
                <Loader2 className="animate-spin h-10 w-10 text-[#1e2f3d]" />
            </div>
        )
    }

    if (!empleado || !hiluData) return null

    const isHighLevel = ['Jefe', 'Gerente', 'Director', 'Coordinador', 'Supervisor'].some(kw => (empleado.nivelCargo || '').toLowerCase().includes(kw.toLowerCase()))

    return (
        <div className="min-h-screen bg-[#f1f5f9]">
            {/* Header Sticky */}
            <div className="w-full bg-[#1e2f3d] text-white p-4 flex items-center gap-4 shadow-md sticky top-0 z-50">
                <Button onClick={() => router.back()} variant="ghost" className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-black uppercase tracking-widest flex-1">HILU Administrativa</h1>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 py-8">
                {/* Employee Info Header */}
                <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-3xl mb-8">
                    <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row gap-8 p-10 items-center md:items-start bg-gradient-to-br from-white via-white to-blue-50/30">
                            <div className="relative">
                                <div className="w-44 h-44 rounded-full overflow-hidden border-8 border-white shadow-xl bg-gray-50 flex items-center justify-center">
                                    {empleado.foto ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={empleado.foto} alt={empleado.nombreCompleto || ''} className="object-cover h-full w-full transform hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <User className="h-24 w-24 text-gray-200" />
                                    )}
                                </div>
                                {empleado.activo === false && (
                                    <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white font-black uppercase text-[10px] px-4 py-1.5 shadow-lg border-none animate-bounce">Inactivo</Badge>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 text-center md:text-left pt-2">
                                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
                                    <h2 className="text-4xl font-black text-[#1e2f3d] tracking-tight truncate">{empleado.nombreCompleto}</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 justify-center md:justify-start"><User className="h-3 w-3 text-blue-500" />Documento</label>
                                        <p className="text-lg font-bold text-gray-800 tracking-wider">{empleado.id}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 justify-center md:justify-start"><Briefcase className="h-3 w-3 text-blue-500" />Cargo Actual</label>
                                        <p className="text-xl font-black text-[#1e2f3d] truncate" title={empleado.displayCargo || empleado.cargo || ''}>{empleado.displayCargo || empleado.cargo || 'POR DEFINIR'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 justify-center md:justify-start"><Building2 className="h-3 w-3 text-blue-500" />Planta</label>
                                        <p className="text-xl font-black text-[#1e2f3d]">{empleado.planta || 'CENTRAL'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 justify-center md:justify-start"><User className="h-3 w-3 text-blue-500" />Jefe</label>
                                        <p className="text-xl font-black text-[#1e2f3d] truncate" title={empleado.jefe || ''}>{empleado.jefe || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar Footer */}
                        <div className="bg-[#1e2f3d] p-6 flex flex-col items-start gap-6 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-white/10" />

                            <div className="flex flex-col md:flex-row w-full justify-between gap-6 relative z-10">
                                {/* Administrativa Progress */}
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <div className="flex flex-col gap-1 items-center md:items-start">
                                        <span className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] mb-1">Estatus del Programa</span>
                                        <h3 className="text-white font-black text-xl uppercase tracking-widest leading-none">HILU ADMIN</h3>
                                    </div>

                                    <div className="flex gap-4 overflow-x-auto py-2 px-1">
                                        {['H', 'I', 'L'].map(f => {
                                            const fieldPrefix = f.toLowerCase();
                                            const isCompleted = hiluData[`f${fieldPrefix}_completado`];
                                            return (
                                                <div key={`admin-${f}`} className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-all duration-500 shadow-inner ${isCompleted ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-green-900/50 scale-110' : 'bg-[#2c4255] text-gray-500 border border-white/5'}`}>
                                                    {isCompleted ? <Check className="h-6 w-6" /> : f}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Sistema / Operativa Progress (only if high level) */}
                                {isHighLevel && (
                                    <>
                                        <div className="hidden md:block w-px bg-white/10 mx-2 self-stretch" />
                                        <div className="flex flex-col md:flex-row items-center gap-6 opacity-90">
                                            <div className="flex flex-col gap-1 items-center md:items-start">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Herramientas</span>
                                                <h3 className="text-gray-300 font-black text-xl uppercase tracking-widest leading-none">HILU SISTEMA DE PRODUCCION</h3>
                                            </div>

                                            <div className="flex gap-4 overflow-x-auto py-2 px-1">
                                                {['H', 'I', 'L', 'U'].map(f => {
                                                    const fieldPrefix = f.toLowerCase();
                                                    const isCompleted = operativeHiluRecord ? operativeHiluRecord[`f${fieldPrefix}_completado`] : false;
                                                    return (
                                                        <div key={`sys-${f}`} className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all duration-500 shadow-inner ${isCompleted ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-green-900/50' : 'bg-[#2c4255] text-gray-500 border border-white/5'}`}>
                                                            {isCompleted ? <Check className="h-5 w-5" /> : f}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {isHighLevel && (
                    <div className="flex justify-center mb-10">
                        <div className="inline-flex bg-white/50 backdrop-blur-md p-1.5 rounded-[2rem] border border-white shadow-xl ring-1 ring-black/[0.03]">
                            <button
                                onClick={() => setActiveTab('administrativa')}
                                className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.75rem] transition-all duration-500 font-black uppercase tracking-widest text-[11px] ${activeTab === 'administrativa'
                                        ? 'bg-[#1e2f3d] text-white shadow-lg shadow-[#1e2f3d]/20 scale-105'
                                        : 'text-gray-400 hover:text-[#1e2f3d] hover:bg-white/50'
                                    }`}
                            >
                                HILU Administrativa
                            </button>
                            <button
                                onClick={() => setActiveTab('sistema')}
                                className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.75rem] transition-all duration-500 font-black uppercase tracking-widest text-[11px] ${activeTab === 'sistema'
                                        ? 'bg-[#1e2f3d] text-white shadow-lg shadow-[#1e2f3d]/20 scale-105'
                                        : 'text-gray-400 hover:text-[#1e2f3d] hover:bg-white/50'
                                    }`}
                            >
                                HILU Sistema de Produccion
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'administrativa' ? (
                    <>
                        <HiluAdministrativaComponent
                            empleado={empleado}
                            hiluData={hiluData}
                            currentUser={currentUser}
                            onUpdate={async () => {
                                const { data } = await supabase
                                    .from('hilu_administrativa')
                                    .select('*')
                                    .eq('id', hiluData.id)
                                    .single()
                                if (data) setHiluData(data)
                            }}
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-16 pb-20">
                            <FeedbackAdminCard
                                empleadoId={empleado.id}
                                cargo={empleado.cargo || 'N/A'}
                                auditorias={auditorias}
                                onUpdate={() => fetchAuditorias(empleado.id)}
                                currentUser={currentUser}
                            />

                            <ReentrenamientoCard
                                empleadoId={empleado.id}
                                cargo={empleado.cargo || 'N/A'}
                                reentrenamientos={reentrenamientos}
                                onUpdate={() => fetchAuditorias(empleado.id)}
                                currentUser={currentUser}
                            />
                        </div>
                    </>
                ) : (
                    operativeHiluRecord ? (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <HiluComponent
                                key={operativeHiluRecord.cargo || 'default'}
                                empleado={{ ...operativeHiluRecord, foto: empleado.foto, displayCargo: empleado.cargo }}
                                onUpdate={async () => {
                                    const { data } = await supabase
                                        .from('query_hilu')
                                        .select('*')
                                        .eq('cedula', Number(empleado.cedula || empleado.id))
                                        .eq('cargo', empleado.cargo)
                                        .maybeSingle()
                                    if (data) setOperativeHiluRecord(data)
                                }}
                                currentUser={currentUser}
                            />
                        </div>
                    ) : (
                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] p-16 text-center space-y-4">
                            <div className="inline-flex p-6 rounded-full bg-blue-50 text-blue-300">
                                <Briefcase className="h-10 w-10" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xl font-black text-[#1e2f3d] uppercase tracking-tight">Sin registro de herramientas</h4>
                                <p className="text-sm text-gray-500 font-medium">Este colaborador aún no tiene un registro operativo activo para su cargo actual.</p>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    )
}
