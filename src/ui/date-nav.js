import { store } from '../store.js';

export const DateNavUI = {
    init() {
        this.render();
        store.subscribe(() => this.update());

        // Event Listeners are attached in render for simplicity in this small app
        // or we can attach to a container if we want delegating.
    },

    render() {
        const header = document.querySelector('.app-header');
        // We'll replace the existing date-display div with our controls
        const dateDisplay = document.getElementById('date-display');

        // Create container if not exists or reuse
        let container = document.getElementById('date-nav-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'date-nav-container';
            container.className = 'date-nav';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.gap = '12px';

            // Swap valid elements
            if (dateDisplay) {
                dateDisplay.replaceWith(container);
            } else {
                header.appendChild(container);
            }
        }

        const state = store.state;
        const current = new Date(state.selectedDate);

        // Format label
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Adjust for timezone offset to ensure "today" comparison works on date strings properly
        // Actually, store.selectedDate should be YYYY-MM-DD. 
        // Let's use string comparison for "Today" / "Tomorrow".
        const todayStr = this._formatDate(today);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = this._formatDate(tomorrow);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = this._formatDate(yesterday);

        let label = '';
        if (state.selectedDate === todayStr) label = 'Today';
        else if (state.selectedDate === tomorrowStr) label = 'Tomorrow';
        else if (state.selectedDate === yesterdayStr) label = 'Yesterday';
        else {
            // Friendly format: "Jan 16"
            // We need to parse YYYY-MM-DD strictly to avoid timezone shifts
            const [y, m, d] = state.selectedDate.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d);
            label = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }

        container.innerHTML = `
            <button id="nav-prev" class="btn-icon" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:1.2rem;">&lt;</button>
            <div style="font-weight:600; min-width:80px; text-align:center;">${label}</div>
            <button id="nav-next" class="btn-icon" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:1.2rem;">&gt;</button>
        `;

        document.getElementById('nav-prev').addEventListener('click', () => this.changeDate(-1));
        document.getElementById('nav-next').addEventListener('click', () => this.changeDate(1));
    },

    update() {
        // Re-render just the label part or whole thing. Re-rendering whole thing is easiest for state update.
        this.render();
    },

    changeDate(offset) {
        const currentState = store.state.selectedDate; // YYYY-MM-DD
        const [y, m, d] = currentState.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);

        dateObj.setDate(dateObj.getDate() + offset);
        const newDateStr = this._formatDate(dateObj);

        store.setDate(newDateStr);
    },

    _formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
};
