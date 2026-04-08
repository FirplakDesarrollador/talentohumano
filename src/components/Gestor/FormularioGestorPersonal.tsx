'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Save,
    User,
    IdCard,
    Briefcase,
    MapPin,
    Building2,
    UserPlus,
    Camera,
    Loader2,
    Phone,
    Mail,
    Heart,
    GraduationCap,
    Stethoscope,
    Car,
    Shirt,
    Calendar,
    Baby,
    Users
} from 'lucide-react';
import { toast } from 'sonner';
import { PLANTAS } from './GestorFilters';
import Image from 'next/image';
import type { Database } from '@/lib/supabase/types';

type Empleado = Database['public']['Tables']['empleados']['Row'];

interface FormularioGestorPersonalProps {
    id?: number;
    onSuccess?: () => void;
}

const EMPRESAS = ['FIRPLAK S.A.', 'TÉCNICOS Y SERVICIOS S.A.S', 'JIRO', 'VINCULAMOS', 'VIVENTTA', 'SAITEMP'];
const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const NIVELES_CARGO = ['Operario', 'Supervisor', 'Coordinador', 'Jefe', 'Gerente', 'Director'];
const NIVELES_EDUCATIVOS = ['Primaria', 'Secundaria', 'Técnico', 'Tecnólogo', 'Profesional', 'Especialización', 'Maestría', 'Doctorado'];
const CONSUMO_OPTIONS = ['Nunca', 'Ocasionalmente', 'Siempre'];
const TALLAS_CAMISA = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const TALLAS_PANTALON = ['28', '30', '32', '34', '36', '38', '40', '42'];
const TIPOS_CAMISA = ['Polo', 'Camiseta', 'Camisa Formal'];
const TIPOS_PANTALON = ['Jean', 'Cargo', 'Formal'];
const SEXOS = ['Masculino', 'Femenino'];

// Fixed Section Component
const FormSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}> = ({ title, icon, children }) => {
    return (
        <Card className="border-gray-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="py-5 bg-gray-50/50 border-b border-gray-50">
                <CardTitle className="flex items-center gap-3 text-base font-black uppercase tracking-tight text-[#1e2f3d]">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm shadow-blue-100">
                        {icon}
                    </div>
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 pb-8">
                {children}
            </CardContent>
        </Card>
    );
};

