// ==========================================================================
// MÓDULO DE CAJA - ÓPTICA MANTILLA
// Única fuente de verdad para Apertura, Sumatoria en tiempo real y Cierre.
// dashboard.js y ventas.js SOLO llaman a estas funciones, no las redefinen.
// ==========================================================================

let cajaModalAperturaMostrada = false;
let cajaListenerActivo = null;

// --------------------------------------------------------------------------
// Referencias seguras a Firebase
// --------------------------------------------------------------------------
function obtenerReferenciaCajaFecha(fecha) {
    try {
        if (typeof db !== 'undefined' && db) return db.ref('cajas/' + fecha);
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) return firebase.database().ref('cajas/' + fecha);
    } catch (e) {
        console.error("Error al obtener referencia de caja:", e);
    }
    return null;
}

function obtenerReferenciaFinanzasGenerales() {
    try {
        if (typeof db !== 'undefined' && db) return db.ref('finanzasGenerales');
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) return firebase.database().ref('finanzasGenerales');
    } catch (e) {
        console.error("Error al obtener referencia de finanzas generales:", e);
    }
    return null;
}

function fechaHoyISO() {
    return new Date().toISOString().split('T')[0];
}

// --------------------------------------------------------------------------
// PASO 1: En cuanto Firebase detecta una sesión activa (justo tras el login,
// o al refrescar la página ya logueado), verificamos la caja ANTES que
// cualquier otra cosa. Esto es independiente de auth.js: se dispara solo.
// --------------------------------------------------------------------------
if (typeof firebase !== 'undefined' && firebase.apps) {
    firebase.auth().onAuthStateChanged((usuario) => {
        if (usuario) {
            verificarAperturaCajaDelDia();
        } else {
            cajaModalAperturaMostrada = false;
        }
    });
}

// Fallback manual: si tu auth.js NO usa firebase.auth().signInWithEmailAndPassword
// (por ejemplo, valida contraseñas a mano contra el nodo "usuarios"), puedes
// llamar a esta función global justo después de mostrar el appContainer:
//   iniciarControlDeCaja();
window.iniciarControlDeCaja = function () {
    verificarAperturaCajaDelDia();
};

function verificarAperturaCajaDelDia() {
    const cajaRef = obtenerReferenciaCajaFecha(fechaHoyISO());
    if (!cajaRef) return;

    cajaRef.once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data && data.estado === 'abierta') {
            // Ya hay caja abierta hoy: solo sincronizamos los montos, sin pedir nada.
            actualizarVistaDashboardCaja();
        } else if (!cajaModalAperturaMostrada) {
            // No hay caja abierta: bloqueamos con el modal de apertura.
            mostrarModalAperturaCaja();
        }
    }).catch((error) => {
        console.error("Error al verificar la caja del día:", error);
    });
}

// --------------------------------------------------------------------------
// PASO 2: Modal de Apertura (el HTML vive en el index.html: #modalAperturaCaja)
// --------------------------------------------------------------------------
function mostrarModalAperturaCaja() {
    const modalEl = document.getElementById('modalAperturaCaja');
    if (!modalEl) return;

    cajaModalAperturaMostrada = true;

    const inputMonto = document.getElementById('montoAperturaCaja');
    if (inputMonto) inputMonto.value = "0.00";

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl, {
        backdrop: 'static',
        keyboard: false
    });
    modal.show();
}

// Enlazamos el botón "Abrir Caja" en cuanto el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const btnApertura = document.getElementById('btnConfirmarApertura');
    if (btnApertura) {
        btnApertura.addEventListener('click', confirmarAperturaCaja);
    }
});

function confirmarAperturaCaja() {
    const inputMonto = document.getElementById('montoAperturaCaja');
    const btn = document.getElementById('btnConfirmarApertura');
    let monto = parseFloat(inputMonto ? inputMonto.value : 0);

    if (isNaN(monto) || monto < 0) {
        mostrarAlertaCajaGlobal("Ingresa un monto válido (puede ser 0).", "warning");
        return;
    }

    const usuarioLog = JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}');
    const fechaHoy = fechaHoyISO();
    const cajaRef = obtenerReferenciaCajaFecha(fechaHoy);
    if (!cajaRef) {
        mostrarAlertaCajaGlobal("No hay conexión con Firebase.", "danger");
        return;
    }

    if (btn) btn.disabled = true;

    cajaRef.set({
        estado: 'abierta',
        apertura: {
            monto: monto,
            usuario: usuarioLog.nombre || 'Sistema',
            fecha: new Date().toISOString()
        },
        totalEfectivo: monto,
        totalYape: 0
    }).then(() => {
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalAperturaCaja'));
        if (modalInstance) modalInstance.hide();

        actualizarVistaDashboardCaja();
        mostrarAlertaCajaGlobal(`Caja aperturada con S/ ${monto.toFixed(2)}.`, "success");
    }).catch((error) => {
        console.error("Error al abrir caja:", error);
        mostrarAlertaCajaGlobal("No se pudo abrir la caja. Intenta nuevamente.", "danger");
    }).finally(() => {
        if (btn) btn.disabled = false;
    });
}

