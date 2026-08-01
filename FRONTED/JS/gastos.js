// ==========================================================================
// MÓDULO DE GASTOS - ÓPTICA MANTILLA (gastos.js)
// Solo visible y usable por administradores
// ==========================================================================

// Variable global para el listener de gastos
let gastosListener = null;

// ==========================================================================
// FUNCIÓN PRINCIPAL PARA CARGAR EL MÓDULO DE GASTOS
// ==========================================================================

function cargarModuloGastos() {
    const contenedor = document.getElementById('contenidoDinamico');
    if (!contenedor) return;

    // Verificar si el usuario es administrador
    const usuarioData = JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}');
    const esAdmin = usuarioData.rol === 'admin';

    if (!esAdmin) {
        contenedor.innerHTML = `
            <div class="animate__animated animate__fadeIn">
                <div class="alert alert-danger d-flex align-items-center" role="alert">
                    <i class="bi bi-shield-lock fs-3 me-3"></i>
                    <div>
                        <h5 class="alert-heading fw-bold mb-1">Acceso Denegado</h5>
                        <p class="mb-0">No tienes permisos para acceder al módulo de Gastos. Solo los administradores pueden ver esta sección.</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    if (typeof resaltarItemMenu === 'function') resaltarItemMenu('nav-gastos');

    contenedor.innerHTML = `
        <div class="animate__animated animate__fadeIn">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="fw-bold mb-1 text-dark">
                        <i class="bi bi-wallet2 text-danger me-2"></i>Registro de Gastos
                    </h2>
                    <p class="text-muted mb-0">Registra y controla los gastos del día.</p>
                </div>
                <button class="btn btn-outline-secondary btn-sm" onclick="cargarModuloGastos()">
                    <i class="bi bi-arrow-clockwise me-1"></i> Recargar Datos
                </button>
            </div>

            <!-- Resumen de Caja y Gastos -->
            <div class="row g-3 mb-4">
                <div class="col-md-4">
                    <div class="card border-0 shadow-sm p-3 bg-white border-start border-4 border-success">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">💰 Dinero en Caja</h6>
                                <h3 class="fw-bold mb-0 text-success" id="gastosMontoCaja">S/ 0.00</h3>
                            </div>
                            <div class="bg-success bg-opacity-10 p-3 rounded text-success">
                                <i class="bi bi-cash-stack fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 shadow-sm p-3 bg-white border-start border-4 border-danger">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">📊 Total Gastos Hoy</h6>
                                <h3 class="fw-bold mb-0 text-danger" id="gastosTotalHoy">S/ 0.00</h3>
                            </div>
                            <div class="bg-danger bg-opacity-10 p-3 rounded text-danger">
                                <i class="bi bi-arrow-down-circle fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 shadow-sm p-3 bg-white border-start border-4 border-info">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">📋 Total Gastos</h6>
                                <h3 class="fw-bold mb-0 text-info" id="gastosContador">0</h3>
                            </div>
                            <div class="bg-info bg-opacity-10 p-3 rounded text-info">
                                <i class="bi bi-list-ul fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Formulario de Registro de Gasto -->
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white py-3 border-0">
                    <h5 class="fw-bold mb-0 text-dark">
                        <i class="bi bi-plus-circle me-2 text-danger"></i>Registrar Nuevo Gasto
                    </h5>
                </div>
                <div class="card-body">
                    <form id="formRegistroGasto">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label for="gastoDescripcion" class="form-label fw-bold small text-muted">
                                    <i class="bi bi-pencil-square me-1"></i>Descripción del Gasto
                                </label>
                                <input type="text" class="form-control" id="gastoDescripcion" 
                                       placeholder="Ej: Compra de insumos, servicio de limpieza..." required>
                            </div>
                            <div class="col-md-4">
                                <label for="gastoMonto" class="form-label fw-bold small text-muted">
                                    <i class="bi bi-currency-dollar me-1"></i>Monto (S/)
                                </label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light fw-bold">S/</span>
                                    <input type="number" class="form-control" id="gastoMonto" 
                                           placeholder="0.00" step="0.01" min="0.01" required>
                                </div>
                            </div>
                            <div class="col-md-2 d-flex align-items-end">
                                <button type="submit" class="btn btn-danger w-100 fw-bold" id="btnRegistrarGasto">
                                    <i class="bi bi-check-lg me-1"></i> Registrar Gasto
                                </button>
                            </div>
                        </div>
                        <div id="gastoErrorContainer" class="mt-3"></div>
                    </form>
                </div>
            </div>

            <!-- Tabla de Gastos del Día -->
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center">
                    <h5 class="fw-bold mb-0 text-dark">
                        <i class="bi bi-clock-history me-2 text-danger"></i>Gastos del Día
                    </h5>
                    <span class="badge bg-danger rounded-pill" id="contadorGastosTabla">0</span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead class="bg-light">
                                <tr>
                                    <th class="border-0 py-3 px-4">#</th>
                                    <th class="border-0 py-3">Descripción</th>
                                    <th class="border-0 py-3 text-end">Monto</th>
                                    <th class="border-0 py-3 text-center">Fecha</th>
                                    <th class="border-0 py-3 text-center">Registrado por</th>
                                    <th class="border-0 py-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tablaGastosBody">
                                <tr>
                                    <td colspan="6" class="text-center text-muted py-4">
                                        <i class="bi bi-inbox fs-2 d-block mb-2"></i>
                                        No hay gastos registrados hoy
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inicializar el módulo de gastos
    inicializarGastos();
}

