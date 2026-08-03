import { useState, useEffect } from 'react'
import { format, parseISO, isValid, differenceInHours } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Briefcase, FileText, User, MessageCircle, AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ADMIN_EMAILS, ADMIN_LEVELS } from '@/lib/constants/roles'

interface ProcesoCardProps {
    proceso: {
        id: number | string
        created_at: string
        cargo: string
        tipo: string
        motivo: string
        motivo_id?: number
        created_by: string
        comentario: string
    }
    onEdit?: (proceso: any) => void
    onDelete?: (proceso: any) => void
}

export function ProcesoCard({ proceso, onEdit, onDelete }: ProcesoCardProps) {
    const supabase = createClient()
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [pendingDelete, setPendingDelete] = useState(false)

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)
        }
        getUser()
    }, [supabase])

    const isAdmin = () => {
        if (!currentUser) return false
        return ADMIN_EMAILS.includes(currentUser.email || '') ||
            (ADMIN_LEVELS as any).includes(currentUser.user_metadata?.nivelCargo || '')
    }

    const formatDate = (dateString: string) => {
        try {
            const date = parseISO(dateString)
            if (!isValid(date)) return 'Fecha inválida'
            return format(date, "d 'de' MMMM, yyyy", { locale: es })
        } catch (error) {
            return 'Fecha inválida'
        }
    }

    const canEdit = () => {
        if (!currentUser || !proceso.created_at) return false

        if (isAdmin()) return true

        const createdAt = parseISO(proceso.created_at)
        const hoursSinceCreation = differenceInHours(new Date(), createdAt)
        
        const isWithin24Hours = hoursSinceCreation < 24
        const isCreator = currentUser.email === proceso.created_by || 
                         currentUser.user_metadata?.nombre === proceso.created_by

        return isCreator && isWithin24Hours
    }

    return (
        <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300 relative group">
            <div className={`h-1 w-full ${proceso.tipo === 'Descargo' ? 'bg-red-500' :
                    proceso.tipo === 'Llamado de atencion' ? 'bg-orange-500' : 'bg-blue-500'
                }`} />
            
            {((onEdit && canEdit()) || (onDelete && isAdmin())) && (
                <div className="absolute right-4 top-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    {onEdit && canEdit() && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(proceso)}
                            className="bg-white/90 backdrop-blur-sm border-gray-200 hover:border-[#1D3557] hover:text-[#1D3557] rounded-full h-8 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm"
                        >
                            <Pencil className="h-3 w-3" />
                            Editar
                        </Button>
                    )}
                    {onDelete && isAdmin() && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingDelete(true)}
                            className="bg-white/90 backdrop-blur-sm border-red-200 text-red-500 hover:border-red-400 hover:bg-red-50 hover:text-red-600 rounded-full h-8 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm"
                        >
                            <Trash2 className="h-3 w-3" />
                            Eliminar
                        </Button>
                    )}
                </div>
            )}

            <ConfirmDialog
                isOpen={pendingDelete}
                variant="danger"
                title="¿Eliminar este registro?"
                description="Se eliminará este proceso disciplinario de forma permanente. Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => { onDelete?.(proceso); setPendingDelete(false) }}
                onCancel={() => setPendingDelete(false)}
            />

            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Fecha */}
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <Calendar className="h-5 w-5 text-[#1D3557]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</p>
                            <p className="text-sm font-semibold text-[#1D3557]">{formatDate(proceso.created_at)}</p>
                        </div>
                    </div>

                    {/* Cargo */}
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <Briefcase className="h-5 w-5 text-[#1D3557]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cargo</p>
                            <p className="text-sm font-semibold text-[#1D3557]">{proceso.cargo || 'No especificado'}</p>
                        </div>
                    </div>

                    {/* Tipo de Proceso */}
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-[#1D3557]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo de proceso</p>
                            <p className="text-sm font-semibold text-[#1D3557]">{proceso.tipo}</p>
                        </div>
                    </div>

                    {/* Motivo de sanción */}
                    <div className="flex items-start gap-3 lg:col-span-2">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <FileText className="h-5 w-5 text-[#1D3557]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Motivo de sanción</p>
                            <p className="text-sm font-semibold text-[#1D3557]">{proceso.motivo}</p>
                        </div>
                    </div>

                    {/* Creado por */}
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <User className="h-5 w-5 text-[#1D3557]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Creado por</p>
                            <p className="text-sm font-semibold text-[#1D3557]">{proceso.created_by}</p>
                        </div>
                    </div>

                    {/* Comentario */}
                    <div className="flex items-start gap-3 md:col-span-2 lg:col-span-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <MessageCircle className="h-5 w-5 text-[#1D3557]" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Comentario</p>
                            <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                                {proceso.comentario || 'Sin comentarios adicionales.'}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
