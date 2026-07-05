/**
 * Centralized levels (formerly roles) definitions for the application.
 * Based on the 'nivelCargo' column in the 'empleados' table.
 */
export const NIVELES_CARGO = {
    COORDINADOR: 'Coordinador',
    JEFE: 'Jefe',
    SUPERVISOR: 'Supervisor',
    GERENTE: 'Gerente',
    DIRECTOR: 'Director',
    OPERARIO: 'Operario',
    AUXILIAR: 'Auxiliar',
    ANALISTA: 'Analista',
    ESPECIALISTA: 'Especialista',
    PRACTICANTE: 'Practicante',
    TECNICO: 'Tecnico',
    PROMOTOR: 'Promotor',
    ASESOR: 'Asesor',
} as const;

export type NivelCargo = (typeof NIVELES_CARGO)[keyof typeof NIVELES_CARGO];

/**
 * Levels that have administrative privileges within the app modules.
 * Now restricted to specific emails ONLY.
 */
export const ADMIN_LEVELS: NivelCargo[] = [];

/**
 * Levels that can approve requests.
 * Used for general permissions and approval flows.
 */
export const APPROVER_LEVELS: NivelCargo[] = [
    NIVELES_CARGO.JEFE,
    NIVELES_CARGO.SUPERVISOR,
    NIVELES_CARGO.DIRECTOR,
    NIVELES_CARGO.GERENTE,
    NIVELES_CARGO.COORDINADOR,
    NIVELES_CARGO.ANALISTA,
    NIVELES_CARGO.ESPECIALISTA,
    NIVELES_CARGO.PRACTICANTE,
    NIVELES_CARGO.TECNICO,
    NIVELES_CARGO.PROMOTOR,
    NIVELES_CARGO.ASESOR,
];

/**
 * Levels that can access the Salary Increase module.
 * Restricted to: Coordinador, Jefe, Director, Gerente.
 */
export const AUMENTOS_SALARIALES_LEVELS: NivelCargo[] = [
    NIVELES_CARGO.COORDINADOR,
    NIVELES_CARGO.JEFE,
    NIVELES_CARGO.DIRECTOR,
    NIVELES_CARGO.GERENTE,
];

/**
 * Levels that can access the Ausentismos module.
 * Restricted to: Coordinador, Jefe, Supervisor, Gerente, Director.
 */
export const AUSENTISMOS_LEVELS: NivelCargo[] = [
    NIVELES_CARGO.COORDINADOR,
    NIVELES_CARGO.JEFE,
    NIVELES_CARGO.SUPERVISOR,
    NIVELES_CARGO.GERENTE,
    NIVELES_CARGO.DIRECTOR,
];

/**
 * Levels that can access the Procesos Disciplinarios module.
 * Restricted to: Coordinador, Jefe, Supervisor, Gerente, Director.
 */
export const PROCESOS_DISCIPLINARIOS_LEVELS: NivelCargo[] = [
    NIVELES_CARGO.COORDINADOR,
    NIVELES_CARGO.JEFE,
    NIVELES_CARGO.SUPERVISOR,
    NIVELES_CARGO.GERENTE,
    NIVELES_CARGO.DIRECTOR,
];

/**
 * Emails explicitly permitted to access the Procesos Disciplinarios module,
 * regardless of their nivelCargo.
 */
export const PROCESOS_DISCIPLINARIOS_EMAILS = [
    'luz.echeverri@firplak.com',
    'brian.sanchez@firplak.com',
];

/**
 * Levels with access to the Gestor de Personal module.
 * Roles NOT included will not see the module at all.
 * Excluded: Operario, Gerente, Auxiliar, Especialista, Practicante, Tecnico, Promotor, Asesor
 */
export const GESTOR_LEVELS: NivelCargo[] = [
    NIVELES_CARGO.JEFE,
    NIVELES_CARGO.SUPERVISOR,
    NIVELES_CARGO.DIRECTOR,
    NIVELES_CARGO.COORDINADOR,
    NIVELES_CARGO.ANALISTA,
];

/**
 * Emails explicitly blocked from the Gestor de Personal module,
 * regardless of their nivelCargo.
 */
