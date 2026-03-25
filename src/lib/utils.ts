import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { parse, isValid, differenceInDays } from "date-fns"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * FF-Ported: Returns a part of the string between startIdx and endIdx.
 */
export function substring(originalString: string, startIdx: number, endIdx: number): string {
    if (!originalString) return "";
    return originalString.substring(startIdx, endIdx);
}

/**
 * FF-Ported: Removes accents/tildes and replaces spaces with underscores.
 */
export function eliminarAcentos(palabra: string): string {
    if (!palabra) return "";
    const reemplazos: Record<string, string> = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
        'ñ': 'n', 'Ñ': 'N',
        ' ': '_',
    };
    const regex = new RegExp(`[${Object.keys(reemplazos).join('')}]`, 'g');
    return palabra.replace(regex, (match) => reemplazos[match] || match);
}

/**
 * FF-Ported: Returns a string representation of a list of objects.
 */
export function rowToString(data: any[]): string {
    if (!data) return "";
    return JSON.stringify(data);
}

/**
 * FF-Ported: Returns the length of the text plus an offset.
 */
export function lenString(texto: string, offset: number): number {
    if (!texto) return offset;
    return texto.length + offset;
}

/**
 * FF-Ported: Validates if a password is secure according to specific company rules.
 */
export function validarClaveSegura(clave: string): boolean {
    if (!clave || clave.length < 12) {
        return false;
    }

    // Ported regex from FF:
    // - Special characters
    // - Number
    // - Uppercase
    // - Lowercase
    // - Forbid specific keywords (firplak, talento, 1234, etc.)
    const specialCharRegex = /[!@#$%^&*()_+{}\[\]:;<>,.?"~`\-=/\\|]/;
    const numberRegex = /[0-9]/;
    const upperRegex = /[A-Z]/;
    const lowerRegex = /[a-z]/;
    const forbiddenKeywords = /firplak|talento|1234|FIRPLAK|TALENTO|clave|Firplak|123|firpla|Firpla|humano|talent|human/i;

    if (!specialCharRegex.test(clave)) return false;
    if (!numberRegex.test(clave)) return false;
    if (!upperRegex.test(clave)) return false;
    if (!lowerRegex.test(clave)) return false;
    if (forbiddenKeywords.test(clave)) return false;

    return true;
}

/**
 * FF-Ported: Removes an element from a list at the specified index.
 */
export function listRemoveAt<T>(list: T[], index: number): T[] {
    if (!list) return [];
    const newList = [...list];
    if (index >= 0 && index < newList.length) {
        newList.splice(index, 1);
    }
    return newList;
}

/**
 * FF-Ported: Checks if a string contains another string (case-insensitive).
 */
export function contieneTexto(textoABuscar: string | null | undefined, textoDondebusca: string | null | undefined): boolean {
    if (!textoABuscar || textoABuscar.trim() === "") {
        return true;
    }
    if (!textoDondebusca || textoDondebusca.trim() === "") {
        return false;
    }
    return textoDondebusca.toLowerCase().includes(textoABuscar.toLowerCase());
}

/**
 * FF-Ported: Calculates the difference in days between two dates, including the start day.
 */
export function diasdiferencia(fechaInicio: string | null | undefined, fechaFin: string | null | undefined): number {
    if (!fechaInicio || !fechaFin || !fechaInicio.trim() || !fechaFin.trim()) {
        return 0;
    }

    const parseFecha = (fecha: string): Date | null => {
        const formatos = ['yyyy-MM-dd', 'dd/MM/yyyy', 'yyyy/MM/dd'];

        for (const formato of formatos) {
            const parsed = parse(fecha, formato, new Date());
            if (isValid(parsed)) return parsed;
        }

        const fallback = new Date(fecha);
        return isValid(fallback) ? fallback : null;
    };

    const inicio = parseFecha(fechaInicio);
    const fin = parseFecha(fechaFin);

    if (!inicio || !fin) return 0;

    // We add 1 to include the start day as in the original Flutter logic
    return differenceInDays(fin, inicio) + 1;
}

/**
 * FF-Ported: Flexible search that normalizes text (removes accents/spaces) 
 * and checks for subsequence matching.
 */
export function iniciaPor(busqueda: string | null | undefined, campo: string | null | undefined): boolean {
    if (!busqueda || busqueda.trim() === "") return true;
    if (!campo || campo.trim() === "") return false;

    const normalizar = (texto: string): string => {
        const conTilde = 'áéíóúüñÁÉÍÓÚÜÑ';
        const sinTilde = 'aeiouunAEIOUUN';
        let resultado = texto.toLowerCase().trim();

        for (let i = 0; i < conTilde.length; i++) {
            resultado = resultado.split(conTilde[i]).join(sinTilde[i]);
        }
        return resultado.replace(/\s+/g, ''); // eliminar espacios
    };

    const esSubsecuencia = (b: string, c: string): boolean => {
        let bi = 0;
        for (let ci = 0; ci < c.length && bi < b.length; ci++) {
            if (b[bi] === c[ci]) {
                bi++;
            }
        }
        return bi === b.length;
    };

    const b = normalizar(busqueda);
    const c = normalizar(campo);

    if (c.includes(b) || c.startsWith(b)) return true;

    return esSubsecuencia(b, c);
}

/**
 * FF-Ported: Formats a date string to 'yyyy-MM-dd'.
 */
export function formatDateToShort(fullDate: string): string {
    if (!fullDate) return "";
    try {
        const date = new Date(fullDate);
        if (!isValid(date)) return fullDate;

        // Manual formatting to ensure yyyy-MM-dd regardless of locale
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    } catch (e) {
        return fullDate;
    }
}

/**
 * FF-Ported: Returns the full name by concatenating first name and last name.
 */
export function nombrecompleto(nombre: string | null | undefined, apellidos: string | null | undefined): string | null {
    if (!nombre || !apellidos) {
        return null;
    }
    return `${nombre} ${apellidos}`;
}

/**
 * FF-Ported: Finds an employee's ID in a list by their name using normalized matching.
 */
export function cedulaEmpleado(nombre: string, empleados: any[] | null | undefined): number | null {
    if (!empleados || !empleados.length) return null;

    const normalize = (s: string | null | undefined): string => {
        return (s ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
    };

    const target = normalize(nombre);
    if (!target) return null;

    // 1) Exact match
    for (const e of empleados) {
        const full = normalize(e.nombreCompleto);
        if (full === target) return e.id;
    }

    // 2) Fallback: contains
    for (const e of empleados) {
        const full = normalize(e.nombreCompleto);
        if (full.includes(target)) return e.id;
    }

    return null;
}

/**
 * FF-Ported: Converts a list or raw string of URLs into Markdown links.
 */
export function viewSoporte(arr: string[] | null | undefined, numberItems: boolean, raw: string | null | undefined): string {
    const links: string[] = [];

    if (arr && arr.length > 0) {
        links.push(...arr.map(e => (e || "").trim()).filter(e => e !== ""));
    } else if (raw && raw.trim() !== "") {
        const s = raw.trim();
        if (s.startsWith('[') && s.endsWith(']')) {
            try {
                const decoded = JSON.parse(s);
                if (Array.isArray(decoded)) {
                    for (const x of decoded) {
                        const v = String(x || "").trim();
                        if (v) links.push(v);
                    }
                }
            } catch (e) {
                // Fallback to CSV
                links.push(...s.split(',').map(e => e.trim()).filter(e => e !== ""));
            }
        } else {
            // CSV
            links.push(...s.split(',').map(e => e.trim()).filter(e => e !== ""));
        }
    }

    const filtered = links.filter(u => u.startsWith('http://') || u.startsWith('https://'));

    if (filtered.length === 0) return '';

    if (filtered.length === 1) {
        return `[Soporte](${filtered[0]})`;
    } else {
        return filtered.map((url, i) => {
            const label = numberItems ? `Soporte ${i + 1}` : 'Soporte';
            return `- [${label}](${url})`;
        }).join('\n');
    }
}

/**
 * FF-Ported: Converts a raw string of URLs into "Soporte de pago" Markdown links.
 */
export function viewSoportePago(raw: string | null | undefined): string {
    if (!raw || raw.trim() === "") return '';

    const links: string[] = [];
    const s = raw.trim();

    if (s.startsWith('[') && s.endsWith(']')) {
        try {
            const decoded = JSON.parse(s);
            if (Array.isArray(decoded)) {
                for (const x of decoded) {
                    const v = String(x || "").trim();
                    if (v) links.push(v);
                }
            }
        } catch (e) {
            links.push(...s.split(',').map(e => e.trim()).filter(e => e !== ""));
        }
    } else {
        links.push(...s.split(',').map(e => e.trim()).filter(e => e !== ""));
    }

    const filtered = links.filter(u => u.startsWith('http://') || u.startsWith('https://'));

    if (filtered.length === 0) return '';

    if (filtered.length === 1) {
        return `[Soporte de pago](${filtered[0]})`;
    } else {
        return filtered.map(url => `- [Soporte de pago](${url})`).join('\n');
    }
}

/**
 * FF-Ported: Formats a string value as Colombian currency without the $ symbol.
 */
export function formatCurrencyInput(value: string | null | undefined): string {
    if (!value) return "";
    try {
        // Remove everything except numbers and decimal separators
        let cleaned = value.replace(/[^0-9.,]/g, '');
        if (cleaned === "") return "";

        // Standardize decimal to '.' for parsing
        // If it has multiple dots/commas, this logic might be simple, but following FF pattern:
        // Replacing commas with dots for generic float parsing
        cleaned = cleaned.replace(/,/g, '.');

        const number = parseFloat(cleaned);
        if (isNaN(number)) return value;

        // Colombian format (thousands: ., decimal: ,)
        return new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(number);
    } catch (e) {
        return value || "";
    }
}

/**
 * FF-Ported: Finds a cargo name in a list of cargos by its ID.
 */
export function cargoNombre(cargosRows: any[] | null | undefined, cargoId: number): string {
    if (!cargosRows || cargosRows.length === 0) return '';

    for (const r of cargosRows) {
        if (r.id === cargoId) {
            return r.cargo ?? '';
        }
    }

    return '';
}

/**
 * FF-Ported: Formats a list of strings with commas and 'y' for the last item.
 */
function formatearCargos(cargos: string[]): string {
    if (cargos.length === 0) return '';
    if (cargos.length === 1) return cargos[0];
    if (cargos.length === 2) {
        return `${cargos[0]} y ${cargos[1]}`;
    }
    const todosMenosUltimo = cargos.slice(0, -1).join(', ');
    const ultimo = cargos[cargos.length - 1];
    return `${todosMenosUltimo} y ${ultimo}`;
}

/**
 * FF-Ported: Adds a new role to a string of roles, avoiding duplicates and maintaining a nice format.
 */
export function agregarCargoPolivalente(cargosActuales: string | null | undefined, nuevoCargo: string): string {
    const nuevo = nuevoCargo.trim();
    if (!nuevo) return cargosActuales || "";

    if (!cargosActuales || cargosActuales.trim() === "") {
        return nuevo;
    }

    // Normalizar: reemplazar " y " o " i " por coma para poder separar todo
    const normalizado = cargosActuales
        .replace(/\s+y\s+/g, ', ')
        .replace(/\s+i\s+/g, ', ');

    // Separar por coma y limpiar espacios
    const cargos = normalizado
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c !== "");

    // Evitar duplicados
    if (cargos.some((c) => c.toLowerCase() === nuevo.toLowerCase())) {
        return formatearCargos(cargos);
    }

    cargos.push(nuevo);
    return formatearCargos(cargos);
}

/**
 * FF-Ported: Extracts competency values from multiple JSON objects by key.
 */
export function getValoresCompetenciaJson(
    nivelJson: any,
    nivelEsperadoJson: any,
    comentarioJson: any,
    competenciaKey: string
): { nivel: number; nivel_esperado: number; comentario: string } {
    const toDouble = (v: any): number => {
        if (v === null || v === undefined) return 0.0;
        const n = parseFloat(v.toString());
        return isNaN(n) ? 0.0 : n;
    };

    const toStr = (v: any): string => {
        if (v === null || v === undefined) return '';
        return v.toString();
    };

    const nivel = nivelJson?.[competenciaKey];
    const nivelEsperado = nivelEsperadoJson?.[competenciaKey];
    const comentario = comentarioJson?.[competenciaKey];

    return {
        nivel: toDouble(nivel),
        nivel_esperado: toDouble(nivelEsperado),
        comentario: toStr(comentario),
    };
}

/**
 * FF-Ported: Finds a cargo's ID by its name through an exact match search.
 */
export function buscarcargo(querycargos: any[] | null | undefined, cargo: string): number | null {
    if (!cargo || cargo.trim() === "" || !querycargos) {
        return null;
    }

    for (const row of querycargos) {
        if (row.cargo === cargo) {
            return row.id;
        }
    }

    return null;
}

/**
 * FF-Ported: Calculates the average of numeric values in a JSON/Map object.
 */
export function promedioNivelDesdeJson(nivelJson: any): number {
    if (!nivelJson || typeof nivelJson !== 'object' || Array.isArray(nivelJson)) {
        return 0.0;
    }

    let suma = 0.0;
    let cantidad = 0;

    Object.values(nivelJson).forEach((value) => {
        if (value === null || value === undefined) return;

        let numero: number | null = null;

        if (typeof value === 'number') {
            numero = value;
        } else if (typeof value === 'string') {
            const parsed = parseFloat(value);
            if (!isNaN(parsed)) {
                numero = parsed;
            }
        }

        if (numero !== null) {
            suma += numero;
            cantidad++;
        }
    });

    if (cantidad === 0) {
        return 0.0;
    }

    return suma / cantidad;
}

/**
 * FF-Ported: Converts a base64 string to a Web File object.
 */
export function base64ToFile(base64: string, fileName?: string): File | null {
    if (!base64) return null;
    try {
        // Remove the data URI prefix if present (e.g., data:image/png;base64,...)
        const parts = base64.split(';base64,');
        const contentType = parts.length > 1 ? parts[0].split(':')[1] : 'image/jpeg';
        const raw = parts.length > 1 ? parts[1] : parts[0];

        const bytesString = atob(raw);
        const uint8Array = new Uint8Array(bytesString.length);

        for (let i = 0; i < bytesString.length; i++) {
            uint8Array[i] = bytesString.charCodeAt(i);
        }

        const name = fileName || `${Date.now()}${Math.floor(Math.random() * 10)}.jpg`;
        return new File([uint8Array], name, { type: contentType });
    } catch (e) {
        console.error("Error converting base64 to file:", e);
        return null;
    }
}

/**
 * FF-Ported: Validates if there is a stable internet connection.
 */
export async function validarInternet(): Promise<boolean> {
    if (typeof window === 'undefined') return true;

    const isOnline = window.navigator.onLine;

    // speed in Mbps (Network Information API - not supported in all browsers)
    const connection = (window.navigator as any).connection ||
        (window.navigator as any).mozConnection ||
        (window.navigator as any).webkitConnection;

    const downlink = connection?.downlink ?? 10; // Default to 10 if not supported

    if (!isOnline || downlink < 0.08) {
        return false;
    }

    return true;
}

/**
 * FF-Ported: Removes newlines and carriage returns from text.
 */
export function limpiarTexto(texto: string): string {
    if (!texto) return '';
    return texto.replace(/\n|\r/g, ' ');
}

/**
 * FF-Ported: Formats a raw string into DD/MM/YYYY format by inserting slashes.
 * Useful for input masking.
 */
export function formatFechaSlash(raw: string): string {
    if (!raw) return '';

    // 1) Solo dígitos
    let digits = raw.replace(/\D/g, '');

    // 2) Limitar a 8 dígitos (DDMMAAAA)
    if (digits.length > 8) {
        digits = digits.substring(0, 8);
    }

    // 3) Insertar slashes
    let sb = '';
    for (let i = 0; i < digits.length; i++) {
        sb += digits[i];
        if (i === 1 && digits.length > 2) sb += '/';
        if (i === 3 && digits.length > 4) sb += '/';
    }

    return sb;
}

/**
 * FF-Ported: Reloads the current page.
 */
export function recargarApp(): void {
    if (typeof window !== 'undefined') {
        window.location.reload();
    }
}

/**
 * Safely parses a JSON string if it looks like JSON.
 */
export function safeParseJson(value: any): any {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}')))) {
        return value;
    }
    try {
        return JSON.parse(trimmed);
    } catch (e) {
        return value;
    }
}

/**
 * Formats a motivo value that might be a JSON string/array into a plain string.
 */
export function formatMotivo(motivo: any): string {
    const parsed = safeParseJson(motivo);
    if (Array.isArray(parsed)) {
        return parsed.join(', ');
    }
    return String(parsed || '');
}
