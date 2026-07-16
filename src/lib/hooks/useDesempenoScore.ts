'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface DesempenoScores {
    // Sub-scores (0-100 cada uno)
    scoreCompetencias: number | null   // 20% del bloque Desempeño
    scoreIndicadores: number | null    // 60% del bloque Desempeño
    scorePlanner: number | null        // 20% del bloque Desempeño
    scorePotencial: number | null      // bloque Potencial completo

    // Totales ponderados. Null solo antes de la primera carga; una vez
    // calculados, un submodulo sin datos cuenta como 0 (no se excluye).
    scoreDesempeno: number | null      // 70% del score final
    scoreFinal: number | null          // Score total del empleado

    loading: boolean
}

/**
 * Calcula el score de desempeño ponderado para un empleado.
 *
 * Desempeño (70%):
 *   - Competencias (20%): promedio de (nivel / nivel_esperado * 100) por competencia
 *   - Indicadores/KPIs (60%): promedio de porcentaje_cumplimiento de todos los registros
 *   - Planner (20%): % tareas completadas del total asignadas
 *
 * Potencial (30%):
 *   - Promedio de las 4 respuestas (0-100 cada una)
 *
 * Score Final = Desempeño × 70% + Potencial × 30%
 *
 * Si a un empleado le falta informacion en algun submodulo (Competencias,
 * Indicadores, Planner o Potencial), ese submodulo cuenta como 0 en vez de
 * excluirse/renormalizar los pesos entre los datos disponibles.
 */
export function useDesempenoScore(
    cedula: number | string,
    cargo: string,
    empleadoEmail?: string
): DesempenoScores {
    const supabase = createClient()
    const [scores, setScores] = useState<DesempenoScores>({
        scoreCompetencias: null,
        scoreIndicadores: null,
        scorePlanner: null,
        scorePotencial: null,
        scoreDesempeno: null,
        scoreFinal: null,
        loading: true,
    })

    const calcular = useCallback(async () => {
        setScores(prev => ({ ...prev, loading: true }))

        try {
            // ── 1. COMPETENCIAS ──────────────────────────────────────────────
            let scoreCompetencias: number | null = null
            const { data: comptData } = await (supabase
                .from('ComptEmpleados') as any)
                .select('nivel, nivel_esperado, competencias')
                .eq('cedula', String(cedula))
                .maybeSingle()

            if (comptData) {
                const nivel = comptData.nivel as Record<string, number> || {}
                const esperado = comptData.nivel_esperado as Record<string, number> || {}
                const keys = Object.keys(nivel)
                if (keys.length > 0) {
                    const ratios = keys.map(k => {
                        const esp = typeof esperado[k] === 'number' ? esperado[k] : 100
                        const niv = typeof nivel[k] === 'number' ? nivel[k] : 0
                        return esp > 0 ? Math.min((niv / esp) * 100, 100) : 0
                    })
                    scoreCompetencias = Math.round(
                        ratios.reduce((a, b) => a + b, 0) / ratios.length
                    )
                }
            }

            // ── 2. INDICADORES/KPIs ──────────────────────────────────────────
            let scoreIndicadores: number | null = null
            const { data: indData } = await (supabase
                .from('empleado_indicadores') as any)
                .select('id')
                .eq('cedula_empleado', String(cedula))

            if (indData && (indData as any[]).length > 0) {
                const ids = (indData as any[]).map((i: any) => i.id)
                const { data: regData } = await (supabase
                    .from('empleado_indicador_registros') as any)
                    .select('porcentaje_cumplimiento')
                    .in('empleado_indicador_id', ids)

                if (regData && (regData as any[]).length > 0) {
                    const valores = (regData as any[]).map((r: any) =>
                        Math.min(Number(r.porcentaje_cumplimiento) || 0, 100)
                    )
                    scoreIndicadores = Math.round(
                        valores.reduce((a, b) => a + b, 0) / valores.length
                    )
                }
            }

            // ── 3. PLANNER ───────────────────────────────────────────────────
            let scorePlanner: number | null = null
            if (empleadoEmail) {
                const { data: plannerUser } = await supabase
                    .from('planner_users')
                    .select('id')
                    .or(`mail.ilike.${empleadoEmail},user_principal_name.ilike.${empleadoEmail}`)
                    .maybeSingle()

                if (plannerUser) {
                    const { data: assignments } = await supabase
                        .from('planner_task_assignments')
                        .select('task_id')
                        .eq('user_id', (plannerUser as any).id)

                    if (assignments && (assignments as any[]).length > 0) {
                        const taskIds = (assignments as any[]).map((a: any) => a.task_id)
                        const { data: taskData } = await supabase
                            .from('planner_tasks')
                            .select('percent_complete')
                            .in('id', taskIds)

                        if (taskData && (taskData as any[]).length > 0) {
                            const completadas = (taskData as any[]).filter(
                                (t: any) => t.percent_complete === 100
                            ).length
                            scorePlanner = Math.round(
                                (completadas / (taskData as any[]).length) * 100
                            )
                        }
                    }
                }
            }

            // ── 4. POTENCIAL ─────────────────────────────────────────────────
            let scorePotencial: number | null = null
            const { data: potData } = await (supabase
                .from('potencial_empleados') as any)
                .select('respuestas')
                .eq('cedula', String(cedula))
                .maybeSingle()

            if (potData?.respuestas) {
                const vals = Object.values(potData.respuestas as Record<string, number>)
                if (vals.length > 0) {
                    scorePotencial = Math.round(
                        vals.reduce((a: number, b) => a + Number(b), 0) / vals.length
                    )
                }
            }

            // ── 5. PONDERACIONES FINALES ─────────────────────────────────────
            // Desempeño = Competencias×20% + Indicadores×60% + Planner×20%
            // Si falta informacion de algun submodulo, cuenta como 0 (no se
            // renormalizan los pesos entre los datos disponibles).
            const scoreDesempeno = Math.round(
                (scoreCompetencias ?? 0) * 0.20 +
                (scoreIndicadores ?? 0) * 0.60 +
                (scorePlanner ?? 0) * 0.20
            )

            // Score Final = Desempeño×70% + Potencial×30%
            const scoreFinal = Math.round(
                scoreDesempeno * 0.70 + (scorePotencial ?? 0) * 0.30
            )

            setScores({
                scoreCompetencias,
                scoreIndicadores,
                scorePlanner,
                scorePotencial,
                scoreDesempeno,
                scoreFinal,
                loading: false,
            })
        } catch (err) {
            console.error('useDesempenoScore error:', err)
            setScores(prev => ({ ...prev, loading: false }))
        }
    }, [cedula, empleadoEmail, supabase])

    useEffect(() => {
        if (cedula) calcular()
    }, [cedula, calcular])

    return scores
}
