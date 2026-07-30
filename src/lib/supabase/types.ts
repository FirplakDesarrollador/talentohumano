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
                    // Información Personal
                    fecha_nacimiento: string | null
                    fecha_expedicion_cedula: string | null
                    tipo_sangre: string | null
                    // Información Laboral
                    primer_ingreso: string | null
                    nivel_cargo: string | null
                    locker: string | null
                    referido: string | null
                    // Información de Contacto
                    direccion: string | null
                    ciudad: string | null
                    telefono: string | null
                    celular: string | null
                    correo: string | null
                    contacto_emergencia: string | null
                    telefono_emergencia: string | null
                    // Información Familiar
                    tiene_esposo: boolean | null
                    nombre_esposo: string | null
                    num_hijos: number | null
                    hijo1_nombre: string | null
                    hijo1_nacimiento: string | null
                    hijo1_sexo: string | null
                    hijo2_nombre: string | null
                    hijo2_nacimiento: string | null
                    hijo2_sexo: string | null
                    hijo3_nombre: string | null
                    hijo3_nacimiento: string | null
                    hijo3_sexo: string | null
                    hijo4_nombre: string | null
                    hijo4_nacimiento: string | null
                    hijo4_sexo: string | null
                    // Información Educativa
                    nivel_educativo: string | null
                    ultimo_grado: string | null
                    actualmente_estudiando: boolean | null
                    que_estudia: string | null
                    // Información de Salud
                    tiene_recomendaciones_medicas: boolean | null
                    recomendaciones_medicas: string | null
                    enfermedades: string | null
                    consume_psicoactivas: string | null
                    consume_tabaco: string | null
                    consume_alcohol: string | null
                    realiza_deporte: string | null
                    // Movilidad
                    frecuencia_visita: string | null
                    medio_transporte: string | null
                    tipo_combustible: string | null
                    modelo_vehiculo: string | null
                    // Dotación
                    tipo_camisa: string | null
                    talla_camisa: string | null
                    tipo_pantalon: string | null
                    talla_pantalon: string | null
                    talla_chaleco: string | null
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
                    // Información Personal
                    fecha_nacimiento?: string | null
                    fecha_expedicion_cedula?: string | null
                    tipo_sangre?: string | null
                    // Información Laboral
                    primer_ingreso?: string | null
                    nivel_cargo?: string | null
                    locker?: string | null
                    referido?: string | null
                    // Información de Contacto
                    direccion?: string | null
                    ciudad?: string | null
                    telefono?: string | null
                    celular?: string | null
                    correo?: string | null
                    contacto_emergencia?: string | null
                    telefono_emergencia?: string | null
                    // Información Familiar
                    tiene_esposo?: boolean | null
                    nombre_esposo?: string | null
                    num_hijos?: number | null
                    hijo1_nombre?: string | null
                    hijo1_nacimiento?: string | null
                    hijo1_sexo?: string | null
                    hijo2_nombre?: string | null
                    hijo2_nacimiento?: string | null
                    hijo2_sexo?: string | null
                    hijo3_nombre?: string | null
                    hijo3_nacimiento?: string | null
                    hijo3_sexo?: string | null
                    hijo4_nombre?: string | null
                    hijo4_nacimiento?: string | null
                    hijo4_sexo?: string | null
                    // Información Educativa
                    nivel_educativo?: string | null
                    ultimo_grado?: string | null
                    actualmente_estudiando?: boolean | null
                    que_estudia?: string | null
                    // Información de Salud
                    tiene_recomendaciones_medicas?: boolean | null
                    recomendaciones_medicas?: string | null
                    enfermedades?: string | null
                    consume_psicoactivas?: string | null
                    consume_tabaco?: string | null
                    consume_alcohol?: string | null
                    realiza_deporte?: string | null
                    // Movilidad
                    frecuencia_visita?: string | null
                    medio_transporte?: string | null
                    tipo_combustible?: string | null
                    modelo_vehiculo?: string | null
                    // Dotación
                    tipo_camisa?: string | null
                    talla_camisa?: string | null
                    tipo_pantalon?: string | null
                    talla_pantalon?: string | null
                    talla_chaleco?: string | null
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
                    // Información Personal
                    fecha_nacimiento?: string | null
                    fecha_expedicion_cedula?: string | null
                    tipo_sangre?: string | null
                    // Información Laboral
                    primer_ingreso?: string | null
                    nivel_cargo?: string | null
                    locker?: string | null
                    referido?: string | null
                    // Información de Contacto
                    direccion?: string | null
                    ciudad?: string | null
                    telefono?: string | null
                    celular?: string | null
                    correo?: string | null
                    contacto_emergencia?: string | null
                    telefono_emergencia?: string | null
                    // Información Familiar
                    tiene_esposo?: boolean | null
                    nombre_esposo?: string | null
                    num_hijos?: number | null
                    hijo1_nombre?: string | null
                    hijo1_nacimiento?: string | null
                    hijo1_sexo?: string | null
                    hijo2_nombre?: string | null
                    hijo2_nacimiento?: string | null
                    hijo2_sexo?: string | null
                    hijo3_nombre?: string | null
                    hijo3_nacimiento?: string | null
                    hijo3_sexo?: string | null
                    hijo4_nombre?: string | null
                    hijo4_nacimiento?: string | null
                    hijo4_sexo?: string | null
                    // Información Educativa
                    nivel_educativo?: string | null
                    ultimo_grado?: string | null
                    actualmente_estudiando?: boolean | null
                    que_estudia?: string | null
                    // Información de Salud
                    tiene_recomendaciones_medicas?: boolean | null
                    recomendaciones_medicas?: string | null
                    enfermedades?: string | null
                    consume_psicoactivas?: string | null
                    consume_tabaco?: string | null
                    consume_alcohol?: string | null
                    realiza_deporte?: string | null
                    // Movilidad
                    frecuencia_visita?: string | null
                    medio_transporte?: string | null
                    tipo_combustible?: string | null
                    modelo_vehiculo?: string | null
                    // Dotación
                    tipo_camisa?: string | null
                    talla_camisa?: string | null
                    tipo_pantalon?: string | null
                    talla_pantalon?: string | null
                    talla_chaleco?: string | null
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
            s10_habilidades: {
                Row: {
                    id: number
                    empleado_id: number
                    cedula: number
                    gestion_integral: number
                    tecnica_estadistica: number
                    analisis_falla: number
                    cinco_s: number
                    liderazgo: number
                    bitacora: number
                    opt: number
                    opt_sis: number
                    rrc: number
                    qrqc: number
                    comentario: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: number
                    empleado_id: number
                    cedula: number
                    gestion_integral?: number
                    tecnica_estadistica?: number
                    analisis_falla?: number
                    cinco_s?: number
                    liderazgo?: number
                    bitacora?: number
                    opt?: number
                    opt_sis?: number
                    rrc?: number
                    qrqc?: number
                    comentario?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: number
                    empleado_id?: number
                    cedula?: number
                    gestion_integral?: number
                    tecnica_estadistica?: number
                    analisis_falla?: number
                    cinco_s?: number
                    liderazgo?: number
                    bitacora?: number
                    opt?: number
                    opt_sis?: number
                    rrc?: number
                    qrqc?: number
                    comentario?: string | null
                    created_at?: string | null
                    updated_at?: string | null
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
            novedades_nomina: {
                Row: {
                    id: string
                    created_at: string
                    empleado_id: number
                    concepto: string
                    tipo_cambio: string
                    actual: string | null
                    nuevo: string | null
                    capital: number | null
                    num_cuotas: number | null
                    periodicidad: string
                    mes_aplicacion: string
                    periodo: string
                    observacion: string | null
                    modified_at: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    empleado_id: number
                    concepto: string
                    tipo_cambio: string
                    actual?: string | null
                    nuevo?: string | null
                    capital?: number | null
                    num_cuotas?: number | null
                    periodicidad: string
                    mes_aplicacion: string
                    periodo: string
                    observacion?: string | null
                    modified_at?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    empleado_id?: number
                    concepto?: string
                    tipo_cambio?: string
                    actual?: string | null
                    nuevo?: string | null
                    capital?: number | null
                    num_cuotas?: number | null
                    periodicidad?: string
                    mes_aplicacion?: string
                    periodo?: string
                    observacion?: string | null
                    modified_at?: string | null
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
            usuarios: {
                Row: {
                    id: number
                    nombre: string
                    correo: string
                    rol: string
                    empleado_id: number | null
                    plantas: string[] | null
                }
                Insert: {
                    id?: number
                    nombre: string
                    correo: string
                    rol: string
                    empleado_id?: number | null
                    plantas?: string[] | null
                }
                Update: {
                    id?: number
                    nombre?: string
                    correo?: string
                    rol?: string
                    empleado_id?: number | null
                    plantas?: string[] | null
                }
            }
            aumentosSalariales: {
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
            Cesantias: {
                Row: {
                    id: number
                    Cedula: number | null
                    Nombre: string | null
                    "Tipo de Cesantias": string | null
                    Valor: string | null
                    Motivo: string | null
                    "Aprobación THT": string | null
                    Created: string | null
                    "¿Entregó soporte de pago?": boolean | null
                    Soporte: string[] | null
                    Soporte2: string | null
                    "SOPORTE RETIRO": string | null
                    Correo: string | null
                    Pagado: boolean
                    "Fecha Aprobación": string | null
                    "Recordatorio Soporte Enviado": boolean
                }
                Insert: {
                    id?: number
                    Cedula?: number | null
                    Nombre?: string | null
                    "Tipo de Cesantias"?: string | null
                    Valor?: string | null
                    Motivo?: string | null
                    "Aprobación THT"?: string | null
                    Created?: string | null
                    "¿Entregó soporte de pago?"?: boolean | null
                    Soporte?: string[] | null
                    Soporte2?: string | null
                    "SOPORTE RETIRO"?: string | null
                    Correo?: string | null
                    Pagado?: boolean
                    "Fecha Aprobación"?: string | null
                    "Recordatorio Soporte Enviado"?: boolean
                }
                Update: {
                    id?: number
                    Cedula?: number | null
                    Nombre?: string | null
                    "Tipo de Cesantias"?: string | null
                    Valor?: string | null
                    Motivo?: string | null
                    "Aprobación THT"?: string | null
                    Created?: string | null
                    "¿Entregó soporte de pago?"?: boolean | null
                    Soporte?: string[] | null
                    Soporte2?: string | null
                    "SOPORTE RETIRO"?: string | null
                    Correo?: string | null
                    Pagado?: boolean
                    "Fecha Aprobación"?: string | null
                    "Recordatorio Soporte Enviado"?: boolean
                }
            }
            Vacaciones: {
                Row: {
                    id: number
                    Cedula: number | null
                    Empleado_Que_Disfruta: string | null
                    "Creado por": string | null
                    "Fecha Solicitud": string | null
                    FechaInicial: string | null
                    FechaFinal: string | null
                    FechaIngreso: string | null
                    Departamento: string | null
                    "Nombre del Jefe": string | null
                    Aprobacion_Jefe: string | null
                    DiasEnTiempo: string | null
                    DiasEnDinero: string | null
                    TipoDePAgo: string | null
                    PersonaEncargada: string | null
                    ausentismo_registrado: boolean | null
                    correo: string | null
                    CorreoJefe: string | null
                }
                Insert: {
                    id?: number
                    Cedula?: number | null
                    Empleado_Que_Disfruta?: string | null
                    "Creado por"?: string | null
                    "Fecha Solicitud"?: string | null
                    FechaInicial?: string | null
                    FechaFinal?: string | null
                    FechaIngreso?: string | null
                    Departamento?: string | null
                    "Nombre del Jefe"?: string | null
                    Aprobacion_Jefe?: string | null
                    DiasEnTiempo?: string | null
                    DiasEnDinero?: string | null
                    TipoDePAgo?: string | null
                    PersonaEncargada?: string | null
                    ausentismo_registrado?: boolean | null
                    correo?: string | null
                    CorreoJefe?: string | null
                }
                Update: {
                    id?: number
                    Cedula?: number | null
                    Empleado_Que_Disfruta?: string | null
                    "Creado por"?: string | null
                    "Fecha Solicitud"?: string | null
                    FechaInicial?: string | null
                    FechaFinal?: string | null
                    FechaIngreso?: string | null
                    Departamento?: string | null
                    "Nombre del Jefe"?: string | null
                    Aprobacion_Jefe?: string | null
                    DiasEnTiempo?: string | null
                    DiasEnDinero?: string | null
                    TipoDePAgo?: string | null
                    PersonaEncargada?: string | null
                    ausentismo_registrado?: boolean | null
                    correo?: string | null
                    CorreoJefe?: string | null
                }
            }
            fase_H: {
                Row: {
                    id: number
                    empleado_id: number
                    cargo: string
                    created_at: string | null
                    created_by_id: number | null
                    modified_at: string | null
                    modified_by_id: number | null
                    induccion_th: boolean | null
                    induccion_th_fecha: string | null
                    induccion_th_responsable_id: number | null
                    induccion_planta: boolean | null
                    induccion_planta_fecha: string | null
                    induccion_planta_responsable_id: number | null
                    aros_seguridad: boolean | null
                    aros_seguridad_fecha: string | null
                    aros_seguridad_responsable_id: number | null
                    puesto_piloto: boolean | null
                    puesto_piloto_fecha: string | null
                    puesto_piloto_responsable_id: number | null
                    explicacion_puesto: boolean | null
                    explicacion_puesto_fecha: string | null
                    explicacion_puesto_responsable_id: number | null
                    observacion_puesto: boolean | null
                    observacion_puesto_fecha: string | null
                    observacion_puesto_responsable_id: number | null
                    comentario: string | null
                    fecha_finalizacion_fase: string | null
                    firma_empleado: string | null
                    firma_supervisor: string | null
                    completado: boolean | null
                    evidencias: string[] | null
                    curso_5s: boolean | null
                }
                Insert: {
                    id?: number
                    empleado_id: number
                    cargo: string
                    created_at?: string | null
                    created_by_id?: number | null
                    modified_at?: string | null
                    modified_by_id?: number | null
                    induccion_th?: boolean | null
                    induccion_th_fecha?: string | null
                    induccion_th_responsable_id?: number | null
                    induccion_planta?: boolean | null
                    induccion_planta_fecha?: string | null
                    induccion_planta_responsable_id?: number | null
                    aros_seguridad?: boolean | null
                    aros_seguridad_fecha?: string | null
                    aros_seguridad_responsable_id?: number | null
                    puesto_piloto?: boolean | null
                    puesto_piloto_fecha?: string | null
                    puesto_piloto_responsable_id?: number | null
                    explicacion_puesto?: boolean | null
                    explicacion_puesto_fecha?: string | null
                    explicacion_puesto_responsable_id?: number | null
                    observacion_puesto?: boolean | null
                    observacion_puesto_fecha?: string | null
                    observacion_puesto_responsable_id?: number | null
                    comentario?: string | null
                    fecha_finalizacion_fase?: string | null
                    firma_empleado?: string | null
                    firma_supervisor?: string | null
                    completado?: boolean | null
                    evidencias?: string[] | null
                    curso_5s?: boolean | null
                }
                Update: {
                    id?: number
                    empleado_id?: number
                    cargo?: string
                    created_at?: string | null
                    created_by_id?: number | null
                    modified_at?: string | null
                    modified_by_id?: number | null
                    induccion_th?: boolean | null
                    induccion_th_fecha?: string | null
                    induccion_th_responsable_id?: number | null
                    induccion_planta?: boolean | null
                    induccion_planta_fecha?: string | null
                    induccion_planta_responsable_id?: number | null
                    aros_seguridad?: boolean | null
                    aros_seguridad_fecha?: string | null
                    aros_seguridad_responsable_id?: number | null
                    puesto_piloto?: boolean | null
                    puesto_piloto_fecha?: string | null
                    puesto_piloto_responsable_id?: number | null
                    explicacion_puesto?: boolean | null
                    explicacion_puesto_fecha?: string | null
                    explicacion_puesto_responsable_id?: number | null
                    observacion_puesto?: boolean | null
                    observacion_puesto_fecha?: string | null
                    observacion_puesto_responsable_id?: number | null
                    comentario?: string | null
                    fecha_finalizacion_fase?: string | null
                    firma_empleado?: string | null
                    firma_supervisor?: string | null
                    completado?: boolean | null
                    evidencias?: string[] | null
                    curso_5s?: boolean | null
                }
            }
            fase_I: {
                Row: {
                    id: number
                    empleado_id: number
                    cargo: string
                    created_at: string | null
                    created_by_id: number | null
                    modified_at: string | null
                    modified_by_id: number | null
                    actitud: number | null
                    aprendizaje: number | null
                    destreza: number | null
                    conocimiento: number | null
                    calificaciones_fecha: string | null
                    calificaciones_responsable_id: number | null
                    titular: boolean | null
                    estandar_hdt: boolean | null
                    estandar_hdt_fecha: string | null
                    estandar_hdt_responsable_id: number | null
                    entrenamiento_calidad: boolean | null
                    entrenamiento_calidad_fecha: string | null
                    entrenamiento_calidad_responsable_id: number | null
                    hace_acompanado: boolean | null
                    hace_acompanado_fecha: string | null
                    hace_acompanado_responsable_id: number | null
                    hace_solo: boolean | null
                    hace_solo_fecha: string | null
                    hace_solo_responsable_id: number | null
                    entrenado_por: string | null
                    detalles: Json | null
                    comentario: string | null
                    fecha_finalizacion_fase: string | null
                    firma_empleado: string | null
                    firma_supervisor: string | null
                    completado: boolean | null
                    evidencias: string[] | null
                    curso_5s: boolean | null
                }
                Insert: {
                    id?: number
                    empleado_id: number
                    cargo: string
                    created_at?: string | null
                    created_by_id?: number | null
                    modified_at?: string | null
                    modified_by_id?: number | null
                    actitud?: number | null
                    aprendizaje?: number | null
                    destreza?: number | null
                    conocimiento?: number | null
                    calificaciones_fecha?: string | null
                    calificaciones_responsable_id?: number | null
                    titular?: boolean | null
                    estandar_hdt?: boolean | null
                    estandar_hdt_fecha?: string | null
                    estandar_hdt_responsable_id?: number | null
                    entrenamiento_calidad?: boolean | null
                    entrenamiento_calidad_fecha?: string | null
                    entrenamiento_calidad_responsable_id?: number | null
                    hace_acompanado?: boolean | null
                    hace_acompanado_fecha?: string | null
                    hace_acompanado_responsable_id?: number | null
                    hace_solo?: boolean | null
                    hace_solo_fecha?: string | null
                    hace_solo_responsable_id?: number | null
                    entrenado_por?: string | null
                    detalles?: Json | null
                    comentario?: string | null
                    fecha_finalizacion_fase?: string | null
                    firma_empleado?: string | null
                    firma_supervisor?: string | null
                    completado?: boolean | null
                    evidencias?: string[] | null
                    curso_5s?: boolean | null
                }
                Update: {
                    id?: number
                    empleado_id?: number
                    cargo?: string
                    created_at?: string | null
                    created_by_id?: number | null
                    modified_at?: string | null
                    modified_by_id?: number | null
                    actitud?: number | null
                    aprendizaje?: number | null
                    destreza?: number | null
                    conocimiento?: number | null
                    calificaciones_fecha?: string | null
                    calificaciones_responsable_id?: number | null
                    titular?: boolean | null
                    estandar_hdt?: boolean | null
                    estandar_hdt_fecha?: string | null
                    estandar_hdt_responsable_id?: number | null
                    entrenamiento_calidad?: boolean | null
                    entrenamiento_calidad_fecha?: string | null
                    entrenamiento_calidad_responsable_id?: number | null
                    hace_acompanado?: boolean | null
                    hace_acompanado_fecha?: string | null
                    hace_acompanado_responsable_id?: number | null
                    hace_solo?: boolean | null
                    hace_solo_fecha?: string | null
                    hace_solo_responsable_id?: number | null
                    entrenado_por?: string | null
                    detalles?: Json | null
                    comentario?: string | null
                    fecha_finalizacion_fase?: string | null
                    firma_empleado?: string | null
                    firma_supervisor?: string | null
                    completado?: boolean | null
                    evidencias?: string[] | null
                    curso_5s?: boolean | null
                }
            }
            fase_L: {
                Row: {
                    id: number
                    empleado_id: number
                    cargo: string
                    created_at: string | null
                    created_by_id: number | null
                    modified_at: string | null
                    modified_by_id: number | null
                    cumple_calidad: boolean | null
                    cumple_estandar: boolean | null
                    cumple_tiempo: boolean | null
                    detalles: Json | null
                    comentario: string | null
                    fecha_finalizacion_fase: string | null
                    firma_empleado: string | null
                    firma_supervisor: string | null
                    completado: boolean | null
                    evidencias: string[] | null
                }
                Insert: {
                    id?: number
                    empleado_id: number
                    cargo: string
                    created_at?: string | null
                    created_by_id?: number | null
                    modified_at?: string | null
                    modified_by_id?: number | null
                    cumple_calidad?: boolean | null
                    cumple_estandar?: boolean | null
                    cumple_tiempo?: boolean | null
                    detalles?: Json | null
                    comentario?: string | null
                    fecha_finalizacion_fase?: string | null
                    firma_empleado?: string | null
                    firma_supervisor?: string | null
                    completado?: boolean | null
                    evidencias?: string[] | null
                }
                Update: {
                    id?: number
                    empleado_id?: number
                    cargo?: string
                    created_at?: string | null
                    created_by_id?: number | null
                    modified_at?: string | null
                    modified_by_id?: number | null
                    cumple_calidad?: boolean | null
                    cumple_estandar?: boolean | null
                    cumple_tiempo?: boolean | null
                    detalles?: Json | null
                    comentario?: string | null
                    fecha_finalizacion_fase?: string | null
                    firma_empleado?: string | null
                    firma_supervisor?: string | null
                    completado?: boolean | null
                    evidencias?: string[] | null
                }
            }
            fase_U: {
                Row: {
                    id: number
                    empleado_id: number
                    cargo: string
                    created_at: string | null
                    created_by_id: number | null
                    modified_at: string | null
                    modified_by_id: number | null
                    capacitado_para_entrenar: boolean | null
                    entrena_solo: boolean | null
                    acompana_entrenamientos: boolean | null
                    detalles: Json | null
                    comentario: string | null
                    fecha_finalizacion_fase: string | null
                    firma_empleado: string | null
                    firma_supervisor: string | null
                    completado: boolean | null
                    evidencias: string[] | null
                }
                Insert: {
                    id?: number
                    empleado_id: number
                    cargo: string
                    created_at?: string | null
                    created_by_id?: number | null
                    modified_at?: string | null
                    modified_by_id?: number | null
                    capacitado_para_entrenar?: boolean | null
                    entrena_solo?: boolean | null
                    acompana_entrenamientos?: boolean | null
                    detalles?: Json | null
                    comentario?: string | null
                    fecha_finalizacion_fase?: string | null
                    firma_empleado?: string | null
                    firma_supervisor?: string | null
                    completado?: boolean | null
                    evidencias?: string[] | null
                }
                Update: {
                    id?: number
                    empleado_id?: number
                    cargo?: string
                    created_at?: string | null
                    created_by_id?: number | null
                    modified_at?: string | null
                    modified_by_id?: number | null
                    capacitado_para_entrenar?: boolean | null
                    entrena_solo?: boolean | null
                    acompana_entrenamientos?: boolean | null
                    detalles?: Json | null
                    comentario?: string | null
                    fecha_finalizacion_fase?: string | null
                    firma_empleado?: string | null
                    firma_supervisor?: string | null
                    completado?: boolean | null
                    evidencias?: string[] | null
                }
            }
            auditorias: {
                Row: {
                    id: number
                    empleado_id: number
                    cargo: string
                    created_at: string
                    created_by: number
                    modified_at: string
                    modified_by: number
                    cumple: boolean
                    comentario: string
                }
                Insert: {
                    id?: number
                    empleado_id: number
                    cargo: string
                    created_at?: string
                    created_by: number
                    modified_at?: string
                    modified_by: number
                    cumple: boolean
                    comentario: string
                }
                Update: {
                    id?: number
                    empleado_id?: number
                    cargo?: string
                    created_at?: string
                    created_by?: number
                    modified_at?: string
                    modified_by?: number
                    cumple?: boolean
                    comentario?: string
                }
            }
            reentrenamientos: {
                Row: {
                    id: number
                    empleado_id: number
                    cargo: string
                    created_at: string
                    created_by: number
                    firma_empleado: string | null
                    firma_supervisor: string | null
                    comentario: string
                    reentrenado_por: string
                    horas: number
                    fecha_inicio: string | null
                    fecha_fin: string | null
                    motivo: string | null
                    completado: boolean | null
                }
                Insert: {
                    id?: number
                    empleado_id: number
                    cargo: string
                    created_at?: string
                    created_by: number
                    firma_empleado?: string | null
                    firma_supervisor?: string | null
                    comentario: string
                    reentrenado_por: string
                    horas: number
                    fecha_inicio?: string | null
                    fecha_fin?: string | null
                    motivo?: string | null
                    completado?: boolean | null
                }
                Update: {
                    id?: number
                    empleado_id?: number
                    cargo?: string
                    created_at?: string
                    created_by?: number
                    firma_empleado?: string | null
                    firma_supervisor?: string | null
                    comentario?: string
                    reentrenado_por?: string
                    horas?: number
                    fecha_inicio?: string | null
                    fecha_fin?: string | null
                    motivo?: string | null
                    completado?: boolean | null
                }
            }
        }
        Views: {
            personalconjefe_api: {
                Row: {
                    id: number
                    cedula: number
                    dias_pendientes: number
                    nombre_completo: string
                    cargo: string | null
                    planta: string | null
                    jefe: string | null
                    foto: string | null
                    empresa: string | null
                }
            }
            query_estado_hilu: {
                Row: {
                    id: number
                    nombreCompleto: string
                    cargo: string | null
                    planta: string | null
                    jefe: string | null
                    empresa: string | null
                    activo: boolean | null
                    area: string | null
                    nivelCargo: string | null
                    modified_at: string | null
                    modified_by: number | null
                    foto: string | null
                    cargo_id: number | null
                    fh_completado: boolean | null
                    fi_completado: boolean | null
                    fl_completado: boolean | null
                    fu_completado: boolean | null
                    ultima_auditoria: boolean | null
                }
            }
            query_hilu: {
                Row: {
                    cedula: number
                    nombreCompleto: string
                    cargo: string | null
                    planta: string | null
                    jefe: string | null
                    activo: boolean | null
                    cargo_titular: string | null
                    // Fase H fields
                    fh_id: number | null
                    fh_created_at: string | null
                    fh_created_by_id: number | null
                    fh_created_by_nombre: string | null
                    fh_modified_at: string | null
                    fh_modified_by_id: number | null
                    fh_modified_by_nombre: string | null
                    fh_induccion_th: boolean | null
                    fh_induccion_th_fecha: string | null
                    fh_induccion_th_responsable_id: number | null
                    fh_induccion_th_responsable_nombre: string | null
                    fh_induccion_planta: boolean | null
                    fh_induccion_planta_fecha: string | null
                    fh_induccion_planta_responsable_id: number | null
                    fh_induccion_planta_responsable_nombre: string | null
                    fh_aros_seguridad: boolean | null
                    fh_aros_seguridad_fecha: string | null
                    fh_aros_seguridad_responsable_id: number | null
                    fh_aros_seguridad_responsable_nombre: string | null
                    fh_puesto_piloto: boolean | null
                    fh_puesto_piloto_fecha: string | null
                    fh_puesto_piloto_responsable_id: number | null
                    fh_explicacion_puesto: boolean | null
                    fh_explicacion_puesto_fecha: string | null
                    fh_explicacion_puesto_responsable_id: number | null
                    fh_explicacion_puesto_responsable_nombre: string | null
                    fh_explicacion_puesto_responsable_correo: string | null
                    fh_observacion_puesto: boolean | null
                    fh_observacion_puesto_fecha: string | null
                    fh_observacion_puesto_responsable_id: number | null
                    fh_observacion_puesto_responsable_nombre: string | null
                    fh_observacion_puesto_responsable_correo: string | null
                    fh_comentario: string | null
                    fh_fecha_finalizacion_fase: string | null
                    fh_cargo: string | null
                    fh_firma_empleado: string | null
                    fh_firma_supervisor: string | null
                    fh_completado: boolean | null
                    fh_evidencias: string[] | null
                    fh_avance: number | null
                    fh_dias_transcurridos: number | null
                    fh_curso_5s: boolean | null
                    // Fase I fields
                    fi_id: number | null
                    fi_created_at: string | null
                    fi_created_by_id: number | null
                    fi_created_by_nombre: string | null
                    fi_modified_at: string | null
                    fi_modified_by_id: number | null
                    fi_modified_by_nombre: string | null
                    fi_actitud: number | null
                    fi_aprendizaje: number | null
                    fi_destreza: number | null
                    fi_conocimiento: number | null
                    fi_calificaciones_fecha: string | null
                    fi_calificaciones_responsable_id: number | null
                    fi_calificaciones_responsable_nombre: string | null
                    fi_titular: boolean | null
                    fi_estandar_hdt: boolean | null
                    fi_estandar_hdt_fecha: string | null
                    fi_estandar_hdt_responsable_id: number | null
                    fi_estandar_hdt_responsable_nombre: string | null
                    fi_entrenamiento_calidad: boolean | null
                    fi_mantenimiento_autonomo: boolean | null
                    fi_entrenamiento_calidad_fecha: string | null
                    fi_entrenamiento_calidad_responsable_id: number | null
                    fi_entrenamiento_calidad_responsable_nombre: string | null
                    fi_hace_acompanado: boolean | null
                    fi_hace_acompanado_fecha: string | null
                    fi_hace_acompanado_responsable_id: number | null
                    fi_hace_acompanado_responsable_nombre: string | null
                    fi_hace_solo: boolean | null
                    fi_hace_solo_fecha: string | null
                    fi_hace_solo_responsable_id: number | null
                    fi_hace_solo_responsable_nombre: string | null
                    fi_entrenado_por: string | null
                    fi_detalles: Json | null
                    fi_comentario: string | null
                    fi_fecha_finalizacion_fase: string | null
                    fi_firma_empleado: string | null
                    fi_firma_supervisor: string | null
                    fi_completado: boolean | null
                    fi_evidencias: string[] | null
                    fi_avance: number | null
                    fi_dias_transcurridos: number | null
                    fi_calificacion: number | null
                    fi_curso_5s: boolean | null
                    // Fase L fields
                    fl_id: number | null
                    fl_created_at: string | null
                    fl_created_by_id: number | null
                    fl_created_by_nombre: string | null
                    fl_modified_at: string | null
                    fl_modified_by_id: number | null
                    fl_modified_by_nombre: string | null
                    fl_cumple_calidad: boolean | null
                    fl_cumple_estandar: boolean | null
                    fl_cumple_mantenimiento_autonomo: boolean | null
                    fl_cumple_tiempo: boolean | null
                    fl_detalles: Json | null
                    fl_comentario: string | null
                    fl_fecha_finalizacion_fase: string | null
                    fl_firma_empleado: string | null
                    fl_firma_supervisor: string | null
                    fl_completado: boolean | null
                    fl_evidencias: string[] | null
                    fl_avance: number | null
                    fl_dias_transcurridos: number | null
                    // Fase U fields
                    fu_id: number | null
                    fu_created_at: string | null
                    fu_created_by_id: number | null
                    fu_created_by_nombre: string | null
                    fu_modified_at: string | null
                    fu_modified_by_id: number | null
                    fu_modified_by_nombre: string | null
                    fu_capacitado_para_entrenar: boolean | null
                    fu_entrena_solo: boolean | null
                    fu_acompana_entrenamientos: boolean | null
                    fu_detalles: Json | null
                    fu_comentario: string | null
                    fu_fecha_finalizacion_fase: string | null
                    fu_firma_empleado: string | null
                    fu_firma_supervisor: string | null
                    fu_completado: boolean | null
                    fu_evidencias: string[] | null
                    fu_avance: number | null
                    fu_dias_transcurridos: number | null
                    // Totals
                    total_dias_entrenamiento: number | null
                }
            }
        }
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
