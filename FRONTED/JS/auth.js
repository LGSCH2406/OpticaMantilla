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

            // Mostrar indicador de carga
            const btnLogin = document.getElementById('btnLogin');
            const textoOriginal = btnLogin.innerHTML;
            btnLogin.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Autenticando...`;
            btnLogin.disabled = true;

            // Autenticación con Firebase
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Obtener datos adicionales del usuario desde Realtime DB
                    const user = userCredential.user;
                    
                    // Verificar si el usuario existe en Realtime DB y está activo
                    const db = firebase.database();
                    return db.ref('usuarios/' + user.uid).once('value')
                        .then((snapshot) => {
                            let usuarioData = snapshot.val();
                            
                            // Si no existe en Realtime DB, crearlo automáticamente
                            if (!usuarioData) {
                                // CAMBIO: Si es la primera vez, lo creamos como ADMIN para evitar problemas de permisos
                                const datosBasicos = {
                                    email: user.email,
                                    nombre: user.displayName || user.email?.split('@')[0] || 'Usuario',
                                    codigo: `MANTILLA-${Date.now().toString().slice(-5)}`,
                                    rol: 'admin', // Cambiado de 'ventas' a 'admin' para que el dueño tenga acceso total
                                    activo: true,
                                    creadoEn: new Date().toISOString(),
                                    uid: user.uid
                                };
                                return db.ref('usuarios/' + user.uid).set(datosBasicos)
                                    .then(() => {
                                        return { ...datosBasicos, uid: user.uid };
                                    });
                            }
                            
                            // Verificar si el usuario está activo
                            if (usuarioData.activo === false) {
                                throw new Error('Usuario desactivado. Contacte al administrador.');
                            }
                            
                            return { ...usuarioData, uid: user.uid };
                        });
                })
                .then((usuarioData) => {
                    mostrarAlerta(`Bienvenido, ${usuarioData.nombre || 'Usuario'}!`, 'success');
                    
                    // Guardar sesión con datos completos
                    sessionStorage.setItem('usuarioLogueado', JSON.stringify({
                        email: usuarioData.email,
                        nombre: usuarioData.nombre,
                        rol: usuarioData.rol,
                        uid: usuarioData.uid,
                        codigo: usuarioData.codigo
                    }));

                    // Actualizar nombre en la barra de navegación
                    const nombreUsuario = document.getElementById('nombreUsuario');
                    if (nombreUsuario) {
                        nombreUsuario.textContent = usuarioData.nombre || 'Usuario';
                    }

                    // Transición de vistas
                    document.getElementById('vistaLogin').classList.add('d-none');
                    document.getElementById('appContainer').classList.remove('d-none');
                    
                    // Carga inicial del dashboard
                    if (typeof cargarModulo === 'function') {
                        cargarModulo();
                    }

                    // Verificar y mostrar el Modal de Caja si es necesario
                    setTimeout(() => {
                        if (typeof verificarYMostrarAperturaCaja === 'function') {
                            verificarYMostrarAperturaCaja();
                        }
                    }, 500);

                    // Restaurar botón
                    const btnLogin = document.getElementById('btnLogin');
                    btnLogin.innerHTML = textoOriginal;
                    btnLogin.disabled = false;
                })
                .catch((error) => {
                    console.error("Error al autenticar:", error);
                    
                    let mensaje = 'Correo o contraseña incorrectos.';
                    if (error.message === 'Usuario desactivado. Contacte al administrador.') {
                        mensaje = '⚠️ Este usuario ha sido desactivado. Contacte al administrador.';
                    } else if (error.code === 'auth/user-not-found') {
                        mensaje = 'No existe una cuenta con este correo electrónico.';
                    } else if (error.code === 'auth/wrong-password') {
                        mensaje = 'Contraseña incorrecta. Verifique sus credenciales.';
                    } else if (error.code === 'auth/too-many-requests') {
                        mensaje = 'Demasiados intentos fallidos. Intente más tarde.';
                    } else if (error.code === 'auth/network-request-failed') {
                        mensaje = 'Error de conexión. Verifique su internet.';
                    }
                    
                    mostrarAlerta(mensaje, 'danger');
                    
                    // Restaurar botón
                    const btnLogin = document.getElementById('btnLogin');
                    btnLogin.innerHTML = textoOriginal;
                    btnLogin.disabled = false;
                });
        });
    }

    // ==========================================================================
    // 3. CONTROL DEL BOTÓN SALIR DEL SISTEMA (CON VALIDACIÓN Y CAMBIO DE MODAL)
    // ==========================================================================
    const btnSalir = document.getElementById('btnSalir');
    if (btnSalir) {
        btnSalir.addEventListener('click', async () => {
            // Verificar el estado de la caja antes de abrir el modal
            try {
                const fechaHoy = new Date().toISOString().split('T')[0];
                const cajaRef = firebase.database().ref('cajas/' + fechaHoy);
                const snapshot = await cajaRef.once('value');
                
                const cajaData = snapshot.val();
                const cajaAbierta = cajaData && cajaData.estado === 'abierta';

                // Referencias a los elementos del modal de salir
                const modalElement = document.getElementById('modalConfirmarCerrarSesion');
                const header = document.getElementById('headerModalSalir');
                const icono = document.getElementById('iconoModalSalir');
                const titulo = document.getElementById('tituloModalSalir');
                const mensaje = document.getElementById('mensajeModalSalir');
                const btnConfirmar = document.getElementById('btnConfirmarSalir');

                if (cajaAbierta) {
                    // MODO ADVERTENCIA: La caja está abierta
                    header.className = 'modal-header border-0 py-4 bg-warning'; // Fondo Naranja
                    icono.className = 'bi bi-exclamation-triangle-fill text-warning';
                    icono.style.fontSize = '2.5rem';
                    titulo.className = 'modal-title text-dark fw-bold';
                    titulo.innerText = '⚠️ Caja Abierta';
                    
                    // Mensaje directo en el cuerpo del modal (Sin alertas externas)
                    mensaje.innerHTML = `
                        <div class="p-3 mb-0">
                            <div class="mb-3">
                                <i class="bi bi-cash-stack fs-1 text-warning"></i>
                            </div>
                            <h5 class="fw-bold">No puedes cerrar sesión</h5>
                            <p class="text-muted">
                                Por seguridad, el sistema <strong>no permite cerrar sesión</strong> mientras la caja del día esté abierta.
                            </p>
                            <div class="alert alert-warning mb-0 border-0 shadow-sm" style="border-radius: 10px;">
                                <i class="bi bi-info-circle-fill me-2"></i>
                                Dirígete al <strong>Dashboard</strong> y haz clic en el botón 
                                <strong>"Cerrar Caja del Día"</strong> antes de intentar salir.
                            </div>
                        </div>
                    `;
                    
                    // Deshabilitar el botón de confirmación
                    btnConfirmar.disabled = true;
                    btnConfirmar.className = 'btn btn-secondary px-4 fw-bold opacity-50';
                    btnConfirmar.innerHTML = 'Caja Abierta';

                    // Al presionar "Cancelar", regresar al Dashboard
                    const btnCancelarSalir = document.getElementById('btnCancelarSalir');
                    if (btnCancelarSalir) {
                        btnCancelarSalir.onclick = function() {
                            const modalCierreEl = document.getElementById('modalConfirmarCerrarSesion');
                            const modalCierreInst = bootstrap.Modal.getInstance(modalCierreEl);
                            if (modalCierreInst) modalCierreInst.hide();

                            if (typeof mostrarDashboard === 'function') {
                                mostrarDashboard();
                            }
                        };
                    }
                } else {
                    // MODO NORMAL: Caja cerrada
                    header.className = 'modal-header border-0 py-4 bg-danger'; // Fondo Rojo
                    icono.className = 'bi bi-box-arrow-right text-danger';
                    icono.style.fontSize = '2.5rem';
                    titulo.className = 'modal-title text-white fw-bold';
                    titulo.innerText = 'Cerrar Sesión';
                    mensaje.innerHTML = '¿Está seguro que desea cerrar la sesión actual?';
                    
                    // Habilitar el botón de confirmación
                    btnConfirmar.disabled = false;
                    btnConfirmar.className = 'btn btn-danger px-4 fw-bold';
                    btnConfirmar.innerHTML = '<i class="bi bi-check-lg me-1"></i> Sí, Cerrar Sesión';

                    // Restablecer el botón Cancelar a su comportamiento normal
                    // (solo cerrar el modal, sin redirigir al dashboard)
                    const btnCancelarSalir = document.getElementById('btnCancelarSalir');
                    if (btnCancelarSalir) {
                        btnCancelarSalir.onclick = null;
                    }
                }

                // Abrir el modal
                const modalCierre = new bootstrap.Modal(modalElement, {
                    backdrop: 'static',
                    keyboard: false
                });
                modalCierre.show();

            } catch (error) {
                console.error("Error al verificar la caja:", error);
                // Solo mostramos alerta si hay un error real de conexión, no si la caja está abierta
                mostrarAlerta('Error al verificar el estado de la caja. Intente nuevamente.', 'danger');
            }
        });
    }

    // Configurar el botón "Sí, Cerrar Sesión" dentro del modal confirmación
    document.getElementById('btnConfirmarSalir').addEventListener('click', function() {
        // Verificamos que el botón no esté deshabilitado
        if (this.disabled) return;

        // Cerrar el modal de confirmación primero
        const modalCierreEl = document.getElementById('modalConfirmarCerrarSesion');
        const modalCierre = bootstrap.Modal.getInstance(modalCierreEl);
        if(modalCierre) modalCierre.hide();

        // Ejecutar el cierre de sesión de Firebase
        firebase.auth().signOut().then(() => {
            sessionStorage.removeItem('usuarioLogueado');
            
            // Cerrar cualquier otro modal abierto (como el de caja, etc.)
            const modales = document.querySelectorAll('.modal.show');
            modales.forEach(modal => {
                const instancia = bootstrap.Modal.getInstance(modal);
                if (instancia) instancia.hide();
            });
            
            // Recargar la página para volver a la pantalla de Login
            window.location.reload();
        }).catch((error) => {
            console.error("Error al cerrar sesión:", error);
            mostrarAlerta('Error al cerrar sesión.', 'danger');
        });
    });

    // 4. Verificar sesión al cargar la página
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // Usuario ya logueado, verificar datos
            const db = firebase.database();
            db.ref('usuarios/' + user.uid).once('value')
                .then((snapshot) => {
                    const usuarioData = snapshot.val();
                    if (usuarioData) {
                        sessionStorage.setItem('usuarioLogueado', JSON.stringify({
                            email: usuarioData.email,
                            nombre: usuarioData.nombre,
                            rol: usuarioData.rol,
                            uid: user.uid,
                            codigo: usuarioData.codigo
                        }));
                        
                        // Actualizar nombre en barra de navegación
                        const nombreUsuario = document.getElementById('nombreUsuario');
                        if (nombreUsuario) {
                            nombreUsuario.textContent = usuarioData.nombre || 'Usuario';
                        }
                        
                        // LLAMADA A LA NUEVA FUNCIÓN PARA OCULTAR/MOSTRAR MENÚ SEGÚN EL ROL
                        aplicarPermisosPorRol();
                    }
                })
                .catch((error) => {
                    console.error("Error al verificar sesión:", error);
                });
        } else {
            // No hay usuario logueado
            sessionStorage.removeItem('usuarioLogueado');
        }
    });

    // Función auxiliar para alertas
    function mostrarAlerta(mensaje, tipo) {
        if (!alertContainer) return;
        alertContainer.innerHTML = `
            <div class="alert alert-${tipo} alert-dismissible fade show d-flex align-items-center mb-0 shadow-sm" role="alert" style="border-radius: 10px;">
                <i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : tipo === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-x-circle-fill'} me-2"></i>
                <div class="small fw-semibold">${mensaje}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            const alert = alertContainer.querySelector('.alert');
            if (alert) {
                alert.classList.remove('show');
                setTimeout(() => {
                    alertContainer.innerHTML = '';
                }, 300);
            }
        }, 5000);
    }
});

