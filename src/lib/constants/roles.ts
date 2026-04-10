/**
 * Centralized levels (formerly roles) definitions for the application.
 * Based on the 'nivelCargo' column in the 'empleados' table.
 */
export const NIVELES_CARGO = {
    COORDINADOR: 'Coordinador',
    JEFE: 'Jefe',
    GERENTE: 'Gerente',
    DIRECTOR: 'Director',
    OPERATIVO: 'Operativo',
    AUXILIAR: 'Auxiliar',
    ANALISTA: 'Analista',
    ESPECIALISTA: 'Especialista',
    PRACTICANTE: 'Practicante',
    TECNICO: 'Técnico',
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
    NIVELES_CARGO.DIRECTOR,
    NIVELES_CARGO.GERENTE,
    NIVELES_CARGO.COORDINADOR,
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
];

// For backward compatibility during migration
export const ROLES = NIVELES_CARGO;
export const ADMIN_ROLES = ADMIN_LEVELS;
export const APPROVER_ROLES = APPROVER_LEVELS;
