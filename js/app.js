/**
 * Smart Split - Group Expense Tracker
 * Main Application Logic
 */

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS (Animate On Scroll)
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
    });

    // Initialize the app
    App.init();
});

// Main App Object
const App = {
    // App state
    data: {
        people: [],
        expenses: [],
    },
    storageMode: 'php', // 'php' or 'local'
    phpAvailable: true,
    summaryChart: null, // To hold the chart instance

    // Initialize the app
    async init() {
        // Check backend status
        await this.checkBackend();

        // Display username from session storage if using PHP backend
        if (this.storageMode === 'php') {
            const username = sessionStorage.getItem('username');
            if (username) {
                const usernameDisplay = document.getElementById('username-display');
                if (usernameDisplay) {
                    usernameDisplay.textContent = username;
                }
            }
        } else {
            // Adjust UI for local storage mode
            this.setupLocalModeUI();
        }

        // Load initial data
        await this.loadData();

        // Initialize UI components
        UI.init();

        // Initialize sound effects
        Sounds.init();

        // Render initial data
        this.renderAll();

        // Set up event listeners
        this.setupEventListeners();
    },

    // Check if the PHP backend is available
    async checkBackend() {
        try {
            const response = await fetch('php/api.php?action=check_auth', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error('Backend not available');
            this.phpAvailable = true;
            this.storageMode = 'php';
        } catch (error) {
            console.warn('PHP backend not available. Falling back to local storage.');
            this.phpAvailable = false;
            this.storageMode = 'local';
            LocalStorageManager.initialize();
        }
    },

    // Adjust UI for local storage mode
    setupLocalModeUI() {
        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            // Add a more prominent offline indicator
            userInfo.innerHTML = 'Welcome, Guest <span class="offline-badge">Offline</span>';
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }

        // Show a notification that the app is in offline mode
        Swal.fire({
            title: 'Offline Mode',
            text: 'The server is unavailable. Your data will be saved locally on this device.',
            icon: 'info',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true
        });
    },

    // Load data based on the current storage mode
    async loadData() {
        if (this.storageMode === 'php') {
            await this.loadDataFromPHP();
        } else {
            await this.loadDataFromLocal();
        }
    },

    // Load data from the PHP backend
    async loadDataFromPHP() {
        try {
            const response = await fetch('php/api.php?action=get_data');
            if (response.status === 401) {
                window.location.href = 'login.html';
                return;
            }
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const serverData = await response.json();
            this.data.people = serverData.people || [];
            this.data.expenses = serverData.expenses || [];

            // Sanitize data from server
            this.data.people.forEach(p => {
                p.id = parseInt(p.id);
                p.totalPaid = parseFloat(p.totalPaid || 0);
                p.totalOwed = parseFloat(p.totalOwed || 0);
            });
            this.data.expenses.forEach(e => {
                e.id = parseInt(e.id);
                e.amount = parseFloat(e.amount);
                e.payerId = parseInt(e.payerId);
                e.splitAmount = parseFloat(e.splitAmount);
                e.splitBetween = JSON.parse(e.splitBetween || '[]');
            });

            this.recalculateBalances();
        } catch (error) {
            console.error('Error loading data from PHP:', error);
        }
    },

    // Load data from local storage
    async loadDataFromLocal() {
        const localData = LocalStorageManager.getData();
        this.data.people = localData.people || [];
        this.data.expenses = localData.expenses || [];
        this.recalculateBalances();
    },
    
    // Recalculate all balances from scratch based on expenses
    recalculateBalances() {
        // Reset balances
        this.data.people.forEach(person => {
            person.totalPaid = 0;
            person.totalOwed = 0;
        });

        // Recalculate based on expenses
        this.data.expenses.forEach(expense => {
            const payer = this.data.people.find(p => p.id === expense.payerId);
            if (payer) {
                payer.totalPaid += expense.amount;
            }

            if (Array.isArray(expense.splitBetween)) {
                expense.splitBetween.forEach(personId => {
                    const person = this.data.people.find(p => p.id === personId);
                    if (person) {
                        person.totalOwed += expense.splitAmount;
                    }
                });
            }
        });
    },

    // Set up event listeners for the app
    setupEventListeners() {
        // ... (event listeners remain mostly the same)
        // Navigation
        const mainNav = document.querySelector('.main-nav');
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                if (page) {
                    UI.showPage(page);
                    // Close the mobile nav on link click
                    if (mainNav.classList.contains('nav-open')) {
                        mainNav.classList.remove('nav-open');
                    }
                }
            });
        });

        // Add Expense Buttons
        document.getElementById('add-expense-btn').addEventListener('click', () => UI.showModal('add-expense-modal'));
        document.getElementById('add-expense-btn-2').addEventListener('click', () => UI.showModal('add-expense-modal'));

        // Add Person Button
        document.getElementById('add-person-btn').addEventListener('click', () => UI.showModal('add-person-modal'));

        // Close Modal Buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => UI.closeAllModals());
        });

        // Add Person Form
        document.getElementById('add-person-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPerson();
        });

        // Add Expense Form
        document.getElementById('add-expense-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });

        // Emoji Picker
        document.querySelectorAll('#emoji-picker span').forEach(emoji => {
            emoji.addEventListener('click', () => {
                document.querySelectorAll('#emoji-picker span').forEach(e => e.classList.remove('selected'));
                emoji.classList.add('selected');
                document.getElementById('person-emoji').value = emoji.getAttribute('data-emoji');
            });
        });

        // Settle Up Button
        document.getElementById('settle-up-btn').addEventListener('click', () => {
            UI.showPage('summary');
        });

        // Settle All Debts Button
        document.getElementById('settle-all-btn').addEventListener('click', () => {
            this.settleAllDebts();
        });

        // Settings Buttons
        document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());
        document.getElementById('import-data-btn').addEventListener('click', () => UI.showModal('import-data-modal'));
        document.getElementById('import-data-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.importData();
        });
        document.getElementById('clear-data-btn').addEventListener('click', () => this.clearData());
        document.getElementById('reset-app-btn').addEventListener('click', () => this.resetApp());

        // Logout Button
        const logoutBtn = document.getElementById('logout-btn');
        if(logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Hamburger Menu Toggle
        const navToggle = document.querySelector('.nav-toggle');
        if (navToggle) {
            navToggle.addEventListener('click', () => {
                const mainNav = document.querySelector('.main-nav');
                mainNav.classList.toggle('nav-open');
            });
        }
    },

    // Logout the user (only if using PHP backend)
    async logout() {
        if (this.storageMode !== 'php') return;
        try {
            const response = await fetch('php/api.php?action=logout');
            const data = await response.json();
            if (data.success) {
                sessionStorage.removeItem('username');
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Logout failed:', error);
            window.location.href = 'login.html';
        }
    },

    // Render all data
    renderAll() {
        this.recalculateBalances();
        this.renderPeople();
        this.renderExpenses();
        this.renderRecentExpenses();
        this.renderSummary();
        this.updateTotalBalance();
    },

    // Add a new person
    async addPerson() {
        const nameInput = document.getElementById('person-name');
        const emojiInput = document.getElementById('person-emoji');
        const name = nameInput.value.trim();
        const emoji = emojiInput.value;

        if (name === '') {
            Swal.fire('Oops!', 'Person name cannot be empty.', 'error');
            return;
        }
        if (this.data.people.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            Swal.fire('Oops!', `A person named "${name}" already exists.`, 'error');
            return;
        }

        const newPersonData = { name, emoji };

        try {
            let savedPerson;
            if (this.storageMode === 'php') {
                const response = await fetch('php/api.php?action=add_person', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newPersonData),
                });
                if (!response.ok) {
                    let errorMessage = 'An unknown server error occurred.';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || `Server responded with status ${response.status}.`;
                    } catch (e) {
                        // Response was not JSON or was empty
                        errorMessage = `Server responded with status ${response.status}.`;
                    }
                    throw new Error(errorMessage);
                }
                savedPerson = await response.json();
                savedPerson.id = parseInt(savedPerson.id);
                savedPerson.totalPaid = 0;
                savedPerson.totalOwed = 0;
            } else {
                savedPerson = LocalStorageManager.addPerson(newPersonData);
            }

            this.data.people.push(savedPerson);
            this.renderPeople();

            // Reset form and close modal
            nameInput.value = '';
            UI.closeAllModals();
            Swal.fire('Person Added!', `${name} has been added.`, 'success');
        } catch (error) {
            console.error('Error adding person:', error);
            Swal.fire('Error!', `Could not add person. ${error.message}`, 'error');
        }
    },

    // Add a new expense
    async addExpense() {
        // ... (Input gathering and validation)
        const description = document.getElementById('expense-description').value.trim();
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const payerId = parseInt(document.getElementById('expense-payer').value);
        const date = document.getElementById('expense-date').value;
        const category = document.getElementById('expense-category').value;
        const splitBetween = Array.from(document.querySelectorAll('#expense-split-people input:checked')).map(cb => parseInt(cb.value));

        if (!description || isNaN(amount) || amount <= 0 || isNaN(payerId) || !date || splitBetween.length === 0) {
            Swal.fire('Oops!', 'Please fill out all fields correctly.', 'error');
            return;
        }

        const newExpenseData = {
            description, amount, payerId, date, category, splitBetween,
            splitAmount: amount / splitBetween.length,
            timestamp: new Date().getTime()
        };

        try {
            let savedExpense;
            if (this.storageMode === 'php') {
                const response = await fetch('php/api.php?action=add_expense', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newExpenseData)
                });
                if (!response.ok) throw new Error('Server error');
                savedExpense = await response.json();
                savedExpense.id = parseInt(savedExpense.id);
                savedExpense.amount = parseFloat(savedExpense.amount);
                savedExpense.payerId = parseInt(savedExpense.payerId);
                savedExpense.splitAmount = parseFloat(savedExpense.splitAmount);
                savedExpense.splitBetween = JSON.parse(savedExpense.splitBetween);
            } else {
                savedExpense = LocalStorageManager.addExpense(newExpenseData);
            }

            this.data.expenses.push(savedExpense);
            this.renderAll();

            // Reset form and close modal
            document.getElementById('add-expense-form').reset();
            document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
            UI.closeAllModals();
            Sounds.playCashSound();
            Swal.fire('Ka-Ching!', 'Expense added successfully!', 'success').then(() => UI.showConfetti());
        } catch (error) {
            console.error('Error adding expense:', error);
            Swal.fire('Error!', 'Could not add expense.', 'error');
        }
    },

    // Delete a person
    async deletePerson(personId) {
        const person = this.data.people.find(p => p.id === personId);
        if (!person) return;

        if (this.data.expenses.some(e => e.payerId === personId || e.splitBetween.includes(personId))) {
            Swal.fire('Cannot Delete', 'This person is involved in expenses. Please remove them first.', 'error');
            return;
        }

        const result = await Swal.fire({ title: 'Are you sure?', text: `Delete ${person.name}?`, icon: 'warning', showCancelButton: true });
        if (result.isConfirmed) {
            try {
                if (this.storageMode === 'php') {
                    const response = await fetch(`php/api.php?action=delete_person&id=${personId}`, { method: 'POST' });
                    if (!response.ok) throw new Error('Server error');
                } else {
                    LocalStorageManager.deletePerson(personId);
                }

                this.data.people = this.data.people.filter(p => p.id !== personId);
                this.renderAll();
                Swal.fire('Deleted!', 'Person has been deleted.', 'success');
            } catch (error) {
                console.error('Error deleting person:', error);
                Swal.fire('Error!', 'Could not delete person.', 'error');
            }
        }
    },

    // Delete an expense
    async deleteExpense(expenseId) {
        const expense = this.data.expenses.find(e => e.id === expenseId);
        if (!expense) return;

        const result = await Swal.fire({ title: 'Are you sure?', text: `Delete this expense?`, icon: 'warning', showCancelButton: true });
        if (result.isConfirmed) {
            try {
                if (this.storageMode === 'php') {
                    const response = await fetch(`php/api.php?action=delete_expense&id=${expenseId}`, { method: 'POST' });
                    if (!response.ok) throw new Error('Server error');
                } else {
                    LocalStorageManager.deleteExpense(expenseId);
                }

                this.data.expenses = this.data.expenses.filter(e => e.id !== expenseId);
                this.renderAll();
                Swal.fire('Deleted!', 'Expense has been deleted.', 'success');
            } catch (error) {
                console.error('Error deleting expense:', error);
                Swal.fire('Error!', 'Could not delete expense.', 'error');
            }
        }
    },

    // Settle all debts
    async settleAllDebts() {
        if (this.data.expenses.length === 0) {
            Swal.fire('No Expenses', 'There are no expenses to settle.', 'info');
            return;
        }
        const result = await Swal.fire({ title: 'Settle All Debts?', text: 'This will clear all expenses.', icon: 'warning', showCancelButton: true });
        if (result.isConfirmed) {
            try {
                if (this.storageMode === 'php') {
                    const response = await fetch('php/api.php?action=settle_all', { method: 'POST' });
                    if (!response.ok) throw new Error('Server error');
                } else {
                    LocalStorageManager.settleAll();
                }

                this.data.expenses = [];
                this.renderAll();
                Sounds.playSettleSound();
                Swal.fire('All Settled!', 'All debts have been cleared.', 'success').then(() => UI.showConfetti());
            } catch (error) {
                console.error('Error settling debts:', error);
                Swal.fire('Error!', 'Could not settle debts.', 'error');
            }
        }
    },

    // Clear all data
    async clearData() {
        const result = await Swal.fire({ title: 'Clear All Data?', text: 'This will delete everything. This cannot be undone.', icon: 'warning', showCancelButton: true });
        if (result.isConfirmed) {
            try {
                if (this.storageMode === 'php') {
                    const response = await fetch('php/api.php?action=clear_all', { method: 'POST' });
                    if (!response.ok) throw new Error('Server error');
                } else {
                    LocalStorageManager.clearAll();
                }

                this.data = { people: [], expenses: [] };
                this.renderAll();
                Swal.fire('Data Cleared!', 'All data has been cleared.', 'success');
            } catch (error) {
                console.error('Error clearing data:', error);
                Swal.fire('Error!', 'Could not clear data.', 'error');
            }
        }
    },

    // Import data
    async importData() {
        const importDataEl = document.getElementById('import-data');
        const importData = importDataEl.value;

        try {
            const parsedData = JSON.parse(importData);
            if (!parsedData.people || !parsedData.expenses) throw new Error('Invalid data format');

            const result = await Swal.fire({ title: 'Import Data?', text: 'This will replace all current data.', icon: 'warning', showCancelButton: true });
            if (result.isConfirmed) {
                if (this.storageMode === 'php') {
                    const response = await fetch('php/api.php?action=import_data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(parsedData)
                    });
                    if (!response.ok) throw new Error('Server error during import');
                } else {
                    LocalStorageManager.importData(parsedData);
                }

                await this.loadData();
                this.renderAll();
                UI.closeAllModals();
                Swal.fire('Data Imported!', 'Data has been imported successfully.', 'success');
            }
        } catch (error) {
            console.error('Import failed:', error);
            Swal.fire('Import Failed', 'Please check the data format.', 'error');
        }
    },

    // NOTE: Edit Person and Edit Expense have been omitted for brevity in this refactoring example,
    // but they would follow the same pattern of checking `this.storageMode` and calling the
    // appropriate backend or local storage function. The logic inside the Swal modals for
    // updating remains the same, but the final save action would be conditional.
    // ... editPerson and editExpense methods would be here ...

    // Render methods (no changes needed, they work off App.data)
    renderPeople() {
        const peopleList = document.getElementById('people-list');
        const expensePayer = document.getElementById('expense-payer');
        const expenseSplitPeople = document.getElementById('expense-split-people');

        // Clear existing content
        peopleList.innerHTML = '';
        expensePayer.innerHTML = '';
        expenseSplitPeople.innerHTML = '';

        if (this.data.people.length === 0) {
            peopleList.innerHTML = `<div class="empty-state"><i class="fas fa-users fa-3x"></i><p>No people added yet!</p></div>`;
            return;
        }

        // Populate lists
        this.data.people.forEach(person => {
            const balance = person.totalPaid - person.totalOwed;
            const balanceClass = balance >= 0 ? 'positive' : 'negative';
            const balanceText = balance >= 0 ? `Gets back $${balance.toFixed(2)}` : `Owes $${Math.abs(balance).toFixed(2)}`;

            const safeName = UI.escapeHTML(person.name);
            const safeEmoji = UI.escapeHTML(person.emoji);

            const personCard = document.createElement('div');
            personCard.className = 'person-card';
            personCard.innerHTML = `
                <div class="person-emoji">${safeEmoji}</div>
                <div class="person-info">
                    <h3>${safeName}</h3>
                    <div class="person-balance ${balanceClass}">${balanceText}</div>
                </div>
                <div class="person-actions">
                    <button class="delete-person" data-id="${person.id}" title="Delete"><i class="fas fa-trash"></i></button>
                </div>`;
            peopleList.appendChild(personCard);

            const option = document.createElement('option');
            option.value = person.id;
            option.textContent = `${safeEmoji} ${safeName}`;
            expensePayer.appendChild(option);

            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'checkbox-item';
            checkboxItem.innerHTML = `<input type="checkbox" id="split-person-${person.id}" value="${person.id}" checked><label for="split-person-${person.id}">${safeEmoji} ${safeName}</label>`;
            expenseSplitPeople.appendChild(checkboxItem);
        });

        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-person').forEach(btn => {
            btn.addEventListener('click', () => this.deletePerson(parseInt(btn.getAttribute('data-id'))));
        });
    },

    renderExpenses() {
        const expensesList = document.getElementById('expenses-list');
        expensesList.innerHTML = '';

        if (this.data.expenses.length === 0) {
            expensesList.innerHTML = `<div class="empty-state"><i class="fas fa-receipt fa-3x"></i><p>No expenses yet!</p></div>`;
            return;
        }

        const sortedExpenses = [...this.data.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedExpenses.forEach(expense => {
            const payer = this.data.people.find(p => p.id === expense.payerId);
            if (!payer) return;

            const safeDescription = UI.escapeHTML(expense.description);
            const safePayerName = UI.escapeHTML(payer.name);
            const safePayerEmoji = UI.escapeHTML(payer.emoji);

            const expenseItem = document.createElement('div');
            expenseItem.className = 'expense-item';
            // ... (HTML generation for expense item)
            expenseItem.innerHTML = `
                <div class="expense-icon"><i class="fas fa-receipt"></i></div>
                <div class="expense-details">
                    <h3>${safeDescription}</h3>
                    <p>Paid by ${safePayerEmoji} ${safePayerName}</p>
                </div>
                <div class="expense-amount">$${expense.amount.toFixed(2)}</div>
                <div class="expense-actions">
                     <button class="delete-expense" data-id="${expense.id}" title="Delete"><i class="fas fa-trash"></i></button>
                </div>`;

            expensesList.appendChild(expenseItem);
        });

        document.querySelectorAll('.delete-expense').forEach(btn => {
            btn.addEventListener('click', () => this.deleteExpense(parseInt(btn.getAttribute('data-id'))));
        });
    },

    renderRecentExpenses() {
        const recentExpensesList = document.getElementById('recent-expenses-list');
        recentExpensesList.innerHTML = '';

        if (this.data.expenses.length === 0) {
            recentExpensesList.innerHTML = `<div class="empty-state"><i class="fas fa-receipt fa-3x"></i><p>No recent expenses.</p></div>`;
            return;
        }

        const recentExpenses = [...this.data.expenses].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
        recentExpenses.forEach(expense => {
            const payer = this.data.people.find(p => p.id === expense.payerId);
            if (!payer) return;
            const safeDescription = UI.escapeHTML(expense.description);
            const safePayerName = UI.escapeHTML(payer.name);

            const expenseCard = document.createElement('div');
            expenseCard.className = 'expense-card';
            expenseCard.innerHTML = `
                <div class="card-icon">💰</div>
                <div class="card-details">
                    <span class="card-description">${safeDescription}</span>
                    <span class="card-payer">Paid by ${safePayerName}</span>
                </div>
                <div class="card-amount">$${expense.amount.toFixed(2)}</div>
            `;
            recentExpensesList.appendChild(expenseCard);
        });
    },

    renderSummary() {
        const settlementSummary = document.getElementById('settlement-summary');
        const chartContainer = document.querySelector('.summary-chart-container');
        const chartCanvas = document.getElementById('summary-chart');

        // Always clear previous state
        settlementSummary.innerHTML = '';
        if (this.summaryChart) {
            this.summaryChart.destroy();
            this.summaryChart = null;
        }

        // Handle empty state for both chart and settlements
        if (this.data.expenses.length === 0) {
            settlementSummary.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle fa-3x"></i><p>All settled up!</p></div>`;
            if (chartContainer) {
                chartContainer.style.display = 'none';
            }
            return;
        }

        // Show chart container if there are expenses
        if (chartContainer) {
            chartContainer.style.display = 'block';
        }

        // 1. Render Chart if canvas exists
        if (chartCanvas) {
            const stats = Data.getExpenseStats(this.data.people, this.data.expenses);
            const categoryData = {
                labels: Object.keys(stats.expensesByCategory).map(key => key.charAt(0).toUpperCase() + key.slice(1)),
                datasets: [{
                    data: Object.values(stats.expensesByCategory).map(cat => cat.total),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                    hoverOffset: 4
                }]
            };

            this.summaryChart = new Chart(chartCanvas, {
                type: 'pie',
                data: categoryData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Expenses by Category',
                            font: {
                                size: 16
                            }
                        }
                    }
                }
            });
        }

        // 2. Render Settlements
        const settlements = Data.calculateSettlements(this.data.people, this.data.expenses);
        if (settlements.length === 0) {
            // If there are expenses but no settlements, it means everything is balanced.
            settlementSummary.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle fa-3x"></i><p>Balances are all even!</p></div>`;
        } else {
            const summaryTitle = document.createElement('h2');
            summaryTitle.textContent = 'Who Owes Whom';
            settlementSummary.appendChild(summaryTitle);

            settlements.forEach(s => {
                const settlementItem = document.createElement('div');
                settlementItem.className = 'settlement-item';
                const safeFromName = UI.escapeHTML(s.from.name);
                const safeFromEmoji = UI.escapeHTML(s.from.emoji);
                const safeToName = UI.escapeHTML(s.to.name);
                const safeToEmoji = UI.escapeHTML(s.to.emoji);

                settlementItem.innerHTML = `
                    <span class="settlement-from">${safeFromEmoji} ${safeFromName}</span>
                    <span class="settlement-arrow">→</span>
                    <span class="settlement-to">${safeToEmoji} ${safeToName}</span>
                    <span class="settlement-amount">$${s.amount.toFixed(2)}</span>
                `;
                settlementSummary.appendChild(settlementItem);
            });
        }
    },

    updateTotalBalance() {
        const balanceAmount = document.querySelector('.balance-amount');
        const totalExpenses = this.data.expenses.reduce((total, expense) => total + expense.amount, 0);
        balanceAmount.textContent = `$${totalExpenses.toFixed(2)}`;
    },

    resetApp() {
        Swal.fire({
            title: 'Reset App?',
            text: 'This will reload the application. Unsaved changes may be lost.',
            icon: 'warning',
            showCancelButton: true,
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.reload();
            }
        });
    }
};