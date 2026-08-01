// ============================================
// MODULO DE APERTURA Y CIERRE DE CAJA
// ============================================

let modalConfirmacion = null;
let modalConfirmarCierre = null;
let modalResultadoCierre = null;
let modalError = null;

// ============================================
// FUNCIÓN GLOBAL PARA ACTUALIZAR CAJA DESDE VENTAS
// ============================================
window.actualizarCajaConVenta = function(monto, metodo) {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const cajaRef = firebase.database().ref('cajas/' + fechaHoy);
    
    let campoActualizar = 'totalEfectivo';
    if (metodo === 'yape') {
        campoActualizar = 'totalYape';
    } else if (metodo === 'transferencia') {
        campoActualizar = 'totalTransferencia';
    } else if (metodo === 'tarjeta') {
        campoActualizar = 'totalTarjeta';
    }
    
    console.log('💰 Actualizando caja - Método:', metodo, 'Monto:', monto, 'Campo:', campoActualizar);
    
    cajaRef.transaction((data) => {
        if (data === null) {
            return { 
                totalEfectivo: 0, 
                totalYape: 0,
                totalTransferencia: 0,
                totalTarjeta: 0,
                estado: 'abierta',
                apertura: { 
                    monto: 0,
                    fecha: new Date().toISOString()
                }
            };
        }
        if (data.totalEfectivo === undefined) data.totalEfectivo = 0;
        if (data.totalYape === undefined) data.totalYape = 0;
        if (data.totalTransferencia === undefined) data.totalTransferencia = 0;
        if (data.totalTarjeta === undefined) data.totalTarjeta = 0;
        
        data[campoActualizar] = (data[campoActualizar] || 0) + monto;
        return data;
    }).then((result) => {
        console.log('✅ Caja actualizada correctamente. Nuevos datos:', result.snapshot.val());
    }).catch((error) => {
        console.error('❌ Error al actualizar caja:', error);
    });
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('📦 Módulo de caja inicializado');
    inicializarModales();
    
    const btnAbrirCaja = document.getElementById('btnConfirmarApertura');
    if (btnAbrirCaja) {
        btnAbrirCaja.addEventListener('click', function(e) {
            e.preventDefault();
            
            const montoInput = document.getElementById('montoAperturaCaja');
            const monto = parseFloat(montoInput.value);
            
            if (!monto || monto <= 0) {
                mostrarErrorModal('⚠️ Por favor, ingrese un monto válido mayor a 0');
                return;
            }
            
            if (monto > 100000) {
                mostrarErrorModal('⚠️ El monto ingresado es muy alto. Por favor, verifique.');
                return;
            }
            
            const textoOriginal = btnAbrirCaja.innerHTML;
            btnAbrirCaja.disabled = true;
            btnAbrirCaja.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Abriendo caja...
            `;
            
            const user = firebase.auth().currentUser;
            if (!user) {
                mostrarErrorModal('❌ No hay usuario autenticado. Por favor, inicie sesión nuevamente.');
                btnAbrirCaja.disabled = false;
                btnAbrirCaja.innerHTML = textoOriginal;
                return;
            }
            
            const cajaRef = firebase.database().ref('cajas');
            const nuevaCaja = cajaRef.push();
            
            const datosCaja = {
                id: nuevaCaja.key,
                userId: user.uid,
                usuario: user.email || 'Usuario',
                montoInicial: monto,
                montoActual: monto,
                fechaApertura: firebase.database.ServerValue.TIMESTAMP,
                fechaAperturaString: new Date().toISOString(),
                estado: 'abierta',
                totalVentas: 0,
                numeroVentas: 0,
                totalEfectivo: 0,
                totalYape: 0,
                totalTransferencia: 0,
                totalTarjeta: 0,
                historial: []
            };
            
            nuevaCaja.set(datosCaja)
                .then(() => {
                    console.log('✅ Caja aperturada exitosamente');
                    localStorage.setItem('cajaActual', JSON.stringify(datosCaja));
                    localStorage.setItem('cajaId', nuevaCaja.key);
                    
                    mostrarConfirmacionApertura(monto);
                    btnAbrirCaja.disabled = false;
                    btnAbrirCaja.innerHTML = textoOriginal;
                })
                .catch((error) => {
                    console.error('❌ Error:', error);
                    mostrarErrorModal('❌ Error al abrir la caja: ' + error.message);
                    btnAbrirCaja.disabled = false;
                    btnAbrirCaja.innerHTML = textoOriginal;
                });
        });
    }
    
    document.getElementById('btnCerrarConfirmacion')?.addEventListener('click', function() {
        if (modalConfirmacion) modalConfirmacion.hide();
        mostrarDashboard();
    });
    
    // NOTA: El manejo del clic en btnSalir (y la validación de caja abierta)
    // se centraliza en auth.js mediante el modal "modalConfirmarCerrarSesion".
    // Se eliminó el listener duplicado que mostraba el modal
    // "modalConfirmarCierre" (¿Estás seguro de cerrar caja?) para evitar
    // que aparecieran dos avisos al intentar cerrar sesión.
});

function inicializarModales() {
    const confirmacionElement = document.getElementById('modalConfirmacionApertura');
    if (confirmacionElement) {
        modalConfirmacion = new bootstrap.Modal(confirmacionElement, { backdrop: 'static', keyboard: false });
    }
    
    const confirmarCierreElement = document.getElementById('modalConfirmarCierre');
    if (confirmarCierreElement) {
        modalConfirmarCierre = new bootstrap.Modal(confirmarCierreElement, { backdrop: 'static', keyboard: false });
    }
    
    const resultadoCierreElement = document.getElementById('modalResultadoCierre');
    if (resultadoCierreElement) {
        modalResultadoCierre = new bootstrap.Modal(resultadoCierreElement, { backdrop: 'static', keyboard: false });
    }
    
    const errorElement = document.getElementById('modalError');
    if (errorElement) {
        modalError = new bootstrap.Modal(errorElement, { backdrop: 'static', keyboard: false });
    }
    
    console.log('✅ Todos los modales inicializados');
}

function mostrarConfirmacionApertura(monto) {
    const montoElement = document.getElementById('montoConfirmacion');
    if (montoElement) {
        montoElement.textContent = `S/ ${monto.toFixed(2)}`;
    }
    
    const fechaElement = document.getElementById('fechaConfirmacion');
    if (fechaElement) {
        const ahora = new Date();
        fechaElement.textContent = ahora.toLocaleDateString('es-PE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }
    
    if (modalConfirmacion) {
        modalConfirmacion.show();
    }
    
    const modalAperturaEl = document.getElementById('modalAperturaCaja');
    if (modalAperturaEl) {
        const modalApertura = bootstrap.Modal.getInstance(modalAperturaEl);
        if (modalApertura) modalApertura.hide();
    }
}

function mostrarErrorModal(mensaje) {
    const mensajeElement = document.getElementById('mensajeError');
    if (mensajeElement) {
        mensajeElement.textContent = mensaje;
    }
    if (modalError) {
        modalError.show();
    }
}

function ejecutarCierreCaja() {
    const cajaId = localStorage.getItem('cajaId');
    const fechaHoy = new Date().toISOString().split('T')[0];
    const cajaRef = cajaId ? firebase.database().ref('cajas/' + cajaId) : firebase.database().ref('cajas/' + fechaHoy);
    
    cajaRef.once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (!data) {
                throw new Error('No se encontraron datos de la caja abierta');
            }
            
            const montoInicial = data.montoInicial || (data.apertura ? data.apertura.monto : 0);
            const totalEfectivo = data.totalEfectivo || 0;
            const totalYape = data.totalYape || 0;
            const totalTransferencia = data.totalTransferencia || 0;
            const totalTarjeta = data.totalTarjeta || 0;
            const montoActual = totalEfectivo + totalYape + totalTransferencia + totalTarjeta;
            const ganancia = montoActual - montoInicial;
            
            return cajaRef.update({
                estado: 'cerrada',
                fechaCierre: firebase.database.ServerValue.TIMESTAMP,
                fechaCierreString: new Date().toISOString(),
                gananciaTotal: ganancia,
                montoFinal: montoActual,
                totalEfectivoFinal: totalEfectivo,
                totalYapeFinal: totalYape,
                totalTransferenciaFinal: totalTransferencia,
                totalTarjetaFinal: totalTarjeta
            }).then(() => {
                return { montoActual, ganancia, ventas: data.numeroVentas || 0, totalEfectivo, totalYape, totalTransferencia, totalTarjeta };
            });
        })
        .then((resultado) => {
            mostrarResultadoCierre(resultado.montoActual, resultado.ganancia, resultado.totalEfectivo, resultado.totalYape, resultado.totalTransferencia, resultado.totalTarjeta);
            
            localStorage.removeItem('cajaActual');
            localStorage.removeItem('cajaId');
        })
        .catch((error) => {
            console.error('❌ Error al cerrar caja:', error);
            mostrarErrorModal('❌ Error al cerrar la caja: ' + error.message);
        });
}

function mostrarResultadoCierre(total, ganancia, totalEfectivo, totalYape, totalTransferencia, totalTarjeta) {
    const totalElement = document.getElementById('totalCajaCierre');
    const gananciaElement = document.getElementById('gananciaCierre');
    const efectivoElement = document.getElementById('totalEfectivoCierre');
    const yapeElement = document.getElementById('totalYapeCierre');
    const transferenciaElement = document.getElementById('totalTransferenciaCierre');
    const tarjetaElement = document.getElementById('totalTarjetaCierre');
    
    if (totalElement) {
        totalElement.textContent = `S/ ${total.toFixed(2)}`;
    }
    
    if (gananciaElement) {
        gananciaElement.textContent = `S/ ${ganancia.toFixed(2)}`;
        if (ganancia < 0) {
            gananciaElement.classList.remove('text-success', 'text-dark');
            gananciaElement.classList.add('text-danger');
        }
    }
    
    if (efectivoElement) {
        efectivoElement.textContent = `S/ ${(totalEfectivo || 0).toFixed(2)}`;
    }
    
    if (yapeElement) {
        yapeElement.textContent = `S/ ${(totalYape || 0).toFixed(2)}`;
    }
    
    if (transferenciaElement) {
        transferenciaElement.textContent = `S/ ${(totalTransferencia || 0).toFixed(2)}`;
    }
    
    if (tarjetaElement) {
        tarjetaElement.textContent = `S/ ${(totalTarjeta || 0).toFixed(2)}`;
    }
    
    if (modalResultadoCierre) {
        modalResultadoCierre.show();
        
        document.getElementById('btnContinuarCierre').onclick = function() {
            modalResultadoCierre.hide();
            // Ya NO se cierra la sesión automáticamente al cerrar caja.
            // El cierre de sesión solo debe ocurrir cuando el usuario
            // haga clic explícitamente en "Cerrar Sesión" (btnSalir),
            // el cual ya valida que la caja esté cerrada.
            mostrarDashboard();
        };
    }
}

function mostrarDashboard() {
    const vistaLogin = document.getElementById('vistaLogin');
    const appContainer = document.getElementById('appContainer');
    
    if (vistaLogin && appContainer) {
        vistaLogin.classList.add('d-none');
        appContainer.classList.remove('d-none');
    }
    
    if (typeof cargarModulo === 'function') {
        cargarModulo();
    } else {
        cargarDashboardFallback();
    }
}

function cerrarSesion() {
    firebase.auth().signOut()
        .then(() => {
            localStorage.removeItem('cajaActual');
            localStorage.removeItem('cajaId');
            window.location.reload();
        })
        .catch((error) => {
            mostrarErrorModal('❌ Error al cerrar sesión: ' + error.message);
        });
}

function hayCajaAbierta() {
    const cajaData = localStorage.getItem('cajaActual');
    if (!cajaData) return false;
    
    try {
        const caja = JSON.parse(cajaData);
        return caja.estado === 'abierta';
    } catch (e) {
        return false;
    }
}

function cargarDashboardFallback() {
    const contenido = document.getElementById('contenidoDinamico');
    if (contenido) {
        contenido.innerHTML = `
            <div class="row">
                <div class="col-12">
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">
                                <i class="bi bi-speedometer2 me-2"></i>Dashboard
                            </h5>
                            <p class="text-muted">Bienvenido al sistema. Seleccione un módulo del menú.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

console.log('✅ Módulo caja.js cargado correctamente');