// ==========================================================================
// INICIALIZACIÓN DEL MÓDULO DE GASTOS
// ==========================================================================

function inicializarGastos() {
    // Cargar datos de caja en tiempo real
    actualizarCajaParaGastos();

    // Cargar lista de gastos
    cargarListaGastos();

    // Configurar el formulario de registro
    const form = document.getElementById('formRegistroGasto');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            registrarGasto();
        });
    }

    // Limpiar mensajes de error al escribir
    const descripcionInput = document.getElementById('gastoDescripcion');
    const montoInput = document.getElementById('gastoMonto');
    
    if (descripcionInput) {
        descripcionInput.addEventListener('input', function() {
            limpiarErroresGasto();
        });
    }
    if (montoInput) {
        montoInput.addEventListener('input', function() {
            limpiarErroresGasto();
        });
    }
}

// ==========================================================================
// ACTUALIZAR CAJA PARA GASTOS
// ==========================================================================

function actualizarCajaParaGastos() {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const cajaRef = firebase.database().ref('cajas/' + fechaHoy);
    
    // Remover listener anterior
    if (cajaListener) {
        cajaRef.off('value', cajaListener);
    }

    cajaListener = cajaRef.on('value', (snapshot) => {
        const montoCajaEl = document.getElementById('gastosMontoCaja');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const totalEfectivo = data.totalEfectivo || 0;
            const totalYape = data.totalYape || 0;
            const totalTransferencia = data.totalTransferencia || 0;
            const totalTarjeta = data.totalTarjeta || 0;
            const totalGeneral = totalEfectivo + totalYape + totalTransferencia + totalTarjeta;
            
            if (montoCajaEl) {
                montoCajaEl.innerText = 'S/ ' + totalGeneral.toFixed(2);
            }
            
            // Guardar el monto en un atributo para validaciones
            const form = document.getElementById('formRegistroGasto');
            if (form) {
                form.dataset.montoCaja = totalGeneral;
            }
        } else {
            if (montoCajaEl) {
                montoCajaEl.innerText = 'S/ 0.00';
            }
            const form = document.getElementById('formRegistroGasto');
            if (form) {
                form.dataset.montoCaja = '0';
            }
        }
    }, (error) => {
        console.error('❌ Error al escuchar caja para gastos:', error);
    });
}

// ==========================================================================
// CARGAR LISTA DE GASTOS
// ==========================================================================

function cargarListaGastos() {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const gastosRef = firebase.database().ref('gastos/' + fechaHoy);
    
    // Remover listener anterior
    if (gastosListener) {
        gastosRef.off('value', gastosListener);
    }

    gastosListener = gastosRef.on('value', (snapshot) => {
        const tbody = document.getElementById('tablaGastosBody');
        const totalHoyEl = document.getElementById('gastosTotalHoy');
        const contadorEl = document.getElementById('gastosContador');
        const contadorTablaEl = document.getElementById('contadorGastosTabla');
        
        if (!tbody) return;

        if (!snapshot.exists()) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="bi bi-inbox fs-2 d-block mb-2"></i>
                        No hay gastos registrados hoy
                    </td>
                </tr>
            `;
            if (totalHoyEl) totalHoyEl.innerText = 'S/ 0.00';
            if (contadorEl) contadorEl.innerText = '0';
            if (contadorTablaEl) contadorTablaEl.innerText = '0';
            return;
        }

        const gastos = snapshot.val();
        const gastosArray = Object.entries(gastos).map(([key, value]) => ({
            id: key,
            ...value
        }));

        // Ordenar por fecha de registro (más reciente primero)
        gastosArray.sort((a, b) => {
            return (b.fechaRegistro || 0) - (a.fechaRegistro || 0);
        });

        // Calcular total de gastos
        let totalGastos = 0;
        let html = '';
        
        gastosArray.forEach((gasto, index) => {
            const monto = parseFloat(gasto.monto) || 0;
            totalGastos += monto;
            
            const fecha = gasto.fecha ? new Date(gasto.fecha) : new Date();
            const fechaStr = fecha.toLocaleDateString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            html += `
                <tr>
                    <td class="py-3 px-4 fw-bold text-muted">${index + 1}</td>
                    <td class="py-3">
                        <span class="fw-bold">${gasto.descripcion || 'Sin descripción'}</span>
                    </td>
                    <td class="py-3 text-end fw-bold text-danger">S/ ${monto.toFixed(2)}</td>
                    <td class="py-3 text-center text-muted small">${fechaStr}</td>
                    <td class="py-3 text-center">
                        <span class="badge bg-secondary">${gasto.registradoPor || 'Sistema'}</span>
                    </td>
                    <td class="py-3 text-center">
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarGasto('${gasto.id}')" title="Eliminar gasto">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        
        if (totalHoyEl) totalHoyEl.innerText = 'S/ ' + totalGastos.toFixed(2);
        if (contadorEl) contadorEl.innerText = gastosArray.length;
        if (contadorTablaEl) contadorTablaEl.innerText = gastosArray.length;

        // Actualizar el color del total de gastos según el monto
        if (totalHoyEl) {
            const montoCaja = parseFloat(document.getElementById('formRegistroGasto')?.dataset?.montoCaja || 0);
            if (totalGastos > montoCaja) {
                totalHoyEl.className = 'fw-bold mb-0 text-danger';
            } else if (totalGastos > 0) {
                totalHoyEl.className = 'fw-bold mb-0 text-warning';
            } else {
                totalHoyEl.className = 'fw-bold mb-0 text-danger';
            }
        }

    }, (error) => {
        console.error('❌ Error al cargar gastos:', error);
    });
}

