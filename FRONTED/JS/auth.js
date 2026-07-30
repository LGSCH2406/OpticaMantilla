// ==========================================================================
// CONTROL DE AUTENTICACIÓN - ÓPTICA MANTILLA (Firebase Auth)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const alertContainer = document.getElementById('alertContainer');
    const emailInput = document.getElementById('email'); 
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const eyeIcon = document.getElementById('eyeIcon');

    // 1. Alternar visibilidad de la contraseña
    if (togglePasswordBtn && passwordInput && eyeIcon) {
        togglePasswordBtn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeIcon.className = 'bi bi-eye-slash text-muted';
            } else {
                passwordInput.type = 'password';
                eyeIcon.className = 'bi bi-eye text-muted';
            }
        });
    }

    // 2. Manejo del envío del formulario (Login con Firebase Auth)
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (alertContainer) alertContainer.innerHTML = '';

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                mostrarAlerta('Por favor, ingrese correo y contraseña.', 'warning');
                return;
            }

            // Autenticación con Firebase
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    mostrarAlerta(`Bienvenido. Cargando sistema...`, 'success');
                    
                    // Guardar sesión básica
                    sessionStorage.setItem('usuarioLogueado', JSON.stringify({
                        email: userCredential.user.email,
                        nombre: "Usuario",
                        rol: "admin"
                    }));

                    // Transición de vistas
                    document.getElementById('vistaLogin').classList.add('d-none');
                    document.getElementById('appContainer').classList.remove('d-none');
                    
                    // Carga inicial del dashboard
                    if (typeof cargarModulo === 'function') {
                        cargarModulo();
                    }

                    // Verificar y mostrar el Modal de Caja si es necesario
                    setTimeout(() => {
                        verificarYMostrarAperturaCaja();
                    }, 500);
                })
                .catch((error) => {
                    console.error("Error al autenticar:", error.message);
                    mostrarAlerta('Correo o contraseña incorrectos.', 'danger');
                });
        });
    }

    // 3. Control del botón Salir del Sistema
    const btnSalir = document.getElementById('btnSalir');
    if (btnSalir) {
        btnSalir.addEventListener('click', () => {
            firebase.auth().signOut().then(() => {
                sessionStorage.removeItem('usuarioLogueado');
                // Cerrar el modal de caja si está abierto para evitar errores
                const modalEl = document.getElementById('modalAperturaCaja');
                if (modalEl) {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
                window.location.reload();
            }).catch((error) => {
                console.error("Error al cerrar sesión:", error);
            });
        });
    }

    // Función auxiliar para alertas
    function mostrarAlerta(mensaje, tipo) {
        if (!alertContainer) return;
        alertContainer.innerHTML = `
            <div class="alert alert-${tipo} alert-dismissible fade show d-flex align-items-center mb-0 shadow-sm" role="alert" style="border-radius: 10px;">
                <i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2"></i>
                <div class="small fw-semibold">${mensaje}</div>
            </div>
        `;
    }
});

// ==========================================================================
// LÓGICA DE APERTURA DE CAJA (Nueva función añadida)
// ==========================================================================

function verificarYMostrarAperturaCaja() {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const cajaRef = firebase.database().ref('cajas/' + fechaHoy);

    cajaRef.once('value').then((snapshot) => {
        if (!snapshot.exists() || snapshot.val().estado === 'cerrada') {
            // No hay caja abierta hoy. Mostramos el modal.
            const modalElement = document.getElementById('modalAperturaCaja');
            if (modalElement) {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
                
                // Configurar el botón de confirmar apertura
                document.getElementById('btnConfirmarApertura').onclick = function() {
                    confirmarAperturaCaja(modal);
                };
            }
        }
    });
}

function confirmarAperturaCaja(modalInstance) {
    const montoInput = document.getElementById('montoAperturaCaja');
    let monto = parseFloat(montoInput.value) || 0;

    if (monto < 0) {
        alert("El monto no puede ser negativo.");
        return;
    }

    const usuarioLog = JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}');
    const fechaHoy = new Date().toISOString().split('T')[0];
    const cajaRef = firebase.database().ref('cajas/' + fechaHoy);

    cajaRef.set({
        estado: 'abierta',
        apertura: {
            monto: monto,
            usuario: usuarioLog.nombre || 'Sistema',
            fecha: new Date().toISOString()
        },
        totalEfectivo: monto,
        totalYape: 0,
        ventas: []
    }).then(() => {
        modalInstance.hide();
        // Actualizar el dashboard para que refleje el dinero
        if (typeof actualizarVistaDashboardCaja === 'function') {
            actualizarVistaDashboardCaja();
        }
        alert("✅ Caja aperturada exitosamente con S/ " + monto.toFixed(2));
    }).catch(err => {
        console.error("Error al abrir caja:", err);
        alert("Error al conectar con la base de datos.");
    });
}