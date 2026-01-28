# Talento Humano - Next.js

Sistema de Gestión de Talento Humano desarrollado con Next.js 15 y Supabase.

## Características

- 🔐 Autenticación con Supabase
- 👥 Gestión de Empleados
- 🎯 Seguimiento de Competencias
- 📊 Indicadores de Desempeño (KPIs)
- 💰 Aumentos Salariales y Comisiones
- 📚 Gestión de Entrenamientos
- 📋 Procesos Disciplinarios

## Tecnologías

- **Framework:** Next.js 15 (App Router)
- **Base de Datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Styling:** Tailwind CSS
- **UI Components:** Custom components with lucide-react icons
- **TypeScript:** Full type safety

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
Crear archivo `.env.local` con las siguientes variables:
```
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

3. Ejecutar en modo desarrollo:
```bash
npm run dev
```

4. Abrir [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del Proyecto

```
src/
├── app/
│   ├── login/              # Página de inicio de sesión
│   ├── menu/               # Dashboard principal
│   ├── buscador-hilu/      # Búsqueda de empleados
│   ├── competencias/       # Gestión de competencias
│   ├── indicadores/        # KPIs y métricas
│   ├── aumentossalariales/ # Aumentos salariales
│   ├── comisiones/         # Comisiones
│   ├── entrenamiento/      # Entrenamientos
│   └── buscador-procesos-disciplinarios/
├── components/
│   ├── ui/                 # Componentes UI reutilizables
│   └── Navbar.tsx          # Barra de navegación
└── lib/
    ├── supabase/           # Configuración de Supabase
    └── utils.ts            # Utilidades

```

## Funcionalidades Principales

### Empleados
- Búsqueda avanzada por nombre o cédula
- Visualización de información completa
- Filtrado por planta, empresa y estado

### Competencias
- Asignación de competencias a empleados
- Seguimiento de niveles esperados vs actuales
- Indicadores visuales de cumplimiento

### Indicadores (KPIs)
- Creación de indicadores personalizados
- Seguimiento de metas y cumplimiento
- Categorización por tipo (Ventas, Producción, Calidad, etc.)

## Scripts Disponibles

- `npm run dev` - Ejecutar en modo desarrollo
- `npm run build` - Construir para producción
- `npm start` - Ejecutar versión de producción
- `npm run lint` - Verificar código con ESLint

## Base de Datos

El proyecto utiliza Supabase con las siguientes tablas principales:
- `empleados` - Información de empleados
- `competencias` - Catálogo de competencias
- `competencia_empleado` - Relación empleado-competencia
- `empleado_indicador` - Indicadores de desempeño
- `indicador_registro` - Registros de progreso de indicadores

## Licencia

Proyecto privado - Todos los derechos reservados
