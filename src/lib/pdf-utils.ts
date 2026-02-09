import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const LOGO_URL = 'https://jdtjtkncptwqdhlxmzds.supabase.co/storage/v1/object/public/publico/assets/Logo-Firplak.png';

export async function generateTrainingCertificatePDF(data: any) {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Helper functions
    const s = (v: any) => (v ?? '').toString();
    const fecha10 = (v: any) => v ? s(v).substring(0, 10) : 'Fecha no disponible';
    const completadoBool = (v: any) => v === true ? 'Completado' : 'No Completado';
    const siNo = (v: any) => v === true ? 'Sí' : 'No';
    const getTextoProgreso = (v: any) => {
        const val = parseInt(s(v));
        if (val === 1) return 'Mala';
        if (val === 2) return 'Regular';
        if (val === 3) return 'Buena';
        return '';
    };

    // Load Logo
    let logoData = '';
    try {
        const response = await fetch(LOGO_URL);
        const blob = await response.blob();
        logoData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Error loading logo for PDF:", e);
    }

    // Header logic
    const addHeader = (pageNum: number) => {
        if (logoData) {
            doc.addImage(logoData, 'PNG', pageWidth - margin - 40, 10, 40, 20);
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const hoy = new Date();
        const fechaTexto = `Medellín, ${hoy.getDate()} de ${format(hoy, 'MMMM', { locale: es })} de ${hoy.getFullYear()}`;
        doc.text(fechaTexto, margin, 25);
    };

    // --- PAGE 1: DATOS + FASE H ---
    addHeader(1);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICADO DE ENTRENAMIENTO', pageWidth / 2, 45, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const introText = `En el presente documento certificamos el proceso de entrenamiento llevado a cabo por el empleado ${data.nombreCompleto} durante su tiempo de servicio en nuestra compañía. Este certificado atestigua el compromiso y la dedicación demostrados por el mencionado empleado en su búsqueda continua de desarrollo profesional.`;
    const splitIntro = doc.splitTextToSize(introText, pageWidth - (margin * 2));
    doc.text(splitIntro, margin, 60);

    doc.text('A continuación, se detallarán los datos personales del empleado y su proceso de entrenamiento:', margin, 85);

    // Employee Data Table
    autoTable(doc, {
        startY: 90,
        margin: { left: margin },
        showHead: 'never',
        theme: 'plain',
        body: [
            ['Nombre:', s(data.nombreCompleto)],
            ['Cédula:', s(data.cedula)],
            ['Empresa:', s(data.empresa || 'FIRPLAK S.A.S')],
            ['Planta:', s(data.planta)],
            ['Cargo:', s(data.fh_cargo || data.cargo)],
            ['Jefe:', s(data.jefe)]
        ],
        columnStyles: {
            0: { cellWidth: 40, fontStyle: 'bold' }
        },
        styles: { fontSize: 10, cellPadding: 1 }
    });

    // Fase H
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Fase H', margin, (doc as any).lastAutoTable.finalY + 15);
    doc.setLineWidth(0.5);
    doc.line(margin, (doc as any).lastAutoTable.finalY + 17, pageWidth - margin, (doc as any).lastAutoTable.finalY + 17);

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        margin: { left: margin },
        showHead: 'never',
        theme: 'plain',
        body: [
            ['Fecha de Inicio:', fecha10(data.fh_created_at)],
            ['Inducción Talento Humano:', completadoBool(data.fh_induccion_th)],
            ['Aros de Seguridad:', completadoBool(data.fh_aros_seguridad)],
            ['Inducción Inicial en Planta:', completadoBool(data.fh_induccion_planta)],
            ['Entrenamiento Puesto Piloto:', completadoBool(data.fh_puesto_piloto)],
            ['Observación Puesto de Trabajo:', completadoBool(data.fh_observacion_puesto)],
            ['Explicación Puesto de Trabajo:', completadoBool(data.fh_explicacion_puesto)],
            ['Comentarios:', s(data.fh_comentario)],
            ['Fecha de Finalización:', fecha10(data.fh_fecha_finalizacion_fase)]
        ],
        columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold' }
        },
        styles: { fontSize: 10, cellPadding: 1 }
    });

    // Signatures Fase H
    let currentY = (doc as any).lastAutoTable.finalY + 10;
    if (data.fh_firma_empleado) {
        doc.addImage(data.fh_firma_empleado, 'PNG', margin + 10, currentY, 40, 20);
    }
    if (data.fh_firma_supervisor) {
        doc.addImage(data.fh_firma_supervisor, 'PNG', pageWidth - margin - 50, currentY, 40, 20);
    }
    doc.setFontSize(9);
    doc.text('Firma Empleado', margin + 30, currentY + 25, { align: 'center' });
    doc.text('Firma Jefe/Entrenador', pageWidth - margin - 30, currentY + 25, { align: 'center' });

    // --- PAGE 2: FASE I (Conditional) ---
    if ((data.fi_avance || 0) > 0) {
        doc.addPage();
        addHeader(2);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Fase I', pageWidth / 2, 45, { align: 'center' });
        doc.line(margin, 47, pageWidth - margin, 47);

        autoTable(doc, {
            startY: 55,
            margin: { left: margin },
            showHead: 'never',
            theme: 'plain',
            body: [
                ['Fecha de Inicio:', fecha10(data.fi_created_at)],
                ['Estándar del Puesto:', completadoBool(data.fi_estandar_hdt)],
                ['Entrenamiento de Calidad:', completadoBool(data.fi_entrenamiento_calidad)],
                ['Hace Acompañado:', completadoBool(data.fi_hace_acompanado)],
                ['Hace Solo:', completadoBool(data.fi_hace_solo)],
                ['Entrenado por:', s(data.fi_entrenado_por)],
                ['Es el titular:', siNo(data.fi_titular)],
                ['Actitud:', getTextoProgreso(data.fi_actitud)],
                ['Aprendizaje:', getTextoProgreso(data.fi_aprendizaje)],
                ['Destreza:', getTextoProgreso(data.fi_destreza)],
                ['Conocimiento:', getTextoProgreso(data.fi_conocimiento)],
                ['Comentarios:', s(data.fi_comentario)],
                ['Fecha de Finalización:', fecha10(data.fi_fecha_finalizacion_fase)]
            ],
            columnStyles: {
                0: { cellWidth: 60, fontStyle: 'bold' }
            },
            styles: { fontSize: 10, cellPadding: 1 }
        });

        // Signatures Fase I
        currentY = (doc as any).lastAutoTable.finalY + 10;
        if (data.fi_firma_empleado) {
            doc.addImage(data.fi_firma_empleado, 'PNG', margin + 10, currentY, 40, 20);
        }
        if (data.fi_firma_supervisor) {
            doc.addImage(data.fi_firma_supervisor, 'PNG', pageWidth - margin - 50, currentY, 40, 20);
        }
        doc.text('Firma Empleado', margin + 30, currentY + 25, { align: 'center' });
        doc.text('Firma Jefe/Entrenador', pageWidth - margin - 30, currentY + 25, { align: 'center' });
    }

    // --- PAGE 3: FASE L (Conditional) ---
    if ((data.fl_avance || 0) > 0) {
        doc.addPage();
        addHeader(3);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Fase L', pageWidth / 2, 45, { align: 'center' });
        doc.line(margin, 47, pageWidth - margin, 47);

        autoTable(doc, {
            startY: 55,
            margin: { left: margin },
            showHead: 'never',
            theme: 'plain',
            body: [
                ['Fecha de Inicio:', fecha10(data.fl_created_at)],
                ['Cumple Calidad:', data.fl_cumple_calidad ? 'Cumple' : 'No Cumple'],
                ['Cumple Tiempo:', data.fl_cumple_tiempo ? 'Cumple' : 'No Cumple'],
                ['Cumple Estándar:', data.fl_cumple_estandar ? 'Cumple' : 'No Cumple'],
                ['Comentarios:', s(data.fl_comentario)],
                ['Fecha de Finalización:', fecha10(data.fl_fecha_finalizacion_fase)]
            ],
            columnStyles: {
                0: { cellWidth: 60, fontStyle: 'bold' }
            },
            styles: { fontSize: 10, cellPadding: 1 }
        });

        // Signatures Fase L
        currentY = (doc as any).lastAutoTable.finalY + 10;
        if (data.fl_firma_empleado) {
            doc.addImage(data.fl_firma_empleado, 'PNG', margin + 10, currentY, 40, 20);
        }
        if (data.fl_firma_supervisor) {
            doc.addImage(data.fl_firma_supervisor, 'PNG', pageWidth - margin - 50, currentY, 40, 20);
        }
        doc.text('Firma Empleado', margin + 30, currentY + 25, { align: 'center' });
        doc.text('Firma Jefe/Entrenador', pageWidth - margin - 30, currentY + 25, { align: 'center' });
    }

    // --- PAGE 4: FASE U (Conditional) ---
    if ((data.fu_avance || 0) > 0) {
        doc.addPage();
        addHeader(4);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Fase U', pageWidth / 2, 45, { align: 'center' });
        doc.line(margin, 47, pageWidth - margin, 47);

        autoTable(doc, {
            startY: 55,
            margin: { left: margin },
            showHead: 'never',
            theme: 'plain',
            body: [
                ['Fecha de Inicio:', fecha10(data.fu_created_at)],
                ['Comentarios:', s(data.fu_comentario)],
                ['Fecha de Finalización:', fecha10(data.fu_fecha_finalizacion_fase)]
            ],
            columnStyles: {
                0: { cellWidth: 60, fontStyle: 'bold' }
            },
            styles: { fontSize: 10, cellPadding: 1 }
        });

        // Signatures Fase U
        currentY = (doc as any).lastAutoTable.finalY + 10;
        if (data.fu_firma_empleado) {
            doc.addImage(data.fu_firma_empleado, 'PNG', margin + 10, currentY, 40, 20);
        }
        if (data.fu_firma_supervisor) {
            doc.addImage(data.fu_firma_supervisor, 'PNG', pageWidth - margin - 50, currentY, 40, 20);
        }
        doc.text('Firma Empleado', margin + 30, currentY + 25, { align: 'center' });
        doc.text('Firma Jefe/Entrenador', pageWidth - margin - 30, currentY + 25, { align: 'center' });
    }

    doc.save(`Certificado_Entrenamiento_${data.cedula}.pdf`);
}
