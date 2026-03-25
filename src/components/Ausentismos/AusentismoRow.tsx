'use client'

import React from 'react';
import { Calendar, User, Briefcase, Info, Clock, ChevronRight } from 'lucide-react';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { substring } from '@/lib/utils';
import { type Ausentismo } from './AusentismoCard';

interface AusentismoRowProps {
    ausentismo: Ausentismo;
}

export const AusentismoRow: React.FC<AusentismoRowProps> = ({ ausentismo }) => {
    const calculateDays = () => {
        try {
            const start = parseISO(ausentismo.FechaInicio);
            const end = parseISO(ausentismo.FechaFinal);
            if (isValid(start) && isValid(end)) {
                return differenceInDays(end, start) + 1;
            }
        } catch (e) {
            console.error('Error calculating days:', e);
        }
        return '?';
    };

    const days = calculateDays();

    return (
        <div className="bg-white border-b border-gray-100 hover:bg-blue-50/30 transition-all duration-200 group">
            <div className="px-4 py-3 flex flex-row items-center gap-4">
                {/* Left: Employee Info */}
                <div className="flex items-center gap-3 w-1/3 min-w-[200px]">
                    <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate">
                            {ausentismo['Nombre Completo']}
                        </h3>
                        <p className="text-[10px] text-gray-400 truncate font-medium uppercase tracking-wider">
                            {ausentismo['Cargo'] || 'Cargo no especificado'}
                        </p>
                    </div>
                </div>

                {/* Middle: Motivo and Dates */}
                <div className="flex-1 flex flex-row items-center gap-6">
                    <div className="w-32 shrink-0">
                        <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border border-orange-100 block text-center truncate">
                            {ausentismo['Motivo Ausentismo']}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-500 text-[11px] font-bold">
                        <Calendar className="h-3.5 w-3.5 text-blue-400" />
                        <span>{ausentismo.FechaInicio}</span>
                        <span className="text-gray-300">-</span>
                        <span>{ausentismo.FechaFinal}</span>
                    </div>
                </div>

                {/* Right: Duration */}
                <div className="flex items-center gap-6 shrink-0">
                    <div className="flex items-center gap-1.5 text-blue-600 font-extrabold text-xs bg-blue-50/50 px-3 py-1 rounded-full">
                        <Clock className="h-3 w-3 text-blue-400" />
                        {days} {days === 1 ? 'Día' : 'Días'}
                    </div>
                    
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
            </div>

            {ausentismo['Observaciones'] && (
                <div className="px-4 pb-2 -mt-1">
                    <div className="text-[10px] text-gray-400 italic flex items-center gap-2 pl-11">
                        <Info className="h-3 w-3 shrink-0 text-amber-300" />
                        <span className="truncate">{ausentismo['Observaciones']}</span>
                    </div>
                </div>
            )}
        </div>
    );
};
