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
];

/**
 * Group of supervisors that can only see and partially edit employees from Calidad.
 */
export const SUPERVISORES_CALIDAD = [
    'supervisorcalidad3@firplak.com',
    'supervisorcalidad2@firplak.com',
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
 * Combined list of supervisors with restricted editing permissions (only Laboral & Dotación).
 */
export const RESTRICTED_SUPERVISORS = [
    ...SUPERVISORES_MUEBLES_CEFI,
    ...SUPERVISORES_CALIDAD,
    ...SUPERVISORES_MARMOL,
    ...SUPERVISORES_ALMACEN_CEDI,
];

/**
 * Emails of users with full administrative privileges.
 * These emails override the 'nivelCargo' logic.
 */
export const ADMIN_EMAILS = [
    'aprendiz.desarrollo@firplak.com',
    'angie.zapata@firplak.com',
    'talentos@firplak.com',
    'camila.jimenez@firplak.com',
    'renata.lainez@firplak.com',
    'analista2.desarrollo@firplak.com',
    'alejandro.isaza@firplak.com',
    'daniel.jimenez@firplak.com',
    'juan.bedoya@firplak.com'
];

// For backward compatibility during migration
export const ROLES = NIVELES_CARGO;
export const ADMIN_ROLES = ADMIN_LEVELS;
export const APPROVER_ROLES = APPROVER_LEVELS;
