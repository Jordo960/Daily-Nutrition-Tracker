import { DashboardUI } from './ui/dashboard.js?v=2';
import { LogUI } from './ui/log.js?v=2';
import { FoodInputUI } from './ui/food-input.js?v=2';
import { DateNavUI } from './ui/date-nav.js?v=2';

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
