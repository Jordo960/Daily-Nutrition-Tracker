import { store } from '../store.js';

export const LogUI = {
    init() {
        store.subscribe(() => this.render());
        this.render();

        // Event delegation for delete buttons if we add them
        document.getElementById('log-list').addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) {
                const timestamp = parseInt(e.target.closest('.delete-btn').dataset.id);
                store.removeFoodItem(timestamp);
            }
        });
    },

    render() {
        const list = document.getElementById('log-list');
        const foods = store.getCurrentLog();

        if (foods.length === 0) {
            list.innerHTML = '<li style="text-align:center; color: var(--text-secondary); padding: 20px;">No food eaten today</li>';
            return;
        }

        list.innerHTML = foods.slice().reverse().map(item => `
            <li class="log-item">
                <div class="log-item-info">
                    <h3>${item.name}</h3>
                    <div class="log-item-macros">
                        <span class="p-val">P: ${Math.round(item.protein).toLocaleString()}g</span>
                        <span class="f-val">F: ${Math.round(item.fat).toLocaleString()}g</span>
                        <span class="c-val">C: ${Math.round(item.carbs).toLocaleString()}g</span>
                        <span class="fib-val">Fib: ${Math.round(item.fiber || 0).toLocaleString()}g</span>
                        <span class="sug-val">Sug: ${Math.round(item.sugar || 0).toLocaleString()}g</span>
                        <span>${Math.round(item.calories).toLocaleString()} kcal</span>
                    </div>
                </div>
                <button class="close-modal delete-btn" data-id="${item.timestamp}" style="float:none; font-size: 1.2rem;">&times;</button>
            </li>
        `).join('');
    }
};
