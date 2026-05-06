import json

cargos_raw = [
    "", "Acabado ", "Acabado FV", "Acabado MS", "Acabado RTM", "Administrador de tienda",
    "Agilizador de línea de desmolde", "Analista SGSST y cumplimiento legal", "Analista comercial",
    "Analista contabilidad", "Analista de Contabilidad", "Analista de Diseño Organizacional",
    "Analista de Ingeniería", "Analista de TI", "Analista de abastecimiento",
    "Analista de atracción y selección", "Analista de cartera", "Analista de cartera ",
    "Analista de control contractual", "Analista de formacion y bienestar",
    "Analista de infraestructura y seguridad informática", "Analista de manufactura",
    "Analista de planeación de producto terminado ", "Analista de seguridad y salud en el trabajo",
    "Analista infraesructura y seguridad informatica", "Analista planeacion produccion y abastecimiento PTC",
    "Analista planeación de producción y abastecimiento", "Analista prevención y control ambiental",
    "Aprendiz", "Aprendiz ", "Aprendiz de diseño", "Asentador fibra", "Asesor comercial",
    "Asesor comercial Logístico", "Asesor comercial administrativo", "Asesor comercial canal propio",
    "Asesor comercial e-commerce", "Asesora comercial", "Auxilia e-commerce", "Auxiliar Cartera",
    "Auxiliar Junior de Facturacion", "Auxiliar Vaciado MS", "Auxiliar administrativa",
    "Auxiliar contable e inventarios ", "Auxiliar contable y de inventarios", "Auxiliar de alturas MS",
    "Auxiliar de calidad", "Auxiliar de comercio exterior", "Auxiliar de compras y negociaciones",
    "Auxiliar de contramoldes", "Auxiliar de digitación comercial ", "Auxiliar de moldes",
    "Auxiliar de moldes MS", "Auxiliar de promoción y prevención", "Auxiliar de pulido MS",
    "Auxiliar de recibo", "Auxiliar de retención y reactivación de clientes",
    "Auxiliar de servicios generales", "Auxiliar de talento y vinculación", "Auxiliar de vaciado MS",
    "Auxiliar de ventas MAC", "Auxiliar junior TI", "Auxiliar junior cartera",
    "Auxiliar junior comercio exterior", "Auxiliar junior contabilidad", "Auxiliar junior de abastecimiento",
    "Auxiliar junior de almacenamiento", "Auxiliar junior de distribución",
    "Auxiliar junior de programación e inventarios", "Auxiliar junior logística", "Auxiliar junior mensajería",
    "Auxiliar senior abastecimiento", "Auxiliar senior cartera", "Auxiliar senior comercio exterior",
    "Auxiliar senior de ingenieria", "Auxiliar senior ingeniería", "Auxiliar senior logistica",
    "Auxiliar servicios", "Axuliar senior servicios", "COORDINADORA DE COSTOS E INVENTARIOS",
    "Coordinador KAM autoservicio nacional", "Coordinador MAC", "Coordinador Marketplace",
    "Coordinador comercial", "Coordinador comercial canal obras", "Coordinador de Ingeniería de Diseño",
    "Coordinador de calidad y sistema de producción", "Coordinador de exportaciones distribución",
    "Coordinador de mantenimiento", "Coordinador de planeacion de produccion",
    "Coordinador de soporte técnico y servicios", "Coordinador de tienda", "Coordinador diseño muebles",
    "Coordinador e-commerce", "Coordinador exportaciones - Obras", "Coordinador moldes",
    "Coordinador servicios técnicos", "Coordinadora de cartera y tesoreria",
    "Coordinadora de exportaciones distribución", "Coordinadora de manufactura",
    "Coorinador de servicios tecnicos", "Cortador de Cajas", "DIRECTOR DE LOGÍSTICA", "Desmoldador FV",
    "Desmoldador MS", "Desmolde", "Desprensador A", "Desprensador B", "Director compras y mercadeo",
    "Director de I+D+i", "Director de manufactura", "Director de talento y tecnología",
    "Director de ventas", "Directora de Contabilidad", "Directora financiera", "Diseñador gráfico",
    "Empaque MS", "Encerado de moldes MS", "Encerador RTM", "Encerador de CM MS", "Enchapador A",
    "Enchapador A Cefi", "Enchapador B", "Enchapador B Cefi", "Enchapador C", "Enchapador Muebles",
    "Enhuacalador", "Ensamblador 1 FV", "Ensamblador 2 FV", "Ensamblador FV", "Ensayador",
    "Escuadrador", "Especialista de desarrollo de producto", "Especialista de diseño integral",
    "Especialista de diseño junior", "Especialista de ingeniería de diseño", "Especialista junior de diseño",
    "Especialista junior de producto", "Estimador de proyectos", "Gerente general",
    "Implementador de producto", "Implementador de producto y mejora continua", "Inspector calidad muebles",
    "Inspector de calidad ", "Inspector de calidad de marmol sintetico", "Inspector de calidad fibra de vidrio",
    "Inspector de calidad marmol sintetico", "Inspector de calidad muebles", "Inspectora de calidad MP",
    "Instalador de herraje", "Jefe canal distribución", "Jefe canal distribuición",
    "Jefe canal obras y distribución", "Jefe canal obras y distribución ", "Jefe de Calidad y Sistema de producción ",
    "Jefe de abastecimiento MP", "Jefe de comercio exterior y key account compras", "Jefe de mantenimiento",
    "Jefe de mercadeo", "Jefe de negociación y compras", "Jefe de servicios", "Jefe de talento humano",
    "Jefe jurídico y normativo", "Jefe produccion", "Jefe produccion ", "Jefe zona córdoba sucre urabá",
    "Lider FV", "Lider MS", "Maestro de obras civiles", "Maquina CNC Cefi", "Maquina láser ",
    "Marmol sintetico", "Modelista", "Moldeador", "Máquina Láser", "Máquina Láser Cefi", "OP. inyeccion",
    "OP. vestir piezas", "Operaria de control y abastecimiento de moldes", "Operaria lider de moldes",
    "Operario CEDI", "Operario almacen", "Operario almacén", "Operario armador de cajas ",
    "Operario de apoyo ingeniería", "Operario de entregas e inventarios", "Operario de linea buffer",
    "Operario de montacarga", "Operario de producción", "Operario de programación MS", "Operario de vaciado MS",
    "Operario de vaciado MS máquina ultra caster", "Operario general de moldes", "Operario general de moldes ",
    "Operario lider CEDI", "Operario lider almacen", "Operario líder exportaciones", "Operario máquina laser ",
    "Operario programador de muebles", "Patinador", "Patinador Cefi", "Pintor ", "Pintor FV", "Pintor MS",
    "Pintor RTM", "Pormotor de ventas", "Practicante I+D+I ", "Practicante MAC", "Practicante contabilidad",
    "Practicante financiero", "Practicante logística", "Practicante mercadeo", "Prensador A", "Prensador B",
    "Preparador de pintura", "Presidente de la Junta", "Programador y apoyo técnico", "Promotor de servicios",
    "Promotor de ventas", "Promotor de ventas ", "Promotor tecnico", "Promotor técnico", "Pulidor FV",
    "Pulidor MS", "Pulidor RTM", "Recogedor de mezcla", "Reparacion FV", "Reparacion MS", "Reparación Moldes",
    "Seccionadora", "Seccionadora ", "Seccionadora Cefi", "Servicios generales", "Soldador", "Soldador FV",
    "Supervisor", "Supervisor técnico", "Supervisora ", "TALADRO ", "Taladro", "Taladro Cefi", "Tapa huecos",
    "Tarugador Cefi", "Tecnico de mantenimiento", "Trompo", "Técnico de mantenimiento",
    "Técnico de mantenimiento ", "Técnico de servicios", "Vaciador FV", "Visitador tecnico",
    "agilizador de linea", "inspector final", "inspector inicial", "jefe de ingenieria", "kitting",
    "linea buffer", "linea buffer MS"
]

