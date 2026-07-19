# 📊 Sistema de Inspecciones de Campo (PWA Offline) - Cuadrilla

Anclado en la eficiencia del trabajo técnico, este sistema es una Aplicación Web Progresiva (PWA) diseñada para la gestión, registro y control de inspecciones en el terreno. La aplicación está optimizada para operar en entornos de baja o nula conectividad a internet, garantizando la continuidad de la recolección de datos bajo cualquier circunstancia.

---

## 📲 Acceso e Instalación Inmediata

Para abrir la aplicación o instalarla en la pantalla de inicio de tu teléfono, haz clic en el siguiente enlace oficial:

### 🚀 [👉 HACER CLIC AQUÍ PARA ABRIR LA APLICACIÓN 👈](https://ramosjairo.github.io/cuadrilla_Soportes/)

> ⚠️ **REQUISITO INDISPENSABLE PARA EL PRIMER INGRESO:**
> El **primer acceso** al enlace se debe realizar obligatoriamente **CON CONEXIÓN A INTERNET** (ya sea por Datos Móviles o Wi-Fi). Esto es necesario para que el navegador descargue el Service Worker y guarde los archivos esenciales en la caché del teléfono. Una vez abierta e instalada la primera vez, la conexión puede apagarse por completo y la aplicación funcionará al 100% fuera de línea en el campo.

---

## 👤 Información del Creador y Licencia

* **Desarrollador:** Ing. Jairo Ramos
* **Ubicación:** Caracas, Venezuela
* **Licencia:** **Software de Uso Libre**. Esta herramienta puede ser utilizada, compartida y distribuida libremente por cualquier cuadrilla, técnico o inspector que la requiera para agilizar sus labores diarias.

---

## 🔒 Privacidad y Almacenamiento 100% Local

* **Cero Servidores:** Esta aplicación **no cuenta con bases de datos externas, servidores en la nube ni sistemas de rastreo**. 
* **Control Total de tus Datos:** Toda la información registrada, las nóminas de inspectores y las fotografías capturadas se almacenan de forma cifrada y exclusiva dentro del dispositivo móvil del usuario mediante **IndexedDB**. 
* **Intercambio Seguro:** Los datos solo salen del dispositivo cuando el usuario decide, de forma manual y consciente, exportar el archivo `.json` para compartirlo con un colega por correo electrónico.

---

## ⚠️ Descargo de Responsabilidad (Disclaimer)

* **Herramienta Independiente:** Esta aplicación es un desarrollo personal e independiente creado con el único fin de facilitar y agilizar el trabajo manual de reporte en las cuadrillas de campo.
* **Carácter No Institucional:** **No es una aplicación oficial, no está vinculada, patrocinada ni respaldada por ninguna institución pública, organismo del Estado o empresa privada.** Su uso es estrictamente a título personal por parte de los operadores de campo.
* **Garantía y Responsabilidad:** El autor no se hace responsable por la pérdida de datos derivada del formateo del dispositivo, limpieza extrema del caché del navegador por parte del usuario, o el uso incorrecto de las funciones de importación/exportación. Corresponde al usuario resguardar sus reportes diariamente.

---

## 🚀 Características Clave

* **Funcionamiento 100% Offline:** Gracias a una estrategia de caché estructurada (*Cache First*) con Service Workers, la aplicación carga instantáneamente sin necesidad de datos móviles o Wi-Fi.
* **Almacenamiento Local Robusto:** Utiliza la base de datos interna del navegador (**IndexedDB**) para almacenar el historial de inspecciones, parámetros de equipos y fotografías de respaldo de forma segura en el dispositivo.
* **Compaginación de Datos Cuadrilla (Colegas):** Permite exportar e importar de manera discreta estructuras de datos en formato `.json` a través de correo electrónico, facilitando la unificación de nóminas e inspecciones entre compañeros de equipo sin depender de un servidor central.
* **Reportes en Formato Limpio:** Generación automatizada de reportes estructurados listos para ser compartidos por canales de mensería o portapapeles.
* **Diseño Minimalista e Institucional:** Interfaz limpia adaptada a dispositivos móviles con una iconografía basada en nodos y estructuras de ingeniería.

---

## 🛠️ Instrucciones de Uso

### 1. Configuración Inicial (Primer uso con Internet)
1. Acceda al enlace de GitHub Pages de la aplicación desde el navegador de su teléfono móvil.
2. Espere a que la barra superior indique **⚙️ Sin Configurar**.
3. El navegador de su dispositivo le mostrará de forma automática la opción **"Añadir a la pantalla de inicio"** o **"Instalar aplicación"**. Acéptela para crear el acceso directo nativo con el logotipo geométrico de soporte.

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
   * **Importar data:** Permite cargar el archivo `.json` enviado por un colega. El sistema comparará inteligentemente ambos archivos, adelantará los registros nuevos y omitirá los duplicados para evitar la corrupción de datos.

---

## 📐 Arquitectura Tecnológica

* **Frontend:** HTML5, CSS3 (Variables nativas, diseño responsivo adaptado a móviles).
* **Persistencia:** IndexedDB API (Base de datos transaccional local).
* **PWA Core:** Service Worker (Estrategia v2 de aislamiento de red), Web App Manifest (Formato adaptativo *maskable*).
