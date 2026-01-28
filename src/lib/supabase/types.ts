export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            empleados: {
                Row: {
                    id: number
                    cedula: number
                    nombreCompleto: string
                    cargo: string | null
                    planta: string | null
                    jefe: string | null
                    foto: string | null
                    empresa: string | null
                    activo: boolean | null
                    created_at: string | null
                    updated_at: string | null
                    ultima_auditoria: string | null
                }
                Insert: {
                    id?: number
                    cedula: number
                    nombreCompleto: string
                    cargo?: string | null
                    planta?: string | null
                    jefe?: string | null
                    foto?: string | null
                    empresa?: string | null
                    activo?: boolean | null
                    created_at?: string | null
                    updated_at?: string | null
                    ultima_auditoria?: string | null
                }
                Update: {
                    id?: number
                    cedula?: number
                    nombreCompleto?: string
                    cargo?: string | null
                    planta?: string | null
                    jefe?: string | null
                    foto?: string | null
                    empresa?: string | null
                    activo?: boolean | null
                    created_at?: string | null
                    updated_at?: string | null
                    ultima_auditoria?: string | null
                }
            }
            competencias: {
                Row: {
                    id: number
                    codigo: string
                    nombre: string
                    descripcion: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: number
                    codigo: string
                    nombre: string
                    descripcion?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: number
                    codigo?: string
                    nombre?: string
                    descripcion?: string | null
                    created_at?: string | null
                }
            }
            competencia_empleado: {
                Row: {
                    id: number
                    cedula: number
                    nombre: string
                    cargo: string
                    comp_codigo: string
                    comp_nombre: string
                    nivel_esperado: number
                    nivel: number
                    comentario: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: number
                    cedula: number
                    nombre: string
                    cargo: string
                    comp_codigo: string
                    comp_nombre: string
                    nivel_esperado: number
                    nivel: number
                    comentario?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: number
                    cedula?: number
                    nombre?: string
                    cargo?: string
                    comp_codigo?: string
                    comp_nombre?: string
                    nivel_esperado?: number
                    nivel?: number
                    comentario?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            empleado_indicador: {
                Row: {
                    id: number
                    cedula_empleado: number
                    nombre_empleado: string
                    nombre_indicador: string
                    tipo: string
                    meta: number
                    created_at: string | null
                }
                Insert: {
                    id?: number
                    cedula_empleado: number
                    nombre_empleado: string
                    nombre_indicador: string
                    tipo: string
                    meta: number
                    created_at?: string | null
                }
                Update: {
                    id?: number
                    cedula_empleado?: number
                    nombre_empleado?: string
                    nombre_indicador?: string
                    tipo?: string
                    meta?: number
                    created_at?: string | null
                }
            }
            indicador_registro: {
                Row: {
                    id: number
                    empleado_indicador_id: number
                    fecha_inicio: string
                    fecha_fin: string
                    valor_logrado: number
                    comentario: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: number
                    empleado_indicador_id: number
                    fecha_inicio: string
                    fecha_fin: string
                    valor_logrado: number
                    comentario?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: number
                    empleado_indicador_id?: number
                    fecha_inicio?: string
                    fecha_fin?: string
                    valor_logrado?: number
                    comentario?: string | null
                    created_at?: string | null
                }
            }
            comisiones: {
                Row: {
                    id: number
                    nombreArchivo: string
                    urlArchivo: string
                    ano: string
                    mes: string
                    area: string
                    creador: string
                    pagado: boolean | null
                    comentarios: string | null
                    fechaCreacion: string | null
                }
                Insert: {
                    id?: number
                    nombreArchivo: string
                    urlArchivo: string
                    ano: string
                    mes: string
                    area: string
                    creador: string
                    pagado?: boolean | null
                    comentarios?: string | null
                    fechaCreacion?: string | null
                }
                Update: {
                    id?: number
                    nombreArchivo?: string
                    urlArchivo?: string
                    ano?: string
                    mes?: string
                    area?: string
                    creador?: string
                    pagado?: boolean | null
                    comentarios?: string | null
                    fechaCreacion?: string | null
                }
            }
            usuarios: {
                Row: {
                    id: number
                    nombre: string
                    correo: string
                    rol: string
                    empleadoId: number | null
                    plantas: string[] | null
                }
                Insert: {
                    id?: number
                    nombre: string
                    correo: string
                    rol: string
                    empleadoId?: number | null
                    plantas?: string[] | null
                }
                Update: {
                    id?: number
                    nombre?: string
                    correo?: string
                    rol?: string
                    empleadoId?: number | null
                    plantas?: string[] | null
                }
            }
            aumentos_salariales: {
                Row: {
                    id: number
                    created_at: string
                    empleado_id: number
                    cargoAnterior: string | null
                    cargoPropuesto: string | null
                    solicitante: number
                    aprobador: number
                    comentariosSolicitante: string | null
                    fechaAplicacion: string
                    salarioActual: number
                    salarioPropuesto: number
                    planta: string | null
                    jefe: string | null
                    requiereAscenso: boolean
                    estado: string
                }
                Insert: {
                    id?: number
                    created_at?: string
                    empleado_id: number
                    cargoAnterior?: string | null
                    cargoPropuesto?: string | null
                    solicitante: number
                    aprobador: number
                    comentariosSolicitante?: string | null
                    fechaAplicacion: string
                    salarioActual: number
                    salarioPropuesto: number
                    planta?: string | null
                    jefe?: string | null
                    requiereAscenso: boolean
                    estado?: string
                }
                Update: {
                    id?: number
                    created_at?: string
                    empleado_id?: number
                    cargoAnterior?: string | null
                    cargoPropuesto?: string | null
                    solicitante?: number
                    aprobador?: number
                    comentariosSolicitante?: string | null
                    fechaAplicacion?: string
                    salarioActual?: number
                    salarioPropuesto?: number
                    planta?: string | null
                    jefe?: string | null
                    requiereAscenso?: boolean
                    estado?: string
                }
            }
        }
        Views: {}
        Functions: {
            upsert_competencia_empleado: {
                Args: {
                    p_cedula: number
                    p_nombre: string
                    p_cargo: string
                    p_comp_codigo: string
                    p_comp_nombre: string
                    p_nivel_esperado: number
                    p_nivel: number
                    p_comentario: string
                }
                Returns: undefined
            }
        }
        Enums: {}
    }
}