def standardize(s):
    if not s: return ""
    s = s.strip()
    # Basic spelling/casing normalization
    s = s.replace("distribuición", "distribución")
    s = s.replace("infraesructura", "infraestructura")
    s = s.replace("informatica", "informática")
    s = s.replace("produccion", "producción")
    s = s.replace("planeacion", "planeación")
    s = s.replace("ingenieria", "ingeniería")
    s = s.replace("Coorinador", "Coordinador")
    s = s.replace("Axuliar", "Auxiliar")
    s = s.replace("Pormotor", "Promotor")
    s = s.replace("Marmol", "Mármol")
    s = s.replace("sintetico", "sintético")
    s = s.replace("tecnico", "técnico")
    
    # Capitalize first letter if it's lower
    if s and s[0].islower():
        s = s[0].upper() + s[1:]
    
    # Special group normalization
    if s.upper() == "TALADRO": return "Taladro"
    if s == "Analista contabilidad": return "Analista de contabilidad"
    if s == "Analista de Contabilidad": return "Analista de contabilidad"
    if s == "Auxilia e-commerce": return "Auxiliar e-commerce"
    
    # Trim again just in case
    return s.strip()

mapping = {}
for c in cargos_raw:
    std = standardize(c)
    if std != c:
        mapping[c] = std

print(json.dumps(mapping, indent=2, ensure_ascii=False))
