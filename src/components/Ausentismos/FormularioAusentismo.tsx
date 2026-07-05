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
    Search,
    Upload,
    Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const MOTIVOS = [
    'Ausencia Injustificada',
    'Calamidad Domestica',
    'Cumpleaños',
    'Incapacidad Accidente de Tránsito',
    'Incapacidad ARL',
    'Incapacidad Enfermedad General',
    'Licencia',
    'Licencia No Remunerada',
    'Pendiente',
    'Permiso',
    'Suspensión',
    'Vacaciones'
].sort();

interface FormularioAusentismoProps {
    onSuccess?: () => void;
    editId?: string | null;
}

export const FormularioAusentismo: React.FC<FormularioAusentismoProps> = ({ onSuccess, editId }) => {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [loadingEdit, setLoadingEdit] = useState(!!editId);
    const [fetchingEmployees, setFetchingEmployees] = useState(false);
    const [uploadingDocumento, setUploadingDocumento] = useState(false);

    // Employee search state
    const [employees, setEmployees] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        cedula: '',
        nombreCompleto: '',
        motivo: 'Pendiente',
        fechaInicio: format(new Date(), 'yyyy-MM-dd'),
        fechaFinal: format(new Date(), 'yyyy-MM-dd'),
        observaciones: '',
        descontarNomina: false,
        planta: '',
        jefe: '',
        contrato: '',
        cargo: '',
        documentoSoporte: ''
    });

    // Fetch existing record when editing
    useEffect(() => {
        const fetchEditData = async () => {
            if (!editId) return;

            setLoadingEdit(true);
            try {
                const { data, error } = await (supabase as any)
                    .from('ausentismos')
                    .select('*')
                    .eq('Id', editId)
                    .single();

                if (error) throw error;
                if (data) {
                    const datosAdjuntos = data['Datos adjuntos'];
                    setFormData({
                        cedula: data['Título']?.toString() || '',
                        nombreCompleto: data['Nombre Completo'] || '',
                        motivo: data['Motivo Ausentismo'] || 'Pendiente',
                        fechaInicio: data['FechaInicio'] || format(new Date(), 'yyyy-MM-dd'),
                        fechaFinal: data['FechaFinal'] || format(new Date(), 'yyyy-MM-dd'),
                        observaciones: data['Observaciones'] || '',
                        descontarNomina: !!data['Descontar nomina'],
                        planta: data['Planta'] || '',
                        jefe: data['Jefe'] || '',
                        contrato: data['Contrato'] || '',
                        cargo: data['Cargo'] || '',
                        documentoSoporte: (datosAdjuntos && datosAdjuntos.startsWith('http')) ? datosAdjuntos : ''
                    });
                    setSearchQuery(data['Nombre Completo'] || '');
                }
            } catch (err: any) {
                console.error('Error fetching ausentismo for edit:', err);
                toast.error('Error al cargar el registro para editar');
            } finally {
                setLoadingEdit(false);
            }
        };
        fetchEditData();
    }, [editId, supabase]);

    // Fetch employees for autocomplete
    useEffect(() => {
        const handler = setTimeout(async () => {
            if (searchQuery.length < 3) {
                setEmployees([]);
                return;
            }

            setFetchingEmployees(true);
            try {
                let query = supabase
                    .from('query_empleados_vacaciones')
                    .select('id, cedula, nombrecompleto, cargo, planta, jefe, empresa');

                const isNumeric = /^\d+$/.test(searchQuery);
                if (isNumeric) {
                    // If numeric, try exact match on cedula OR partial on name
                    query = query.or(`nombrecompleto.ilike.%${searchQuery}%,cedula.eq.${searchQuery}`);
                } else {
                    // If text, partial match on name
                    query = query.ilike('nombrecompleto', `%${searchQuery}%`);
                }

                const { data, error } = await query.limit(10);

                if (error) {
                    console.error('Supabase query error:', error);
                    throw error;
                }
                
                const uniqueEmployees = data ? Array.from(new Map((data as any[]).map(emp => [emp.cedula, emp])).values()) : [];
                setEmployees(uniqueEmployees.slice(0, 5));
            } catch (err: any) {
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
            nombreCompleto: emp.nombrecompleto || '',
            planta: emp.planta || '',
            jefe: emp.jefe || '',
            contrato: emp.empresa || '', 
            cargo: emp.cargo || ''
        });
        setSearchQuery(emp.nombrecompleto || '');
        setShowResults(false);
    };

    const handleUploadDocumento = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setUploadingDocumento(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `ausentismos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('evidencias')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('evidencias')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, documentoSoporte: data.publicUrl }));
            toast.success('Documento adjuntado correctamente');
        } catch (err: any) {
            console.error('Error uploading documento:', err);
            toast.error('Error al subir el documento: ' + (err.message || 'Error desconocido'));
        } finally {
            setUploadingDocumento(false);
        }
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
            const userEmail = userData.user?.email || 'Sistema';

            const dataToSave: any = {
                'Título': parseInt(formData.cedula),
                'Nombre Completo': formData.nombreCompleto,
                'Motivo Ausentismo': formData.motivo,
                'FechaInicio': formData.fechaInicio,
                'FechaFinal': formData.fechaFinal,
                'Observaciones': formData.observaciones,
                'Planta': formData.planta,
                'Jefe': formData.jefe,
                'Contrato': formData.contrato,
                'Cargo': formData.cargo,
                'Descontar nomina': formData.descontarNomina,
                'Datos adjuntos': formData.documentoSoporte || null
            };

            if (editId) {
                dataToSave['Modificado por'] = userEmail;
                dataToSave['Modificado'] = new Date().toISOString();

                const { error } = await (supabase.from('ausentismos') as any).update(dataToSave).eq('Id', editId);
                if (error) throw error;

                toast.success('Ausentismo actualizado correctamente');
            } else {
                dataToSave['Creado por'] = userEmail;
                dataToSave['Creado'] = new Date().toISOString();

                const { error } = await (supabase.from('ausentismos') as any).insert(dataToSave);
                if (error) throw error;

                toast.success('Ausentismo registrado correctamente');
            }

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
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                                            {emp.nombrecompleto?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 leading-none mb-1">{emp.nombrecompleto}</p>
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
                    </div>

                    {(formData.motivo.toLowerCase().includes('incapacidad')) && (
                        <div className="space-y-1.5 animate-in zoom-in-95 duration-200">
                            <Label className="text-xs font-bold text-gray-500 mb-1.5 block">Documento Soporte de Incapacidad</Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="file"
                                    className="hidden"
                                    id="documentoSoporte"
                                    onChange={handleUploadDocumento}
                                    disabled={uploadingDocumento}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={uploadingDocumento}
                                    onClick={() => document.getElementById('documentoSoporte')?.click()}
                                    className="h-12 rounded-xl border-gray-200 font-semibold text-gray-600"
                                >
                                    {uploadingDocumento ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Upload className="h-4 w-4 mr-2" />
                                    )}
                                    {formData.documentoSoporte ? 'Reemplazar Archivo' : 'Subir Archivo'}
                                </Button>

                                {formData.documentoSoporte && (
                                    <a
                                        href={formData.documentoSoporte}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-xl"
                                    >
                                        <Eye className="h-4 w-4" /> Ver documento
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

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
                    disabled={loading || loadingEdit}
                    className="flex-[2] h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-500/20"
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <Save className="h-5 w-5 mr-2" />
                            {editId ? 'Guardar Cambios' : 'Guardar Registro'}
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
};
