# 📊 Sistema de Inspecciones de Campo (PWA Offline) - GastosJairo

Aplicación Web Progresiva (PWA) diseñada para la gestión, registro y control de inspecciones técnicas en campo. Este sistema está optimizado para operar en entornos de baja o nula conectividad a internet, garantizando la integridad de la recolección de datos en cualquier ubicación.

---

## 🚀 Características Clave

* **Funcionamiento 100% Offline:** Gracias a una estrategia de caché estructurada (*Cache First*) con Service Workers, la aplicación carga instantáneamente sin necesidad de datos móviles o Wi-Fi.
* **Almacenamiento Local Robusto:** Utiliza la base de datos interna del navegador (**IndexedDB**) para almacenar el historial de inspecciones, parámetros de equipos y fotografías de respaldo de forma segura en el dispositivo.
* **Sincronización Inmediata por WhatsApp (Portapapeles):** Nuevo sistema de intercambio rápido en terreno. Permite a las cuadrillas exportar un reporte encriptado en texto directamente a WhatsApp y que otros colegas lo importen con solo copiar el mensaje, evitando la descarga de archivos físicos `.json` que Android suele ocultar.
* **Respaldo de Datos Estructural (.json):** Mantiene la opción clásica de exportar e importar estructuras completas de datos en formato `.json` a través de correo electrónico o almacenamiento local para unificaciones masivas.
* **Diseño Minimalista e Institucional:** Interfaz limpia adaptada a dispositivos móviles con una iconografía basada en nodos y estructuras de ingeniería.

---

## 🛠️ Instrucciones de Uso

### 1. Configuración Inicial (Primer uso con Internet)
1. Acceda al enlace de GitHub Pages de la aplicación desde el navegador de su teléfono móvil.
2. Espere a que la barra superior indique **⚙️ Sin Configurar**.
3. El navegador de su dispositivo le mostrará de forma automática la opción **"Añadir a la pantalla de inicio"** o **"Instalar aplicación"**. Acéptela para crear el acceso directo nativo.

### 2. Configuración del Equipo de Trabajo
1. Presione el botón de configuración en la esquina superior derecha (**⚙️ Sin Configurar**).
2. Introduzca los parámetros globales de la jornada: **Grupo** y **Parroquia**.
3. Añada la **Nómina de Inspectores** que conforman la cuadrilla utilizando el botón `+`.
4. Guarde los cambios. La barra superior cambiará a **⚙️ Equipo Configurado**. *(Nota: El sistema recordará este equipo de forma automática para los días siguientes).*

### 3. Registro de Inspecciones (Modo Offline Seguro)
1. Una vez instalado el acceso directo, puede activar el *Modo Avión* o trabajar en zonas sin cobertura.
2. Presione **➕ Inspección** para abrir el formulario.
3. Complete los campos requeridos: Calle/Sector, Edificación, Número de Certificado y Color de Etiqueta (Verde, Amarillo o Rojo).
4. Capture o adjunte las dos fotografías requeridas (Foto de Frente y Foto de Respaldo). El sistema comprimirá automáticamente las imágenes para proteger el almacenamiento del teléfono.
5. Presione **Guardar**. El registro aparecerá inmediatamente en la tabla principal del día de trabajo.

### 4. Gestión de Registros e Historial
* **Ver Detalles:** Toque cualquier fila de la tabla para ver el resumen completo de la inspección y ampliar las fotografías tomadas.
* **Modificar / Eliminar:** Mantenga presionada la fila de la inspección por 1 segundo para desplegar el menú contextual de opciones (Editar o Borrar).
* **Cambio de Jornada:** Use el botón **Nuevo Día (🔄)** para actualizar la fecha de trabajo actual, lo que le permitirá iniciar una nueva lista manteniendo a salvo los datos históricos en la memoria.

### 5. Sincronización e Intercambio de Datos (Uso de Cuadrilla)
1. Mantenga presionado el botón de grupo (**👥**) en la barra inferior por 1.5 segundos.
2. Se desplegará el menú de datos de cuadrilla:
   * **Exportar data:** Descarga un archivo estructurado `.json` con todo el historial para ser enviado por correo electrónico.
   * **Importar data:** Permite cargar el archivo `.json` enviado por un colega. El sistema comparará inteligentemente ambos archivos, añadirá los registros nuevos y omitirá los duplicados para evitar la corrupción de datos.

---

## 📐 Arquitectura Tecnológica

* **Frontend:** HTML5, CSS3 (Variables nativas, diseño responsivo adaptado a móviles).
* **Persistencia:** IndexedDB API (Base de datos transaccional local).
* **PWA Core:** Service Worker (Estrategia v2 de aislamiento de red), Web App Manifest (Formato adaptativo *maskable*).