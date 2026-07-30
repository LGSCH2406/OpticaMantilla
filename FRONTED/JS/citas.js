// ==========================================================================
// GESTIÓN DE CITAS Y AGENDA - ÓPTICA MANTILLA (Firebase Realtime Database)
// ==========================================================================

let citasAlmacen = {};
let clientesAlmacenCitas = {};
let accionSeguridadPendienteCitas = null; // { tipo: 'editar' | 'eliminar', key }
let cambioEstadoPendiente = null; // { key, nuevoEstado, estadoAnterior, selectEl }
const CLAVE_SEGURIDAD_CITAS = "24060102";

// Obtener referencia segura a Firebase para citas
function obtenerReferenciaCitas() {
    try {
        if (typeof db !== 'undefined' && db) {
            return db.ref('citas');
        }
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            return firebase.database().ref('citas');
        }
    } catch (e) {
        console.error("Error al inicializar la referencia de citas en Firebase:", e);
    }
    return null;
}

// Cargar Módulo de Citas en el Dashboard
function cargarModuloCitas() {
    const contenedor = document.getElementById('contenidoDinamico');
    if (!contenedor) return;

    if (typeof resaltarItemMenu === 'function') resaltarItemMenu('nav-citas');

    contenedor.innerHTML = `
        <div class="animate__animated animate__fadeIn position-relative">

            <!-- Contenedor para alertas flotantes -->
            <div id="contenedorAlertasCitas" class="position-fixed top-0 end-0 p-3" style="z-index: 1060; max-width: 350px;"></div>

            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="fw-bold text-primary mb-1"><i class="bi bi-calendar-check me-2"></i>Agenda y Citas Ópticas</h2>
                    <p class="text-muted mb-0 small">Administra las citas de optometría, exámenes visuales y entrega de armazones.</p>
                </div>
                <button type="button" class="btn btn-primary shadow-sm" onclick="abrirModalNuevaCita()">
                    <i class="bi bi-plus-lg me-1"></i> Nueva Cita
                </button>
            </div>

            <!-- Filtros rápidos de agenda -->
            <div class="row mb-4">
                <div class="col-md-4 mb-2">
                    <div class="input-group shadow-sm">
                        <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
                        <input type="text" id="buscadorCitas" class="form-control" placeholder="Buscar por paciente o DNI..." onkeyup="filtrarCitas()">
                    </div>
                </div>
                <div class="col-md-3 mb-2">
                    <select id="filtroEstadoCita" class="form-select shadow-sm" onchange="filtrarCitas()">
                        <option value="">Todos los estados</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Confirmada">Confirmada</option>
                        <option value="Completada">Completada</option>
                        <option value="Cancelada">Cancelada</option>
                    </select>
                </div>
                <div class="col-md-3 mb-2">
                    <input type="date" id="filtroFechaCita" class="form-control shadow-sm" onchange="filtrarCitas()">
                </div>
                <div class="col-md-2 mb-2">
                    <button class="btn btn-outline-secondary w-100 shadow-sm" onclick="limpiarFiltrosCitas()">
                        <i class="bi bi-arrow-counterclockwise me-1"></i> Limpiar
                    </button>
                </div>
            </div>

            <!-- Tabla de Citas -->
            <div class="card shadow-sm border-0">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light text-uppercase fs-7 text-muted">
                                <tr>
                                    <th class="ps-3">Fecha y Hora</th>
                                    <th>Paciente</th>
                                    <th>Motivo / Servicio</th>
                                    <th>Estado</th>
                                    <th>Notas</th>
                                    <th class="text-end pe-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tablaCitasBody">
                                <tr>
                                    <td colspan="6" class="text-center py-4 text-muted">Cargando agenda de citas...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Registrar / Editar Cita -->
        <div class="modal fade" id="modalNuevaCita" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title fw-bold" id="tituloModalCita"><i class="bi bi-calendar-plus me-2"></i>Agendar Nueva Cita</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="formCita" onsubmit="guardarCita(event)">
                            <input type="hidden" id="citaKeyId">

                            <!-- Buscador de Paciente por Nombre o DNI (reemplaza al select) -->
                            <div class="mb-3 position-relative">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <label for="buscadorClienteCita" class="form-label fw-bold small mb-0">Buscar Paciente <span class="text-danger">*</span></label>
                                    <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none small" onclick="redirigirRegistroCliente()">
                                        <i class="bi bi-person-plus-fill me-1"></i>¿No está registrado? Registrar nuevo
                                    </button>
                                </div>
                                <div class="input-group shadow-sm">
                                    <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
                                    <input type="text" class="form-control" id="buscadorClienteCita"
                                           placeholder="Escriba nombre o DNI del paciente..."
                                           autocomplete="off"
                                           onkeyup="buscarClienteCitaInput()"
                                           onfocus="buscarClienteCitaInput()">
                                    <button type="button" class="btn btn-outline-secondary" id="btnLimpiarClienteCita"
                                            onclick="limpiarClienteSeleccionadoCita()" title="Limpiar selección" style="display:none;">
                                        <i class="bi bi-x-lg"></i>
                                    </button>
                                </div>
                                <div id="listaResultadosClienteCita" class="list-group shadow-sm position-absolute w-100"
                                     style="z-index: 1070; max-height: 220px; overflow-y:auto; display:none;"></div>
                                <input type="hidden" id="citaClienteKey">
                                <input type="hidden" id="citaDniCliente">
                                <input type="hidden" id="citaNombrePaciente">
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="citaFecha" class="form-label fw-bold small">Fecha <span class="text-danger">*</span></label>
                                    <input type="date" class="form-control" id="citaFecha" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="citaHora" class="form-label fw-bold small">Hora <span class="text-danger">*</span></label>
                                    <input type="time" class="form-control" id="citaHora" required>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label for="citaMotivo" class="form-label fw-bold small">Motivo de la Cita <span class="text-danger">*</span></label>
                                <select class="form-select" id="citaMotivo" required>
                                    <option value="Examen Visual Completo (Optometría)">Examen Visual Completo (Optometría)</option>
                                    <option value="Adaptación de Lentes de Contacto">Adaptación de Lentes de Contacto</option>
                                    <option value="Entrega y Ajuste de Armazón">Entrega y Ajuste de Armazón</option>
                                    <option value="Control / Seguimiento">Control / Seguimiento</option>
                                </select>
                            </div>

                            <div class="mb-3">
                                <label for="citaEstado" class="form-label fw-bold small">Estado Inicial</label>
                                <select class="form-select" id="citaEstado">
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="Confirmada">Confirmada</option>
                                    <option value="Completada">Completada</option>
                                    <option value="Cancelada">Cancelada</option>
                                </select>
                            </div>

                            <div class="mb-3">
                                <label for="citaNotas" class="form-label fw-bold small">Observaciones o Notas</label>
                                <textarea class="form-control" id="citaNotas" rows="2" placeholder="Detalles adicionales..."></textarea>
                            </div>

                            <div class="d-flex justify-content-end gap-2">
                                <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
                                <button type="submit" class="btn btn-primary px-4">Guardar Cita</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de Clave de Seguridad para Eliminar -->
        <div class="modal fade" id="modalSeguridadCitas" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header bg-danger text-white py-2">
                        <h6 class="modal-title fw-bold"><i class="bi bi-shield-lock me-1"></i> Seguridad</h6>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <p class="small text-muted mb-2">Ingrese la clave de seguridad para autorizar esta acción:</p>
                        <input type="password" id="inputClaveSeguridadCitas" class="form-control text-center mb-3" placeholder="••••••••" maxlength="8">
                        <button class="btn btn-danger w-100 btn-sm" onclick="verificarClaveSeguridadCitas()">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de Confirmación para Cambio de Estado (sin clave de seguridad) -->
        <div class="modal fade" id="modalConfirmarEstadoCita" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header bg-light py-2">
                        <h6 class="modal-title fw-bold mb-0"><i class="bi bi-arrow-repeat me-2"></i>Confirmar cambio de estado</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="small text-muted mb-0" id="textoConfirmarEstadoCita">¿Confirmar el cambio de estado?</p>
                    </div>
                    <div class="modal-footer border-0 pt-0">
                        <button type="button" class="btn btn-light btn-sm" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary btn-sm" onclick="confirmarCambioEstadoCita()">Sí, confirmar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    escucharCitasFirebase();
    cargarClientesEnSelectorCitas();
}

// Cierra la lista de resultados si se hace clic fuera del buscador
document.addEventListener('click', function(e) {
    const input = document.getElementById('buscadorClienteCita');
    const lista = document.getElementById('listaResultadosClienteCita');
    if (!input || !lista) return;
    if (!input.contains(e.target) && !lista.contains(e.target)) {
        lista.style.display = 'none';
    }
});

// Mostrar Alertas Flotantes en Citas
function mostrarAlertaCitas(mensaje, tipo = "success") {
    const contenedor = document.getElementById('contenedorAlertasCitas');
    if (!contenedor) return;

    const idAlerta = 'alerta_' + Date.now();
    const icono = tipo === 'success' ? 'bi-check-circle-fill' : (tipo === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill');

    const htmlAlerta = `
        <div id="${idAlerta}" class="alert alert-${tipo} alert-dismissible fade show shadow-sm small py-2 px-3 mb-2" role="alert">
            <i class="bi ${icono} me-2"></i>${mensaje}
            <button type="button" class="btn-close py-2" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    contenedor.insertAdjacentHTML('beforeend', htmlAlerta);

    setTimeout(() => {
        const elemento = document.getElementById(idAlerta);
        if (elemento) {
            let alertaBs = bootstrap.Alert.getOrCreateInstance(elemento);
            alertaBs.close();
        }
    }, 4000);
}

