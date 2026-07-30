// ==========================================================================
// GESTIÓN DE INVENTARIO Y ALMACÉN - ÓPTICA MANTILLA (Firebase Realtime Database)
// ==========================================================================

// Cargar categorías guardadas previamente en el navegador (o iniciar vacío)
let categoriasAlmacen = JSON.parse(localStorage.getItem('optica_categorias_almacen')) || [];
let productosAlmacen = {}; 
const PASSWORD_SEGURIDAD = "24060102";

let accionPendienteSeguridad = null;
let keyPendienteSeguridad = null;

// Guardar categorías en localStorage
function persistirCategorias() {
    localStorage.setItem('optica_categorias_almacen', JSON.stringify(categoriasAlmacen));
}

// Obtener referencia segura a Firebase
function obtenerReferenciaInventario() {
    try {
        if (typeof db !== 'undefined' && db) {
            return db.ref('inventario');
        }
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            return firebase.database().ref('inventario');
        }
    } catch (e) {
        console.error("Error al inicializar la referencia de inventario en Firebase:", e);
    }
    return null;
}

function cargarModuloAlmacen() {
    const contenedor = document.getElementById('contenidoDinamico');
    if (!contenedor) return;

    if (typeof resaltarItemMenu === 'function') resaltarItemMenu('nav-almacen');

    contenedor.innerHTML = `
        <div class="animate__animated animate__fadeIn position-relative">

            <!-- CONTENEDOR DE ALERTAS FLOTANTES -->
            <div id="contenedorAlertasAlmacen" class="position-fixed top-0 end-0 p-3" style="z-index: 1060; max-width: 350px;"></div>

            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="fw-bold mb-1 text-dark">Control de Inventario y Almacén</h2>
                    <p class="text-muted mb-0">Gestión de productos, stock en tiempo real y precios de venta.</p>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-secondary" onclick="abrirModalCategorias()" style="border-radius: 8px;">
                        <i class="bi bi-tags-fill me-2"></i>Gestionar Categorías
                    </button>
                    <button class="btn btn-primary" onclick="prepararFormularioProductoNuevo()" style="border-radius: 8px;">
                        <i class="bi bi-plus-circle-fill me-2"></i>Nuevo Producto
                    </button>
                </div>
            </div>

            <!-- FILTROS Y BUSCADOR -->
            <div class="card border-0 shadow-sm p-3 mb-4 bg-white">
                <div class="row g-3">
                    <div class="col-12 col-md-6 col-lg-5">
                        <div class="input-group">
                            <span class="input-group-text bg-light border-end-0 text-muted" style="border-radius: 8px 0 0 8px;">
                                <i class="bi bi-search"></i>
                            </span>
                            <input type="text" id="buscarProducto" class="form-control bg-light border-start-0 ps-1" placeholder="Buscar por código o nombre de producto..." style="border-radius: 0 8px 8px 0; box-shadow: none;">
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-4">
                        <select id="filtroCategoria" class="form-select bg-light" style="border-radius: 8px;">
                            <option value="">Todas las Categorías</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- TABLA DE INVENTARIO -->
            <div class="card border-0 shadow-sm p-4 bg-white">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Código (Key)</th>
                                <th>Nombre del Producto</th>
                                <th>Categoría</th>
                                <th>Precio (S/.)</th>
                                <th>Stock</th>
                                <th>Estado</th>
                                <th class="text-end">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="cuerpoTablaInventario">
                            <tr>
                                <td colspan="7" class="text-center text-muted py-4">
                                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                    Cargando inventario desde Firebase...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- MODAL PRODUCTO -->
        <div class="modal fade" id="modalProductoForm" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-light py-3" style="border-radius: 12px 12px 0 0;">
                        <h5 class="modal-title fw-bold text-dark" id="tituloModalProducto">
                            <i class="bi bi-box-seam text-primary me-2"></i>Registrar Nuevo Producto
                        </h5>
                        <button type="button" class="btn-close" onclick="cerrarModalProducto()" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <form id="formFichaProducto">
                            <input type="hidden" id="keyProductoEdicionOriginal" value="">

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">Categoría</label>
                                <select id="prodCategoria" class="form-select bg-light" required style="border-radius: 8px;" onchange="actualizarPrefijoCodigo()">
                                    <option value="" disabled selected>Seleccione categoría...</option>
                                </select>
                                <div class="form-text small">¿No aparece la categoría? Agrégala en el botón superior "Gestionar Categorías".</div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">Código de Producto (Llave Única)</label>
                                <input type="text" id="prodCodigo" class="form-control bg-light fw-bold text-primary" placeholder="Ej. CRI-001" required style="border-radius: 8px;">
                                <div class="form-text small">Se autogenera con las 3 primeras letras de la categoría. Puedes editar los números.</div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">Nombre del Artículo / Modelo</label>
                                <input type="text" id="prodNombre" class="form-control bg-light" placeholder="Ej. Cristal Antirrefplex" required style="border-radius: 8px;">
                            </div>

                            <div class="row mb-3">
                                <div class="col-6">
                                    <label class="form-label small fw-bold text-muted">Precio Unitario (S/.)</label>
                                    <input type="number" step="0.01" id="prodPrecio" class="form-control bg-light" placeholder="0.00" required style="border-radius: 8px;">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small fw-bold text-muted">Stock Inicial</label>
                                    <input type="number" id="prodStock" class="form-control bg-light" placeholder="0" required min="0" style="border-radius: 8px;">
                                </div>
                            </div>

                            <div class="d-grid gap-2 mt-4">
                                <button type="submit" class="btn btn-primary py-2 fw-semibold" id="btnGuardarProducto" style="border-radius: 8px;">
                                    <i class="bi bi-check-lg me-1"></i>Guardar Producto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL GESTIÓN DE CATEGORÍAS -->
        <div class="modal fade" id="modalCategorias" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-light py-3" style="border-radius: 12px 12px 0 0;">
                        <h5 class="modal-title fw-bold text-dark">
                            <i class="bi bi-tags text-secondary me-2"></i>Administrar Categorías
                        </h5>
                        <button type="button" class="btn-close" onclick="cerrarModalCategorias()" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <form id="formCategoria" class="mb-3">
                            <input type="hidden" id="indexCategoriaEdicion" value="-1">
                            <label class="form-label small fw-bold text-muted" id="lblFormCategoria">Nueva Categoría</label>
                            <div class="input-group">
                                <input type="text" id="catNombre" class="form-control bg-light" placeholder="Ej. Lentes de Contacto" required style="border-radius: 8px 0 0 8px;">
                                <button type="submit" class="btn btn-dark" id="btnSalvarCat" style="border-radius: 0 8px 8px 0;">
                                    <i class="bi bi-check-lg" id="iconoBtnCat"></i>
                                </button>
                                <button type="button" class="btn btn-outline-secondary d-none ms-1" id="btnCancelarEdicion" onclick="limpiarFormularioCategoria()" style="border-radius: 8px;">Cancelar</button>
                            </div>
                        </form>
                        <hr class="text-muted my-3">
                        <h6 class="small fw-bold text-muted mb-2">Categorías Registradas:</h6>
                        <ul class="list-group list-group-flush border rounded overflow-hidden" id="listaCategoriasUI" style="max-height: 200px; overflow-y: auto;">
                            <!-- Dinámico -->
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL SEGURIDAD -->
        <div class="modal fade" id="modalSeguridadInventario" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
            <div class="modal-dialog modal-sm modal-dialog-centered">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-light py-2" style="border-radius: 12px 12px 0 0;">
                        <h6 class="modal-title fw-bold text-dark mb-0">
                            <i class="bi bi-shield-lock-fill text-danger me-2"></i>Seguridad Requerida
                        </h6>
                        <button type="button" class="btn-close" onclick="cerrarModalSeguridad()" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-3 text-center">
                        <p class="small text-muted mb-3">Introduce la contraseña maestra para continuar.</p>
                        <form id="formConfirmarSeguridadInventario">
                            <div class="mb-3">
                                <input type="password" id="passSeguridadInventario" class="form-control text-center bg-light fw-bold" placeholder="••••••••" required style="border-radius: 8px; letter-spacing: 0.2em;">
                            </div>
                            <button type="submit" class="btn btn-danger btn-sm w-100 fw-semibold py-2" style="border-radius: 8px;">
                                Validar y Continuar
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    inicializarLogicaInventario();
    escucharInventarioEnTiempoReal();
    actualizarSelectorCategorias();
}

// ==========================================================================
// CONTROL DE MODALES NATIVOS SEGUROS
// ==========================================================================

function abrirModalPorId(idModal) {
    const el = document.getElementById(idModal);
    if (el) {
        el.classList.add('show');
        el.style.display = 'block';
        el.removeAttribute('aria-hidden');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('role', 'dialog');

        if (!document.querySelector('.modal-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
        }
        document.body.classList.add('modal-open');
    }
}

function cerrarModalPorId(idModal) {
    const el = document.getElementById(idModal);
    if (el) {
        el.classList.remove('show');
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
        el.removeAttribute('aria-modal');
        el.removeAttribute('role');
        document.querySelector('.modal-backdrop')?.remove();
        document.body.classList.remove('modal-open');
    }
}

window.cerrarModalProducto = function() { cerrarModalPorId('modalProductoForm'); };
window.cerrarModalCategorias = function() { cerrarModalPorId('modalCategorias'); };
window.cerrarModalSeguridad = function() { cerrarModalPorId('modalSeguridadInventario'); };

window.abrirModalCategorias = function() {
    renderizarListaCategoriasUI();
    abrirModalPorId('modalCategorias');
};

// ==========================================================================
// FUNCIONES DE ALERTAS FLOTANTES
// ==========================================================================

function mostrarAlertaAlmacen(mensaje, tipo = "success") {
    const contenedor = document.getElementById('contenedorAlertasAlmacen');
    if (!contenedor) return;

    const idAlerta = 'alert-inv-' + Date.now();
    const icono = tipo === "success" ? "bi-check-circle-fill" : (tipo === "danger" ? "bi-x-circle-fill" : "bi-exclamation-triangle-fill");

    contenedor.innerHTML += `
        <div id="${idAlerta}" class="alert alert-${tipo} d-flex align-items-center alert-dismissible fade show shadow animate__animated animate__fadeInRight" role="alert" style="border-radius: 8px;">
            <i class="bi ${icono} me-2 fs-5"></i>
            <div>${mensaje}</div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    setTimeout(() => {
        const el = document.getElementById(idAlerta);
        if (el) {
            el.classList.replace('animate__fadeInRight', 'animate__fadeOutRight');
            setTimeout(() => el.remove(), 500);
        }
    }, 4000);
}

