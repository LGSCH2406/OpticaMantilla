// ==========================================================================
// PANEL DE CONTROL - ÓPTICA MANTILLA (dashboard.js)
// Vinculación completa con todos los módulos JS de la aplicación
// ==========================================================================

// Variables globales para guardar las instancias de las gráficas
let graficaVentasSemanales = null;
let graficaEstadoCitas = null;
let graficaTopProductos = null;
let graficaEvolucionDiaria = null; // Nueva gráfica para evolución diaria

// Variable para el listener de caja en tiempo real
let cajaListener = null;

// Fecha seleccionada para el dashboard (por defecto hoy)
let fechaDashboard = new Date().toISOString().split('T')[0];

function cargarModulo() {
    const contenedor = document.getElementById('contenidoDinamico');
    if (!contenedor) return;

    if (typeof resaltarItemMenu === 'function') resaltarItemMenu('nav-dashboard');

    contenedor.innerHTML = `
        <div class="animate__animated animate__fadeIn">
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <h2 class="fw-bold mb-1 text-dark">Panel de Control</h2>
                    <p class="text-muted mb-0">Estadísticas y control de caja en tiempo real.</p>
                </div>
                <div class="d-flex gap-2 flex-wrap">
                    <!-- SELECTOR DE FECHA -->
                    <div class="input-group" style="max-width: 220px;">
                        <span class="input-group-text bg-light border-end-0">
                            <i class="bi bi-calendar3 text-muted"></i>
                        </span>
                        <input type="date" id="selectorFechaDashboard" class="form-control bg-light border-start-0" 
                               value="${fechaDashboard}" style="border-radius: 0 8px 8px 0;">
                    </div>
                    <button class="btn btn-outline-secondary btn-sm" onclick="aplicarFechaDashboard()" style="border-radius: 8px;">
                        <i class="bi bi-check2 me-1"></i> Aplicar
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="resetearFechaDashboard()" style="border-radius: 8px;" title="Volver a hoy">
                        <i class="bi bi-calendar-week me-1"></i> Hoy
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="cargarModulo()" style="border-radius: 8px;">
                        <i class="bi bi-arrow-clockwise me-1"></i> Recargar
                    </button>
                </div>
            </div>

            <!-- INDICADOR DE FECHA SELECCIONADA -->
            <div class="mb-3">
                <span class="badge bg-light text-dark border px-3 py-2">
                    <i class="bi bi-calendar-event me-1"></i> 
                    Mostrando datos para: <strong id="fechaMostradaDashboard">${formatFechaMostrar(fechaDashboard)}</strong>
                </span>
                <span id="badgeDiferenciaFecha" class="badge bg-secondary ms-2 px-3 py-2 d-none">
                    <i class="bi bi-clock-history me-1"></i> 
                    <span id="textoDiferenciaFecha"></span>
                </span>
            </div>

            <!-- TARJETAS DE CAJA (5 TARJETAS) -->
            <div class="row g-3 mb-4">
                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm p-3 h-100 bg-white border-start border-4 border-success">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">💰 Dinero en Caja</h6>
                                <h3 class="fw-bold mb-0 text-success" id="montoTotalCaja">S/ 0.00</h3>
                            </div>
                            <div class="bg-success bg-opacity-10 p-3 rounded text-success">
                                <i class="bi bi-cash-stack fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm p-3 h-100 bg-white border-start border-4 border-primary">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">💵 Ventas en Efectivo</h6>
                                <h3 class="fw-bold mb-0 text-primary" id="montoEfectivoCaja">S/ 0.00</h3>
                            </div>
                            <div class="bg-primary bg-opacity-10 p-3 rounded text-primary">
                                <i class="bi bi-cash-coin fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm p-3 h-100 bg-white border-start border-4 border-info">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">📱 Yape</h6>
                                <h3 class="fw-bold mb-0 text-info" id="montoYapeCaja">S/ 0.00</h3>
                            </div>
                            <div class="bg-info bg-opacity-10 p-3 rounded text-info">
                                <i class="bi bi-phone fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm p-3 h-100 bg-white border-start border-4 border-warning">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">🏦 Transferencia</h6>
                                <h3 class="fw-bold mb-0 text-warning" id="montoTransferenciaCaja">S/ 0.00</h3>
                            </div>
                            <div class="bg-warning bg-opacity-10 p-3 rounded text-warning">
                                <i class="bi bi-bank fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm p-3 h-100 bg-white border-start border-4 border-secondary">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">💳 Tarjeta</h6>
                                <h3 class="fw-bold mb-0 text-secondary" id="montoTarjetaCaja">S/ 0.00</h3>
                            </div>
                            <div class="bg-secondary bg-opacity-10 p-3 rounded text-secondary">
                                <i class="bi bi-credit-card fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-12 mt-2 d-flex align-items-center justify-content-end">
                    <button class="btn btn-danger btn-lg fw-bold px-4 shadow-sm" onclick="cerrarCajaActual()" style="border-radius: 8px;">
                        <i class="bi bi-door-closed-fill me-2"></i>Cerrar Caja del Día
                    </button>
                </div>
            </div>

            <!-- TARJETAS KPI (INDICADORES CLAVE) -->
            <div class="row g-3 mb-4" id="contenedorKPIs">
                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm p-3 h-100 bg-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">Ventas (fecha selec.)</h6>
                                <h3 class="fw-bold mb-0 text-primary" id="kpiVentasFecha">S/. 0.00</h3>
                            </div>
                            <div class="bg-primary bg-opacity-10 p-3 rounded text-primary">
                                <i class="bi bi-cash-coin fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm p-3 h-100 bg-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">Stock Crítico</h6>
                                <h3 class="fw-bold mb-0 text-danger" id="kpiStockCritico">0</h3>
                            </div>
                            <div class="bg-danger bg-opacity-10 p-3 rounded text-danger">
                                <i class="bi bi-exclamation-triangle fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm p-3 h-100 bg-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">Citas (fecha selec.)</h6>
                                <h3 class="fw-bold mb-0 text-success" id="kpiCitasFecha">0</h3>
                            </div>
                            <div class="bg-success bg-opacity-10 p-3 rounded text-success">
                                <i class="bi bi-calendar-check fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm p-3 h-100 bg-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">Clientes Activos</h6>
                                <h3 class="fw-bold mb-0 text-dark" id="kpiTotalClientes">0</h3>
                            </div>
                            <div class="bg-secondary bg-opacity-10 p-3 rounded text-secondary">
                                <i class="bi bi-people fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- GRÁFICAS PRINCIPALES -->
            <div class="row g-4 mb-4">
                <!-- Gráfica 1: Evolución Diaria (NUEVA) -->
                <div class="col-12 col-lg-8">
                    <div class="card border-0 shadow-sm p-4 bg-white">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h5 class="fw-bold mb-0 text-dark">
                                <i class="bi bi-graph-up-arrow me-2 text-success"></i>
                                Evolución de Ventas
                            </h5>
                            <span class="text-muted small" id="periodoGrafica">Últimos 7 días</span>
                        </div>
                        <div style="height: 280px;">
                            <canvas id="graficaEvolucionDiaria"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Gráfica 2: Estado de Citas -->
                <div class="col-12 col-lg-4">
                    <div class="card border-0 shadow-sm p-4 bg-white h-100">
                        <h5 class="fw-bold mb-3 text-dark"><i class="bi bi-pie-chart me-2 text-primary"></i>Estado de Citas</h5>
                        <div style="height: 250px;">
                            <canvas id="graficaEstadoCitas"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- GRÁFICA 3 Y ALERTAS -->
            <div class="row g-4">
                <div class="col-12 col-lg-6">
                    <div class="card border-0 shadow-sm p-4 bg-white">
                        <h5 class="fw-bold mb-3 text-dark"><i class="bi bi-trophy me-2 text-warning"></i>Top 5 Productos Más Vendidos</h5>
                        <div style="height: 250px;">
                            <canvas id="graficaTopProductos"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="card border-0 shadow-sm p-4 bg-white">
                        <h5 class="fw-bold mb-3 text-dark"><i class="bi bi-exclamation-octagon me-2 text-danger"></i>Alertas de Inventario</h5>
                        <div id="listaAlertasStock" class="list-group list-group-flush" style="max-height: 250px; overflow-y: auto;">
                            <div class="text-muted small py-3 text-center">Cargando alertas de stock...</div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;

    // Iniciar la carga de datos y gráficas
    inicializarDashboard();

    // Event listener para el selector de fecha (Enter para aplicar)
    document.getElementById('selectorFechaDashboard')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            aplicarFechaDashboard();
        }
    });
}

// ==========================================================================
// FUNCIÓN PARA FORMATO DE FECHA EN ESPAÑOL
// ==========================================================================

function formatFechaMostrar(fechaStr) {
    if (!fechaStr) return 'Hoy';
    try {
        const partes = fechaStr.split('-');
        const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return fecha.toLocaleDateString('es-PE', opciones);
    } catch (e) {
        return fechaStr;
    }
}

function calcularDiferenciaDias(fechaStr) {
    if (!fechaStr) return 0;
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const partes = fechaStr.split('-');
        const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
        fecha.setHours(0, 0, 0, 0);
        const diff = Math.floor((hoy - fecha) / (1000 * 60 * 60 * 24));
        return diff;
    } catch (e) {
        return 0;
    }
}

// ==========================================================================
// FUNCIONES PARA EL SELECTOR DE FECHA
// ==========================================================================

function aplicarFechaDashboard() {
    const input = document.getElementById('selectorFechaDashboard');
    if (input && input.value) {
        fechaDashboard = input.value;
        actualizarBadgeFecha();
        // Re-cargar datos del dashboard con la nueva fecha
        recargarDatosDashboard(fechaDashboard);
    }
}

function resetearFechaDashboard() {
    const hoy = new Date().toISOString().split('T')[0];
    fechaDashboard = hoy;
    const input = document.getElementById('selectorFechaDashboard');
    if (input) input.value = hoy;
    actualizarBadgeFecha();
    recargarDatosDashboard(hoy);
}

function actualizarBadgeFecha() {
    const fechaMostrada = document.getElementById('fechaMostradaDashboard');
    if (fechaMostrada) {
        fechaMostrada.textContent = formatFechaMostrar(fechaDashboard);
    }
    
    const badgeDiff = document.getElementById('badgeDiferenciaFecha');
    const textoDiff = document.getElementById('textoDiferenciaFecha');
    if (badgeDiff && textoDiff) {
        const diff = calcularDiferenciaDias(fechaDashboard);
        if (diff === 0) {
            badgeDiff.classList.add('d-none');
        } else {
            badgeDiff.classList.remove('d-none');
            if (diff === 1) {
                textoDiff.textContent = 'Ayer';
            } else if (diff > 1) {
                textoDiff.textContent = `Hace ${diff} días`;
            } else {
                textoDiff.textContent = `Futuro (${Math.abs(diff)} días)`;
            }
        }
    }
}

// ==========================================================================
// RECARGAR DATOS CON FECHA SELECCIONADA
// ==========================================================================

function recargarDatosDashboard(fecha) {
    // Actualizar caja (si es hoy, datos en tiempo real; si es otra fecha, datos históricos)
    actualizarVistaDashboardCaja(fecha);

    // Obtener referencias
    const refVentas = typeof obtenerReferenciaVentas === 'function' ? obtenerReferenciaVentas() : null;
    const refInventario = typeof obtenerReferenciaInventario === 'function' ? obtenerReferenciaInventario() : null;
    const refCitas = typeof obtenerReferenciaCitas === 'function' ? obtenerReferenciaCitas() : null;
    const refClientes = typeof obtenerReferenciaClientes === 'function' ? obtenerReferenciaClientes() : null;

    if (!refVentas || !refInventario || !refCitas || !refClientes) {
        return;
    }

    // Cargar datos con la fecha específica
    refVentas.once('value').then(snapshot => {
        const ventas = snapshot.val() || {};
        calcularKPIVentas(ventas, fecha);
        renderizarGraficaEvolucionDiaria(ventas, fecha);
        renderizarGraficaTopProductos(ventas);
    });

    refCitas.once('value').then(snapshot => {
        const citas = snapshot.val() || {};
        calcularKPICitasFecha(citas, fecha);
        renderizarGraficaEstadoCitas(citas);
    });

    refInventario.once('value').then(snapshot => {
        const inventario = snapshot.val() || {};
        calcularKPIStockCritico(inventario);
        renderizarAlertasStock(inventario);
    });

    refClientes.once('value').then(snapshot => {
        const clientes = snapshot.val() || {};
        const elemento = document.getElementById('kpiTotalClientes');
        if (elemento) elemento.innerText = Object.keys(clientes).length;
    });
}

// ==========================================================================
// LÓGICA PRINCIPAL DEL DASHBOARD (MODIFICADA)
// ==========================================================================

function inicializarDashboard() {
    // Actualizar badge de fecha
    actualizarBadgeFecha();

    // Cargar datos de caja
    actualizarVistaDashboardCaja(fechaDashboard);

    // Obtener referencias
    const refVentas = typeof obtenerReferenciaVentas === 'function' ? obtenerReferenciaVentas() : null;
    const refInventario = typeof obtenerReferenciaInventario === 'function' ? obtenerReferenciaInventario() : null;
    const refCitas = typeof obtenerReferenciaCitas === 'function' ? obtenerReferenciaCitas() : null;
    const refClientes = typeof obtenerReferenciaClientes === 'function' ? obtenerReferenciaClientes() : null;

    if (!refVentas || !refInventario || !refCitas || !refClientes) {
        const contenedorKPIs = document.getElementById('contenedorKPIs');
        if (contenedorKPIs) {
            contenedorKPIs.innerHTML = `
                <div class="col-12 text-center text-danger py-4">
                    <i class="bi bi-wifi-off fs-2 d-block mb-2"></i>
                    No se pudo conectar con la base de datos para cargar el Dashboard.
                </div>
            `;
        }
        return;
    }

    // Sincronización en tiempo real de Ventas (para la gráfica de evolución)
    refVentas.on('value', (snapshot) => {
        const ventas = snapshot.val() || {};
        calcularKPIVentas(ventas, fechaDashboard);
        renderizarGraficaEvolucionDiaria(ventas, fechaDashboard);
        renderizarGraficaTopProductos(ventas);
    });

    // Sincronización en tiempo real de Inventario
    refInventario.on('value', (snapshot) => {
        const inventario = snapshot.val() || {};
        calcularKPIStockCritico(inventario);
        renderizarAlertasStock(inventario);
    });

    // Sincronización en tiempo real de Citas
    refCitas.on('value', (snapshot) => {
        const citas = snapshot.val() || {};
        calcularKPICitasFecha(citas, fechaDashboard);
        renderizarGraficaEstadoCitas(citas);
    });

    // Sincronización en tiempo real de Clientes
    refClientes.on('value', (snapshot) => {
        const clientes = snapshot.val() || {};
        const elemento = document.getElementById('kpiTotalClientes');
        if (elemento) elemento.innerText = Object.keys(clientes).length;
    });
}

// ==========================================================================
// LÓGICA DE CAJA (CON FECHA SELECCIONABLE)
// ==========================================================================

function actualizarVistaDashboardCaja(fecha) {
    // Si no se pasa fecha, usar hoy
    const fechaUsar = fecha || new Date().toISOString().split('T')[0];
    const cajaRef = firebase.database().ref('cajas/' + fechaUsar);
    
    // Remover listener anterior para evitar duplicados
    if (cajaListener) {
        cajaRef.off('value', cajaListener);
    }

    cajaListener = cajaRef.on('value', (snapshot) => {
        const totalEl = document.getElementById('montoTotalCaja');
        const efectivoEl = document.getElementById('montoEfectivoCaja');
        const yapeEl = document.getElementById('montoYapeCaja');
        const transferenciaEl = document.getElementById('montoTransferenciaCaja');
        const tarjetaEl = document.getElementById('montoTarjetaCaja');
        
        let totalEfectivo = 0;
        let totalYape = 0;
        let totalTransferencia = 0;
        let totalTarjeta = 0;
        let totalGeneral = 0;
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            totalEfectivo = data.totalEfectivo || 0;
            totalYape = data.totalYape || 0;
            totalTransferencia = data.totalTransferencia || 0;
            totalTarjeta = data.totalTarjeta || 0;
            totalGeneral = totalEfectivo + totalYape + totalTransferencia + totalTarjeta;
        }
        
        if (totalEl) totalEl.innerText = 'S/ ' + totalGeneral.toFixed(2);
        if (efectivoEl) efectivoEl.innerText = 'S/ ' + totalEfectivo.toFixed(2);
        if (yapeEl) yapeEl.innerText = 'S/ ' + totalYape.toFixed(2);
        if (transferenciaEl) transferenciaEl.innerText = 'S/ ' + totalTransferencia.toFixed(2);
        if (tarjetaEl) tarjetaEl.innerText = 'S/ ' + totalTarjeta.toFixed(2);
    }, (error) => {
        console.error('❌ Error al escuchar caja:', error);
    });
}

// ==========================================================================
// CÁLCULOS DE KPI (ACTUALIZADOS PARA FECHA SELECCIONADA)
// ==========================================================================

function calcularKPIVentas(ventas, fecha) {
    const elemento = document.getElementById('kpiVentasFecha');
    if (!elemento) return;

    const fechaUsar = fecha || new Date().toISOString().split('T')[0];
    let totalFecha = 0;

    Object.values(ventas).forEach(venta => {
        if (venta.fecha === fechaUsar) {
            totalFecha += parseFloat(venta.total) || 0;
        }
    });

    elemento.innerText = `S/. ${totalFecha.toFixed(2)}`;
    
    // También actualizar el KPI "Ventas Hoy" para compatibilidad
    const kpiVentasHoy = document.getElementById('kpiVentasHoy');
    if (kpiVentasHoy) {
        const hoy = new Date().toISOString().split('T')[0];
        let totalHoy = 0;
        Object.values(ventas).forEach(venta => {
            if (venta.fecha === hoy) {
                totalHoy += parseFloat(venta.total) || 0;
            }
        });
        kpiVentasHoy.innerText = `S/. ${totalHoy.toFixed(2)}`;
    }
}

function calcularKPICitasFecha(citas, fecha) {
    const elemento = document.getElementById('kpiCitasFecha');
    if (!elemento) return;

    const fechaUsar = fecha || new Date().toISOString().split('T')[0];
    let contador = 0;
    Object.values(citas).forEach(cita => {
        if (cita.fecha === fechaUsar) {
            contador++;
        }
    });
    elemento.innerText = contador;
    
    // Actualizar también el KPI "Citas Hoy" para compatibilidad
    const kpiCitasHoy = document.getElementById('kpiCitasHoy');
    if (kpiCitasHoy) {
        const hoy = new Date().toISOString().split('T')[0];
        let contHoy = 0;
        Object.values(citas).forEach(cita => {
            if (cita.fecha === hoy) {
                contHoy++;
            }
        });
        kpiCitasHoy.innerText = contHoy;
    }
}

function calcularKPIStockCritico(inventario) {
    const elemento = document.getElementById('kpiStockCritico');
    if (!elemento) return;

    let contador = 0;
    Object.values(inventario).forEach(prod => {
        if ((parseInt(prod.stock) || 0) <= 3) {
            contador++;
        }
    });
    elemento.innerText = contador;
}

// ==========================================================================
// NUEVA GRÁFICA: EVOLUCIÓN DIARIA (CON FECHA SELECCIONADA COMO REFERENCIA)
// ==========================================================================

function renderizarGraficaEvolucionDiaria(ventas, fechaReferencia) {
    const canvas = document.getElementById('graficaEvolucionDiaria');
    if (!canvas) return;

    const fechaRef = fechaReferencia || new Date().toISOString().split('T')[0];
    const partes = fechaRef.split('-');
    const fechaBase = new Date(partes[0], partes[1] - 1, partes[2]);

    // Mostrar 7 días (3 antes, el día seleccionado, 3 después)
    const dias = [];
    const fechas = [];
    const labels = [];
    
    for (let i = -3; i <= 3; i++) {
        const fecha = new Date(fechaBase);
        fecha.setDate(fecha.getDate() + i);
        const fechaStr = fecha.toISOString().split('T')[0];
        fechas.push(fechaStr);
        labels.push(fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }));
    }

    const totals = fechas.map(fecha => {
        let totalDia = 0;
        Object.values(ventas).forEach(venta => {
            if (venta.fecha === fecha) {
                totalDia += parseFloat(venta.total) || 0;
            }
        });
        return totalDia;
    });

    const ctx = canvas.getContext('2d');

    if (graficaEvolucionDiaria) {
        graficaEvolucionDiaria.destroy();
    }

    // Color de fondo según si es el día seleccionado
    const coloresFondo = fechas.map(f => f === fechaRef ? 'rgba(14, 165, 233, 0.9)' : 'rgba(14, 165, 233, 0.5)');
    const coloresBorde = fechas.map(f => f === fechaRef ? 'rgba(14, 165, 233, 1)' : 'rgba(14, 165, 233, 0.7)');

    graficaEvolucionDiaria = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventas (S/.)',
                data: totals,
                backgroundColor: coloresFondo,
                borderColor: coloresBorde,
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'S/. ' + context.raw.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: function(value) { return 'S/.' + value.toFixed(2); } }
                }
            }
        }
    });

    // Actualizar etiqueta del período
    const periodoEl = document.getElementById('periodoGrafica');
    if (periodoEl) {
        const fechaMostrar = formatFechaMostrar(fechaRef);
        periodoEl.textContent = `Referencia: ${fechaMostrar}`;
    }
}

// ==========================================================================
// GRÁFICA 2: ESTADO DE CITAS (DONUT) - SIN CAMBIOS
// ==========================================================================

function renderizarGraficaEstadoCitas(citas) {
    const canvas = document.getElementById('graficaEstadoCitas');
    if (!canvas) return;

    let pendientes = 0, confirmadas = 0, completadas = 0, canceladas = 0;

    Object.values(citas).forEach(cita => {
        const est = cita.estado || 'Pendiente';
        if (est === 'Pendiente') pendientes++;
        else if (est === 'Confirmada') confirmadas++;
        else if (est === 'Completada') completadas++;
        else if (est === 'Cancelada') canceladas++;
    });

    const ctx = canvas.getContext('2d');

    if (graficaEstadoCitas) {
        graficaEstadoCitas.destroy();
    }

    graficaEstadoCitas = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pendientes', 'Confirmadas', 'Completadas', 'Canceladas'],
            datasets: [{
                data: [pendientes, confirmadas, completadas, canceladas],
                backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: { size: 11 }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// ==========================================================================
// GRÁFICA 3: TOP 5 PRODUCTOS MÁS VENDIDOS - SIN CAMBIOS
// ==========================================================================

function renderizarGraficaTopProductos(ventas) {
    const canvas = document.getElementById('graficaTopProductos');
    if (!canvas) return;

    const conteoProductos = {};

    Object.values(ventas).forEach(venta => {
        if (venta.items) {
            venta.items.forEach(item => {
                const nombre = item.nombre || item.codigo || 'Producto';
                const cantidad = parseInt(item.cantidad) || 1;
                conteoProductos[nombre] = (conteoProductos[nombre] || 0) + cantidad;
            });
        }
    });

    const top5 = Object.entries(conteoProductos)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const labels = top5.map(item => item[0]);
    const datos = top5.map(item => item[1]);

    const ctx = canvas.getContext('2d');

    if (graficaTopProductos) {
        graficaTopProductos.destroy();
    }

    if (labels.length === 0) {
        const parent = canvas.parentElement;
        if (parent) {
            parent.innerHTML = `
                <div class="text-center text-muted small py-4">Aún no hay suficientes datos de ventas para mostrar el top de productos.</div>
            `;
        }
        return;
    }

    graficaTopProductos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Unidades Vendidas',
                data: datos,
                backgroundColor: 'rgba(251, 191, 36, 0.7)',
                borderColor: 'rgba(251, 191, 36, 1)',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// ==========================================================================
// ALERTAS DE INVENTARIO - SIN CAMBIOS
// ==========================================================================

function renderizarAlertasStock(inventario) {
    const contenedor = document.getElementById('listaAlertasStock');
    if (!contenedor) return;

    const productosCriticos = Object.entries(inventario)
        .filter(([key, prod]) => (parseInt(prod.stock) || 0) <= 3)
        .sort((a, b) => a[1].stock - b[1].stock);

    if (productosCriticos.length === 0) {
        contenedor.innerHTML = `
            <div class="text-center text-success small py-3">
                <i class="bi bi-check-circle-fill me-1"></i> ¡Todo el inventario está con stock suficiente!
            </div>
        `;
        return;
    }

    let html = '';
    productosCriticos.forEach(([codigo, prod]) => {
        const stock = parseInt(prod.stock) || 0;
        const claseAlerta = stock === 0 ? 'list-group-item-danger' : 'list-group-item-warning';
        
        html += `
            <div class="list-group-item ${claseAlerta} d-flex justify-content-between align-items-center py-2">
                <div>
                    <span class="fw-bold small">${prod.nombre}</span>
                    <br><span class="text-muted small">Código: ${codigo}</span>
                </div>
                <span class="badge bg-danger rounded-pill">Stock: ${stock}</span>
            </div>
        `;
    });

    contenedor.innerHTML = html;
}

// ==========================================================================
// CIERRE DE CAJA (ACTUALIZADO PARA USAR LA FECHA SELECCIONADA O HOY)
// ==========================================================================

window.cerrarCajaActual = function() {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const cajaRef = firebase.database().ref('cajas/' + fechaHoy);

    cajaRef.once('value').then((snapshot) => {
        const caja = snapshot.val();
        if (!caja || caja.estado === 'cerrada') {
            alert("No hay una caja abierta para cerrar hoy.");
            return;
        }

        const montoInicial = caja.apertura?.monto || caja.montoInicial || 0;
        const totalEfectivo = caja.totalEfectivo || 0;
        const totalYape = caja.totalYape || 0;
        const totalTransferencia = caja.totalTransferencia || 0;
        const totalTarjeta = caja.totalTarjeta || 0;
        const totalFinal = totalEfectivo + totalYape + totalTransferencia + totalTarjeta;
        const gananciaDelDia = totalFinal - montoInicial;

        const cuerpoResumen = document.getElementById('cuerpoResumenCierre');
        if (cuerpoResumen) {
            cuerpoResumen.innerHTML = `
                <div class="d-flex justify-content-between mb-2">
                    <span class="text-muted">Monto Inicial:</span>
                    <span class="fw-bold">S/ ${montoInicial.toFixed(2)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span class="text-muted">Total en Efectivo:</span>
                    <span class="fw-bold text-success">S/ ${totalEfectivo.toFixed(2)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span class="text-muted">Yape:</span>
                    <span class="fw-bold text-info">S/ ${totalYape.toFixed(2)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span class="text-muted">Transferencia:</span>
                    <span class="fw-bold text-warning">S/ ${totalTransferencia.toFixed(2)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span class="text-muted">Tarjeta:</span>
                    <span class="fw-bold text-secondary">S/ ${totalTarjeta.toFixed(2)}</span>
                </div>
                <hr class="my-2">
                <div class="d-flex justify-content-between mb-2">
                    <span class="fw-bold text-dark">Total Final en Caja:</span>
                    <span class="fw-bold text-dark">S/ ${totalFinal.toFixed(2)}</span>
                </div>
                <div class="d-flex justify-content-between">
                    <span class="fw-bold text-primary">Ganancia del Día:</span>
                    <span class="fw-bold text-primary">S/ ${gananciaDelDia.toFixed(2)}</span>
                </div>
            `;
        }

        const modalEl = document.getElementById('modalConfirmarCierre');
        if (modalEl) {
            const modalCierre = new bootstrap.Modal(modalEl);
            modalCierre.show();

            const btnAceptar = document.getElementById('btnAceptarCierreModal');
            if (btnAceptar) {
                btnAceptar.onclick = function() {
                    modalCierre.hide();
                    ejecutarCierreCajaLogica(cajaRef, caja, totalFinal, gananciaDelDia);
                };
            }
        }
    }).catch((error) => {
        console.error('❌ Error al obtener datos de caja:', error);
        alert('Error al obtener datos de caja: ' + error.message);
    });
};

// La función ejecutarCierreCajaLogica permanece igual
function ejecutarCierreCajaLogica(cajaRef, caja, totalFinal, gananciaDelDia) {
    cajaRef.update({
        estado: 'cerrada',
        cierre: {
            montoFinal: totalFinal,
            gananciaDelDia: gananciaDelDia,
            fecha: new Date().toISOString(),
            cerradoPor: JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}').nombre || 'Sistema'
        }
    }).then(() => {
        if (typeof window.registrarAccionHistorial === 'function') {
            const usuarioLog = JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}');
            window.registrarAccionHistorial(
                'cierre_caja',
                `Cierre de caja - Total: S/. ${totalFinal.toFixed(2)} - Ganancia: S/. ${gananciaDelDia.toFixed(2)}`,
                { total: totalFinal, ganancia: gananciaDelDia },
                'caja'
            );
        }

        const finanzasRef = firebase.database().ref('finanzasGenerales');
        finanzasRef.transaction((data) => {
            if (data === null) {
                return { totalAcumulado: totalFinal };
            }
            data.totalAcumulado = (data.totalAcumulado || 0) + totalFinal;
            return data;
        });

        if (cajaListener) {
            cajaRef.off('value', cajaListener);
        }

        const totalCajaEl = document.getElementById('totalCajaCierre');
        const gananciaEl = document.getElementById('gananciaCierre');
        
        if (totalCajaEl) totalCajaEl.innerText = `S/ ${totalFinal.toFixed(2)}`;
        if (gananciaEl) gananciaEl.innerText = `S/ ${gananciaDelDia.toFixed(2)}`;

        const modalResultadoEl = document.getElementById('modalResultadoCierre');
        if (modalResultadoEl) {
            const modalResultado = new bootstrap.Modal(modalResultadoEl);
            modalResultado.show();

            const btnContinuar = document.getElementById('btnContinuarCierre');
            if (btnContinuar) {
                btnContinuar.onclick = function() {
                    modalResultado.hide();
                    if (typeof cargarModulo === 'function') {
                        cargarModulo();
                    }
                };
            }
        } else if (typeof cargarModulo === 'function') {
            cargarModulo();
        }
    }).catch((error) => {
        console.error('❌ Error al cerrar caja:', error);
        alert('Error al cerrar caja: ' + error.message);
    });
}
