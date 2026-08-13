'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Lista de plantas/areas desde la tabla `plantas`, en vez de la constante fija
 * que antes vivia en GestorFilters.tsx. Permite agregar/renombrar plantas sin
 * tocar codigo ni redeploy.
 */
export function usePlantas() {
    const supabase = createClient()
    const [plantas, setPlantas] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPlantas = async () => {
            try {
                const { data, error } = await (supabase as any)
                    .from('plantas')
                    .select('planta')
                    .order('id', { ascending: true })

                if (error) throw error
                setPlantas((data || []).map((p: any) => p.planta).filter(Boolean))
            } catch (err) {
                console.error('Error fetching plantas:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchPlantas()
    }, [supabase])

    return { plantas, loading }
}
