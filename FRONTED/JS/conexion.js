// ==========================================================================
// CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE - ÓPTICA MANTILLA
// ==========================================================================

const firebaseConfig = {
    apiKey: "AIzaSyAp0YwIkH5xi1hUbKpOruI3wFkPoLmiVeM",
    authDomain: "opticas-mantilla.firebaseapp.com",
    projectId: "opticas-mantilla",
    storageBucket: "opticas-mantilla.firebasestorage.app",
    messagingSenderId: "218246582891",
    appId: "1:218246582891:web:1f6b9670c0f9e656e0972e",
    databaseURL: "https://opticas-mantilla-default-rtdb.firebaseio.com" // Declarada correctamente aquí
};

// 1. Inicializar la aplicación base
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 2. Instanciar correctamente la base de datos sin argumentos extra
const db = firebase.database();