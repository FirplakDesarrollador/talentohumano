'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    CalendarRange, CheckCircle, Clock, AlertTriangle,
    ListChecks, TrendingUp, RefreshCw, User,
    ChevronDown, ChevronUp, CalendarClock, Target
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PlannerViewProps {
    empleadoEmail?: string
    nombre?: string
}

interface TaskRow {
    id: string
    title: string
    state: string
    percent_complete: number
    priority: number
    due_date_time: string | null
    completed_date_time: string | null
    created_date_time: string | null
    checklist_item_count: number
    checklist_checked_count: number
    plan_id: string
    planner_planes?: { title: string } | null
    planner_buckets?: { name: string } | null
}

interface KPIs {
    total: number
    completadas: number
    en_progreso: number
    pendientes: number
    vencidas: number
    cumplimiento_pct: number
    avg_dias_cierre: number | null
    checklist_total: number
    checklist_done: number
}

const PRIORITY_MAP: Record<number, { label: string; color: string }> = {
    0: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
    1: { label: 'Importante', color: 'bg-orange-100 text-orange-700' },
    3: { label: 'Medio', color: 'bg-yellow-100 text-yellow-700' },
    5: { label: 'Bajo', color: 'bg-gray-100 text-gray-600' },
    9: { label: 'Sin prioridad', color: 'bg-gray-50 text-gray-400' },
}

function CircularProgress({ pct, size = 160 }: { pct: number; size?: number }) {
    const r = (size / 2) - 12
    const circ = 2 * Math.PI * r
    const offset = circ - (circ * pct) / 100
    const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#ea580c' : '#dc2626'
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="10" stroke="#f3f4f6" fill="transparent" />
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    strokeWidth="10" stroke={color} fill="transparent"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black" style={{ color }}>{pct}%</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Completado</span>
            </div>
        </div>
    )
}

function StatCard({ icon: Icon, label, value, color }: {
    icon: any; label: string; value: string | number; color: string
}) {
    return (
        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <div className={`p-2 rounded-xl ${color}`}>
                <Icon className="h-4 w-4" />
            </div>
            <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{label}</p>
                <p className="text-lg font-bold text-[#2d4356]">{value}</p>
            </div>
        </div>
    )
}