// --------------------------------------------------------------------------
// PASO 3: Cada venta cobrada suma automáticamente a la caja del día
// (llamado desde ventas.js → procesarCobroVenta)
// --------------------------------------------------------------------------
function actualizarCajaConVenta(montoVenta, tipoPago) {
    const fechaHoy = fechaHoyISO();
    const cajaRef = obtenerReferenciaCajaFecha(fechaHoy);
    if (!cajaRef) return;

    cajaRef.transaction((cajaActual) => {
        if (cajaActual === null) return cajaActual;             // no hay caja abierta: no sumamos
        if (cajaActual.estado === 'cerrada') return cajaActual; // ya cerrada: no sumamos

        if (tipoPago === 'yape') {
            cajaActual.totalYape = (cajaActual.totalYape || 0) + montoVenta;
        } else {
            // efectivo, tarjeta y transferencia se cuentan como ingreso de caja física
            cajaActual.totalEfectivo = (cajaActual.totalEfectivo || 0) + montoVenta;
        }
        return cajaActual;
    }, (error, committed) => {
        if (error) {
            console.error("Error al actualizar la caja con la venta:", error);
        } else if (committed) {
            actualizarVistaDashboardCaja();
        }
    });
}

// --------------------------------------------------------------------------
// PASO 4: Reflejar los montos actuales en las tarjetas del Dashboard
// --------------------------------------------------------------------------
function actualizarVistaDashboardCaja() {
    const fechaHoy = fechaHoyISO();
    const cajaRef = obtenerReferenciaCajaFecha(fechaHoy);
    if (!cajaRef) return;

    if (cajaListenerActivo) {
        cajaRef.off('value', cajaListenerActivo);
    }

    cajaListenerActivo = cajaRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const efectivoEl = document.getElementById('montoEfectivoCaja');
        const yapeEl = document.getElementById('montoYapeCaja');
        if (efectivoEl) efectivoEl.innerText = 'S/ ' + ((data && data.totalEfectivo) || 0).toFixed(2);
        if (yapeEl) yapeEl.innerText = 'S/ ' + ((data && data.totalYape) || 0).toFixed(2);
    });
}

// --------------------------------------------------------------------------
// PASO 5: Cerrar Caja — con confirmación en Bootstrap (nada de alert/confirm nativos)
// --------------------------------------------------------------------------
window.cerrarCajaActual = function () {
    const fechaHoy = fechaHoyISO();
    const cajaRef = obtenerReferenciaCajaFecha(fechaHoy);
    if (!cajaRef) {
        mostrarAlertaCajaGlobal("No hay conexión con Firebase.", "danger");
        return;
    }

    cajaRef.once('value').then((snapshot) => {
        const caja = snapshot.val();
        if (!caja || caja.estado === 'cerrada') {
            mostrarAlertaCajaGlobal("No hay una caja abierta para cerrar hoy.", "warning");
            return;
        }

        const montoInicial = (caja.apertura && caja.apertura.monto) || 0;
        const totalEfectivo = caja.totalEfectivo || 0;
        const totalYape = caja.totalYape || 0;
        const totalFinal = totalEfectivo + totalYape;
        const gananciaDelDia = totalFinal - montoInicial;

        mostrarModalConfirmarCierreCaja(
            { montoInicial, totalEfectivo, totalYape, totalFinal, gananciaDelDia },
            () => ejecutarCierreCaja(cajaRef, totalFinal, gananciaDelDia)
        );
    });
};

function ejecutarCierreCaja(cajaRef, totalFinal, gananciaDelDia) {
    const usuarioLog = JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}');

    cajaRef.update({
        estado: 'cerrada',
        cierre: {
            montoFinal: totalFinal,
            gananciaDelDia: gananciaDelDia,
            fecha: new Date().toISOString(),
            cerradoPor: usuarioLog.nombre || 'Sistema'
        }
    }).then(() => {
        const refFinanzas = obtenerReferenciaFinanzasGenerales();
        if (refFinanzas) {
            refFinanzas.transaction((data) => {
                if (data === null) return { totalAcumulado: totalFinal };
                data.totalAcumulado = (data.totalAcumulado || 0) + totalFinal;
                return data;
            });
        }

        if (cajaListenerActivo) {
            cajaRef.off('value', cajaListenerActivo);
            cajaListenerActivo = null;
        }

        mostrarAlertaCajaGlobal(
            `Caja cerrada. Total: S/ ${totalFinal.toFixed(2)} · Ganancia del día: S/ ${gananciaDelDia.toFixed(2)}. Recargando...`,
            "success"
        );
        setTimeout(() => location.reload(), 1800);
    }).catch((error) => {
        console.error("Error al cerrar caja:", error);
        mostrarAlertaCajaGlobal("No se pudo cerrar la caja. Intenta nuevamente.", "danger");
    });
}

