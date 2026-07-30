// ==========================================================================
// GESTIÓN DE CLIENTES - ÓPTICA MANTILLA (Firebase Realtime Database)
// ==========================================================================

let clientesAlmacen = {};
let accionSeguridadPendiente = null;
const CLAVE_SEGURIDAD = "24060102";

// Obtener la referencia de Firebase de forma segura comprobando instancias activas
function obtenerReferenciaClientes() {
    try {
        if (typeof db !== 'undefined' && db) {
            return db.ref('clientes');
        }
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            return firebase.database().ref('clientes');
        }
    } catch (e) {
        console.error("Error al inicializar la referencia de Firebase:", e);
    }
    return null;
}

function cargarModuloClientes() {
    const contenedor = document.getElementById('contenidoDinamico');
    if (!contenedor) return;

    if (typeof resaltarItemMenu === 'function') resaltarItemMenu('nav-clientes');

    contenedor.innerHTML = `
        <div class="animate__animated animate__fadeIn position-relative">

            <div id="contenedorAlertasClientes" class="position-fixed top-0 end-0 p-3" style="z-index: 1060; max-width: 350px;"></div>

            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="fw-bold mb-1 text-dark">Gestión de Clientes</h2>
                    <p class="text-muted mb-0">Fichas demográficas, preferencias de estilo e historial óptico del paciente.</p>
                </div>
                <div>
                    <button class="btn btn-primary" onclick="prepararFormularioClienteNuevo()" style="border-radius: 8px;">
                        <i class="bi bi-person-plus-fill me-2"></i>Agregar Cliente
                    </button>
                </div>
            </div>

            <div class="card border-0 shadow-sm p-3 mb-4 bg-white">
                <div class="row">
                    <div class="col-12 col-md-6 col-lg-4">
                        <div class="input-group">
                            <span class="input-group-text bg-light border-end-0 text-muted" style="border-radius: 8px 0 0 8px;">
                                <i class="bi bi-search"></i>
                            </span>
                            <input type="text" id="buscarCliente" class="form-control bg-light border-start-0 ps-1" placeholder="Buscar por DNI, nombre o teléfono..." style="border-radius: 0 8px 8px 0; box-shadow: none;">
                        </div>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm p-4 bg-white">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>DNI</th>
                                <th>Nombre Completo</th>
                                <th>Teléfono</th>
                                <th>Correo Electrónico</th>
                                <th>Ocupación</th>
                                <th>Último Examen</th>
                                <th class="text-end">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="cuerpoTablaClientes">
                            <tr>
                                <td colspan="7" class="text-center text-muted py-4" id="cargandoClientes">
                                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                    Cargando clientes...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="modal fade" id="modalClienteForm" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-light py-3" style="border-radius: 12px 12px 0 0;">
                        <h5 class="modal-title fw-bold text-dark" id="tituloModalCliente">
                            <i class="bi bi-person-bounding-box text-primary me-2"></i>Registrar Nuevo Cliente
                        </h5>
                        <button type="button" class="btn-close" onclick="cerrarModalCliente()" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <form id="formFichaCliente">
                            <input type="hidden" id="keyClienteEdicionOriginal" value="">

                            <div class="row mb-3">
                                <div class="col-md-4 col-12">
                                    <label class="form-label small fw-bold text-muted">DNI (Identificador)</label>
                                    <input type="text" id="cliDni" class="form-control bg-light" placeholder="Ej. 74185296" required maxlength="15" style="border-radius: 8px;">
                                </div>
                                <div class="col-md-8 col-12">
                                    <label class="form-label small fw-bold text-muted">Nombre Completo</label>
                                    <input type="text" id="cliNombre" class="form-control bg-light" placeholder="Ej. Juan Pérez Celis" required style="border-radius: 8px;">
                                </div>
                            </div>

                            <div class="row mb-3">
                                <div class="col-md-4 col-12">
                                    <label class="form-label small fw-bold text-muted">Edad</label>
                                    <input type="number" id="cliEdad" class="form-control bg-light" placeholder="Ej. 35" required style="border-radius: 8px;">
                                </div>
                                <div class="col-md-4 col-12">
                                    <label class="form-label small fw-bold text-muted">Teléfono de Contacto</label>
                                    <input type="tel" id="cliTelefono" class="form-control bg-light" placeholder="Ej. 999888777" required style="border-radius: 8px;">
                                </div>
                                <div class="col-md-4 col-12">
                                    <label class="form-label small fw-bold text-muted">Correo Electrónico</label>
                                    <input type="email" id="cliCorreo" class="form-control bg-light" placeholder="ejemplo@correo.com" required style="border-radius: 8px;">
                                </div>
                            </div>

                            <div class="row mb-3">
                                <div class="col-md-6 col-12">
                                    <label class="form-label small fw-bold text-muted">Ocupación / Profesión</label>
                                    <input type="text" id="cliOcupacion" class="form-control bg-light" placeholder="Ej. Conductor, Diseñador, Estudiante" required style="border-radius: 8px;">
                                </div>
                                <div class="col-md-6 col-12">
                                    <label class="form-label small fw-bold text-muted">Fecha Último Examen</label>
                                    <input type="date" id="cliUltimoExamen" class="form-control bg-light" style="border-radius: 8px;">
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">Historial Clínico y Antecedentes (Salud Visual)</label>
                                <textarea id="cliAntecedentes" class="form-control bg-light" rows="2" placeholder="Ej. Diabetes, cirugías previas, ojo seco, pasa 8 horas frente a PC..." style="border-radius: 8px; resize: none;"></textarea>
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">Preferencias de Compra y Estilo de Armazón</label>
                                <textarea id="cliPreferencias" class="form-control bg-light" rows="2" placeholder="Ej. Prefiere monturas de metal ligeras, marcas reconocidas, estilo deportivo..." style="border-radius: 8px; resize: none;"></textarea>
                            </div>

                            <div class="d-grid gap-2 mt-4">
                                <button type="submit" class="btn btn-primary py-2 fw-semibold" id="btnGuardarCliente" style="border-radius: 8px;">
                                    <i class="bi bi-check-lg me-1"></i>Guardar Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="modalFiltroSeguridad" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
            <div class="modal-dialog modal-sm modal-dialog-centered">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-light py-2" style="border-radius: 12px 12px 0 0;">
                        <h6 class="modal-title fw-bold text-dark mb-0">
                            <i class="bi bi-shield-lock-fill text-danger me-2"></i>Confirmación Requerida
                        </h6>
                        <button type="button" class="btn-close" onclick="cerrarModalSeguridad()" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-3 text-center">
                        <p class="small text-muted mb-3">Introduce la clave de autorización para continuar.</p>
                        <form id="formConfirmarSeguridad">
                            <div class="mb-3">
                                <input type="password" id="passSeguridad" class="form-control text-center bg-light fw-bold" placeholder="••••••••" required style="border-radius: 8px; letter-spacing: 0.2em;">
                            </div>
                            <button type="submit" class="btn btn-danger btn-sm w-100 fw-semibold py-2" style="border-radius: 8px;">
                                Validar y Continuar
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="modalHistorialPaciente" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-dark text-white py-3" style="border-radius: 12px 12px 0 0;">
                        <h5 class="modal-title fw-bold">
                            <i class="bi bi-folder-symlink-fill text-warning me-2"></i>Historial del Paciente
                        </h5>
                        <button type="button" class="btn-close btn-close-white" onclick="cerrarModalHistorial()" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4" id="contenidoHistorialPaciente"></div>
                </div>
            </div>
        </div>
    `;

    inicializarLogicaClientes();
    escucharClientesEnTiempoReal();
}

