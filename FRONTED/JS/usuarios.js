// ==========================================================================
// GESTIÓN DE USUARIOS - ÓPTICA MANTILLA (Firebase Auth + Realtime Database)
// ==========================================================================

let usuariosAlmacen = {};
let rolesAlmacen = ['admin', 'ventas', 'optometra'];
let accionSeguridadPendienteUsuarios = null;
const CLAVE_SEGURIDAD_USUARIOS = "24060102";

const USUARIO_ADMIN_PRINCIPAL = "gus24060102@gmail.com";

function obtenerReferenciaUsuarios() {
    try {
        if (typeof db !== 'undefined' && db) {
            return db.ref('usuarios');
        }
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            return firebase.database().ref('usuarios');
        }
    } catch (e) {
        console.error("Error al inicializar la referencia de usuarios en Firebase:", e);
    }
    return null;
}

function obtenerAuth() {
    try {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            return firebase.auth();
        }
    } catch (e) {
        console.error("Error al obtener Firebase Auth:", e);
    }
    return null;
}

function persistirRoles() {
    localStorage.setItem('optica_roles_usuarios', JSON.stringify(rolesAlmacen));
}

function cargarRoles() {
    const rolesGuardados = localStorage.getItem('optica_roles_usuarios');
    if (rolesGuardados) {
        try {
            rolesAlmacen = JSON.parse(rolesGuardados);
        } catch (e) {
            rolesAlmacen = ['admin', 'ventas', 'optometra'];
        }
    }
}

// ==========================================================================
// MODAL DE CONFIRMACIÓN CON CLAVE DE SEGURIDAD
// ==========================================================================