// Sincronizar citas en tiempo real con Firebase
function escucharCitasFirebase() {
    const ref = obtenerReferenciaCitas();
    if (!ref) return;

    ref.on('value', (snapshot) => {
        citasAlmacen = snapshot.val() || {};
        renderizarTablaCitas(citasAlmacen);
    }, (error) => {
        console.error("Error al escuchar citas:", error);
        mostrarAlertaCitas("Error al sincronizar las citas con la base de datos.", "danger");
    });
}

// Cargar clientes en memoria (ya no se listan en un <select>, solo se guardan para buscar)
function cargarClientesEnSelectorCitas() {
    const refClientes = typeof obtenerReferenciaClientes === 'function' ? obtenerReferenciaClientes() : null;
    if (!refClientes) return;

    refClientes.once('value').then(snapshot => {
        clientesAlmacenCitas = snapshot.val() || {};
    }).catch(err => {
        console.error("Error al cargar clientes para citas:", err);
    });
}

// Buscar coincidencias mientras el usuario escribe nombre o DNI
window.buscarClienteCitaInput = function() {
    const input = document.getElementById('buscadorClienteCita');
    const lista = document.getElementById('listaResultadosClienteCita');
    const texto = input.value.trim().toLowerCase();

    // Si ya había un paciente seleccionado y el texto no cambió, no reabrir la búsqueda
    if (document.getElementById('citaClienteKey').value && input.dataset.nombreSeleccionado === input.value) {
        lista.style.display = 'none';
        return;
    }

    // Si el usuario edita el texto después de haber seleccionado, se invalida la selección previa
    if (document.getElementById('citaClienteKey').value) {
        document.getElementById('citaClienteKey').value = '';
        document.getElementById('citaDniCliente').value = '';
        document.getElementById('citaNombrePaciente').value = '';
        document.getElementById('btnLimpiarClienteCita').style.display = 'none';
    }

    if (texto.length < 2) {
        lista.style.display = 'none';
        lista.innerHTML = '';
        return;
    }

    const coincidencias = Object.keys(clientesAlmacenCitas).filter(key => {
        const c = clientesAlmacenCitas[key];
        const nombre = (c.nombre || '').toLowerCase();
        const dni = key.toLowerCase(); // el DNI es la key del nodo, no una propiedad c.dni
        return nombre.includes(texto) || dni.includes(texto);
    }).slice(0, 8);

    if (coincidencias.length === 0) {
        lista.innerHTML = `<div class="list-group-item text-muted small">Sin resultados. Puede registrar un paciente nuevo.</div>`;
        lista.style.display = 'block';
        return;
    }

    let html = '';
    coincidencias.forEach(key => {
        const c = clientesAlmacenCitas[key];
        html += `
            <button type="button" class="list-group-item list-group-item-action py-2" onclick="seleccionarClienteBuscado('${key}')">
                <div class="fw-bold small">${c.nombre}</div>
                <div class="text-muted fs-7">DNI: ${key}</div>
            </button>
        `;
    });
    lista.innerHTML = html;
    lista.style.display = 'block';
};