export const GESTOR_EXCLUDED_EMAILS = [
    'pablo.carrizosa@firplak.com',
];

/**
 * Group of supervisors that can only see and partially edit employees from Muebles and Cefi.
 */
export const SUPERVISORES_MUEBLES_CEFI = [
    'supervisorproduccion@firplak.com',
    'alejandro.gonzalez@firplak.com',
    'juan.montoya@firplak.com',
    'supervisorcalidad@firplak.com'
];

/**
 * Group of supervisors that can only see and partially edit employees from Calidad.
 */
export const SUPERVISORES_CALIDAD = [
    'supervisorcalidad3@firplak.com',
    'supervisorcalidad2@firplak.com',
    'supervisorcalidad@firplak.com'
];

/**
 * Group of supervisors that can only see and partially edit employees from Marmol Sintetico.
 */
export const SUPERVISORES_MARMOL = [
    'supervisorcalidad@firplak.com',
    'osnar.mejia@firplak.com',
    'dimer.vergara@firplak.com',
];

/**
 * Group of supervisors that can only see and partially edit employees from Almacen and CEDI.
 */
export const SUPERVISORES_ALMACEN_CEDI = [
    'arley.taborda@firplak.com',
    'almacen@firplak.com',
];

/**
 * Group of supervisors that can only see and partially edit employees from RTM and Fibra de vidrio.
 */
export const SUPERVISORES_RTM_FIBRA = [
    'david.ramirez@firplak.com',
];

/**
 * Combined list of supervisors with restricted editing permissions (only Laboral & DotaciÃ³n).
 */
export const RESTRICTED_SUPERVISORS = [
    ...SUPERVISORES_MUEBLES_CEFI,
    ...SUPERVISORES_CALIDAD,
    ...SUPERVISORES_MARMOL,
    ...SUPERVISORES_ALMACEN_CEDI,
    ...SUPERVISORES_RTM_FIBRA,
];

/**
 * Coordinators explicitly permitted to access the Gestor de Personal module.
 * These three emails can only see employees from the listed plants.
 * All other Coordinators are blocked from the module by default.
 */
export const COORDINADORES_CON_ACCESO = [
    'jakeline.chaverra@firplak.com',
    'estiven.londono@firplak.com',
    'maria.perez@firplak.com',
];

export const PLANTAS_COORDINADORES_PERMITIDAS = [
    'Calidad',
    'Moldes',
    'RTM',
    'RR Moldes',
    'Muebles',
    'Marmol sintetico',
    'Fibra de vidrio',
    'Cefi',
];

/**
 * Jefes explicitly permitted to access the Gestor de Personal module.
 * All other Jefes are blocked by default.
 * These users have the same plant access as coordinacioncalidad.
 */
export const JEFES_CON_ACCESO = [
    'coordinacioncalidad@firplak.com',
];

/**
 * Jefes with access restricted to Muebles and Cefi only.
 */
export const JEFES_MUEBLES_CEFI = [
    'juliana.ramirez@firplak.com',
];

/**
 * Jefes with access restricted to Almacen and CEDI only.
 */
export const JEFES_ALMACEN_CEDI = [
    'analistaabastecimiento@firplak.com',
];

/**
 * Jefes with access restricted to Ingenieria and Moldes only.
 */
export const JEFES_INGENIERIA_MOLDES = [
    'sara.aguilar@firplak.com',
];

/**
 * Non-supervisor employees explicitly granted access to the HILU Operativa
 * module, restricted to viewing/editing (phases H, I, L — not U) employees
 * from the Moldes plant only.
 */
export const HILU_OPERATIVA_RESTRINGIDA_MOLDES = [
    'brian.sanchez@firplak.com',
];

/**
 * Non-supervisor employees granted the same Jefe-tier module access as
 * JEFES_INGENIERIA_MOLDES (Gestor de Personal, Ausentismos, Procesos
 * Disciplinarios, Aumentos Salariales), but restricted to the Moldes plant only.
 */
export const JEFES_MOLDES = [
    'brian.sanchez@firplak.com',
];

