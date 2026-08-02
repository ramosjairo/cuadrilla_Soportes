let currentPhotoTarget = '';


        function volverASeleccionFallas() {
            // 1. Cierra el modal de gestión de fallas
            cerrarModal('modalGestionFallas');
            
            // 2. Abre el modal de selección rápida de daños inmediatamente
            abrirModalSeleccionFallas();
        }        

        function abrirMenuFoto(target) {
            currentPhotoTarget = target;
            
            const prevId = target === 'Frente' ? 'prevFrente' : 'prevRespaldo';
            const imgPreview = document.getElementById(prevId);
            const btnEliminar = document.getElementById('btnMenuEliminarFoto');

            if (imgPreview && imgPreview.src && imgPreview.src.startsWith("data:")) {
                btnEliminar.style.display = "flex";
            } else {
                btnEliminar.style.display = "none";
            }

            document.getElementById('modalMenuFoto').style.display = 'flex';
        }

        function cerrarMenuFoto() {
            document.getElementById('modalMenuFoto').style.display = 'none';
        }

        function seleccionarFoto(origen) {
            cerrarMenuFoto();
            if (origen === 'camara') {
                document.getElementById('file' + currentPhotoTarget + 'Camara').click();
            } else if (origen === 'galeria') {
                document.getElementById('file' + currentPhotoTarget + 'Galeria').click();
            } else if (origen === 'eliminar') {
                eliminarFotoForm(currentPhotoTarget);
            }
        }

        const DB_NAME = "InspeccionesDB";
        const DB_VERSION = 1;
        let db;

        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = e => console.error("Error DB:", e);

        /**
 * @function verificarNovedades
 * @description Comprueba si existe una nueva versión en novedades.json y actualiza el DOM y localStorage.
 * @returns {Promise<void>}
 */
        async function verificarNovedades() {
            // Cargar y renderizar la versión de la base local
            const cachedVersion = localStorage.getItem('app_version') || 'v5.6';
            const versionEl = document.getElementById('app-version-text');
            if (versionEl) versionEl.textContent = cachedVersion;

            try {
                const response = await fetch('./novedades.json?v=' + Date.now());
                if (!response.ok) return;
                
                const data = await response.json();
                const version = data.version || cachedVersion;

                // Actualizar versión si difiere (persistencia y renderizado)
                if (cachedVersion !== version) {
                    localStorage.setItem('app_version', version);
                    if (versionEl) versionEl.textContent = version;
                }

                const lastVersion = localStorage.getItem('last_version_seen');
                if (lastVersion !== version) {
                    document.getElementById('novedadesTitle').innerText = data.titulo || "🚀 ¡Novedades!";
                    
                    const ul = document.getElementById('novedadesList');
                    ul.innerHTML = "";
                    if (data.cambios) {
                        data.cambios.forEach(cambio => {
                            const li = document.createElement('li');
                            li.style.marginBottom = "8px";
                            li.innerHTML = cambio.replace(/^(.*?):/, '<b>$1:</b>');
                            ul.appendChild(li);
                        });
                    }
                    
                    localStorage.setItem('last_version_seen', version);
                    abrirModal("modalNovedades");
                }
            } catch (err) {
                console.log("No se pudo obtener el historial de novedades:", err);
            }
        }

        document.addEventListener('DOMContentLoaded', verificarNovedades);

        request.onsuccess = e => {
            db = e.target.result;
            inicializarFechaHoy();
            cargarTabla();
            vincularEventosBotonCuadrilla();
        };

        request.onupgradeneeded = e => {
            const dbInstance = e.target.result;
            if (!dbInstance.objectStoreNames.contains("inspecciones")) {
                dbInstance.createObjectStore("inspecciones", { keyPath: "id", autoIncrement: true });
            }
            if (!dbInstance.objectStoreNames.contains("configuracion")) {
                dbInstance.createObjectStore("configuracion", { keyPath: "fecha" });
            }
        };

        let cuadrillaPressTimer;
        let isLongPress = false;
        let activeRecordId = null;
        let fechaActual = ""; 
        let inspectoresActuales = []; 
        let callesExistentes = new Set();

        function inicializarFechaHoy() {
            const hoy = new Date();
            const year = hoy.getFullYear();
            const month = String(hoy.getMonth() + 1).padStart(2, '0');
            const day = String(hoy.getDate()).padStart(2, '0');
            fechaActual = `${year}-${month}-${day}`;
            document.getElementById("filterDate").value = fechaActual;
            comprobarConfiguracionFecha(fechaActual);
        }

        function cambiarFechaActiva() {
            fechaActual = document.getElementById("filterDate").value;
            comprobarConfiguracionFecha(fechaActual);
            cargarTabla();
        }

        /**
 * @function comprobarConfiguracionFecha
 * @description Verifica la configuración del día seleccionado en la IndexedDB y actualiza la UI.
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @param {function} callback - Función opcional a ejecutar tras la comprobación
 */
        function comprobarConfiguracionFecha(fecha, callback) {
            if (!db) return;
            const transaction = db.transaction(["configuracion"], "readonly");
            const store = transaction.objectStore("configuracion");
            const requestGet = store.get(fecha);

            requestGet.onsuccess = e => {
                const config = e.target.result;
                const statusDiv = document.getElementById("configStatus");

                if (config) {
                    statusDiv.innerText = "⚙️ Equipo Configurado";
                    statusDiv.className = "status-config status-ready";
                    inspectoresActuales = config.inspectores || [];
                    if (callback) callback(true);
                } else {
                    buscarUltimaConfiguracion(fecha, statusDiv, callback);
                }
            };
            requestGet.onerror = () => {
                if (callback) callback(false);
            };
        }

        /**
 * @function buscarUltimaConfiguracion
 * @description Busca la última configuración almacenada en días previos para autocompletarla.
 * @param {string} fechaDestino - Fecha actual
 * @param {HTMLElement} statusDiv - Elemento HTML para actualizar el estado
 * @param {function} callback - Función opcional a ejecutar al finalizar
 */
        function buscarUltimaConfiguracion(fechaDestino, statusDiv, callback) {
            const transaction = db.transaction(["configuracion"], "readonly");
            const store = transaction.objectStore("configuracion");
            const requestCursor = store.openCursor(null, "prev");

            requestCursor.onsuccess = e => {
                const cursor = e.target.result;
                if (cursor) {
                    const ultimaConfig = cursor.value;
                    const nuevaConfig = {
                        fecha: fechaDestino,
                        grupo: ultimaConfig.grupo,
                        coordinador: ultimaConfig.coordinador || "",
                        parroquia: ultimaConfig.parroquia,
                        inspectores: ultimaConfig.inspectores,
                        mostrarCertificado: ultimaConfig.mostrarCertificado !== undefined ? ultimaConfig.mostrarCertificado : true
                    };

                    const writeTrans = db.transaction(["configuracion"], "readwrite");
                    const writeStore = writeTrans.objectStore("configuracion");
                    writeStore.put(nuevaConfig).onsuccess = () => {
                        statusDiv.innerText = "⚙️ Equipo Configurado";
                        statusDiv.className = "status-config status-ready";
                        inspectoresActuales = nuevaConfig.inspectores;
                        mostrarToast("📋 Copiado equipo de trabajo anterior");
                        if (callback) callback(true);
                    };
                } else {
                    statusDiv.innerText = "⚙️ Sin Configurar";
                    statusDiv.className = "status-config status-empty";
                    inspectoresActuales = [];
                    if (callback) callback(false);
                }
            };
            requestCursor.onerror = () => {
                statusDiv.innerText = "⚙️ Sin Configurar";
                statusDiv.className = "status-config status-empty";
                inspectoresActuales = [];
                if (callback) callback(false);
            };
        }

        function vincularEventosBotonCuadrilla() {
            const btnCuadrilla = document.getElementById("btnDatosCuadrilla");

            const iniciarPresionCuadrilla = e => {
                isLongPress = false;
                cuadrillaPressTimer = setTimeout(() => {
                    isLongPress = true;
                    abrirModal("modalSincronizacion");
                }, 1500); 
            };

            const cancelarPresionCuadrilla = () => clearTimeout(cuadrillaPressTimer);

            const ejecutarClicCuadrilla = (e) => {
                clearTimeout(cuadrillaPressTimer);
                if (!isLongPress) {
                    mostrarToast("ℹ️ Mantén presionado para ver Datos de Cuadrilla");
                }
            };

            btnCuadrilla.addEventListener("touchstart", iniciarPresionCuadrilla, { passive: true });
            btnCuadrilla.addEventListener("touchend", ejecutarClicCuadrilla);
            btnCuadrilla.addEventListener("touchmove", cancelarPresionCuadrilla, { passive: true });

            btnCuadrilla.addEventListener("mousedown", iniciarPresionCuadrilla);
            btnCuadrilla.addEventListener("mouseup", ejecutarClicCuadrilla);
            btnCuadrilla.addEventListener("mouseleave", cancelarPresionCuadrilla);
        }

        /**
 * @function renderizarListaInspectores
 * @description Renderiza en el DOM la lista de inspectores de la cuadrilla actual basándose en la variable global 'nominaCuadrilla'.
 */
        function renderizarListaInspectores() {
            const contenedor = document.getElementById("lstInspectores");
            contenedor.innerHTML = "";
            inspectoresActuales.forEach((ins, idx) => {
                const div = document.createElement("div");
                div.className = "inspector-row";
                div.innerHTML = `
                    <span>👤 ${ins}</span>
                    <button type="button" class="btn-icon" style="color:red;" onclick="eliminarInspectorTemporal(${idx})">❌</button>
                `;
                contenedor.appendChild(div);
            });
        }

        function agregarInspectorNavegacion() {
            const input = document.getElementById("txtNewInspector");
            const nombre = input.value.trim();
            if (nombre) {
                inspectoresActuales.push(nombre);
                input.value = "";
                renderizarListaInspectores();
            }
        }

        function eliminarInspectorTemporal(idx) {
            inspectoresActuales.splice(idx, 1);
            renderizarListaInspectores();
        }

        /**
 * @function mostrarConfiguracion
 * @description Oculta la vista actual y despliega la vista de configuración global.
 */
        function mostrarConfiguracion() {
            document.getElementById("configForm").reset();
            if (!db) {
                renderizarListaInspectores();
                document.getElementById("viewMain").classList.remove("active");
                document.getElementById("viewConfig").classList.add("active");
                return;
            }

            const transaction = db.transaction(["configuracion"], "readonly");
            const store = transaction.objectStore("configuracion");
            store.get(fechaActual).onsuccess = e => {
                const config = e.target.result;
                if (config) {
                    document.getElementById("cfgGrupo").value = config.grupo;
                    document.getElementById("cfgCoordinador").value = config.coordinador || "";
                    document.getElementById("cfgParroquia").value = config.parroquia;
                    document.getElementById("cfgMostrarCertificado").checked = config.mostrarCertificado !== undefined ? config.mostrarCertificado : true;
                    
                    inspectoresActuales = config.inspectores || [];
                } else {
                    inspectoresActuales = [];
                    document.getElementById("cfgMostrarCertificado").checked = true;
                }
                renderizarListaInspectores();
            };
            document.getElementById("viewMain").classList.remove("active");
            document.getElementById("viewConfig").classList.add("active");
        }

        /**
 * @function guardarConfiguracion
 * @description Almacena la configuración (inspectores, móvil, empresa) del día actual en IndexedDB.
 * @param {Event} e - Evento del formulario
 */
        function guardarConfiguracion(e) {
            e.preventDefault();
            const grupo = document.getElementById("cfgGrupo").value.trim();
            const coordinador = document.getElementById("cfgCoordinador").value.trim();
            const parroquia = document.getElementById("cfgParroquia").value.trim();
            const mostrarCertificado = document.getElementById("cfgMostrarCertificado").checked;

            if (inspectoresActuales.length === 0) {
                alert("⚠️ Debe agregar al menos un inspector al equipo de trabajo.");
                return;
            }

            const configObject = {
                fecha: fechaActual,
                grupo,
                coordinador,
                parroquia,
                inspectores: inspectoresActuales,
                mostrarCertificado
            };

            const transaction = db.transaction(["configuracion"], "readwrite");
            const store = transaction.objectStore("configuracion");
            store.put(configObject).onsuccess = () => {
                mostrarToast("✅ Configuración guardada");
                comprobarConfiguracionFecha(fechaActual);
                regresarPrincipal();
            };
        }

        function intentarNuevaInspeccion() {
            comprobarConfiguracionFecha(fechaActual, (configurada) => {
                if (configurada) {
                    mostrarFormulario();
                } else {
                    alert("⚠️ Debe configurar el equipo de trabajo antes de registrar inspecciones.");
                    mostrarConfiguracion();
                }
            });
        }

        /**
 * @function mostrarFormulario
 * @description Despliega la vista de formulario para registrar una nueva inspección o editar una existente.
 * @param {number|null} idEdit - ID de la inspección a editar (opcional)
 */
        function mostrarFormulario(idEdit = null) {
            document.getElementById("inspeccionForm").reset();
            document.getElementById("editId").value = "";
            document.getElementById("txtComentarios").value = "";
            
            document.getElementById("prevFrente").style.display = "none";
            document.getElementById("prevFrente").src = "";
            document.getElementById("prevFrente").closest('.photo-uploader').classList.remove('photo-loaded');
            document.getElementById("fileFrenteCamara").value = "";
            document.getElementById("fileFrenteGaleria").value = "";
            
            document.getElementById("prevRespaldo").style.display = "none";
            document.getElementById("prevRespaldo").src = "";
            document.getElementById("prevRespaldo").closest('.photo-uploader').classList.remove('photo-loaded');
            document.getElementById("fileRespaldoCamara").value = "";
            document.getElementById("fileRespaldoGaleria").value = "";

            actualizarDatalistCalles();

            if (idEdit) {
                document.getElementById("formTitle").innerText = "Editar Inspección";
                document.getElementById("editId").value = idEdit;
                
                const transaction = db.transaction(["inspecciones"], "readonly");
                const store = transaction.objectStore("inspecciones");
                store.get(Number(idEdit)).onsuccess = e => {
                    const r = e.target.result;
                    if (r) {
                        document.getElementById("txtCalle").value = r.calle;
                        document.getElementById("txtEdificio").value = r.edificio;
                        document.getElementById("txtCertificado").value = r.certificado;
                        document.getElementById("txtComentarios").value = r.comentarios || "";
                        
                        if (r.color === "Verde") document.getElementById("colVerde").checked = true;
                        else if (r.color === "Amarillo" || r.color === "Yellow") document.getElementById("colAmarillo").checked = true;
                        else if (r.color === "Rojo") document.getElementById("colRojo").checked = true;
                        
                        if (r.fotoFrente) {
                            document.getElementById("prevFrente").src = r.fotoFrente;
                            document.getElementById("prevFrente").style.display = "block";
                            document.getElementById("prevFrente").closest('.photo-uploader').classList.add('photo-loaded');
                        }
                        if (r.fotoRespaldo) {
                            document.getElementById("prevRespaldo").src = r.fotoRespaldo;
                            document.getElementById("prevRespaldo").style.display = "block";
                            document.getElementById("prevRespaldo").closest('.photo-uploader').classList.add('photo-loaded');
                        }
                    }
                };
            } else {
                document.getElementById("formTitle").innerText = "Nueva Inspección";
            }

            document.getElementById("viewMain").classList.remove("active");
            document.getElementById("viewForm").classList.add("active");
        }

        function regresarPrincipal() {
            document.getElementById("viewForm").classList.remove("active");
            document.getElementById("viewConfig").classList.remove("active");
            document.getElementById("viewMain").classList.add("active");
        }

        /**
 * @function procesarImagen
 * @description Comprime y convierte una imagen seleccionada a Base64 utilizando un Canvas HTML5.
 * @param {HTMLInputElement} input - Elemento input file que recibe la imagen
 * @param {string} idPreview - ID del elemento img donde se mostrará la previsualización
 */
        function procesarImagen(input, idPreview) {
            const file = input.files[0];
            const preview = document.getElementById(idPreview);
            const uploaderDiv = input.closest('.photo-uploader');

            if (!file) {
                preview.style.display = "none";
                preview.src = "";
                if (uploaderDiv) uploaderDiv.classList.remove('photo-loaded');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement("canvas");
                    const maxDimension = 1280;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxDimension) {
                            height = Math.round((height * maxDimension) / width);
                            width = maxDimension;
                        }
                    } else {
                        if (height > maxDimension) {
                            width = Math.round((width * maxDimension) / height);
                            height = maxDimension;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.80);
                    
                    preview.src = dataUrl;
                    preview.style.display = "block";
                    if (uploaderDiv) uploaderDiv.classList.add('photo-loaded');
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function descargarImagen(dataUrl, edificioNombre, numFoto) {
            if (!dataUrl || !dataUrl.startsWith("data:")) return;

            let yymmdd = "";
            if (fechaActual && fechaActual.includes("-")) {
                const partes = fechaActual.split("-");
                yymmdd = `${partes[0].slice(-2)}${partes[1]}${partes[2]}`;
            } else {
                const hoy = new Date();
                yymmdd = `${hoy.getFullYear().toString().slice(-2)}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
            }

            const edifStr = (edificioNombre || "Edificio").trim().replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
            const nombreArchivo = `${yymmdd}_${edifStr || 'Edificio'}_Foto${numFoto}.jpg`;

            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = nombreArchivo;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            mostrarToast("💾 Foto guardada");
        }

        function eliminarFotoForm(target) {
            const img = document.getElementById("prev" + target);
            if (img) {
                img.src = "";
                img.style.display = "none";

                const uploader = img.closest('.photo-uploader');
                if (uploader) uploader.classList.remove('photo-loaded');

                document.getElementById('file' + target + 'Camara').value = "";
                document.getElementById('file' + target + 'Galeria').value = "";

                mostrarToast("🗑️ Imagen eliminada");
            }
        }

        function descargarFotoDetalle(id, tipo) {
            const transaction = db.transaction(["inspecciones"], "readonly");
            const store = transaction.objectStore("inspecciones");
            store.get(Number(id)).onsuccess = e => {
                const r = e.target.result;
                if (!r) return;
                const src = tipo === 'Frente' ? r.fotoFrente : r.fotoRespaldo;
                const numFoto = tipo === 'Frente' ? 1 : 2;
                descargarImagen(src, r.edificio, numFoto);
            };
        }

        // --- GESTIÓN DE CATÁLOGO Y PERSISTENCIA DE FALLAS ---
        function obtenerCatalogoFallas() {
            const guardado = localStorage.getItem('catalogo_fallas_dinamico');
            if (guardado) {
                try { return JSON.parse(guardado); } catch(e) {}
            }
            return {
                verde: [
                        "Estructura e infraestructura primaria estables; sin agrietamientos, deformaciones ni daños por sismo.",
                        "Estructura principal sana con patologías preexistentes. Preexistencias: ",
                        "Humedad ascendente por capilaridad;",
                        "Falta de recubrimiento: Acero superficial expuesto sin corrosión severa.",
                        "Fisuración en juntas de pega: Grietas escalonadas en mortero por baja adherencia en mampostería.",
                        "Segregación del concreto (Cangrejeras): Nidos de abeja o fisuras puntuales por mal vaciado.",
                        "Fisuras longitudinales leves: Agrietamiento en vigas por pérdida de adherencia inicial acero-concreto.",
                        "Aplastamiento local en mampostería: Astillado o trituración menor en vértices de bloques."
                    ],
                    amarillo: [
                        "Falla por Flexión: Deformación en vigas o losas por fluencia del acero (sin rotura frágil).",
                        "Desprendimiento de recubrimiento (Spalling): Pérdida de concreto por corrosión expansiva y pérdida de sección.",
                        "Falta de confinamiento: Estribado insuficiente o muy espaciado en vigas/columnas.",
                        "Degradación del concreto: Concreto poroso o desmoronable por mala dosificación (alta relación agua/cemento).",
                        "Agrietamiento en 'X' (Corte): Grietas diagonales en paneles o paredes de mampostería.",
                        "Separación de muros: Agrietamiento en esquinas por rotura de amarre entre muros ortogonales.",
                        "Efecto de Martilleo: Golpeteo o impacto dinámico entre edificaciones por junta sísmica insuficiente.",
                        "Torsión Sísmica: Irregularidad estructural por asimetría de ejes o adosamiento lateral.",
                        "Asentamiento Diferencial: Deformación o grietas por movimiento puntual del terreno de fundación."
                    ],
                    rojo: [
                        "Falla por Columna Corta: Rotura frágil por corte debido a restricción lateral parcial.",
                        "Falla por Cortante Puro: Grietas frágiles diagonales graves en elementos de carga (vigas/columnas).",
                        "Falla en Nodo (Viga-Columna): Destrucción o agrietamiento severo en la unión estructural.",
                        "Pandeo del Acero Longitudinal: Doblado del acero de refuerzo por pérdida total de confinamiento.",
                        "Aplastamiento del Núcleo: Trituración del concreto por esfuerzo excesivo a compresión.",
                        "Descalce de Vigas: Pérdida de la longitud de apoyo con riesgo inminente de caída de la viga.",
                        "Falla por Punzonamiento: Perforación de losa o zapata en la zona de conexión con la columna.",
                        "Piso Blando (Soft Story): Deformación geométrica permanente en planta baja por falta de rigidez.",
                        "Discontinuidad Vertical: Daños por muros nacientes o interrupción brusca de elementos de carga.",
                        "Volcamiento de Muro / Pared: Falla fuera del plano o pérdida de verticalidad en paredes no confinadas.",
                        "Sobrecarga / Riesgo de Colapso: Sobrecarga por niveles no planificados o impacto de estructuras vecinas.",
                        "Falla Geotécnica Severa: Licuación local de suelo o inestabilidad de talud activa bajo las fundaciones."
                    ]
                    
            };
        }

        function guardarCatalogoFallas(cat) {
            localStorage.setItem('catalogo_fallas_dinamico', JSON.stringify(cat));
        }

        // --- VENTANA 1: SELECCIÓN RÁPIDA (Estilo Imagen 1) ---
        function abrirModalSeleccionFallas() {
            renderizarModalSeleccion();
            abrirModal('modalSeleccionFallas');
        }

        function renderizarModalSeleccion() {
            const catalogo = obtenerCatalogoFallas();
            const txtComentarios = document.getElementById('txtComentarios').value;
            const container = document.getElementById('modalSeleccionBody');
            container.innerHTML = "";

            const secciones = [
                { key: 'verde', labelBadge: 'Verde', cssCard: 'card-verde' },
                { key: 'amarillo', labelBadge: 'Amarillo', cssCard: 'card-amarillo' },
                { key: 'rojo', labelBadge: 'Rojo', cssCard: 'card-rojo' }
            ];

            secciones.forEach(sec => {
                if (catalogo[sec.key]) {
                    catalogo[sec.key].forEach(itemText => {
                        const isChecked = txtComentarios.includes(itemText);
                        const card = document.createElement('div');
                        card.className = `falla-card-item ${sec.cssCard} ${isChecked ? 'selected-card' : ''}`;
                        card.innerHTML = `
                            <input type="checkbox" value="${itemText}" data-categoria="${sec.key}" ${isChecked ? 'checked' : ''}>
                            <span class="falla-card-texto">${itemText}</span>
                        `;
                        card.onclick = (e) => {
                            const chk = card.querySelector('input[type="checkbox"]');
                            if (e.target.tagName !== 'INPUT') {
                                chk.checked = !chk.checked;
                            }
                            if (chk.checked) card.classList.add('selected-card');
                            else card.classList.remove('selected-card');
                        };
                        container.appendChild(card);
                    });
                }
            });
        }

        function aplicarSeleccionFallas() {
            const checkboxes = document.querySelectorAll('#modalSeleccionBody input[type="checkbox"]:checked');
            const txtArea = document.getElementById('txtComentarios');
            const catalogo = obtenerCatalogoFallas();
            let textoActual = txtArea.value;

            const allCatItems = [...catalogo.verde, ...catalogo.amarillo, ...catalogo.rojo];
            allCatItems.forEach(item => {
                const regex1 = new RegExp(`•\\s*${escapeRegExp(item)}\\r?\\n?`, 'g');
                textoActual = textoActual.replace(regex1, '');
            });
            
            textoActual = textoActual.trim();

            const nuevasViñetas = [];
            checkboxes.forEach(cb => {
                nuevasViñetas.push(`• ${cb.value}`);
            });

            const textoAInsertar = nuevasViñetas.join('\n');

            if (textoActual.length > 0 && textoAInsertar.length > 0) {
                txtArea.value = textoActual + '\n' + textoAInsertar;
            } else if (textoAInsertar.length > 0) {
                txtArea.value = textoAInsertar;
            } else {
                txtArea.value = textoActual;
            }

            cerrarModal('modalSeleccionFallas');
            mostrarToast("✅ Observaciones actualizadas");
        }

        function abrirModalGestionFallasDesdeSeleccion() {
            cerrarModal('modalSeleccionFallas');
            abrirModalGestionFallas();
        }

        // --- VENTANA 2: GESTIÓN Y EDICIÓN E IMPORTACIÓN (Estilo Imagen 2) ---
        function abrirModalGestionFallas() {
            renderizarModalGestion();
            abrirModal('modalGestionFallas');
        }

        function renderizarModalGestion() {
            const catalogo = obtenerCatalogoFallas();
            const container = document.getElementById('modalGestionBody');
            container.innerHTML = "";

            const categoriasConfig = [
                { key: 'verde', title: '🟢 Conforme / Detalle Menor', css: 'cat-verde' },
                { key: 'amarillo', title: '🟡 Observación / Ajuste Recomendado', css: 'cat-amarillo' },
                { key: 'rojo', title: '🔴 Crítico / Inconformidad Mayor', css: 'cat-rojo' }
            ];

            categoriasConfig.forEach(catInfo => {
                const divCat = document.createElement('div');
                divCat.className = 'falla-categoria';

                divCat.innerHTML = `
                    <div class="falla-categoria-titulo ${catInfo.css}">${catInfo.title}</div>
                    <div id="gestion_lista_${catInfo.key}" style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px;"></div>
                    <div style="display: flex; gap: 4px; margin-top: 6px;">
                        <input type="text" id="gestion_nuevo_${catInfo.key}" class="form-control" placeholder="Añadir nueva opción..." style="font-size: 0.8rem; padding: 4px 8px;" autocomplete="off">
                        <button type="button" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="agregarFallaManual('${catInfo.key}')">➕</button>
                    </div>
                `;
                container.appendChild(divCat);

                const listaDiv = divCat.querySelector(`#gestion_lista_${catInfo.key}`);
                catalogo[catInfo.key].forEach((itemText, idx) => {
                    const row = document.createElement('div');
                    row.className = 'falla-item-gestion';
                    row.innerHTML = `
                        <span style="flex-grow:1; font-size: 0.8rem; padding-right: 8px;" ondblclick="promptEditarFalla('${catInfo.key}', ${idx})">${itemText}</span>
                        <button type="button" class="btn-icon" style="color: #555;" onclick="promptEditarFalla('${catInfo.key}', ${idx})" title="Editar texto">✏️</button>
                        <button type="button" class="btn-icon" style="color: #c62828;" onclick="eliminarFallaManual('${catInfo.key}', ${idx})" title="Eliminar del catálogo">🗑️</button>
                    `;
                    listaDiv.appendChild(row);
                });
            });
        }

        function agregarFallaManual(categoriaKey) {
            const input = document.getElementById(`gestion_nuevo_${categoriaKey}`);
            const valor = input.value.trim();
            if (!valor) return;

            const catalogo = obtenerCatalogoFallas();
            if (!catalogo[categoriaKey].includes(valor)) {
                catalogo[categoriaKey].push(valor);
                guardarCatalogoFallas(catalogo);
                renderizarModalGestion();
                mostrarToast("✅ Opción agregada al catálogo");
            } else {
                alert("Esta opción ya existe en el catálogo.");
            }
        }

        function eliminarFallaManual(categoriaKey, index) {
            if (confirm("¿Desea eliminar esta opción del catálogo permanente?")) {
                const catalogo = obtenerCatalogoFallas();
                catalogo[categoriaKey].splice(index, 1);
                guardarCatalogoFallas(catalogo);
                renderizarModalGestion();
                mostrarToast("🗑️ Opción eliminada del catálogo");
            }
        }

        function editarFallaManual(categoriaKey, index, nuevoTexto) {
            const catalogo = obtenerCatalogoFallas();
            const textoLimpio = nuevoTexto.trim();
            if (textoLimpio && catalogo[categoriaKey][index] !== textoLimpio) {
                catalogo[categoriaKey][index] = textoLimpio;
                guardarCatalogoFallas(catalogo);
                mostrarToast("✏️ Opción actualizada");
                renderizarModalGestion();
            }
        }

        function promptEditarFalla(categoriaKey, index) {
            const catalogo = obtenerCatalogoFallas();
            const textoActual = catalogo[categoriaKey][index];
            document.getElementById('txtEditFalla').value = textoActual;
            document.getElementById('editFallaCat').value = categoriaKey;
            document.getElementById('editFallaIdx').value = index;
            abrirModal('modalEditarFalla');
        }

        function guardarEdicionFallaModal() {
            const categoriaKey = document.getElementById('editFallaCat').value;
            const index = document.getElementById('editFallaIdx').value;
            const nuevoTexto = document.getElementById('txtEditFalla').value;
            editarFallaManual(categoriaKey, index, nuevoTexto);
            cerrarModal('modalEditarFalla');
        }

        function exportarCatalogoArchivo() {
            const catalogo = obtenerCatalogoFallas();
            const jsonString = JSON.stringify(catalogo, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const yymmdd = fechaActual ? fechaActual.replace(/-/g, "") : "export";
            descargarJSONLocalmente(blob, `CATALOGO_FALLAS_${yymmdd}.json`);
        }

        // --- IMPORTACIÓN MAESTRA DESDE ARCHIVO (JSON / TXT) ---
        function importarCatalogoDesdeArchivo(input) {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const contenido = e.target.result;
                const catalogoActual = obtenerCatalogoFallas();
                let importadosCount = 0;

                try {
                    // Intento JSON primero
                    const dataJson = JSON.parse(contenido);
                    if (dataJson.verde || dataJson.amarillo || dataJson.rojo) {
                        ['verde', 'amarillo', 'rojo'].forEach(color => {
                            if (dataJson[color] && Array.isArray(dataJson[color])) {
                                dataJson[color].forEach(textoFalla => {
                                    if (!catalogoActual[color].includes(textoFalla)) {
                                        catalogoActual[color].push(textoFalla);
                                        importadosCount++;
                                    }
                                });
                            }
                        });
                    }
                } catch (err) {
                    // Fallback a CSV/TXT
                    const lineas = contenido.split(/\r?\n/);
                    lineas.forEach(linea => {
                        const lineaLimpia = linea.trim();
                        if (!lineaLimpia || lineaLimpia.startsWith('#')) return;

                        const partes = lineaLimpia.split(';');
                        if (partes.length >= 2) {
                            const categoriaRaw = partes[0].trim().toLowerCase();
                            const textoFalla = partes.slice(1).join(';').trim();

                            if (textoFalla) {
                                if (categoriaRaw.includes('verde')) {
                                    if (!catalogoActual.verde.includes(textoFalla)) {
                                        catalogoActual.verde.push(textoFalla);
                                        importadosCount++;
                                    }
                                } else if (categoriaRaw.includes('amarillo') || categoriaRaw.includes('yellow')) {
                                    if (!catalogoActual.amarillo.includes(textoFalla)) {
                                        catalogoActual.amarillo.push(textoFalla);
                                        importadosCount++;
                                    }
                                } else if (categoriaRaw.includes('rojo')) {
                                    if (!catalogoActual.rojo.includes(textoFalla)) {
                                        catalogoActual.rojo.push(textoFalla);
                                        importadosCount++;
                                    }
                                }
                            }
                        }
                    });
                }

                if (importadosCount > 0) {
                    guardarCatalogoFallas(catalogoActual);
                    renderizarModalGestion();
                    mostrarToast(`✅ ${importadosCount} ítems importados con éxito`);
                } else {
                    alert("⚠️ No se encontraron ítems válidos nuevos. Verifique el formato.");
                }
                input.value = "";
            };
            reader.readAsText(file);
        }

        function escapeRegExp(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function copiarComentarios() {
            const txtArea = document.getElementById('txtComentarios');
            const texto = txtArea.value.trim();

            if (!texto) {
                mostrarToast("⚠️ El campo de comentarios está vacío");
                return;
            }

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(texto).then(() => {
                    mostrarToast("📋 Comentarios copiados");
                }).catch(() => {
                    copiarComentariosFallback(texto);
                });
            } else {
                copiarComentariosFallback(texto);
            }
        }

        function copiarComentariosFallback(texto) {
            const txtArea = document.getElementById('txtComentarios');
            txtArea.select();
            txtArea.setSelectionRange(0, 99999);
            try {
                document.execCommand("copy");
                mostrarToast("📋 Comentarios copiados");
            } catch (err) {
                alert("Error al copiar texto.");
            }
        }

        function actualizarDatalistCalles() {
            const datalist = document.getElementById("listaCalles");
            datalist.innerHTML = "";
            callesExistentes.forEach(calle => {
                const option = document.createElement("option");
                option.value = calle;
                datalist.appendChild(option);
            });
        }

        /**
 * @function guardarFormulario
 * @description Procesa el formulario, recolecta datos e imágenes, y los guarda/actualiza en IndexedDB.
 * @param {Event} e - Evento del formulario
 */
        function guardarFormulario(e) {
            e.preventDefault();
            const editId = document.getElementById("editId").value;
            const calle = document.getElementById("txtCalle").value.trim();
            const edificio = document.getElementById("txtEdificio").value.trim();
            const certificado = document.getElementById("txtCertificado").value.trim();
            const comentarios = document.getElementById("txtComentarios").value.trim();
            
            if (!/^\d+$/.test(certificado)) {
                alert("❌ El Nro. de Certificado debe contener únicamente dígitos numéricos sin espacios ni letras.");
                return;
            }

            const colorElement = document.querySelector('input[name="colorEtiqueta"]:checked');
            if (!colorElement) {
                alert("❌ Debe seleccionar un color de etiqueta para continuar");
                return;
            }
            const color = colorElement.value;
            
            const fotoFrente = document.getElementById("prevFrente").src.startsWith("data:") ? document.getElementById("prevFrente").src : null;
            const fotoRespaldo = document.getElementById("prevRespaldo").src.startsWith("data:") ? document.getElementById("prevRespaldo").src : null;

            const registro = {
                fecha: fechaActual, 
                calle,
                edificio,
                certificado,
                color,
                comentarios,
                fotoFrente,
                fotoRespaldo
            };

            const transaction = db.transaction(["inspecciones"], "readwrite");
            const store = transaction.objectStore("inspecciones");

            if (editId) {
                registro.id = Number(editId);
                store.put(registro).onsuccess = () => {
                    mostrarToast("✅ Registro actualizado");
                    regresarPrincipal();
                    cargarTabla();
                };
            } else {
                store.add(registro).onsuccess = () => {
                    mostrarToast("✅ Registro guardado");
                    regresarPrincipal();
                    cargarTabla();
                };
            }
        }

        /**
 * @function cargarTabla
 * @description Consulta IndexedDB para obtener los registros de la fecha activa y los renderiza en la vista principal.
 */
        function cargarTabla() {
            const tbody = document.getElementById("tablaCuerpo");
            tbody.innerHTML = "";
            callesExistentes.clear();

            if (!db) return;

            const transaction = db.transaction(["inspecciones"], "readonly");
            const store = transaction.objectStore("inspecciones");
            const requestGetAll = store.getAll();
            
            requestGetAll.onsuccess = function(event) {
                const registros = event.target.result || [];
                let inspeccionesDelDia = [];

                for (let i = registros.length - 1; i >= 0; i--) {
                    const r = registros[i];
                    if (r.calle && r.calle.trim() !== "") {
                        callesExistentes.add(r.calle.trim());
                    }
                }

                registros.forEach(r => {
                    if (r.fecha === fechaActual) {
                        inspeccionesDelDia.push(r);
                        const tr = document.createElement("tr");
                        tr.dataset.id = r.id;

                        let badgeClass = "badge-verde";
                        let rowClass = "row-verde";
                        if (r.color === "Amarillo" || r.color === "Yellow") {
                            badgeClass = "badge-amarillo";
                            rowClass = "row-amarillo";
                        } else if (r.color === "Rojo") {
                            badgeClass = "badge-rojo";
                            rowClass = "row-rojo";
                        }

                        tr.className = rowClass;

                        let certDisplay = "-";
                        if (r.certificado && r.certificado.toString().trim() !== "") {
                            const certStr = r.certificado.toString().trim();
                            certDisplay = certStr.length > 5 ? certStr.slice(0, 5) + "*" : certStr + "*";
                        }

                        tr.innerHTML = `
                            <td class="col-calle" title="${r.calle}">${r.calle}</td>
                            <td>${r.edificio}</td>
                            <td style="text-align: center; white-space: nowrap; font-variant-numeric: tabular-nums;">${certDisplay}</td>
                            <td style="text-align: center; padding: 2px;">
                                <button class="btn-dots" onclick="lanzarMenuOpciones(event, ${r.id})">⋮</button>
                            </td>
                        `;
                        
                        tbody.appendChild(tr);
                    }
                });

                actualizarDatalistCalles();
                
                let v = 0, a = 0, r = 0;
                inspeccionesDelDia.forEach(i => {
                    if (i.color === 'Verde' || i.color === 'verde') v++;
                    if (i.color === 'Amarillo' || i.color === 'amarillo' || i.color === 'Yellow') a++;
                    if (i.color === 'Rojo' || i.color === 'rojo') r++;
                });
                
                const elResumen = document.getElementById('resumenContadores');
                if (elResumen) {
                    elResumen.innerHTML = `Resumen: (${v}🟢 | ${a}🟡 | ${r}🔴)`;
                }
            };
        }

        function verDetalleInspeccion(id) {
            const transaction = db.transaction(["inspecciones"], "readonly");
            const store = transaction.objectStore("inspecciones");
            store.get(id).onsuccess = e => {
                const r = e.target.result;
                if (!r) return;

                document.getElementById("detTitle").innerText = `${r.calle} | ${r.edificio}`;
                let badgeClass = r.color === "Verde" ? "badge-verde" : (r.color === "Amarillo" || r.color === "Yellow" ? "badge-amarillo" : "badge-rojo");

                let htmlFotos = "";
                if (r.fotoFrente || r.fotoRespaldo) {
                    htmlFotos = `<p style="font-size:0.75rem; color:#666; text-align:center; margin-top:8px; margin-bottom: 2px;">🔍 Toca una imagen para verla en pantalla completa</p>`;
                    htmlFotos += `<div class="detail-photos">`;
                    if (r.fotoFrente) {
                        htmlFotos += `<div style="display:flex; flex-direction:column; gap:4px;">
                            <strong>Fachada:</strong>
                            <img src="${r.fotoFrente}" onclick="abrirZoom(this)">
                            <button class="btn btn-secondary" style="padding: 6px 8px; font-size: 0.8rem; border: 1px solid #ccc;" onclick="descargarFotoDetalle('${r.id}', 'Frente')">💾 Guardar foto</button>
                        </div>`;
                    }
                    if (r.fotoRespaldo) {
                        htmlFotos += `<div style="display:flex; flex-direction:column; gap:4px;">
                            <strong>Certificado:</strong>
                            <img src="${r.fotoRespaldo}" onclick="abrirZoom(this)">
                            <button class="btn btn-secondary" style="padding: 6px 8px; font-size: 0.8rem; border: 1px solid #ccc;" onclick="descargarFotoDetalle('${r.id}', 'Respaldo')">💾 Guardar foto</button>
                        </div>`;
                    }
                    htmlFotos += `</div>`;
                }

                let htmlComentarios = r.comentarios ? `<p style="margin-top:8px;"><strong>Comentarios:</strong><br><span style="white-space: pre-line; color:#444;">${r.comentarios}</span></p>` : "";

                document.getElementById("detBody").innerHTML = `
                    <p><strong>Día:</strong> ${r.fecha}</p>
                    <p><strong>Calle/Sector:</strong> ${r.calle}</p>
                    <p><strong>Edificación:</strong> ${r.edificio}</p>
                    <p><strong>📜:</strong> ${r.certificado}</p>
                    <p><strong>Color:</strong> <span class="badge ${badgeClass}">${r.color === 'Yellow' ? 'Amarillo' : r.color}</span></p>
                    ${htmlComentarios}
                    ${htmlFotos}
                `;
                abrirModal("modalDetalles");
            };
        }

        function abrirZoom(elementoImg) {
            if (!elementoImg || !elementoImg.src) return;
            const modal = document.getElementById("modalZoom");
            const imgZoomed = document.getElementById("imgZoomed");
            imgZoomed.src = elementoImg.src;
            modal.style.display = "flex";
        }

        function cerrarZoom() { document.getElementById("modalZoom").style.display = "none"; }

        function lanzarMenuOpciones(event, id) {
            if (event) event.stopPropagation();
            activeRecordId = id;
            
            const transaction = db.transaction(["inspecciones"], "readonly");
            const store = transaction.objectStore("inspecciones");
            store.get(id).onsuccess = e => {
                const r = e.target.result;
                if (r) {
                    document.getElementById("menuTargetText").innerText = `${r.calle} - ${r.edificio} (${r.certificado})`;
                    
                    document.getElementById("btnMenuResumen").onclick = () => {
                        cerrarModal("modalMenu");
                        verDetalleInspeccion(id);
                    };
                    document.getElementById("btnMenuEditar").onclick = () => {
                        cerrarModal("modalMenu");
                        mostrarFormulario(id);
                    };
                    document.getElementById("btnMenuEliminar").onclick = () => {
                        cerrarModal("modalMenu");
                        eliminarRegistro(id);
                    };
                    abrirModal("modalMenu");
                }
            };
        }

        function eliminarRegistro(id) {
            if (confirm("¿Seguro que deseas eliminar este registro?")) {
                const transaction = db.transaction(["inspecciones"], "readwrite");
                const store = transaction.objectStore("inspecciones");
                store.delete(id).onsuccess = () => {
                    mostrarToast("🗑️ Registro eliminado");
                    cargarTabla();
                };
            }
        }

        /**
 * @function compartirOEnviarReporte
 * @description Genera un resumen de texto con los registros del día y abre las opciones de compartir nativas (Web Share API) o portapapeles.
 */
        function compartirOEnviarReporte() {
            const configTrans = db.transaction(["configuracion"], "readonly");
            const configStore = configTrans.objectStore("configuracion");
            
            configStore.get(fechaActual).onsuccess = e => {
                const config = e.target.result;
                if (!config) {
                    alert("⚠️ Primero debe configurar el equipo de trabajo para este día de trabajo.");
                    return;
                }

                const insTrans = db.transaction(["inspecciones"], "readonly");
                const insStore = insTrans.objectStore("inspecciones");
                
                insStore.getAll().onsuccess = event => {
                    const registros = event.target.result.filter(r => r.fecha === fechaActual);
                    if (registros.length === 0) {
                        mostrarToast("⚠️ No hay inspecciones hoy.");
                        return;
                    }

                    const callesData = {};
                    let totalVerdes = 0, totalAmarillas = 0, totalRojas = 0;

                    registros.forEach(r => {
                        const calleNorm = r.calle.trim();
                        if (!callesData[calleNorm]) callesData[calleNorm] = { inspecciones: [] };
                        callesData[calleNorm].inspecciones.push(r);
                        
                        if (r.color === "Verde") totalVerdes++;
                        else if (r.color === "Amarillo" || r.color === "Yellow") totalAmarillas++;
                        else if (r.color === "Rojo") totalRojas++;
                    });

                    let rStr = `📝 *REPORTE DE INSPECCIONES*\n`;
                    const partesFecha = fechaActual.split("-");
                    const fechaFormateada = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
                    
                    rStr += `Fecha: ${fechaFormateada}\n`;
                    rStr += `Grupo: ${config.grupo}\n`;
                    rStr += `Parroquia: ${config.parroquia}\n`;
                    rStr += `====================\n`;

                    for (const calle in callesData) {
                        rStr += `*${calle}*\n`;
                        callesData[calle].inspecciones.forEach(ins => {
                            let emoji = ins.color === "Verde" ? "🟢" : (ins.color === "Amarillo" || ins.color === "Yellow" ? "🟠" : "🔴");
                            
                            let certStr = "";
                            if (config.mostrarCertificado !== false && ins.certificado) {
                                const certCompleto = ins.certificado.toString().trim();
                                const certReducido = certCompleto.length > 5 ? certCompleto.slice(0, 5) + "*" : certCompleto + "*";
                                certStr = ` | 📜 *${certReducido}*`;
                            }
                            
                            rStr += `${emoji} ${ins.edificio}${certStr}\n`;
                        });
                        rStr += `\n`;
                    }

                    rStr += `_Resumen: (${totalVerdes}🟢 | ${totalAmarillas}🟠 | ${totalRojas}🔴)_\n\n`;
                    rStr += `*TOTAL INSPECCIONES: ${registros.length}*\n`;
                    rStr += `====================\n`;
                    rStr += `Coordinador de brigada:\n`;
                    rStr += `${config.coordinador || 'No especificado'}\n\n`;
                    rStr += `Inspectores:\n`;
                    rStr += config.inspectores.map(name => `${name}`).join("\n");

                    if (navigator.share) {
                        navigator.share({ title: `Reporte ${fechaFormateada}`, text: rStr })
                        .then(() => mostrarToast("✅ Reporte Compartido"))
                        .catch(err => console.log("Compartir cancelado:", err));
                    } else {
                        navigator.clipboard.writeText(rStr).then(() => {
                            mostrarToast("✅ Reporte Copiado");
                        }).catch(() => alert("Error al copiar automáticamente."));
                    }
                };
            };
        }        

        function confirmarReiniciarDia() {
            const hoy = new Date();
            const year = hoy.getFullYear();
            const month = String(hoy.getMonth() + 1).padStart(2, '0');
            const day = String(hoy.getDate()).padStart(2, '0');
            const hoyStr = `${year}-${month}-${day}`;

            if (fechaActual === hoyStr) {
                alert("Ya se encuentra trabajando en la fecha del día de hoy.");
                return;
            }

            if (confirm(`¿Desea cambiar la fecha de trabajo al día de hoy (${day}/${month}/${year})?\nEsto le permitirá iniciar su nueva jornada manteniendo a salvo sus históricos.`)) {
                fechaActual = hoyStr;
                document.getElementById("filterDate").value = fechaActual;
                comprobarConfiguracionFecha(fechaActual);
                cargarTabla();
                mostrarToast("🔄 Cambiado al día actual");
            }
        }

        function descargarJSONLocalmente(blob, nombre) {
            const lnk = document.createElement("a");
            lnk.download = nombre;
            lnk.href = URL.createObjectURL(blob);
            document.body.appendChild(lnk);
            lnk.click();
            document.body.removeChild(lnk);
            mostrarToast("📥 Archivo guardado en Descargas con éxito.");
        }

        /**
 * @function exportarDataJSONPorEmail
 * @description Exporta toda la base de datos (configuración e inspecciones) a un JSON y lo adjunta vía cliente de correo (mailto).
 */
        function exportarDataJSONPorEmail() {
            if (!db) return;
            cerrarModal("modalSincronizacion");
            
            const exportData = { inspecciones: [], configuraciones: [] };
            const tx = db.transaction(["inspecciones", "configuracion"], "readonly");
            
            tx.objectStore("inspecciones").getAll().onsuccess = e => { exportData.inspecciones = e.target.result; };
            tx.objectStore("configuracion").getAll().onsuccess = e => { exportData.configuraciones = e.target.result; };

            tx.oncomplete = () => {
                const jsonString = JSON.stringify(exportData);
                const blob = new Blob([jsonString], { type: "application/json" });
                const nombreArchivo = `DATA_CUADRILLA_${fechaActual}.json`;

                descargarJSONLocalmente(blob, nombreArchivo);
            };
        }

        function exportarJornadaWhatsApp() {
            if (!db) return;
            cerrarModal("modalSincronizacion");
            
            const tx = db.transaction(["inspecciones", "configuracion"], "readonly");
            let dataInspecciones = [];
            let parametrosConfig = null;
            
            tx.objectStore("inspecciones").getAll().onsuccess = e => { dataInspecciones = e.target.result; };
            tx.objectStore("configuracion").get(fechaActual).onsuccess = e => { parametrosConfig = e.target.result; };

            tx.oncomplete = () => {
                parametrosConfig = parametrosConfig || { grupo: "No registrado", inspectores: ["No registrado"] };
                
                const fecha = new Date().toLocaleDateString('es-VE');
                const grupo = parametrosConfig.grupo || "No registrado";
                const responsable = (parametrosConfig.inspectores && parametrosConfig.inspectores.length > 0) ? parametrosConfig.inspectores[0] : "No registrado";
                
                const jsonStr = JSON.stringify(dataInspecciones);
                const base64Data = btoa(unescape(encodeURIComponent(jsonStr)));
                
                const mensajeTexto = `📊 *REPORTE DE INSPECCIÓN DE CAMPO*\n📅 *Fecha:* ${fecha}\n👥 *Grupo:* ${grupo}\n👤 *Responsable:* ${responsable}\n\n⚠️ _Para unificar estos datos en tu aplicación, deja presionado este mensaje, selecciónalo todo, dale a *Copiar* y abre la app._\n\nDATA_CUADRILLA_${base64Data}`;
                
                const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensajeTexto)}`;
                window.open(whatsappUrl, '_blank');
            };
        }

        async function importarJornadaPortapapeles() {
            cerrarModal("modalSincronizacion");
            try {
                const text = await navigator.clipboard.readText();
                if (!text.includes("DATA_CUADRILLA_")) {
                    alert("⚠️ El texto en el portapapeles no contiene datos válidos de cuadrilla.");
                    return;
                }
                
                const bloqueCodificado = text.split("DATA_CUADRILLA_")[1].trim();
                const jsonStr = decodeURIComponent(escape(atob(bloqueCodificado)));
                const dataInspecciones = JSON.parse(jsonStr);
                
                if (!Array.isArray(dataInspecciones)) {
                    alert("⚠️ Formato de datos corrupto.");
                    return;
                }

                if (!confirm(`Se procesarán ${dataInspecciones.length} registros del portapapeles.\n¿Desea compaginarlos con su base de datos actual?`)) {
                    return;
                }

                const tx = db.transaction(["inspecciones"], "readwrite");
                const storeIns = tx.objectStore("inspecciones");
                
                storeIns.getAll().onsuccess = ev => {
                    const existentes = ev.target.result;
                    let agregados = 0;

                    dataInspecciones.forEach(nueva => {
                        const esDuplicado = existentes.some(ext => 
                            ext.fecha === nueva.fecha &&
                            ext.calle.trim().toLowerCase() === nueva.calle.trim().toLowerCase() &&
                            ext.edificio.trim().toLowerCase() === nueva.edificio.trim().toLowerCase() &&
                            ext.certificado.toString().trim() === nueva.certificado.toString().trim()
                        );

                        if (!esDuplicado) {
                            delete nueva.id; 
                            storeIns.add(nueva);
                            agregados++;
                        }
                    });

                    tx.oncomplete = () => {
                        alert(`📊 Sincronización por WhatsApp Completada:\n• Registros nuevos incorporados: ${agregados}\n• Duplicados omitidos de forma segura: ${dataInspecciones.length - agregados}`);
                        cargarTabla();
                    };
                };
            } catch (err) {
                console.error(err);
                alert("❌ Error crítico leyendo el portapapeles.");
            }
        }

        function importarDataJSON(input) {
            const file = input.files[0];
            if (!file) return;
            cerrarModal("modalSincronizacion");

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const dataImportada = JSON.parse(e.target.result);
                    if (!dataImportada.inspecciones || !dataImportada.configuraciones) {
                        alert("⚠️ El archivo seleccionado no tiene un formato válido para la cuadrilla.");
                        input.value = "";
                        return;
                    }

                    if (!confirm(`Se procesarán los registros del archivo del colega.\n¿Desea compaginarlos con su base de datos actual?`)) {
                        input.value = "";
                        return;
                    }

                    const tx = db.transaction(["inspecciones", "configuracion"], "readwrite");
                    const storeIns = tx.objectStore("inspecciones");
                    const storeCfg = tx.objectStore("configuracion");

                    dataImportada.configuraciones.forEach(cfgColega => {
                        storeCfg.get(cfgColega.fecha).onsuccess = evCfg => {
                            const miCfgExistente = evCfg.target.result;
                            if (miCfgExistente) {
                                const nominaCombinada = [];
                                const mapaAgregados = new Set();

                                miCfgExistente.inspectores.forEach(n => {
                                    const norm = n.trim().toLowerCase();
                                    if (!mapaAgregados.has(norm)) {
                                        nominaCombinada.push(n.trim());
                                        mapaAgregados.add(norm);
                                    }
                                });

                                cfgColega.inspectores.forEach(n => {
                                    const norm = n.trim().toLowerCase();
                                    if (!mapaAgregados.has(norm)) {
                                        nominaCombinada.push(n.trim());
                                        mapaAgregados.add(norm);
                                    }
                                });

                                miCfgExistente.inspectores = nominaCombinada;
                                storeCfg.put(miCfgExistente);
                            } else {
                                storeCfg.put(cfgColega);
                            }
                        };
                    });

                    storeIns.getAll().onsuccess = ev => {
                        const existentes = ev.target.result;
                        let agregados = 0;

                        dataImportada.inspecciones.forEach(nueva => {
                            const esDuplicado = existentes.some(ext => 
                                ext.fecha === nueva.fecha &&
                                ext.calle.trim().toLowerCase() === nueva.calle.trim().toLowerCase() &&
                                ext.edificio.trim().toLowerCase() === nueva.edificio.trim().toLowerCase() &&
                                ext.certificado.toString().trim() === nueva.certificado.toString().trim()
                            );

                            if (!esDuplicado) {
                                delete nueva.id; 
                                storeIns.add(nueva);
                                agregados++;
                            }
                        });

                        tx.oncomplete = () => {
                            alert(`📊 Compaginación Completada:\n• Registros nuevos incorporados: ${agregados}\n• Duplicados omitidos de forma segura: ${dataImportada.inspecciones.length - agregados}`);
                            input.value = "";
                            comprobarConfiguracionFecha(fechaActual);
                            cargarTabla();
                        };
                    };
                } catch (err) {
                    alert("❌ Error crítico leyendo el archivo JSON.");
                    input.value = "";
                }
            };
            reader.readAsText(file);
        }

        function eliminarTodoElHistorialDB() {
            if (confirm("⚠️ ALERTA EXTREMA:\n¿Está seguro de querer borrar permanentemente toda la Base de Datos?")) {
                if (confirm("Por seguridad, confirme una última vez. ¿Desea proceder?")) {
                    const trans1 = db.transaction(["inspecciones"], "readwrite").objectStore("inspecciones").clear();
                    const trans2 = db.transaction(["configuracion"], "readwrite").objectStore("configuracion").clear();
                    trans1.onsuccess = trans2.onsuccess = () => {
                        alert("🧹 Base de Datos purgada por completo.");
                        window.location.reload();
                    };
                }
            }
        }

        function limpiarCatalogoFallas() {
            if (confirm("¿Estás seguro de que deseas VACIAR completamente el catálogo actual?\nEsta acción no se puede deshacer a menos que importes un respaldo.")) {
                const vacio = { verde: [], amarillo: [], rojo: [] };
                localStorage.setItem('catalogo_fallas_dinamico', JSON.stringify(vacio));
                mostrarToast("🧹 Catálogo de fallas restablecido/limpiado");
            }
        }

        function abrirModal(id) { document.getElementById(id).style.display = "flex"; }
        function cerrarModal(id) { document.getElementById(id).style.display = "none"; }
        function mostrarToast(msg) {
            const toast = document.getElementById("toast");
            toast.innerText = msg;
            toast.style.opacity = "1";
            setTimeout(() => toast.style.opacity = "0", 2500);
        }

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js', { scope: './' })
                    .then(reg => console.log('Service Worker registrado con éxito:', reg.scope))
                    .catch(err => console.error('Error al registrar el Service Worker:', err));
            });
        }