// Seleccionar un cliente desde los resultados de búsqueda
window.seleccionarClienteBuscado = function(key) {
    const cliente = clientesAlmacenCitas[key];
    if (!cliente) return;

    document.getElementById('citaClienteKey').value = key;
    document.getElementById('citaDniCliente').value = key; // el DNI es la key del cliente
    document.getElementById('citaNombrePaciente').value = cliente.nombre || '';

    const input = document.getElementById('buscadorClienteCita');
    const textoMostrado = `${cliente.nombre} (DNI: ${key})`;
    input.value = textoMostrado;
    input.dataset.nombreSeleccionado = textoMostrado;

    document.getElementById('listaResultadosClienteCita').style.display = 'none';
    document.getElementById('btnLimpiarClienteCita').style.display = 'inline-block';
};

// Limpiar selección para volver a buscar
window.limpiarClienteSeleccionadoCita = function() {
    document.getElementById('citaClienteKey').value = '';
    document.getElementById('citaDniCliente').value = '';
    document.getElementById('citaNombrePaciente').value = '';

    const input = document.getElementById('buscadorClienteCita');
    input.value = '';
    input.dataset.nombreSeleccionado = '';

    document.getElementById('btnLimpiarClienteCita').style.display = 'none';
    document.getElementById('listaResultadosClienteCita').style.display = 'none';
    input.focus();
};

