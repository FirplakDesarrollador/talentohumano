import { createClient } from '@/lib/supabase/client'

interface ValidationResult {
    diasTiempo: number;
    diasDinero: number;
    nuevoSaldo: number;
    ajustado: boolean;
    mensaje: string;
}

/**
 * FF-Ported: Valida y calcula los días de vacaciones (Tiempo vs Dinero).
 */
export async function vacacionesValidarCalcular(
    disponibles: number,
    diasTiempoStr: string,
    diasDineroStr: string,
    mostrarMensajes: boolean = false
): Promise<ValidationResult> {
    const _safeInt = (s: string | null) => {
        if (!s) return 0;
        const t = parseFloat(s.replace(',', '.').trim());
        return (isNaN(t) || t < 0) ? 0 : Math.floor(t);
    };

    const disponiblesInt = Math.floor(disponibles);
    let t = _safeInt(diasTiempoStr);
    let d = _safeInt(diasDineroStr);

    let ajustado = false;
    const msgs: string[] = [];

    // Regla 1: dinero <= tiempo
    if (d >= t) {
        d = t - 1;
        if (d < 0) d = 0;
        ajustado = true;
        msgs.push('Los días en dinero deben ser menor que los días en tiempo.');
    }

    // Regla 2: no exceder disponibles
    const maxDiasPermitido = disponiblesInt - t;
    if (t + d > disponiblesInt) {
        const permitido = maxDiasPermitido < 0 ? 0 : maxDiasPermitido;
        if (d !== permitido) {
            d = permitido;
            ajustado = true;
            msgs.push(`Se ajustaron los días en dinero a ${permitido} por límite de días disponibles.`);
        }
    }

    // Calcular saldo con precisión decimal (2 decimales)
    const saldo = disponibles - (t + d);
    const nuevoSaldoRaw = saldo < 0 ? 0 : saldo;
    const nuevoSaldo = Number(nuevoSaldoRaw.toFixed(2));

    return {
        diasTiempo: t,
        diasDinero: d,
        nuevoSaldo,
        ajustado,
        mensaje: msgs.join(' ')
    };
}

/**
 * FF-Ported: Carga información de empleado para vacaciones por cédula.
 * Retorna un objeto con la información o un objeto vacío si falla/no existe.
 */
export async function cargarEmpleadoPorCedula(cedula: string) {
    const supabase = createClient()

    try {
        const { data, error } = await (supabase as any)
            .from('query_empleados_vacaciones')
            .select('id, nombrecompleto, area, jefe, Dias_Pendientes, CorreoJefe, cargo, empresa, planta')
            .eq('id', cedula)
            .limit(1)
            .maybeSingle()

        if (error) {
            console.error('Error fetching employee from view:', error)
            return {}
        }

        return data || {}
    } catch (e) {
        console.error('Error en cargarEmpleadoPorCedula:', e)
        return {}
    }
}

/**
 * FF-Ported: Genera y descarga el reporte de vacaciones en formato CSV.
 * Mantiene la estructura de columnas exacta del código Dart original.
 */
export function descargarQueryVacaciones(registros: any[]) {
    if (!registros || registros.length === 0) return;

    const safeValue = (value: any) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        // Reemplaza newlines por espacios y comas por guiones para no romper el CSV
        return str.replace(/[\r\n]+/g, ' ').replace(/,/g, '-');
    };

    const headers = [
        'Cedula',
        'Empleado_Que_Disfruta',
        'Creado_por',
        'Fecha_Solicitud',
        'FechaInicial',
        'FechaFinal',
        'FechaIngreso',
        'Departamento',
        'Nombre_del_Jefe',
        'Aprobacion_Jefe',
        'DiasEnTiempo',
        'DiasEnDinero',
        'TipoDePAgo',
        'PersonaEncargada',
        'Empresa',
        'Cargo',
        'ausentismo_registrado',
        'id'
    ];

    const csvRows = [headers.join(',')];

    registros.forEach(row => {
        const values = [
            safeValue(row.Cedula),
            safeValue(row.Empleado_Que_Disfruta),
            safeValue(row['Creado por']),
            safeValue(row['Fecha Solicitud']),
            safeValue(row.FechaInicial),
            safeValue(row.FechaFinal),
            safeValue(row.FechaIngreso),
            safeValue(row.Departamento),
            safeValue(row['Nombre del Jefe']),
            safeValue(row.Aprobacion_Jefe),
            safeValue(row.DiasEnTiempo),
            safeValue(row.DiasEnDinero),
            safeValue(row.TipoDePAgo),
            safeValue(row.PersonaEncargada),
            safeValue(row.Empresa),
            safeValue(row.Cargo),
            safeValue(row.ausentismo_registrado ? 'true' : 'false'), // Booleans to string
            safeValue(row.id)
        ];
        csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Nombre exacto solicitado pero con extensión .csv
    const fileName = 'db_vacaciones.csv';

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
