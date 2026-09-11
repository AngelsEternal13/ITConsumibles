# Sistema Web Empresarial de Gestión de Impresoras, Consumibles, UPS y Requerimientos de Compra

Plataforma corporativa centralizada desarrollada con **Next.js 15**, **React 19**, **TypeScript**, **Tailwind CSS**, **Turso (SQLite distribuido)**, **Drizzle ORM**, **Microsoft Entra ID (Azure AD)**, **ExcelJS** y **jsPDF**.

---

## 🚀 Características Principales

1. **Cálculo Automático de Consumibles**:
   - Fórmula: $\text{Cantidad de Impresoras} \times \text{Consumibles Requeridos por Equipo}$.
   - Deduce el stock disponible en la agencia y calcula exactamente la cantidad a comprar (nunca negativo; si el stock es mayor o igual, resultado = 0).
2. **Regla de UPS 1 a 1**:
   - Cada impresora requiere 1 UPS de la capacidad requerida en VA (500 VA, 750 VA, 1500 VA, etc.).
   - Compara las impresoras operativas de la agencia contra las UPS existentes de esa capacidad y genera la cantidad faltante a comprar.
3. **Escalabilidad Dinámica sin Modificar Código**:
   - Módulo configurable de **Reglas de Impresoras** que permite registrar nuevos modelos, consumibles requeridos y potencia UPS requerida directamente desde la interfaz de usuario.
4. **Requerimiento Consolidado de Compra**:
   - Agrupa automáticamente consumibles faltantes, UPS faltantes y compras adicionales de tecnología (mouses, teclados, discos SSD, switches, cables, etc.).
5. **Transferencias Inter-Agencias con Ajuste de Stock en Tiempo Real**:
   - Descuenta automáticamente en la agencia origen y aumenta en la agencia destino.
   - Historial detallado y cálculo de ahorro generado por transferencias.
6. **Exportación Empresarial**:
   - **Excel (5 Hojas)**: *Consumibles*, *UPS*, *Compras Adicionales*, *Transferencias*, *Resumen General*.
   - **PDF Ejecutivo**: Formato corporativo Microsoft 365 con logotipo, resumen ejecutivo, tablas de faltantes y bloques de firma de autorización (Solicitante y Aprobador).
7. **Diseño Microsoft 365**:
   - Estilo corporativo limpio, tema claro y oscuro (`next-themes`), alertas automáticas (Verde = Correcto, Amarillo = Atención, Rojo = Requiere Compra).
8. **Bitácora de Auditoría Integral**:
   - Registra usuario, fecha, tabla, acción (`CREATE`, `UPDATE`, `DELETE`, `TRANSFER`), valor anterior y valor nuevo.

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, TanStack Query, Sonner.
- **Gráficos**: Recharts.
- **Base de Datos**: Turso (SQLite distribuido / `@libsql/client`).
- **ORM**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`).
- **Autenticación**: NextAuth con Microsoft Entra ID (Azure AD) y Credenciales locales con roles (`admin` y `lector`).
- **Exportaciones**: `exceljs` y `jspdf` con `jspdf-autotable`.

---

## ⚙️ Configuración y Puesta en Marcha

### 1. Variables de Entorno (`.env`)
```env
# Conexión Turso distribuido o base local de desarrollo
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-clave-secreta-corporativa-2025

# Microsoft Entra ID (Azure AD) - Opcional para autenticación M365 en producción
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
```

### 2. Inicializar Base de Datos y Datos Semilla
```bash
# Aplicar esquema a Turso / SQLite
npm run db:push

# Cargar agencias, reglas, impresoras, consumibles, UPS, compras y transferencias iniciales
npm run db:seed
```

### 3. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
Acceda a: `http://localhost:3000`

---

## 👥 Credenciales de Acceso Inicial

| Rol | Correo | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **ADMINISTRADOR** | `admin@empresa.com` | `admin123` | Control total: Crear, editar, eliminar, transferir, configurar reglas, exportar |
| **LECTOR** | `lector@empresa.com` | `lector123` | Solo lectura: Consulta ejecutiva, visualización y descarga de reportes Excel / PDF |

*Nota: La pantalla de login incluye botones de acceso directo en 1 clic para alternar entre ambos roles en demostraciones.*
