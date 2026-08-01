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
                    const user = userCredential.user;
                    const db = firebase.database();
                    return db.ref('usuarios/' + user.uid).once('value')
                        .then((snapshot) => {
                            let usuarioData = snapshot.val();
                            
                            if (!usuarioData) {
                                const datosBasicos = {
                                    email: user.email,
                                    nombre: user.displayName || user.email?.split('@')[0] || 'Usuario',
                                    codigo: `MANTILLA-${Date.now().toString().slice(-5)}`,
                                    rol: 'admin',
                                    activo: true,
                                    creadoEn: new Date().toISOString(),
                                    uid: user.uid
                                };
                                return db.ref('usuarios/' + user.uid).set(datosBasicos)
                                    .then(() => {
                                        return { ...datosBasicos, uid: user.uid };
                                    });
                            }
                            
                            if (usuarioData.activo === false) {
                                throw new Error('Usuario desactivado. Contacte al administrador.');
                            }
                            
                            return { ...usuarioData, uid: user.uid };
                        });
                })
                .then((usuarioData) => {
                    mostrarAlerta(`Bienvenido, ${usuarioData.nombre || 'Usuario'}!`, 'success');
                    
                    sessionStorage.setItem('usuarioLogueado', JSON.stringify({
                        email: usuarioData.email,
                        nombre: usuarioData.nombre,
                        rol: usuarioData.rol,
                        uid: usuarioData.uid,
                        codigo: usuarioData.codigo
                    }));

                    // REGISTRAR INICIO DE SESIÓN EN HISTORIAL
                    if (typeof window.registrarAccionHistorial === 'function') {
                        window.registrarAccionHistorial(
                            'usuario',
                            `Inicio de sesión: ${usuarioData.nombre} (${usuarioData.email})`,
                            { email: usuarioData.email, rol: usuarioData.rol },
                            'usuarios'
                        );
                    }

                    const nombreUsuario = document.getElementById('nombreUsuario');
                    if (nombreUsuario) {
                        nombreUsuario.textContent = usuarioData.nombre || 'Usuario';
                    }

                    document.getElementById('vistaLogin').classList.add('d-none');
                    document.getElementById('appContainer').classList.remove('d-none');
                    
                    if (typeof cargarModulo === 'function') {
                        cargarModulo();
                    }

                    setTimeout(() => {
                        if (typeof verificarYMostrarAperturaCaja === 'function') {
                            verificarYMostrarAperturaCaja();
                        }
                    }, 500);

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
                    
                    const btnLogin = document.getElementById('btnLogin');
                    btnLogin.innerHTML = textoOriginal;
                    btnLogin.disabled = false;
                });
        });
    }

    // 3. CONTROL DEL BOTÓN SALIR DEL SISTEMA
    const btnSalir = document.getElementById('btnSalir');
    if (btnSalir) {
        btnSalir.addEventListener('click', function() {
            const usuarioLog = JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}');
            
            // REGISTRAR CIERRE DE SESIÓN EN HISTORIAL
            if (typeof window.registrarAccionHistorial === 'function') {
                window.registrarAccionHistorial(
                    'usuario',
                    `Cierre de sesión: ${usuarioLog.nombre || 'Usuario'}`,
                    { email: usuarioLog.email },
                    'usuarios'
                );
            }

            firebase.auth().signOut().then(() => {
                sessionStorage.removeItem('usuarioLogueado');
                
                const modales = document.querySelectorAll('.modal.show');
                modales.forEach(modal => {
                    const instancia = bootstrap.Modal.getInstance(modal);
                    if (instancia) instancia.hide();
                });
                
                window.location.reload();
            }).catch((error) => {
                console.error("Error al cerrar sesión:", error);
                mostrarAlerta('Error al cerrar sesión.', 'danger');
            });
        });
    }

    // 4. Verificar sesión al cargar la página
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
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
                        
                        const nombreUsuario = document.getElementById('nombreUsuario');
                        if (nombreUsuario) {
                            nombreUsuario.textContent = usuarioData.nombre || 'Usuario';
                        }
                        
                        aplicarPermisosPorRol();
                    }
                })
                .catch((error) => {
                    console.error("Error al verificar sesión:", error);
                });
        } else {
            sessionStorage.removeItem('usuarioLogueado');
        }
    });

    function mostrarAlerta(mensaje, tipo) {
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
});

function aplicarPermisosPorRol() {
    const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuarioLogueado'));
    if (!usuarioLogueado) return;

    const rol = usuarioLogueado.rol;
    const elementosAdmin = document.querySelectorAll('.solo-admin');
    
    if (rol === 'admin' || rol === 'administrador') {
        elementosAdmin.forEach(el => {
            el.style.display = 'block';
        });
    } else {
        elementosAdmin.forEach(el => {
            el.style.display = 'none';
        });
    }
}

function verificarYMostrarAperturaCaja() {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const cajaRef = firebase.database().ref('cajas/' + fechaHoy);

    cajaRef.once('value').then((snapshot) => {
        if (!snapshot.exists() || snapshot.val().estado === 'cerrada') {
            const modalElement = document.getElementById('modalAperturaCaja');
            if (modalElement) {
                const modal = new bootstrap.Modal(modalElement, {
                    backdrop: 'static',
                    keyboard: false
                });
                modal.show();
                
                document.getElementById('btnConfirmarApertura').onclick = function() {
                    confirmarAperturaCaja(modal);
                };
                
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
        totalTransferencia: 0,
        totalTarjeta: 0,
        ventas: [],
        historial: []
    }).then(() => {
        modalInstance.hide();
        
        // REGISTRAR APERTURA DE CAJA EN HISTORIAL
        if (typeof window.registrarAccionHistorial === 'function') {
            window.registrarAccionHistorial(
                'apertura_caja',
                `Apertura de caja con S/. ${monto.toFixed(2)} - Usuario: ${usuarioLog.nombre || 'Sistema'}`,
                { monto: monto, usuario: usuarioLog.nombre || 'Sistema' },
                'caja'
            );
        }
        
        if (typeof actualizarVistaDashboardCaja === 'function') {
            actualizarVistaDashboardCaja();
        }
        
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
            
            const btnCerrarConf = document.getElementById('btnCerrarConfirmacion');
            if (btnCerrarConf) {
                btnCerrarConf.onclick = function() {
                    modalConf.hide();
                };
            }
        }

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
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = '<i class="bi bi-check-lg me-1"></i> Abrir Caja';
    });
}

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