// Field Component
const FormField: React.FC<{
    label: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    required?: boolean;
}> = ({ label, icon, children, required }) => (
    <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-[#1e2f3d] ml-1 flex items-center gap-1.5">
            {icon && <span className="text-blue-400">{icon}</span>}
            {label}
            {required && <span className="text-red-500">*</span>}
        </Label>
        {children}
    </div>
);

const inputClass = "h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium text-sm";
const selectClass = "flex h-11 w-full rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-medium";

export const FormularioGestorPersonal: React.FC<FormularioGestorPersonalProps> = ({ id, onSuccess }) => {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!!id);
    const [showPhotoEdit, setShowPhotoEdit] = useState(false);
    const [showRetiroModal, setShowRetiroModal] = useState(false);
    const [retiroData, setRetiroData] = useState({
        motivo: '',
        comentarios: '',
        fecha_retiro: new Date().toISOString().split('T')[0]
    });

    // Complete Form State
    const [formData, setFormData] = useState({
        // Basic
        cedula: '',
        nombreCompleto: '',
        foto: '',
        activo: true,
        // Personal
        fecha_nacimiento: '',
        fecha_expedicion_cedula: '',
        tipo_sangre: '',
        // Work
        cargo: '',
        planta: '',
        jefe: '',
        empresa: '',
        primer_ingreso: '',
        nivel_cargo: '',
        // Contact
        direccion: '',
        ciudad: '',
        telefono: '',
        celular: '',
        correo: '',
        contacto_emergencia: '',
        telefono_emergencia: '',
        // Family
        tiene_esposo: false,
        nombre_esposo: '',
        num_hijos: 0,
        hijo1_nombre: '', hijo1_nacimiento: '', hijo1_sexo: '',
        hijo2_nombre: '', hijo2_nacimiento: '', hijo2_sexo: '',
        hijo3_nombre: '', hijo3_nacimiento: '', hijo3_sexo: '',
        hijo4_nombre: '', hijo4_nacimiento: '', hijo4_sexo: '',
        // Education
        nivel_educativo: '',
        ultimo_grado: '',
        actualmente_estudiando: false,
        que_estudia: '',
        // Health
        tiene_recomendaciones_medicas: false,
        recomendaciones_medicas: '',
        enfermedades: '',
        consume_psicoactivas: 'Nunca',
        consume_tabaco: 'Nunca',
        consume_alcohol: 'Nunca',
        realiza_deporte: 'Nunca',
        // Mobility
        frecuencia_visita: '',
        medio_transporte: '',
        tipo_combustible: '',
        modelo_vehiculo: '',
        // Uniform
        tipo_camisa: '',
        talla_camisa: '',
        tipo_pantalon: '',
        talla_pantalon: '',
        talla_chaleco: ''
    });

    // Helper State for Dropdowns
    const [existingJefes, setExistingJefes] = useState<string[]>([]);
    const [existingCargos, setExistingCargos] = useState<string[]>([]);

    useEffect(() => {
        const fetchHelpers = async () => {
            try {
                const { data: bosses } = await supabase.from('empleados').select('jefe').not('jefe', 'is', null).eq('activo', true);
                const { data: jobs } = await (supabase as any).from('cargos').select('cargo');

                if (bosses) setExistingJefes(Array.from(new Set((bosses as any[]).map((e: any) => e.jefe).filter(Boolean))).sort() as string[]);
                if (jobs) setExistingCargos(Array.from(new Set((jobs as any[]).map(j => j.cargo).filter(Boolean))).sort() as string[]);
            } catch (err) {
                console.error('Error fetching helpers:', err);
            }
        };
        fetchHelpers();
    }, [supabase]);

    useEffect(() => {
        const fetchEmpleado = async () => {
            if (!id || isNaN(id)) {
                setFetching(false);
                return;
            }

            setFetching(true);
            try {
                const { data, error } = await supabase
                    .from('empleados')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) {
                    toast.error('No se pudo encontrar el empleado');
                } else if (data) {
                    const emp = data as any;
                    setFormData({
                        cedula: emp.id?.toString() || '',
                        nombreCompleto: emp.nombreCompleto || '',
                        foto: emp.foto || '',
                        activo: emp.activo ?? true,
                        fecha_nacimiento: emp.fecha_nacimiento || '',
                        fecha_expedicion_cedula: emp.fecha_expedicion_cedula || '',
                        tipo_sangre: emp.tipo_sangre || '',
                        cargo: emp.cargo || '',
                        planta: emp.planta || '',
                        jefe: emp.jefe || '',
                        empresa: emp.empresa || '',
                        primer_ingreso: emp.primer_ingreso || '',
                        nivel_cargo: emp.nivelCargo || '',
                        direccion: emp.direccion || '',
                        ciudad: emp.ciudad || '',
                        telefono: emp.telefono || '',
                        celular: emp.celular || '',
                        correo: emp.correo_electronico || '',
                        contacto_emergencia: emp.contacto_emergencia || '',
                        telefono_emergencia: emp.telefono_contacto_emergencia || '',
                        tiene_esposo: emp.tiene_pareja ?? false,
                        nombre_esposo: emp.nombre_pareja || '',
                        num_hijos: emp.numero_hijos ?? 0,
                        hijo1_nombre: emp.nombre_hijo1 || '',
                        hijo1_nacimiento: emp.fecha_nacimiento_hijo1 || '',
                        hijo1_sexo: emp.sexo_hijo1 || '',
                        hijo2_nombre: emp.nombre_hijo2 || '',
                        hijo2_nacimiento: emp.fecha_nacimiento_hijo2 || '',
                        hijo2_sexo: emp.sexo_hijo2 || '',
                        hijo3_nombre: emp.nombre_hijo3 || '',
                        hijo3_nacimiento: emp.fecha_nacimiento_hijo3 || '',
                        hijo3_sexo: emp.sexo_hijo3 || '',
                        hijo4_nombre: emp.nombre_hijo4 || '',
                        hijo4_nacimiento: emp.fecha_nacimiento_hijo4 || '',
                        hijo4_sexo: emp.sexo_hijo4 || '',
                        nivel_educativo: emp.nivel_educativo || '',
                        ultimo_grado: emp.ultimo_grado_cursado || '',
                        actualmente_estudiando: emp.estudia_actualmente ?? false,
                        que_estudia: emp.queestudia || '',
                        tiene_recomendaciones_medicas: !!emp.recomendaciones_medicas,
                        recomendaciones_medicas: emp.recomendaciones_medicas || '',
                        enfermedades: emp.enfermedades || '',
                        consume_psicoactivas: emp.sustancias || 'Nunca',
                        consume_tabaco: emp.fuma || 'Nunca',
                        consume_alcohol: emp.toma_alcohol || 'Nunca',
                        realiza_deporte: emp.deporte || 'Nunca',
                        frecuencia_visita: emp.frecuencia_presencialidad || '',
                        medio_transporte: emp.medio_transporte || '',
                        tipo_combustible: emp.combustible_usado || '',
                        modelo_vehiculo: emp.modelo_vehiculo || '',
                        tipo_camisa: emp.camisa || '',
                        talla_camisa: emp.talla_camisa || '',
                        tipo_pantalon: emp.pantalon || '',
                        talla_pantalon: emp.talla_pantalon || '',
                        talla_chaleco: emp.chaleco || ''
                    });
                }
            } catch (err) {
                console.error('Unexpected error fetching employee:', err);
            } finally {
                setFetching(false);
            }
        };

        fetchEmpleado();
    }, [id, supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.cedula || !formData.nombreCompleto) {
            toast.error('Cédula y Nombre son obligatorios');
            return;
        }

        setLoading(true);
        try {
            const dataToSave = {
                id: formData.cedula ? parseInt(formData.cedula) : 0,
                nombreCompleto: formData.nombreCompleto,
                foto: formData.foto || null,
                activo: formData.activo,
                fecha_nacimiento: formData.fecha_nacimiento || null,
                fecha_expedicion_cedula: formData.fecha_expedicion_cedula || null,
                tipo_sangre: formData.tipo_sangre || null,
                cargo: formData.cargo || null,
                planta: formData.planta || null,
                jefe: formData.jefe || null,
                empresa: formData.empresa || null,
                primer_ingreso: formData.primer_ingreso || null,
                nivelCargo: formData.nivel_cargo || null,
                direccion: formData.direccion || null,
                ciudad: formData.ciudad || null,
                telefono: formData.telefono || null,
                celular: formData.celular || null,
                correo_electronico: formData.correo || null,
                contacto_emergencia: formData.contacto_emergencia || null,
                telefono_contacto_emergencia: formData.telefono_emergencia || null,
                tiene_pareja: formData.tiene_esposo,
                nombre_pareja: formData.nombre_esposo || null,
                numero_hijos: parseInt(formData.num_hijos.toString()) || 0,
                nombre_hijo1: formData.hijo1_nombre || null,
                fecha_nacimiento_hijo1: formData.hijo1_nacimiento || null,
                sexo_hijo1: formData.hijo1_sexo || null,
                nombre_hijo2: formData.hijo2_nombre || null,
                fecha_nacimiento_hijo2: formData.hijo2_nacimiento || null,
                sexo_hijo2: formData.hijo2_sexo || null,
                nombre_hijo3: formData.hijo3_nombre || null,
                fecha_nacimiento_hijo3: formData.hijo3_nacimiento || null,
                sexo_hijo3: formData.hijo3_sexo || null,
                nombre_hijo4: formData.hijo4_nombre || null,
                fecha_nacimiento_hijo4: formData.hijo4_nacimiento || null,
                sexo_hijo4: formData.hijo4_sexo || null,
                nivel_educativo: formData.nivel_educativo || null,
                ultimo_grado_cursado: formData.ultimo_grado || null,
                estudia_actualmente: formData.actualmente_estudiando,
                queestudia: formData.que_estudia || null,
                recomendaciones_medicas: formData.recomendaciones_medicas || null,
                enfermedades: formData.enfermedades || null,
                sustancias: formData.consume_psicoactivas || null,
                fuma: formData.consume_tabaco || null,
                toma_alcohol: formData.consume_alcohol || null,
                deporte: formData.realiza_deporte || null,
                frecuencia_presencialidad: formData.frecuencia_visita || null,
                medio_transporte: formData.medio_transporte || null,
                combustible_usado: formData.tipo_combustible || null,
                modelo_vehiculo: formData.modelo_vehiculo || null,
                camisa: formData.tipo_camisa || null,
                talla_camisa: formData.talla_camisa || null,
                pantalon: formData.tipo_pantalon || null,
                talla_pantalon: formData.talla_pantalon || null,
                chaleco: formData.talla_chaleco || null,
                modified: new Date().toISOString()
            };

            if (id) {
                const { error } = await (supabase as any)
                    .from('empleados')
                    .update(dataToSave as any)
                    .eq('id', id);
                if (error) throw error;

                // Handle retirement record if status changed to inactive
                if (!formData.activo && id) {
                    await (supabase as any)
                        .from('retiro_personal')
                        .insert([{
                            empleado_id: id,
                            nombre: formData.nombreCompleto,
                            motivo: retiroData.motivo,
                            comentarios: retiroData.comentarios,
                            fecha_retiro: retiroData.fecha_retiro
                        }]);
                }

                toast.success('Empleado actualizado correctamente');
            } else {
                const { error, data } = await (supabase as any)
                    .from('empleados')
                    .insert([{ ...dataToSave, created: new Date().toISOString() }] as any)
                    .select('id')
                    .single();
                
                if (error) throw error;

                // Handle retirement record if created as inactive
                if (!formData.activo && data?.id) {
                    await (supabase as any)
                        .from('retiro_personal')
                        .insert([{
                            empleado_id: data.id,
                            nombre: formData.nombreCompleto,
                            motivo: retiroData.motivo,
                            comentarios: retiroData.comentarios,
                            fecha_retiro: retiroData.fecha_retiro
                        }]);
                }
                
                toast.success('Empleado creado correctamente');
            }

            if (onSuccess) onSuccess();
            else router.push('/gestor-de-personal');
        } catch (error: any) {
            console.error('Error completo Supabase:', error);
            const errorMessage = error.details || error.message || 'Error desconocido';
            toast.error('Error al guardar: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (fetching) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                <p className="text-gray-400 font-medium tracking-tight">Cargando datos del empleado...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto pb-8">
            {/* Header - Optimized and Centered */}
            <div className="flex flex-col items-center justify-center py-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-gray-100 shadow-sm mb-6">
                <h1 className="text-[#1D3557] font-black text-2xl uppercase tracking-[0.2em] mb-8">
                    Información Personal
                </h1>

                {/* Centered Photo */}
                <div className="relative group mb-6">
                    <div className="w-48 h-56 rounded-2xl bg-gray-50 shadow-2xl border-4 border-white overflow-hidden transition-all duration-500 group-hover:shadow-blue-500/10 active:scale-[0.98]">
                        {formData.foto ? (
                            <Image
                                src={formData.foto}
                                alt="Foto Empleado"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                                unoptimized // To avoid Next.js optimization issues with external URLs
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-100 bg-gradient-to-br from-gray-50 to-gray-100">
                                <User className="h-24 w-24" />
                            </div>
                        )}

                        {/* Camera Overlay to Change Photo */}
                        <div
                            onClick={() => setShowPhotoEdit(!showPhotoEdit)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center cursor-pointer"
                        >
                            <Camera className="h-8 w-8 text-white animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Quick Navigation Buttons (HILU / DISCIPLINARIOS) */}
                {id && (
                    <div className="flex gap-4 mb-4">
                        <Button
                            type="button"
                            onClick={() => router.push(`/entrenamiento/${id}`)}
                            className="bg-[#2d4356] hover:bg-[#1e2f3d] text-white rounded-xl px-10 h-10 font-bold shadow-md transition-all hover:-translate-y-1 active:scale-95 border-none"
                        >
                            Hilu
                        </Button>
                        <Button
                            type="button"
                            onClick={() => router.push(`/procesos-disciplinarios/${id}`)}
                            className="bg-[#2d4356] hover:bg-[#1e2f3d] text-white rounded-xl px-6 h-10 font-bold shadow-md transition-all hover:-translate-y-1 active:scale-95 border-none"
                        >
                            Procesos disciplinarios
                        </Button>
                    </div>
                )}

                {/* Photo URL Input - Collapsible and discreet */}
                {showPhotoEdit && (
                    <div className="w-full max-w-md px-6 animate-in slide-in-from-top-2 duration-300 mb-6">
                        <FormField label="Editar URL de Fotografía" icon={<Camera className="h-3 w-3" />}>
                            <Input
                                value={formData.foto}
                                onChange={(e) => updateField('foto', e.target.value)}
                                placeholder="https://ejemplo.com/foto.jpg"
                                className={inputClass}
                            />
                        </FormField>
                    </div>
                )}
            </div>

            {/* Section 1: Personal Information Fields */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div className="grid grid-cols-1 gap-6">
                    <FormField label="Nombre Completo" icon={<User className="h-3 w-3" />} required>
                        <Input
                            value={formData.nombreCompleto}
                            onChange={(e) => updateField('nombreCompleto', e.target.value)}
                            placeholder="Nombre y apellidos"
                            className={inputClass}
                            required
                        />
                    </FormField>

                    <FormField label="Cédula de Identidad" icon={<IdCard className="h-3 w-3" />} required>
                        <Input
                            type="number"
                            value={formData.cedula}
                            onChange={(e) => updateField('cedula', e.target.value)}
                            placeholder="Ingrese número de cédula"
                            className={inputClass}
                            required
                        />
                    </FormField>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField label="Fecha de Nacimiento" icon={<Calendar className="h-3 w-3" />}>
                            <Input
                                type="date"
                                value={formData.fecha_nacimiento}
                                onChange={(e) => updateField('fecha_nacimiento', e.target.value)}
                                className={inputClass}
                            />
                        </FormField>

                        <FormField label="Fecha Expedición Cédula" icon={<Calendar className="h-3 w-3" />}>
                            <Input
                                type="date"
                                value={formData.fecha_expedicion_cedula}
                                onChange={(e) => updateField('fecha_expedicion_cedula', e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                    </div>

                    <FormField label="Tipo de Sangre">
                        <select
                            value={formData.tipo_sangre}
                            onChange={(e) => updateField('tipo_sangre', e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Seleccione tipo de sangre</option>
                            {TIPOS_SANGRE.map(tipo => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                            ))}
                        </select>
                    </FormField>
                </div>
            </div>

            {/* Section 2: Work Information */}
            <FormSection title="Información Laboral" icon={<Briefcase className="h-5 w-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="Cargo / Puesto" icon={<Briefcase className="h-3 w-3" />}>
                        <div className="relative">
                            <input
                                list="cargos-list"
                                value={formData.cargo}
                                onChange={(e) => updateField('cargo', e.target.value)}
                                className={selectClass}
                                placeholder="Seleccione o escriba el cargo"
                            />
                            <datalist id="cargos-list">
                                {existingCargos.map(cargo => <option key={cargo} value={cargo} />)}
                            </datalist>
                        </div>
                    </FormField>

                    <FormField label="Planta / Área" icon={<MapPin className="h-3 w-3" />}>
                        <select
                            value={formData.planta}
                            onChange={(e) => updateField('planta', e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Seleccione planta</option>
                            {PLANTAS.filter(p => p !== 'Todos').map(planta => (
                                <option key={planta} value={planta}>{planta}</option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Jefe Directo" icon={<User className="h-3 w-3" />}>
                        <div className="relative">
                            <input
                                list="jefes-list"
                                value={formData.jefe}
                                onChange={(e) => updateField('jefe', e.target.value)}
                                className={selectClass}
                                placeholder="Seleccione o escriba el jefe"
                            />
                            <datalist id="jefes-list">
                                {existingJefes.map(jefe => <option key={jefe} value={jefe} />)}
                            </datalist>
                        </div>
                    </FormField>

                    <FormField label="Empresa" icon={<Building2 className="h-3 w-3" />}>
                        <select
                            value={formData.empresa}
                            onChange={(e) => updateField('empresa', e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Seleccione empresa</option>
                            {EMPRESAS.map(emp => (
                                <option key={emp} value={emp}>{emp}</option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Primer Ingreso" icon={<Calendar className="h-3 w-3" />}>
                        <Input
                            type="date"
                            value={formData.primer_ingreso}
                            onChange={(e) => updateField('primer_ingreso', e.target.value)}
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label="Nivel del Cargo">
                        <select
                            value={formData.nivel_cargo}
                            onChange={(e) => updateField('nivel_cargo', e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Seleccione nivel</option>
                            {NIVELES_CARGO.map(nivel => (
                                <option key={nivel} value={nivel}>{nivel}</option>
                            ))}
                        </select>
                    </FormField>
                </div>

                {/* Status Toggle */}
                <div className="mt-6 flex items-center gap-4 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                    <Switch
                        checked={formData.activo}
                        onCheckedChange={(val) => {
                            if (!val) {
                                setShowRetiroModal(true);
                            } else {
                                updateField('activo', true);
                            }
                        }}
                    />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#1e2f3d]">Estado Laboral</span>
                        <span className={`text-xs font-bold leading-none ${formData.activo ? 'text-green-500' : 'text-red-500'}`}>
                            {formData.activo ? 'VINCULADO' : 'RETIRADO'}
                        </span>
                    </div>
                </div>
            </FormSection>

            {/* Section 3: Contact Information */}
            <FormSection title="Información de Contacto" icon={<Phone className="h-5 w-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="Dirección" icon={<MapPin className="h-3 w-3" />}>
                        <Input
                            value={formData.direccion}
                            onChange={(e) => updateField('direccion', e.target.value)}
                            placeholder="Dirección de residencia"
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label="Ciudad">
                        <Input
                            value={formData.ciudad}
                            onChange={(e) => updateField('ciudad', e.target.value)}
                            placeholder="Ciudad"
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label="Teléfono" icon={<Phone className="h-3 w-3" />}>
                        <Input
                            type="tel"
                            value={formData.telefono}
                            onChange={(e) => updateField('telefono', e.target.value)}
                            placeholder="Teléfono fijo"
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label="Celular" icon={<Phone className="h-3 w-3" />}>
                        <Input
                            type="tel"
                            value={formData.celular}
                            onChange={(e) => updateField('celular', e.target.value)}
                            placeholder="Número celular"
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label="Correo Electrónico" icon={<Mail className="h-3 w-3" />}>
                        <Input
                            type="email"
                            value={formData.correo}
                            onChange={(e) => updateField('correo', e.target.value)}
                            placeholder="correo@ejemplo.com"
                            className={inputClass}
                        />
                    </FormField>

                    <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Contacto de Emergencia</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField label="Nombre del Contacto">
                                <Input
                                    value={formData.contacto_emergencia}
                                    onChange={(e) => updateField('contacto_emergencia', e.target.value)}
                                    placeholder="Nombre del contacto de emergencia"
                                    className={inputClass}
                                />
                            </FormField>
                            <FormField label="Teléfono de Emergencia">
                                <Input
                                    type="tel"
                                    value={formData.telefono_emergencia}
                                    onChange={(e) => updateField('telefono_emergencia', e.target.value)}
                                    placeholder="Teléfono del contacto"
                                    className={inputClass}
                                />
                            </FormField>
                        </div>
                    </div>
                </div>
            </FormSection>

            {/* Section 4: Family Information */}
            <FormSection title="Información Familiar" icon={<Heart className="h-5 w-5" />}>
                <div className="space-y-6">
                    {/* Spouse */}
                    <div className="flex items-center gap-4 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                        <Switch
                            checked={formData.tiene_esposo}
                            onCheckedChange={(val) => updateField('tiene_esposo', val)}
                        />
                        <span className="text-sm font-medium text-[#1e2f3d]">¿Tiene esposo/a o compañero/a?</span>
                    </div>

                    {formData.tiene_esposo && (
                        <FormField label="Nombre del Esposo/a o Compañero/a" icon={<Users className="h-3 w-3" />}>
                            <Input
                                value={formData.nombre_esposo}
                                onChange={(e) => updateField('nombre_esposo', e.target.value)}
                                placeholder="Nombre completo"
                                className={inputClass}
                            />
                        </FormField>
                    )}

                    {/* Children */}
                    <FormField label="Número de Hijos" icon={<Baby className="h-3 w-3" />}>
                        <select
                            value={formData.num_hijos}
                            onChange={(e) => updateField('num_hijos', parseInt(e.target.value))}
                            className={selectClass}
                        >
                            {[0, 1, 2, 3, 4].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </FormField>

                    {/* Dynamic Children Fields */}
                    {Array.from({ length: formData.num_hijos }).map((_, index) => {
                        const n = index + 1;
                        return (
                            <div key={n} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Hijo/a #{n}</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField label="Nombre">
                                        <Input
                                            value={(formData as any)[`hijo${n}_nombre`]}
                                            onChange={(e) => updateField(`hijo${n}_nombre`, e.target.value)}
                                            placeholder="Nombre del hijo/a"
                                            className={inputClass}
                                        />
                                    </FormField>
                                    <FormField label="Fecha de Nacimiento">
                                        <Input
                                            type="date"
                                            value={(formData as any)[`hijo${n}_nacimiento`]}
                                            onChange={(e) => updateField(`hijo${n}_nacimiento`, e.target.value)}
                                            className={inputClass}
                                        />
                                    </FormField>
                                    <FormField label="Sexo">
                                        <select
                                            value={(formData as any)[`hijo${n}_sexo`]}
                                            onChange={(e) => updateField(`hijo${n}_sexo`, e.target.value)}
                                            className={selectClass}
                                        >
                                            <option value="">Seleccione</option>
                                            {SEXOS.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </FormField>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </FormSection>

            {/* Section 5: Education Information */}
            <FormSection title="Información Educativa" icon={<GraduationCap className="h-5 w-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="Nivel Educativo">
                        <select
                            value={formData.nivel_educativo}
                            onChange={(e) => updateField('nivel_educativo', e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Seleccione nivel</option>
                            {NIVELES_EDUCATIVOS.map(nivel => (
                                <option key={nivel} value={nivel}>{nivel}</option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Último Grado Cursado">
                        <Input
                            value={formData.ultimo_grado}
                            onChange={(e) => updateField('ultimo_grado', e.target.value)}
                            placeholder="Ej: 11°, Semestre 5"
                            className={inputClass}
                        />
                    </FormField>
                </div>

                <div className="mt-6 flex items-center gap-4 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                    <Switch
                        checked={formData.actualmente_estudiando}
                        onCheckedChange={(val) => updateField('actualmente_estudiando', val)}
                    />
                    <span className="text-sm font-medium text-[#1e2f3d]">¿Actualmente estudiando?</span>
                </div>

                {formData.actualmente_estudiando && (
                    <div className="mt-4">
                        <FormField label="¿Qué estudia?">
                            <Input
                                value={formData.que_estudia}
                                onChange={(e) => updateField('que_estudia', e.target.value)}
                                placeholder="Carrera o programa de estudios"
                                className={inputClass}
                            />
                        </FormField>
                    </div>
                )}
            </FormSection>

            {/* Section 6: Health Information */}
            <FormSection title="Información de Salud" icon={<Stethoscope className="h-5 w-5" />}>
                <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                        <Switch
                            checked={formData.tiene_recomendaciones_medicas}
                            onCheckedChange={(val) => updateField('tiene_recomendaciones_medicas', val)}
                        />
                        <span className="text-sm font-medium text-[#1e2f3d]">¿Tiene recomendaciones médicas?</span>
                    </div>

                    {formData.tiene_recomendaciones_medicas && (
                        <FormField label="Detalle las Recomendaciones">
                            <textarea
                                value={formData.recomendaciones_medicas}
                                onChange={(e) => updateField('recomendaciones_medicas', e.target.value)}
                                placeholder="Describa las recomendaciones médicas"
                                className={`${selectClass} min-h-[80px] resize-none`}
                            />
                        </FormField>
                    )}

                    <FormField label="Enfermedades o Condiciones">
                        <textarea
                            value={formData.enfermedades}
                            onChange={(e) => updateField('enfermedades', e.target.value)}
                            placeholder="Describa enfermedades o condiciones médicas"
                            className={`${selectClass} min-h-[80px] resize-none`}
                        />
                    </FormField>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField label="¿Consume sustancias psicoactivas?">
                            <select
                                value={formData.consume_psicoactivas}
                                onChange={(e) => updateField('consume_psicoactivas', e.target.value)}
                                className={selectClass}
                            >
                                {CONSUMO_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="¿Consume tabaco?">
                            <select
                                value={formData.consume_tabaco}
                                onChange={(e) => updateField('consume_tabaco', e.target.value)}
                                className={selectClass}
                            >
                                {CONSUMO_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="¿Consume alcohol?">
                            <select
                                value={formData.consume_alcohol}
                                onChange={(e) => updateField('consume_alcohol', e.target.value)}
                                className={selectClass}
                            >
                                {CONSUMO_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="¿Realiza deporte?">
                            <select
                                value={formData.realiza_deporte}
                                onChange={(e) => updateField('realiza_deporte', e.target.value)}
                                className={selectClass}
                            >
                                {CONSUMO_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </FormField>
                    </div>
                </div>
            </FormSection>

            {/* Section 7: Mobility */}
            <FormSection title="Movilidad" icon={<Car className="h-5 w-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="Frecuencia de Visita a Firplak">
                        <Input
                            value={formData.frecuencia_visita}
                            onChange={(e) => updateField('frecuencia_visita', e.target.value)}
                            placeholder="Ej: Diario, 3 veces por semana"
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label="Medio de Transporte">
                        <Input
                            value={formData.medio_transporte}
                            onChange={(e) => updateField('medio_transporte', e.target.value)}
                            placeholder="Ej: Bus, Moto, Carro, Bicicleta"
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label="Tipo de Combustible/Energía">
                        <Input
                            value={formData.tipo_combustible}
                            onChange={(e) => updateField('tipo_combustible', e.target.value)}
                            placeholder="Ej: Gasolina, Eléctrico, Gas"
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label="Modelo del Vehículo">
                        <Input
                            value={formData.modelo_vehiculo}
                            onChange={(e) => updateField('modelo_vehiculo', e.target.value)}
                            placeholder="Ej: 2020, 2018"
                            className={inputClass}
                        />
                    </FormField>
                </div>
            </FormSection>

            {/* Section 8: Uniform/Dotación */}
            <FormSection title="Dotación" icon={<Shirt className="h-5 w-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="Tipo de Camisa">
                        <select
                            value={formData.tipo_camisa}
                            onChange={(e) => updateField('tipo_camisa', e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Seleccione tipo</option>
                            {TIPOS_CAMISA.map(tipo => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Talla de Camisa">
                        <select
                            value={formData.talla_camisa}
                            onChange={(e) => updateField('talla_camisa', e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Seleccione talla</option>
                            {TALLAS_CAMISA.map(talla => (
                                <option key={talla} value={talla}>{talla}</option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Tipo de Pantalón">
                        <select
                            value={formData.tipo_pantalon}
                            onChange={(e) => updateField('tipo_pantalon', e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Seleccione tipo</option>
                            {TIPOS_PANTALON.map(tipo => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Talla de Pantalón">
                        <select
                            value={formData.talla_pantalon}
                            onChange={(e) => updateField('talla_pantalon', e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Seleccione talla</option>
                            {TALLAS_PANTALON.map(talla => (
                                <option key={talla} value={talla}>{talla}</option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Talla de Chaleco">
                        <select
                            value={formData.talla_chaleco}
                            onChange={(e) => updateField('talla_chaleco', e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Seleccione talla</option>
                            {TALLAS_CAMISA.map(talla => (
                                <option key={talla} value={talla}>{talla}</option>
                            ))}
                        </select>
                    </FormField>
                </div>
            </FormSection>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/gestor-de-personal')}
                    className="w-full sm:w-auto h-12 px-8 rounded-xl border-gray-200 text-gray-400 hover:text-gray-600 font-bold text-xs tracking-widest uppercase hover:bg-gray-50"
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto h-12 px-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-widest uppercase shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    {id ? 'Actualizar' : 'Crear Empleado'}
                </Button>
            </div>

            {/* Retiro Confirmation Modal */}
            {showRetiroModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[28px] w-full max-w-[500px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
                        <div className="bg-red-600 text-white p-7">
                            <h3 className="text-xl font-black uppercase tracking-tight">Confirmar Retiro</h3>
                            <p className="text-red-100 text-xs font-bold uppercase tracking-widest mt-1">
                                Registro de finalización laboral
                            </p>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <FormField label="Motivo de Retiro" required>
                                <select 
                                    className={selectClass}
                                    value={retiroData.motivo}
                                    onChange={(e) => setRetiroData({...retiroData, motivo: e.target.value})}
                                    required
                                >
                                    <option value="">Seleccione un motivo</option>
                                    <option value="Renuncia voluntaria">Renuncia voluntaria</option>
                                    <option value="Despido sin justa causa">Despido sin justa causa</option>
                                    <option value="Despido con justa causa">Despido con justa causa</option>
                                    <option value="Terminación de contrato obra o labor">Terminación de contrato obra o labor</option>
                                    <option value="Vencimiento de términos">Vencimiento de términos</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </FormField>

                            <FormField label="Fecha de Retiro" required>
                                <Input 
                                    type="date"
                                    className={inputClass}
                                    value={retiroData.fecha_retiro}
                                    onChange={(e) => setRetiroData({...retiroData, fecha_retiro: e.target.value})}
                                    required
                                />
                            </FormField>

                            <FormField label="Comentarios Adicionales">
                                <textarea 
                                    className={`${selectClass} min-h-[100px] py-3`}
                                    placeholder="Detalles sobre el retiro..."
                                    value={retiroData.comentarios}
                                    onChange={(e) => setRetiroData({...retiroData, comentarios: e.target.value})}
                                />
                            </FormField>

                            <div className="flex gap-3 pt-4">
                                <Button 
                                    type="button"
                                    variant="outline"
                                    className="flex-1 h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                                    onClick={() => {
                                        setShowRetiroModal(false);
                                        updateField('activo', true); // Keep active if cancelled
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button 
                                    type="button"
                                    className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-[10px] tracking-widest"
                                    onClick={() => {
                                        if (retiroData.motivo) {
                                            updateField('activo', false);
                                            setShowRetiroModal(false);
                                        } else {
                                            toast.error('Por favor seleccione un motivo');
                                        }
                                    }}
                                >
                                    Confirmar Retiro
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
};
