import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { formatearFechaLarga } from '@/lib/contratos/generarContratoTerminoFijo';

const NUMEROS_EN_PALABRAS: Record<number, string> = {
    1: 'un', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho',
    9: 'nueve', 10: 'diez', 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
    16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve', 20: 'veinte',
};

function diasEnPalabras(dias: number): string {
    return NUMEROS_EN_PALABRAS[dias] || String(dias);
}

const CATEGORIA_PLURAL: Record<string, string> = {
    MODERADA: 'moderadas',
    GRAVE: 'graves',
    GRAVISIMA: 'gravísimas',
};

// El formato de citacion_descargos solo tiene casillas Leve/Grave/Gravisima
// (no distingue "Moderada" como categoria aparte); se marca "Leve" para las
// faltas moderadas, que es la casilla mas cercana disponible en la plantilla.
const CATEGORIA_A_CASILLA: Record<string, 'Leve' | 'Grave' | 'Gravísima'> = {
    MODERADA: 'Leve',
    GRAVE: 'Grave',
    GRAVISIMA: 'Gravísima',
};

export interface MotivoParaDocumento {
    motivo: string
    categoria: string | null
    numeral: number | null
}

export function buildNormaInfringida(m: MotivoParaDocumento): string {
    if (!m.categoria || !m.numeral) {
        return `Artículo 76 del Reglamento Interno de Trabajo: "${m.motivo}"`;
    }
    const categoriaPlural = CATEGORIA_PLURAL[m.categoria] || m.categoria.toLowerCase();
    return `Artículo 76 del Reglamento Interno de Trabajo, Faltas ${categoriaPlural} numeral ${m.numeral} "${m.motivo}"`;
}

export function buildCalificacionFalta(categoria: string | null): string {
    const marcada = categoria ? CATEGORIA_A_CASILLA[categoria] : null;
    const opciones: Array<'Leve' | 'Grave' | 'Gravísima'> = ['Leve', 'Grave', 'Gravísima'];
    return opciones.map(o => `${o === marcada ? '☒' : '☐'} ${o}`).join('   ');
}

export function buildSancionCheckboxes(tipoSancion: string | null): string {
    const opciones = ['Memorando', 'Llamado de atención', 'Suspensión'];
    return opciones.map(o => `${o === tipoSancion ? '☒' : '☐'} ${o}`).join('   ');
}

export function buildAsistenciaAcompanante(asistio: boolean): string {
    return asistio ? '☒ Sí   ☐ No asistió' : '☐ Sí   ☒ No asistió';
}

function renderTemplate(templateFile: string, data: Record<string, any>): Buffer {
    const templatePath = path.join(process.cwd(), 'templates', 'procesos-disciplinarios', templateFile);
    const templateContent = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(templateContent);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(data);
    return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer;
}

export interface ProcesoParaDocumento {
    nombre_trabajador: string
    cedula_trabajador: string | number
    cargo_trabajador: string
    observaciones: string
    motivo: MotivoParaDocumento
}

export function generarLlamadoAtencionDocx(p: ProcesoParaDocumento, fecha: Date): Buffer {
    const categoriaPlural = p.motivo.categoria ? (CATEGORIA_PLURAL[p.motivo.categoria] || p.motivo.categoria.toLowerCase()) : '';
    return renderTemplate('llamado_atencion.docx', {
        fecha: formatearFechaLarga(fecha),
        nombre_trabajador: p.nombre_trabajador,
        cedula_trabajador: String(p.cedula_trabajador),
        cargo_trabajador: p.cargo_trabajador || '',
        observaciones: p.observaciones,
        numeral_falta: p.motivo.numeral != null ? String(p.motivo.numeral) : '',
        categoria_falta: categoriaPlural,
        texto_falta: p.motivo.motivo,
    });
}

export function generarCitacionDescargosDocx(p: ProcesoParaDocumento, fecha: Date): Buffer {
    return renderTemplate('citacion_descargos.docx', {
        fecha: formatearFechaLarga(fecha),
        nombre_trabajador: p.nombre_trabajador,
        cedula_trabajador: String(p.cedula_trabajador),
        observaciones: p.observaciones,
        calificacion_falta: buildCalificacionFalta(p.motivo.categoria),
        norma_infringida: buildNormaInfringida(p.motivo),
    });
}

export interface ActaDescargosDatos {
    fechaDescargos: string
    asistioAcompanante: boolean
    nombreAcompanante: string
    descargosTrabajador: string
    interrogatorio: string
    pruebasAportadas: string
    solicitudesEspeciales: string
}

export function generarActaDescargosDocx(p: ProcesoParaDocumento, acta: ActaDescargosDatos): Buffer {
    return renderTemplate('acta_descargos.docx', {
        nombre_trabajador: p.nombre_trabajador,
        cedula_trabajador: String(p.cedula_trabajador),
        asistencia_acompanante: buildAsistenciaAcompanante(acta.asistioAcompanante),
        nombre_acompanante: acta.asistioAcompanante ? (acta.nombreAcompanante || '') : '',
        fecha_descargos: acta.fechaDescargos,
        descargos_trabajador: acta.descargosTrabajador || 'No se registró versión del trabajador.',
        interrogatorio: acta.interrogatorio || 'No se registraron preguntas y respuestas.',
        pruebas_aportadas: acta.pruebasAportadas?.trim() || 'No se aportaron pruebas adicionales',
        solicitudes_especiales: acta.solicitudesEspeciales?.trim() || 'Ninguna',
    });
}

export function generarRespuestaDescargosDocx(
    p: ProcesoParaDocumento,
    fecha: Date,
    sancion: { tipoSancion: string | null; diasSuspension: number | null }
): Buffer {
    return renderTemplate('respuesta_descargos.docx', {
        fecha: formatearFechaLarga(fecha),
        nombre_trabajador: p.nombre_trabajador,
        cargo_trabajador: p.cargo_trabajador || '',
        fecha_audiencia: '',
        observaciones: p.observaciones,
        norma_infringida: buildNormaInfringida(p.motivo),
        dias_suspension_texto: sancion.diasSuspension ? diasEnPalabras(sancion.diasSuspension) : '',
        dias_suspension: sancion.diasSuspension != null ? String(sancion.diasSuspension) : '',
        fecha_inicio_suspension: '',
        fecha_fin_suspension: '',
        sancion_checkboxes: buildSancionCheckboxes(sancion.tipoSancion),
    });
}
