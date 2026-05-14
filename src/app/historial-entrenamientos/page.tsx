'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
    ArrowLeft, 
    Search, 
    Filter, 
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

export default function HistorialEntrenamientosPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [entrenamientos, setEntrenamientos] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('hilu_programacion')
                    .select('*, empleados(nombreCompleto, cargo)')
                    .order('fecha_programada', { ascending: false });

                if (error) throw error;
                setEntrenamientos(data || []);
            } catch (err) {
                console.error('Error fetching history:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [supabase]);

    const filteredData = entrenamientos.filter(item => 
        item.empleados?.nombreCompleto?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.instructor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.planta?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                <div className="flex-1 text-center font-medium text-lg tracking-wide uppercase">
                    Consolidado de Entrenamientos
                </div>
                <div className="w-8" />
            </div>

            <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Historial HILU</h1>
                        <p className="text-gray-500 font-medium">Registro histórico de todas las sesiones de entrenamiento.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 md:w-80">
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar por nombre, instructor..."
                                className="pl-10 h-12 bg-white border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20"
                            />
                            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
                        </div>
                        <button className="h-12 w-12 flex items-center justify-center bg-white border border-gray-200 rounded-2xl shadow-sm text-gray-600 hover:bg-gray-50 transition-colors">
                            <Filter className="h-5 w-5" />
                        </button>
                        <button className="h-12 px-6 flex items-center justify-center bg-[#1e2f3d] rounded-2xl shadow-lg shadow-blue-900/10 text-white font-bold hover:bg-[#2c4558] transition-all">
                            <Download className="h-5 w-5 mr-2" />
                            EXPORTAR
                        </button>
                    </div>
                </div>

                {loading ? (
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
                                    className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group"
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
                                                <span className="text-sm font-bold text-gray-700 truncate max-w-[120px]">
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

                                        <div className="flex items-center justify-between lg:justify-end gap-4">
                                            <div className="flex flex-col items-end">
                                                <span className={`text-xs font-black uppercase tracking-widest mb-1 ${
                                                    item.formado ? 'text-green-500' : 'text-gray-400'
                                                }`}>
                                                    {item.formado ? 'Formado' : 'Pendiente'}
                                                </span>
                                                <div className="flex gap-1">
                                                    {item.formado ? (
                                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                    ) : (
                                                        <XCircle className="h-5 w-5 text-gray-200" />
                                                    )}
                                                </div>
                                            </div>
                                            <button className="p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                                <ChevronRight className="h-6 w-6 text-gray-300 group-hover:text-[#1e2f3d] group-hover:translate-x-1 transition-all" />
                                            </button>
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
        </div>
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