// ==========================================================================
// SINCRONIZACIÓN EN TIEMPO REAL CON FIREBASE
// ==========================================================================

function escucharInventarioEnTiempoReal() {
    const refInv = obtenerReferenciaInventario();
    if (!refInv) {
        const tbody = document.getElementById('cuerpoTablaInventario');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Error conectando con Firebase en inventario.</td></tr>`;
        }
        return;
    }

    refInv.on('value', (snapshot) => {
        productosAlmacen = snapshot.val() || {};
        actualizarTablaInventario();
    }, (error) => {
        console.error("Error leyendo inventario:", error);
        mostrarAlertaAlmacen("No se pudo cargar el inventario.", "danger");
    });
}

function actualizarTablaInventario() {
    const tbody = document.getElementById('cuerpoTablaInventario');
    if (!tbody) return;

    const entradas = Object.entries(productosAlmacen);
    let htmlFilas = "";

    entradas.forEach(([codigo, prod]) => {
        const stock = parseInt(prod.stock) || 0;
        let badge = "bg-success";
        let estado = "Disponible";

        if (stock === 0) {
            badge = "bg-danger";
            estado = "Sin Stock";
        } else if (stock <= 3) {
            badge = "bg-warning text-dark";
            estado = "Por Agotarse";
        }

        htmlFilas += `
            <tr class="item-producto-fila">
                <td><code class="text-primary fw-bold codigo-producto">${codigo}</code></td>
                <td><strong class="nombre-producto">${prod.nombre}</strong></td>
                <td><span class="text-secondary small fw-medium categoria-producto">${prod.categoria}</span></td>
                <td>S/. ${parseFloat(prod.precio).toFixed(2)}</td>
                <td><span class="fw-bold">${stock}</span> u.</td>
                <td><span class="badge ${badge}">${estado}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="solicitarAutorizacionSeguridad('editar', '${codigo}')" title="Editar Producto" style="border-radius: 6px;">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="solicitarAutorizacionSeguridad('eliminar', '${codigo}')" title="Eliminar Producto" style="border-radius: 6px;">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    htmlFilas += `
        <tr id="sinResultadosInventario" class="${entradas.length ? 'd-none' : ''}">
            <td colspan="7" class="text-center text-muted py-4">
                <i class="bi bi-box fs-3 d-block mb-2 text-danger"></i>
                No hay productos registrados en el almacén.
            </td>
        </tr>
    `;
    tbody.innerHTML = htmlFilas;
}

function actualizarSelectorCategorias() {
    const selectFiltro = document.getElementById('filtroCategoria');
    const selectModal = document.getElementById('prodCategoria');

    let optionsHtml = `<option value="">Todas las Categorías</option>`;
    let optionsModalHtml = `<option value="" disabled selected>Seleccione categoría...</option>`;

    if (categoriasAlmacen.length === 0) {
        optionsModalHtml = `<option value="" disabled selected>No hay categorías. Créalas primero.</option>`;
    } else {
        categoriasAlmacen.forEach(cat => {
            optionsHtml += `<option value="${cat}">${cat}</option>`;
            optionsModalHtml += `<option value="${cat}">${cat}</option>`;
        });
    }

    if (selectFiltro) selectFiltro.innerHTML = optionsHtml;
    if (selectModal) selectModal.innerHTML = optionsModalHtml;
}

function renderizarListaCategoriasUI() {
    const lista = document.getElementById('listaCategoriasUI');
    if (!lista) return;

    if (categoriasAlmacen.length === 0) {
        lista.innerHTML = `<li class="list-group-item text-center text-muted small py-3">No hay categorías registradas. Agrega una arriba.</li>`;
        return;
    }

    let html = "";
    categoriasAlmacen.forEach((cat, index) => {
        html += `
            <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                <span class="fw-medium small">${cat}</span>
                <div>
                    <button class="btn btn-sm text-primary p-0 me-2" onclick="prepararEdicionCategoria(${index})" title="Editar"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm text-danger p-0" onclick="eliminarCategoria(${index})" title="Eliminar"><i class="bi bi-trash"></i></button>
                </div>
            </li>
        `;
    });
    lista.innerHTML = html;
}

// ==========================================================================
// AUTO-GENERACIÓN DE CÓDIGO BASADO EN CATEGORÍA
// ==========================================================================

window.actualizarPrefijoCodigo = function() {
    const selectCat = document.getElementById('prodCategoria');
    const inputCodigo = document.getElementById('prodCodigo');
    const edicionOriginal = document.getElementById('keyProductoEdicionOriginal').value;

    if (!selectCat || !inputCodigo) return;

    // Si estamos editando un producto existente y no se ha cambiado la categoría a propósito, no sobreescribir el código si ya lo tiene completo
    const categoriaSeleccionada = selectCat.value;
    if (!categoriaSeleccionada) return;

    // Tomar las 3 primeras letras en mayúsculas de la categoría seleccionada
    const prefijo = categoriaSeleccionada.trim().substring(0, 3).toUpperCase();

    // Si es un producto nuevo o el código está vacío o no empieza con el prefijo
    if (!edicionOriginal || !inputCodigo.value.startsWith(prefijo)) {
        inputCodigo.value = prefijo + "-";
    }
}

// ==========================================================================
// LÓGICA DE FORMULARIOS Y EVENTOS
// ==========================================================================

function inicializarLogicaInventario() {
    const formProducto = document.getElementById('formFichaProducto');
    const formCategoria = document.getElementById('formCategoria');
    const formSeguridad = document.getElementById('formConfirmarSeguridadInventario');
    const contenidoDinamico = document.getElementById('contenidoDinamico');

    if (contenidoDinamico) {
        contenidoDinamico.addEventListener('input', function (e) {
            if (e.target && e.target.id === 'buscarProducto') {
                filtrarTablaInventario();
            }
        });
        contenidoDinamico.addEventListener('change', function (e) {
            if (e.target && e.target.id === 'filtroCategoria') {
                filtrarTablaInventario();
            }
        });
    }

    if (formProducto) {
        formProducto.addEventListener('submit', function (e) {
            e.preventDefault();
            const refInv = obtenerReferenciaInventario();
            if (!refInv) return;

            const categoriaSeleccionada = document.getElementById('prodCategoria').value;
            if (!categoriaSeleccionada) {
                mostrarAlertaAlmacen("Debe seleccionar o registrar una categoría primero.", "danger");
                return;
            }

            const codigoIngresado = document.getElementById('prodCodigo').value.trim();
            const codigoOriginal = document.getElementById('keyProductoEdicionOriginal').value;
            const btnGuardar = document.getElementById('btnGuardarProducto');

            const datosProducto = {
                nombre: document.getElementById('prodNombre').value.trim(),
                categoria: categoriaSeleccionada,
                precio: parseFloat(document.getElementById('prodPrecio').value).toFixed(2),
                stock: parseInt(document.getElementById('prodStock').value)
            };

            btnGuardar.disabled = true;

            if (!codigoOriginal) {
                // Nuevo producto
                refInv.child(codigoIngresado).once('value', (snap) => {
                    if (snap.exists()) {
                        mostrarAlertaAlmacen(`El código <strong>${codigoIngresado}</strong> ya existe en el inventario.`, "danger");
                        btnGuardar.disabled = false;
                    } else {
                        refInv.child(codigoIngresado).set(datosProducto)
                            .then(() => {
                                mostrarAlertaAlmacen(`Producto <strong>${datosProducto.nombre}</strong> guardado con éxito.`);
                                formProducto.reset();
                                cerrarModalProducto();
                            })
                            .finally(() => { btnGuardar.disabled = false; });
                    }
                });
            } else {
                // Editando producto
                if (codigoOriginal !== codigoIngresado) {
                    refInv.child(codigoIngresado).once('value', (snap) => {
                        if (snap.exists()) {
                            mostrarAlertaAlmacen(`El nuevo código <strong>${codigoIngresado}</strong> ya está ocupado.`, "danger");
                            btnGuardar.disabled = false;
                        } else {
                            refInv.child(codigoOriginal).remove().then(() => {
                                refInv.child(codigoIngresado).set(datosProducto)
                                    .then(() => {
                                        mostrarAlertaAlmacen(`Producto actualizado correctamente.`, "success");
                                        formProducto.reset();
                                        cerrarModalProducto();
                                    })
                                    .finally(() => { btnGuardar.disabled = false; });
                            });
                        }
                    });
                } else {
                    refInv.child(codigoIngresado).update(datosProducto)
                        .then(() => {
                            mostrarAlertaAlmacen(`Producto actualizado correctamente.`, "success");
                            formProducto.reset();
                            cerrarModalProducto();
                        })
                        .finally(() => { btnGuardar.disabled = false; });
                }
            }
        });
    }

    if (formCategoria) {
        formCategoria.addEventListener('submit', function (e) {
            e.preventDefault();
            const inputCat = document.getElementById('catNombre');
            const indexEdicion = parseInt(document.getElementById('indexCategoriaEdicion').value);
            const nombreCat = inputCat.value.trim();

            if (!nombreCat) return;

            if (indexEdicion === -1) {
                if (categoriasAlmacen.includes(nombreCat)) {
                    mostrarAlertaAlmacen("La categoría ya existe.", "danger");
                    return;
                }
                categoriasAlmacen.push(nombreCat);
                mostrarAlertaAlmacen(`Categoría <strong>${nombreCat}</strong> agregada.`);
            } else {
                categoriasAlmacen[indexEdicion] = nombreCat;
                mostrarAlertaAlmacen(`Categoría actualizada con éxito.`);
                limpiarFormularioCategoria();
            }

            persistirCategorias();
            inputCat.value = "";
            renderizarListaCategoriasUI();
            actualizarSelectorCategorias();
        });
    }

    if (formSeguridad) {
        formSeguridad.addEventListener('submit', function (e) {
            e.preventDefault();
            const passField = document.getElementById('passSeguridadInventario');

            if (passField.value === PASSWORD_SEGURIDAD) {
                cerrarModalSeguridad();
                passField.value = "";

                if (accionPendienteSeguridad) {
                    const { tipo, key } = accionPendienteSeguridad;
                    accionPendienteSeguridad = null;

                    if (tipo === 'editar') ejecutarEdicionProducto(key);
                    else if (tipo === 'eliminar') ejecutarEliminacionProducto(key);
                }
            } else {
                mostrarAlertaAlmacen("Contraseña de seguridad incorrecta.", "danger");
                passField.value = "";
                cerrarModalSeguridad();
            }
        });
    }
}

function filtrarTablaInventario() {
    const termino = document.getElementById('buscarProducto').value.toLowerCase().trim();
    const catFiltro = document.getElementById('filtroCategoria').value;
    const filas = document.querySelectorAll('#cuerpoTablaInventario tr:not(#sinResultadosInventario)');
    const filaVacia = document.getElementById('sinResultadosInventario');
    let cont = 0;

    filas.forEach(fila => {
        const codigo = fila.querySelector('.codigo-producto').innerText.toLowerCase();
        const nombre = fila.querySelector('.nombre-producto').innerText.toLowerCase();
        const categoria = fila.querySelector('.categoria-producto').innerText;

        const coincideTexto = codigo.includes(termino) || nombre.includes(termino);
        const coincideCat = !catFiltro || categoria === catFiltro;

        if (coincideTexto && coincideCat) {
            fila.classList.remove('d-none');
            cont++;
        } else {
            fila.classList.add('d-none');
        }
    });

    if (filaVacia) {
        if (cont === 0) filaVacia.classList.remove('d-none');
        else filaVacia.classList.add('d-none');
    }
}

window.prepararFormularioProductoNuevo = function () {
    const form = document.getElementById('formFichaProducto');
    if (form) form.reset();

    actualizarSelectorCategorias();

    const inputCodigo = document.getElementById('prodCodigo');
    if (inputCodigo) {
        inputCodigo.value = "";
        inputCodigo.removeAttribute('readonly');
    }

    document.getElementById('keyProductoEdicionOriginal').value = "";
    document.getElementById('tituloModalProducto').innerHTML = `<i class="bi bi-box-seam text-primary me-2"></i>Registrar Nuevo Producto`;
    document.getElementById('btnGuardarProducto').className = "btn btn-primary py-2 fw-semibold";
    document.getElementById('btnGuardarProducto').innerHTML = `<i class="bi bi-check-lg me-1"></i>Guardar Producto`;

    abrirModalPorId('modalProductoForm');
};

window.solicitarAutorizacionSeguridad = function (tipo, key) {
    accionPendienteSeguridad = { tipo, key };
    document.getElementById('passSeguridadInventario').value = "";
    abrirModalPorId('modalSeguridadInventario');
};

function ejecutarEdicionProducto(codigo) {
    const prod = productosAlmacen[codigo];
    if (!prod) return;

    actualizarSelectorCategorias();

    const inputCodigo = document.getElementById('prodCodigo');
    if (inputCodigo) {
        inputCodigo.value = codigo;
        inputCodigo.removeAttribute('readonly'); // Permitir modificar código si se desea o mantenerlo
    }

    document.getElementById('keyProductoEdicionOriginal').value = codigo;
    document.getElementById('prodNombre').value = prod.nombre;
    document.getElementById('prodCategoria').value = prod.categoria;
    document.getElementById('prodPrecio').value = prod.precio;
    document.getElementById('prodStock').value = prod.stock;

    document.getElementById('tituloModalProducto').innerHTML = `<i class="bi bi-pencil-square text-success me-2"></i>Modificar Producto`;
    document.getElementById('btnGuardarProducto').className = "btn btn-success py-2 fw-semibold";
    document.getElementById('btnGuardarProducto').innerHTML = `<i class="bi bi-save me-1"></i>Guardar Cambios`;

    abrirModalPorId('modalProductoForm');
}

function ejecutarEliminacionProducto(codigo) {
    const refInv = obtenerReferenciaInventario();
    const prod = productosAlmacen[codigo];
    if (!refInv || !prod) return;

    refInv.child(codigo).remove()
        .then(() => {
            mostrarAlertaAlmacen(`Producto <strong>"${prod.nombre}"</strong> eliminado del almacén.`, "danger");
        })
        .catch((error) => {
            console.error("Error eliminando producto:", error);
            mostrarAlertaAlmacen("No se pudo eliminar el producto.", "danger");
        });
}

window.prepararEdicionCategoria = function (index) {
    document.getElementById('catNombre').value = categoriasAlmacen[index];
    document.getElementById('indexCategoriaEdicion').value = index;
    document.getElementById('lblFormCategoria').innerText = "Modificar Nombre de Categoría";
    document.getElementById('iconoBtnCat').className = "bi bi-check-lg";
    document.getElementById('btnCancelarEdicion').classList.remove('d-none');
    document.getElementById('catNombre').focus();
};

window.eliminarCategoria = function (index) {
    const catAEliminar = categoriasAlmacen[index];
    const tieneProductos = Object.values(productosAlmacen).some(p => p.categoria === catAEliminar);

    if (tieneProductos) {
        mostrarAlertaAlmacen(`No puedes eliminar la categoría <strong>"${catAEliminar}"</strong> porque tiene productos asociados.`, "danger");
        return;
    }

    categoriasAlmacen.splice(index, 1);
    persistirCategorias();
    mostrarAlertaAlmacen(`Categoría <strong>"${catAEliminar}"</strong> removida.`, "danger");
    limpiarFormularioCategoria();
    renderizarListaCategoriasUI();
    actualizarSelectorCategorias();
};

function limpiarFormularioCategoria() {
    const inputNombre = document.getElementById('catNombre');
    const inputIndex = document.getElementById('indexCategoriaEdicion');
    const lblForm = document.getElementById('lblFormCategoria');
    const iconoBtn = document.getElementById('iconoBtnCat');
    const btnCancelar = document.getElementById('btnCancelarEdicion');

    if (inputNombre) inputNombre.value = "";
    if (inputIndex) inputIndex.value = "-1";
    if (lblForm) lblForm.innerText = "Nueva Categoría";
    if (iconoBtn) iconoBtn.className = "bi bi-check-lg";
    if (btnCancelar) btnCancelar.classList.add('d-none');
}