// --------------------------------------------------------------------------
// Modal de confirmación de cierre (Bootstrap, generado dinámicamente)
// --------------------------------------------------------------------------
function mostrarModalConfirmarCierreCaja(datos, callbackConfirmar) {
    const existente = document.getElementById('modalConfirmarCierreCaja');
    if (existente) existente.remove();

    const modalHTML = `
        <div class="modal fade" id="modalConfirmarCierreCaja" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-danger text-white py-3" style="border-radius: 12px 12px 0 0;">
                        <h5 class="modal-title fw-bold mb-0">
                            <i class="bi bi-door-closed-fill me-2"></i>Confirmar Cierre de Caja
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <p class="text-muted small mb-3">Esta acción cerrará la caja del día y no podrá deshacerse.</p>
                        <table class="table table-sm mb-0">
                            <tbody>
                                <tr>
                                    <td class="text-muted">Monto de apertura</td>
                                    <td class="text-end fw-semibold">S/ ${datos.montoInicial.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td class="text-muted">Total en efectivo</td>
                                    <td class="text-end fw-semibold">S/ ${datos.totalEfectivo.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td class="text-muted">Total Yape / Transferencias</td>
                                    <td class="text-end fw-semibold">S/ ${datos.totalYape.toFixed(2)}</td>
                                </tr>
                                <tr class="border-top">
                                    <td class="fw-bold text-dark pt-2">Total General</td>
                                    <td class="text-end fw-bold text-dark pt-2 fs-5">S/ ${datos.totalFinal.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td class="fw-semibold ${datos.gananciaDelDia >= 0 ? 'text-success' : 'text-danger'}">Ganancia del día</td>
                                    <td class="text-end fw-semibold ${datos.gananciaDelDia >= 0 ? 'text-success' : 'text-danger'}">S/ ${datos.gananciaDelDia.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="modal-footer border-0 bg-light py-3" style="border-radius: 0 0 12px 12px;">
                        <button type="button" class="btn btn-light px-4 fw-semibold" data-bs-dismiss="modal" style="border-radius: 8px;">Cancelar</button>
                        <button type="button" class="btn btn-danger px-4 fw-semibold" id="btnConfirmarCierreCajaDefinitivo" style="border-radius: 8px;">
                            <i class="bi bi-check-lg me-1"></i>Sí, Cerrar Caja
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalEl = document.getElementById('modalConfirmarCierreCaja');
    const modalInstance = new bootstrap.Modal(modalEl);
    modalInstance.show();

    document.getElementById('btnConfirmarCierreCajaDefinitivo').addEventListener('click', () => {
        modalInstance.hide();
        if (typeof callbackConfirmar === 'function') callbackConfirmar();
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
        modalEl.remove();
    });
}

// --------------------------------------------------------------------------
// Alertas flotantes propias del módulo de caja (funcionan en cualquier vista)
// --------------------------------------------------------------------------
function mostrarAlertaCajaGlobal(mensaje, tipo = "success") {
    let contenedor = document.getElementById('contenedorAlertasCaja');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'contenedorAlertasCaja';
        contenedor.className = 'position-fixed top-0 end-0 p-3';
        contenedor.style.zIndex = '1080';
        contenedor.style.maxWidth = '350px';
        document.body.appendChild(contenedor);
    }

    const idAlerta = 'alert-caja-' + Date.now();
    const icono = tipo === "success" ? "bi-check-circle-fill" : (tipo === "danger" ? "bi-x-circle-fill" : "bi-exclamation-triangle-fill");

    contenedor.insertAdjacentHTML('beforeend', `
        <div id="${idAlerta}" class="alert alert-${tipo} d-flex align-items-center alert-dismissible fade show shadow animate__animated animate__fadeInRight" role="alert" style="border-radius: 8px;">
            <i class="bi ${icono} me-2 fs-5"></i>
            <div>${mensaje}</div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `);

    setTimeout(() => {
        const el = document.getElementById(idAlerta);
        if (el) {
            el.classList.replace('animate__fadeInRight', 'animate__fadeOutRight');
            setTimeout(() => el.remove(), 500);
        }
    }, 4500);
}