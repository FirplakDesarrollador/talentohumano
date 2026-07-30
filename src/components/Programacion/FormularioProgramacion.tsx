'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Save,
    X,
    User,
    Calendar,
    Briefcase,
    MapPin,
    Clock,
    Check,
    Search,
    Loader2,
    BookOpen,
    UserCheck,
    Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { AREAS_ADMINISTRATIVAS } from '@/lib/constants/roles';

interface FormularioProgramacionProps {
    onSuccess?: () => void;
    editId?: string | null;
    preselectedEmpleadoId?: string | null;
    userType?: 'admin' | 'administrativa' | 'operativa' | null;
}

const TIPOS_ENTRENAMIENTO = ['Entrenamiento', 'Reentrenamiento'];
const FASES_HILU = ['I', 'L', 'U'];

export const FormularioProgramacion: React.FC<FormularioProgramacionProps> = ({ onSuccess, editId, preselectedEmpleadoId, userType }) => {
    const router = useRouter();
    const supabase = React.useMemo(() => createClient(), []);
    const [loading, setLoading] = useState(false);
    const [fetchingEmployees, setFetchingEmployees] = useState(false);
    const [plantas, setPlantas] = useState<any[]>([]);
    const [cargosDisponibles, setCargosDisponibles] = useState<{ id: number; cargo: string }[]>([]);
    const [fetchingCargos, setFetchingCargos] = useState(false);

    // Employee search state
    const [employees, setEmployees] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);

    // Instructor search state
    const [instructors, setInstructors] = useState<any[]>([]);
    const [instructorSearchQuery, setInstructorSearchQuery] = useState('');
    const [showInstructorResults, setShowInstructorResults] = useState(false);
    const [fetchingInstructors, setFetchingInstructors] = useState(false);

    // Refs para abrir el selector nativo de hora al hacer click en cualquier
    // parte del recuadro (no solo en el iconito del reloj)
    const horaInicioRef = useRef<HTMLInputElement>(null);
    const horaFinRef = useRef<HTMLInputElement>(null);
    const openTimePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
        const input = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null;
        input?.showPicker?.();
    };

    // Form State
    const [formData, setFormData] = useState({
        empleado_id: '',
        nombreCompleto: '',
        planta: '',
        puesto: '',
        fecha_programada: format(new Date(), 'yyyy-MM-dd'),
        tipo: 'Entrenamiento',
        instructor: '',
        instructor_correo: '',
        hora_inicio: '08:00',
        hora_fin: '10:00',
        formado: false,
        empleado_entrenamiento: false,
        fase_hilu: 'I'
    });

    // Fetch plants for dropdown
    useEffect(() => {
        const fetchPlantas = async () => {
            const { data: areasData } = await supabase
                .from('query_estado_hilu')
                .select('area')
                .not('area', 'is', null);

            if (areasData) {
                const uniqueAreas = Array.from(new Set(areasData.map(p => (p as any).area).filter(Boolean))) as string[];
                const filteredAreas = uniqueAreas
                    .filter(a => !AREAS_ADMINISTRATIVAS.includes(a))
                    .filter(a => !a.startsWith('{'))
                    .filter(a => a !== 'Produccion' && a !== 'Todos')
                    .sort();
                
                let formatted = [
                    { planta: 'Todas las áreas' },
                    { planta: 'Administrativa' }, 
                    ...filteredAreas.map(a => ({ planta: a }))
                ];

                if (userType === 'administrativa') {
                    formatted = [{ planta: 'Administrativa' }];
                } else if (userType === 'operativa') {
                    formatted = [{ planta: 'Todas las áreas' }, ...filteredAreas.map(a => ({ planta: a }))];
                }

                setPlantas(formatted);
            }
        };
        fetchPlantas();
    }, [supabase, userType]);

    // Fetch cargos (puestos) available for the selected planta, so the user can
    // pick the specific position the collaborator is being trained on.
    useEffect(() => {
        const fetchCargos = async () => {
            if (!formData.planta || formData.planta === 'Todas las áreas') {
                setCargosDisponibles([]);
                return;
            }

            setFetchingCargos(true);
            try {
                if (formData.planta === 'Administrativa') {
                    // cargos.planta es un enum de Postgres cuyas etiquetas no siempre
                    // coinciden en mayusculas/minusculas con AREAS_ADMINISTRATIVAS
                    // (ej. "I+D+i" vs "I+D+I"), y un valor invalido para el enum hace
                    // que la consulta entera falle. Se filtra en el cliente para
                    // evitar depender de la casing exacta del enum.
                    const { data, error } = await (supabase as any)
                        .from('cargos')
                        .select('id, cargo, planta')
                        .order('cargo');
                    if (error) throw error;
                    const adminSet = new Set(AREAS_ADMINISTRATIVAS.map(a => a.toLowerCase()));
                    setCargosDisponibles((data || []).filter((c: any) => adminSet.has((c.planta || '').toLowerCase())));
                } else {
                    const { data, error } = await (supabase as any)
                        .from('cargos')
                        .select('id, cargo')
                        .eq('planta', formData.planta)
                        .order('cargo');
                    if (error) throw error;
                    setCargosDisponibles(data || []);
                }
            } catch (err: any) {
                console.error('Error fetching cargos:', err?.message || err);
                setCargosDisponibles([]);
            } finally {
                setFetchingCargos(false);
            }
        };
        fetchCargos();
    }, [formData.planta, supabase]);

    // Fetch data for edit mode
    useEffect(() => {
        const fetchEditData = async () => {
            if (!editId) return;
            
            setLoading(true);
            try {
                const { data, error } = await (supabase as any)
                    .from('hilu_programacion')
                    .select('*, empleados(nombreCompleto, cargo, planta)')
                    .eq('id', editId)
                    .single();

                if (error) throw error;
                if (data) {
                    const d: any = data;
                    setFormData({
                        empleado_id: d.empleado_id.toString(),
                        nombreCompleto: d.empleados?.nombreCompleto || '',
                        planta: d.planta || '',
                        puesto: d.puesto || '',
                        fecha_programada: d.fecha_programada,
                        tipo: d.tipo || 'Entrenamiento',
                        instructor: d.instructor || '',
                        instructor_correo: '', // Keep empty as it's only needed for new Teams invites
                        hora_inicio: d.hora_inicio || '08:00',
                        hora_fin: d.hora_fin || '10:00',
                        formado: d.formado || false,
                        empleado_entrenamiento: d.empleado_entrenamiento || false,
                        fase_hilu: d.fase_hilu || 'I'
                    });
                    setSearchQuery(d.empleados?.nombreCompleto || '');
                    setInstructorSearchQuery(d.instructor || '');
                }
            } catch (err) {
                console.error('Error fetching edit data:', err);
                toast.error('Error al cargar datos para editar');
            } finally {
                setLoading(false);
            }
        };
        fetchEditData();
    }, [editId, supabase]);

    const selectEmployee = useCallback((emp: any) => {
        let plantToSet = emp.planta || '';
        if (AREAS_ADMINISTRATIVAS.includes(plantToSet)) {
            plantToSet = 'Administrativa';
        }

        setFormData(prev => ({
            ...prev,
            empleado_id: emp.id.toString(),
            nombreCompleto: emp.nombreCompleto || '',
            planta: plantToSet
        }));
        setSearchQuery(emp.nombreCompleto || '');
        setShowResults(false);
    }, []);

    // Fetch employee data if preselected
    useEffect(() => {
        const fetchPreselectedEmployee = async () => {
            if (!preselectedEmpleadoId || editId) return;

            try {
                const { data, error } = await supabase
                    .from('empleados')
                    .select('id, nombreCompleto, cargo, planta')
                    .eq('id', preselectedEmpleadoId)
                    .single();

                if (error) throw error;
                if (data) {
                    selectEmployee(data);
                }
            } catch (err) {
                console.error('Error fetching preselected employee:', err);
            }
        };
        fetchPreselectedEmployee();
    }, [preselectedEmpleadoId, editId, supabase, selectEmployee]);

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
                    .from('empleados')
                    .select('id, nombreCompleto, cargo, planta, area')
                    .eq('activo', true)
                    .ilike('nombreCompleto', `%${searchQuery}%`);
                
                if (userType === 'administrativa') {
                    query = query.in('area', AREAS_ADMINISTRATIVAS);
                } else if (userType === 'operativa') {
                    // supabase doesn't have `not.in` directly easily without string, so we filter locally below, 
                    // or we can just fetch and let the user see all but maybe they shouldn't.
                    // Another way is to filter after fetch since limit(5) might restrict, but let's try to just fetch 50 and filter locally.
                }

                const { data, error } = await query.limit(50);

                if (error) throw error;
                
                let filteredData = (data as any[]) || [];
                if (userType === 'operativa') {
                    filteredData = filteredData.filter((emp: any) => !AREAS_ADMINISTRATIVAS.includes(emp.area || '') && !AREAS_ADMINISTRATIVAS.includes(emp.planta || ''));
                }
                
                setEmployees(filteredData.slice(0, 5));
            } catch (err: any) {
                console.error('Error searching employees:', err);
            } finally {
                setFetchingEmployees(false);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery, supabase, userType]);

    // Fetch instructors for autocomplete
    useEffect(() => {
        const handler = setTimeout(async () => {
            if (instructorSearchQuery.length < 3) {
                setInstructors([]);
                return;
            }

            setFetchingInstructors(true);
            try {
                const { data, error } = await supabase
                    .from('empleados')
                    .select('id, nombreCompleto, cargo, planta, correo_electronico')
                    .eq('activo', true)
                    .ilike('nombreCompleto', `%${instructorSearchQuery}%`)
                    .limit(5);

                if (error) throw error;
                setInstructors(data || []);
            } catch (err: any) {
                console.error('Error searching instructors:', err);
            } finally {
                setFetchingInstructors(false);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [instructorSearchQuery, supabase]);

    const selectInstructor = (emp: any) => {
        setFormData({
            ...formData,
            instructor: emp.nombreCompleto || '',
            instructor_correo: emp.correo_electronico || ''
        });
        setInstructorSearchQuery(emp.nombreCompleto || '');
        setShowInstructorResults(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.empleado_id) {
            toast.error('Debe seleccionar un colaborador');
            return;
        }

        setLoading(true);
        try {
            const dataToSave = {
                empleado_id: parseInt(formData.empleado_id),
                nombre_empleado: formData.nombreCompleto,
                planta: formData.planta,
                puesto: formData.puesto,
                fecha_programada: formData.fecha_programada,
                tipo: formData.tipo,
                instructor: formData.instructor,
                hora_inicio: formData.hora_inicio,
                hora_fin: formData.hora_fin,
                formado: formData.formado,
                empleado_entrenamiento: formData.empleado_entrenamiento,
                fase_hilu: formData.fase_hilu,
                estado: 'Programado'
            };

            if (editId) {
                const { error } = await (supabase as any)
                    .from('hilu_programacion')
                    .update(dataToSave)
                    .eq('id', editId);
                if (error) throw error;
                toast.success('Entrenamiento actualizado correctamente');
            } else {
                const { error } = await (supabase as any)
                    .from('hilu_programacion')
                    .insert(dataToSave);
                if (error) throw error;
                toast.success('Entrenamiento programado correctamente');

                // Try to create Microsoft Teams meeting
                try {
                    if (formData.instructor_correo) {
                        const startDateTimeStr = `${formData.fecha_programada}T${formData.hora_inicio}:00`;
                        const endDateTimeStr = `${formData.fecha_programada}T${formData.hora_fin}:00`;

                        const appPath = formData.planta === 'Administrativa'
                            ? `/hilu-administrativa/${formData.empleado_id}`
                            : `/entrenamiento/${formData.empleado_id}`;
                        const appLink = `https://talentohumano.vercel.app${appPath}`;

                        const apiResponse = await fetch("/api/teams", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                instructor_correo: formData.instructor_correo,
                                subject: `Entrenamiento: ${formData.tipo} - Fase ${formData.fase_hilu}`,
                                content: `<b>Detalles del Entrenamiento</b><br><br><b>Colaborador:</b> ${formData.nombreCompleto}<br><b>Planta:</b> ${formData.planta}${formData.puesto ? `<br><b>Puesto:</b> ${formData.puesto}` : ''}<br><b>Instructor:</b> ${formData.instructor}<br><br><a href="${appLink}">Ver seguimiento en Talento Humano</a>`,
                                startDateTime: startDateTimeStr,
                                endDateTime: endDateTimeStr
                            })
                        });

                        if (apiResponse.ok) {
                            toast.success('Reunión agendada en Microsoft Teams del instructor');
                        } else {
                            const errorData = await apiResponse.json();
                            console.warn('Error backend API Teams:', errorData);
                            toast.warning('Guardado local, pero no se pudo agendar en Teams. Verifica permisos en Azure.');
                        }
                    } else {
                        toast.info('Guardado local. (Sin instructor con correo para agendar en Teams)');
                    }
                } catch (apiErr) {
                    console.error('Network error calling backend Teams API:', apiErr);
                }
            }

            if (onSuccess) onSuccess();
            else router.push('/programacion-entrenamientos');
        } catch (err: any) {
            console.error('Error saving programacion:', err);
            toast.error('Error al guardar: ' + (err.message || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto pb-10 px-4 md:px-0">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-8">
                
                {/* Section 1: Colaborador */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                            <User className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Colaborador</h2>
                    </div>

                    <div className="relative">
                        <Label htmlFor="search" className="text-xs font-bold text-gray-500 mb-1.5 block">Buscar Colaborador</Label>
                        <div className="relative">
                            <Input
                                id="search"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowResults(true);
                                }}
                                onFocus={() => setShowResults(true)}
                                placeholder="Escriba el nombre del colaborador..."
                                className="pl-10 h-12 bg-gray-50 border-gray-100 rounded-xl focus:bg-white transition-all text-sm"
                            />
                            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
                            {fetchingEmployees && (
                                <div className="absolute right-3.5 top-3.5">
                                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                                </div>
                            )}
                        </div>

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
                                            {emp.nombreCompleto?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 leading-none mb-1">{emp.nombreCompleto}</p>
                                            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{emp.cargo} • {emp.planta}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {formData.empleado_id && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Nombre Completo</span>
                                <span className="text-sm font-bold text-blue-900">{formData.nombreCompleto}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Planta Actual</span>
                                <span className="text-sm font-bold text-blue-900">{formData.planta || 'N/A'}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-px bg-gray-100" />

                {/* Section 2: Programación */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                            <Calendar className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Detalles de Programación</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-500 mb-1.5 block">Planta de Entrenamiento</Label>
                            <select
                                value={formData.planta}
                                onChange={(e) => setFormData({ ...formData, planta: e.target.value, puesto: '' })}
                                className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-semibold text-gray-700"
                            >
                                <option value="">Seleccione una planta...</option>
                                {plantas.map(p => <option key={p.planta} value={p.planta}>{p.planta}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5 relative">
                            <Label className="text-xs font-bold text-gray-500 mb-1.5 block">Puesto a Entrenar</Label>
                            <select
                                value={formData.puesto}
                                onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                                disabled={!formData.planta || formData.planta === 'Todas las áreas'}
                                className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">
                                    {formData.planta && formData.planta !== 'Todas las áreas' ? 'Seleccione un puesto...' : 'Seleccione primero una planta'}
                                </option>
                                {cargosDisponibles.map(c => <option key={c.id} value={c.cargo}>{c.cargo}</option>)}
                            </select>
                            {fetchingCargos && (
                                <div className="absolute right-3.5 top-[38px]">
                                    <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-500 mb-1.5 block">Fecha Programada</Label>
                            <Input
                                type="date"
                                value={formData.fecha_programada}
                                onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
                                className="h-12 bg-gray-50 border-gray-100 rounded-xl focus:bg-white transition-all text-sm font-semibold"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-500 mb-1.5 block">Tipo de Entrenamiento</Label>
                            <select
                                value={formData.tipo}
                                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-semibold text-gray-700"
                            >
                                {TIPOS_ENTRENAMIENTO.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5 relative">
                            <Label className="text-xs font-bold text-gray-500 mb-1.5 block">Instructor / Encargado</Label>
                            <div className="relative">
                                <Input
                                    value={instructorSearchQuery}
                                    onChange={(e) => {
                                        setInstructorSearchQuery(e.target.value);
                                        setShowInstructorResults(true);
                                    }}
                                    onFocus={() => setShowInstructorResults(true)}
                                    placeholder="Nombre del instructor..."
                                    className="pl-10 h-12 bg-gray-50 border-gray-100 rounded-xl focus:bg-white transition-all text-sm font-semibold"
                                />
                                <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
                                {fetchingInstructors && (
                                    <div className="absolute right-3.5 top-3.5">
                                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                                    </div>
                                )}
                            </div>

                            {showInstructorResults && instructors.length > 0 && (
                                <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
                                    {instructors.map((ins) => (
                                        <button
                                            key={ins.id}
                                            type="button"
                                            onClick={() => selectInstructor(ins)}
                                            className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                                                {ins.nombreCompleto?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 leading-none mb-1">{ins.nombreCompleto}</p>
                                                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{ins.cargo} • {ins.planta}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-500 mb-1.5 block text-center">Hora Inicial</Label>
                            <div
                                className="relative cursor-pointer"
                                onClick={() => openTimePicker(horaInicioRef)}
                            >
                                <Input
                                    ref={horaInicioRef}
                                    type="time"
                                    value={formData.hora_inicio}
                                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                                    className="h-12 bg-gray-50 border-gray-100 rounded-xl focus:bg-white transition-all text-sm font-semibold text-center cursor-pointer"
                                />
                                <Clock className="absolute right-3.5 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-500 mb-1.5 block text-center">Hora Final</Label>
                            <div
                                className="relative cursor-pointer"
                                onClick={() => openTimePicker(horaFinRef)}
                            >
                                <Input
                                    ref={horaFinRef}
                                    type="time"
                                    value={formData.hora_fin}
                                    onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                                    className="h-12 bg-gray-50 border-gray-100 rounded-xl focus:bg-white transition-all text-sm font-semibold text-center cursor-pointer"
                                />
                                <Clock className="absolute right-3.5 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Section 3: Estatus y Fase */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-green-50 p-2 rounded-lg text-green-600">
                            <Layers className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Estatus y Fase</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-3 flex flex-col justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 transition-all hover:bg-white hover:shadow-md h-[90px]">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">¿Formado?</span>
                            <div className="flex bg-gray-200/50 p-1 rounded-xl w-full">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, formado: true })}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${
                                        formData.formado 
                                        ? 'bg-white text-blue-600 shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-500'
                                    }`}
                                >
                                    SÍ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, formado: false })}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${
                                        !formData.formado 
                                        ? 'bg-white text-gray-600 shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-500'
                                    }`}
                                >
                                    NO
                                </button>
                            </div>
                        </div>

                        <div className="md:col-span-5 flex flex-col justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 transition-all hover:bg-white hover:shadow-md h-[90px]">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Colaborador con entrenamiento</span>
                            <div className="flex bg-gray-200/50 p-1 rounded-xl w-full">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, empleado_entrenamiento: true })}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${
                                        formData.empleado_entrenamiento 
                                        ? 'bg-white text-blue-600 shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-500'
                                    }`}
                                >
                                    SÍ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, empleado_entrenamiento: false })}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${
                                        !formData.empleado_entrenamiento 
                                        ? 'bg-white text-gray-600 shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-500'
                                    }`}
                                >
                                    NO
                                </button>
                            </div>
                        </div>

                        <div className="md:col-span-4 flex flex-col justify-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100 transition-all hover:bg-white hover:shadow-md h-[90px] relative overflow-hidden">
                            <Label className="text-[9px] font-black text-gray-400 uppercase tracking-widest absolute top-2 left-4">Fase de entrenamiento</Label>
                            <select
                                value={formData.fase_hilu}
                                onChange={(e) => setFormData({ ...formData, fase_hilu: e.target.value })}
                                className="w-full bg-transparent border-none p-0 pt-6 text-[11px] font-black text-gray-700 cursor-pointer appearance-none focus:outline-none"
                            >
                                {FASES_HILU.map(f => (
                                    <option key={f} value={f} className="font-bold">Fase {f}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-[55%] -translate-y-1/2 pointer-events-none">
                                <Layers className="h-4 w-4 text-gray-300" />
                            </div>
                        </div>
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
                    className="flex-[2] h-14 rounded-2xl bg-[#1e2f3d] hover:bg-[#2c4558] text-white font-black uppercase tracking-widest shadow-xl shadow-gray-200"
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <Save className="h-5 w-5 mr-2" />
                            {editId ? 'Guardar Cambios' : 'Programar Entrenamiento'}
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
};
