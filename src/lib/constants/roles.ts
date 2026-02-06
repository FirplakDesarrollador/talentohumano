/**
 * Centralized role definitions for the application.
 * Values are based on the database 'usuarios' table roles.
 */
export const ROLES = {
    ANALISTA: 'analista',
    ADMIN: 'admin',
    COORDINADOR: 'coordinador',
    DESARROLLADOR: 'desarrollador',
    DIRECTOR: 'director',
    GERENTE: 'gerente',
    JEFE: 'jefe',
    SUPERVISOR: 'supervisor',
    VISITANTE: 'visitante',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Roles that have administrative privileges.
 */
export const ADMIN_ROLES: Role[] = [
    ROLES.ADMIN,
    ROLES.DESARROLLADOR,
];

/**
 * Roles that can approve salary increases.
 */
export const APPROVER_ROLES: Role[] = [
    ROLES.JEFE,
    ROLES.DIRECTOR,
    ROLES.COORDINADOR,
    ROLES.GERENTE,
];
