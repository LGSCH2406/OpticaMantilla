/**
 * PROYECTO ÓPTICA MANTILLA - MÓDULO DE VENTAS Y DEVOLUCIONES / CAMBIOS
 * Actualizado: Incorporación del apartado de cambios (sin devoluciones de dinero, solo cambio por producto del mismo precio o pagando la diferencia, renovación de stock y registro como venta).
 * Conectado a Firebase Realtime Database.
 */

// Variables globales para la sesión de venta actual
let carritoVentaActual = [];
let productoSeleccionadoId = null;
let ventasAlmacen = {};
let vistaActualVentas = 'pos';

// Banderas para no duplicar listeners de Firebase
let sincronizacionVentasInventarioActiva = false;
let sincronizacionVentasClientesActiva = false;

const CLAVE_SEGURIDAD_VENTAS = "24060102";

// Variables para edición, eliminación y cambios con modales de Bootstrap
let ventaEnEdicion = null;
let idVentaEnEdicion = null;
let ventaAEditarId = null;
let ventaAEliminarId = null;

// Variables específicas para el flujo de Cambio / Devolución
let ventaACambioId = null;
let productoDevueltoCambioId = null;
let productoNuevoCambioId = null;

/**
 * Obtener referencia segura a Firebase para el nodo de ventas
 */
function obtenerReferenciaVentas() {
    try {
        if (typeof db !== 'undefined' && db) {
            return db.ref('ventas');
        }
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            return firebase.database().ref('ventas');
        }
    } catch (e) {
        console.error("Error al inicializar la referencia de ventas en Firebase:", e);
    }
    return null;
}

/**
 * Obtener referencia a la raíz de Firebase
 */
function obtenerReferenciaRaizFirebase() {
    try {
        if (typeof db !== 'undefined' && db) {
            return db.ref();
        }
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            return firebase.database().ref();
        }
    } catch (e) {
        console.error("Error al obtener referencia raíz de Firebase:", e);
    }
    return null;
}

/**
 * Función auxiliar para obtener la key del método de pago
 */
function obtenerKeyMetodoPago(metodo) {
    if (metodo === 'Efectivo') return 'efectivo';
    else if (metodo === 'Yape/Plin') return 'yape';
    else if (metodo === 'Transferencia') return 'transferencia';
    else if (metodo === 'Tarjeta de Crédito/Débito') return 'tarjeta';
    else return 'efectivo';
}

/**
 * CARGAR INTERFAZ DEL MÓDULO DE VENTAS (POS, HISTORIAL Y CAMBIOS)
 */
