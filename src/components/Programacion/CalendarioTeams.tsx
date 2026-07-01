'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
    ChevronLeft, 
    ChevronRight, 
    Clock, 
    User, 
    MapPin, 
    Calendar as CalendarIcon,
    Loader2,
    Plus
} from 'lucide-react';
import { 
    format, 
    addDays, 
    startOfWeek, 
    eachDayOfInterval, 
    isSameDay, 
    addWeeks, 
    subWeeks,
    parseISO,
    isToday
} from 'date-fns';
import { es } from 'date-fns/locale';

import { AREAS_ADMINISTRATIVAS } from '@/lib/constants/roles';

interface CalendarioTeamsProps {
    onEventClick?: (event: any) => void;
    initialDate?: Date;
    userType?: 'admin' | 'administrativa' | 'operativa' | null;
}

export const CalendarioTeams: React.FC<CalendarioTeamsProps> = ({ onEventClick, initialDate, userType }) => {
    const supabase = React.useMemo(() => createClient(), []);
    const [currentDate, setCurrentDate] = useState(initialDate || new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM

    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('hilu_programacion')
                    .select('*, empleados(nombreCompleto)')
                    .gte('fecha_programada', weekStartStr)
                    .lte('fecha_programada', weekEndStr);

                if (error) throw error;
                
                let filteredData = data || [];
                if (userType === 'administrativa') {
                    filteredData = filteredData.filter(event => AREAS_ADMINISTRATIVAS.includes(event.planta || '') || event.planta === 'Administrativa');
                } else if (userType === 'operativa') {
                    filteredData = filteredData.filter(event => !AREAS_ADMINISTRATIVAS.includes(event.planta || '') && event.planta !== 'Administrativa');
                }

                setEvents(filteredData);
            } catch (err) {
                console.error('Error fetching calendar events:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [weekStartStr, weekEndStr, supabase, userType]);

    const getEventsForDayAndHour = (day: Date, hour: number) => {
        return events.filter(event => {
            const eventDate = parseISO(event.fecha_programada);
            if (!isSameDay(eventDate, day)) return false;
            
            const startHour = parseInt(event.hora_inicio.split(':')[0]);
            return startHour === hour;
        });
    };

    const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
    const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const goToday = () => setCurrentDate(new Date());

    return (
        <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[800px]">
            {/* Header */}
            <div className="px-8 py-6 border-bottom border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                    <div className="bg-[#1e2f3d] p-3 rounded-2xl text-white shadow-lg shadow-blue-900/20">
                        <CalendarIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Programación Semanal</h2>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                            {format(weekStart, "dd 'de' MMMM", { locale: es })} - {format(weekEnd, "dd 'de' MMMM, yyyy", { locale: es })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
                    <button 
                        onClick={prevWeek}
                        className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-600"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button 
                        onClick={goToday}
                        className="px-4 py-2 text-sm font-bold text-[#1e2f3d] hover:bg-gray-50 rounded-xl transition-colors"
                    >
                        HOY
                    </button>
                    <button 
                        onClick={nextWeek}
                        className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-600"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 text-[#1e2f3d] animate-spin" />
                    </div>
                )}
                
                <div className="min-w-[800px] grid grid-cols-[100px_repeat(7,1fr)] h-full">
                    {/* Time Column Header */}
                    <div className="border-r border-b border-gray-100 bg-gray-50/30 sticky top-0 z-20 h-16 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-gray-400" />
                    </div>

                    {/* Day Headers */}
                    {days.map((day, idx) => (
                        <div 
                            key={idx} 
                            className={`border-b border-gray-100 sticky top-0 z-20 h-16 flex flex-col items-center justify-center transition-colors ${
                                isToday(day) ? 'bg-blue-50/50' : 'bg-gray-50/30'
                            }`}
                        >
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isToday(day) ? 'text-blue-500' : 'text-gray-400'}`}>
                                {format(day, 'EEEE', { locale: es })}
                            </span>
                            <span className={`text-xl font-black ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}`}>
                                {format(day, 'dd')}
                            </span>
                            {isToday(day) && (
                                <div className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full" />
                            )}
                        </div>
                    ))}

                    {/* Time Labels Column */}
                    <div className="grid grid-rows-[repeat(13,80px)]">
                        {hours.map((hour) => (
                            <div key={hour} className="border-r border-b border-gray-100 flex items-start justify-center pt-3 text-[10px] font-bold text-gray-400 bg-gray-50/10">
                                {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                            </div>
                        ))}
                    </div>

                    {/* Day Columns */}
                    {days.map((day, dayIdx) => {
                        const dayEvents = events.filter(event => {
                            const eventDate = parseISO(event.fecha_programada);
                            return isSameDay(eventDate, day);
                        });

                        return (
                            <div key={dayIdx} className="relative border-r border-gray-100 grid grid-rows-[repeat(13,80px)]">
                                {/* Grid Lines */}
                                {hours.map((hour) => (
                                    <div key={hour} className="border-b border-gray-50 h-[80px]" />
                                ))}

                                {/* Events Layer */}
                                {dayEvents.map((event) => {
                                    const startParts = event.hora_inicio.split(':');
                                    const endParts = event.hora_fin.split(':');
                                    
                                    const startHour = parseInt(startParts[0]);
                                    const startMin = parseInt(startParts[1]);
                                    const endHour = parseInt(endParts[0]);
                                    const endMin = parseInt(endParts[1]);

                                    const startDecimal = startHour + (startMin / 60);
                                    const endDecimal = endHour + (endMin / 60);
                                    const duration = endDecimal - startDecimal;

                                    // Position relative to 7 AM (the first hour in our array)
                                    const topPosition = (startDecimal - 7) * 80;
                                    const eventHeight = duration * 80;

                                    return (
                                        <div
                                            key={event.id}
                                            onClick={() => onEventClick?.(event)}
                                            style={{ 
                                                top: `${topPosition}px`, 
                                                height: `${eventHeight}px`,
                                                zIndex: 10
                                            }}
                                            className={`
                                                absolute left-1 right-1 p-2 rounded-xl text-left cursor-pointer transition-all duration-300 shadow-sm border
                                                ${event.tipo === 'Entrenamiento' 
                                                    ? 'bg-blue-50 border-blue-200 text-blue-900 hover:shadow-md hover:scale-[1.01] hover:bg-blue-100' 
                                                    : 'bg-purple-50 border-purple-200 text-purple-900 hover:shadow-md hover:scale-[1.01] hover:bg-purple-100'
                                                }
                                                overflow-hidden flex flex-col
                                            `}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">
                                                    {event.fase_hilu ? `FASE ${event.fase_hilu}` : event.tipo}
                                                </span>
                                                <span className="text-[9px] font-bold opacity-60">
                                                    {event.hora_inicio.substring(0, 5)} - {event.hora_fin.substring(0, 5)}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-black leading-tight truncate">
                                                {event.empleados?.nombreCompleto || 'Sin nombre'}
                                            </p>
                                            
                                            {duration >= 1 && (
                                                <div className="mt-1 flex items-center gap-1 opacity-80 text-blue-800">
                                                    <User className="h-2.5 w-2.5" />
                                                    <span className="text-[9px] font-black truncate">{event.instructor || 'Sin instructor'}</span>
                                                </div>
                                            )}

                                            {duration >= 1.5 && (
                                                <div className="mt-auto flex items-center gap-1 opacity-60">
                                                    <MapPin className="h-2.5 w-2.5" />
                                                    <span className="text-[9px] font-bold truncate">{event.planta || 'Sin planta'}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
