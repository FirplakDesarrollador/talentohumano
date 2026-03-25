'use client'

import { Card, CardContent } from '@/components/ui/card'
import { LayoutDashboard, ExternalLink, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function KanbanView() {
    // Nota: El link de Power BI debería ser configurado aquí o venir de una variable de entorno/BD
    const powerBiUrl = "https://app.powerbi.com/view?r=eyJrIjoiYzhhZjQyMzctNWYyNS00Y2VjLThmY2EtZGUzY2Y4Zjg0ZTIyIiwidCI6IjQyYzg5Y2RlLWExYmItNDM1Yi1hYjE0LTgxN2IyYzBkYjM1NyIsImMiOjR9";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-600 p-2 rounded-xl text-white shadow-sm">
                        <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-[#2d4356]">BI Kanban de Desempeño</h2>
                </div>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100 rounded-lg px-3 py-1">
                    Power BI Live
                </Badge>
            </div>

            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
                <CardContent className="p-0">
                    <div className="aspect-video w-full bg-gray-50 flex items-center justify-center relative group">
                        <iframe 
                            title="BI Kanban Dashboard"
                            className="w-full h-[600px] border-none"
                            src={powerBiUrl}
                            allowFullScreen={true}
                        ></iframe>
                        
                        {/* Overlay helpers */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a 
                                href={powerBiUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="bg-white/90 backdrop-blur shadow-sm p-2 rounded-full text-purple-600 hover:text-purple-700 transition-colors"
                            >
                                <ExternalLink size={20} />
                            </a>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-blue-50/50 rounded-2xl p-4 flex gap-3 items-start border border-blue-100">
                <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-blue-700 leading-relaxed">
                    Este tablero visualiza el flujo de trabajo y el estatus de las actividades de desempeño integradas directamente desde Power BI. 
                    Utilice los filtros internos del reporte para profundizar en los datos.
                </p>
            </div>
        </div>
    )
}
