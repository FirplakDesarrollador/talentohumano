'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
    Calendar, 
    User, 
    Briefcase, 
    Building2, 
    TrendingUp, 
    ChevronRight, 
    ArrowLeft, 
    LayoutDashboard,
    Clock,
    ShieldCheck,
    Search,
    Filter,
    FileDown, 
    Loader2,
    Bell
} from 'lucide-react'
import Image from 'next/image'
import type { Database } from '@/lib/supabase/types'
import { HiluComponent } from '@/components/HILU/HiluComponent'
import { AuditoriaCard } from '@/components/HILU/AuditoriaCard'
import { ReentrenamientoCard } from '@/components/HILU/ReentrenamientoCard'
import { generateTrainingCertificatePDF } from '@/lib/pdf-utils'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
    getPlantasPermitidas,
    ADMIN_EMAILS,
    ADMIN_LEVELS,
    RESTRICTED_SUPERVISORS,
    COORDINADORES_CON_ACCESO,
    JEFES_CON_ACCESO,
    JEFES_MUEBLES_CEFI,
    JEFES_ALMACEN_CEDI,
    JEFES_INGENIERIA_MOLDES,
    JEFES_MOLDES,
    JEFES_MANTENIMIENTO,
    DIRECTORES_CON_ACCESO,
    HILU_OPERATIVA_RESTRINGIDA_MOLDES
} from '@/lib/constants/roles'

type QueryHiluRow = Database['public']['Views']['query_hilu']['Row']
type Auditoria = Database['public']['Tables']['auditorias']['Row']
type Reentrenamiento = Database['public']['Tables']['reentrenamientos']['Row']
type HiluDisplayRecord = QueryHiluRow & { displayCargo: string | null; foto: string | null };

// Subcomponente para las tarjetas de cargo
const CargoCard = ({ record, isActive, onSelect, isTitular }: { record: any, isActive: boolean, onSelect: () => void, isTitular: boolean }) => {
    const getPhaseStatus = (p: string) => {
        const prefix = p.toLowerCase();
        const isDone = record[`f${prefix}_completado`];
        const progress = record[`f${prefix}_avance`] || 0;
        if (isDone) return 'done';
        if (progress > 0) return 'in-progress';
        return 'pending';
    };

    const isStageLDone = !!(record as any).fl_completado;
    const isPolivalencia = !isTitular && isStageLDone;
    const isHistorial = !isTitular && !isStageLDone;

    return (
        <div 
            onClick={onSelect}
            className={`group relative overflow-hidden rounded-[2.5rem] p-7 transition-all duration-700 cursor-pointer border-2 ${
                isActive 
                ? 'bg-[#1e2f3d] border-blue-500 shadow-2xl shadow-blue-500/20 scale-[1.02] z-10' 
                : 'bg-white border-white shadow-xl hover:shadow-2xl hover:border-blue-100 hover:-translate-y-1'
            }`}
        >
            <div className="relative z-10 space-y-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`border-none ${
                                isTitular 
                                ? 'bg-blue-500/10 text-blue-400' 
                                : isPolivalencia 
                                    ? 'bg-green-500/10 text-green-500' 
                                    : 'bg-amber-500/10 text-amber-400'
                            } text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full`}>
                                {isTitular ? 'Cargo Titular' : isPolivalencia ? 'Polivalencia' : 'Historial'}
                            </Badge>
                            {!isTitular && isPolivalencia && (
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            )}
                        </div>
                        <h4 className={`text-xl font-black uppercase tracking-tight leading-tight ${isActive ? 'text-white' : 'text-[#1e2f3d]'}`}>
                            {record.displayCargo}
                        </h4>
                    </div>
                    <div className={`p-3.5 rounded-2xl transition-all duration-500 ${
                        isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 rotate-12' 
                        : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:rotate-12'
                    }`}>
                        {isTitular ? <Building2 className="h-6 w-6" /> : <Briefcase className="h-6 w-6" />}
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {['H', 'I', 'L', 'U'].map(p => {
                        const status = getPhaseStatus(p);
                        return (
                            <div 
                                key={p} 
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-500 ${
                                    status === 'done'
                                    ? (isActive ? 'bg-green-500 border-green-400 shadow-lg shadow-green-500/20' : 'bg-green-50 border-green-100')
                                    : status === 'in-progress'
                                        ? (isActive ? 'bg-blue-400 border-blue-300 animate-pulse' : 'bg-blue-50 border-blue-100')
                                        : (isActive ? 'bg-white/5 border-white/10 opacity-30' : 'bg-gray-50 border-gray-100')
                                }`}
                            >
                                <span className={`text-lg font-black ${
                                    isActive 
                                    ? (status === 'done' || status === 'in-progress' ? 'text-white' : 'text-white/20')
                                    : (status === 'done' ? 'text-green-600' : status === 'in-progress' ? 'text-blue-600' : 'text-gray-300')
                                }`}>{p}</span>
                            </div>
                        );
                    })}
                </div>

                {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3">
                        <div className="h-1.5 bg-blue-500 rounded-t-full shadow-lg shadow-blue-500/50" />
                    </div>
                )}
            </div>
            
            <div className={`absolute -bottom-8 -right-8 opacity-[0.03] transition-all duration-700 group-hover:scale-150 group-hover:rotate-12 ${isActive ? 'text-white' : 'text-[#1e2f3d]'}`}>
                {isTitular ? <Building2 className="h-40 w-40" /> : <Briefcase className="h-40 w-40" />}
            </div>
        </div>
    );
};

