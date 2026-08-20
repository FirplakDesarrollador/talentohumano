import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { createClient } from '@supabase/supabase-js';
import { formatearFechaLarga, type EmpleadoParaContrato } from './generarContratoTerminoFijo';

function formatearSalario(salario: number): string {
    return Math.round(salario).toLocaleString('es-CO');
}

export async function generarContratoIndefinidoDocx(empleado: EmpleadoParaContrato, fechaInicio: Date): Promise<Buffer> {
    const templatePath = path.join(process.cwd(), 'templates', 'contratos', 'contrato_indefinido.docx');
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
        tipo_contrato_texto: 'Indefinido',
        salario: empleado.salario != null ? formatearSalario(empleado.salario) : '',
        cedula_trabajador: String(empleado.id),
        funciones: listaFunciones,
    });

    return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer;
}
