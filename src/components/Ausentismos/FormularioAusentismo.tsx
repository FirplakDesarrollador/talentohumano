'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Save,
    X,
    User,
    Calendar,
    Briefcase,
    MapPin,
    Building2,
    FileText,
    AlertCircle,
    Loader2,
    Search
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const MOTIVOS = [
    'Pendiente',
    'Ausencia Injustificada',
    'incapacidad Enfermedad General',
    'Incapacidad Accidente de Trabajo',
    'Licencia de Maternidad',
    'Licencia de Paternidad',
    'Licencia por Luto',
    'Permiso Remunerado',
    'Permiso No Remunerado',
    'Suspension',
    'Calamidad Domestica',
    'Otro'
].sort();

interface FormularioAusentismoProps {
    onSuccess?: () => void;
    initialData?: any; // For bulk registration maybe
}

export const FormularioAusentismo: React.FC<FormularioAusentismoProps> = ({ onSuccess }) => {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [fetchingEmployees, setFetchingEmployees] = useState(false);

    // Employee search state
    const [employees, setEmployees] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        cedula: '',
        nombreCompleto: '',
        motivo: 'Pendiente',
        codigoIncapacidad: '',
        fechaInicio: format(new Date(), 'yyyy-MM-dd'),
        fechaFinal: format(new Date(), 'yyyy-MM-dd'),
        observaciones: '',
        descontarNomina: false,
        planta: '',
        jefe: '',
        contrato: '',
        cargo: ''
    });

    // Fetch employees for autocomplete
    useEffect(() => {
        const handler = setTimeout(async () => {
            if (searchQuery.length < 3) {
                setEmployees([]);
                return;
            }

            setFetchingEmployees(true);
            try {
                const { data, error } = await supabase
                    .from('empleados')
                    .select('*')
                    .or(`nombreCompleto.ilike.%${searchQuery}%,cedula.cast.text.ilike.%${searchQuery}%`)
                    .eq('activo', true)
                    .limit(5);

                if (error) throw error;
                setEmployees(data || []);
            } catch (err) {
                console.error('Error searching employees:', err);
            } finally {
                setFetchingEmployees(false);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery, supabase]);

    const selectEmployee = (emp: any) => {
        setFormData({
            ...formData,
            cedula: emp.cedula?.toString() || '',
            nombreCompleto: emp.nombreCompleto || '',
            planta: emp.planta || '',
            jefe: emp.jefe || '',
            contrato: emp.empresa || '', // In Flutter code 'Contrato' seems to map to Empresa
            cargo: emp.cargo || ''
        });
        setSearchQuery(emp.nombreCompleto);
        setShowResults(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.cedula || !formData.nombreCompleto) {
            toast.error('Debe seleccionar un empleado');
            return;
        }

        setLoading(true);
        try {
            const { data: userData } = await supabase.auth.getUser();

            const dataToSave = {
                'Título': parseInt(formData.cedula),
                'Nombre Completo': formData.nombreCompleto,
                'Motivo Ausentismo': formData.motivo,
                'Codigo Incapacidad': formData.codigoIncapacidad,
                'FechaInicio': formData.fechaInicio,
                'FechaFinal': formData.fechaFinal,
                'Observaciones': formData.observaciones,
                'Planta': formData.planta,
                'Jefe': formData.jefe,
                'Contrato': formData.contrato,
                'Cargo': formData.cargo,
                'Descontar nomina': formData.descontarNomina ? 'Si' : 'No',
                'Creado por': userData.user?.email || 'Sistema',
                'Creado': new Date().toISOString()
            };

            // Attempt upper case first
            const { error } = await supabase.from('Ausentismos' as any).insert(dataToSave as any);

            if (error) {
                // Try lower case if upper fails
                const { error: errorLow } = await supabase.from('ausentismos' as any).insert(dataToSave as any);
                if (errorLow) throw errorLow;
            }

            toast.success('Ausentismo registrado correctamente');
            if (onSuccess) onSuccess();
            else router.push('/ausentismos');
        } catch (err: any) {
            console.error('Error saving ausentismo:', err);
            toast.error('Error al guardar: ' + (err.message || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-8">
                {/* Section 1: Employee Selection */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                            <User className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Selección de Empleado</h2>
                    </div>

                    <div className="relative">
                        <Label htmlFor="search" className="text-xs font-bold text-gray-500 mb-1.5 block">Buscar Empleado (Nombre o Cédula)</Label>
                        <div className="relative">
                            <Input
                                id="search"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowResults(true);
                                }}
                                onFocus={() => setShowResults(true)}
                                placeholder="Escriba al menos 3 caracteres..."
                                className="pl-10 h-12 bg-gray-50 border-gray-100 rounded-xl focus:bg-white transition-all text-sm"
                            />
                            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
                            {fetchingEmployees && (
                                <div className="absolute right-3.5 top-3.5">
                                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* Autocomplete Results */}
                        {showResults && employees.length > 0 && (
                            <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
                                {employees.map((emp) => (
                                    <button
                                        key={emp.id}
                                        type="button"
                                        onClick={() => selectEmployee(emp)}
                                        className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                            {emp.nombreCompleto?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 leading-none mb-1">{emp.nombreCompleto}</p>
                                            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{emp.cargo} • {emp.cedula}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {formData.cedula && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Cédula</span>
                                <span className="text-sm font-bold text-blue-900">{formData.cedula}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Planta</span>
                                <span className="text-sm font-bold text-blue-900">{formData.planta || 'N/A'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Jefe</span>
                                <span className="text-sm font-bold text-blue-900">{formData.jefe || 'N/A'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Empresa</span>
                                <span className="text-sm font-bold text-blue-900">{formData.contrato || 'N/A'}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-px bg-gray-100" />

                {/* Section 2: Absence Details */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                            <AlertCircle className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Detalles de la Ausencia</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label htmlFor="motivo" className="text-xs font-bold text-gray-500 mb-1.5 block">Motivo</Label>
                            <select
                                id="motivo"
                                value={formData.motivo}
                                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                                className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-semibold text-gray-700"
                            >
                                {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        {(formData.motivo.toLowerCase().includes('incapacidad')) && (
                            <div className="space-y-1.5 animate-in zoom-in-95 duration-200">
                                <Label htmlFor="codigo" className="text-xs font-bold text-gray-500 mb-1.5 block">Código Incapacidad (Opcional)</Label>
                                <Input
                                    id="codigo"
                                    value={formData.codigoIncapacidad}
                                    onChange={(e) => setFormData({ ...formData, codigoIncapacidad: e.target.value })}
                                    placeholder="Ej: K00.1"
                                    className="h-12 bg-gray-50 border-gray-100 rounded-xl focus:bg-white transition-all text-sm font-semibold uppercase"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label htmlFor="fechaInicio" className="text-xs font-bold text-gray-500 mb-1.5 block">Fecha Inicio</Label>
                            <div className="relative">
                                <Input
                                    id="fechaInicio"
                                    type="date"
                                    value={formData.fechaInicio}
                                    onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                                    className="h-12 bg-gray-50 border-gray-100 rounded-xl focus:bg-white transition-all text-sm pr-4 appearance-none"
                                />
                                <Calendar className="absolute right-3.5 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="fechaFinal" className="text-xs font-bold text-gray-500 mb-1.5 block">Fecha Final</Label>
                            <div className="relative">
                                <Input
                                    id="fechaFinal"
                                    type="date"
                                    value={formData.fechaFinal}
                                    onChange={(e) => setFormData({ ...formData, fechaFinal: e.target.value })}
                                    className="h-12 bg-gray-50 border-gray-100 rounded-xl focus:bg-white transition-all text-sm pr-4"
                                />
                                <Calendar className="absolute right-3.5 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-bold text-gray-800">Descontar de Nómina</span>
                            <span className="text-[10px] text-gray-500 font-medium">Active esta opción si el tiempo no debe ser remunerado.</span>
                        </div>
                        <Switch
                            checked={formData.descontarNomina}
                            onCheckedChange={(val) => setFormData({ ...formData, descontarNomina: val })}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="observaciones" className="text-xs font-bold text-gray-500 mb-1.5 block">Observaciones (Opcional)</Label>
                        <Textarea
                            id="observaciones"
                            value={formData.observaciones}
                            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                            placeholder="Detalles adicionales sobre el ausentismo..."
                            className="bg-gray-50 border-gray-100 rounded-xl min-h-[120px] focus:bg-white transition-all text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex-1 h-14 rounded-2xl border-gray-200 text-gray-500 font-bold hover:bg-gray-50 hover:text-gray-700"
                >
                    <X className="h-5 w-5 mr-2" />
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-500/20"
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <Save className="h-5 w-5 mr-2" />
                            Guardar Registro
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
};