function mostrarModalConfirmacionSeguridad(titulo, mensaje, callbackAceptar) {
    const modalHTML = `
        <div class="modal fade" id="modalConfirmacionSeguridad" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-warning py-3" style="border-radius: 12px 12px 0 0;">
                        <h5 class="modal-title fw-bold text-dark">
                            <i class="bi bi-shield-lock-fill me-2"></i>
                            ${titulo}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <p class="mb-3 text-dark">${mensaje}</p>
                        <div class="mb-2">a
                            <label class="form-label fw-semibold text-muted small">Ingrese la clave de seguridad:</label>
                            <input type="password" id="inputClaveSeguridadConfirmacion" class="form-control text-center bg-light fw-bold" placeholder="••••••••" maxlength="8" style="border-radius: 8px; letter-spacing: 0.2em;">
                            <div id="errorClaveSeguridad" class="text-danger small mt-1 d-none">Clave incorrecta. Intente nuevamente.</div>
                        </div>
                    </div>
                    <div class="modal-footer border-0 bg-light py-3" style="border-radius: 0 0 12px 12px;">
                        <button type="button" class="btn btn-light px-4 fw-semibold" data-bs-dismiss="modal" style="border-radius: 8px;">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-warning px-4 fw-semibold" id="btnConfirmarSeguridad" style="border-radius: 8px;">
                            <i class="bi bi-check-lg me-1"></i>Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const modalExistente = document.getElementById('modalConfirmacionSeguridad');
    if (modalExistente) {
        modalExistente.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalElement = document.getElementById('modalConfirmacionSeguridad');
    const modalInstance = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false
    });
    modalInstance.show();

    document.getElementById('btnConfirmarSeguridad').addEventListener('click', function() {
        const claveIngresada = document.getElementById('inputClaveSeguridadConfirmacion').value;
        const errorDiv = document.getElementById('errorClaveSeguridad');
        
        if (claveIngresada === CLAVE_SEGURIDAD_USUARIOS) {
            errorDiv.classList.add('d-none');
            modalInstance.hide();
            setTimeout(() => {
                modalElement.remove();
                if (typeof callbackAceptar === 'function') {
                    callbackAceptar();
                }
            }, 300);
        } else {
            errorDiv.classList.remove('d-none');
            document.getElementById('inputClaveSeguridadConfirmacion').value = '';
            document.getElementById('inputClaveSeguridadConfirmacion').focus();
        }
    });

    document.getElementById('inputClaveSeguridadConfirmacion').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('btnConfirmarSeguridad').click();
        }
    });

    modalElement.addEventListener('hidden.bs.modal', function() {
        setTimeout(() => {
            modalElement.remove();
        }, 300);
    });
}

// ==========================================================================
// FUNCIÓN PRINCIPAL - CARGAR MÓDULO DE USUARIOS
// ==========================================================================

function cargarModuloUsuarios() {
    const contenedor = document.getElementById('contenidoDinamico');
    if (!contenedor) return;

    if (typeof resaltarItemMenu === 'function') resaltarItemMenu('nav-usuarios');
    
    cargarRoles();

    contenedor.innerHTML = `
        <div class="animate__animated animate__fadeIn position-relative">

            <div id="contenedorAlertasUsuarios" class="position-fixed top-0 end-0 p-3" style="z-index: 1060; max-width: 350px;"></div>

            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="fw-bold mb-1 text-dark">Control de Usuarios</h2>
                    <p class="text-muted mb-0">Administración de credenciales, roles y accesos del personal al sistema.</p>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-secondary" onclick="abrirModalRoles()" style="border-radius: 8px;">
                        <i class="bi bi-tags-fill me-2"></i>Gestionar Roles
                    </button>
                    <button class="btn btn-primary" onclick="prepararFormularioUsuarioNuevo()" style="border-radius: 8px;">
                        <i class="bi bi-person-plus-fill me-2"></i>Agregar Nuevo Colaborador
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
                            <input type="text" id="buscarUsuario" class="form-control bg-light border-start-0 ps-1" placeholder="Buscar por nombre, correo o código..." style="border-radius: 0 8px 8px 0; box-shadow: none;" oninput="filtrarUsuarios()">
                        </div>
                    </div>
                    <div class="col-12 col-md-3 col-lg-2">
                        <select id="filtroRolUsuario" class="form-select bg-light" style="border-radius: 8px;" onchange="filtrarUsuarios()">
                            <option value="">Todos los roles</option>
                            ${rolesAlmacen.map(rol => `<option value="${rol}">${rol.charAt(0).toUpperCase() + rol.slice(1)}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm p-4 bg-white">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Usuario</th>
                                <th>Correo Electrónico</th>
                                <th>Código de Acceso</th>
                                <th>Rol del Sistema</th>
                                <th>Estado de Cuenta</th>
                                <th class="text-end">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="cuerpoTablaUsuarios">
                            <tr>
                                <td colspan="6" class="text-center text-muted py-4" id="cargandoUsuarios">
                                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                    Cargando usuarios...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- MODAL PARA REGISTRAR/EDITAR USUARIO -->
        <div class="modal fade" id="modalUsuarioForm" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-light py-3" style="border-radius: 12px 12px 0 0;">
                        <h5 class="modal-title fw-bold text-dark" id="tituloModalUsuario">
                            <i class="bi bi-person-plus text-primary me-2"></i>Registrar Nuevo Colaborador
                        </h5>
                        <button type="button" class="btn-close" onclick="cerrarModalUsuario()" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <form id="formFichaUsuario">
                            <input type="hidden" id="keyUsuarioEdicionOriginal" value="">

                            <div class="row mb-3">
                                <div class="col-md-6 col-12">
                                    <label class="form-label small fw-bold text-muted">Nombre Completo <span class="text-danger">*</span></label>
                                    <input type="text" id="usuNombre" class="form-control bg-light" placeholder="Ej. Juan Pérez" required style="border-radius: 8px;">
                                </div>
                                <div class="col-md-6 col-12">
                                    <label class="form-label small fw-bold text-muted">Correo Electrónico <span class="text-danger">*</span></label>
                                    <input type="email" id="usuEmail" class="form-control bg-light" placeholder="ejemplo@correo.com" required style="border-radius: 8px;">
                                    <div class="form-text text-muted small">El correo será usado para iniciar sesión en el sistema.</div>
                                </div>
                            </div>

                            <div class="row mb-3">
                                <div class="col-md-6 col-12">
                                    <label class="form-label small fw-bold text-muted">Código de Acceso <span class="text-danger">*</span></label>
                                    <input type="text" id="usuCodigo" class="form-control bg-light fw-bold text-uppercase" placeholder="MANTILLA-XXXXX" required style="border-radius: 8px; letter-spacing: 0.5px;">
                                    <div class="form-text text-muted small">Código interno para identificación rápida.</div>
                                </div>
                                <div class="col-md-6 col-12">
                                    <label class="form-label small fw-bold text-muted">Rol asignado <span class="text-danger">*</span></label>
                                    <select id="usuRol" class="form-select bg-light" required style="border-radius: 8px;">
                                        <option value="" selected disabled>Seleccione un rol...</option>
                                        ${rolesAlmacen.map(rol => `<option value="${rol}">${rol.charAt(0).toUpperCase() + rol.slice(1)}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="row mb-3" id="contenedorPasswordUsuario">
                                <div class="col-md-6 col-12">
                                    <label class="form-label small fw-bold text-muted">Contraseña <span class="text-danger">*</span></label>
                                    <div class="input-group">
                                        <input type="password" id="usuPassword" class="form-control bg-light" placeholder="••••••••" required style="border-radius: 8px 0 0 8px;">
                                        <button type="button" class="btn btn-outline-secondary" onclick="togglePasswordUsuario()" style="border-radius: 0 8px 8px 0;">
                                            <i id="usuEyeIcon" class="bi bi-eye"></i>
                                        </button>
                                    </div>
                                    <div class="form-text text-muted small">Mínimo 6 caracteres.</div>
                                </div>
                                <div class="col-md-6 col-12">
                                    <label class="form-label small fw-bold text-muted">Confirmar Contraseña <span class="text-danger">*</span></label>
                                    <input type="password" id="usuPasswordConfirm" class="form-control bg-light" placeholder="••••••••" required style="border-radius: 8px;">
                                </div>
                            </div>

                            <div class="d-grid gap-2 mt-4">
                                <button type="submit" class="btn btn-primary py-2 fw-semibold" id="btnGuardarUsuario" style="border-radius: 8px;">
                                    <i class="bi bi-check-lg me-1"></i>Registrar Usuario
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL GESTIÓN DE ROLES -->
        <div class="modal fade" id="modalRoles" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-light py-3" style="border-radius: 12px 12px 0 0;">
                        <h5 class="modal-title fw-bold text-dark">
                            <i class="bi bi-tags text-secondary me-2"></i>Administrar Roles
                        </h5>
                        <button type="button" class="btn-close" onclick="cerrarModalRoles()" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <form id="formRol" class="mb-3">
                            <input type="hidden" id="indexRolEdicion" value="-1">
                            <label class="form-label small fw-bold text-muted" id="lblFormRol">Nuevo Rol</label>
                            <div class="input-group">
                                <input type="text" id="rolNombre" class="form-control bg-light" placeholder="Ej. supervisor" required style="border-radius: 8px 0 0 8px;">
                                <button type="submit" class="btn btn-dark" id="btnSalvarRol" style="border-radius: 0 8px 8px 0;">
                                    <i class="bi bi-check-lg" id="iconoBtnRol"></i>
                                </button>
                                <button type="button" class="btn btn-outline-secondary d-none ms-1" id="btnCancelarEdicionRol" onclick="limpiarFormularioRol()" style="border-radius: 8px;">Cancelar</button>
                            </div>
                        </form>
                        <hr class="text-muted my-3">
                        <h6 class="small fw-bold text-muted mb-2">Roles Registrados:</h6>
                        <ul class="list-group list-group-flush border rounded overflow-hidden" id="listaRolesUI" style="max-height: 200px; overflow-y: auto;">
                        </ul>
                        <div class="form-text text-muted small mt-2">
                            <i class="bi bi-info-circle me-1"></i> Los roles se guardan localmente en tu navegador.
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL SEGURIDAD (para editar/eliminar usuarios) -->
        <div class="modal fade" id="modalSeguridadUsuarios" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
            <div class="modal-dialog modal-sm modal-dialog-centered">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-light py-2" style="border-radius: 12px 12px 0 0;">
                        <h6 class="modal-title fw-bold text-dark mb-0">
                            <i class="bi bi-shield-lock-fill text-danger me-2"></i>Confirmación Requerida
                        </h6>
                        <button type="button" class="btn-close" onclick="cerrarModalSeguridadUsuarios()" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-3 text-center">
                        <p class="small text-muted mb-3">Introduce la clave de autorización para continuar.</p>
                        <form id="formConfirmarSeguridadUsuarios">
                            <div class="mb-3">
                                <input type="password" id="passSeguridadUsuarios" class="form-control text-center bg-light fw-bold" placeholder="••••••••" required style="border-radius: 8px; letter-spacing: 0.2em;">
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

    inicializarLogicaUsuarios();
    escucharUsuariosEnTiempoReal();
    renderizarListaRolesUI();
}

// ==========================================================================
// FUNCIONES DE APERTURA Y CIERRE DE MODALES
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

window.cerrarModalUsuario = function() { cerrarModalPorId('modalUsuarioForm'); };
window.cerrarModalRoles = function() { cerrarModalPorId('modalRoles'); };
window.cerrarModalSeguridadUsuarios = function() { cerrarModalPorId('modalSeguridadUsuarios'); };
window.abrirModalRoles = function() {
    renderizarListaRolesUI();
    abrirModalPorId('modalRoles');
};

function togglePasswordUsuario() {
    const passInput = document.getElementById('usuPassword');
    const icon = document.getElementById('usuEyeIcon');
    if (passInput.type === 'password') {
        passInput.type = 'text';
        icon.className = 'bi bi-eye-slash';
    } else {
        passInput.type = 'password';
        icon.className = 'bi bi-eye';
    }
}

// ==========================================================================
// ALERTAS FLOTANTES
// ==========================================================================

function mostrarAlertaUsuarios(mensaje, tipo = "success") {
    const contenedor = document.getElementById('contenedorAlertasUsuarios');
    if (!contenedor) return;

    const idAlerta = 'alert-usu-' + Date.now();
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
// GESTIÓN DE ROLES
// ==========================================================================

function renderizarListaRolesUI() {
    const lista = document.getElementById('listaRolesUI');
    if (!lista) return;

    if (rolesAlmacen.length === 0) {
        lista.innerHTML = `<li class="list-group-item text-center text-muted small py-3">No hay roles registrados. Agrega uno arriba.</li>`;
        return;
    }

    let html = "";
    rolesAlmacen.forEach((rol, index) => {
        const tieneUsuarios = Object.values(usuariosAlmacen).some(u => u.rol === rol);

        html += `
            <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                <span class="fw-medium small">${rol.charAt(0).toUpperCase() + rol.slice(1)}</span>
                <div>
                    <button class="btn btn-sm text-primary p-0 me-2" onclick="prepararEdicionRol(${index})" title="Editar"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm text-danger p-0 ${tieneUsuarios ? 'opacity-50' : ''}" onclick="eliminarRol(${index})" ${tieneUsuarios ? 'disabled' : ''} title="${tieneUsuarios ? 'No se puede eliminar porque tiene usuarios asignados' : 'Eliminar'}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </li>
        `;
    });
    lista.innerHTML = html;
}

window.prepararEdicionRol = function(index) {
    document.getElementById('rolNombre').value = rolesAlmacen[index];
    document.getElementById('indexRolEdicion').value = index;
    document.getElementById('lblFormRol').innerText = "Modificar Nombre del Rol";
    document.getElementById('iconoBtnRol').className = "bi bi-check-lg";
    document.getElementById('btnCancelarEdicionRol').classList.remove('d-none');
    document.getElementById('rolNombre').focus();
};

window.eliminarRol = function(index) {
    const rolAEliminar = rolesAlmacen[index];
    
    const tieneUsuarios = Object.values(usuariosAlmacen).some(u => u.rol === rolAEliminar);
    if (tieneUsuarios) {
        mostrarAlertaUsuarios(`No puedes eliminar el rol <strong>"${rolAEliminar}"</strong> porque hay usuarios que lo tienen asignado.`, "danger");
        return;
    }

    mostrarModalConfirmacionSeguridad(
        'Eliminar Rol',
        `¿Estás seguro de eliminar el rol <strong>"${rolAEliminar}"</strong>? Esta acción no se puede deshacer.`,
        function() {
            rolesAlmacen.splice(index, 1);
            persistirRoles();
            mostrarAlertaUsuarios(`Rol <strong>"${rolAEliminar}"</strong> eliminado.`, "danger");
            limpiarFormularioRol();
            renderizarListaRolesUI();
            actualizarSelectoresRoles();
        }
    );
};

function limpiarFormularioRol() {
    document.getElementById('rolNombre').value = "";
    document.getElementById('indexRolEdicion').value = "-1";
    document.getElementById('lblFormRol').innerText = "Nuevo Rol";
    document.getElementById('iconoBtnRol').className = "bi bi-check-lg";
    document.getElementById('btnCancelarEdicionRol').classList.add('d-none');
}

function actualizarSelectoresRoles() {
    const filtro = document.getElementById('filtroRolUsuario');
    if (filtro) {
        const valorActual = filtro.value;
        filtro.innerHTML = `<option value="">Todos los roles</option>`;
        rolesAlmacen.forEach(rol => {
            filtro.innerHTML += `<option value="${rol}">${rol.charAt(0).toUpperCase() + rol.slice(1)}</option>`;
        });
        filtro.value = valorActual;
    }

    const selector = document.getElementById('usuRol');
    if (selector) {
        const valorActual = selector.value;
        selector.innerHTML = `<option value="" selected disabled>Seleccione un rol...</option>`;
        rolesAlmacen.forEach(rol => {
            selector.innerHTML += `<option value="${rol}">${rol.charAt(0).toUpperCase() + rol.slice(1)}</option>`;
        });
        selector.value = valorActual;
    }
}

// ==========================================================================
// SINCRONIZACIÓN EN TIEMPO REAL CON FIREBASE
// ==========================================================================

function escucharUsuariosEnTiempoReal() {
    const refUsuarios = obtenerReferenciaUsuarios();
    if (!refUsuarios) {
        const tbody = document.getElementById('cuerpoTablaUsuarios');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger py-4">
                        <i class="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
                        No se pudo conectar con Firebase.
                    </td>
                </tr>
            `;
        }
        return;
    }

    refUsuarios.on('value', (snapshot) => {
        usuariosAlmacen = snapshot.val() || {};
        actualizarTablaUsuarios();
    }, (error) => {
        console.error("Error leyendo usuarios:", error);
        mostrarAlertaUsuarios("Error al leer los datos de usuarios.", "danger");
    });
}

function actualizarTablaUsuarios() {
    const tbody = document.getElementById('cuerpoTablaUsuarios');
    if (!tbody) return;

    const entradas = Object.entries(usuariosAlmacen);
    
    if (entradas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="bi bi-people fs-3 d-block mb-2 text-danger"></i>
                    No hay usuarios registrados en el sistema.
                </td>
            </tr>
        `;
        return;
    }

    let htmlFilas = "";
    entradas.forEach(([uid, usuario]) => {
        const esAdminPrincipal = usuario.email === USUARIO_ADMIN_PRINCIPAL;
        const rolNombre = usuario.rol ? usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1) : 'Sin rol';
        const coloresRol = {
            'admin': 'bg-dark',
            'ventas': 'bg-primary',
            'optometra': 'bg-info'
        };
        const rolBadge = coloresRol[usuario.rol] || 'bg-secondary';
        const estadoBadge = usuario.activo !== false ? 'bg-success' : 'bg-danger';
        const estadoTexto = usuario.activo !== false ? 'Activo' : 'Inactivo';

        const badgeAdmin = esAdminPrincipal ? '<span class="badge bg-warning text-dark ms-1"><i class="bi bi-star-fill me-1"></i>Principal</span>' : '';

        htmlFilas += `
            <tr class="item-usuario-fila" data-uid="${uid}">
                <td>
                    <strong class="nombre-usuario">${usuario.nombre || 'Sin nombre'}</strong>
                    ${badgeAdmin}
                </td>
                <td><span class="email-usuario">${usuario.email || 'Sin correo'}</span></td>
                <td><code class="text-primary fw-bold codigo-usuario">${usuario.codigo || 'N/A'}</code></td>
                <td><span class="badge ${rolBadge} px-2.5 py-1.5 rol-usuario">${rolNombre}</span></td>
                <td><span class="badge ${estadoBadge} bg-opacity-10 text-${usuario.activo !== false ? 'success' : 'danger'} px-2 py-1"><i class="bi bi-circle-fill me-1 small"></i> ${estadoTexto}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="solicitarAutorizacionSeguridadUsuarios('editar', '${uid}')" title="Editar Usuario" style="border-radius: 6px;">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm ${usuario.activo !== false ? 'btn-outline-warning' : 'btn-outline-success'} me-1" onclick="solicitarAutorizacionSeguridadUsuarios('toggle', '${uid}')" title="${usuario.activo !== false ? 'Desactivar' : 'Activar'} Usuario" style="border-radius: 6px;">
                        <i class="bi ${usuario.activo !== false ? 'bi-pause-circle' : 'bi-play-circle'}"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="solicitarAutorizacionSeguridadUsuarios('eliminar', '${uid}')" title="${esAdminPrincipal ? 'No se puede eliminar al administrador principal' : 'Eliminar Usuario'}" style="border-radius: 6px;" ${esAdminPrincipal ? 'disabled' : ''}>
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = htmlFilas;
}

// ==========================================================================
// FILTRADO DE USUARIOS
// ==========================================================================

function filtrarUsuarios() {
    const termino = document.getElementById('buscarUsuario')?.value.toLowerCase().trim() || '';
    const rolFiltro = document.getElementById('filtroRolUsuario')?.value || '';
    const filas = document.querySelectorAll('#cuerpoTablaUsuarios tr.item-usuario-fila');
    let cont = 0;

    filas.forEach(fila => {
        const nombre = fila.querySelector('.nombre-usuario')?.innerText.toLowerCase() || '';
        const email = fila.querySelector('.email-usuario')?.innerText.toLowerCase() || '';
        const codigo = fila.querySelector('.codigo-usuario')?.innerText.toLowerCase() || '';
        const rol = fila.querySelector('.rol-usuario')?.innerText.toLowerCase() || '';

        const coincideTexto = nombre.includes(termino) || email.includes(termino) || codigo.includes(termino);
        const coincideRol = !rolFiltro || rol === rolFiltro;

        if (coincideTexto && coincideRol) {
            fila.classList.remove('d-none');
            cont++;
        } else {
            fila.classList.add('d-none');
        }
    });
}

// ==========================================================================
// LÓGICA DE FORMULARIOS
// ==========================================================================

function inicializarLogicaUsuarios() {
    const formUsuario = document.getElementById('formFichaUsuario');
    const formSeguridad = document.getElementById('formConfirmarSeguridadUsuarios');
    const formRol = document.getElementById('formRol');

    if (formUsuario) {
        formUsuario.addEventListener('submit', function (e) {
            e.preventDefault();
            guardarUsuario();
        });
    }

    if (formSeguridad) {
        formSeguridad.addEventListener('submit', function (e) {
            e.preventDefault();
            const passField = document.getElementById('passSeguridadUsuarios');

            if (passField.value === CLAVE_SEGURIDAD_USUARIOS) {
                cerrarModalSeguridadUsuarios();
                passField.value = "";

                if (accionSeguridadPendienteUsuarios) {
                    const { tipo, key } = accionSeguridadPendienteUsuarios;
                    accionSeguridadPendienteUsuarios = null;

                    if (tipo === 'editar') ejecutarEdicionUsuario(key);
                    else if (tipo === 'eliminar') ejecutarEliminacionUsuario(key);
                    else if (tipo === 'toggle') ejecutarToggleUsuario(key);
                }
            } else {
                mostrarAlertaUsuarios("Clave de seguridad incorrecta.", "danger");
                passField.value = "";
            }
        });
    }

    if (formRol) {
        formRol.addEventListener('submit', function (e) {
            e.preventDefault();
            const inputRol = document.getElementById('rolNombre');
            const indexEdicion = parseInt(document.getElementById('indexRolEdicion').value);
            const nombreRol = inputRol.value.trim().toLowerCase();

            if (!nombreRol) {
                mostrarAlertaUsuarios("Ingrese un nombre para el rol.", "warning");
                return;
            }

            if (indexEdicion === -1) {
                if (rolesAlmacen.includes(nombreRol)) {
                    mostrarAlertaUsuarios("El rol ya existe.", "danger");
                    return;
                }
                rolesAlmacen.push(nombreRol);
                mostrarAlertaUsuarios(`Rol <strong>${nombreRol}</strong> agregado.`, "success");
            } else {
                const rolAnterior = rolesAlmacen[indexEdicion];
                const tieneUsuarios = Object.values(usuariosAlmacen).some(u => u.rol === rolAnterior);
                if (tieneUsuarios && rolAnterior !== nombreRol) {
                    mostrarAlertaUsuarios(`No puedes cambiar el nombre del rol <strong>"${rolAnterior}"</strong> porque hay usuarios que lo tienen asignado.`, "danger");
                    return;
                }
                rolesAlmacen[indexEdicion] = nombreRol;
                mostrarAlertaUsuarios(`Rol actualizado con éxito.`, "success");
                limpiarFormularioRol();
            }

            persistirRoles();
            inputRol.value = "";
            renderizarListaRolesUI();
            actualizarSelectoresRoles();
        });
    }
}

// ==========================================================================
// GUARDAR USUARIO
// ==========================================================================

function guardarUsuario() {
    const refUsuarios = obtenerReferenciaUsuarios();
    const auth = obtenerAuth();
    
    if (!refUsuarios) {
        mostrarAlertaUsuarios("No se pudo conectar con Firebase Database.", "danger");
        return;
    }
    
    if (!auth) {
        mostrarAlertaUsuarios("No se pudo conectar con Firebase Authentication.", "danger");
        return;
    }

    const uidOriginal = document.getElementById('keyUsuarioEdicionOriginal').value;
    const nombre = document.getElementById('usuNombre').value.trim();
    const email = document.getElementById('usuEmail').value.trim();
    const codigo = document.getElementById('usuCodigo').value.trim().toUpperCase();
    const rol = document.getElementById('usuRol').value;
    const password = document.getElementById('usuPassword').value;
    const passwordConfirm = document.getElementById('usuPasswordConfirm').value;
    const btnGuardar = document.getElementById('btnGuardarUsuario');

    if (!nombre || !email || !codigo || !rol) {
        mostrarAlertaUsuarios("Todos los campos obligatorios deben ser completados.", "warning");
        return;
    }

    btnGuardar.disabled = true;

    const datosUsuario = {
        nombre: nombre,
        email: email,
        codigo: codigo,
        rol: rol,
        actualizadoEn: new Date().toISOString()
    };

    if (uidOriginal) {
        const usuarioExistente = usuariosAlmacen[uidOriginal];
        if (usuarioExistente && usuarioExistente.email === USUARIO_ADMIN_PRINCIPAL) {
            mostrarAlertaUsuarios("El administrador principal no puede ser modificado.", "warning");
            btnGuardar.disabled = false;
            return;
        }

        refUsuarios.child(uidOriginal).update(datosUsuario)
            .then(() => {
                mostrarAlertaUsuarios(`Usuario <strong>${nombre}</strong> actualizado exitosamente.`, "success");
                document.getElementById('formFichaUsuario').reset();
                cerrarModalUsuario();
            })
            .catch((error) => {
                console.error("Error al actualizar usuario:", error);
                mostrarAlertaUsuarios("Error al actualizar el usuario.", "danger");
            })
            .finally(() => { btnGuardar.disabled = false; });
    } else {
        if (!password || password.length < 6) {
            mostrarAlertaUsuarios("La contraseña debe tener al menos 6 caracteres.", "warning");
            btnGuardar.disabled = false;
            return;
        }
        if (password !== passwordConfirm) {
            mostrarAlertaUsuarios("Las contraseñas no coinciden.", "warning");
            btnGuardar.disabled = false;
            return;
        }

        const emailExiste = Object.values(usuariosAlmacen).some(u => u.email === email);
        if (emailExiste) {
            mostrarAlertaUsuarios("El correo electrónico ya está registrado.", "danger");
            btnGuardar.disabled = false;
            return;
        }

        const codigoExiste = Object.values(usuariosAlmacen).some(u => u.codigo === codigo);
        if (codigoExiste) {
            mostrarAlertaUsuarios("El código de acceso ya está en uso.", "danger");
            btnGuardar.disabled = false;
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const uid = userCredential.user.uid;
                datosUsuario.creadoEn = new Date().toISOString();
                datosUsuario.activo = true;
                datosUsuario.uid = uid;
                return refUsuarios.child(uid).set(datosUsuario);
            })
            .then(() => {
                mostrarAlertaUsuarios(
                    `<i class="bi bi-check-circle-fill me-2"></i> Usuario <strong>${nombre}</strong> registrado exitosamente.`,
                    "success"
                );
                document.getElementById('formFichaUsuario').reset();
                cerrarModalUsuario();
            })
            .catch((error) => {
                console.error("Error al registrar usuario:", error);
                let mensaje = "Error al registrar el usuario.";
                if (error.code === 'auth/email-already-in-use') {
                    mensaje = "El correo electrónico ya está registrado en Firebase Authentication.";
                } else if (error.code === 'auth/weak-password') {
                    mensaje = "La contraseña es demasiado débil. Usa al menos 6 caracteres.";
                } else if (error.code === 'auth/invalid-email') {
                    mensaje = "El formato del correo electrónico no es válido.";
                }
                mostrarAlertaUsuarios(mensaje, "danger");
            })
            .finally(() => { btnGuardar.disabled = false; });
    }
}

// ==========================================================================
// PREPARAR FORMULARIO PARA NUEVO USUARIO
// ==========================================================================

window.prepararFormularioUsuarioNuevo = function () {
    const form = document.getElementById('formFichaUsuario');
    if (form) form.reset();

    document.getElementById('keyUsuarioEdicionOriginal').value = "";
    document.getElementById('tituloModalUsuario').innerHTML = `<i class="bi bi-person-plus text-primary me-2"></i>Registrar Nuevo Colaborador`;
    document.getElementById('btnGuardarUsuario').className = "btn btn-primary py-2 fw-semibold";
    document.getElementById('btnGuardarUsuario').innerHTML = `<i class="bi bi-check-lg me-1"></i>Registrar Usuario`;
    
    document.getElementById('contenedorPasswordUsuario').style.display = 'flex';
    document.getElementById('usuPassword').required = true;
    document.getElementById('usuPasswordConfirm').required = true;

    const codigoInput = document.getElementById('usuCodigo');
    const contador = Object.keys(usuariosAlmacen).length + 1;
    codigoInput.value = `MANTILLA-${String(contador).padStart(3, '0')}`;

    actualizarSelectoresRoles();
    abrirModalPorId('modalUsuarioForm');
};

// ==========================================================================
// AUTORIZACIÓN DE SEGURIDAD PARA ACCIONES
// ==========================================================================

window.solicitarAutorizacionSeguridadUsuarios = function (tipo, key) {
    accionSeguridadPendienteUsuarios = { tipo, key };
    document.getElementById('passSeguridadUsuarios').value = "";
    abrirModalPorId('modalSeguridadUsuarios');
};

// ==========================================================================
// EJECUTAR EDICIÓN DE USUARIO
// ==========================================================================

function ejecutarEdicionUsuario(uid) {
    const usuario = usuariosAlmacen[uid];
    if (!usuario) return;

    if (usuario.email === USUARIO_ADMIN_PRINCIPAL) {
        mostrarAlertaUsuarios("El administrador principal no puede ser modificado.", "warning");
        return;
    }

    document.getElementById('keyUsuarioEdicionOriginal').value = uid;
    document.getElementById('usuNombre').value = usuario.nombre || '';
    document.getElementById('usuEmail').value = usuario.email || '';
    document.getElementById('usuCodigo').value = usuario.codigo || '';
    document.getElementById('usuRol').value = usuario.rol || '';
    
    document.getElementById('contenedorPasswordUsuario').style.display = 'none';
    document.getElementById('usuPassword').required = false;
    document.getElementById('usuPasswordConfirm').required = false;

    document.getElementById('tituloModalUsuario').innerHTML = `<i class="bi bi-pencil-square text-success me-2"></i>Modificar Usuario`;
    document.getElementById('btnGuardarUsuario').className = "btn btn-success py-2 fw-semibold";
    document.getElementById('btnGuardarUsuario').innerHTML = `<i class="bi bi-save me-1"></i>Guardar Cambios`;

    actualizarSelectoresRoles();
    abrirModalPorId('modalUsuarioForm');
};

// ==========================================================================
// EJECUTAR ELIMINACIÓN DE USUARIO
// ==========================================================================

function ejecutarEliminacionUsuario(uid) {
    const refUsuarios = obtenerReferenciaUsuarios();
    const usuario = usuariosAlmacen[uid];
    
    if (!refUsuarios || !usuario) return;

    if (usuario.email === USUARIO_ADMIN_PRINCIPAL) {
        mostrarAlertaUsuarios(
            '<i class="bi bi-shield-lock-fill me-2"></i> <strong>No se puede eliminar</strong> al administrador principal del sistema.',
            "danger"
        );
        return;
    }

    const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}');
    if (usuario.email === usuarioLogueado.email) {
        mostrarAlertaUsuarios("No puedes eliminar tu propio usuario.", "danger");
        return;
    }

    mostrarModalConfirmacionSeguridad(
        'Eliminar Usuario',
        `¿Estás seguro de eliminar al usuario <strong>"${usuario.nombre}"</strong> (${usuario.email})?<br><small class="text-muted">Esta acción eliminará el usuario de la base de datos.</small>`,
        function() {
            refUsuarios.child(uid).remove()
                .then(() => {
                    mostrarAlertaUsuarios(`Usuario <strong>"${usuario.nombre}"</strong> eliminado del sistema.`, "danger");
                })
                .catch((error) => {
                    console.error("Error al eliminar usuario:", error);
                    mostrarAlertaUsuarios("No se pudo eliminar el usuario.", "danger");
                });
        }
    );
}

// ==========================================================================
// EJECUTAR TOGGLE (ACTIVAR/DESACTIVAR) USUARIO
// ==========================================================================

function ejecutarToggleUsuario(uid) {
    const refUsuarios = obtenerReferenciaUsuarios();
    const usuario = usuariosAlmacen[uid];
    if (!refUsuarios || !usuario) return;

    if (usuario.email === USUARIO_ADMIN_PRINCIPAL) {
        mostrarAlertaUsuarios(
            '<i class="bi bi-shield-lock-fill me-2"></i> <strong>No se puede desactivar</strong> al administrador principal del sistema.',
            "danger"
        );
        return;
    }

    const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}');
    if (usuario.email === usuarioLogueado.email) {
        mostrarAlertaUsuarios("No puedes modificar tu propio estado.", "warning");
        return;
    }

    const nuevoEstado = usuario.activo === false ? true : false;
    const estadoTexto = nuevoEstado ? 'activado' : 'desactivado';
    const accion = nuevoEstado ? 'Activar' : 'Desactivar';

    mostrarModalConfirmacionSeguridad(
        `${accion} Usuario`,
        `¿Estás seguro de ${estadoTexto} al usuario <strong>"${usuario.nombre}"</strong> (${usuario.email})?`,
        function() {
            refUsuarios.child(uid).update({
                activo: nuevoEstado,
                actualizadoEn: new Date().toISOString()
            })
            .then(() => {
                mostrarAlertaUsuarios(`Usuario <strong>"${usuario.nombre}"</strong> ${estadoTexto} exitosamente.`, "success");
            })
            .catch((error) => {
                console.error("Error al cambiar estado del usuario:", error);
                mostrarAlertaUsuarios("No se pudo cambiar el estado del usuario.", "danger");
            });
        }
    );
}