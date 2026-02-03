'use client'

import React from 'react';
import { Search, Eraser, Filter, User, MapPin, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export const PLANTAS = [
    'Administrativa ',
    'Talento y Cultura',
    'TI',
    'Calidad',
    'Ingenieria',
    'Contabilidad',
    'Mantenimiento',
    'Financiera',
    'Comercial',
    'Negociacion y compras',
    'Logistica',
    'Mercadeo',
    'Servicios',
    'Manufactura',
    'Muebles',
    'Almacen',
    'CEDI',
    'Moldes',
    'I+D+I',
    'Produccion',
    'RR Moldes',
    'Fibra de vidrio',
    'Legal',
    'RTM',
    'Cefi',
    'Marmol sintetico',
    'Todos'
];

interface GestorFiltersProps {
    busqueda: string;
    onBusquedaChange: (val: string) => void;
    jefes: string[];
    selectedJefe: string;
    onJefeChange: (val: string) => void;
    selectedPlanta: string;
    onPlantaChange: (val: string) => void;
    status: boolean;
    onStatusChange: (val: boolean) => void;
    onClear: () => void;
    availablePlantas?: string[]; // To allow dynamic filtering based on role
}

export const GestorFilters: React.FC<GestorFiltersProps> = ({
    busqueda,
    onBusquedaChange,
    jefes,
    selectedJefe,
    onJefeChange,
    selectedPlanta,
    onPlantaChange,
    status,
    onStatusChange,
    onClear,
    availablePlantas = PLANTAS
}) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
                {/* Advanced Search */}
                <div className="flex-1 w-full flex flex-col gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                        Búsqueda avanzada
                    </Label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                placeholder="Nombre, cédula o cargo..."
                                value={busqueda}
                                onChange={(e) => onBusquedaChange(e.target.value)}
                                className="h-11 pl-11 rounded-xl border-gray-200 focus:ring-blue-500/20"
                            />
                            <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
                        </div>
                        <Button
                            variant="outline"
                            onClick={onClear}
                            className="h-11 w-11 p-0 rounded-xl border-gray-200 text-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                            title="Limpiar filtros"
                        >
                            <Eraser className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Jefe Filter */}
                <div className="w-full lg:w-56 flex flex-col gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-1">
                        <User className="h-3 w-3" /> Jefe
                    </Label>
                    <select
                        value={selectedJefe}
                        onChange={(e) => onJefeChange(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right:10px_center] bg-no-repeat pr-10"
                    >
                        <option value="">Todos los jefes</option>
                        {jefes.map((jefe) => (
                            <option key={jefe} value={jefe}>{jefe}</option>
                        ))}
                    </select>
                </div>

                {/* Planta Filter */}
                <div className="w-full lg:w-56 flex flex-col gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Planta / Área
                    </Label>
                    <select
                        value={selectedPlanta}
                        onChange={(e) => onPlantaChange(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right:10px_center] bg-no-repeat pr-10"
                    >
                        {availablePlantas.map((planta) => (
                            <option key={planta} value={planta}>{planta}</option>
                        ))}
                    </select>
                </div>

                {/* Status Toggle */}
                <div className="w-full lg:w-44 flex flex-col gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-1">
                        <Activity className="h-3 w-3" /> Estado
                    </Label>
                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 h-11">
                        <button
                            onClick={() => onStatusChange(true)}
                            className={`flex-1 text-[11px] font-bold rounded-lg transition-all ${status ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            ACTIVO
                        </button>
                        <button
                            onClick={() => onStatusChange(false)}
                            className={`flex-1 text-[11px] font-bold rounded-lg transition-all ${!status ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            RETIRADO
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
