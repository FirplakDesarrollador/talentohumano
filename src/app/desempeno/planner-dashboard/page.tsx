'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    ArrowLeft, CalendarRange, RefreshCw, Loader2,
    Users, Briefcase, ListTodo, AlertTriangle, TrendingUp, CheckCircle, Clock, Search
} from 'lucide-react'
import { SUPER_ADMIN_EMAILS } from '@/lib/constants/roles'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface DashboardData {
    planes_count: number
    tasks_count: number
    users_count: number
    total_completadas: number
    total_en_progreso: number
    total_pendientes: number
    total_vencidas: number
}

interface UserKPI {
    id: string
    mail: string
    display_name: string
    total_tasks: number
    completadas: number
    vencidas: number
    cumplimiento_pct: number
}

export default function PlannerDashboardPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [lastSync, setLastSync] = useState<any>(null)
    const [stats, setStats] = useState<DashboardData | null>(null)
    const [usersKPIs, setUsersKPIs] = useState<UserKPI[]>([])
    const [searchUser, setSearchUser] = useState('')
    
    // Auth
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

    const fetchDashboardData = useCallback(async () => {
        setLoading(true)
        try {
            // 1. Get last sync status
            const { data: syncLog } = await supabase
                .from('planner_sync_log')
                .select('*')
                .order('started_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            
            setLastSync(syncLog)

            // 2. Aggregate stats via RPC
            const { data: globalStats } = await supabase.rpc('get_planner_global_stats')
            
            if (globalStats && (globalStats as any)[0]) {
                const s = (globalStats as any)[0]
                setStats({
                    planes_count: s.planes_count || 0,
                    users_count: s.users_count || 0,
                    tasks_count: s.tasks_count || 0,
                    total_completadas: s.total_completadas || 0,
                    total_en_progreso: s.total_en_progreso || 0,
                    total_pendientes: (s.tasks_count || 0) - ((s.total_completadas || 0) + (s.total_en_progreso || 0)),
                    total_vencidas: s.total_vencidas || 0
                })
            }

            // 3. User KPIs via RPC
            const { data: usersKpisData } = await supabase.rpc('get_planner_user_kpis')
            
            if (usersKpisData) {
                const sortedUsers = (usersKpisData as any[]).map((u: any) => ({
                    id: u.id,
                    mail: u.mail,
                    display_name: u.display_name,
                    total_tasks: Number(u.total_tasks || 0),
                    completadas: Number(u.completadas || 0),
                    vencidas: Number(u.vencidas || 0),
                    cumplimiento_pct: Number(u.total_tasks) > 0 ? Math.round((Number(u.completadas) / Number(u.total_tasks)) * 100) : 0
                })).sort((a: any, b: any) => b.total_tasks - a.total_tasks)
                
                setUsersKPIs(sortedUsers)
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user && user.email && SUPER_ADMIN_EMAILS.includes(user.email)) {
                setIsAuthorized(true)
                fetchDashboardData()
            } else {
                setIsAuthorized(false)
            }
        }
        checkAuth()
    }, [fetchDashboardData, supabase.auth])

    // La sincronización completa (~460 grupos) tarda demasiado como para que el
    // navegador sostenga el ciclo él mismo (una pestaña que se cierra o se
    // duerme corta la cadena a mitad de camino). El botón solo dispara UN
    // arranque/reanudación en el servidor (que se autoencadena solo con
    // EdgeRuntime.waitUntil, y se autorepara vía un watchdog de pg_cron cada
    // 10 minutos si algún paso falla), y aquí solo consultamos el progreso.
    const handleSync = async () => {
        setSyncing(true)
        try {
            const { data, error }: { data: any; error: any } = await supabase.functions.invoke('sync-planner', {
                headers: { 'x-trigger': 'manual' },
                body: { entry: 'manual' }
            })

            if (error) {
                // supabase-js's generic error.message ("non-2xx status code") hides the
                // real reason; error.context is the raw Response, read its body instead.
                let detail = error.message
                try {
                    const body = await error.context?.clone().json()
                    detail = body?.error || detail
                } catch {
                    try {
                        const text = await error.context?.clone().text()
                        if (text) detail = text
                    } catch { /* keep generic message */ }
                }
                throw new Error(`Error en la petición: ${detail}`)
            }
            if (!data.success) {
                throw new Error(data.error || 'Fallo interno')
            }

            // Consulta el estado cada 8s hasta que la cadena termine (success/error)
            // o se resuelva sola en un rato mas si esta cadena estaba "already_running".
            await new Promise<void>((resolve) => {
                const poll = setInterval(async () => {
                    const { data: log } = await (supabase
                        .from('planner_sync_log') as any)
                        .select('status')
                        .order('id', { ascending: false })
                        .limit(1)
                        .maybeSingle()

                    if (!log || (log as any).status !== 'running') {
                        clearInterval(poll)
                        resolve()
                    }
                }, 8000)
            })

            await fetchDashboardData()
        } catch (error: any) {
            console.error('Sync failed:', error)
            alert(error.message || 'Error al ejecutar la sincronización')
        } finally {
            setSyncing(false)
        }
    }

    if (isAuthorized === false) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">Acceso Denegado</h1>
                    <p className="text-gray-600 mb-6">No tienes permisos para ver el Dashboard de Planner.</p>
                    <Button onClick={() => router.push('/desempeno')} className="w-full">
                        Volver a Desempeño
                    </Button>
                </div>
            </div>
        )
    }

    if (loading && !stats) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F1F4F8]">
                <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
            </div>
        )
    }

    const filteredUsers = usersKPIs.filter(u =>
        (u.display_name?.toLowerCase() || '').includes(searchUser.toLowerCase()) ||
        (u.mail?.toLowerCase() || '').includes(searchUser.toLowerCase())
    )

    // Una sincronización puede tardar bastante mas de 5 minutos ahora (se
    // autorepara sola vía el watchdog en vez de terminar en ese lapso), asi
    // que "en curso" se mide por la ultima señal real de progreso, no por
    // cuando arrancó — con un margen un poco mayor a los 8 min que usa el
    // watchdog en el backend para considerarla atascada.
    const isSyncActive = !!lastSync && lastSync.status === 'running' &&
        new Date(lastSync.last_progress_at || lastSync.started_at).getTime() > Date.now() - 10 * 60 * 1000

    return (
        <div className="min-h-screen bg-[#F1F4F8] flex flex-col pb-12">
            {/* AppBar */}
            <div className="bg-[#2d4356] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.push('/desempeno')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-2"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 text-center font-medium text-lg">
                    Admin Planner Integration
                </div>
                <div className="w-8" />
            </div>

            <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                
                {/* Sync Header Section */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-orange-100 p-4 rounded-full">
                            <CalendarRange className="h-8 w-8 text-orange-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[#2d4356]">Estado de Sincronización</h2>
                            <p className="text-sm text-gray-500">
                                {isSyncActive && <span className="text-blue-500 font-medium flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> Sincronizando ahora...</span>}
                                {lastSync?.status === 'success' && <span className="text-green-600 font-medium">Última exitosa: {new Date(lastSync.finished_at).toLocaleString('es-CO')}</span>}
                                {lastSync?.status === 'error' && <span className="text-red-500 font-medium">Fallida: {new Date(lastSync.finished_at).toLocaleString('es-CO')}</span>}
                                {!lastSync && 'Nunca sincronizado'}
                            </p>
                            {lastSync?.error_message && (
                                <p className="text-xs text-red-400 mt-1 max-w-md truncate">{lastSync.error_message}</p>
                            )}
                        </div>
                    </div>
                    
                    <Button
                        onClick={handleSync}
                        disabled={syncing || isSyncActive}
                        className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-12 px-6 shadow-md"
                    >
                        {syncing || isSyncActive ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sincronizando</>
                        ) : (
                            <><RefreshCw className="mr-2 h-5 w-5" /> Forzar Sincronización</>
                        )}
                    </Button>
                </div>

                {/* Global Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center gap-2 mb-2 text-gray-500">
                            <Briefcase className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Planes</span>
                        </div>
                        <span className="text-3xl font-black text-[#2d4356]">{stats?.planes_count}</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center gap-2 mb-2 text-gray-500">
                            <Users className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Usuarios</span>
                        </div>
                        <span className="text-3xl font-black text-[#2d4356]">{stats?.users_count}</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:col-span-2">
                        <div className="flex items-center gap-2 mb-2 text-gray-500">
                            <ListTodo className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Total Tareas Importadas</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-black text-[#2d4356]">{stats?.tasks_count}</span>
                            <div className="flex gap-3 text-sm font-medium">
                                <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3"/>{stats?.total_completadas}</span>
                                <span className="text-blue-600 flex items-center gap-1"><Clock className="h-3 w-3"/>{stats?.total_en_progreso}</span>
                                <span className="text-red-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3"/>{stats?.total_vencidas}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Leaderboard / User list */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="text-lg font-bold text-[#2d4356] flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-orange-500" />
                            Productividad por Empleado
                        </h3>
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                                placeholder="Buscar usuario..." 
                                value={searchUser}
                                onChange={e => setSearchUser(e.target.value)}
                                className="pl-9 h-9 bg-gray-50 border-none rounded-xl text-sm"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 rounded-xl">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-xl">Empleado</th>
                                    <th className="px-4 py-3">Tareas Totales</th>
                                    <th className="px-4 py-3">Completadas</th>
                                    <th className="px-4 py-3">Vencidas</th>
                                    <th className="px-4 py-3 rounded-r-xl">% Cumplimiento</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user, idx) => (
                                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-4">
                                            <p className="font-semibold text-[#2d4356]">{user.display_name || 'Sin Nombre'}</p>
                                            <p className="text-xs text-gray-400">{user.mail}</p>
                                        </td>
                                        <td className="px-4 py-4 font-medium text-[#2d4356]">{user.total_tasks}</td>
                                        <td className="px-4 py-4 text-green-600 font-medium">{user.completadas}</td>
                                        <td className="px-4 py-4 text-red-500 font-medium">
                                            {user.vencidas > 0 ? (
                                                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100">
                                                    {user.vencidas}
                                                </Badge>
                                            ) : '0'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-gray-100 rounded-full w-24">
                                                    <div 
                                                        className={`h-full rounded-full ${user.cumplimiento_pct >= 80 ? 'bg-green-500' : user.cumplimiento_pct >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                                                        style={{ width: `${user.cumplimiento_pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold w-8">{user.cumplimiento_pct}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                            No se encontraron usuarios.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    )
}