// ==========================================================================
// NUEVA FUNCIÓN: CONTROL DE PERMISOS POR ROL
// ==========================================================================

function aplicarPermisosPorRol() {
    // 1. Obtener los datos del usuario logueado desde sessionStorage
    const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuarioLogueado'));

    // Si no hay usuario logueado, no hacemos nada
    if (!usuarioLogueado) return;

    // 2. Obtener el rol del usuario
    const rol = usuarioLogueado.rol; // Esto debería ser 'admin', 'ventas', 'optometra', etc.
    
    // 3. Elegir qué mostrar según el rol
    // Si es ADMIN: mostramos el menú de Usuarios quitando la clase oculta
    // Si NO es ADMIN: Nos aseguramos de que esté oculto (oculto por defecto en HTML)
    
    const elementosAdmin = document.querySelectorAll('.solo-admin');
    
    if (rol === 'admin' || rol === 'administrador') {
        elementosAdmin.forEach(el => {
            el.style.display = 'block'; // Mostrar
        });
    } else {
        elementosAdmin.forEach(el => {
            el.style.display = 'none'; // Ocultar
        });
    }
}

// ==========================================================================
// LÓGICA DE APERTURA DE CAJA
// ==========================================================================

function verificarYMostrarAperturaCaja() {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const cajaRef = firebase.database().ref('cajas/' + fechaHoy);

    cajaRef.once('value').then((snapshot) => {
        if (!snapshot.exists() || snapshot.val().estado === 'cerrada') {
            // No hay caja abierta hoy. Mostramos el modal.
            const modalElement = document.getElementById('modalAperturaCaja');
            if (modalElement) {
                const modal = new bootstrap.Modal(modalElement, {
                    backdrop: 'static',
                    keyboard: false
                });
                modal.show();
                
                // Configurar el botón de confirmar apertura
                document.getElementById('btnConfirmarApertura').onclick = function() {
                    confirmarAperturaCaja(modal);
                };
                
                // Permitir Enter en el input
                document.getElementById('montoAperturaCaja').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        document.getElementById('btnConfirmarApertura').click();
                    }
                });
            }
        }
    }).catch((error) => {
        console.error("Error al verificar caja:", error);
    });
}