function TaskItem({ task }: { task: TaskRow }) {
    const isOverdue = task.due_date_time && task.percent_complete < 100 && (() => {
        const d = new Date(task.due_date_time)
        d.setHours(0,0,0,0)
        const t = new Date()
        t.setHours(0,0,0,0)
        return d < t
    })()
    const prio = PRIORITY_MAP[task.priority] ?? PRIORITY_MAP[9]

    const stateColor = task.percent_complete === 100
        ? 'bg-green-100 text-green-700'
        : task.percent_complete > 0
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-500'

    return (
        <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${isOverdue ? 'border-red-100 bg-red-50/30' : 'border-gray-100 bg-white'}`}>
            <div className={`mt-0.5 h-3 w-3 rounded-full flex-shrink-0 ${
                task.percent_complete === 100 ? 'bg-green-500' :
                task.percent_complete > 0 ? 'bg-blue-500' :
                isOverdue ? 'bg-red-500' : 'bg-gray-300'
            }`} />
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${task.percent_complete === 100 ? 'line-through text-gray-400' : 'text-[#2d4356]'}`}>
                    {task.title}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                    {task.planner_planes?.title && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                            {task.planner_planes.title}
                        </span>
                    )}
                    {task.planner_buckets?.name && (
                        <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                            {task.planner_buckets.name}
                        </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${stateColor}`}>
                        {task.percent_complete === 100 ? 'Completada' : task.percent_complete > 0 ? 'En Progreso' : 'Pendiente'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${prio.color}`}>
                        {prio.label}
                    </span>
                    {isOverdue && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                            Vencida
                        </span>
                    )}
                </div>
                {task.due_date_time && (
                    <p className={`text-[10px] mt-1 font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                        Vence: {new Date(task.due_date_time).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                )}
                {task.checklist_item_count > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                        <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-400 rounded-full transition-all"
                                style={{ width: `${(task.checklist_checked_count / task.checklist_item_count) * 100}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-gray-400">
                            {task.checklist_checked_count}/{task.checklist_item_count}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

export function PlannerView({ empleadoEmail, nombre }: PlannerViewProps) {
    const supabase = createClient()
    const [tasks, setTasks] = useState<TaskRow[]>([])
    const [kpis, setKpis] = useState<KPIs | null>(null)
    const [loading, setLoading] = useState(true)
    const [showAllTasks, setShowAllTasks] = useState(false)
    const [statusFilter, setStatusFilter] = useState<'all' | 'completadas' | 'en_progreso' | 'pendientes'>('all')
    const [noData, setNoData] = useState(false)
    const [lastSync, setLastSync] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        setLoading(true)
        setNoData(false)

        try {
            // Get last sync time
            const { data: syncLog } = await supabase
                .from('planner_sync_log')
                .select('finished_at, status')
                .eq('status', 'success')
                .order('finished_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if ((syncLog as any)?.finished_at) {
                setLastSync((syncLog as any).finished_at)
            }

            if (!empleadoEmail) {
                setNoData(true)
                return
            }

            // Find the planner user by email
            const { data: plannerUser } = await supabase
                .from('planner_users')
                .select('id')
                .or(`mail.ilike.${empleadoEmail},user_principal_name.ilike.${empleadoEmail}`)
                .maybeSingle()

            if (!plannerUser) {
                setNoData(true)
                return
            }

            // Get task assignments for this user, embebiendo la tarea directamente
            // via la foreign key (task_id -> planner_tasks.id) en vez de traer los
            // IDs por separado y luego filtrar con `.in(taskIds)`: con usuarios que
            // tienen muchas tareas asignadas (ej. cientos), esa lista de IDs en la
            // URL puede superar el limite de longitud del gateway y la peticion
            // falla por completo.
            const { data: assignments, error } = await supabase
                .from('planner_task_assignments')
                .select(`
                    planner_tasks (
                        id, title, state, percent_complete, priority,
                        due_date_time, completed_date_time, created_date_time,
                        checklist_item_count, checklist_checked_count, plan_id,
                        planner_planes (title),
                        planner_buckets (name)
                    )
                `)
                .eq('user_id', (plannerUser as any).id)

            if (error) throw error

            if (!assignments || assignments.length === 0) {
                setNoData(true)
                return
            }

            const rows = (assignments as any[])
                .map(a => a.planner_tasks)
                .filter(Boolean) as TaskRow[]

            rows.sort((a, b) => {
                if (!a.due_date_time) return 1
                if (!b.due_date_time) return -1
                return a.due_date_time.localeCompare(b.due_date_time)
            })

            if (rows.length === 0) {
                setNoData(true)
                return
            }

            setTasks(rows)

            // Calculate KPIs
            const todayStart = new Date()
            todayStart.setHours(0,0,0,0)

            const completadas = rows.filter(t => t.percent_complete === 100)
            const pendientes = rows.filter(t => t.percent_complete === 0)
            const en_progreso = rows.filter(t => t.percent_complete > 0 && t.percent_complete < 100)
            const vencidas = rows.filter(t => {
                if (!t.due_date_time || t.percent_complete === 100) return false;
                const dueDate = new Date(t.due_date_time)
                dueDate.setHours(0,0,0,0)
                return dueDate < todayStart
            })

            // Average days to close (for completed tasks with created_date_time)
            const closedWithDates = completadas.filter(
                t => t.created_date_time && t.completed_date_time
            )
            const avgDias = closedWithDates.length > 0
                ? Math.round(
                    closedWithDates.reduce((sum, t) => {
                        const ms = new Date(t.completed_date_time!).getTime() -
                            new Date(t.created_date_time!).getTime()
                        return sum + ms / (1000 * 60 * 60 * 24)
                    }, 0) / closedWithDates.length
                )
                : null

            const checklistTotal = rows.reduce((s, t) => s + (t.checklist_item_count || 0), 0)
            const checklistDone = rows.reduce((s, t) => s + (t.checklist_checked_count || 0), 0)

            setKpis({
                total: rows.length,
                completadas: completadas.length,
                en_progreso: en_progreso.length,
                pendientes: pendientes.length,
                vencidas: vencidas.length,
                cumplimiento_pct: rows.length > 0
                    ? Math.round((completadas.length / rows.length) * 100)
                    : 0,
                avg_dias_cierre: avgDias,
                checklist_total: checklistTotal,
                checklist_done: checklistDone,
            })

        } catch (err) {
            console.error('PlannerView error:', err)
            setNoData(true)
        } finally {
            setLoading(false)
        }
    }, [empleadoEmail, supabase])

    useEffect(() => { loadData() }, [loadData])

    const filteredTasks = tasks.filter(t => {
        if (statusFilter === 'completadas') return t.percent_complete === 100
        if (statusFilter === 'en_progreso') return t.percent_complete > 0 && t.percent_complete < 100
        if (statusFilter === 'pendientes') return t.percent_complete === 0
        return true
    })
    const visibleTasks = showAllTasks ? filteredTasks : filteredTasks.slice(0, 5)

    // ── Empty / Loading states ───────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-10 w-10 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
                <p className="text-sm text-gray-400 animate-pulse">Cargando datos de Planner...</p>
            </div>
        )
    }

    if (noData) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-600 p-2 rounded-xl text-white shadow-sm">
                            <CalendarRange className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-bold text-[#2d4356]">Seguimiento Planner</h2>
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-100 rounded-lg px-3 py-1">
                        Sin datos
                    </Badge>
                </div>
                <div className="bg-white rounded-[32px] p-12 shadow-sm border border-gray-100 flex flex-col items-center text-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center">
                        <User className="h-8 w-8 text-orange-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[#2d4356] text-lg mb-1">Sin tareas de Planner</h3>
                        <p className="text-gray-400 text-sm max-w-xs">
                            {!lastSync
                                ? 'No se ha realizado ninguna sincronización todavía. Ejecuta la sincronización desde el panel de administración.'
                                : `No se encontraron tareas asignadas en Planner para ${nombre || 'este empleado'}. Verifica que el correo coincida con su cuenta de Microsoft 365.`
                            }
                        </p>
                    </div>
                    {lastSync && (
                        <p className="text-[10px] text-gray-300">
                            Última sync: {new Date(lastSync).toLocaleString('es-CO')}
                        </p>
                    )}
                </div>
            </div>
        )
    }

    // ── Main render ──────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-600 p-2 rounded-xl text-white shadow-sm">
                        <CalendarRange className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-[#2d4356]">Seguimiento Planner</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-100 rounded-lg px-3 py-1">
                        {tasks.length} tareas
                    </Badge>
                    <button
                        onClick={loadData}
                        className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
                        title="Actualizar"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Circular progress + quick stats */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-shrink-0">
                        <CircularProgress pct={kpis!.cumplimiento_pct} />
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                        <StatCard icon={CheckCircle} label="Completadas" value={kpis!.completadas} color="bg-green-100 text-green-600" />
                        <StatCard icon={Clock} label="En Progreso" value={kpis!.en_progreso} color="bg-blue-100 text-blue-600" />
                        <StatCard icon={Target} label="Pendientes" value={kpis!.pendientes} color="bg-gray-100 text-gray-500" />
                        <StatCard icon={AlertTriangle} label="Vencidas" value={kpis!.vencidas} color="bg-red-100 text-red-600" />
                    </div>
                </div>
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                    <TrendingUp className="h-5 w-5 text-indigo-500 mx-auto mb-2" />
                    <p className="text-2xl font-black text-[#2d4356]">
                        {kpis!.avg_dias_cierre !== null ? `${kpis!.avg_dias_cierre}d` : '—'}
                    </p>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-1">Prom. días cierre</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                    <ListChecks className="h-5 w-5 text-teal-500 mx-auto mb-2" />
                    <p className="text-2xl font-black text-[#2d4356]">
                        {kpis!.checklist_total > 0
                            ? `${Math.round((kpis!.checklist_done / kpis!.checklist_total) * 100)}%`
                            : '—'}
                    </p>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-1">
                        Checklist ({kpis!.checklist_done}/{kpis!.checklist_total})
                    </p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                    <CalendarClock className="h-5 w-5 text-orange-500 mx-auto mb-2" />
                    <p className="text-2xl font-black text-[#2d4356]">{kpis!.total}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-1">Total asignadas</p>
                </div>
            </div>

            {/* Task list */}
            <div className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-100 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <h3 className="font-bold text-[#2d4356] text-sm uppercase tracking-wide">Listado de Tareas</h3>
                    {lastSync && (
                        <span className="text-[10px] text-gray-300">
                            Sync: {new Date(lastSync).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>

                {/* Filtro por estado */}
                <div className="flex flex-wrap gap-2 mb-2">
                    {([
                        { id: 'all', label: 'Todas' },
                        { id: 'completadas', label: 'Completadas' },
                        { id: 'en_progreso', label: 'En Progreso' },
                        { id: 'pendientes', label: 'Pendientes' },
                    ] as const).map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => { setStatusFilter(opt.id); setShowAllTasks(false) }}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                                statusFilter === opt.id
                                    ? 'bg-orange-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {visibleTasks.map(task => (
                    <TaskItem key={task.id} task={task} />
                ))}
                {filteredTasks.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-6">No hay tareas para este filtro.</p>
                )}
                {filteredTasks.length > 5 && (
                    <button
                        onClick={() => setShowAllTasks(v => !v)}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-orange-600 font-semibold hover:bg-orange-50 rounded-xl transition-colors"
                    >
                        {showAllTasks
                            ? <><ChevronUp className="h-4 w-4" /> Ver menos</>
                            : <><ChevronDown className="h-4 w-4" /> Ver las {filteredTasks.length - 5} tareas restantes</>
                        }
                    </button>
                )}
            </div>
        </div>
    )
}
