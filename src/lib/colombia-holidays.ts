// Calculo de festivos colombianos: fijos, trasladados al lunes siguiente
// por la Ley Emiliani, y los que dependen de la fecha de Pascua (Semana Santa).

function toDateKey(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

// Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario gregoriano)
function calcularDomingoPascua(year: number): Date {
    const a = year % 19
    const b = Math.floor(year / 100)
    const c = year % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * l) / 451)
    const month = Math.floor((h + l - 7 * m + 114) / 31)
    const day = ((h + l - 7 * m + 114) % 31) + 1
    return new Date(year, month - 1, day)
}

function addDias(date: Date, dias: number): Date {
    const d = new Date(date)
    d.setDate(d.getDate() + dias)
    return d
}

// Ley Emiliani: si el festivo no cae en lunes, se traslada al lunes siguiente.
function trasladarALunes(date: Date): Date {
    const d = new Date(date)
    const dia = d.getDay() // 0=domingo ... 6=sabado
    const diasParaLunes = (8 - dia) % 7
    d.setDate(d.getDate() + diasParaLunes)
    return d
}

/**
 * Devuelve un mapa "YYYY-MM-DD" -> nombre del festivo para un año dado.
 */
export function getFestivosColombia(year: number): Map<string, string> {
    const pascua = calcularDomingoPascua(year)
    const festivos = new Map<string, string>()

    const add = (date: Date, nombre: string) => festivos.set(toDateKey(date), nombre)

    // Fijos (no se trasladan)
    add(new Date(year, 0, 1), 'Año Nuevo')
    add(new Date(year, 4, 1), 'Día del Trabajo')
    add(new Date(year, 6, 20), 'Independencia de Colombia')
    add(new Date(year, 7, 7), 'Batalla de Boyacá')
    add(new Date(year, 11, 8), 'Inmaculada Concepción')
    add(new Date(year, 11, 25), 'Navidad')

    // Dependen de la Pascua, no se trasladan
    add(addDias(pascua, -3), 'Jueves Santo')
    add(addDias(pascua, -2), 'Viernes Santo')

    // Ley Emiliani: se trasladan al lunes siguiente
    add(trasladarALunes(new Date(year, 0, 6)), 'Reyes Magos')
    add(trasladarALunes(new Date(year, 2, 19)), 'San José')
    add(trasladarALunes(addDias(pascua, 39)), 'Ascensión del Señor')
    add(trasladarALunes(addDias(pascua, 60)), 'Corpus Christi')
    add(trasladarALunes(addDias(pascua, 68)), 'Sagrado Corazón de Jesús')
    add(trasladarALunes(new Date(year, 5, 29)), 'San Pedro y San Pablo')
    add(trasladarALunes(new Date(year, 7, 15)), 'Asunción de la Virgen')
    add(trasladarALunes(new Date(year, 9, 12)), 'Día de la Raza')
    add(trasladarALunes(new Date(year, 10, 1)), 'Todos los Santos')
    add(trasladarALunes(new Date(year, 10, 11)), 'Independencia de Cartagena')

    return festivos
}

/**
 * Nombre del festivo colombiano en esa fecha, o null si no lo es.
 * Acepta "YYYY-MM-DD" o un Date.
 */
export function getNombreFestivo(date: string | Date): string | null {
    const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
    const festivos = getFestivosColombia(d.getFullYear())
    return festivos.get(toDateKey(d)) ?? null
}
