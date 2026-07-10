'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Calendar, FormInput, Plus, LayoutGrid, List, Loader2 } from 'lucide-react';
import { FormularioProgramacion } from '@/components/Programacion/FormularioProgramacion';
import { CalendarioTeams } from '@/components/Programacion/CalendarioTeams';
import { createClient } from '@/lib/supabase/client';
import { ADMIN_EMAILS, ADMIN_LEVELS, AREAS_ADMINISTRATIVAS } from '@/lib/constants/roles';

function ProgramarEntrenamientoContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlTipo = searchParams.get('tipo');
    const supabase = createClient();
    
    // Initialize tab from URL if present
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'form');
    
    // Parse date from URL if present
    const initialDateParam = searchParams.get('date');
    const [initialDate] = useState(initialDateParam ? new Date(initialDateParam + 'T12:00:00') : new Date());
    
    // Get editId from URL if present
    const editId = searchParams.get('edit');
    
    // Get empleadoId from URL if present
    const empleadoId = searchParams.get('empleadoId');
    
    const [refreshKey, setRefreshKey] = useState(0);
    const [userType, setUserType] = useState<'admin' | 'administrativa' | 'operativa' | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const email = user.email || '';
                const nivelCargo = user.user_metadata?.nivelCargo || '';
                const isAdmin = ADMIN_EMAILS.includes(email) || (ADMIN_LEVELS as any).includes(nivelCargo);

                // El parametro de la URL indica desde donde entro el usuario (HILU
                // Operativa vs HILU Administrativa) y siempre tiene prioridad sobre
                // el area/planta del propio empleado: alguien cuya propia area es
                // "administrativa" (ej. Manufactura) puede igualmente necesitar
                // buscar y programar entrenamientos de personal operativo.
                if (urlTipo === 'operativa' || urlTipo === 'administrativa') {
                    setUserType(urlTipo);
                } else if (isAdmin) {
                    setUserType('admin');
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

    const handleSuccess = () => {
        setRefreshKey(prev => prev + 1);
        setActiveTab('calendar');
        // Clear params if they exist to avoid confusion
        if (editId || empleadoId) {
            router.replace('/programar-entrenamiento?tab=calendar');
        }
    };

    const handleEventClick = (event: any) => {
        setActiveTab('form');
        const params = new URLSearchParams();
        params.set('tab', 'form');
        params.set('edit', String(event.id));
        if (urlTipo) params.set('tipo', urlTipo);
        router.push(`/programar-entrenamiento?${params.toString()}`);
    };

    if (loadingUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

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

            <div className="max-w-[1600px] mx-auto p-4 lg:p-8">
                
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                                {editId ? 'Editar Entrenamiento' : 'Programación de Entrenamientos'}
                            </h1>
                            <p className="text-gray-500 font-medium">
                                {editId ? 'Modifique los detalles del entrenamiento seleccionado.' : 'Programa y visualiza los entrenamientos técnicos del personal.'}
                            </p>
                        </div>
                        
                        <div className="bg-white border border-gray-200 p-1 rounded-2xl shadow-sm h-14 flex">
                            <button 
                                onClick={() => setActiveTab('form')}
                                className={`flex items-center rounded-xl px-6 transition-all font-bold ${activeTab === 'form' ? 'bg-[#1e2f3d] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <FormInput className="h-4 w-4 mr-2" />
                                {editId ? 'EDITAR' : 'FORMULARIO'}
                            </button>
                            <button 
                                onClick={() => setActiveTab('calendar')}
                                className={`flex items-center rounded-xl px-6 transition-all font-bold ${activeTab === 'calendar' ? 'bg-[#1e2f3d] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <Calendar className="h-4 w-4 mr-2" />
                                CALENDARIO
                            </button>
                        </div>
                    </div>

                    {activeTab === 'form' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                <div className="lg:col-span-5">
                                    <FormularioProgramacion 
                                        onSuccess={handleSuccess} 
                                        editId={editId} 
                                        preselectedEmpleadoId={empleadoId}
                                        userType={userType}
                                    />
                                </div>
                                <div className="lg:col-span-7 space-y-6">
                                    <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                                <LayoutGrid className="h-5 w-5" />
                                            </div>
                                            <h2 className="text-xl font-bold text-gray-900">Vista Previa del Calendario</h2>
                                        </div>
                                        <div className="transform scale-[0.8] origin-top opacity-80 pointer-events-none">
                                            <CalendarioTeams key={`preview-${refreshKey}`} initialDate={initialDate} userType={userType} />
                                        </div>
                                        <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                            Pulse en el botón &quot;CALENDARIO&quot; para ver a pantalla completa
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <CalendarioTeams key={refreshKey} initialDate={initialDate} userType={userType} onEventClick={handleEventClick} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ProgramarEntrenamientoPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        }>
            <ProgramarEntrenamientoContent />
        </Suspense>
    );
}
