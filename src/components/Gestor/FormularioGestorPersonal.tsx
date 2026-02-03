'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Save,
    X,
    User,
    IdCard,
    Briefcase,
    MapPin,
    Building2,
    UserPlus,
    Camera,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { PLANTAS } from './GestorFilters';
import Image from 'next/image';
import type { Database } from '@/lib/supabase/types';

type Empleado = Database['public']['Tables']['empleados']['Row'];

interface FormularioGestorPersonalProps {
    id?: number; // If provided, it's an edit form
    onSuccess?: () => void;
}

const EMPRESAS = ['FIRPLAK S.A.', 'TÉCNICOS Y SERVICIOS S.A.S'];

export const FormularioGestorPersonal: React.FC<FormularioGestorPersonalProps> = ({ id, onSuccess }) => {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!!id);

    // Form State
    const [formData, setFormData] = useState({
        cedula: '',
        nombreCompleto: '',
        cargo: '',
        planta: '',
        jefe: '',
        empresa: '',
        foto: '',
        activo: true
    });

    // Helper State for Dropdowns
    const [existingJefes, setExistingJefes] = useState<string[]>([]);
    const [existingCargos, setExistingCargos] = useState<string[]>([]);

    useEffect(() => {
        const fetchHelpers = async () => {
            console.log('Fetching helpers (bosses/jobs)...');
            try {
                const { data: bosses } = await supabase.from('empleados').select('jefe').not('jefe', 'is', null).eq('activo', true);
                const { data: jobs } = await supabase.from('empleados').select('cargo').not('cargo', 'is', null);

                if (bosses) setExistingJefes(Array.from(new Set((bosses as any[]).map((e: any) => e.jefe).filter(Boolean))).sort() as string[]);
                if (jobs) setExistingCargos(Array.from(new Set((jobs as any[]).map((e: any) => e.cargo).filter(Boolean))).sort() as string[]);
                console.log('Helpers fetched successfully');
            } catch (err) {
                console.error('Error fetching helpers:', err);
            }
        };
        fetchHelpers();
    }, [supabase]);

    useEffect(() => {
        const fetchEmpleado = async () => {
            console.log('fetchEmpleado triggered with id:', id, 'type:', typeof id);
            if (!id || isNaN(id)) {
                console.log('No valid ID provided or ID is NaN, skipping fetch');
                setFetching(false);
                return;
            }

            setFetching(true);
            try {
                console.log('Querying supabase for employee id:', id);
                const { data, error } = await supabase
                    .from('empleados')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) {
                    console.error('Error fetching employee:', error);
                    toast.error('No se pudo encontrar el empleado');
                } else if (data) {
                    console.log('Employee data received:', data);
                    const emp = data as Empleado;
                    setFormData({
                        cedula: emp.cedula?.toString() || '',
                        nombreCompleto: emp.nombreCompleto || '',
                        cargo: emp.cargo || '',
                        planta: emp.planta || '',
                        jefe: emp.jefe || '',
                        empresa: emp.empresa || '',
                        foto: emp.foto || '',
                        activo: emp.activo ?? true
                    });
                }
            } catch (err) {
                console.error('Unexpected error fetching employee:', err);
            } finally {
                console.log('Setting fetching to false');
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
                cedula: formData.cedula ? parseInt(formData.cedula) : 0,
                nombreCompleto: formData.nombreCompleto,
                cargo: formData.cargo,
                planta: formData.planta,
                jefe: formData.jefe,
                empresa: formData.empresa,
                foto: formData.foto,
                activo: formData.activo,
                updated_at: new Date().toISOString()
            };

            if (id) {
                const { error } = await supabase
                    .from('empleados')
                    .update(dataToSave as any)
                    .eq('id', id);
                if (error) throw error;
                toast.success('Empleado actualizado correctamente');
            } else {
                const { error } = await supabase
                    .from('empleados')
                    .insert([{ ...dataToSave, created_at: new Date().toISOString() }] as any);
                if (error) throw error;
                toast.success('Empleado creado correctamente');
            }

            if (onSuccess) onSuccess();
            else router.push('/gestor-de-personal');
        } catch (error: any) {
            toast.error('Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
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
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
            {/* Header Section */}
            <div className="flex items-center gap-4 pb-6 border-b border-gray-50">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                    {id ? <Save className="h-6 w-6" /> : <UserPlus className="h-6 w-6" />}
                </div>
                <div>
                    <h2 className="text-xl font-black text-[#1e2f3d] tracking-tight uppercase">
                        {id ? 'Editar Empleado' : 'Nuevo Empleado'}
                    </h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        Información administrativa y laboral
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: ID and Name */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#1e2f3d] ml-1 flex items-center gap-1.5">
                            <IdCard className="h-3 w-3 text-blue-400" /> Cédula de Identidad
                        </Label>
                        <Input
                            type="number"
                            value={formData.cedula}
                            onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                            placeholder="Ingrese número de cédula"
                            className="h-12 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#1e2f3d] ml-1 flex items-center gap-1.5">
                            <User className="h-3 w-3 text-blue-400" /> Nombre Completo
                        </Label>
                        <Input
                            value={formData.nombreCompleto}
                            onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                            placeholder="Nombre y apellidos"
                            className="h-12 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#1e2f3d] ml-1 flex items-center gap-1.5">
                            <Briefcase className="h-3 w-3 text-blue-400" /> Cargo / Puesto
                        </Label>
                        <div className="relative">
                            <input
                                list="cargos-list"
                                value={formData.cargo}
                                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                                className="flex h-12 w-full rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-medium"
                                placeholder="Seleccione o escriba el cargo"
                            />
                            <datalist id="cargos-list">
                                {existingCargos.map(cargo => <option key={cargo} value={cargo} />)}
                            </datalist>
                        </div>
                    </div>
                </div>

                {/* Right Column: Plant, Boss, Company */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#1e2f3d] ml-1 flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-blue-400" /> Planta / Área
                        </Label>
                        <select
                            value={formData.planta}
                            onChange={(e) => setFormData({ ...formData, planta: e.target.value })}
                            className="flex h-12 w-full rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-medium"
                        >
                            <option value="">Seleccione planta</option>
                            {PLANTAS.filter(p => p !== 'Todos').map(planta => (
                                <option key={planta} value={planta}>{planta}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#1e2f3d] ml-1 flex items-center gap-1.5">
                            <User className="h-3 w-3 text-blue-400" /> Jefe Directo
                        </Label>
                        <div className="relative">
                            <input
                                list="jefes-list"
                                value={formData.jefe}
                                onChange={(e) => setFormData({ ...formData, jefe: e.target.value })}
                                className="flex h-12 w-full rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-medium"
                                placeholder="Seleccione o escriba el jefe"
                            />
                            <datalist id="jefes-list">
                                {existingJefes.map(jefe => <option key={jefe} value={jefe} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#1e2f3d] ml-1 flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 text-blue-400" /> Empresa
                        </Label>
                        <select
                            value={formData.empresa}
                            onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                            className="flex h-12 w-full rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-medium"
                        >
                            <option value="">Seleccione empresa</option>
                            {EMPRESAS.map(emp => (
                                <option key={emp} value={emp}>{emp}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Photo Section */}
            <div className="bg-gray-50/50 p-6 rounded-2xl border border-dashed border-gray-200 space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#1e2f3d] flex items-center gap-1.5">
                    <Camera className="h-3 w-3 text-blue-400" /> Fotografía de Perfil
                </Label>
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                    <div className="relative w-24 h-24 rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden flex-shrink-0">
                        {formData.foto ? (
                            <Image src={formData.foto} alt="Preview" fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <User className="h-10 w-10" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                        <Input
                            value={formData.foto}
                            onChange={(e) => setFormData({ ...formData, foto: e.target.value })}
                            placeholder="Pegue aquí el enlace de la imagen"
                            className="h-11 rounded-xl border-gray-100 bg-white"
                        />
                        <p className="text-[10px] text-gray-400 font-medium">Link directo a la imagen hospedada en la nube</p>
                    </div>
                </div>
            </div>

            {/* Status Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-gray-50">
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-100">
                    <Switch
                        checked={formData.activo}
                        onCheckedChange={(val) => setFormData({ ...formData, activo: val })}
                    />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#1e2f3d]">Estado Laboral</span>
                        <span className={`text-xs font-bold leading-none ${formData.activo ? 'text-green-500' : 'text-red-500'}`}>
                            {formData.activo ? 'VINCULADO' : 'RETIRADO'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/gestor-de-personal')}
                        className="flex-1 sm:flex-none h-12 px-8 rounded-xl border-gray-200 text-gray-400 hover:text-gray-600 font-bold text-xs tracking-widest uppercase hover:bg-gray-50"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 sm:flex-none h-12 px-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-widest uppercase shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        {id ? 'Actualizar' : 'Crear'}
                    </Button>
                </div>
            </div>
        </form>
    );
};