function confirmarAperturaCaja(modalInstance) {
    const montoInput = document.getElementById('montoAperturaCaja');
    let monto = parseFloat(montoInput.value) || 0;

    if (monto < 0) {
        mostrarAlertaLogin("El monto no puede ser negativo.", "warning");
        return;
    }

    const usuarioLog = JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}');
    const fechaHoy = new Date().toISOString().split('T')[0];
    const cajaRef = firebase.database().ref('cajas/' + fechaHoy);

    // Deshabilitar botón para evitar doble clic
    const btnConfirmar = document.getElementById('btnConfirmarApertura');
    btnConfirmar.disabled = true;
    btnConfirmar.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span> Abriendo...`;

    cajaRef.set({
        estado: 'abierta',
        apertura: {
            monto: monto,
            usuario: usuarioLog.nombre || 'Sistema',
            usuarioEmail: usuarioLog.email || '',
            fecha: new Date().toISOString()
        },
        totalEfectivo: monto,
        totalYape: 0,
        ventas: [],
        historial: []
    }).then(() => {
        modalInstance.hide();
        
        // Actualizar el dashboard para que refleje el dinero
        if (typeof actualizarVistaDashboardCaja === 'function') {
            actualizarVistaDashboardCaja();
        }
        
        // Llenar datos y mostrar directamente el segundo modal estilizado de éxito
        const montoConfirmacion = document.getElementById('montoConfirmacion');
        if (montoConfirmacion) {
            montoConfirmacion.textContent = `S/ ${monto.toFixed(2)}`;
        }
        
        const fechaConfirmacion = document.getElementById('fechaConfirmacion');
        if (fechaConfirmacion) {
            const ahora = new Date();
            fechaConfirmacion.textContent = ahora.toLocaleDateString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        const modalConfirmacionEl = document.getElementById('modalConfirmacionApertura');
        if (modalConfirmacionEl) {
            const modalConf = new bootstrap.Modal(modalConfirmacionEl, {
                backdrop: 'static',
                keyboard: false
            });
            modalConf.show();
            
            // Botón continuar del modal estilizado
            const btnCerrarConf = document.getElementById('btnCerrarConfirmacion');
            if (btnCerrarConf) {
                btnCerrarConf.onclick = function() {
                    modalConf.hide();
                };
            }
        }

        // Guardar en el historial de cierres
        const historialRef = firebase.database().ref('historialCajas/' + fechaHoy);
        historialRef.set({
            tipo: 'apertura',
            monto: monto,
            usuario: usuarioLog.nombre || 'Sistema',
            fecha: new Date().toISOString()
        }).catch(err => console.warn("Error al guardar historial:", err));

    }).catch(err => {
        console.error("Error al abrir caja:", err);
        mostrarAlertaLogin("Error al conectar con la base de datos.", "danger");
    }).finally(() => {
        // Restaurar botón
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = '<i class="bi bi-check-lg me-1"></i> Abrir Caja';
    });
}

// Función auxiliar para mostrar alertas en login (fuera del contenedor de login)
function mostrarAlertaLogin(mensaje, tipo) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;
    
    alertContainer.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show d-flex align-items-center mb-0 shadow-sm" role="alert" style="border-radius: 10px;">
            <i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : tipo === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-x-circle-fill'} me-2"></i>
            <div class="small fw-semibold">${mensaje}</div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    setTimeout(() => {
        const alert = alertContainer.querySelector('.alert');
        if (alert) {
            alert.classList.remove('show');
            setTimeout(() => {
                alertContainer.innerHTML = '';
            }, 300);
        }
    }, 5000);
}