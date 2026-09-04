'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Handle,
    Position,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
    useReactFlow,
    type Node,
    type Edge,
    type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, Search, Maximize2, X } from 'lucide-react'

export interface OrgEmpleado {
    id: number
    nombreCompleto: string
    cargo: string | null
    planta: string | null
    foto: string | null
    jefe: string | null
}

const NODE_WIDTH = 220
const NODE_HEIGHT = 96
const DEFAULT_PHOTO = 'https://jdtjtkncptwqdhlxmzds.supabase.co/storage/v1/object/public/publico/assets/perfil.png'

const eliminarAcentos = (s: string) =>
    (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

type OrgNodeData = {
    empleado: OrgEmpleado
    childCount: number
    isCollapsed: boolean
    isMatch: boolean
    onToggle: (id: number) => void
    onOpen: (id: number) => void
}

function OrgNode({ data }: NodeProps & { data: OrgNodeData }) {
    const { empleado, childCount, isCollapsed, isMatch, onToggle, onOpen } = data
    const foto = empleado.foto && (empleado.foto.startsWith('http') || empleado.foto.startsWith('/'))
        ? empleado.foto
        : DEFAULT_PHOTO

    return (
        <div
            onClick={() => onOpen(empleado.id)}
            className={`relative bg-white rounded-2xl shadow-md border-2 px-4 py-3 cursor-pointer hover:shadow-lg transition-all ${isMatch ? 'border-blue-500 ring-4 ring-blue-100' : 'border-gray-100'
                }`}
            style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
        >
            <Handle type="target" position={Position.Top} className="!bg-slate-300 !border-none !w-2 !h-2" />
            <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !border-none !w-2 !h-2" />

            <div className="flex items-center gap-3 h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={foto}
                    alt={empleado.nombreCompleto}
                    className="w-11 h-11 rounded-xl object-cover shrink-0 border border-gray-100"
                />
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 leading-tight truncate" title={empleado.nombreCompleto}>
                        {empleado.nombreCompleto}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate" title={empleado.cargo || ''}>
                        {empleado.cargo || 'Sin cargo'}
                    </p>
                    {empleado.planta && (
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wide text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full truncate max-w-full">
                            {empleado.planta}
                        </span>
                    )}
                </div>
            </div>

            {childCount > 0 && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggle(empleado.id) }}
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#1e2f3d] hover:bg-[#2d4356] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md transition-colors"
                >
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {childCount}
                </button>
            )}
        </div>
    )
}

const nodeTypes = { orgNode: OrgNode }

function layoutWithDagre(nodes: Node[], edges: Edge[]) {
    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: 'TB', nodesep: 32, ranksep: 70 })
    nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
    edges.forEach((e) => g.setEdge(e.source, e.target))
    dagre.layout(g)
    return nodes.map((n) => {
        const pos = g.node(n.id)
        return { ...n, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } }
    })
}

function FitToMatches({ matchIds }: { matchIds: number[] }) {
    const { fitView } = useReactFlow()
    useEffect(() => {
        if (matchIds.length === 0) return
        const t = setTimeout(() => {
            fitView({ nodes: matchIds.map((id) => ({ id: id.toString() })), duration: 400, maxZoom: 1.2, padding: 0.5 })
        }, 60)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matchIds.join(',')])
    return null
}

