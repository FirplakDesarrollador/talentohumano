export interface ResolvedUserProfile {
    nivelCargo: string
    nombreCompleto: string
    area: string
    /** True if at least one active employee reports to this user (empleados.jefe). */
    tienePersonalACargo: boolean
}

const ROLE_MAP: Record<string, string> = {
    admin: 'Jefe',
    desarrollador: 'Jefe',
    jefe: 'Jefe',
    gerente: 'Gerente',
    director: 'Director',
    coordinador: 'Coordinador',
    analista: 'Analista',
    supervisor: 'Supervisor',
    visitante: 'Operario',
}

/**
 * Resuelve el perfil (nivel, nombre, area) de un usuario autenticado.
 *
 * Dos correcciones sobre el patron anterior (duplicado en varias paginas):
 * 1. Si hay varios registros en `empleados` con el mismo correo (ej. un
 *    reingreso que dejo un registro historico inactivo), se prioriza el
 *    activo en vez de usar maybeSingle() a ciegas, que fallaba en
 *    silencio ante la ambiguedad y tiraba al usuario al nivel mas bajo.
 * 2. Los correos genericos/compartidos (comercialbogota@firplak.com,
 *    coordinacioncalidad@firplak.com, etc.) enlazan en `usuarios.empleado_id`
 *    al empleado real que los usa. Antes, si ese correo generico no
 *    coincidia con ningun `empleados.correo_electronico`, se caia
 *    directo al rol generico ("visitante" -> Operario, sin area), aunque
 *    el vinculo con el empleado real ya existiera.
 */
export async function resolveUserProfile(supabase: any, email: string): Promise<ResolvedUserProfile> {
    let nivelCargo = ''
    let nombreCompleto = ''
    let area = ''

    const { data: empleadosMatch } = await supabase
        .from('empleados')
        .select('nivelCargo, nombreCompleto, area, activo')
        .eq('correo_electronico', email)
        .order('activo', { ascending: false })
        .limit(1)

    const empleado = (empleadosMatch as any[] | null)?.[0]

    if (empleado?.nivelCargo) {
        nivelCargo = empleado.nivelCargo
        nombreCompleto = empleado.nombreCompleto || ''
        area = empleado.area || ''
    } else {
        const { data: usuario } = await supabase
            .from('usuarios')
            .select('rol, nombre, empleado_id')
            .eq('correo', email)
            .maybeSingle()

        let empleadoVinculado: any = null
        if ((usuario as any)?.empleado_id) {
            const { data: empVinculado } = await supabase
                .from('empleados')
                .select('nivelCargo, nombreCompleto, area')
                .eq('id', (usuario as any).empleado_id)
                .maybeSingle()
            empleadoVinculado = empVinculado
        }

        if (empleadoVinculado?.nivelCargo) {
            nivelCargo = empleadoVinculado.nivelCargo
            nombreCompleto = empleadoVinculado.nombreCompleto || (usuario as any)?.nombre || ''
            area = empleadoVinculado.area || ''
        } else if ((usuario as any)?.rol) {
            nombreCompleto = (usuario as any).nombre || ''
            const dbRole = String((usuario as any).rol).toLowerCase()
            nivelCargo = ROLE_MAP[dbRole] || (usuario as any).rol
        }
    }

    let tienePersonalACargo = false
    if (nombreCompleto.trim()) {
        const { data: reportes } = await supabase
            .from('empleados')
            .select('id')
            .eq('activo', true)
            .ilike('jefe', nombreCompleto.trim())
            .limit(1)
        tienePersonalACargo = !!reportes && reportes.length > 0
    }

    return { nivelCargo, nombreCompleto, area, tienePersonalACargo }
}
