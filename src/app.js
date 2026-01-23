import { DashboardUI } from './ui/dashboard.js';
import { LogUI } from './ui/log.js';
import { FoodInputUI } from './ui/food-input.js';
import { DateNavUI } from './ui/date-nav.js';

// Initialize Components
document.addEventListener('DOMContentLoaded', () => {
    // Set Date - Now handled by DateNavUI replace
    // document.getElementById('date-display').textContent = ...

    DateNavUI.init();
    DashboardUI.init();
    LogUI.init();
    FoodInputUI.init();

    // Initial load animation or setup could go here
});
