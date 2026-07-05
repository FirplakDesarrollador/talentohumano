'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
    ArrowLeft, 
    Search, 
    Download, 
    Calendar, 
    User, 
    Clock, 
    CheckCircle2, 
    XCircle,
    MoreHorizontal,
    ChevronRight,
    MapPin,
    BookOpen,
    Briefcase
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CalendarioTeams } from '@/components/Programacion/CalendarioTeams';
import { LayoutGrid, List, Loader2 } from 'lucide-react';
import { AREAS_ADMINISTRATIVAS, ADMIN_EMAILS, ADMIN_LEVELS } from '@/lib/constants/roles';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function HistorialEntrenamientosContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlTipo = searchParams.get('tipo'); // 'operativa' or 'administrativa'
    
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [userType, setUserType] = useState<'admin' | 'administrativa' | 'operativa' | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [entrenamientos, setEntrenamientos] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlanta, setSelectedPlanta] = useState('all');
    const [plantas, setPlantas] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('list');
    const [pendingEdit, setPendingEdit] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const email = user.email || '';
                const nivelCargo = user.user_metadata?.nivelCargo || '';
                const isAdmin = ADMIN_EMAILS.includes(email) || (ADMIN_LEVELS as any).includes(nivelCargo);
                
                if (isAdmin) {
                    if (urlTipo === 'operativa' || urlTipo === 'administrativa') {
                        setUserType(urlTipo);
                    } else {
                        setUserType('admin');
                    }
                } else {
                    const { data: empData } = await supabase.from('empleados').select('area, planta').eq('correo_electronico', email).single();
                    if (empData) {
                        const emp = empData as any;
                        const isAdmi = AREAS_ADMINISTRATIVAS.includes(emp.area) || AREAS_ADMINISTRATIVAS.includes(emp.planta);
                        setUserType(isAdmi ? 'administrativa' : 'operativa');
                    } else {
                        setUserType('operativa');
                    }
                }
            }
            setLoadingUser(false);
        };
        fetchUser();
    }, [supabase, urlTipo]);

    useEffect(() => {
        if (userType === 'administrativa') {
            setSelectedPlanta('Administrativa');
        } else {
            setSelectedPlanta('all');
        }
    }, [userType]);

    // Fetch plants dynamically (same as HILU buscador)
    useEffect(() => {
        const fetchPlantas = async () => {
            const { data } = await supabase
                .from('query_estado_hilu')
                .select('area')
                .not('area', 'is', null) as { data: { area: string | null }[] | null };

            if (data) {
                const unique = Array.from(new Set(data.map(p => p.area).filter(Boolean))) as string[];
                setPlantas(
                    unique
                        .filter(a => !AREAS_ADMINISTRATIVAS.includes(a))
                        .filter(a => !a.startsWith('{'))
                        .filter(a => a !== 'Produccion' && a !== 'Todos')
                        .sort()
                );
            }
        };
        fetchPlantas();
    }, [supabase]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch training records
                const { data: programacionData, error: progError } = await (supabase as any)
                    .from('hilu_programacion')
                    .select('*')
                    .order('fecha_programada', { ascending: false });

                if (progError) throw progError;
                if (!programacionData || programacionData.length === 0) {
                    setEntrenamientos([]);
                    return;
                }

                // Get unique employee IDs to fetch their details (cast to number for BIGINT columns)
                const empleadoIds = [...new Set(
                    programacionData.map((p: any) => Number(p.empleado_id)).filter((id: any) => id && !isNaN(id))
                )];

                if (empleadoIds.length === 0) {
                    setEntrenamientos(programacionData.map((p: any) => ({ ...p, empleados: null })));
                    return;
                }

                const { data: empleadosData, error: empError } = await supabase
                    .from('empleados')
                    .select('id, nombreCompleto, cargo')
                    .in('id', empleadoIds);

                if (empError) {
                    console.error('Error fetching empleados:', JSON.stringify(empError));
                    throw empError;
                }

                // Merge employee data into training records
                const empleadosMap = Object.fromEntries((empleadosData || []).map((e: any) => [e.id, e]));
                const merged = programacionData.map((p: any) => ({
                    ...p,
                    empleados: empleadosMap[p.empleado_id] || null
                }));

                setEntrenamientos(merged);
            } catch (err) {
                console.error('Error fetching history:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [supabase]);

    const filteredData = entrenamientos.filter(item => {
        const isAdministrativaItem = AREAS_ADMINISTRATIVAS.includes(item.planta) || item.planta === 'Administrativa';
        
        if (userType === 'administrativa' && !isAdministrativaItem) return false;
        if (userType === 'operativa' && isAdministrativaItem) return false;

        const matchesSearch = 
            item.empleados?.nombreCompleto?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.instructor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.planta?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesPlanta = selectedPlanta === 'all' || 
            (selectedPlanta === 'Administrativa' ? isAdministrativaItem : item.planta === selectedPlanta);
        
        return matchesSearch && matchesPlanta;
    });

    const handleUpdateEstado = async (id: string | number, estado: string) => {
        try {
            const { error } = await (supabase as any)
                .from('hilu_programacion')
                .update({ estado })
                .eq('id', id);

            if (error) throw error;

            // Update local state immediately for instant feedback
            setEntrenamientos(prev => prev.map(item =>
                item.id === id ? { ...item, estado } : item
            ));
        } catch (err) {
            console.error('Error updating estado:', err);
        }
    };

    const handleConfirmEdit = () => {
        if (!pendingEdit) return;
        const params = new URLSearchParams();
        params.set('tab', 'form');
        params.set('edit', String(pendingEdit.id));
        if (urlTipo) params.set('tipo', urlTipo);
        router.push(`/programar-entrenamiento?${params.toString()}`);
        setPendingEdit(null);
    };

    const handleExport = () => {
        if (filteredData.length === 0) return;

        const headers = ["Colaborador", "Cargo", "Planta", "Fecha", "Hora Inicio", "Hora Fin", "Instructor", "Fase", "Formado"];
        const csvContent = [
            headers.join(","),
            ...filteredData.map(item => [
                `"${item.empleados?.nombreCompleto || ''}"`,
                `"${item.empleados?.cargo || ''}"`,
                `"${item.planta || ''}"`,
                item.fecha_programada,
                item.hora_inicio,
                item.hora_fin,
                `"${item.instructor || ''}"`,
                item.fase_hilu,
                item.formado ? "SÍ" : "NO"
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `consolidado_entrenamientos_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            {/* Custom Header */}
            <div className="bg-[#1e2f3d] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.back()}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-4"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1" />
                <div className="w-8" />
            </div>

            <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Consolidado de Entrenamientos</h1>
                        <p className="text-gray-500 font-medium">Registro histórico de todas las sesiones de entrenamiento.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 md:w-80">
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar por nombre, instructor..."
                                className="pl-10 h-12 bg-white border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20"
                            />
                            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
                        </div>
                        <select
                            value={selectedPlanta}
                            onChange={(e) => setSelectedPlanta(e.target.value)}
                            className="h-12 px-4 bg-white border border-gray-200 rounded-2xl shadow-sm text-sm font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        >
                            {userType !== 'administrativa' && <option value="all">Todas las áreas</option>}
                            {userType !== 'operativa' && <option value="Administrativa">Administrativa</option>}
                            {userType !== 'administrativa' && plantas.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                        <button 
                            onClick={handleExport}
                            className="h-12 px-6 flex items-center justify-center bg-[#1e2f3d] rounded-2xl shadow-lg shadow-blue-900/10 text-white font-bold hover:bg-[#2c4558] transition-all"
                        >
                            <Download className="h-5 w-5 mr-2" />
                            EXPORTAR
                        </button>
                    </div>
                </div>

                <div className="flex bg-gray-200/50 p-1.5 rounded-2xl w-fit mx-auto md:mx-0">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                            activeTab === 'list' 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <List className="h-4 w-4" />
                        Vista de Lista
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                            activeTab === 'calendar' 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Vista de Calendario
                    </button>
                </div>

                {activeTab === 'calendar' ? (
                    <div className="bg-white rounded-[32px] p-2 md:p-6 shadow-sm border border-gray-100">
                        <CalendarioTeams userType={userType} onEventClick={(event) => setPendingEdit(event)} />
                    </div>
                ) : loading || loadingUser ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500 font-bold animate-pulse">Cargando registros...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredData.length > 0 ? (
                            filteredData.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => setPendingEdit(item)}
                                    className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm hover:shadow-md hover:ring-1 hover:ring-blue-200 transition-all group cursor-pointer"
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                                                item.tipo === 'Entrenamiento' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                            }`}>
                                                <BookOpen className="h-7 w-7" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">
                                                    {item.empleados?.nombreCompleto || 'Colaborador Desconocido'}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                        <Briefcase className="h-3 w-3" />
                                                        {item.empleados?.cargo || 'Sin cargo'}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {item.planta || 'Sin planta'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 px-2 lg:px-8 flex-1 border-y lg:border-y-0 lg:border-x border-gray-50 py-4 lg:py-0">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</span>
                                                <span className="text-sm font-bold text-gray-700">
                                                    {format(parseISO(item.fecha_programada), 'dd MMM yyyy', { locale: es })}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Horario</span>
                                                <span className="text-sm font-bold text-gray-700">
                                                    {item.hora_inicio} - {item.hora_fin}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Instructor</span>
                                                <span className="text-sm font-bold text-gray-700">
                                                    {item.instructor || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fase</span>
                                                <Badge className={`${
                                                    item.fase_hilu === 'I' ? 'bg-blue-100 text-blue-700' : 
                                                    item.fase_hilu === 'L' ? 'bg-green-100 text-green-700' : 
                                                    'bg-purple-100 text-purple-700'
                                                } border-none font-black w-fit px-3`}>
                                                    FASE {item.fase_hilu}
                                                </Badge>
                                            </div>
                                        </div>

                                            <div className="flex items-center justify-between lg:justify-end gap-3">
                                            <div className="flex flex-col items-end mr-2">
                                                {item.estado === 'Entrenamiento Realizado' ? (
                                                    <>
                                                        <span className="text-[9px] font-black uppercase tracking-widest mb-1 text-green-600">Realizado</span>
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    </>
                                                ) : item.estado === 'No Realizado' ? (
                                                    <>
                                                        <span className="text-[9px] font-black uppercase tracking-widest mb-1 text-red-500">No Realizado</span>
                                                        <XCircle className="h-4 w-4 text-red-400" />
                                                    </>
                                                ) : item.formado ? (
                                                    <>
                                                        <span className="text-[9px] font-black uppercase tracking-widest mb-1 text-green-500">Formado</span>
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-[9px] font-black uppercase tracking-widest mb-1 text-gray-400">Pendiente</span>
                                                        <XCircle className="h-4 w-4 text-gray-200" />
                                                    </>
                                                )}
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        await handleUpdateEstado(item.id, 'Entrenamiento Realizado');
                                                        router.push(`/entrenamiento/${item.empleado_id}`);
                                                    }}
                                                    title="Entrenamiento Realizado → Ver HILU"
                                                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors shadow-sm ${
                                                        item.estado === 'Entrenamiento Realizado'
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                                                    }`}
                                                >
                                                    <CheckCircle2 className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        await handleUpdateEstado(item.id, 'No Realizado');
                                                        router.push(`/programar-entrenamiento?tab=form&empleadoId=${item.empleado_id}`);
                                                    }}
                                                    title="No Realizado → Programar nuevo entrenamiento"
                                                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors shadow-sm ${
                                                        item.estado === 'No Realizado'
                                                            ? 'bg-red-500 text-white'
                                                            : 'bg-red-50 text-red-500 hover:bg-red-100'
                                                    }`}
                                                >
                                                    <XCircle className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white rounded-[32px] p-20 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6">
                                    <Search className="h-10 w-10 text-gray-300" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron registros</h3>
                                <p className="text-gray-500 max-w-xs">Intenta ajustar los filtros de búsqueda o programa un nuevo entrenamiento.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={!!pendingEdit}
                variant="info"
                title="¿Deseas editar el entrenamiento?"
                description={`Se abrirá el formulario de edición para ${pendingEdit?.empleados?.nombreCompleto || 'este colaborador'}, programado el ${pendingEdit ? format(parseISO(pendingEdit.fecha_programada), 'dd MMM yyyy', { locale: es }) : ''}.`}
                confirmLabel="Editar"
                cancelLabel="Cancelar"
                onConfirm={handleConfirmEdit}
                onCancel={() => setPendingEdit(null)}
            />
        </div>
    );
}

export default function HistorialEntrenamientosPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f8fafc]"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
            <HistorialEntrenamientosContent />
        </Suspense>
    );
}

// Internal Input component to avoid dependency issues if it's not exported
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${props.className}`}
        />
    )
}
