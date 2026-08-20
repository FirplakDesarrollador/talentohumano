import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { createClient } from '@supabase/supabase-js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function formatearFechaLarga(date: Date): string {
    return `${date.getDate()} de ${MESES[date.getMonth()]} de ${date.getFullYear()}`;
}

function formatearSalario(salario: number): string {
    return Math.round(salario).toLocaleString('es-CO');
}

export function sumarMeses(date: Date, meses: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + meses);
    return d;
}

export interface EmpleadoParaContrato {
    id: number;
    nombreCompleto: string;
    direccion: string | null;
    fecha_nacimiento: string | null;
    lugar_nacimiento: string | null;
    cargo: string | null;
    salario: number | null;
}

export async function generarContratoTerminoFijoDocx(empleado: EmpleadoParaContrato, fechaInicio: Date): Promise<Buffer> {
    const templatePath = path.join(process.cwd(), 'templates', 'contratos', 'contrato_termino_fijo.docx');
    const templateContent = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(templateContent);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const cargoTrim = (empleado.cargo || '').trim();
    const { data: funciones } = await supabase
        .from('funciones_cargo')
        .select('funcion, orden')
        .ilike('cargo', cargoTrim)
        .order('orden', { ascending: true });

    const listaFunciones = funciones && funciones.length > 0
        ? funciones.map((f: any, i: number) => ({
            linea: `${i + 1}. ${f.funcion}${i < funciones.length - 1 ? '\n' : ''}`,
        }))
        : [{ linea: '(Funciones pendientes de definir para este cargo — completar manualmente antes de firmar)' }];

    const fechaFin = sumarMeses(fechaInicio, 3);
    const fechaNacimiento = empleado.fecha_nacimiento ? new Date(`${empleado.fecha_nacimiento}T00:00:00`) : null;
    const fechaLugarNacimiento = fechaNacimiento
        ? `${formatearFechaLarga(fechaNacimiento)}${empleado.lugar_nacimiento ? ', ' + empleado.lugar_nacimiento : ''}`
        : (empleado.lugar_nacimiento || '');

    doc.render({
        nombre_trabajador: empleado.nombreCompleto,
        nombre_trabajador_mayus: empleado.nombreCompleto.toUpperCase(),
        direccion_trabajador: empleado.direccion || '',
        fecha_lugar_nacimiento: fechaLugarNacimiento,
        cargo: empleado.cargo || '',
        fecha_inicio: formatearFechaLarga(fechaInicio),
        fecha_fin: formatearFechaLarga(fechaFin),
        tipo_contrato_texto: 'Fijo inferior a un año',
        salario: empleado.salario != null ? formatearSalario(empleado.salario) : '',
        cedula_trabajador: String(empleado.id),
        funciones: listaFunciones,
    });

    return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer;
}

async function getMsToken(): Promise<string> {
    const tenantId = process.env.MICROSOFT_TENANT_ID!;
    const clientId = process.env.MICROSOFT_CLIENT_ID!;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;

    const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
    });

    const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error autenticando con Microsoft: ' + JSON.stringify(data));
    return data.access_token;
}

const SCRATCH_USER = 'talentos@firplak.com';
const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Convierte un .docx a PDF usando el conversor nativo de OneDrive: sube el archivo
// a una carpeta temporal, lo descarga con ?format=pdf y borra el temporal.
// Requiere el permiso de aplicación Files.ReadWrite.All en Azure (actualmente solo hay Files.Read.All).
export async function convertirDocxAPdf(docxBuffer: Buffer, nombreArchivoSinExtension: string): Promise<Buffer> {
    const token = await getMsToken();
    const itemPath = `/temp-contratos/${nombreArchivoSinExtension}.docx`;

    const uploadRes = await fetch(
        `https://graph.microsoft.com/v1.0/users/${SCRATCH_USER}/drive/root:${itemPath}:/content`,
        {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': DOCX_CONTENT_TYPE },
            body: docxBuffer as any,
        }
    );
    if (!uploadRes.ok) {
        throw new Error('No se pudo subir el docx temporal a OneDrive para convertirlo a PDF: ' + await uploadRes.text());
    }

    try {
        const pdfRes = await fetch(
            `https://graph.microsoft.com/v1.0/users/${SCRATCH_USER}/drive/root:${itemPath}:/content?format=pdf`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!pdfRes.ok) {
            throw new Error('No se pudo convertir el docx a PDF: ' + await pdfRes.text());
        }
        return Buffer.from(await pdfRes.arrayBuffer());
    } finally {
        fetch(`https://graph.microsoft.com/v1.0/users/${SCRATCH_USER}/drive/root:${itemPath}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
    }
}
