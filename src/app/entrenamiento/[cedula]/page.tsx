'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, User, Briefcase, Building2, MapPin, FileDown, Newspaper, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import type { Database } from '@/lib/supabase/types'
import { HiluComponent } from '@/components/HILU/HiluComponent'
import { AuditoriaCard } from '@/components/HILU/AuditoriaCard'
import { ReentrenamientoCard } from '@/components/HILU/ReentrenamientoCard'
import { generateTrainingCertificatePDF } from '@/lib/pdf-utils'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type QueryHiluRow = Database['public']['Views']['query_hilu']['Row']
type Auditoria = Database['public']['Tables']['auditorias']['Row']
type Reentrenamiento = Database['public']['Tables']['reentrenamientos']['Row']

export default function EntrenamientoDetailPage() {
    const router = useRouter()
    const params = useParams()
    const paramId = params.cedula as string

    const [empleadoData, setEmpleadoData] = useState<(QueryHiluRow & { foto?: string | null }) | null>(null)
    const [auditorias, setAuditorias] = useState<Auditoria[]>([])
    const [reentrenamientos, setReentrenamientos] = useState<Reentrenamiento[]>([])
    const [loading, setLoading] = useState(true)
    const [generatingPdf, setGeneratingPdf] = useState(false)
    const [currentUser, setCurrentUser] = useState<{ id: number } | null>(null)

    const supabase = createClient()

    const fetchEmpleadoData = useCallback(async (showLoader = false) => {
        if (!paramId) return

        if (showLoader) {
            setLoading(true)
        }

        try {
            const parsedParam = parseInt(paramId)
            console.log('[DEBUG] Training Detail Request:', { paramId, parsedParam })

            // 1. Resolve Identity
            let emp: any = null

            // Try first by PK 'id' (most reliable)
            const { data: empById, error: errorId } = await supabase
                .from('empleados')
                .select('*')
                .eq('id', parsedParam)
                .maybeSingle()

            emp = empById

            // Fallback second by 'cedula' column ONLY if not found by ID
            if (!emp && !errorId) {
                try {
                    const { data: empByCedula } = await supabase
                        .from('empleados')
                        .select('*')
                        .eq('cedula', parsedParam)
                        .maybeSingle()
                    emp = empByCedula
                } catch (e) {
                    console.log('[DEBUG] Error checking optional cedula column:', e)
                }
            }

            if (!emp) {
                console.warn('[DEBUG] Employee not found by ID or optional Cedula column:', { paramId, parsedParam, errorId })
                setLoading(false)
                return
            }

            console.log('[DEBUG] Identity Fetched Successfully:', Object.keys(emp))

            // In this DB, 'id' is often the Cedula. We ensure resolvedCedula is valid.
            const resolvedId = emp.id
            const resolvedCedula = Number(emp.cedula || emp.id)
            const cargoStr = emp.cargo || ''

            console.log('[DEBUG] Identity Resolved:', {
                resolvedId,
                resolvedCedula,
                cargo: cargoStr
            })

            // 2. Fetch HILU View Data
            const { data: hiluDataList, error: hiluError } = await (supabase
                .from('query_hilu')
                .select('*')
                .eq('cedula', resolvedCedula) as any) // Cast as any to avoid bigint/number type clash in query
                .limit(1)

            if (hiluError) console.error('[DEBUG] HILU Query Error:', hiluError)

            let hiluDataObj = hiluDataList?.[0] as QueryHiluRow | undefined

            // HILU Initialization
            if (!hiluDataObj) {
                console.log('[DEBUG] Record missing in query_hilu, initializing phases...')
                const phases = ['fase_H', 'fase_I', 'fase_L', 'fase_U'] as const

                // Fetch numeric user ID from 'usuarios' table for audit fields
                const { data: { user } } = await supabase.auth.getUser()
                let numericCreatorId = 1 // Default to 1 (System/Admin)

                if (user?.email) {
                    const { data: profile } = await supabase
                        .from('usuarios')
                        .select('id')
                        .eq('correo', user.email)
                        .maybeSingle() as any
                    if (profile?.id) {
                        numericCreatorId = profile.id
                        setCurrentUser({ id: profile.id })
                    }
                }

                try {
                    for (const table of phases) {
                        const { count, error: countErr } = await supabase
                            .from(table)
                            .select('*', { count: 'exact', head: true })
                            .eq('empleado_id', resolvedId)

                        if (count === 0 && !countErr) {
                            // Try super-minimal first, then expand if needed
                            const payload = {
                                empleado_id: resolvedId,
                                cargo: (cargoStr || 'N/A').substring(0, 50),
                                created_by: numericCreatorId,
                                modified_by: numericCreatorId
                            }
                            console.log(`[DEBUG] Initializing ${table}...`)

                            const { error: insErr } = await (supabase.from(table) as any).insert(payload)

                            if (insErr && insErr.code === '23505') {
                                console.log(`[DEBUG] ${table} already exists, skipping initialization.`)
                            } else if (insErr) {
                                console.error(`[DEBUG] Error init ${table}:`, insErr.message)
                                // Minimal fallback including mandatory audit fields
                                await (supabase.from(table) as any).insert({
                                    empleado_id: resolvedId,
                                    cargo: (cargoStr || 'LIDER').substring(0, 50),
                                    created_by: numericCreatorId,
                                    modified_by: numericCreatorId
                                })
                            }
                        }
                    }

                    // Re-fetch with a slight delay to allow views to propagate if needed (though usually immediate)
                    const { data: refetchedList } = await (supabase
                        .from('query_hilu')
                        .select('*')
                        .eq('cedula', resolvedCedula) as any)

                    if (refetchedList?.[0]) {
                        hiluDataObj = refetchedList[0]
                        console.log('[DEBUG] Record found after initialization')
                    }
                } catch (initErr) {
                    console.error('[DEBUG] Phase initialization exception:', initErr)
                }
            }

            if (hiluDataObj) {
                setEmpleadoData({ ...hiluDataObj, foto: emp.foto || null })
            } else {
                console.log('[DEBUG] Falling back to PseudoData')
                const pseudo: any = {
                    cedula: resolvedCedula,
                    nombreCompleto: emp.nombreCompleto,
                    cargo: cargoStr,
                    planta: emp.planta,
                    jefe: emp.jefe,
                    activo: emp.activo,
                    cargo_titular: cargoStr,
                    foto: emp.foto,
                    fh_id: null, fi_id: null, fl_id: null, fu_id: null,
                    fh_completado: false, fi_completado: false, fl_completado: false, fu_completado: false
                }
                setEmpleadoData(pseudo as QueryHiluRow)
            }

            // 4. Activity Data
            const [{ data: auditData }, { data: reentrenData }] = await Promise.all([
                supabase.from('auditorias').select('*').eq('empleado_id', resolvedId).order('created_at', { ascending: false }),
                supabase.from('reentrenamientos').select('*').eq('empleado_id', resolvedId).order('created_at', { ascending: false })
            ])

            setAuditorias(auditData || [])
            setReentrenamientos(reentrenData || [])

        } catch (error: any) {
            console.error('[DEBUG] Fetch Process Error:', error)
        } finally {
            setLoading(false)
        }
    }, [paramId, supabase])

    useEffect(() => {
        fetchEmpleadoData(true) // Initial load shows spinner
    }, [fetchEmpleadoData])

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <p className="text-gray-600 font-medium">Sincronizando información del colaborador...</p>
                </div>
            </div>
        )
    }

    if (!empleadoData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-red-100 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-center text-red-600 font-black">REGISTRO NO ENCONTRADO</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-gray-600">No pudimos validar la identidad del empleado {paramId}.</p>
                        <Button onClick={() => router.push('/buscador-hilu')} variant="outline" className="w-full border-gray-300 hover:bg-gray-100 font-bold uppercase tracking-wider">
                            <ArrowLeft className="h-4 w-4 mr-2" />Volver al buscador
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f1f5f9]">
            {/* Header Sticky */}
            <div className="w-full bg-[#1e2f3d] text-white p-4 flex items-center gap-4 shadow-md sticky top-0 z-50">
                <Button onClick={() => router.back()} variant="ghost" className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-black uppercase tracking-widest flex-1">Gestor HILU</h1>
                <div className="flex items-center gap-2 pr-2">
                    <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase text-gray-400">En línea</span>
                </div>
            </div>

            <main className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
                {/* Profile Section */}
                <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-3xl">
                    <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row gap-8 p-10 items-center md:items-start bg-gradient-to-br from-white via-white to-blue-50/30">
                            <div className="relative">
                                <div className="w-44 h-44 rounded-full overflow-hidden border-8 border-white shadow-xl bg-gray-50 flex items-center justify-center">
                                    {empleadoData.foto && (empleadoData.foto.startsWith('http') || empleadoData.foto.startsWith('/')) ? (
                                        <Image src={empleadoData.foto} alt={empleadoData.nombreCompleto} width={180} height={180} className="object-cover h-full w-full transform hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <User className="h-24 w-24 text-gray-200" />
                                    )}
                                </div>
                                {empleadoData.activo === false && (
                                    <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white font-black uppercase text-[10px] px-4 py-1.5 shadow-lg border-none animate-bounce">Inactivo</Badge>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 text-center md:text-left pt-2">
                                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
                                    <h2 className="text-4xl font-black text-[#1e2f3d] tracking-tight truncate">{empleadoData.nombreCompleto}</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 justify-center md:justify-start"><User className="h-3 w-3 text-blue-500" />Identidad</label>
                                        <p className="text-lg font-bold text-gray-800 tracking-wider">{empleadoData.cedula}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 justify-center md:justify-start"><Briefcase className="h-3 w-3 text-blue-500" />Posición</label>
                                        <p className="text-lg font-bold text-gray-800 truncate" title={empleadoData.cargo || ''}>{empleadoData.cargo || 'POR DEFINIR'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 justify-center md:justify-start"><Building2 className="h-3 w-3 text-blue-500" />Ubicación</label>
                                        <p className="text-lg font-bold text-gray-800">{empleadoData.planta || 'CENTRAL'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 justify-center md:justify-start"><User className="h-3 w-3 text-blue-500" />Mentoria</label>
                                        <p className="text-lg font-bold text-gray-800 truncate" title={empleadoData.jefe || ''}>{empleadoData.jefe || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="mt-10 flex flex-wrap justify-center md:justify-start gap-4">
                                    <Button onClick={() => router.push(`/novedades-nomina/${empleadoData.cedula}`)} className="bg-[#1e2f3d] hover:bg-[#1e2f3d]/90 text-white flex items-center gap-3 rounded-2xl px-8 py-6 font-bold uppercase text-xs shadow-xl transition-all hover:-translate-y-1 active:scale-95">
                                        <Newspaper className="h-5 w-5" />Registrar Novedad
                                    </Button>
                                    <Button onClick={async () => {
                                        setGeneratingPdf(true);
                                        try { await generateTrainingCertificatePDF(empleadoData); toast.success('Certificado generado correctamente'); }
                                        catch (e) { console.error(e); toast.error('Error al generar el certificado'); }
                                        finally { setGeneratingPdf(false); }
                                    }} disabled={generatingPdf} className="bg-white hover:bg-gray-50 text-[#1e2f3d] border-2 border-[#1e2f3d]/10 flex items-center gap-3 rounded-2xl px-8 py-6 font-bold uppercase text-xs shadow-lg transition-all hover:-translate-y-1 active:scale-95">
                                        {generatingPdf ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />} Descargar Historial
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar Footer */}
                        <div className="bg-[#1e2f3d] p-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-white/10" />
                            <div className="flex flex-col gap-1 items-center md:items-start z-10">
                                <span className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] mb-1">Estatus del Programa</span>
                                <h3 className="text-white font-black text-xl uppercase tracking-widest">CICLO DE FORMACIÓN HILU</h3>
                            </div>

                            <div className="flex gap-4 z-10 overflow-x-auto max-w-full py-2 px-1">
                                {['H', 'I', 'L', 'U'].map(f => {
                                    const completado = (empleadoData as any)[`f${f.toLowerCase()}_completado`]
                                    return (
                                        <div key={f} className={`flex flex-col items-center justify-center h-16 w-20 rounded-2xl transition-all duration-500 border-2 ${completado ? 'bg-green-500/20 border-green-500 shadow-green-500/20' : 'bg-white/5 border-white/10 opacity-30 shadow-none'}`}>
                                            <span className={`text-xl font-black ${completado ? 'text-green-400' : 'text-white'}`}>{f}</span>
                                            {completado && <div className="h-1 w-8 bg-green-500 rounded-full mt-1 animate-pulse" />}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Training Details Section */}
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
                    <HiluComponent
                        empleado={empleadoData}
                        onUpdate={fetchEmpleadoData}
                        currentUser={currentUser || { id: 1 }}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-16 pb-20">
                        <AuditoriaCard
                            empleadoId={empleadoData.cedula}
                            cargo={empleadoData.cargo || 'N/A'}
                            auditorias={auditorias}
                            onUpdate={fetchEmpleadoData}
                        />

                        <ReentrenamientoCard
                            empleadoId={empleadoData.cedula}
                            cargo={empleadoData.cargo || 'N/A'}
                            reentrenamientos={reentrenamientos}
                            onUpdate={fetchEmpleadoData}
                        />
                    </div>
                </div>
            </main>
        </div>
    )
}
