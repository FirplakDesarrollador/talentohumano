'use client'

import React from 'react';
import { Calendar, User, Briefcase, Info, Clock } from 'lucide-react';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { substring } from '@/lib/utils';

export interface Ausentismo {
    id: number;
    'Título'?: number | null; // Cédula
    'Nombre Completo': string;
    'Motivo Ausentismo': string;
    'Codigo Incapacidad'?: string | null;
    'FechaInicio': string;
    'FechaFinal': string;
    'Observaciones'?: string | null;
    'Planta'?: string | null;
    'Jefe'?: string | null;
    'Contrato'?: string | null;
    'Cargo'?: string | null;
    'Descontar nomina'?: string | null;
    'Creado'?: string | null;
}

interface AusentismoCardProps {
    ausentismo: Ausentismo;
}

export const AusentismoCard: React.FC<AusentismoCardProps> = ({ ausentismo }) => {
    const calculateDays = () => {
        try {
            const start = parseISO(ausentismo.FechaInicio);
            const end = parseISO(ausentismo.FechaFinal);
            if (isValid(start) && isValid(end)) {
                // differenceInDays returns full days, we add 1 to include the last day as in the Flutter logic
                return differenceInDays(end, start) + 1;
            }
        } catch (e) {
            console.error('Error calculating days:', e);
        }
        return '?';
    };

    const days = calculateDays();

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
            <div className="p-5 flex flex-col gap-4">
                {/* Header: Employee Info */}
                <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                        <User className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate">
                            {ausentismo['Nombre Completo']}
                        </h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <Briefcase className="h-3 w-3" />
                            {ausentismo['Cargo'] || 'Cargo no especificado'}
                        </p>
                    </div>
                    <div className="bg-orange-50 text-orange-600 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {ausentismo['Motivo Ausentismo']}
                    </div>
                </div>

                <div className="h-px bg-gray-50 w-full" />

                {/* Body: Dates and Days */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                            Fecha Inicio
                        </span>
                        <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <span className="text-xs font-semibold">{ausentismo.FechaInicio}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                            Fecha Final
                        </span>
                        <div className="flex items-center gap-2 text-gray-700 justify-end">
                            <span className="text-xs font-semibold">{ausentismo.FechaFinal}</span>
                            <Calendar className="h-4 w-4 text-blue-500" />
                        </div>
                    </div>
                </div>

                {/* Total Days Footer */}
                <div className="bg-gray-50 -mx-5 -mb-5 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Duración Total
                        </span>
                    </div>
                    <div className="text-sm font-black text-blue-600">
                        {days} {days === 1 ? 'Día' : 'Días'}
                    </div>
                </div>
            </div>

            {ausentismo['Observaciones'] && (
                <div className="px-5 pb-4 pt-1">
                    <p className="text-[11px] text-gray-500 italic flex items-start gap-1.5 bg-yellow-50/50 p-2 rounded-lg border border-yellow-100/50">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        &quot;{ausentismo['Observaciones'].length > 120
                            ? `${substring(ausentismo['Observaciones'], 0, 120)}...`
                            : ausentismo['Observaciones']}&quot;
                    </p>
                </div>
            )}
        </div>
    );
};
