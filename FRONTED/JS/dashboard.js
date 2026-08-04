/* ==========================================================================
   ESTILOS ADICIONALES PARA EL DASHBOARD CON SELECTOR DE FECHA
   ========================================================================== */

/* --- ESTILO PARA EL INDICADOR DE FECHA --- */
#fechaMostradaDashboard {
    font-weight: 600;
    color: var(--text-dark);
}

.badge.bg-light.text-dark.border {
    background-color: #f8fafc !important;
    border-color: var(--border-color) !important;
    font-weight: 500;
}

/* --- ESTILO PARA EL SELECTOR DE FECHA --- */
#selectorFechaDashboard {
    cursor: pointer;
    min-width: 140px;
}

#selectorFechaDashboard:focus {
    border-color: var(--primary-color) !important;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15) !important;
}

/* --- ANIMACIÓN PARA EL BADGE DE DIFERENCIA --- */
#badgeDiferenciaFecha {
    transition: all 0.3s ease;
}

#badgeDiferenciaFecha:not(.d-none) {
    animation: fadeInBadge 0.4s ease;
}

@keyframes fadeInBadge {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

/* --- RESPONSIVE PARA EL HEADER DEL DASHBOARD --- */
@media (max-width: 768px) {
    .d-flex.justify-content-between.align-items-center.mb-4 {
        flex-direction: column;
        align-items: stretch !important;
        gap: 0.75rem;
    }
    
    .d-flex.justify-content-between.align-items-center.mb-4 > div:last-child {
        flex-wrap: wrap;
    }
    
    .input-group[style*="max-width: 220px"] {
        max-width: 100% !important;
    }
}
