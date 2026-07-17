'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    format,
    isSameDay,
    isSameMonth,
    isToday,
    parseISO,
    startOfMonth,
    startOfWeek,
    endOfWeek,
    subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { getFestivosColombia } from '@/lib/colombia-holidays'

interface HolidayDatePickerProps {
    value: string // 'YYYY-MM-DD'
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

export function HolidayDatePicker({ value, onChange, placeholder = 'Selecciona una fecha', className = '' }: HolidayDatePickerProps) {
    const [open, setOpen] = useState(false)
    const selectedDate = value ? parseISO(value) : null
    const [viewDate, setViewDate] = useState(selectedDate || new Date())
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Festivos de los años relevantes para la grilla visible (puede mostrar dias
    // del mes anterior/siguiente, que a veces caen en otro año).
    const festivos = useMemo(() => {
        const year = viewDate.getFullYear()
        const merged = new Map<string, string>()
        for (const y of [year - 1, year, year + 1]) {
            getFestivosColombia(y).forEach((nombre, key) => merged.set(key, nombre))
        }
        return merged
    }, [viewDate])

    const days = useMemo(() => {
        const monthStart = startOfMonth(viewDate)
        const monthEnd = endOfMonth(viewDate)
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
        const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
        return eachDayOfInterval({ start: gridStart, end: gridEnd })
    }, [viewDate])

    const handleSelect = (day: Date) => {
        onChange(format(day, 'yyyy-MM-dd'))
        setOpen(false)
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full h-12 flex items-center gap-2 px-3 bg-gray-50 rounded-xl border border-transparent text-left text-sm font-medium transition-all hover:bg-gray-100 ${className}`}
            >
                <CalendarIcon className="h-4 w-4 text-gray-400 shrink-0" />
                <span className={selectedDate ? 'text-gray-800' : 'text-gray-400'}>
                    {selectedDate ? format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: es }) : placeholder}
                </span>
            </button>

            {open && (
                <div className="absolute z-50 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 animate-in fade-in zoom-in-95 duration-150">
                    {/* Header: mes/año + navegacion */}
                    <div className="flex items-center justify-between mb-3">
                        <button
                            type="button"
                            onClick={() => setViewDate(d => subMonths(d, 1))}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-bold text-gray-700 capitalize">
                            {format(viewDate, 'MMMM yyyy', { locale: es })}
                        </span>
                        <button
                            type="button"
                            onClick={() => setViewDate(d => addMonths(d, 1))}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Dias de la semana */}
                    <div className="grid grid-cols-7 mb-1">
                        {DIAS_SEMANA.map(d => (
                            <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Grilla de dias */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map(day => {
                            const key = format(day, 'yyyy-MM-dd')
                            const nombreFestivo = festivos.get(key)
                            const inMonth = isSameMonth(day, viewDate)
                            const selected = selectedDate && isSameDay(day, selectedDate)
                            const today = isToday(day)

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    title={nombreFestivo || undefined}
                                    onClick={() => handleSelect(day)}
                                    className={`relative h-9 rounded-lg text-xs font-semibold transition-all flex items-center justify-center
                                        ${!inMonth ? 'text-gray-300' : nombreFestivo ? 'text-red-600' : 'text-gray-700'}
                                        ${selected ? 'bg-blue-600 text-white shadow-sm' : nombreFestivo && inMonth ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-100'}
                                        ${today && !selected ? 'ring-1 ring-blue-300' : ''}
                                    `}
                                >
                                    {format(day, 'd')}
                                    {nombreFestivo && !selected && (
                                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-red-500" />
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* Leyenda */}
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-[10px] text-gray-400 font-medium">Festivo en Colombia</span>
                    </div>
                </div>
            )}
        </div>
    )
}