// Redirigir al módulo de clientes si el usuario desea registrar uno nuevo
window.redirigirRegistroCliente = function() {
    const modalEl = document.getElementById('modalNuevaCita');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();

    if (typeof cargarModuloClientes === 'function') {
        cargarModuloClientes();
        setTimeout(() => {
            if (typeof abrirModalNuevoCliente === 'function') {
                abrirModalNuevoCliente();
            }
        }, 300);
    } else {
        mostrarAlertaCitas("Diríjase al módulo de Clientes en el menú lateral para registrar uno nuevo.", "info");
    }
};

// Renderizar tabla de citas en la UI
function renderizarTablaCitas(citas) {
    const tbody = document.getElementById('tablaCitasBody');
    if (!tbody) return;

    const keys = Object.keys(citas);

    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No hay citas registradas en la agenda.</td></tr>`;
        return;
    }

    let html = '';
    keys.sort((a, b) => {
        const fechaA = `${citas[a].fecha} ${citas[a].hora || '00:00'}`;
        const fechaB = `${citas[b].fecha} ${citas[b].hora || '00:00'}`;
        return fechaA.localeCompare(fechaB);
    });

    keys.forEach(key => {
        const c = citas[key];

        let claseSelectEstado = 'text-secondary';
        if (c.estado === 'Confirmada') claseSelectEstado = 'text-info';
        if (c.estado === 'Completada') claseSelectEstado = 'text-success';
        if (c.estado === 'Cancelada') claseSelectEstado = 'text-danger';
        if (c.estado === 'Pendiente') claseSelectEstado = 'text-warning';

        html += `
            <tr>
                <td class="ps-3">
                    <div class="fw-bold text-dark small"><i class="bi bi-calendar-event me-1 text-primary"></i>${c.fecha}</div>
                    <div class="text-muted fs-7"><i class="bi bi-clock me-1"></i>${c.hora}</div>
                </td>
                <td>
                    <div class="fw-bold text-dark">${c.nombrePaciente || 'Sin nombre'}</div>
                    <div class="text-muted fs-7">DNI: <code>${c.dniCliente || 'No reg.'}</code></div>
                </td>
                <td><span class="badge bg-light text-dark border">${c.motivo}</span></td>
                <td>
                    <select class="form-select form-select-sm fw-semibold ${claseSelectEstado}" style="min-width: 130px;"
                            data-estado-anterior="${c.estado}"
                            onchange="solicitarCambioEstadoCita('${key}', this)">
                        <option value="Pendiente" ${c.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                        <option value="Confirmada" ${c.estado === 'Confirmada' ? 'selected' : ''}>Confirmada</option>
                        <option value="Completada" ${c.estado === 'Completada' ? 'selected' : ''}>Completada</option>
                        <option value="Cancelada" ${c.estado === 'Cancelada' ? 'selected' : ''}>Cancelada</option>
                    </select>
                </td>
                <td class="text-muted small text-truncate" style="max-width: 180px;" title="${c.notas || ''}">${c.notas || '<em>Sin notas</em>'}</td>
                <td class="text-end pe-3">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="solicitarEditarCita('${key}')" title="Editar Cita"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="solicitarEliminarCita('${key}')" title="Eliminar Cita"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Filtrar citas dinámicamente
window.filtrarCitas = function() {
    const texto = document.getElementById('buscadorCitas').value.toLowerCase();
    const estadoFiltro = document.getElementById('filtroEstadoCita').value;
    const fechaFiltro = document.getElementById('filtroFechaCita').value;

    let citasFiltradas = {};

    Object.keys(citasAlmacen).forEach(key => {
        const c = citasAlmacen[key];
        const matchTexto = (c.nombrePaciente && c.nombrePaciente.toLowerCase().includes(texto)) ||
                           (c.dniCliente && c.dniCliente.toLowerCase().includes(texto));
        const matchEstado = !estadoFiltro || c.estado === estadoFiltro;
        const matchFecha = !fechaFiltro || c.fecha === fechaFiltro;

        if (matchTexto && matchEstado && matchFecha) {
            citasFiltradas[key] = c;
        }
    });

    renderizarTablaCitas(citasFiltradas);
};

window.limpiarFiltrosCitas = function() {
    document.getElementById('buscadorCitas').value = '';
    document.getElementById('filtroEstadoCita').value = '';
    document.getElementById('filtroFechaCita').value = '';
    renderizarTablaCitas(citasAlmacen);
};

// Abrir modal limpio para nueva cita
window.abrirModalNuevaCita = function() {
    document.getElementById('formCita').reset();
    document.getElementById('citaKeyId').value = '';
    document.getElementById('citaClienteKey').value = '';
    document.getElementById('citaDniCliente').value = '';
    document.getElementById('citaNombrePaciente').value = '';
    document.getElementById('tituloModalCita').innerHTML = `<i class="bi bi-calendar-plus me-2"></i>Agendar Nueva Cita`;

    const buscador = document.getElementById('buscadorClienteCita');
    buscador.value = '';
    buscador.dataset.nombreSeleccionado = '';
    document.getElementById('btnLimpiarClienteCita').style.display = 'none';
    document.getElementById('listaResultadosClienteCita').style.display = 'none';

    // Refrescar lista de clientes en memoria por si se agregó uno recientemente
    cargarClientesEnSelectorCitas();

    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('citaFecha').value = hoy;

    const modalElement = document.getElementById('modalNuevaCita');
    if (modalElement) {
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.show();
    }
};

// Guardar o Actualizar Cita
window.guardarCita = function(event) {
    event.preventDefault();

    const key = document.getElementById('citaKeyId').value;
    const dniCliente = document.getElementById('citaDniCliente').value.trim();
    const nombrePaciente = document.getElementById('citaNombrePaciente').value.trim();
    const fecha = document.getElementById('citaFecha').value;
    const hora = document.getElementById('citaHora').value;
    const motivo = document.getElementById('citaMotivo').value;
    const estado = document.getElementById('citaEstado').value;
    const notas = document.getElementById('citaNotas').value.trim();

    if (!nombrePaciente) {
        mostrarAlertaCitas("Debe buscar y seleccionar un paciente válido de la lista.", "warning");
        return;
    }

    const nuevaCita = {
        dniCliente,
        nombrePaciente,
        fecha,
        hora,
        motivo,
        estado,
        notas,
        actualizadoEn: new Date().toISOString()
    };

    const ref = obtenerReferenciaCitas();
    if (!ref) return;

    if (key) {
        ref.child(key).update(nuevaCita).then(() => {
            mostrarAlertaCitas("Cita actualizada exitosamente.", "success");
            bootstrap.Modal.getInstance(document.getElementById('modalNuevaCita')).hide();
        }).catch(err => {
            mostrarAlertaCitas("Error al actualizar la cita.", "danger");
        });
    } else {
        nuevaCita.creadoEn = new Date().toISOString();
        ref.push(nuevaCita).then(() => {
            mostrarAlertaCitas("Cita agendada correctamente.", "success");
            bootstrap.Modal.getInstance(document.getElementById('modalNuevaCita')).hide();
        }).catch(err => {
            mostrarAlertaCitas("Error al registrar la cita.", "danger");
        });
    }
};

// Cargar datos en el modal para editar
// Pide la clave de seguridad antes de permitir editar una cita
window.solicitarEditarCita = function(key) {
    accionSeguridadPendienteCitas = { tipo: 'editar', key };
    document.getElementById('inputClaveSeguridadCitas').value = '';
    const modalSecEl = document.getElementById('modalSeguridadCitas');
    if (modalSecEl) {
        const modalSecInstance = bootstrap.Modal.getOrCreateInstance(modalSecEl);
        modalSecInstance.show();
    }
};

// Abre el modal de edición ya con la clave validada
function abrirModalEdicionCita(key) {
    const c = citasAlmacen[key];
    if (!c) return;

    document.getElementById('citaKeyId').value = key;
    document.getElementById('citaFecha').value = c.fecha || '';
    document.getElementById('citaHora').value = c.hora || '';
    document.getElementById('citaMotivo').value = c.motivo || '';
    document.getElementById('citaEstado').value = c.estado || 'Pendiente';
    document.getElementById('citaNotas').value = c.notas || '';
    document.getElementById('tituloModalCita').innerHTML = `<i class="bi bi-pencil-square me-2"></i>Modificar Cita`;

    document.getElementById('citaDniCliente').value = c.dniCliente || '';
    document.getElementById('citaNombrePaciente').value = c.nombrePaciente || '';

    const refClientes = typeof obtenerReferenciaClientes === 'function' ? obtenerReferenciaClientes() : null;

    const finalizarCargaCliente = () => {
        let matchKey = '';
        if (c.dniCliente && clientesAlmacenCitas[c.dniCliente]) {
            matchKey = c.dniCliente; // el DNI guardado en la cita es directamente la key del cliente
        }

        const buscador = document.getElementById('buscadorClienteCita');
        const textoMostrado = `${c.nombrePaciente || ''}${c.dniCliente ? ' (DNI: ' + c.dniCliente + ')' : ''}`;
        buscador.value = textoMostrado;
        buscador.dataset.nombreSeleccionado = textoMostrado;
        document.getElementById('citaClienteKey').value = matchKey;
        document.getElementById('btnLimpiarClienteCita').style.display = 'inline-block';
        document.getElementById('listaResultadosClienteCita').style.display = 'none';
    };

    if (refClientes) {
        refClientes.once('value').then(snapshot => {
            clientesAlmacenCitas = snapshot.val() || {};
            finalizarCargaCliente();
        }).catch(() => finalizarCargaCliente());
    } else {
        finalizarCargaCliente();
    }

    const modalElement = document.getElementById('modalNuevaCita');
    if (modalElement) {
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.show();
    }
};

// Autorización de Seguridad para Eliminar Cita
window.solicitarEliminarCita = function(key) {
    accionSeguridadPendienteCitas = { tipo: 'eliminar', key };
    document.getElementById('inputClaveSeguridadCitas').value = '';
    const modalSecEl = document.getElementById('modalSeguridadCitas');
    if (modalSecEl) {
        const modalSecInstance = bootstrap.Modal.getOrCreateInstance(modalSecEl);
        modalSecInstance.show();
    }
};

window.verificarClaveSeguridadCitas = function() {
    const claveIngresada = document.getElementById('inputClaveSeguridadCitas').value;

    if (claveIngresada === CLAVE_SEGURIDAD_CITAS) {
        const modalSecEl = document.getElementById('modalSeguridadCitas');
        const modalInstance = bootstrap.Modal.getInstance(modalSecEl);
        if (modalInstance) modalInstance.hide();

        if (accionSeguridadPendienteCitas) {
            const { tipo, key } = accionSeguridadPendienteCitas;
            accionSeguridadPendienteCitas = null;

            if (tipo === 'editar') {
                abrirModalEdicionCita(key);
            } else if (tipo === 'eliminar') {
                const ref = obtenerReferenciaCitas();
                ref.child(key).remove().then(() => {
                    mostrarAlertaCitas("Cita eliminada de la agenda.", "danger");
                }).catch(err => {
                    mostrarAlertaCitas("Error al eliminar la cita de Firebase.", "danger");
                });
            }
        }
    } else {
        mostrarAlertaCitas("Clave de seguridad incorrecta.", "danger");
        document.getElementById('inputClaveSeguridadCitas').value = '';
    }
};

// ==========================================================================
// CAMBIO DE ESTADO DE CITA (con confirmación Bootstrap, sin clave de seguridad)
// ==========================================================================

// Se dispara al cambiar el <select> de estado en la tabla; pide confirmación antes de guardar
window.solicitarCambioEstadoCita = function(key, selectEl) {
    const nuevoEstado = selectEl.value;
    const estadoAnterior = selectEl.dataset.estadoAnterior;

    if (nuevoEstado === estadoAnterior) return;

    const c = citasAlmacen[key];
    cambioEstadoPendiente = { key, nuevoEstado, estadoAnterior, selectEl };

    document.getElementById('textoConfirmarEstadoCita').innerHTML =
        `¿Confirmar el cambio de estado de la cita de <strong>${c ? c.nombrePaciente : 'este paciente'}</strong> a <strong>${nuevoEstado}</strong>?`;

    const modalEl = document.getElementById('modalConfirmarEstadoCita');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInstance.show();

    // Si el usuario cierra el modal sin confirmar (Cancelar, X, clic afuera), revertimos el select
    modalEl.addEventListener('hidden.bs.modal', revertirEstadoSiNoConfirmado, { once: true });
};

function revertirEstadoSiNoConfirmado() {
    if (cambioEstadoPendiente) {
        cambioEstadoPendiente.selectEl.value = cambioEstadoPendiente.estadoAnterior;
        cambioEstadoPendiente = null;
    }
}

// Se ejecuta al presionar "Sí, confirmar" en el modal
window.confirmarCambioEstadoCita = function() {
    if (!cambioEstadoPendiente) return;

    const { key, nuevoEstado, selectEl, estadoAnterior } = cambioEstadoPendiente;
    cambioEstadoPendiente = null; // se limpia antes de cerrar el modal para que el listener "hidden" no revierta el cambio

    const ref = obtenerReferenciaCitas();
    if (ref) {
        ref.child(key).update({
            estado: nuevoEstado,
            actualizadoEn: new Date().toISOString()
        }).then(() => {
            mostrarAlertaCitas("Estado de la cita actualizado correctamente.", "success");
        }).catch(err => {
            mostrarAlertaCitas("Error al actualizar el estado de la cita.", "danger");
            selectEl.value = estadoAnterior;
        });
    }

    const modalEl = document.getElementById('modalConfirmarEstadoCita');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
};