export default function EntrenamientoDetailPage() {
    const router = useRouter()
    const params = useParams()
    const paramId = params.cedula as string

    const [hiluRecords, setHiluRecords] = useState<HiluDisplayRecord[]>([])
    const [selectedCargo, setSelectedCargo] = useState<string | null>(null)
    const [polyvalencias, setPolyvalencias] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [generatingPdf, setGeneratingPdf] = useState(false)
    const [currentUser, setCurrentUser] = useState<{ id?: number; usuarioId?: number; email?: string; nivelCargo?: string } | null>(null)
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
    const [auditorias, setAuditorias] = useState<Auditoria[]>([])
    const [reentrenamientos, setReentrenamientos] = useState<Reentrenamiento[]>([])
    const [activeTab, setActiveTab] = useState<'actual' | 'otros'>('actual')

    const supabase = useMemo(() => createClient(), [])

    const currentRecord = useMemo(() => {
        const record = hiluRecords.find(r => r.displayCargo === selectedCargo) || hiluRecords[0];
        if (!record) return null;
        return { ...record, cargo: record.displayCargo };
    }, [hiluRecords, selectedCargo]);

    const titularCargoName = useMemo(() => {
        if (!hiluRecords.length) return null;
        // El cargo titular real es el que viene de la tabla empleados (cargo_titular o cargo)
        return hiluRecords[0].cargo_titular || hiluRecords[0].cargo;
    }, [hiluRecords]);

    const fetchEmpleadoData = useCallback(async (showLoader = false) => {
        if (!paramId) return

        if (showLoader) {
            setLoading(true)
        }

        try {
            // 0. Get Current User and Check Authorization
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const email = user.email!
            // 1. Obtener perfil del usuario actual (el que está logueado)
            const { data: profile, error: profileError } = await supabase
                .from('usuarios')
                .select('id, correo, rol, plantas')
                .eq('correo', email)
                .maybeSingle()

            if (profileError) console.error('[DEBUG] Profile fetch error:', profileError)
            
            const userProfile = profile as any
            
            // Normalizar rol para comparación con constantes (DB: 'supervisor' -> Const: 'Supervisor')
            const userRoleName = userProfile?.rol ? 
                userProfile.rol.charAt(0).toUpperCase() + userProfile.rol.slice(1) : 
                '';

            const currentUserData = {
                id: userProfile?.id || 1,
                // Alias explicito para los componentes compartidos con HILU Administrativa
                // (ReentrenamientoCard, FeedbackAdminCard), que usan "usuarioId" para el
                // id de "usuarios" (created_by/modified_by) independientemente del "id"
                // que pueda venir de otras fuentes (ej. UUID de auth en otras paginas).
                usuarioId: userProfile?.id || 1,
                email: email,
                nivelCargo: userRoleName || 'Visitante'
            }
            setCurrentUser(currentUserData)

            const isAdmin = ADMIN_EMAILS.includes(email) || (ADMIN_LEVELS as any).includes(userRoleName)

            // Initial generic check (if they are in any list or admin)
            const isRestricted = RESTRICTED_SUPERVISORS.includes(email) ||
                                COORDINADORES_CON_ACCESO.includes(email) ||
                                JEFES_CON_ACCESO.includes(email) ||
                                JEFES_MUEBLES_CEFI.includes(email) ||
                                JEFES_ALMACEN_CEDI.includes(email) ||
                                JEFES_INGENIERIA_MOLDES.includes(email) ||
                                JEFES_MOLDES.includes(email) ||
                                JEFES_MANTENIMIENTO.includes(email) ||
                                DIRECTORES_CON_ACCESO.includes(email)

            if (!isAdmin && !isRestricted) {
                setIsAuthorized(false)
                setLoading(false)
                return
            }

            const parsedParam = parseInt(paramId)
            console.log('[DEBUG] Training Detail Request:', { paramId, parsedParam })
            
            // Delay to ensure DB views are synced before re-fetch
            await new Promise(r => setTimeout(r, 250))

            // 1. Resolve Identity
            let emp: any = null
            const { data: empById } = await supabase.from('empleados').select('*').eq('id', parsedParam).maybeSingle()
            emp = empById

            if (!emp) {
                const { data: empByCedula } = await supabase.from('empleados').select('*').eq('cedula', parsedParam).maybeSingle()
                emp = empByCedula
            }

            if (!emp) {
                setLoading(false)
                return
            }

            const resolvedId = emp.id
            const resolvedCedula = Number(emp.cedula || emp.id)
            const cargoTitular = emp.cargo || ''

            // 1.5 Fetch Polyvalencias
            const { data: polyData } = await (supabase.from('polivalencia') as any)
                .select('"Puesto polivalencia"')
                .eq('Cedula', resolvedCedula.toString())

            const polyList = Array.from(new Set(polyData?.map((p: any) => p['Puesto polivalencia'] as string).filter(Boolean) || [])) as string[]
            setPolyvalencias(polyList)

            // 2. Fetch ALL HILU Records for this employee
            const { data: hiluRecordsList, error: hiluError } = await (supabase
                .from('query_hilu')
                .select('*')
                .eq('cedula', resolvedCedula) as any)

            if (hiluError) console.error('[DEBUG] HILU Query Error:', hiluError)

            let allRecords = (hiluRecordsList || []) as QueryHiluRow[]

            // Helper to normalize strings for comparison (removes accents, trims, upper cases, and common filler words)
            const normalizeStr = (str: string) => {
                if (!str) return '';
                let s = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                s = s.replace(/\b(DE|LA|EL|LOS|LAS|EN|Y|DEL|AL)\b/g, ' ');
                return s.replace(/\s+/g, ' ').trim();
            };

            // 3. Initialize missing phases if needed
            // We check for the titular cargo and all polyvalences
            const cargosToInitialize = Array.from(new Set([cargoTitular, ...polyList].filter(Boolean))).map(c => c.trim())
            let recordsAdded = false

            for (const cargo of cargosToInitialize) {
                console.log(`[DEBUG] Checking phases for cargo: ${cargo}`)
                
                // Fuzzy check to avoid creating ghost rows if a similar cargo already exists
                const cargoNormalized = normalizeStr(cargo);
                const existingRecord = allRecords.find(r => {
                    const rCargo = normalizeStr(r.fh_cargo || r.cargo || '');
                    return rCargo === cargoNormalized || 
                           (rCargo.length > 3 && cargoNormalized.length > 3 && (rCargo.includes(cargoNormalized) || cargoNormalized.includes(rCargo)));
                });

                if (existingRecord) {
                    console.log(`[DEBUG] Phase already exists or is equivalent for cargo: ${cargo} (Matched: ${existingRecord.fh_cargo})`);
                    // Ensure all tables exist for this matched cargo
                    const targetCargo = existingRecord.fh_cargo || cargo;
                    const phases = ['fase_H', 'fase_I', 'fase_L', 'fase_U'] as const;
                    let numericCreatorId = currentUserData.id;
                    
                    for (const table of phases) {
                        const { count } = await supabase
                            .from(table)
                            .select('*', { count: 'exact', head: true })
                            .eq('empleado_id', resolvedId)
                            .eq('cargo', targetCargo);
                            
                        if (count === 0) {
                            console.log(`[DEBUG] Initializing missing ${table} for existing equivalent cargo: ${targetCargo}`);
                            await (supabase.from(table) as any).insert({
                                empleado_id: resolvedId,
                                cargo: targetCargo,
                                created_by: numericCreatorId,
                                modified_by: numericCreatorId
                            });
                            recordsAdded = true;
                        }
                    }
                    continue;
                }

                const phases = ['fase_H', 'fase_I', 'fase_L', 'fase_U'] as const
                let numericCreatorId = currentUserData.id

                for (const table of phases) {
                    const { count } = await supabase
                        .from(table)
                        .select('*', { count: 'exact', head: true })
                        .eq('empleado_id', resolvedId)
                        .eq('cargo', cargo)

                    if (count === 0) {
                        console.log(`[DEBUG] Initializing ${table} for cargo: ${cargo}`)
                        await (supabase.from(table) as any).insert({
                            empleado_id: resolvedId,
                            cargo: cargo,
                            created_by: numericCreatorId,
                            modified_by: numericCreatorId
                        })
                        recordsAdded = true
                    }
                }
            }

            if (recordsAdded) {
                const { data: refreshedRecords } = await (supabase
                    .from('query_hilu')
                    .select('*')
                    .eq('cedula', resolvedCedula) as any)
                allRecords = (refreshedRecords || []) as QueryHiluRow[]
            }

            // Authorization check based on employee's plant
            const userPlantas = userProfile?.plantas
                || (HILU_OPERATIVA_RESTRINGIDA_MOLDES.includes(email) ? ['Moldes'] : getPlantasPermitidas(email))
            const empPlanta = (emp.planta || '').trim()
            const hasPlantAccess = !userPlantas || userPlantas.some((p: string) => p.trim().toLowerCase() === empPlanta.toLowerCase())

            if (!isAdmin && userPlantas && !hasPlantAccess) {
                setIsAuthorized(false)
                setLoading(false)
                return
            }

            setIsAuthorized(true)
            
            // Map records and inject photo, ensuring UNIQUE CARGOS to avoid React key errors
            const cargoTitularNormalized = normalizeStr(cargoTitular);
            
            // Identify the BEST match for titular cargo to handle ghost duplicates
            let bestTitularScore = -1;
            let bestTitularCargoDbStr = '';
            
            allRecords.forEach(r => {
                const rCargo = (r.fh_cargo || r.cargo || '');
                const rCargoNormalized = normalizeStr(rCargo);
                
                let score = -1;
                if (rCargoNormalized === cargoTitularNormalized) score = 4;
                else if (rCargoNormalized.length > 3 && cargoTitularNormalized.length > 3 && rCargoNormalized.includes(cargoTitularNormalized)) score = 3;
                else if (rCargoNormalized.length > 3 && cargoTitularNormalized.length > 3 && cargoTitularNormalized.includes(rCargoNormalized)) score = 2;
                
                if (score > -1) {
                    if (r.fh_completado) score += 10;
                    if (r.fi_completado) score += 10;
                    if (r.fl_completado) score += 10;
                    if (r.fu_completado) score += 10;
                    
                    if (score > bestTitularScore) {
                        bestTitularScore = score;
                        bestTitularCargoDbStr = rCargo;
                    }
                }
            });

            const uniqueCargosSet = new Set();
            const finalRecords = allRecords
                .filter(r => {
                    // Filter out ghost rows (empty rows that fuzzy-match but aren't the best match)
                    const rCargo = (r.fh_cargo || r.cargo || '');
                    const rCargoNormalized = normalizeStr(rCargo);
                    
                    const isFuzzyMatch = rCargoNormalized === cargoTitularNormalized || 
                                         (rCargoNormalized.length > 3 && cargoTitularNormalized.length > 3 && (rCargoNormalized.includes(cargoTitularNormalized) || cargoTitularNormalized.includes(rCargoNormalized)));
                                         
                    if (isFuzzyMatch && rCargo !== bestTitularCargoDbStr) {
                        // This is a worse match or a ghost row, ignore it
                        return false;
                    }
                    return true;
                })
                .map(r => {
                    // El cargo real del registro es fh_cargo (o fi_cargo, etc.)
                    const recordCargo = r.fh_cargo || r.cargo;
                    
                    // If it's the best titular match, force displayCargo to be exactly cargoTitular 
                    // so it shows up in the "Cargo Titular" tab correctly.
                    const isTitular = recordCargo === bestTitularCargoDbStr;
                    const finalDisplayCargo = isTitular ? cargoTitular : recordCargo;
                    
                    return { ...r, displayCargo: finalDisplayCargo, foto: emp.foto || null };
                })
                .filter(r => {
                    if (uniqueCargosSet.has(r.displayCargo)) return false;
                    uniqueCargosSet.add(r.displayCargo);
                    return true;
                });
            
            // 3.5 Calculate combined polyvalencias (Static + Automatic by HILU L completion)
            const automaticPolies = finalRecords
                .filter(r => r.displayCargo !== cargoTitular && (r as any).fl_completado)
                .map(r => r.displayCargo);
            
            const combinedPolies = Array.from(new Set([...polyList, ...automaticPolies])).filter((p): p is string => p !== null);
            setPolyvalencias(combinedPolies)
            setHiluRecords(finalRecords as HiluDisplayRecord[])

            // Select default cargo (titular or the first available)
            if (!selectedCargo) {
                const titularRecord = finalRecords.find(r => r.displayCargo === cargoTitular)
                setSelectedCargo(titularRecord ? cargoTitular : (finalRecords[0]?.displayCargo || cargoTitular))
            }

            // 4. Activity Data
            const [{ data: auditData }, { data: reentrenData }] = await Promise.all([
                supabase.from('auditorias').select('*').eq('empleado_id', resolvedCedula).order('created_at', { ascending: false }),
                supabase.from('reentrenamientos').select('*').eq('empleado_id', resolvedCedula).order('created_at', { ascending: false })
            ])

            setAuditorias(auditData || [])
            setReentrenamientos(reentrenData || [])

        } catch (error: any) {
            console.error('[DEBUG] Fetch Process Error:', error)
        } finally {
            setLoading(false)
        }
    }, [paramId, supabase, router, selectedCargo])

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

    if (isAuthorized === false) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-orange-200 shadow-xl bg-white rounded-2xl overflow-hidden">
                    <div className="bg-orange-500 h-2 w-full" />
                    <CardHeader className="pt-8">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ArrowLeft className="h-10 w-10 text-orange-600" />
                        </div>
                        <CardTitle className="text-center text-2xl font-black text-gray-800 uppercase tracking-tight">ACCESO NO AUTORIZADO</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-6 pb-10">
                        <p className="text-gray-600 leading-relaxed">
                            No tienes permisos suficientes para visualizar el historial HILU de este colaborador 
                            perteneciente a la planta <span className="font-bold text-gray-800">{hiluRecords[0]?.planta || 'restringida'}</span>.
                        </p>
                        <Button 
                            onClick={() => router.push('/menu')} 
                            className="w-full bg-[#1e2f3d] hover:bg-[#2c4255] text-white font-bold py-6 rounded-xl shadow-lg transition-all active:scale-95"
                        >
                            VOLVER AL MENÚ PRINCIPAL
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (hiluRecords.length === 0) {
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

    if (!currentRecord) return null;

    return (
        <div className="min-h-screen bg-[#f1f5f9]">
            {/* Header Sticky */}
            <div className="w-full bg-[#1e2f3d] text-white p-4 flex items-center gap-4 shadow-md sticky top-0 z-50">
                <Button onClick={() => router.back()} variant="ghost" className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-black uppercase tracking-widest flex-1">HILU</h1>

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
                                    {currentRecord.foto && (currentRecord.foto.startsWith('http') || currentRecord.foto.startsWith('/')) ? (
                                        <Image src={currentRecord.foto} alt={currentRecord.nombreCompleto || ''} width={180} height={180} className="object-cover h-full w-full transform hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <User className="h-24 w-24 text-gray-200" />
                                    )}
                                </div>
                                {currentRecord.activo === false && (
                                    <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white font-black uppercase text-[10px] px-4 py-1.5 shadow-lg border-none animate-bounce">Inactivo</Badge>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 text-center md:text-left pt-2">
                                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
                                    <h2 className="text-4xl font-black text-[#1e2f3d] tracking-tight truncate">{currentRecord.nombreCompleto}</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 justify-center md:justify-start"><User className="h-3 w-3 text-blue-500" />Documento</label>
                                        <p className="text-lg font-bold text-gray-800 tracking-wider">{currentRecord.cedula}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 justify-center md:justify-start"><Briefcase className="h-3 w-3 text-blue-500" />Cargo Actual</label>
                                        <p className="text-xl font-black text-[#1e2f3d] truncate" title={titularCargoName || ''}>{titularCargoName || 'POR DEFINIR'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 justify-center md:justify-start"><Building2 className="h-3 w-3 text-blue-500" />Planta</label>
                                        <p className="text-xl font-black text-[#1e2f3d]">{currentRecord.planta || 'CENTRAL'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 justify-center md:justify-start"><User className="h-3 w-3 text-blue-500" />Jefe</label>
                                        <p className="text-xl font-black text-[#1e2f3d] truncate" title={currentRecord.jefe || ''}>{currentRecord.jefe || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="mt-10 flex flex-wrap justify-center md:justify-start gap-4">
                                    <Button onClick={async () => {
                                        setGeneratingPdf(true);
                                        try { await generateTrainingCertificatePDF(currentRecord); toast.success('Certificado generado correctamente'); }
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
                                    const fieldPrefix = f.toLowerCase();
                                    const dbCompletado = (currentRecord as any)[`f${fieldPrefix}_completado`];
                                    
                                    // Robust check for Stage H
                                    let isStageDone = dbCompletado;
                                    if (f === 'H' && !isStageDone) {
                                        isStageDone = !!(
                                            currentRecord.fh_induccion_th && 
                                            currentRecord.fh_aros_seguridad && 
                                            currentRecord.fh_induccion_planta && 
                                            currentRecord.fh_puesto_piloto && 
                                            currentRecord.fh_observacion_puesto && 
                                            currentRecord.fh_explicacion_puesto &&
                                            currentRecord.fh_firma_empleado &&
                                            currentRecord.fh_firma_supervisor
                                        );
                                    }

                                    return (
                                        <div 
                                            key={f} 
                                            className={`flex flex-col items-center justify-center h-16 w-20 rounded-2xl transition-all duration-500 border-2 ${
                                                isStageDone 
                                                ? 'bg-green-500/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                                                : 'bg-white/5 border-white/10 opacity-30 shadow-none'
                                            }`}
                                        >
                                            <span className={`text-xl font-black ${isStageDone ? 'text-green-400' : 'text-white'}`}>{f}</span>
                                            {isStageDone && <div className="h-1.5 w-10 bg-green-500 rounded-full mt-1.5" />}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <div className="space-y-8">
                    {/* TABS SWITCHER CUSTOM */}
                    <div className="flex justify-center">
                        <div className="inline-flex bg-white/50 backdrop-blur-md p-1.5 rounded-[2rem] border border-white shadow-xl ring-1 ring-black/[0.03]">
                            <button
                                onClick={() => {
                                    setActiveTab('actual')
                                    setSelectedCargo(titularCargoName)
                                }}
                                className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.75rem] transition-all duration-500 font-black uppercase tracking-widest text-[11px] ${
                                    activeTab === 'actual'
                                    ? 'bg-[#1e2f3d] text-white shadow-lg shadow-[#1e2f3d]/20 scale-105'
                                    : 'text-gray-400 hover:text-[#1e2f3d] hover:bg-white/50'
                                }`}
                            >
                                <LayoutDashboard className={`h-4 w-4 ${activeTab === 'actual' ? 'text-blue-400' : ''}`} />
                                HILU Cargo Actual
                            </button>
                            <button
                                onClick={() => setActiveTab('otros')}
                                className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.75rem] transition-all duration-500 font-black uppercase tracking-widest text-[11px] ${
                                    activeTab === 'otros'
                                    ? 'bg-[#1e2f3d] text-white shadow-lg shadow-[#1e2f3d]/20 scale-105'
                                    : 'text-gray-400 hover:text-[#1e2f3d] hover:bg-white/50'
                                }`}
                            >
                                <Clock className={`h-4 w-4 ${activeTab === 'otros' ? 'text-amber-400' : ''}`} />
                                HILU Otros Cargos
                            </button>
                        </div>
                    </div>

                    {/* CONTENIDO DE TABS */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {activeTab === 'actual' ? (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Formación Principal</p>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-3xl font-black text-[#1e2f3d] uppercase tracking-tight">Cargo Titular:</h3>
                                            <span className="text-3xl font-black text-blue-600 uppercase tracking-tight">{titularCargoName || 'POR DEFINIR'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {hiluRecords
                                        .filter(r => (r as any).displayCargo === titularCargoName)
                                        .map((record) => (
                                            <CargoCard 
                                                key={(record as any).displayCargo} 
                                                record={record} 
                                                isActive={selectedCargo === (record as any).displayCargo}
                                                isTitular={true}
                                                onSelect={() => setSelectedCargo((record as any).displayCargo)}
                                            />
                                        ))
                                    }
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Historial y Polivalencia</p>
                                        <h3 className="text-3xl font-black text-[#1e2f3d] uppercase tracking-tight">Otros Desempeños</h3>
                                    </div>
                                    
                                    <div className="hidden xl:flex items-center gap-4 bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white shadow-sm ring-1 ring-black/[0.03]">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full bg-green-500" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Completado</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full bg-blue-400 animate-pulse" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">En Curso</span>
                                        </div>
                                    </div>
                                </div>

                                {hiluRecords.filter(r => (r as any).displayCargo !== titularCargoName).length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {hiluRecords
                                            .filter(r => (r as any).displayCargo !== titularCargoName)
                                            .map((record) => (
                                                <CargoCard 
                                                    key={(record as any).displayCargo} 
                                                    record={record} 
                                                    isActive={selectedCargo === (record as any).displayCargo}
                                                    isTitular={false}
                                                    onSelect={() => setSelectedCargo((record as any).displayCargo)}
                                                />
                                            ))
                                        }
                                    </div>
                                ) : (
                                    <div className="bg-white/50 border-2 border-dashed border-gray-200 rounded-[3rem] p-20 text-center space-y-4">
                                        <div className="inline-flex p-6 rounded-full bg-gray-100 text-gray-300">
                                            <Briefcase className="h-12 w-12" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-xl font-black text-gray-400 uppercase">Sin otros registros</h4>
                                            <p className="text-sm text-gray-400">Este colaborador no cuenta con polivalencias o historiales previos.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Training Details Section */}
                {activeTab === 'actual' || (activeTab === 'otros' && selectedCargo !== titularCargoName) ? (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
                        <HiluComponent
                            key={currentRecord.cargo || 'default'}
                            empleado={currentRecord}
                            onUpdate={fetchEmpleadoData}
                            currentUser={currentUser}
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-16 pb-20">
                            <AuditoriaCard
                                empleadoId={currentRecord.cedula}
                                cargo={currentRecord.cargo || 'N/A'}
                                auditorias={auditorias}
                                onUpdate={fetchEmpleadoData}
                                currentUser={currentUser}
                            />

                            <ReentrenamientoCard
                                empleadoId={currentRecord.cedula}
                                cargo={currentRecord.cargo || 'N/A'}
                                reentrenamientos={reentrenamientos}
                                onUpdate={fetchEmpleadoData}
                                currentUser={currentUser}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="mt-8 bg-white/50 border-2 border-dashed border-gray-200 rounded-[3rem] p-20 text-center space-y-4 animate-in fade-in">
                        <div className="inline-flex p-6 rounded-full bg-blue-50 text-blue-300 shadow-inner">
                            <Briefcase className="h-12 w-12" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xl font-black text-[#1e2f3d] uppercase tracking-tight">Selecciona un desempeño</h4>
                            <p className="text-sm text-gray-500 font-medium">Haz clic en una de las tarjetas superiores para cargar y visualizar los detalles de su formación en ese cargo.</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
