// ==========================================================================
// PANEL DE CONTROL - ÓPTICA MANTILLA (dashboard.js)
// Vinculación completa con todos los módulos JS de la aplicación
// ==========================================================================

// Variables globales para guardar las instancias de las gráficas
let graficaVentasSemanales = null;
let graficaEstadoCitas = null;
let graficaTopProductos = null;

// Variable para el listener de caja en tiempo real
let cajaListener = null;

function cargarModulo() {
    const contenedor = document.getElementById('contenidoDinamico');
    if (!contenedor) return;

    if (typeof resaltarItemMenu === 'function') resaltarItemMenu('nav-dashboard');

    contenedor.innerHTML = `
        <div class="animate__animated animate__fadeIn">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="fw-bold mb-1 text-dark">Panel de Control</h2>
                    <p class="text-muted mb-0">Estadísticas y control de caja en tiempo real.</p>
                </div>
                <button class="btn btn-outline-secondary btn-sm" onclick="cargarModulo()">
                    <i class="bi bi-arrow-clockwise me-1"></i> Recargar Datos
                </button>
            </div>

            <!-- TARJETAS DE CAJA (NUEVAS) -->
            <div class="row g-3 mb-4">
                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm p-3 h-100 bg-white border-start border-4 border-success">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">Efectivo en Caja</h6>
                                <h3 class="fw-bold mb-0 text-success" id="montoEfectivoCaja">S/ 0.00</h3>
                            </div>
                            <div class="bg-success bg-opacity-10 p-3 rounded text-success">
                                <i class="bi bi-cash-coin fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm p-3 h-100 bg-white border-start border-4 border-info">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">Yape / Transferencia</h6>
                                <h3 class="fw-bold mb-0 text-info" id="montoYapeCaja">S/ 0.00</h3>
                            </div>
                            <div class="bg-info bg-opacity-10 p-3 rounded text-info">
                                <i class="bi bi-phone fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BOTÓN CERRAR CAJA -->
                <div class="col-12 col-lg-6 d-flex align-items-center justify-content-end">
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
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">Ventas Hoy</h6>
                                <h3 class="fw-bold mb-0 text-primary" id="kpiVentasHoy">S/. 0.00</h3>
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
                                <h6 class="text-muted text-uppercase small fw-bold mb-1">Citas Hoy</h6>
                                <h3 class="fw-bold mb-0 text-success" id="kpiCitasHoy">0</h3>
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
                <!-- Gráfica 1: Ventas Semanales -->
                <div class="col-12 col-lg-8">
                    <div class="card border-0 shadow-sm p-4 bg-white">
                        <h5 class="fw-bold mb-3 text-dark"><i class="bi bi-graph-up-arrow me-2 text-success"></i>Ventas de los últimos 7 días</h5>
                        <div style="height: 280px;">
                            <canvas id="graficaVentasSemanales"></canvas>
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

            <!-- GRÁFICA 3 Y PRODUCTOS MÁS VENDIDOS -->
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
}

// ==========================================================================
// LÓGICA PRINCIPAL DEL DASHBOARD
// ==========================================================================

function inicializarDashboard() {
    // Cargar datos de caja en tiempo real
    actualizarVistaDashboardCaja();

    // Obtenemos referencias de los nodos raíz usando las funciones existentes
    const refVentas = typeof obtenerReferenciaVentas === 'function' ? obtenerReferenciaVentas() : null;
    const refInventario = typeof obtenerReferenciaInventario === 'function' ? obtenerReferenciaInventario() : null;
    const refCitas = typeof obtenerReferenciaCitas === 'function' ? obtenerReferenciaCitas() : null;
    const refClientes = typeof obtenerReferenciaClientes === 'function' ? obtenerReferenciaClientes() : null;

    // Si no hay conexión, mostramos error
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

    // Sincronización en tiempo real de Ventas
    refVentas.on('value', (snapshot) => {
        const ventas = snapshot.val() || {};
        calcularKPIVentas(ventas);
        renderizarGraficaVentasSemanales(ventas);
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
        calcularKPICitasHoy(citas);
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
// LÓGICA DE CAJA (NUEVO - MONTO EN TIEMPO REAL)
// ==========================================================================

function actualizarVistaDashboardCaja() {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const cajaRef = firebase.database().ref('cajas/' + fechaHoy);
    
    // Remover listener anterior para evitar duplicados
    if (cajaListener) {
        cajaRef.off('value', cajaListener);
    }

    cajaListener = cajaRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const efectivoEl = document.getElementById('montoEfectivoCaja');
            const yapeEl = document.getElementById('montoYapeCaja');
            
            if (efectivoEl) efectivoEl.innerText = 'S/ ' + (data.totalEfectivo || 0).toFixed(2);
            if (yapeEl) yapeEl.innerText = 'S/ ' + (data.totalYape || 0).toFixed(2);
        }
    });
}

// ==========================================================================
// LÓGICA PARA CERRAR CAJA Y SUMAR AL ACUMULADO (NUEVO)
// ==========================================================================

window.cerrarCajaActual = function() {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const cajaRef = firebase.database().ref('cajas/' + fechaHoy);

    if (!confirm("⚠️ ¿Estás seguro de cerrar la caja del día? Esto guardará el total en las finanzas generales y no podrás modificarlo.")) return;

    cajaRef.once('value').then((snapshot) => {
        const caja = snapshot.val();
        if (!caja || caja.estado === 'cerrada') {
            alert("No hay una caja abierta para cerrar hoy.");
            return;
        }

        // Calcular total general de la caja
        const totalFinal = (caja.totalEfectivo || 0) + (caja.totalYape || 0);
        const montoInicial = caja.apertura.monto || 0;
        const gananciaDelDia = totalFinal - montoInicial;

        // Actualizar estado a cerrada
        cajaRef.update({
            estado: 'cerrada',
            cierre: {
                montoFinal: totalFinal,
                gananciaDelDia: gananciaDelDia,
                fecha: new Date().toISOString(),
                cerradoPor: JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}').nombre || 'Sistema'
            }
        }).then(() => {
            // PASO EXTRA: Sumar a las finanzas generales (Acumulado histórico)
            const finanzasRef = firebase.database().ref('finanzasGenerales');
            finanzasRef.transaction((data) => {
                if (data === null) {
                    return { totalAcumulado: totalFinal };
                }
                data.totalAcumulado = (data.totalAcumulado || 0) + totalFinal;
                return data;
            });

            // Remover listener de caja actual
            if (cajaListener) {
                cajaRef.off('value', cajaListener);
            }

            alert(`✅ Caja cerrada exitosamente.\n💰 Total en caja: S/ ${totalFinal.toFixed(2)}\n📈 Ganancia del día: S/ ${gananciaDelDia.toFixed(2)}`);
            location.reload(); // Recargar para empezar con caja vacía mañana
        });
    });
};

// ==========================================================================
// CÁLCULOS DE KPI (TARJETAS SUPERIORES) - CON VERIFICACIONES
// ==========================================================================

function calcularKPIVentas(ventas) {
    const elemento = document.getElementById('kpiVentasHoy');
    if (!elemento) return; // ✅ VERIFICACIÓN: Si el elemento no existe, salir

    const hoy = new Date().toISOString().split('T')[0];
    let totalHoy = 0;

    Object.values(ventas).forEach(venta => {
        if (venta.fecha === hoy) {
            totalHoy += parseFloat(venta.total) || 0;
        }
    });

    elemento.innerText = `S/. ${totalHoy.toFixed(2)}`;
}

function calcularKPIStockCritico(inventario) {
    const elemento = document.getElementById('kpiStockCritico');
    if (!elemento) return; // ✅ VERIFICACIÓN: Si el elemento no existe, salir

    let contador = 0;
    Object.values(inventario).forEach(prod => {
        if ((parseInt(prod.stock) || 0) <= 3) {
            contador++;
        }
    });
    elemento.innerText = contador;
}

function calcularKPICitasHoy(citas) {
    const elemento = document.getElementById('kpiCitasHoy');
    if (!elemento) return; // ✅ VERIFICACIÓN: Si el elemento no existe, salir

    const hoy = new Date().toISOString().split('T')[0];
    let contador = 0;
    Object.values(citas).forEach(cita => {
        if (cita.fecha === hoy) {
            contador++;
        }
    });
    elemento.innerText = contador;
}

// ==========================================================================
// GRÁFICA 1: VENTAS SEMANALES (BARRAS) - CON VERIFICACIONES
// ==========================================================================

function renderizarGraficaVentasSemanales(ventas) {
    const canvas = document.getElementById('graficaVentasSemanales');
    if (!canvas) return; // ✅ VERIFICACIÓN: Si el canvas no existe, salir

    // Generar los últimos 7 días en formato YYYY-MM-DD
    const dias = [];
    const fechas = [];
    for (let i = 6; i >= 0; i--) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        const fechaStr = fecha.toISOString().split('T')[0];
        fechas.push(fechaStr);
        dias.push(fecha.toLocaleDateString('es-ES', { weekday: 'short' }));
    }

    // Calcular totales por día
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

    // Destruir gráfica anterior si existe
    if (graficaVentasSemanales) {
        graficaVentasSemanales.destroy();
    }

    graficaVentasSemanales = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dias,
            datasets: [{
                label: 'Ventas (S/.)',
                data: totals,
                backgroundColor: 'rgba(14, 165, 233, 0.7)',
                borderColor: 'rgba(14, 165, 233, 1)',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: function(value) { return 'S/.' + value.toFixed(2); } }
                }
            }
        }
    });
}

// ==========================================================================
// GRÁFICA 2: ESTADO DE CITAS (DONUT) - CON VERIFICACIONES
// ==========================================================================

function renderizarGraficaEstadoCitas(citas) {
    const canvas = document.getElementById('graficaEstadoCitas');
    if (!canvas) return; // ✅ VERIFICACIÓN: Si el canvas no existe, salir

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
// GRÁFICA 3: TOP 5 PRODUCTOS MÁS VENDIDOS - CON VERIFICACIONES
// ==========================================================================

function renderizarGraficaTopProductos(ventas) {
    const canvas = document.getElementById('graficaTopProductos');
    if (!canvas) return; // ✅ VERIFICACIÓN: Si el canvas no existe, salir

    const conteoProductos = {};

    // Recorrer todas las ventas y sumar cantidades de productos
    Object.values(ventas).forEach(venta => {
        if (venta.items) {
            venta.items.forEach(item => {
                const nombre = item.nombre || item.codigo || 'Producto';
                const cantidad = parseInt(item.cantidad) || 1;
                conteoProductos[nombre] = (conteoProductos[nombre] || 0) + cantidad;
            });
        }
    });

    // Ordenar de mayor a menor y tomar los primeros 5
    const top5 = Object.entries(conteoProductos)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const labels = top5.map(item => item[0]);
    const datos = top5.map(item => item[1]);

    const ctx = canvas.getContext('2d');

    if (graficaTopProductos) {
        graficaTopProductos.destroy();
    }

    // Si no hay productos vendidos, mostrar mensaje
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
// ALERTAS DE INVENTARIO (STOCK BAJO) - CON VERIFICACIONES
// ==========================================================================

function renderizarAlertasStock(inventario) {
    const contenedor = document.getElementById('listaAlertasStock');
    if (!contenedor) return; // ✅ VERIFICACIÓN: Si el contenedor no existe, salir

    // Filtrar productos con stock menor o igual a 3
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