// ==========================================================================
// FUNCIONES DE APERTURA Y CIERRE NATIVO SEGURAS
// ==========================================================================

function abrirModalPorId(idModal) {
    const modalElement = document.getElementById(idModal);
    if (modalElement) {
        modalElement.classList.add('show');
        modalElement.style.display = 'block';
        modalElement.removeAttribute('aria-hidden');
        modalElement.setAttribute('aria-modal', 'true');
        modalElement.setAttribute('role', 'dialog');

        if (!document.querySelector('.modal-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
        }
        document.body.classList.add('modal-open');
    }
}

function cerrarModalPorId(idModal) {
    const modalElement = document.getElementById(idModal);
    if (modalElement) {
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.removeAttribute('aria-modal');
        modalElement.removeAttribute('role');
        
        document.querySelector('.modal-backdrop')?.remove();
        document.body.classList.remove('modal-open');
    }
}

window.cerrarModalCliente = function() { cerrarModalPorId('modalClienteForm'); };
window.cerrarModalSeguridad = function() { cerrarModalPorId('modalFiltroSeguridad'); };
window.cerrarModalHistorial = function() { cerrarModalPorId('modalHistorialPaciente'); };

// ==========================================================================
// LÓGICA DE CLIENTES Y EVENTOS
// ==========================================================================

function mostrarAlertaClientes(mensaje, tipo = "success") {
    const contenedor = document.getElementById('contenedorAlertasClientes');
    if (!contenedor) return;

    const idAlerta = 'alert-cli-' + Date.now();
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

function escucharClientesEnTiempoReal() {
    const refClientes = obtenerReferenciaClientes();
    if (!refClientes) {
        const tbody = document.getElementById('cuerpoTablaClientes');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger py-4">
                        <i class="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
                        No se pudo conectar con Firebase (Revisa conexion.js).
                    </td>
                </tr>
            `;
        }
        return;
    }

    refClientes.on('value', (snapshot) => {
        clientesAlmacen = snapshot.val() || {};
        actualizarTablaClientes();
    }, (error) => {
        console.error("Error leyendo clientes:", error);
        mostrarAlertaClientes("Error al leer los datos de clientes.", "danger");
    });
}

function actualizarTablaClientes() {
    const tbody = document.getElementById('cuerpoTablaClientes');
    if (!tbody) return;

    const entradas = Object.entries(clientesAlmacen);
    let htmlFilas = "";

    entradas.forEach(([dni, cli]) => {
        htmlFilas += `
            <tr class="item-cliente-fila">
                <td><code class="text-primary fw-bold dni-cliente">${dni}</code></td>
                <td><strong class="nombre-cliente">${cli.nombre}</strong> <span class="badge bg-light text-muted border ps-2 pe-2 py-1 small">${cli.edad} años</span></td>
                <td>${cli.telefono}</td>
                <td>${cli.correo}</td>
                <td><span class="text-secondary small fw-medium">${cli.ocupacion}</span></td>
                <td><code class="text-dark fw-semibold">${cli.ultimoExamen || 'Sin registrar'}</code></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="verHistorialPaciente('${dni}')" title="Ver Historial Clínico" style="border-radius: 6px;">
                        <i class="bi bi-file-earmark-medical-fill"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="solicitarAutorizacionSeguridad('editar', '${dni}')" title="Editar Ficha" style="border-radius: 6px;">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="solicitarAutorizacionSeguridad('eliminar', '${dni}')" title="Eliminar Registro" style="border-radius: 6px;">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    htmlFilas += `
        <tr id="sinResultadosClientes" class="${entradas.length ? 'd-none' : ''}">
            <td colspan="7" class="text-center text-muted py-4">
                <i class="bi bi-people fs-3 d-block mb-2 text-danger"></i>
                No se encontraron clientes registrados.
            </td>
        </tr>
    `;
    tbody.innerHTML = htmlFilas;
}

function inicializarLogicaClientes() {
    const formCliente = document.getElementById('formFichaCliente');
    const formSeguridad = document.getElementById('formConfirmarSeguridad');
    const contenidoDinamico = document.getElementById('contenidoDinamico');

    if (contenidoDinamico) {
        contenidoDinamico.addEventListener('input', function (e) {
            if (e.target && e.target.id === 'buscarCliente') {
                const termino = e.target.value.toLowerCase().trim();
                const filas = document.querySelectorAll('#cuerpoTablaClientes tr:not(#sinResultadosClientes)');
                const filaVacia = document.getElementById('sinResultadosClientes');
                let cont = 0;

                filas.forEach(fila => {
                    const nombreEl = fila.querySelector('.nombre-cliente');
                    const dniEl = fila.querySelector('.dni-cliente');
                    if (nombreEl && dniEl) {
                        const nombre = nombreEl.innerText.toLowerCase();
                        const dni = dniEl.innerText.toLowerCase();
                        if (nombre.includes(termino) || dni.includes(termino)) {
                            fila.classList.remove('d-none');
                            cont++;
                        } else {
                            fila.classList.add('d-none');
                        }
                    }
                });

                if (filaVacia) {
                    if (cont === 0) filaVacia.classList.remove('d-none');
                    else filaVacia.classList.add('d-none');
                }
            }
        });
    }

    if (formCliente) {
        formCliente.addEventListener('submit', function (e) {
            e.preventDefault();
            const refClientes = obtenerReferenciaClientes();
            if (!refClientes) return;

            const dniIngresado = document.getElementById('cliDni').value.trim();
            const dniOriginal = document.getElementById('keyClienteEdicionOriginal').value;
            const btnGuardar = document.getElementById('btnGuardarCliente');

            const datosCliente = {
                nombre: document.getElementById('cliNombre').value.trim(),
                edad: parseInt(document.getElementById('cliEdad').value),
                telefono: document.getElementById('cliTelefono').value.trim(),
                correo: document.getElementById('cliCorreo').value.trim(),
                ocupacion: document.getElementById('cliOcupacion').value.trim(),
                ultimoExamen: document.getElementById('cliUltimoExamen').value,
                antecedentes: document.getElementById('cliAntecedentes').value.trim(),
                preferencias: document.getElementById('cliPreferencias').value.trim()
            };

            btnGuardar.disabled = true;

            // Si es un registro nuevo (dniOriginal está vacío)
            if (!dniOriginal) {
                refClientes.child(dniIngresado).once('value', (snapshot) => {
                    if (snapshot.exists()) {
                        mostrarAlertaClientes(`El DNI <strong>${dniIngresado}</strong> ya se encuentra registrado.`, "danger");
                        btnGuardar.disabled = false;
                    } else {
                        refClientes.child(dniIngresado).set(datosCliente)
                            .then(() => {
                                mostrarAlertaClientes(`Cliente <strong>${datosCliente.nombre}</strong> guardado con éxito.`);
                                formCliente.reset();
                                cerrarModalCliente();
                            })
                            .catch((error) => {
                                console.error("Error al guardar cliente:", error);
                                mostrarAlertaClientes("No se pudo guardar el cliente.", "danger");
                            })
                            .finally(() => { btnGuardar.disabled = false; });
                    }
                });
            } else {
                // Si estamos editando y cambió el DNI, manejamos el cambio de nodo
                if (dniOriginal !== dniIngresado) {
                    refClientes.child(dniIngresado).once('value', (snapshot) => {
                        if (snapshot.exists()) {
                            mostrarAlertaClientes(`El nuevo DNI <strong>${dniIngresado}</strong> ya pertenece a otro cliente.`, "danger");
                            btnGuardar.disabled = false;
                        } else {
                            refClientes.child(dniOriginal).remove().then(() => {
                                refClientes.child(dniIngresado).set(datosCliente)
                                    .then(() => {
                                        mostrarAlertaClientes(`Ficha de <strong>${datosCliente.nombre}</strong> actualizada exitosamente.`, "success");
                                        formCliente.reset();
                                        cerrarModalCliente();
                                    })
                                    .finally(() => { btnGuardar.disabled = false; });
                            });
                        }
                    });
                } else {
                    // Actualización normal manteniendo el mismo DNI
                    refClientes.child(dniIngresado).update(datosCliente)
                        .then(() => {
                            mostrarAlertaClientes(`Ficha de <strong>${datosCliente.nombre}</strong> actualizada exitosamente.`, "success");
                            formCliente.reset();
                            cerrarModalCliente();
                        })
                        .catch((error) => {
                            console.error("Error al actualizar cliente:", error);
                            mostrarAlertaClientes("No se pudo actualizar el cliente.", "danger");
                        })
                        .finally(() => { btnGuardar.disabled = false; });
                }
            }
        });
    }

    if (formSeguridad) {
        formSeguridad.addEventListener('submit', function (e) {
            e.preventDefault();
            const passField = document.getElementById('passSeguridad');

            if (passField.value === CLAVE_SEGURIDAD) {
                cerrarModalSeguridad();
                passField.value = "";

                if (accionSeguridadPendiente) {
                    const { tipo, key } = accionSeguridadPendiente;
                    accionSeguridadPendiente = null;

                    if (tipo === 'editar') ejecutarEdicionCliente(key);
                    else if (tipo === 'eliminar') ejecutarEliminacionCliente(key);
                }
            } else {
                mostrarAlertaClientes("Contraseña de seguridad incorrecta.", "danger");
                passField.value = "";
                cerrarModalSeguridad();
            }
        });
    }
}

window.prepararFormularioClienteNuevo = function () {
    const form = document.getElementById('formFichaCliente');
    if (form) form.reset();

    const inputDni = document.getElementById('cliDni');
    if (inputDni) {
        inputDni.value = "";
        inputDni.removeAttribute('readonly'); // Permitir escribir el DNI nuevo
    }

    const inputKeyOriginal = document.getElementById('keyClienteEdicionOriginal');
    if (inputKeyOriginal) inputKeyOriginal.value = "";

    const tituloModal = document.getElementById('tituloModalCliente');
    if (tituloModal) {
        tituloModal.innerHTML = `<i class="bi bi-person-plus-fill text-primary me-2"></i>Registrar Nuevo Cliente`;
    }

    const btnGuardar = document.getElementById('btnGuardarCliente');
    if (btnGuardar) {
        btnGuardar.className = "btn btn-primary py-2 fw-semibold";
        btnGuardar.innerHTML = `<i class="bi bi-check-lg me-1"></i>Guardar Cliente`;
    }

    abrirModalPorId('modalClienteForm');
}; 

window.solicitarAutorizacionSeguridad = function (tipo, key) {
    accionSeguridadPendiente = { tipo, key };
    document.getElementById('passSeguridad').value = "";
    abrirModalPorId('modalFiltroSeguridad');
};

function ejecutarEdicionCliente(dni) {
    const cli = clientesAlmacen[dni];
    if (!cli) return;

    const inputDni = document.getElementById('cliDni');
    if (inputDni) {
        inputDni.value = dni;
        inputDni.setAttribute('readonly', true); // Bloqueamos el DNI principal en edición para mantener la integridad de la llave
    }

    document.getElementById('keyClienteEdicionOriginal').value = dni;
    document.getElementById('cliNombre').value = cli.nombre;
    document.getElementById('cliEdad').value = cli.edad;
    document.getElementById('cliTelefono').value = cli.telefono;
    document.getElementById('cliCorreo').value = cli.correo;
    document.getElementById('cliOcupacion').value = cli.ocupacion;
    document.getElementById('cliUltimoExamen').value = cli.ultimoExamen || "";
    document.getElementById('cliAntecedentes').value = cli.antecedentes || "";
    document.getElementById('cliPreferencias').value = cli.preferencias || "";

    document.getElementById('tituloModalCliente').innerHTML = `<i class="bi bi-pencil-square text-success me-2"></i>Modificar Ficha del Cliente`;
    document.getElementById('btnGuardarCliente').className = "btn btn-success py-2 fw-semibold";
    document.getElementById('btnGuardarCliente').innerHTML = `<i class="bi bi-save me-1"></i>Guardar Cambios`;

    abrirModalPorId('modalClienteForm');
}

function ejecutarEliminacionCliente(dni) {
    const refClientes = obtenerReferenciaClientes();
    const cliente = clientesAlmacen[dni];
    if (!refClientes || !cliente) return;

    refClientes.child(dni).remove()
        .then(() => {
            mostrarAlertaClientes(`Registro de <strong>"${cliente.nombre}"</strong> (DNI: ${dni}) eliminado permanentemente.`, "danger");
        })
        .catch((error) => {
            console.error("Error al eliminar cliente:", error);
            mostrarAlertaClientes("No se pudo eliminar el cliente.", "danger");
        });
}

window.verHistorialPaciente = function (dni) {
    const cli = clientesAlmacen[dni];
    const contenedor = document.getElementById('contenidoHistorialPaciente');
    if (!contenedor || !cli) return;

    contenedor.innerHTML = `
        <div class="mb-3">
            <h6 class="fw-bold text-dark border-bottom pb-1"><i class="bi bi-person-vcard text-secondary me-2"></i>Datos Generales</h6>
            <p class="mb-1 small"><strong>DNI:</strong> <code class="text-primary fw-bold">${dni}</code></p>
            <p class="mb-1 small"><strong>Paciente:</strong> ${cli.nombre}</p>
            <p class="mb-1 small"><strong>Ocupación:</strong> ${cli.ocupacion}</p>
            <p class="mb-1 small"><strong>Edad:</strong> ${cli.edad} años</p>
            <p class="mb-1 small"><strong>Última Evaluación:</strong> <span class="badge bg-light text-dark border">${cli.ultimoExamen || 'No registra'}</span></p>
        </div>

        <div class="mb-3 mt-4">
            <h6 class="fw-bold text-danger border-bottom pb-1"><i class="bi bi-heart-pulse-fill me-2"></i>Historial Médico y Antecedentes</h6>
            <p class="text-muted small p-2 bg-light border-start border-danger border-3" style="border-radius: 0 4px 4px 0;">
                ${cli.antecedentes || '<em>Sin antecedentes patológicos o clínicos registrados.</em>'}
            </p>
        </div>

        <div class="mb-2 mt-4">
            <h6 class="fw-bold text-primary border-bottom pb-1"><i class="bi bi-eyeglasses me-2"></i>Preferencias de Estilo y Compra</h6>
            <p class="text-muted small p-2 bg-light border-start border-primary border-3" style="border-radius: 0 4px 4px 0;">
                ${cli.preferencias || '<em>Sin preferencias de armazón o filtros guardadas.</em>'}
            </p>
        </div>
    `;

    abrirModalPorId('modalHistorialPaciente');
};