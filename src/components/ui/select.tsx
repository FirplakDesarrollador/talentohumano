import * as React from "react"
import { ChevronDown, Check, Search } from "lucide-react"

const SelectContext = React.createContext<any>(null)

function normalizeText(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Recorre los children (incluyendo los que estan dentro de SelectContent)
// buscando SelectItem, para poder mostrar su texto (no su value) en SelectValue.
function collectItemLabels(children: any, map: Record<string, React.ReactNode>) {
    React.Children.forEach(children, (child: any) => {
        if (!child || !child.props) return
        if (child.type === SelectItem) {
            map[String(child.props.value)] = child.props.children
        } else if (child.props.children) {
            collectItemLabels(child.props.children, map)
        }
    })
}

export const Select = ({ children, value, onValueChange, searchable }: any) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [search, setSearch] = React.useState('')
    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    React.useEffect(() => {
        if (!isOpen) setSearch('')
    }, [isOpen])

    const itemLabels = React.useMemo(() => {
        const map: Record<string, React.ReactNode> = {}
        collectItemLabels(children, map)
        return map
    }, [children])

    return (
        <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen, searchable, search, setSearch, itemLabels }}>
            <div ref={containerRef} className="relative w-full">
                {children}
            </div>
        </SelectContext.Provider>
    )
}

export const SelectTrigger = ({ children, className }: any) => {
    const { isOpen, setIsOpen } = React.useContext(SelectContext)
    return (
        <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${className}`}
        >
            {children}
            <ChevronDown className={`h-4 w-4 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
    )
}

export const SelectValue = ({ placeholder }: any) => {
    const { value, itemLabels } = React.useContext(SelectContext)
    const label = value && itemLabels ? itemLabels[value] : undefined
    return <span className="truncate">{value && value !== 'all' ? (label ?? value) : placeholder}</span>
}

export const SelectContent = ({ children, className }: any) => {
    const { isOpen, searchable, search, setSearch } = React.useContext(SelectContext)

    if (!isOpen) return null

    const filteredChildren = searchable && search
        ? React.Children.toArray(children).filter((child: any) => {
            if (!child?.props) return true
            const text = typeof child.props.children === 'string' ? child.props.children : ''
            return normalizeText(text).includes(normalizeText(search))
        })
        : children

    return (
        <div className={`absolute z-[100] mt-2 w-full bg-white rounded-xl border border-gray-100 shadow-2xl max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-200 ${className}`}>
            {searchable && (
                <div className="sticky top-0 bg-white p-1.5 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Buscar..."
                            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-400"
                        />
                    </div>
                </div>
            )}
            <div className="p-1.5 flex flex-col gap-1">
                {filteredChildren}
                {searchable && search && React.Children.count(filteredChildren) === 0 && (
                    <div className="px-3 py-2.5 text-sm text-gray-400 text-center">Sin resultados</div>
                )}
            </div>
        </div>
    )
}

export const SelectItem = ({ value, children }: any) => {
    const { onValueChange, setIsOpen, value: currentValue } = React.useContext(SelectContext)
    const isSelected = currentValue === value

    return (
        <div
            className={`cursor-pointer px-3 py-2.5 text-sm rounded-lg flex items-center justify-between transition-colors
                ${isSelected
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            onClick={() => {
                onValueChange && onValueChange(value)
                setIsOpen(false)
            }}
        >
            <span className="truncate">{children}</span>
            {isSelected && <Check className="h-4 w-4 shrink-0" />}
        </div>
    )
}