function cargarModuloVentas() {
    const contenedor = document.getElementById('contenidoDinamico');
    if (!contenedor) return;

    if (typeof resaltarItemMenu === 'function') resaltarItemMenu('nav-ventas');

    contenedor.innerHTML = `
        <div class="animate__animated animate__fadeIn">
            <div class="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div>
                    <h2 class="fw-bold mb-1 text-dark">Módulo de Ventas y Cambios</h2>
                    <p class="text-muted mb-0">Registra ventas, consulta el historial y gestiona cambios de productos.</p>
                </div>
                <div class="btn-group" role="group">
                    <button type="button" class="btn btn-primary active fw-bold" id="btnVistaPOS" onclick="cambiarVistaVentas('pos')">
                        <i class="bi bi-cart-plus me-1"></i> POS
                    </button>
                    <button type="button" class="btn btn-outline-secondary fw-bold" id="btnVistaHistorial" onclick="cambiarVistaVentas('historial')">
                        <i class="bi bi-clock-history me-1"></i> Historial
                    </button>
                    <button type="button" class="btn btn-outline-warning fw-bold text-dark" id="btnVistaCambios" onclick="cambiarVistaVentas('cambios')">
                        <i class="bi bi-arrow-repeat me-1"></i> Cambios
                    </button>
                </div>
            </div>

            <!-- ================================================== -->
            <!-- SECCIÓN 1: POS (Punto de Venta)                     -->
            <!-- ================================================== -->
            <div id="seccionVentasPOS">
                <div class="row g-4">
                    <div class="col-12 col-lg-8">
                        <div class="card border-0 shadow-sm p-4 bg-white mb-4" style="border-radius: 12px;">
                            <h5 class="fw-bold text-dark mb-3"><i class="bi bi-cart-plus me-2 text-primary"></i>Añadir Productos</h5>
                            
                            <div class="row g-3 align-items-end">
                                <div class="col-12 col-md-7 position-relative">
                                    <label for="buscarProductoPOS" class="form-label fw-semibold text-secondary small">Seleccione o busque Producto</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-light text-muted"><i class="bi bi-search"></i></span>
                                        <input type="text" id="buscarProductoPOS" class="form-control" autocomplete="off"
                                               placeholder="Haga clic para abrir el buscador..." readonly
                                               onclick="abrirModalSeleccionProducto()">
                                        <button class="btn btn-outline-secondary bg-light text-muted border-start-0" type="button" onclick="abrirModalSeleccionProducto()">
                                            <i class="bi bi-list-ul small"></i>
                                        </button>
                                    </div>
                                </div>

                                <div class="col-6 col-md-2">
                                    <label for="ventaCantidadProducto" class="form-label fw-semibold text-secondary small">Cantidad</label>
                                    <input type="number" id="ventaCantidadProducto" class="form-control" value="1" min="1">
                                </div>

                                <div class="col-6 col-md-3">
                                    <button type="button" class="btn btn-primary w-100 fw-bold" onclick="agregarAlCarrito()">
                                        <i class="bi bi-plus-lg me-1"></i> Agregar
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="card border-0 shadow-sm p-4 bg-white" style="border-radius: 12px;">
                            <h5 class="fw-bold text-dark mb-3"><i class="bi bi-list-check me-2 text-primary"></i>Artículos en el Carrito</h5>
                            <div class="table-responsive">
                                <table class="table align-middle mb-0">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Código</th>
                                            <th>Descripción del Producto</th>
                                            <th class="text-center">Precio Unit.</th>
                                            <th class="text-center">Cant.</th>
                                            <th class="text-end">Subtotal</th>
                                            <th class="text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="listaCarritoVenta">
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-lg-4">
                        <div class="card border-0 shadow-sm p-4 bg-white sticky-lg-top" style="border-radius: 12px; top: 24px; z-index: 100;">
                            <h5 class="fw-bold text-dark mb-3"><i class="bi bi-file-earmark-text me-2 text-primary"></i>Orden de Trabajo</h5>
                            <div class="mb-4">
                                <label for="ventaNumeroOrden" class="form-label fw-semibold text-secondary small">Número de Orden</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light fw-bold text-muted">N° 00</span>
                                    <input type="number" id="ventaNumeroOrden" class="form-control fw-bold text-primary" placeholder="Ej: 15" min="1" oninput="validarNumeroOrdenUnico()">
                                </div>
                                <div id="feedbackOrden" class="form-text text-danger fw-medium d-none mt-1">
                                    <i class="bi bi-exclamation-triangle-fill me-1"></i> Este número de orden ya fue registrado. Por favor, ingrese otro.
                                </div>
                            </div>

                            <h5 class="fw-bold text-dark mb-3 border-top pt-3"><i class="bi bi-person-bounding-box me-2 text-primary"></i>Datos del Cliente</h5>
                            
                            <div class="mb-3">
                                <label for="ventaDniCliente" class="form-label fw-semibold text-secondary small">DNI / RUC</label>
                                <input type="text" id="ventaDniCliente" class="form-control" placeholder="Ingrese 8 o 11 dígitos" maxlength="11" oninput="buscarClientePorDniAuto()">
                                <div id="feedbackDni" class="form-text fw-medium mt-1"></div>
                                
                                <div id="contenedorRegistroClienteVenta" class="mt-2 d-none">
                                    <button type="button" class="btn btn-danger btn-sm w-100 fw-bold" onclick="abrirRegistroClienteDesdeVenta()">
                                        <i class="bi bi-person-plus-fill me-1"></i> El cliente no existe. Regístrelo aquí
                                    </button>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label for="ventaNombreCliente" class="form-label fw-semibold text-secondary small">Nombre / Razón Social</label>
                                <input type="text" id="ventaNombreCliente" class="form-control" placeholder="Nombres del cliente">
                            </div>

                            <div class="mb-3">
                                <label for="ventaTelefonoCliente" class="form-label fw-semibold text-secondary small">Teléfono (Opcional)</label>
                                <input type="text" id="ventaTelefonoCliente" class="form-control" placeholder="Ej: 987654321">
                            </div>

                            <div class="mb-3 mb-4">
                                <label for="ventaCorreoCliente" class="form-label fw-semibold text-secondary small">Correo (Opcional)</label>
                                <input type="email" id="ventaCorreoCliente" class="form-control" placeholder="cliente@correo.com">
                            </div>

                            <h5 class="fw-bold text-dark mb-3 border-top pt-3"><i class="bi bi-cash-coin me-2 text-primary"></i>Resumen de Cobro</h5>
                            
                            <div class="mb-3">
                                <label for="ventaMetodoPago" class="form-label fw-semibold text-secondary small">Método de Pago</label>
                                <select id="ventaMetodoPago" class="form-select">
                                    <option value="Efectivo" selected>Efectivo</option>
                                    <option value="Yape/Plin">Yape / Plin</option>
                                    <option value="Tarjeta de Crédito/Débito">Tarjeta de Crédito / Débito</option>
                                    <option value="Transferencia">Transferencia Bancaria</option>
                                </select>
                            </div>

                            <div class="mb-3 p-3 bg-light rounded border">
                                <div class="form-check form-switch mb-2">
                                    <input class="form-check-input" type="checkbox" id="switchAdelanto" onchange="alternarCamposAdelanto()">
                                    <label class="form-check-label fw-semibold text-dark small" for="switchAdelanto">¿Dejará Adelanto / Seña?</label>
                                </div>
                                
                                <div id="contenedorCamposAdelanto" class="d-none animate__animated animate__fadeIn animate__faster">
                                    <div class="mb-2">
                                        <label for="ventaMontoAdelanto" class="form-label fw-semibold text-secondary small">Monto del Adelanto</label>
                                        <div class="input-group input-group-sm">
                                            <span class="input-group-text">S/.</span>
                                            <input type="number" id="ventaMontoAdelanto" class="form-control" placeholder="0.00" min="0" step="0.1" oninput="recalcularConAdelanto()">
                                        </div>
                                    </div>
                                    <div class="row g-2">
                                        <div class="col-6">
                                            <label for="ventaFechaRecojo" class="form-label fw-semibold text-secondary small">Fecha Recojo</label>
                                            <input type="date" id="ventaFechaRecojo" class="form-control form-control-sm">
                                        </div>
                                        <div class="col-6">
                                            <label for="ventaHoraRecojo" class="form-label fw-semibold text-secondary small">Hora Recojo</label>
                                            <input type="time" id="ventaHoraRecojo" class="form-control form-control-sm">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-light p-3 rounded mb-4" style="border: 1px dashed #dee2e6;">
                                <div class="d-flex justify-content-between text-muted mb-1 small">
                                    <span>Subtotal Neto:</span>
                                    <span id="resumenSubtotal">S/. 0.00</span>
                                </div>
                                <div class="d-flex justify-content-between text-muted mb-2 small">
                                    <span>IGV (18% incluido):</span>
                                    <span id="resumenIgv">S/. 0.00</span>
                                </div>
                                <div class="d-flex justify-content-between align-items-center pt-2 border-top mb-1">
                                    <span class="fw-bold text-dark fs-5">TOTAL GENERAL:</span>
                                    <span id="resumenTotal" class="fw-bold text-dark fs-5">S/. 0.00</span>
                                </div>
                                <div id="filaResumenAdelanto" class="d-flex justify-content-between align-items-center text-success d-none small">
                                    <span>Monto Adelantado:</span>
                                    <span id="resumenMontoAdelanto" class="fw-semibold">S/. 0.00</span>
                                </div>
                                <div id="filaResumenSaldo" class="d-flex justify-content-between align-items-center pt-1 text-danger d-none fw-bold">
                                    <span>POR PAGAR AL RECOGER:</span>
                                    <span id="resumenSaldoPendiente">S/. 0.00</span>
                                </div>
                            </div>

                            <button type="button" id="btnConfirmarCobroVenta" class="btn btn-success btn-lg w-100 fw-bold shadow-sm py-3" onclick="procesarCobroVenta()">
                                <i class="bi bi-check-circle-fill me-2"></i> Confirmar y Cobrar Venta
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ================================================== -->
            <!-- SECCIÓN 2: HISTORIAL DE VENTAS                      -->
            <!-- ================================================== -->
            <div id="seccionVentasHistorial" class="d-none">
                <div class="card border-0 shadow-sm p-4 bg-white" style="border-radius: 12px;">
                    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                        <h5 class="fw-bold text-dark mb-0"><i class="bi bi-clock-history me-2 text-primary"></i>Todas las Ventas Registradas</h5>
                        
                        <div class="d-flex gap-2 flex-wrap">
                            <div class="input-group" style="max-width: 160px;">
                                <span class="input-group-text bg-light"><i class="bi bi-calendar2-week"></i></span>
                                <input type="date" id="filtroFechaInicio" class="form-control" onchange="filtrarHistorialVentas()">
                            </div>
                            <div class="input-group" style="max-width: 160px;">
                                <span class="input-group-text bg-light"><i class="bi bi-calendar2-week"></i></span>
                                <input type="date" id="filtroFechaFin" class="form-control" onchange="filtrarHistorialVentas()">
                            </div>
                            <div class="input-group" style="max-width: 230px;">
                                <span class="input-group-text bg-light"><i class="bi bi-search"></i></span>
                                <input type="text" id="buscadorHistorialVentas" class="form-control" placeholder="Buscar por orden, cliente..." oninput="filtrarHistorialVentas()">
                            </div>
                            <button class="btn btn-outline-secondary" onclick="limpiarFiltrosHistorial()"><i class="bi bi-arrow-counterclockwise"></i></button>
                        </div>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>N° Orden</th>
                                    <th>Cliente</th>
                                    <th class="text-center">Fecha</th>
                                    <th class="text-end">Total</th>
                                    <th class="text-center">Método Pago</th>
                                    <th class="text-center">Estado</th>
                                    <th class="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tablaHistorialVentas">
                                <tr id="cargandoHistorial">
                                    <td colspan="7" class="text-center text-muted py-4">
                                        <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                        Cargando historial de ventas...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ================================================== -->
            <!-- SECCIÓN 3: GESTIÓN DE CAMBIOS (NO DEVOLUCIONES $)   -->
            <!-- ================================================== -->
            <div id="seccionVentasCambios" class="d-none">
                <div class="card border-0 shadow-sm p-4 bg-white" style="border-radius: 12px;">
                    <div class="mb-4">
                        <h5 class="fw-bold text-dark mb-1"><i class="bi bi-arrow-repeat me-2 text-warning"></i>Apartado de Cambios de Productos</h5>
                        <p class="text-muted small mb-0">Nota importante: No se realizan devoluciones de dinero. El producto devuelto se reingresa al stock y se cambia por otro del mismo precio o pagando la diferencia.</p>
                    </div>

                    <div class="row g-3 mb-4">
                        <div class="col-12 col-md-6">
                            <label for="buscarVentaParaCambio" class="form-label fw-semibold text-secondary small">1. Buscar Venta por N° de Orden o Cliente</label>
                            <div class="input-group">
                                <span class="input-group-text bg-light"><i class="bi bi-search"></i></span>
                                <input type="text" id="buscarVentaParaCambio" class="form-control" placeholder="Ej: 0015 o Nombre del cliente..." oninput="filtrarVentasParaCambio()">
                            </div>
                        </div>
                    </div>

                    <div class="table-responsive mb-4" style="max-height: 250px; overflow-y: auto;">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light sticky-top" style="z-index: 1;">
                                <tr>
                                    <th>N° Orden</th>
                                    <th>Cliente</th>
                                    <th>Fecha Venta</th>
                                    <th class="text-end">Total</th>
                                    <th class="text-center">Seleccionar</th>
                                </tr>
                            </thead>
                            <tbody id="tablaSeleccionVentaCambio">
                                <tr>
                                    <td colspan="5" class="text-center text-muted py-3">Ingrese un criterio de búsqueda o seleccione una venta del historial.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- PANEL DE CONFIGURACIÓN DEL CAMBIO -->
                    <div id="panelConfiguracionCambio" class="card border bg-light p-4 d-none" style="border-radius: 12px;">
                        <h6 class="fw-bold text-dark mb-3"><i class="bi bi-sliders me-2 text-primary"></i>Detalle del Cambio para la Orden: <span id="lblOrdenCambioSeleccionada" class="text-primary"></span></h6>
                        
                        <div class="row g-4">
                            <!-- Producto que regresa (Devuelto) -->
                            <div class="col-12 col-md-6">
                                <div class="card p-3 border shadow-sm bg-white h-100" style="border-radius: 8px;">
                                    <h6 class="fw-bold text-danger mb-2"><i class="bi bi-box-arrow-in-left me-1"></i> Producto que Devuelve el Cliente</h6>
                                    <p class="text-muted small mb-3">Seleccione el producto específico de esta orden que el cliente desea cambiar:</p>
                                    <select id="selectProductoDevueltoCambio" class="form-select mb-3" onchange="actualizarInfoProductoDevuelto()">
                                    </select>
                                    <div class="bg-light p-2 rounded small text-muted">
                                        <div>Precio unitario original: <strong id="lblPrecioDevuelto">S/. 0.00</strong></div>
                                        <div>Cantidad a reingresar al stock: <strong id="lblCantidadDevuelta">1</strong></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Producto que se lleva (Nuevo) -->
                            <div class="col-12 col-md-6">
                                <div class="card p-3 border shadow-sm bg-white h-100" style="border-radius: 8px;">
                                    <h6 class="fw-bold text-success mb-2"><i class="bi bi-box-arrow-right me-1"></i> Producto Nuevo (por el que cambia)</h6>
                                    <p class="text-muted small mb-3">Seleccione del inventario el nuevo producto que se lleva:</p>
                                    
                                    <div class="input-group mb-3">
                                        <input type="text" id="inputProductoNuevoCambioBusqueda" class="form-control form-control-sm" placeholder="Buscar producto nuevo..." readonly onclick="abrirModalSeleccionProductoNuevoCambio()">
                                        <button class="btn btn-outline-secondary btn-sm" type="button" onclick="abrirModalSeleccionProductoNuevoCambio()">
                                            <i class="bi bi-search"></i> Buscar
                                        </button>
                                    </div>

                                    <div class="bg-light p-2 rounded small text-muted">
                                        <div>Producto seleccionado: <strong id="lblNombreProductoNuevo" class="text-dark">Ninguno</strong></div>
                                        <div>Precio del producto nuevo: <strong id="lblPrecioProductoNuevo" class="text-dark">S/. 0.00</strong></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- RESUMEN DE DIFERENCIA ECONÓMICA -->
                        <div class="card border-0 bg-white p-3 mt-4 shadow-sm" style="border-radius: 8px;">
                            <div class="row align-items-center">
                                <div class="col-12 col-md-7">
                                    <div class="small text-muted">Balance Económico del Cambio:</div>
                                    <div id="lblMensajeDiferencia" class="fw-bold fs-6 text-dark">Seleccione ambos productos para calcular la diferencia.</div>
                                </div>
                                <div class="col-12 col-md-5 text-md-end mt-3 mt-md-0">
                                    <div id="contenedorPagoDiferencia" class="d-none mb-2">
                                        <label for="metodoPagoDiferencia" class="form-label small fw-semibold text-secondary mb-1">Método de pago por diferencia:</label>
                                        <select id="metodoPagoDiferencia" class="form-select form-select-sm">
                                            <option value="Efectivo" selected>Efectivo</option>
                                            <option value="Yape/Plin">Yape / Plin</option>
                                            <option value="Tarjeta de Crédito/Débito">Tarjeta de Crédito / Débito</option>
                                            <option value="Transferencia">Transferencia Bancaria</option>
                                        </select>
                                    </div>
                                    <button type="button" id="btnEjecutarCambioFinal" class="btn btn-warning fw-bold w-100 py-2 shadow-sm" disabled onclick="procesarCambioProductoFinal()">
                                        <i class="bi bi-check2-all me-1"></i> Confirmar y Registrar Cambio
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- ================================================== -->
        <!-- MODAL PARA SELECCIONAR PRODUCTO (POS)               -->
        <!-- ================================================== -->
        <div class="modal fade" id="modalSeleccionarProductoVenta" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-light py-3" style="border-radius: 12px 12px 0 0;">
                        <h5 class="modal-title fw-bold text-dark">
                            <i class="bi bi-box-seam text-primary me-2"></i> Seleccionar Producto
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="input-group mb-3">
                            <span class="input-group-text bg-light"><i class="bi bi-search"></i></span>
                            <input type="text" id="buscadorModalProductos" class="form-control" placeholder="Buscar por código o nombre..." oninput="filtrarModalProductos()">
                        </div>
                        <div class="table-responsive" style="max-height: 350px; overflow-y: auto;">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="table-light sticky-top" style="z-index: 1;">
                                    <tr>
                                        <th>Código</th>
                                        <th>Producto</th>
                                        <th class="text-center">Stock</th>
                                        <th class="text-end">Precio</th>
                                        <th class="text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody id="tablaModalProductos">
                                    <tr>
                                        <td colspan="5" class="text-center text-muted py-4">
                                            <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                            Cargando inventario...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ================================================== -->
        <!-- MODAL PARA SELECCIONAR PRODUCTO NUEVO (CAMBIOS)     -->
        <!-- ================================================== -->
        <div class="modal fade" id="modalSeleccionarProductoNuevoCambio" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-light py-3" style="border-radius: 12px 12px 0 0;">
                        <h5 class="modal-title fw-bold text-dark">
                            <i class="bi bi-box-arrow-right text-success me-2"></i> Seleccionar Producto Nuevo para Cambio
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="input-group mb-3">
                            <span class="input-group-text bg-light"><i class="bi bi-search"></i></span>
                            <input type="text" id="buscadorModalProductosCambio" class="form-control" placeholder="Buscar por código o nombre..." oninput="filtrarModalProductosCambio()">
                        </div>
                        <div class="table-responsive" style="max-height: 350px; overflow-y: auto;">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="table-light sticky-top" style="z-index: 1;">
                                    <tr>
                                        <th>Código</th>
                                        <th>Producto</th>
                                        <th class="text-center">Stock</th>
                                        <th class="text-end">Precio</th>
                                        <th class="text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody id="tablaModalProductosCambio">
                                    <tr>
                                        <td colspan="5" class="text-center text-muted py-4">
                                            <div class="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                                            Cargando inventario...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ================================================== -->
        <!-- MODAL PARA VER EL DETALLE DE UNA VENTA             -->
        <!-- ================================================== -->
        <div class="modal fade" id="modalDetalleVenta" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-light py-3" style="border-radius: 12px 12px 0 0;">
                        <h5 class="modal-title fw-bold text-dark">
                            <i class="bi bi-receipt-cutoff text-primary me-2"></i> Detalle de Venta
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4" id="contenidoDetalleVenta">
                    </div>
                </div>
            </div>
        </div>

        <!-- ================================================== -->
        <!-- MODAL ÚNICO PARA ALERTAS / AVISOS FLOTANTES         -->
        <!-- ================================================== -->
        <div class="modal fade" id="modalAlertaVentas" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-sm modal-dialog-centered">
                <div class="modal-content border-0 shadow text-center p-3" style="border-radius: 16px;">
                    <div class="modal-body p-2">
                        <div id="iconoAlertaModalVentas" class="mb-3 display-6"></div>
                        <h6 id="tituloAlertaModalVentas" class="fw-bold text-dark mb-2"></h6>
                        <p id="mensajeAlertaModalVentas" class="text-muted small mb-4"></p>
                        <button type="button" class="btn btn-primary btn-sm w-100 fw-bold py-2" data-bs-dismiss="modal" style="border-radius: 8px;">Aceptar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ================================================== -->
        <!-- MODAL PARA CONFIRMAR SEGURIDAD (ELIMINAR)           -->
        <!-- ================================================== -->
        <div class="modal fade" id="modalSeguridadEliminarVenta" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
            <div class="modal-dialog modal-sm modal-dialog-centered">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-danger text-white py-2" style="border-radius: 12px 12px 0 0;">
                        <h6 class="modal-title fw-bold mb-0">
                            <i class="bi bi-shield-lock-fill me-2"></i>Autorización Requerida
                        </h6>
                        <button type="button" class="btn-close btn-close-white" onclick="cerrarModalSeguridadEliminarVenta()" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-3 text-center">
                        <p class="small text-muted mb-3">Para eliminar esta venta, ingrese la clave de seguridad:</p>
                        <div class="mb-3">
                            <input type="password" id="passSeguridadEliminarVenta" class="form-control text-center bg-light fw-bold" placeholder="••••••••" style="border-radius: 8px; letter-spacing: 0.2em;">
                            <div id="errorClaveEliminarVenta" class="text-danger small mt-1 d-none">Clave incorrecta.</div>
                        </div>
                        <button type="button" class="btn btn-danger btn-sm w-100 fw-semibold py-2" id="btnVerificarYConfirmarEliminar" onclick="verificarClaveYEliminarVenta()">
                            <i class="bi bi-shield-check me-1"></i> Verificar y Continuar
                        </button>
                        <button type="button" class="btn btn-outline-secondary btn-sm w-100 fw-semibold py-2 mt-2" onclick="cerrarModalSeguridadEliminarVenta()">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ================================================== -->
        <!-- MODAL PARA CONFIRMAR SEGURIDAD (EDITAR)           -->
        <!-- ================================================== -->
        <div class="modal fade" id="modalSeguridadEditarVenta" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
            <div class="modal-dialog modal-sm modal-dialog-centered">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-warning text-dark py-2" style="border-radius: 12px 12px 0 0;">
                        <h6 class="modal-title fw-bold mb-0">
                            <i class="bi bi-shield-lock-fill me-2"></i>Autorización Requerida
                        </h6>
                        <button type="button" class="btn-close" onclick="cerrarModalSeguridadEditarVenta()" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-3 text-center">
                        <p class="small text-muted mb-3">Para editar esta venta, ingrese la clave de seguridad:</p>
                        <div class="mb-3">
                            <input type="password" id="passSeguridadEditarVenta" class="form-control text-center bg-light fw-bold" placeholder="••••••••" style="border-radius: 8px; letter-spacing: 0.2em;">
                            <div id="errorClaveEditarVenta" class="text-danger small mt-1 d-none">Clave incorrecta.</div>
                        </div>
                        <button type="button" class="btn btn-warning btn-sm w-100 fw-semibold py-2" id="btnVerificarYConfirmarEditar" onclick="verificarClaveYEditarVenta()">
                            <i class="bi bi-shield-check me-1"></i> Verificar y Continuar
                        </button>
                        <button type="button" class="btn btn-outline-secondary btn-sm w-100 fw-semibold py-2 mt-2" onclick="cerrarModalSeguridadEditarVenta()">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    sincronizarInventarioParaVentas();
    sincronizarClientesParaVentas();
    escucharVentasEnTiempoReal();

    renderizarTablaCarrito();
    renderizarHistorialVentas();
}

// ==================================================
// CAMBIAR ENTRE VISTAS (POS, HISTORIAL, CAMBIOS)
// ==================================================
function cambiarVistaVentas(vista) {
    vistaActualVentas = vista;
    const btnPOS = document.getElementById('btnVistaPOS');
    const btnHistorial = document.getElementById('btnVistaHistorial');
    const btnCambios = document.getElementById('btnVistaCambios');
    
    const seccionPOS = document.getElementById('seccionVentasPOS');
    const seccionHistorial = document.getElementById('seccionVentasHistorial');
    const seccionCambios = document.getElementById('seccionVentasCambios');

    btnPOS.className = 'btn btn-outline-secondary fw-bold';
    btnHistorial.className = 'btn btn-outline-secondary fw-bold';
    btnCambios.className = 'btn btn-outline-secondary fw-bold text-dark';

    seccionPOS.classList.add('d-none');
    seccionHistorial.classList.add('d-none');
    seccionCambios.classList.add('d-none');

    if (vista === 'pos') {
        btnPOS.className = 'btn btn-primary active fw-bold';
        seccionPOS.classList.remove('d-none');
    } else if (vista === 'historial') {
        btnHistorial.className = 'btn btn-primary active fw-bold';
        seccionHistorial.classList.remove('d-none');
        renderizarHistorialVentas(); 
    } else if (vista === 'cambios') {
        btnCambios.className = 'btn btn-warning active fw-bold text-dark';
        seccionCambios.classList.remove('d-none');
        renderizarTablaVentasParaCambioInicial();
    }
}

// ==================================================
// SINCRONIZACIÓN EN TIEMPO REAL (DATOS)
// ==================================================
function sincronizarInventarioParaVentas() {
    if (sincronizacionVentasInventarioActiva) return;
    const refInv = typeof obtenerReferenciaInventario === 'function' ? obtenerReferenciaInventario() : null;
    if (!refInv) return;
    refInv.on('value', (snapshot) => {
        productosAlmacen = snapshot.val() || {};
    }, (error) => { console.error("Error al sincronizar inventario para ventas:", error); });
    sincronizacionVentasInventarioActiva = true;
}

function sincronizarClientesParaVentas() {
    if (sincronizacionVentasClientesActiva) return;
    const refCli = typeof obtenerReferenciaClientes === 'function' ? obtenerReferenciaClientes() : null;
    if (!refCli) return;
    refCli.on('value', (snapshot) => {
        clientesAlmacen = snapshot.val() || {};
    }, (error) => { console.error("Error al sincronizar clientes para ventas:", error); });
    sincronizacionVentasClientesActiva = true;
}

function escucharVentasEnTiempoReal() {
    const refVentas = obtenerReferenciaVentas();
    if (!refVentas) return;
    refVentas.on('value', (snapshot) => {
        ventasAlmacen = snapshot.val() || {};
        renderizarHistorialVentas(); 
    }, (error) => { console.error("Error al sincronizar ventas:", error); });
}

// ==================================================
// LÓGICA DE ADELANTOS
// ==================================================
function alternarCamposAdelanto() {
    const switchAdelanto = document.getElementById('switchAdelanto');
    const contenedor = document.getElementById('contenedorCamposAdelanto');
    const filaAdelanto = document.getElementById('filaResumenAdelanto');
    const filaSaldo = document.getElementById('filaResumenSaldo');
    
    if (switchAdelanto.checked) {
        contenedor.classList.remove('d-none');
        filaAdelanto.classList.remove('d-none');
        filaSaldo.classList.remove('d-none');
    } else {
        contenedor.classList.add('d-none');
        filaAdelanto.classList.add('d-none');
        filaSaldo.classList.add('d-none');
        document.getElementById('ventaMontoAdelanto').value = "";
        document.getElementById('ventaFechaRecojo').value = "";
        document.getElementById('ventaHoraRecojo').value = "";
        recalcularConAdelanto();
    }
}

function recalcularConAdelanto() {
    let totalVenta = 0;
    carritoVentaActual.forEach(item => { totalVenta += item.precio * item.cantidad; });
    const inputAdelanto = document.getElementById('ventaMontoAdelanto');
    let montoAdelanto = parseFloat(inputAdelanto ? inputAdelanto.value : 0);
    if (isNaN(montoAdelanto) || montoAdelanto < 0) montoAdelanto = 0;
    if (montoAdelanto > totalVenta) {
        if (inputAdelanto) inputAdelanto.value = totalVenta.toFixed(2);
        montoAdelanto = totalVenta;
    }
    let saldoPendiente = totalVenta - montoAdelanto;
    if (document.getElementById('resumenMontoAdelanto')) document.getElementById('resumenMontoAdelanto').innerText = `S/. ${montoAdelanto.toFixed(2)}`;
    if (document.getElementById('resumenSaldoPendiente')) document.getElementById('resumenSaldoPendiente').innerText = `S/. ${saldoPendiente.toFixed(2)}`;
}

// ==================================================
// VALIDACIÓN DE NÚMERO DE ORDEN ÚNICO
// ==================================================
function validarNumeroOrdenUnico() {
    const inputOrden = document.getElementById('ventaNumeroOrden');
    const feedback = document.getElementById('feedbackOrden');
    const btnCobrar = document.getElementById('btnConfirmarCobroVenta');
    
    if (!inputOrden || !feedback || !btnCobrar) return;

    const numeroActual = inputOrden.value.trim();
    const numeroFormateado = "00" + numeroActual;

    if (!numeroActual) {
        feedback.classList.add('d-none');
        btnCobrar.disabled = false;
        return;
    }

    let ordenRepetida = false;
    for (const key in ventasAlmacen) {
        if (idVentaEnEdicion && key === idVentaEnEdicion) continue;
        if (ventasAlmacen[key].numeroOrden === numeroFormateado) {
            ordenRepetida = true;
            break;
        }
    }

    if (ordenRepetida) {
        feedback.classList.remove('d-none');
        btnCobrar.disabled = true;
        inputOrden.classList.add('is-invalid');
    } else {
        feedback.classList.add('d-none');
        btnCobrar.disabled = false;
        inputOrden.classList.remove('is-invalid');
    }
}

// ==================================================
// LÓGICA DE BÚSQUEDA MEDIANTE MODAL (POS)
// ==================================================
function abrirModalSeleccionProducto() {
    const modalElement = document.getElementById('modalSeleccionarProductoVenta');
    const inputBusqueda = document.getElementById('buscadorModalProductos');
    
    if (inputBusqueda) inputBusqueda.value = "";
    renderizarTablaModalProductos(Object.entries(productosAlmacen).map(([codigo, prod]) => ({ codigo, ...prod })));
    
    const modalInstance = new bootstrap.Modal(modalElement);
    modalInstance.show();
    
    setTimeout(() => { 
        if (inputBusqueda) inputBusqueda.focus(); 
    }, 300);
}

function filtrarModalProductos() {
    const query = document.getElementById('buscadorModalProductos').value.toLowerCase().trim();
    let productosFiltrados = Object.entries(productosAlmacen)
        .map(([codigo, prod]) => ({ codigo, ...prod }))
        .filter(p => (p.codigo && p.codigo.toLowerCase().includes(query)) || (p.nombre && p.nombre.toLowerCase().includes(query)));
    
    renderizarTablaModalProductos(productosFiltrados);
}

function renderizarTablaModalProductos(arregloProductos) {
    const tbody = document.getElementById('tablaModalProductos');
    if (!tbody) return;

    if (arregloProductos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No se encontraron productos en el inventario.</td></tr>`;
        return;
    }

    let html = "";
    arregloProductos.forEach(p => {
        const stock = parseInt(p.stock) || 0;
        const precio = parseFloat(p.precio) || 0;
        const estaAgotado = stock <= 0;
        const estadoBadge = estaAgotado ? 'bg-danger' : (stock <= 3 ? 'bg-warning text-dark' : 'bg-success');

        const nombreEscapado = (p.nombre || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const codigoEscapado = (p.codigo || '').replace(/'/g, "\\'");

        html += `
            <tr>
                <td><span class="badge bg-light text-dark border fw-bold">${p.codigo}</span></td>
                <td class="fw-medium text-dark">${p.nombre || 'Sin nombre'}</td>
                <td class="text-center"><span class="badge ${estadoBadge}">${estaAgotado ? 'Agotado' : stock}</span></td>
                <td class="text-end fw-bold text-primary">S/. ${precio.toFixed(2)}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-primary" ${estaAgotado ? 'disabled' : ''} onclick="seleccionarProductoDesdeModal('${codigoEscapado}', '${nombreEscapado}')">
                        <i class="bi bi-check-lg"></i> Elegir
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function seleccionarProductoDesdeModal(codigo, nombre) {
    document.getElementById('buscarProductoPOS').value = `[${codigo}] ${nombre}`;
    productoSeleccionadoId = codigo;
    
    const modalElement = document.getElementById('modalSeleccionarProductoVenta');
    if (document.activeElement) document.activeElement.blur();
    
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) modalInstance.hide();
    
    setTimeout(() => {
        const cantidadInput = document.getElementById('ventaCantidadProducto');
        if (cantidadInput) {
            cantidadInput.focus();
            cantidadInput.select();
        }
    }, 400);
}

// ==================================================
// LÓGICA DE CARRITO
// ==================================================
function agregarAlCarrito() {
    if (productoSeleccionadoId === null) {
        mostrarAlertaVentas("Por favor, seleccione un producto usando el buscador.", "warning");
        return;
    }
    const producto = productosAlmacen[productoSeleccionadoId];
    if (!producto) {
        mostrarAlertaVentas("El producto seleccionado ya no existe en el inventario.", "danger");
        productoSeleccionadoId = null;
        return;
    }
    const cantidadInput = document.getElementById('ventaCantidadProducto');
    const cantidad = parseInt(cantidadInput ? cantidadInput.value : 1);
    const stockDisponible = parseInt(producto.stock) || 0;
    const precioUnitario = parseFloat(producto.precio) || 0;
    if (isNaN(cantidad) || cantidad <= 0) { mostrarAlertaVentas("Introduce una cantidad válida.", "warning"); return; }
    if (stockDisponible < cantidad) { mostrarAlertaVentas(`Stock insuficiente. Solo quedan ${stockDisponible} unidades.`, "danger"); return; }
    
    const itemExistente = carritoVentaActual.find(item => item.codigo === productoSeleccionadoId);
    if (itemExistente) {
        if (itemExistente.cantidad + cantidad > stockDisponible) { mostrarAlertaVentas(`Excede el stock máximo disponible (${stockDisponible}).`, "danger"); return; }
        itemExistente.cantidad += cantidad;
    } else {
        carritoVentaActual.push({ codigo: productoSeleccionadoId, nombre: producto.nombre, precio: precioUnitario, cantidad: cantidad });
    }
    
    document.getElementById('buscarProductoPOS').value = "";
    if (cantidadInput) cantidadInput.value = "1";
    productoSeleccionadoId = null;

    renderizarTablaCarrito();
}

function eliminarItemCarrito(index) {
    carritoVentaActual.splice(index, 1);
    renderizarTablaCarrito();
}

function renderizarTablaCarrito() {
    const tbody = document.getElementById('listaCarritoVenta');
    if (!tbody) return;
    if (carritoVentaActual.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">El carrito está vacío.</td></tr>`;
        actualizarCuadroTotales(0);
        return;
    }
    let html = "";
    let totalAcumulado = 0;
    carritoVentaActual.forEach((item, index) => {
        const subtotal = item.precio * item.cantidad;
        totalAcumulado += subtotal;
        html += `
            <tr>
                <td><span class="badge bg-light text-dark border fw-bold">${item.codigo}</span></td>
                <td class="fw-medium text-dark">${item.nombre}</td>
                <td class="text-center">S/. ${item.precio.toFixed(2)}</td>
                <td class="text-center fw-bold">${item.cantidad}</td>
                <td class="text-end fw-bold text-dark">S/. ${subtotal.toFixed(2)}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger border-0" onclick="eliminarItemCarrito(${index})">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    actualizarCuadroTotales(totalAcumulado);
}

function actualizarCuadroTotales(total) {
    const subtotalNeto = total / 1.18;
    const igv = total - subtotalNeto;
    if (document.getElementById('resumenSubtotal')) document.getElementById('resumenSubtotal').innerText = `S/. ${subtotalNeto.toFixed(2)}`;
    if (document.getElementById('resumenIgv')) document.getElementById('resumenIgv').innerText = `S/. ${igv.toFixed(2)}`;
    if (document.getElementById('resumenTotal')) document.getElementById('resumenTotal').innerText = `S/. ${total.toFixed(2)}`;
    recalcularConAdelanto();
}

// ==================================================
// LÓGICA DE BÚSQUEDA Y REGISTRO DE CLIENTE
// ==================================================
function buscarClientePorDniAuto() {
    const dniInput = document.getElementById('ventaDniCliente');
    const feedback = document.getElementById('feedbackDni');
    const contenedorRegistro = document.getElementById('contenedorRegistroClienteVenta');
    
    const inputNombre = document.getElementById('ventaNombreCliente');
    const inputTelefono = document.getElementById('ventaTelefonoCliente');
    const inputCorreo = document.getElementById('ventaCorreoCliente');

    if (!dniInput || !feedback) return;

    const dni = dniInput.value.trim();

    if (dni === "") {
        feedback.innerText = "";
        feedback.className = "form-text fw-medium mt-1";
        contenedorRegistro.classList.add('d-none');
        inputNombre.value = "";
        inputNombre.disabled = false;
        inputTelefono.value = "";
        inputTelefono.disabled = false;
        inputCorreo.value = "";
        inputCorreo.disabled = false;
        return;
    }

    if (dni.length === 8 || dni.length === 11) {
        const clienteEncontrado = clientesAlmacen[dni];

        if (clienteEncontrado) {
            feedback.innerText = "Cliente recurrente detectado";
            feedback.className = "form-text text-success fw-medium mt-1";
            contenedorRegistro.classList.add('d-none');
            inputNombre.value = clienteEncontrado.nombre || '';
            inputNombre.disabled = false;
            inputTelefono.value = clienteEncontrado.telefono || "";
            inputTelefono.disabled = false;
            inputCorreo.value = clienteEncontrado.correo || "";
            inputCorreo.disabled = false;
        } else {
            feedback.innerText = "Cliente no registrado. Debe registrarlo para continuar.";
            feedback.className = "form-text text-danger fw-medium mt-1";
            contenedorRegistro.classList.remove('d-none');
            inputNombre.value = "";
            inputNombre.disabled = true;
            inputTelefono.value = "";
            inputTelefono.disabled = true;
            inputCorreo.value = "";
            inputCorreo.disabled = true;
        }
    } else {
        feedback.innerText = "Ingrese 8 (DNI) u 11 (RUC) dígitos";
        feedback.className = "form-text text-muted fw-medium mt-1";
        contenedorRegistro.classList.add('d-none');
        inputNombre.value = "";
        inputNombre.disabled = false;
        inputTelefono.value = "";
        inputTelefono.disabled = false;
        inputCorreo.value = "";
        inputCorreo.disabled = false;
    }
}

function abrirRegistroClienteDesdeVenta() {
    const dni = document.getElementById('ventaDniCliente').value.trim();
    if (typeof abrirModalRegistroClienteDesdeExterno === 'function') {
        abrirModalRegistroClienteDesdeExterno(dni);
    } else {
        mostrarAlertaVentas("Error interno: No se pudo cargar el módulo de registro de clientes.", "danger");
    }
}

// ==================================================
// PROCESAR COBRO DE LA VENTA (BLINDADO)
// ==================================================
function procesarCobroVenta() {
    const numOrdenInput = document.getElementById('ventaNumeroOrden').value.trim();
    const dni = document.getElementById('ventaDniCliente').value.trim();
    const nombre = document.getElementById('ventaNombreCliente').value.trim();
    const metodo = document.getElementById('ventaMetodoPago').value;
    const switchAdelanto = document.getElementById('switchAdelanto');
    const inputMontoAdelanto = document.getElementById('ventaMontoAdelanto');
    const inputFechaRecojo = document.getElementById('ventaFechaRecojo');
    const inputHoraRecojo = document.getElementById('ventaHoraRecojo');
    const btnCobrar = document.getElementById('btnConfirmarCobroVenta');

    const liberarBoton = () => {
        if (btnCobrar) {
            btnCobrar.disabled = false;
            btnCobrar.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> Confirmar y Cobrar Venta`;
        }
    };

    if (carritoVentaActual.length === 0) { 
        mostrarAlertaVentas("Ningún producto está en el carrito.", "warning"); 
        return; 
    }
    if (!numOrdenInput) { 
        mostrarAlertaVentas("Por favor, tipee el número correspondiente a la Orden de Trabajo.", "warning"); 
        return; 
    }
    
    const contenedorRegistro = document.getElementById('contenedorRegistroClienteVenta');
    if (contenedorRegistro && !contenedorRegistro.classList.contains('d-none')) {
        mostrarAlertaVentas("El cliente no está registrado. Debe registrarlo antes de cobrar.", "warning");
        return;
    }

    if (!nombre) { 
        mostrarAlertaVentas("Por favor, registre el nombre del cliente.", "warning"); 
        return; 
    }

    let totalVenta = 0;
    carritoVentaActual.forEach(item => { totalVenta += item.precio * item.cantidad; });

    let esAdelanto = switchAdelanto ? switchAdelanto.checked : false;
    let montoAdelantado = 0;
    let fechaRecojo = "No aplica";
    let horaRecojo = "No aplica";
    let estadoVentaReal = "Pagado";

    if (esAdelanto) {
        montoAdelantado = parseFloat(inputMontoAdelanto ? inputMontoAdelanto.value : 0);
        if (isNaN(montoAdelantado) || montoAdelantado <= 0) { 
            mostrarAlertaVentas("Por favor, introduzca un monto de adelanto válido mayor a 0.", "warning"); 
            return; 
        }
        if (montoAdelantado > totalVenta) { 
            mostrarAlertaVentas("El adelanto no puede ser mayor al total de la venta.", "warning"); 
            return; 
        }
        if (!inputFechaRecojo.value || !inputHoraRecojo.value) { 
            mostrarAlertaVentas("Por favor, especifique la fecha y hora estimada de recojo de los lentes.", "warning"); 
            return; 
        }
        fechaRecojo = inputFechaRecojo.value;
        horaRecojo = inputHoraRecojo.value;
        estadoVentaReal = "Adelanto";
    }

    for (const item of carritoVentaActual) {
        const prod = productosAlmacen[item.codigo];
        const stockActual = prod ? (parseInt(prod.stock) || 0) : 0;
        if (!prod || stockActual < item.cantidad) {
            mostrarAlertaVentas(`Stock insuficiente para ${item.nombre}. Verifica el inventario e intenta de nuevo.`, "danger");
            return;
        }
    }

    const refRaiz = obtenerReferenciaRaizFirebase();
    const refVentas = obtenerReferenciaVentas();
    if (!refRaiz || !refVentas) { 
        mostrarAlertaVentas("No hay conexión con Firebase. No se pudo registrar la venta.", "danger"); 
        return; 
    }

    if (btnCobrar) {
        btnCobrar.disabled = true;
        btnCobrar.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span> Procesando...`;
    }

    const nuevaVentaKey = refVentas.push().key;
    const nuevaVenta = {
        numeroOrden: "00" + numOrdenInput,
        dniCliente: dni || "00000000",
        nombreCliente: nombre,
        fecha: new Date().toISOString().split('T')[0],
        total: totalVenta,
        metodoPago: metodo,
        metodoPagoKey: obtenerKeyMetodoPago(metodo),
        esAdelanto: esAdelanto,
        montoAdelantado: montoAdelantado,
        saldoPendiente: totalVenta - montoAdelantado,
        fechaRecojo: fechaRecojo,
        horaRecojo: horaRecojo,
        estado: estadoVentaReal,
        items: carritoVentaActual.map(item => ({
            codigo: item.codigo,
            nombre: item.nombre,
            precio: item.precio,
            cantidad: item.cantidad
        })),
        creadoEn: new Date().toISOString()
    };

    const actualizaciones = {};
    actualizaciones['ventas/' + nuevaVentaKey] = nuevaVenta;
    carritoVentaActual.forEach(item => {
        const stockActual = parseInt(productosAlmacen[item.codigo].stock) || 0;
        const stockNuevo = Math.max(0, stockActual - item.cantidad);
        actualizaciones['inventario/' + item.codigo + '/stock'] = stockNuevo;
    });

    const dniValido = (dni.length === 8 || dni.length === 11);
    if (dniValido && !clientesAlmacen[dni]) {
        actualizaciones['clientes/' + dni] = {
            nombre: nombre,
            edad: 0,
            telefono: document.getElementById('ventaTelefonoCliente').value.trim() || "Sin registrar",
            correo: document.getElementById('ventaCorreoCliente').value.trim() || "Sin registrar",
            ocupacion: "Cliente Eventual",
            ultimoExamen: "",
            antecedentes: "Registrado automáticamente desde el módulo de Ventas.",
            preferencias: "N/A"
        };
    }

    refRaiz.update(actualizaciones)
        .then(() => {
            const montoACobrar = esAdelanto ? montoAdelantado : totalVenta;
            let tipoPagoParaCaja = obtenerKeyMetodoPago(metodo);

            console.log('💰 Actualizando caja - Método:', metodo, 'Monto:', montoACobrar, 'Tipo:', tipoPagoParaCaja);

            if (typeof window.actualizarCajaConVenta === 'function') {
                window.actualizarCajaConVenta(montoACobrar, tipoPagoParaCaja);
            } else if (typeof actualizarCajaConVenta === 'function') {
                actualizarCajaConVenta(montoACobrar, tipoPagoParaCaja);
            } else {
                console.warn('⚠️ Función actualizarCajaConVenta no encontrada');
            }

            if (esAdelanto) {
                mostrarAlertaVentas(`¡Orden 00${numOrdenInput} registrada! Adelanto cobrado: S/. ${montoAdelantado.toFixed(2)}. Saldo restante: S/. ${(totalVenta - montoAdelantado).toFixed(2)}`, "success");
            } else {
                mostrarAlertaVentas(`Venta completada. Orden 00${numOrdenInput} cobrada por S/. ${totalVenta.toFixed(2)}.`, "success");
            }
            carritoVentaActual = [];
            document.getElementById('ventaNumeroOrden').value = "";
            document.getElementById('ventaDniCliente').value = "";
            document.getElementById('ventaNombreCliente').value = "";
            document.getElementById('ventaTelefonoCliente').value = "";
            document.getElementById('ventaCorreoCliente').value = "";
            if (switchAdelanto) switchAdelanto.checked = false;
            alternarCamposAdelanto();
            if (document.getElementById('feedbackDni')) {
                document.getElementById('feedbackDni').classList.add('d-none');
            }
            if (document.getElementById('contenedorRegistroClienteVenta')) {
                document.getElementById('contenedorRegistroClienteVenta').classList.add('d-none');
            }
            renderizarTablaCarrito();
        })
        .catch((error) => {
            console.error("Error al procesar la venta:", error);
            mostrarAlertaVentas("Ocurrió un error al registrar la venta en Firebase. Intenta nuevamente.", "danger");
        })
        .finally(() => { 
            liberarBoton();
        });
}

// ==================================================
// RENDERIZAR HISTORIAL DE VENTAS
// ==================================================
function renderizarHistorialVentas() {
    const tbody = document.getElementById('tablaHistorialVentas');
    if (!tbody) return;

    const entradas = Object.entries(ventasAlmacen);
    if (entradas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-3 d-block mb-2 text-secondary"></i>
                    Aún no hay ventas registradas.
                </td>
            </tr>
        `;
        return;
    }

    entradas.sort((a, b) => new Date(b[1].creadoEn || b[1].fecha) - new Date(a[1].creadoEn || a[1].fecha));

    let html = "";
    entradas.forEach(([idVenta, venta]) => {
        const estadoColor = venta.estado === 'Pagado' ? 'text-bg-success' : (venta.estado === 'Adelanto' ? 'text-bg-warning' : (venta.estado === 'Cambiado' ? 'text-bg-info' : 'text-bg-secondary'));
        
        html += `
            <tr class="fila-historial-venta" data-id="${idVenta}">
                <td><span class="badge bg-light text-dark border fw-bold">${venta.numeroOrden || 'N/A'}</span></td>
                <td class="fw-medium text-dark">${venta.nombreCliente || 'Cliente no registrado'}</td>
                <td class="text-center text-muted small fecha-venta">${venta.fecha || 'N/A'}</td>
                <td class="text-end fw-bold text-dark">S/. ${(venta.total || 0).toFixed(2)}</td>
                <td class="text-center"><span class="badge bg-light text-secondary border">${venta.metodoPago || 'N/A'}</span></td>
                <td class="text-center"><span class="badge ${estadoColor}">${venta.estado || 'Pendiente'}</span></td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-primary border-0" onclick="verDetalleVenta('${idVenta}')" title="Ver Detalle">
                        <i class="bi bi-eye-fill"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-warning border-0 ms-1" onclick="abrirModalSeguridadEditarVenta('${idVenta}')" title="Editar Venta">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger border-0 ms-1" onclick="abrirModalSeguridadEliminarVenta('${idVenta}')" title="Eliminar Venta">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ==================================================
// FILTRAR HISTORIAL DE VENTAS
// ==================================================
function filtrarHistorialVentas() {
    const termino = document.getElementById('buscadorHistorialVentas').value.toLowerCase().trim();
    const fechaInicio = document.getElementById('filtroFechaInicio').value;
    const fechaFin = document.getElementById('filtroFechaFin').value;
    
    const filas = document.querySelectorAll('#tablaHistorialVentas tr.fila-historial-venta');
    
    filas.forEach(fila => {
        const textoFila = fila.innerText.toLowerCase();
        const fechaFila = fila.querySelector('.fecha-venta')?.innerText.trim() || '';
        
        const coincideTexto = textoFila.includes(termino);
        
        let coincideFecha = true;
        if (fechaInicio && fechaFin) {
            coincideFecha = (fechaFila >= fechaInicio && fechaFila <= fechaFin);
        } else if (fechaInicio) {
            coincideFecha = (fechaFila >= fechaInicio);
        } else if (fechaFin) {
            coincideFecha = (fechaFila <= fechaFin);
        }

        if (coincideTexto && coincideFecha) {
            fila.classList.remove('d-none');
        } else {
            fila.classList.add('d-none');
        }
    });
}

function limpiarFiltrosHistorial() {
    document.getElementById('buscadorHistorialVentas').value = '';
    document.getElementById('filtroFechaInicio').value = '';
    document.getElementById('filtroFechaFin').value = '';
    filtrarHistorialVentas();
}

// ==================================================
// SECCIÓN DE CAMBIOS DE PRODUCTOS (NO DEVOLUCIÓN DE DINERO)
// ==================================================
function renderizarTablaVentasParaCambioInicial() {
    const tbody = document.getElementById('tablaSeleccionVentaCambio');
    if (!tbody) return;

    const entradas = Object.entries(ventasAlmacen);
    if (entradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No hay ventas registradas para cambios.</td></tr>`;
        return;
    }

    entradas.sort((a, b) => new Date(b[1].creadoEn || b[1].fecha) - new Date(a[1].creadoEn || a[1].fecha));

    let html = "";
    entradas.forEach(([idVenta, venta]) => {
        if (venta.estado === 'Eliminado') return;
        html += `
            <tr class="fila-venta-cambio" data-id="${idVenta}">
                <td><span class="badge bg-light text-dark border fw-bold">${venta.numeroOrden || 'N/A'}</span></td>
                <td class="fw-medium text-dark">${venta.nombreCliente || 'Sin nombre'}</td>
                <td class="text-muted small">${venta.fecha || 'N/A'}</td>
                <td class="text-end fw-bold">S/. ${(venta.total || 0).toFixed(2)}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-warning fw-bold" onclick="seleccionarVentaParaCambio('${idVenta}')">
                        <i class="bi bi-arrow-repeat me-1"></i> Seleccionar
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function filtrarVentasParaCambio() {
    const termino = document.getElementById('buscarVentaParaCambio').value.toLowerCase().trim();
    const filas = document.querySelectorAll('#tablaSeleccionVentaCambio tr.fila-venta-cambio');
    
    filas.forEach(fila => {
        const texto = fila.innerText.toLowerCase();
        if (texto.includes(termino)) {
            fila.classList.remove('d-none');
        } else {
            fila.classList.add('d-none');
        }
    });
}

function seleccionarVentaParaCambio(idVenta) {
    const venta = ventasAlmacen[idVenta];
    if (!venta) return;

    ventaACambioId = idVenta;
    productoDevueltoCambioId = null;
    productoNuevoCambioId = null;

    document.getElementById('lblOrdenCambioSeleccionada').innerText = `#${venta.numeroOrden || idVenta} (${venta.nombreCliente})`;
    document.getElementById('panelConfiguracionCambio').classList.remove('d-none');

    const selectDevuelto = document.getElementById('selectProductoDevueltoCambio');
    let optionsHtml = `<option value="" selected disabled>Seleccione producto a devolver...</option>`;
    
    if (venta.items && Array.isArray(venta.items)) {
        venta.items.forEach(item => {
            optionsHtml += `<option value="${item.codigo}" data-precio="${item.precio}" data-cantidad="${item.cantidad}">${item.nombre} (Cant: ${item.cantidad} - S/. ${item.precio})</option>`;
        });
    }
    selectDevuelto.innerHTML = optionsHtml;

    document.getElementById('inputProductoNuevoCambioBusqueda').value = "";
    document.getElementById('lblNombreProductoNuevo').innerText = "Ninguno";
    document.getElementById('lblPrecioProductoNuevo').innerText = "S/. 0.00";
    document.getElementById('lblPrecioDevuelto').innerText = "S/. 0.00";
    document.getElementById('lblCantidadDevuelta').innerText = "1";

    calcularDiferenciaCambio();
}

function actualizarInfoProductoDevuelto() {
    const select = document.getElementById('selectProductoDevueltoCambio');
    const selectedOption = select.options[select.selectedIndex];
    
    if (!selectedOption || !selectedOption.value) return;

    productoDevueltoCambioId = selectedOption.value;
    const precio = parseFloat(selectedOption.getAttribute('data-precio')) || 0;
    const cantidad = selectedOption.getAttribute('data-cantidad') || 1;

    document.getElementById('lblPrecioDevuelto').innerText = `S/. ${precio.toFixed(2)}`;
    document.getElementById('lblCantidadDevuelta').innerText = cantidad;

    calcularDiferenciaCambio();
}

function abrirModalSeleccionProductoNuevoCambio() {
    const modalEl = document.getElementById('modalSeleccionarProductoNuevoCambio');
    const inputBuscador = document.getElementById('buscadorModalProductosCambio');
    if (inputBuscador) inputBuscador.value = "";
    
    renderizarTablaModalProductosCambio(Object.entries(productosAlmacen).map(([codigo, prod]) => ({ codigo, ...prod })));
    
    const modalInstance = new bootstrap.Modal(modalEl);
    modalInstance.show();
    setTimeout(() => { if (inputBuscador) inputBuscador.focus(); }, 300);
}

function filtrarModalProductosCambio() {
    const query = document.getElementById('buscadorModalProductosCambio').value.toLowerCase().trim();
    let filtrados = Object.entries(productosAlmacen)
        .map(([codigo, prod]) => ({ codigo, ...prod }))
        .filter(p => (p.codigo && p.codigo.toLowerCase().includes(query)) || (p.nombre && p.nombre.toLowerCase().includes(query)));
    renderizarTablaModalProductosCambio(filtrados);
}

function renderizarTablaModalProductosCambio(arreglo) {
    const tbody = document.getElementById('tablaModalProductosCambio');
    if (!tbody) return;

    if (arreglo.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No hay productos disponibles.</td></tr>`;
        return;
    }

    let html = "";
    arreglo.forEach(p => {
        const stock = parseInt(p.stock) || 0;
        const precio = parseFloat(p.precio) || 0;
        const agotado = stock <= 0;
        const badge = agotado ? 'bg-danger' : (stock <= 3 ? 'bg-warning text-dark' : 'bg-success');
        
        const nombreEsc = (p.nombre || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const codigoEsc = (p.codigo || '').replace(/'/g, "\\'");

        html += `
            <tr>
                <td><span class="badge bg-light text-dark border fw-bold">${p.codigo}</span></td>
                <td class="fw-medium text-dark">${p.nombre}</td>
                <td class="text-center"><span class="badge ${badge}">${agotado ? 'Agotado' : stock}</span></td>
                <td class="text-end fw-bold text-success">S/. ${precio.toFixed(2)}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-success" ${agotado ? 'disabled' : ''} onclick="seleccionarProductoNuevoCambio('${codigoEsc}', '${nombreEsc}', ${precio})">
                        <i class="bi bi-check-lg"></i> Elegir
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function seleccionarProductoNuevoCambio(codigo, nombre, precio) {
    productoNuevoCambioId = codigo;
    document.getElementById('inputProductoNuevoCambioBusqueda').value = `[${codigo}] ${nombre}`;
    document.getElementById('lblNombreProductoNuevo').innerText = nombre;
    document.getElementById('lblPrecioProductoNuevo').innerText = `S/. ${precio.toFixed(2)}`;

    const modalEl = document.getElementById('modalSeleccionarProductoNuevoCambio');
    const instance = bootstrap.Modal.getInstance(modalEl);
    if (instance) instance.hide();

    calcularDiferenciaCambio();
}

function calcularDiferenciaCambio() {
    const lblMensaje = document.getElementById('lblMensajeDiferencia');
    const contenedorPago = document.getElementById('contenedorPagoDiferencia');
    const btnEjecutar = document.getElementById('btnEjecutarCambioFinal');

    if (!productoDevueltoCambioId || !productoNuevoCambioId) {
        lblMensaje.innerHTML = "Seleccione ambos productos para calcular la diferencia.";
        lblMensaje.className = "fw-bold fs-6 text-dark";
        contenedorPago.classList.add('d-none');
        btnEjecutar.disabled = true;
        return;
    }

    const selectDevuelto = document.getElementById('selectProductoDevueltoCambio');
    const optDevuelto = selectDevuelto.options[selectDevuelto.selectedIndex];
    const precioDevuelto = parseFloat(optDevuelto.getAttribute('data-precio')) || 0;

    const prodNuevoObj = productosAlmacen[productoNuevoCambioId];
    const precioNuevo = prodNuevoObj ? (parseFloat(prodNuevoObj.precio) || 0) : 0;

    const diferencia = precioNuevo - precioDevuelto;

    if (Math.abs(diferencia) < 0.01) {
        lblMensaje.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i> Los productos son del mismo precio exacto (S/. ${precioDevuelto.toFixed(2)}). No hay saldo a pagar.</span>`;
        contenedorPago.classList.add('d-none');
        btnEjecutar.disabled = false;
    } else if (diferencia > 0) {
        lblMensaje.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-circle-fill me-1"></i> El producto nuevo cuesta más. Se debe pagar una diferencia de: <strong>S/. ${diferencia.toFixed(2)}</strong></span>`;
        contenedorPago.classList.remove('d-none');
        btnEjecutar.disabled = false;
    } else {
        lblMensaje.innerHTML = `<span class="text-warning text-dark"><i class="bi bi-exclamation-triangle-fill me-1"></i> El producto nuevo es de menor precio. Recuerde que <strong>no hay devoluciones de dinero</strong> en efectivo. El cambio procede al mismo valor o pagando excedente.</span>`;
        contenedorPago.classList.add('d-none');
        btnEjecutar.disabled = true;
    }
}

function procesarCambioProductoFinal() {
    if (!ventaACambioId || !productoDevueltoCambioId || !productoNuevoCambioId) {
        mostrarAlertaVentas("Faltan datos para procesar el cambio.", "warning");
        return;
    }

    const ventaOriginal = ventasAlmacen[ventaACambioId];
    const prodNuevo = productosAlmacen[productoNuevoCambioId];
    const stockNuevoActual = prodNuevo ? (parseInt(prodNuevo.stock) || 0) : 0;

    if (stockNuevoActual <= 0) {
        mostrarAlertaVentas("El producto nuevo seleccionado no tiene stock disponible.", "danger");
        return;
    }

    let cantidadDevuelta = 1;
    let nombreProdDevuelto = "";
    let precioProdDevuelto = 0;
    if (ventaOriginal.items) {
        const itemEncontrado = ventaOriginal.items.find(i => i.codigo === productoDevueltoCambioId);
        if (itemEncontrado) {
            cantidadDevuelta = itemEncontrado.cantidad || 1;
            nombreProdDevuelto = itemEncontrado.nombre;
            precioProdDevuelto = itemEncontrado.precio;
        }
    }

    const precioNuevo = parseFloat(prodNuevo.precio) || 0;
    const diferencia = precioNuevo - precioProdDevuelto;
    const metodoPagoDif = document.getElementById('metodoPagoDiferencia').value;

    const refRaiz = obtenerReferenciaRaizFirebase();
    const refVentas = obtenerReferenciaVentas();
    if (!refRaiz || !refVentas) {
        mostrarAlertaVentas("Error de conexión con Firebase.", "danger");
        return;
    }

    const stockProdDevueltoActual = productosAlmacen[productoDevueltoCambioId] ? (parseInt(productosAlmacen[productoDevueltoCambioId].stock) || 0) : 0;
    const nuevoStockDevuelto = stockProdDevueltoActual + cantidadDevuelta;
    const nuevoStockNuevo = Math.max(0, stockNuevoActual - cantidadDevuelta);

    const actualizaciones = {};
    actualizaciones['inventario/' + productoDevueltoCambioId + '/stock'] = nuevoStockDevuelto;
    actualizaciones['inventario/' + productoNuevoCambioId + '/stock'] = nuevoStockNuevo;

    const nuevaVentaKey = refVentas.push().key;
    const registroCambioVenta = {
        numeroOrden: (ventaOriginal.numeroOrden || "000") + "-CAMBIO",
        dniCliente: ventaOriginal.dniCliente || "00000000",
        nombreCliente: ventaOriginal.nombreCliente || "Cliente General",
        fecha: new Date().toISOString().split('T')[0],
        total: precioNuevo * cantidadDevuelta,
        metodoPago: diferencia > 0 ? metodoPagoDif : "Cambio de Producto (Sin costo)",
        metodoPagoKey: diferencia > 0 ? obtenerKeyMetodoPago(metodoPagoDif) : 'cambio',
        esAdelanto: false,
        estado: "Pagado (Cambio)",
        items: [{
            codigo: productoNuevoCambioId,
            nombre: prodNuevo.nombre,
            precio: precioNuevo,
            cantidad: cantidadDevuelta
        }],
        observacionCambio: `Cambio realizado por devolución del producto [${productoDevueltoCambioId}] ${nombreProdDevuelto}. Diferencia pagada: S/. ${diferencia > 0 ? diferencia.toFixed(2) : '0.00'}`,
        creadoEn: new Date().toISOString()
    };

    actualizaciones['ventas/' + nuevaVentaKey] = registroCambioVenta;

    refRaiz.update(actualizaciones)
        .then(() => {
            if (diferencia > 0) {
                let tipoCaja = obtenerKeyMetodoPago(metodoPagoDif);
                
                if (typeof window.actualizarCajaConVenta === 'function') {
                    window.actualizarCajaConVenta(diferencia * cantidadDevuelta, tipoCaja);
                }
            }
            mostrarAlertaVentas(`¡Cambio procesado con éxito! El producto devuelto reingresó al stock y el nuevo producto salió registrado como venta.`, "success");
            cambiarVistaVentas('historial');
        })
        .catch((err) => {
            console.error("Error al procesar cambio:", err);
            mostrarAlertaVentas("No se pudo registrar el cambio en la base de datos.", "danger");
        });
}

// ==================================================
// SEGURIDAD PARA ELIMINAR VENTA (CON REVERSIÓN DE CAJA)
// ==================================================
function abrirModalSeguridadEliminarVenta(idVenta) {
    ventaAEliminarId = idVenta;
    const passInput = document.getElementById('passSeguridadEliminarVenta');
    const errorDiv = document.getElementById('errorClaveEliminarVenta');
    if (passInput) passInput.value = "";
    if (errorDiv) errorDiv.classList.add('d-none');
    
    const modalElement = document.getElementById('modalSeguridadEliminarVenta');
    if (!modalElement) return;
    
    const modalInstance = new bootstrap.Modal(modalElement);
    modalInstance.show();
    setTimeout(() => { if (passInput) passInput.focus(); }, 300);
}

function cerrarModalSeguridadEliminarVenta() {
    const modalElement = document.getElementById('modalSeguridadEliminarVenta');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) modalInstance.hide();
    ventaAEliminarId = null;
}

function verificarClaveYEliminarVenta() {
    const claveIngresada = document.getElementById('passSeguridadEliminarVenta').value;
    const errorDiv = document.getElementById('errorClaveEliminarVenta');

    if (claveIngresada === CLAVE_SEGURIDAD_VENTAS) {
        if (errorDiv) errorDiv.classList.add('d-none');
        const modalElement = document.getElementById('modalSeguridadEliminarVenta');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        setTimeout(() => {
            mostrarModalConfirmacionEliminarVenta(ventaAEliminarId);
        }, 400);
    } else {
        if (errorDiv) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = "❌ Clave incorrecta.";
        }
    }
}

function mostrarModalConfirmacionEliminarVenta(idVenta) {
    const venta = ventasAlmacen[idVenta];
    const numOrdenStr = venta ? (venta.numeroOrden || idVenta) : idVenta;

    let modalContenedor = document.getElementById('modalConfirmacionDinamicoVentas');
    if (!modalContenedor) {
        modalContenedor = document.createElement('div');
        modalContenedor.id = 'modalConfirmacionDinamicoVentas';
        document.body.appendChild(modalContenedor);
    }

    modalContenedor.innerHTML = `
        <div class="modal fade" id="modalConfirmarAccionVenta" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content border-0 shadow text-center p-3" style="border-radius: 16px;">
                    <div class="modal-body p-2">
                        <div class="mb-3 display-6 text-danger"><i class="bi bi-exclamation-triangle-fill"></i></div>
                        <h6 class="fw-bold text-dark mb-2">¿Eliminar Venta?</h6>
                        <p class="text-muted small mb-4">¿Está seguro de ELIMINAR la venta <strong>#${numOrdenStr}</strong>? Se liberará el número de orden, se revertirá el stock y se <strong>descontará el monto de la caja</strong>.</p>
                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-outline-secondary btn-sm w-50 fw-semibold py-2" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-danger btn-sm w-50 fw-bold py-2" id="btnEjecutarEliminacionFinal" style="border-radius: 8px;">Sí, Eliminar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const modalEl = document.getElementById('modalConfirmarAccionVenta');
    const modalInstance = new bootstrap.Modal(modalEl);
    modalInstance.show();

    document.getElementById('btnEjecutarEliminacionFinal').onclick = function() {
        modalInstance.hide();
        setTimeout(() => { ejecutarEliminacionVenta(idVenta); }, 300);
    };
}

function ejecutarEliminacionVenta(idVenta) {
    const refRaiz = obtenerReferenciaRaizFirebase();
    const refVentas = obtenerReferenciaVentas();
    if (!refRaiz || !refVentas) return;

    const venta = ventasAlmacen[idVenta];
    if (!venta) return;

    const actualizaciones = {};
    
    // 1. Eliminar la venta
    actualizaciones['ventas/' + idVenta] = null;

    // 2. Revertir stock
    if (venta.items && Array.isArray(venta.items)) {
        venta.items.forEach(item => {
            const prodActual = productosAlmacen[item.codigo];
            const stockActual = prodActual ? (parseInt(prodActual.stock) || 0) : 0;
            actualizaciones['inventario/' + item.codigo + '/stock'] = stockActual + item.cantidad;
        });
    }

    // 3. Revertir el dinero en caja según el método de pago
    const montoTotal = venta.total || 0;
    const metodoKey = venta.metodoPagoKey || obtenerKeyMetodoPago(venta.metodoPago || 'Efectivo');
    const fechaCaja = venta.fecha || new Date().toISOString().split('T')[0];
    const cajaRef = firebase.database().ref('cajas/' + fechaCaja);
    
    // Determinar qué campo actualizar
    let campoActualizar = 'totalEfectivo';
    if (metodoKey === 'yape') campoActualizar = 'totalYape';
    else if (metodoKey === 'transferencia') campoActualizar = 'totalTransferencia';
    else if (metodoKey === 'tarjeta') campoActualizar = 'totalTarjeta';

    console.log(`💰 Revertiendo caja - Restando ${montoTotal} de ${campoActualizar}`);

    // Primero actualizamos la caja restando el monto
    cajaRef.transaction((data) => {
        if (data === null) return null;
        if (data[campoActualizar] !== undefined) {
            data[campoActualizar] = Math.max(0, (data[campoActualizar] || 0) - montoTotal);
        }
        return data;
    }).then(() => {
        // Después de actualizar la caja, eliminamos la venta y revertimos stock
        return refRaiz.update(actualizaciones);
    }).then(() => {
        mostrarAlertaVentas(`✅ Venta eliminada. Stock revertido y caja actualizada (se descontaron S/. ${montoTotal.toFixed(2)} de ${campoActualizar}).`, "success");
    }).catch((err) => { 
        console.error("Error al eliminar venta:", err); 
        mostrarAlertaVentas("Error al eliminar venta. Intente nuevamente.", "danger"); 
    });
}

// ==================================================
// SEGURIDAD PARA EDITAR VENTA
// ==================================================
function abrirModalSeguridadEditarVenta(idVenta) {
    ventaAEditarId = idVenta;
    const passInput = document.getElementById('passSeguridadEditarVenta');
    const errorDiv = document.getElementById('errorClaveEditarVenta');
    if (passInput) passInput.value = "";
    if (errorDiv) errorDiv.classList.add('d-none');
    
    const modalElement = document.getElementById('modalSeguridadEditarVenta');
    if (!modalElement) return;
    
    const modalInstance = new bootstrap.Modal(modalElement);
    modalInstance.show();
    setTimeout(() => { if (passInput) passInput.focus(); }, 300);
}

function cerrarModalSeguridadEditarVenta() {
    const modalElement = document.getElementById('modalSeguridadEditarVenta');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) modalInstance.hide();
    ventaAEditarId = null;
}

function verificarClaveYEditarVenta() {
    const claveIngresada = document.getElementById('passSeguridadEditarVenta').value;
    const errorDiv = document.getElementById('errorClaveEditarVenta');

    if (claveIngresada === CLAVE_SEGURIDAD_VENTAS) {
        if (errorDiv) errorDiv.classList.add('d-none');
        const modalElement = document.getElementById('modalSeguridadEditarVenta');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();
        
        setTimeout(() => {
            cargarVentaParaEditar(ventaAEditarId);
            ventaAEditarId = null;
        }, 400);
    } else {
        if (errorDiv) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = "❌ Clave incorrecta.";
        }
    }
}

function cargarVentaParaEditar(idVenta) {
    const venta = ventasAlmacen[idVenta];
    if (!venta) return;

    idVentaEnEdicion = idVenta;
    ventaEnEdicion = venta;
    cambiarVistaVentas('pos');

    setTimeout(() => {
        const numOrden = (venta.numeroOrden || '').replace(/^00/, '');
        if (document.getElementById('ventaNumeroOrden')) document.getElementById('ventaNumeroOrden').value = numOrden;
        if (document.getElementById('ventaDniCliente')) document.getElementById('ventaDniCliente').value = venta.dniCliente || '';
        if (document.getElementById('ventaNombreCliente')) document.getElementById('ventaNombreCliente').value = venta.nombreCliente || '';
        if (document.getElementById('ventaTelefonoCliente')) document.getElementById('ventaTelefonoCliente').value = venta.telefono || '';
        if (document.getElementById('ventaCorreoCliente')) document.getElementById('ventaCorreoCliente').value = venta.correo || '';
        if (document.getElementById('ventaMetodoPago')) document.getElementById('ventaMetodoPago').value = venta.metodoPago || 'Efectivo';

        const switchAdelanto = document.getElementById('switchAdelanto');
        if (switchAdelanto) {
            switchAdelanto.checked = venta.esAdelanto || false;
            alternarCamposAdelanto();
            if (venta.esAdelanto) {
                if (document.getElementById('ventaMontoAdelanto')) document.getElementById('ventaMontoAdelanto').value = venta.montoAdelantado || 0;
                if (document.getElementById('ventaFechaRecojo')) document.getElementById('ventaFechaRecojo').value = venta.fechaRecojo || '';
                if (document.getElementById('ventaHoraRecojo')) document.getElementById('ventaHoraRecojo').value = venta.horaRecojo || '';
            }
        }

        carritoVentaActual = [];
        if (venta.items) {
            venta.items.forEach(item => {
                carritoVentaActual.push({ codigo: item.codigo, nombre: item.nombre, precio: item.precio, cantidad: item.cantidad });
            });
        }
        renderizarTablaCarrito();

        const btnCobrar = document.getElementById('btnConfirmarCobroVenta');
        if (btnCobrar) {
            btnCobrar.innerHTML = `<i class="bi bi-pencil-fill me-2"></i> Actualizar Venta`;
            btnCobrar.className = 'btn btn-warning btn-lg w-100 fw-bold shadow-sm py-3';
            btnCobrar.onclick = function() { actualizarVentaExistente(); };
        }
    }, 500);
}

function actualizarVentaExistente() {
    if (!idVentaEnEdicion || !ventaEnEdicion) return;

    const numOrdenInput = document.getElementById('ventaNumeroOrden').value.trim();
    const dni = document.getElementById('ventaDniCliente').value.trim();
    const nombre = document.getElementById('ventaNombreCliente').value.trim();
    const metodo = document.getElementById('ventaMetodoPago').value;
    const switchAdelanto = document.getElementById('switchAdelanto');
    const inputMontoAdelanto = document.getElementById('ventaMontoAdelanto');
    const inputFechaRecojo = document.getElementById('ventaFechaRecojo');
    const inputHoraRecojo = document.getElementById('ventaHoraRecojo');
    const btnActualizar = document.getElementById('btnConfirmarCobroVenta');

    if (carritoVentaActual.length === 0 || !numOrdenInput || !nombre) {
        mostrarAlertaVentas("Complete los datos requeridos.", "warning");
        return;
    }

    let totalVenta = 0;
    carritoVentaActual.forEach(item => { totalVenta += item.precio * item.cantidad; });

    let esAdelanto = switchAdelanto ? switchAdelanto.checked : false;
    let montoAdelantado = esAdelanto ? parseFloat(inputMontoAdelanto.value || 0) : 0;
    let estadoVentaReal = esAdelanto ? "Adelanto" : "Pagado";

    const refVentas = obtenerReferenciaVentas();
    if (!refVentas) return;

    if (btnActualizar) {
        btnActualizar.disabled = true;
        btnActualizar.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Actualizando...`;
    }

    const ventaActualizada = {
        numeroOrden: "00" + numOrdenInput,
        dniCliente: dni || "00000000",
        nombreCliente: nombre,
        fecha: ventaEnEdicion.fecha || new Date().toISOString().split('T')[0],
        total: totalVenta,
        metodoPago: metodo,
        metodoPagoKey: obtenerKeyMetodoPago(metodo),
        esAdelanto: esAdelanto,
        montoAdelantado: montoAdelantado,
        saldoPendiente: totalVenta - montoAdelantado,
        fechaRecojo: esAdelanto ? inputFechaRecojo.value : "No aplica",
        horaRecojo: esAdelanto ? inputHoraRecojo.value : "No aplica",
        estado: estadoVentaReal,
        items: carritoVentaActual.map(item => ({ codigo: item.codigo, nombre: item.nombre, precio: item.precio, cantidad: item.cantidad })),
        actualizadoEn: new Date().toISOString()
    };

    refVentas.child(idVentaEnEdicion).update(ventaActualizada)
        .then(() => {
            mostrarAlertaVentas(`Venta #${numOrdenInput} actualizada correctamente.`, "success");
            if (btnActualizar) {
                btnActualizar.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> Confirmar y Cobrar Venta`;
                btnActualizar.className = 'btn btn-success btn-lg w-100 fw-bold shadow-sm py-3';
                btnActualizar.onclick = function() { procesarCobroVenta(); };
            }
            idVentaEnEdicion = null;
            ventaEnEdicion = null;
            carritoVentaActual = [];
            renderizarTablaCarrito();
        })
        .catch((err) => { console.error(err); mostrarAlertaVentas("Error al actualizar venta.", "danger"); })
        .finally(() => { if (btnActualizar) btnActualizar.disabled = false; });
}

// ==================================================
// VER DETALLE DE VENTA EN MODAL
// ==================================================
function verDetalleVenta(idVenta) {
    const venta = ventasAlmacen[idVenta];
    if (!venta) return;

    const contenedorDetalle = document.getElementById('contenidoDetalleVenta');
    let itemsHtml = "";
    if (venta.items) {
        venta.items.forEach(item => {
            itemsHtml += `
                <tr>
                    <td>${item.codigo}</td>
                    <td>${item.nombre}</td>
                    <td class="text-center">${item.cantidad}</td>
                    <td class="text-end">S/. ${(item.precio || 0).toFixed(2)}</td>
                    <td class="text-end">S/. ${((item.precio || 0) * item.cantidad).toFixed(2)}</td>
                </tr>
            `;
        });
    }

    let obsCambio = venta.observacionCambio ? `<div class="alert alert-info mt-3 mb-0 small"><i class="bi bi-info-circle-fill me-1"></i> ${venta.observacionCambio}</div>` : '';

    contenedorDetalle.innerHTML = `
        <div class="row mb-3">
            <div class="col-6">
                <h6 class="text-muted small fw-bold">N° DE ORDEN</h6>
                <p class="fw-bold fs-5 text-primary mb-0">${venta.numeroOrden || 'N/A'}</p>
            </div>
            <div class="col-6 text-end">
                <h6 class="text-muted small fw-bold">ESTADO</h6>
                <span class="badge text-bg-secondary fs-6">${venta.estado || 'Pendiente'}</span>
            </div>
        </div>
        <hr>
        <div class="row mb-3">
            <div class="col-6">
                <h6 class="text-muted small fw-bold">CLIENTE</h6>
                <p class="mb-0"><strong>${venta.nombreCliente || 'N/A'}</strong></p>
                <p class="small text-muted mb-0">DNI: ${venta.dniCliente || 'N/A'}</p>
            </div>
            <div class="col-6 text-end">
                <h6 class="text-muted small fw-bold">FECHA & PAGO</h6>
                <p class="mb-0">${venta.fecha || 'N/A'}</p>
                <p class="small text-muted mb-0">${venta.metodoPago || 'N/A'}</p>
            </div>
        </div>
        <hr>
        <h6 class="fw-bold text-dark mb-2">Productos</h6>
        <div class="table-responsive">
            <table class="table table-sm table-bordered mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th class="text-center">Cant.</th>
                        <th class="text-end">Precio</th>
                        <th class="text-end">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot class="table-light">
                    <tr>
                        <td colspan="4" class="text-end fw-bold">TOTAL</td>
                        <td class="text-end fw-bold text-primary">S/. ${(venta.total || 0).toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        ${obsCambio}
    `;

    const modalElement = document.getElementById('modalDetalleVenta');
    const modalInstance = new bootstrap.Modal(modalElement);
    modalInstance.show();
}

// ==================================================
// HELPER: ALERTAS EN VENTANA EMERGENTE (MODAL)
// ==================================================
function mostrarAlertaVentas(mensaje, tipo) {
    const modalEl = document.getElementById('modalAlertaVentas');
    if (!modalEl) return;

    const iconoEl = document.getElementById('iconoAlertaModalVentas');
    const tituloEl = document.getElementById('tituloAlertaModalVentas');
    const mensajeEl = document.getElementById('mensajeAlertaModalVentas');

    if (tipo === 'success') {
        iconoEl.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>';
        tituloEl.innerText = '¡Éxito!';
    } else if (tipo === 'danger') {
        iconoEl.innerHTML = '<i class="bi bi-x-circle-fill text-danger"></i>';
        tituloEl.innerText = 'Atención / Error';
    } else {
        iconoEl.innerHTML = '<i class="bi bi-exclamation-triangle-fill text-warning"></i>';
        tituloEl.innerText = 'Advertencia';
    }

    mensajeEl.innerHTML = mensaje;
    const modalInstance = new bootstrap.Modal(modalEl);
    modalInstance.show();
}

// ==================================================
// CONFIGURAR EVENTOS DE LOS MODALES
// ==================================================
document.addEventListener('DOMContentLoaded', function() {
    const btnEliminar = document.getElementById('btnVerificarYConfirmarEliminar');
    if (btnEliminar) {
        btnEliminar.addEventListener('click', function(e) {
            e.preventDefault();
            verificarClaveYEliminarVenta();
        });
    }
    
    const btnEditar = document.getElementById('btnVerificarYConfirmarEditar');
    if (btnEditar) {
        btnEditar.addEventListener('click', function(e) {
            e.preventDefault();
            verificarClaveYEditarVenta();
        });
    }
});