function OrganigramaInner({ empleados }: { empleados: OrgEmpleado[] }) {
    const router = useRouter()

    const { byId, childrenOf, roots } = useMemo(() => {
        const byId = new Map<number, OrgEmpleado>()
        const byNameNorm = new Map<string, OrgEmpleado>()
        empleados.forEach((e) => {
            byId.set(e.id, e)
            const norm = eliminarAcentos(e.nombreCompleto)
            if (norm && !byNameNorm.has(norm)) byNameNorm.set(norm, e)
        })

        // Candidato a padre de cada persona (puede aun contener ciclos: con
        // ~360 "jefe" digitados a mano, es cuestion de tiempo que alguien
        // termine siendo, directa o indirectamente, jefe de su propio jefe).
        const jefeIdOf = new Map<number, number>()
        empleados.forEach((e) => {
            const jefeNorm = eliminarAcentos(e.jefe || '')
            const jefeRow = jefeNorm ? byNameNorm.get(jefeNorm) : null
            if (jefeRow && jefeRow.id !== e.id) jefeIdOf.set(e.id, jefeRow.id)
        })

        // Un ciclo (real o via otro ciclo distinto) forma aristas circulares que
        // rompen el layout de dagre. Se trata igual que un jefe inexistente: la
        // persona se muestra como raiz en vez de participar del ciclo.
        const isPartOfCycle = (startId: number): boolean => {
            const seen = new Set<number>([startId])
            let cur = jefeIdOf.get(startId)
            while (cur != null) {
                if (cur === startId) return true
                if (seen.has(cur)) return false
                seen.add(cur)
                cur = jefeIdOf.get(cur)
            }
            return false
        }

        const childrenOf = new Map<number, number[]>()
        const roots: number[] = []
        empleados.forEach((e) => {
            const parentId = jefeIdOf.get(e.id)
            if (parentId != null && !isPartOfCycle(e.id)) {
                if (!childrenOf.has(parentId)) childrenOf.set(parentId, [])
                childrenOf.get(parentId)!.push(e.id)
            } else {
                // Sin jefe, el jefe indicado no corresponde a nadie visible (dato
                // sucio/typo), o parte de un ciclo — se muestra como raíz en vez
                // de perderse o romper el árbol.
                roots.push(e.id)
            }
        })

        return { byId, childrenOf, roots }
    }, [empleados])

    // Por defecto, colapsado desde el 3er nivel (bisabuelos de las raíces) para
    // no tirar de una vez las ~350 personas — se expande a demanda o al buscar.
    const [collapsed, setCollapsed] = useState<Set<number>>(() => {
        const initial = new Set<number>()
        // Datos de "jefe" digitados a mano por ~360 personas pueden formar un
        // ciclo (A -> B -> A) por error; sin esta guarda, walk() recursaría
        // infinitamente y tumbaría el render completo.
        const visited = new Set<number>()
        const walk = (id: number, depth: number) => {
            if (visited.has(id)) return
            visited.add(id)
            const kids = childrenOf.get(id) || []
            if (depth >= 2 && kids.length > 0) initial.add(id)
            else kids.forEach((k) => walk(k, depth + 1))
        }
        roots.forEach((r) => walk(r, 0))
        return initial
        // eslint-disable-next-line react-hooks/exhaustive-deps
    })

    const [search, setSearch] = useState('')

    const toggle = useCallback((id: number) => {
        setCollapsed((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const openEmpleado = useCallback((id: number) => {
        router.push(`/gestor-de-personal/editar/${id}`)
    }, [router])

    // Ancestros de cada nodo (para expandir la ruta hacia un resultado de busqueda).
    const parentOf = useMemo(() => {
        const parentOf = new Map<number, number>()
        childrenOf.forEach((kids, parentId) => kids.forEach((k) => parentOf.set(k, parentId)))
        return parentOf
    }, [childrenOf])

    const matchIds = useMemo(() => {
        const term = eliminarAcentos(search)
        if (term.length < 2) return []
        return empleados.filter((e) => eliminarAcentos(e.nombreCompleto).includes(term)).map((e) => e.id)
    }, [search, empleados])

    // Al encontrar resultados, expande automaticamente la rama hasta cada uno.
    useEffect(() => {
        if (matchIds.length === 0) return
        setCollapsed((prev) => {
            const next = new Set(prev)
            matchIds.forEach((id) => {
                const seen = new Set<number>()
                let cur = parentOf.get(id)
                while (cur != null && !seen.has(cur)) {
                    seen.add(cur)
                    next.delete(cur)
                    cur = parentOf.get(cur)
                }
            })
            return next
        })
    }, [matchIds, parentOf])

    const visibleIds = useMemo(() => {
        const visible = new Set<number>()
        const stack = [...roots]
        while (stack.length > 0) {
            const id = stack.pop()!
            if (visible.has(id)) continue // corta ciclos si el dato de "jefe" los formara
            visible.add(id)
            if (!collapsed.has(id)) {
                const kids = childrenOf.get(id) || []
                stack.push(...kids)
            }
        }
        return visible
    }, [roots, childrenOf, collapsed])

    const { nodes, edges } = useMemo(() => {
        const rawNodes: Node[] = []
        const rawEdges: Edge[] = []
        visibleIds.forEach((id) => {
            const empleado = byId.get(id)
            if (!empleado) return
            const kids = childrenOf.get(id) || []
            rawNodes.push({
                id: id.toString(),
                type: 'orgNode',
                position: { x: 0, y: 0 },
                data: {
                    empleado,
                    childCount: kids.length,
                    isCollapsed: collapsed.has(id),
                    isMatch: matchIds.includes(id),
                    onToggle: toggle,
                    onOpen: openEmpleado,
                } satisfies OrgNodeData,
            })
            const parent = parentOf.get(id)
            if (parent != null && visibleIds.has(parent)) {
                rawEdges.push({
                    id: `${parent}-${id}`,
                    source: parent.toString(),
                    target: id.toString(),
                    type: 'smoothstep',
                    style: { stroke: '#cbd5e1', strokeWidth: 2 },
                })
            }
        })
        return { nodes: layoutWithDagre(rawNodes, rawEdges), edges: rawEdges }
    }, [visibleIds, byId, childrenOf, collapsed, matchIds, parentOf, toggle, openEmpleado])

    const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes)
    const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges)

    useEffect(() => { setFlowNodes(nodes) }, [nodes, setFlowNodes])
    useEffect(() => { setFlowEdges(edges) }, [edges, setFlowEdges])

    const { fitView } = useReactFlow()

    return (
        <div className="relative w-full h-full">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre..."
                        className="h-10 w-64 pl-9 pr-8 rounded-xl border border-slate-200 bg-white shadow-sm text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                {search && (
                    <span className="text-xs font-bold text-slate-500 bg-white px-3 h-10 flex items-center rounded-xl shadow-sm border border-slate-200">
                        {matchIds.length} resultado{matchIds.length === 1 ? '' : 's'}
                    </span>
                )}
                <button
                    type="button"
                    onClick={() => fitView({ duration: 400, padding: 0.15 })}
                    title="Ajustar vista"
                    className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                >
                    <Maximize2 className="h-4 w-4" />
                </button>
            </div>

            <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.1}
                maxZoom={1.5}
                proOptions={{ hideAttribution: true }}
            >
                <Background gap={20} color="#e2e8f0" />
                <Controls />
                <MiniMap
                    pannable
                    zoomable
                    nodeColor="#94a3b8"
                    maskColor="rgba(241,245,249,0.7)"
                    className="!bottom-4 !right-4"
                />
                <FitToMatches matchIds={matchIds} />
            </ReactFlow>
        </div>
    )
}

export function OrganigramaFlow({ empleados }: { empleados: OrgEmpleado[] }) {
    return (
        <ReactFlowProvider>
            <OrganigramaInner empleados={empleados} />
        </ReactFlowProvider>
    )
}