/**
 * Directors explicitly permitted to access the Gestor de Personal module.
 * All other Directors are blocked by default.
 */
export const DIRECTORES_CON_ACCESO = [
    'hector.chinchilla@firplak.com',
];

export const PLANTAS_DIRECTORES_PERMITIDAS = [
    'Calidad', 'Cefi', 'Fibra de vidrio', 'Mantenimiento', 'Manufactura',
    'Marmol sintetico', 'Moldes', 'Muebles', 'Produccion', 'RR Moldes', 'RTM',
];

/**
 * Analistas explicitly permitted to access the Gestor de Personal module.
 * These can only VIEW the employee list â€” they cannot open individual records.
 * All other Analistas are blocked by default.
 */
export const ANALISTAS_CON_ACCESO = [
    'diana.morales@firplak.com',
    'marcela.gomez@firplak.com',
];

/**
 * Emails of users with full administrative privileges.
 * These emails override the 'nivelCargo' logic.
 */
export const ADMIN_EMAILS = [
    'milton.rendon@firplak.com',
    'angie.zapata@firplak.com',
    'talentos@firplak.com',
    'camila.jimenez@firplak.com',
    'renata.lainez@firplak.com',
    'analista2.desarrollo@firplak.com',
    'alejandro.isaza@firplak.com',
    'daniel.jimenez@firplak.com',
    'juan.bedoya@firplak.com'
];

/**
 * Emails of super administrators with access to sensitive modules
 * like the Admin Planner Dashboard integration.
 * Subset of ADMIN_EMAILS.
 */
export const SUPER_ADMIN_EMAILS = [
    'milton.rendon@firplak.com',
    'angie.zapata@firplak.com',
];

// For backward compatibility during migration
export const ROLES = NIVELES_CARGO;
export const ADMIN_ROLES = ADMIN_LEVELS;
export const APPROVER_ROLES = APPROVER_LEVELS;

/**
 * Gets the list of plants a supervisor is allowed to see/edit.
 * Returns null if the user has no plant-based restrictions.
 */
export function getPlantasPermitidas(email: string): string[] | null {
    if (email === 'hector.chinchilla@firplak.com') return null;
    // estiven.londono tiene visibilidad total para ver coordinadores, directores y jefes de todas las plantas
    if (email === 'estiven.londono@firplak.com') return null;
    if (SUPERVISORES_MUEBLES_CEFI.includes(email)) return ['Muebles', 'Cefi'];
    if (SUPERVISORES_CALIDAD.includes(email)) return ['Calidad'];
    if (SUPERVISORES_MARMOL.includes(email)) return ['Marmol sintetico'];
    if (SUPERVISORES_ALMACEN_CEDI.includes(email)) return ['Almacen', 'CEDI'];
    if (SUPERVISORES_RTM_FIBRA.includes(email)) {
        if (email === 'david.ramirez@firplak.com') return ['RTM', 'Fibra de vidrio', 'Marmol sintetico'];
        return ['RTM', 'Fibra de vidrio'];
    }
    if (COORDINADORES_CON_ACCESO.includes(email)) return PLANTAS_COORDINADORES_PERMITIDAS;
    if (JEFES_CON_ACCESO.includes(email)) return PLANTAS_COORDINADORES_PERMITIDAS;
    if (JEFES_MUEBLES_CEFI.includes(email)) return ['Muebles', 'Cefi'];
    if (JEFES_ALMACEN_CEDI.includes(email)) return ['Almacen', 'CEDI'];
    if (JEFES_INGENIERIA_MOLDES.includes(email)) return ['Ingenieria', 'Moldes'];
    if (JEFES_MOLDES.includes(email)) return ['Moldes'];
    if (DIRECTORES_CON_ACCESO.includes(email)) return PLANTAS_DIRECTORES_PERMITIDAS;
    return null;
}

export const AREAS_ADMINISTRATIVAS = [
    'Contabilidad', 'Financiera', 'Legal', 'TI',
    'Talento y Cultura', 'Negociacion y compras',
    'Mercadeo', 'Servicios', 'I+D+I', 'Logistica',
    'Manufactura', 'Comercial'
];