// ==========================================================================
// REGISTRAR NUEVO GASTO
// ==========================================================================

function registrarGasto() {
    const descripcionInput = document.getElementById('gastoDescripcion');
    const montoInput = document.getElementById('gastoMonto');
    const errorContainer = document.getElementById('gastoErrorContainer');
    const btnRegistrar = document.getElementById('btnRegistrarGasto');
    
    // Limpiar errores anteriores
    limpiarErroresGasto();

    // Validar descripción
    const descripcion = descripcionInput.value.trim();
    if (!descripcion) {
        mostrarErrorGasto('⚠️ Por favor, ingrese una descripción del gasto.', descripcionInput);
        return;
    }

    // Validar monto
    const monto = parseFloat(montoInput.value);
    if (!monto || monto <= 0) {
        mostrarErrorGasto('⚠️ Por favor, ingrese un monto válido mayor a 0.', montoInput);
        return;
    }

    // Validar que el monto no sea mayor al dinero en caja
    const montoCaja = parseFloat(document.getElementById('formRegistroGasto')?.dataset?.montoCaja || 0);
    if (monto > montoCaja) {
        mostrarErrorGasto(
            `❌ El monto del gasto (S/ ${monto.toFixed(2)}) no puede ser mayor al dinero disponible en caja (S/ ${montoCaja.toFixed(2)}).`,
            montoInput
        );
        return;
    }

    // Deshabilitar botón
    btnRegistrar.disabled = true;
    btnRegistrar.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Registrando...
    `;

    // Obtener datos del usuario
    const usuarioData = JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}');
    const nombreUsuario = usuarioData.nombre || 'Usuario';
    const emailUsuario = usuarioData.email || '';

    // Preparar datos del gasto
    const fechaHoy = new Date().toISOString().split('T')[0];
    const gastoData = {
        descripcion: descripcion,
        monto: monto,
        fecha: new Date().toISOString(),
        fechaRegistro: firebase.database.ServerValue.TIMESTAMP,
        registradoPor: nombreUsuario,
        emailUsuario: emailUsuario,
        timestamp: Date.now()
    };

    // Guardar en Firebase
    const gastosRef = firebase.database().ref('gastos/' + fechaHoy);
    const nuevoGastoRef = gastosRef.push();

    nuevoGastoRef.set(gastoData)
        .then(() => {
            console.log('✅ Gasto registrado exitosamente');
            
            // Restaurar botón
            btnRegistrar.disabled = false;
            btnRegistrar.innerHTML = '<i class="bi bi-check-lg me-1"></i> Registrar Gasto';
            
            // Limpiar formulario
            descripcionInput.value = '';
            montoInput.value = '';
            
            // Mostrar mensaje de éxito con Bootstrap
            mostrarExitoGasto('✅ Gasto registrado exitosamente. Se ha descontado S/ ' + monto.toFixed(2) + ' de la caja.');
            
            // Actualizar caja (restar el gasto del dinero en caja)
            actualizarCajaConGasto(monto);
            
        })
        .catch((error) => {
            console.error('❌ Error al registrar gasto:', error);
            mostrarErrorGasto('❌ Error al registrar el gasto: ' + error.message, montoInput);
            btnRegistrar.disabled = false;
            btnRegistrar.innerHTML = '<i class="bi bi-check-lg me-1"></i> Registrar Gasto';
        });
}

// ==========================================================================
// ACTUALIZAR CAJA CON GASTO (RESTAR MONTO)
// ==========================================================================

function actualizarCajaConGasto(monto) {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const cajaRef = firebase.database().ref('cajas/' + fechaHoy);

    cajaRef.transaction((data) => {
        if (data === null) {
            return null;
        }
        
        // Restar el gasto del total de efectivo (por defecto)
        data.totalEfectivo = (data.totalEfectivo || 0) - monto;
        
        // Si el totalEfectivo queda negativo, ajustarlo a 0
        if (data.totalEfectivo < 0) {
            data.totalEfectivo = 0;
        }
        
        return data;
    }).then((result) => {
        console.log('✅ Caja actualizada con gasto. Nuevo totalEfectivo:', result.snapshot.val()?.totalEfectivo);
    }).catch((error) => {
        console.error('❌ Error al actualizar caja con gasto:', error);
    });
}

// ==========================================================================
// ELIMINAR GASTO
// ==========================================================================

function eliminarGasto(gastoId) {
    if (!gastoId) return;

    // Confirmar eliminación con modal de Bootstrap
    if (!confirm('¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer.')) {
        return;
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    const gastoRef = firebase.database().ref('gastos/' + fechaHoy + '/' + gastoId);

    // Obtener el monto del gasto antes de eliminarlo
    gastoRef.once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) {
                throw new Error('El gasto no existe');
            }
            const gasto = snapshot.val();
            const monto = parseFloat(gasto.monto) || 0;

            // Eliminar el gasto
            return gastoRef.remove().then(() => {
                // Devolver el monto a la caja
                return { monto };
            });
        })
        .then((resultado) => {
            console.log('✅ Gasto eliminado exitosamente');
            
            // Devolver el monto a la caja
            devolverGastoACaja(resultado.monto);
            
            // Mostrar mensaje de éxito
            mostrarExitoGasto('✅ Gasto eliminado. Se ha devuelto S/ ' + resultado.monto.toFixed(2) + ' a la caja.');
        })
        .catch((error) => {
            console.error('❌ Error al eliminar gasto:', error);
            mostrarErrorGasto('❌ Error al eliminar el gasto: ' + error.message);
        });
}

// ==========================================================================
// DEVOLVER GASTO A CAJA
// ==========================================================================

function devolverGastoACaja(monto) {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const cajaRef = firebase.database().ref('cajas/' + fechaHoy);

    cajaRef.transaction((data) => {
        if (data === null) {
            return null;
        }
        
        // Sumar el monto devuelto al total de efectivo
        data.totalEfectivo = (data.totalEfectivo || 0) + monto;
        
        return data;
    }).then((result) => {
        console.log('✅ Caja actualizada con devolución de gasto. Nuevo totalEfectivo:', result.snapshot.val()?.totalEfectivo);
    }).catch((error) => {
        console.error('❌ Error al devolver gasto a caja:', error);
    });
}

// ==========================================================================
// FUNCIONES DE UTILERÍA PARA ERRORES Y MENSAJES
// ==========================================================================

function mostrarErrorGasto(mensaje, inputFoco = null) {
    const container = document.getElementById('gastoErrorContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show d-flex align-items-center" role="alert">
            <i class="bi bi-exclamation-circle fs-4 me-3"></i>
            <div>
                <span>${mensaje}</span>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
        </div>
    `;

    if (inputFoco) {
        inputFoco.classList.add('is-invalid');
        setTimeout(() => {
            inputFoco.focus();
        }, 100);
    }

    // Auto-cerrar después de 8 segundos
    setTimeout(() => {
        const alert = container.querySelector('.alert');
        if (alert) {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            bsAlert.close();
        }
    }, 8000);
}

function mostrarExitoGasto(mensaje) {
    const container = document.getElementById('gastoErrorContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show d-flex align-items-center" role="alert">
            <i class="bi bi-check-circle fs-4 me-3"></i>
            <div>
                <span>${mensaje}</span>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
        </div>
    `;

    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
        const alert = container.querySelector('.alert');
        if (alert) {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            bsAlert.close();
        }
    }, 5000);
}

function limpiarErroresGasto() {
    const container = document.getElementById('gastoErrorContainer');
    if (container) {
        container.innerHTML = '';
    }
    
    const inputs = document.querySelectorAll('.is-invalid');
    inputs.forEach(input => {
        input.classList.remove('is-invalid');
    });
}

// ==========================================================================
// FUNCIÓN PARA VERIFICAR SI EL USUARIO ES ADMINISTRADOR
// ==========================================================================

function esAdministrador() {
    const usuarioData = JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}');
    return usuarioData.rol === 'admin';
}

console.log('✅ Módulo gastos.js cargado correctamente');