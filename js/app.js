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

    // Initialize the app
    async init() {
        // Display username from session storage
        const username = sessionStorage.getItem('username');
        if (username) {
            const usernameDisplay = document.getElementById('username-display');
            if (usernameDisplay) {
                usernameDisplay.textContent = username;
            }
        }

        // Load data from the server
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

    // Load data from the server
    async loadData() {
        try {
            const response = await fetch('php/api.php?action=get_data');
            if (response.status === 401) {
                window.location.href = 'login.html';
                return;
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const serverData = await response.json();

            // Make sure the data is in the expected format
            this.data.people = serverData.people || [];
            this.data.expenses = serverData.expenses || [];

            // The backend sends numeric values as strings, convert them back
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
                // The 'splitBetween' field is a JSON string, parse it
                e.splitBetween = JSON.parse(e.splitBetween || '[]');
            });

            this.recalculateBalances();

        } catch (error) {
            console.error('Error loading data:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Could not load data from the server. Please ensure the backend is running and the database is set up correctly.',
                icon: 'error',
                confirmButtonColor: '#FF6B6B'
            });
        }
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
        // Navigation
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                UI.showPage(page);
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
                const navLinks = document.querySelector('.nav-links');
                navLinks.classList.toggle('nav-open');
                navToggle.classList.toggle('nav-open');
            });
        }
    },

    // Logout the user
    async logout() {
        try {
            const response = await fetch('php/api.php?action=logout');
            const data = await response.json();
            if (data.success) {
                sessionStorage.removeItem('username');
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Logout failed:', error);
            // Even if server fails, force redirect
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
            Swal.fire({
                title: 'Oops!',
                text: 'Please enter a name',
                icon: 'error',
                confirmButtonColor: '#FF6B6B'
            });
            return;
        }

        // Check if name already exists
        if (this.data.people.some(person => person.name.toLowerCase() === name.toLowerCase())) {
            Swal.fire({
                title: 'Duplicate Name!',
                text: 'This person already exists',
                icon: 'warning',
                confirmButtonColor: '#FF6B6B'
            });
            return;
        }

        const newPerson = {
            name,
            emoji
        };

        try {
            const response = await fetch('php/api.php?action=add_person', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newPerson),
            });

            if (!response.ok) {
                throw new Error('Server responded with an error');
            }

            const savedPerson = await response.json();
            savedPerson.id = parseInt(savedPerson.id); // Ensure ID is an integer
            savedPerson.totalPaid = 0;
            savedPerson.totalOwed = 0;


            this.data.people.push(savedPerson);
            this.renderPeople();

            // Reset form and close modal
            nameInput.value = '';
            document.querySelectorAll('#emoji-picker span').forEach(e => e.classList.remove('selected'));
            document.querySelector('#emoji-picker span').classList.add('selected');
            emojiInput.value = document.querySelector('#emoji-picker span').getAttribute('data-emoji');

            UI.closeAllModals();

            // Show success message
            Swal.fire({
                title: 'Person Added!',
                text: `${name} has been added to the group`,
                icon: 'success',
                confirmButtonColor: '#4ECDC4'
            });
        } catch (error) {
            console.error('Error adding person:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Could not add person. Please try again.',
                icon: 'error',
                confirmButtonColor: '#FF6B6B'
            });
        }
    },

    // Add a new expense
    async addExpense() {
        const descriptionInput = document.getElementById('expense-description');
        const amountInput = document.getElementById('expense-amount');
        const payerInput = document.getElementById('expense-payer');
        const dateInput = document.getElementById('expense-date');
        const categoryInput = document.getElementById('expense-category');

        const description = descriptionInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const payerId = parseInt(payerInput.value);
        const date = dateInput.value;
        const category = categoryInput.value;

        // Validate inputs
        if (description === '' || isNaN(amount) || amount <= 0 || isNaN(payerId)) {
            Swal.fire({
                title: 'Oops!',
                text: 'Please fill in all fields correctly',
                icon: 'error',
                confirmButtonColor: '#FF6B6B'
            });
            return;
        }

        // Get split people
        const splitBetween = [];
        document.querySelectorAll('#expense-split-people input:checked').forEach(checkbox => {
            splitBetween.push(parseInt(checkbox.value));
        });

        if (splitBetween.length === 0) {
            Swal.fire({
                title: 'Oops!',
                text: 'Please select at least one person to split with',
                icon: 'error',
                confirmButtonColor: '#FF6B6B'
            });
            return;
        }

        // Calculate split amount
        const splitAmount = amount / splitBetween.length;

        // Create new expense
        const newExpense = {
            description,
            amount,
            payerId,
            date,
            category,
            splitBetween,
            splitAmount,
            timestamp: new Date().getTime()
        };

        try {
            const response = await fetch('php/api.php?action=add_expense', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newExpense),
            });

            if (!response.ok) {
                throw new Error('Server responded with an error');
            }

            const savedExpense = await response.json();
            // Ensure numeric types are correct
            savedExpense.id = parseInt(savedExpense.id);
            savedExpense.amount = parseFloat(savedExpense.amount);
            savedExpense.payerId = parseInt(savedExpense.payerId);
            savedExpense.splitAmount = parseFloat(savedExpense.splitAmount);
            savedExpense.splitBetween = JSON.parse(savedExpense.splitBetween);


            this.data.expenses.push(savedExpense);
            this.renderAll();

            // Reset form and close modal
            descriptionInput.value = '';
            amountInput.value = '';
            dateInput.value = new Date().toISOString().split('T')[0];
            categoryInput.value = 'food';

            UI.closeAllModals();

            // Play cash register sound
            Sounds.playCashSound();

            // Show success message with confetti
            Swal.fire({
                title: 'Ka-Ching!',
                text: `Expense of $${amount.toFixed(2)} has been added`,
                icon: 'success',
                confirmButtonColor: '#4ECDC4'
            }).then(() => {
                UI.showConfetti();
            });
        } catch (error) {
            console.error('Error adding expense:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Could not add expense. Please try again.',
                icon: 'error',
                confirmButtonColor: '#FF6B6B'
            });
        }
    },

    // Render people list
    renderPeople() {
        const peopleList = document.getElementById('people-list');
        const expensePayer = document.getElementById('expense-payer');
        const expenseSplitPeople = document.getElementById('expense-split-people');

        // Clear existing content
        peopleList.innerHTML = '';
        expensePayer.innerHTML = '';
        expenseSplitPeople.innerHTML = '';

        if (this.data.people.length === 0) {
            peopleList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users fa-3x"></i>
                    <p>No people added yet! Add someone to get started.</p>
                </div>
            `;
            return;
        }

        // Populate people list
        this.data.people.forEach(person => {
            const balance = person.totalPaid - person.totalOwed;
            const balanceClass = balance >= 0 ? 'positive' : 'negative';
            const balanceText = balance >= 0 ? `Gets back $${balance.toFixed(2)}` : `Owes $${Math.abs(balance).toFixed(2)}`;

            const personCard = document.createElement('div');
            personCard.className = 'person-card';
            personCard.innerHTML = `
                <div class="person-emoji">${person.emoji}</div>
                <div class="person-info">
                    <h3>${person.name}</h3>
                    <div class="person-balance ${balanceClass}">${balanceText}</div>
                </div>
                <div class="person-actions">
                    <button class="edit-person" data-id="${person.id}" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="delete-person" data-id="${person.id}" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            `;

            peopleList.appendChild(personCard);

            // Add to expense payer dropdown
            const option = document.createElement('option');
            option.value = person.id;
            option.textContent = `${person.emoji} ${person.name}`;
            expensePayer.appendChild(option);

            // Add to expense split checkboxes
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'checkbox-item';
            checkboxItem.innerHTML = `
                <input type="checkbox" id="split-person-${person.id}" value="${person.id}" checked>
                <label for="split-person-${person.id}">${person.emoji} ${person.name}</label>
            `;
            expenseSplitPeople.appendChild(checkboxItem);
        });

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-person').forEach(btn => {
            btn.addEventListener('click', () => {
                this.editPerson(parseInt(btn.getAttribute('data-id')));
            });
        });

        document.querySelectorAll('.delete-person').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deletePerson(parseInt(btn.getAttribute('data-id')));
            });
        });
    },

    // Edit a person
    async editPerson(personId) {
        const person = this.data.people.find(p => p.id === personId);
        if (!person) return;

        const {
            value: formValues
        } = await Swal.fire({
            title: 'Edit Person',
            html: `
                <div class="form-group">
                    <label for="edit-person-name">Name</label>
                    <input type="text" id="edit-person-name" class="swal2-input" value="${person.name}" placeholder="Enter name">
                </div>
                <div class="form-group">
                    <label>Emoji</label>
                    <div class="emoji-picker swal2-emoji-picker">
                        <span data-emoji="😀" ${person.emoji === '😀' ? 'class="selected"' : ''}>😀</span>
                        <span data-emoji="😎" ${person.emoji === '😎' ? 'class="selected"' : ''}>😎</span>
                        <span data-emoji="🤠" ${person.emoji === '🤠' ? 'class="selected"' : ''}>🤠</span>
                        <span data-emoji="🧐" ${person.emoji === '🧐' ? 'class="selected"' : ''}>🧐</span>
                        <span data-emoji="🤑" ${person.emoji === '🤑' ? 'class="selected"' : ''}>🤑</span>
                        <span data-emoji="😇" ${person.emoji === '😇' ? 'class="selected"' : ''}>😇</span>
                        <span data-emoji="🥳" ${person.emoji === '🥳' ? 'class="selected"' : ''}>🥳</span>
                        <span data-emoji="🤩" ${person.emoji === '🤩' ? 'class="selected"' : ''}>🤩</span>
                    </div>
                    <input type="hidden" id="edit-person-emoji" value="${person.emoji}">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Save',
            confirmButtonColor: '#4ECDC4',
            cancelButtonColor: '#FF6B6B',
            preConfirm: () => {
                const name = document.getElementById('edit-person-name').value.trim();
                const emoji = document.getElementById('edit-person-emoji').value;

                if (name === '') {
                    Swal.showValidationMessage('Please enter a name');
                    return false;
                }

                if (this.data.people.some(p => p.id !== personId && p.name.toLowerCase() === name.toLowerCase())) {
                    Swal.showValidationMessage('This name already exists');
                    return false;
                }

                return {
                    name,
                    emoji
                };
            },
            didOpen: () => {
                document.querySelectorAll('.swal2-emoji-picker span').forEach(emoji => {
                    emoji.addEventListener('click', () => {
                        document.querySelectorAll('.swal2-emoji-picker span').forEach(e => e.classList.remove('selected'));
                        emoji.classList.add('selected');
                        document.getElementById('edit-person-emoji').value = emoji.getAttribute('data-emoji');
                    });
                });
            }
        });

        if (formValues) {
            try {
                const response = await fetch(`php/api.php?action=update_person&id=${personId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formValues),
                });

                if (!response.ok) throw new Error('Server error');

                person.name = formValues.name;
                person.emoji = formValues.emoji;

                this.renderAll();

                Swal.fire({
                    title: 'Updated!',
                    text: 'Person has been updated',
                    icon: 'success',
                    confirmButtonColor: '#4ECDC4'
                });
            } catch (error) {
                console.error('Error updating person:', error);
                Swal.fire('Error!', 'Could not update person.', 'error');
            }
        }
    },


    // Delete a person
    async deletePerson(personId) {
        const person = this.data.people.find(p => p.id === personId);
        if (!person) return;

        const isInvolved = this.data.expenses.some(expense => {
            return expense.payerId === personId || expense.splitBetween.includes(personId);
        });

        if (isInvolved) {
            Swal.fire({
                title: 'Cannot Delete',
                text: `${person.name} is involved in one or more expenses. Please remove those expenses first.`,
                icon: 'error',
                confirmButtonColor: '#FF6B6B'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete ${person.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete!',
            confirmButtonColor: '#FF6B6B',
            cancelButtonColor: '#4ECDC4'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`php/api.php?action=delete_person&id=${personId}`, {
                    method: 'POST'
                });
                if (!response.ok) throw new Error('Server error');

                this.data.people = this.data.people.filter(p => p.id !== personId);
                this.renderAll();

                Swal.fire({
                    title: 'Deleted!',
                    text: 'Person has been deleted',
                    icon: 'success',
                    confirmButtonColor: '#4ECDC4'
                });
            } catch (error) {
                console.error('Error deleting person:', error);
                Swal.fire('Error!', 'Could not delete person.', 'error');
            }
        }
    },


    // Render expenses list
    renderExpenses() {
        const expensesList = document.getElementById('expenses-list');
        expensesList.innerHTML = '';

        if (this.data.expenses.length === 0) {
            expensesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt fa-3x"></i>
                    <p>No expenses yet! Add your first expense.</p>
                </div>
            `;
            return;
        }

        const sortedExpenses = [...this.data.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedExpenses.forEach(expense => {
            const payer = this.data.people.find(p => p.id === expense.payerId);
            if (!payer) return;

            const expenseItem = document.createElement('div');
            expenseItem.className = 'expense-item';

            let categoryIcon = 'fa-receipt';
            switch (expense.category) {
                case 'food':
                    categoryIcon = 'fa-utensils';
                    break;
                case 'transportation':
                    categoryIcon = 'fa-car';
                    break;
                case 'entertainment':
                    categoryIcon = 'fa-film';
                    break;
                case 'shopping':
                    categoryIcon = 'fa-shopping-bag';
                    break;
                case 'utilities':
                    categoryIcon = 'fa-lightbulb';
                    break;
            }

            const expenseDate = new Date(expense.date);
            const formattedDate = expenseDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const splitNames = expense.splitBetween.map(id => {
                const person = this.data.people.find(p => p.id === id);
                return person ? person.name : 'Unknown';
            }).join(', ');

            expenseItem.innerHTML = `
                <div class="expense-icon">
                    <i class="fas ${categoryIcon}"></i>
                </div>
                <div class="expense-details">
                    <h3>${expense.description}</h3>
                    <p>Paid by ${payer.emoji} ${payer.name} on ${formattedDate}</p>
                    <p>Split between: ${splitNames}</p>
                </div>
                <div class="expense-amount">$${expense.amount.toFixed(2)}</div>
                <div class="expense-actions">
                    <button class="edit-expense" data-id="${expense.id}" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="delete-expense" data-id="${expense.id}" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            `;

            expensesList.appendChild(expenseItem);
        });

        document.querySelectorAll('.edit-expense').forEach(btn => {
            btn.addEventListener('click', () => {
                this.editExpense(parseInt(btn.getAttribute('data-id')));
            });
        });

        document.querySelectorAll('.delete-expense').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deleteExpense(parseInt(btn.getAttribute('data-id')));
            });
        });
    },

    // Render recent expenses on dashboard
    renderRecentExpenses() {
        const recentExpensesList = document.getElementById('recent-expenses-list');
        recentExpensesList.innerHTML = '';

        if (this.data.expenses.length === 0) {
            recentExpensesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt fa-3x"></i>
                    <p>No expenses yet! Add your first expense.</p>
                </div>
            `;
            return;
        }

        const recentExpenses = [...this.data.expenses]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 3);

        recentExpenses.forEach(expense => {
            const payer = this.data.people.find(p => p.id === expense.payerId);
            if (!payer) return;

            let categoryIcon = 'fa-receipt';
            switch (expense.category) {
                case 'food':
                    categoryIcon = 'fa-utensils';
                    break;
                case 'transportation':
                    categoryIcon = 'fa-car';
                    break;
                case 'entertainment':
                    categoryIcon = 'fa-film';
                    break;
                case 'shopping':
                    categoryIcon = 'fa-shopping-bag';
                    break;
                case 'utilities':
                    categoryIcon = 'fa-lightbulb';
                    break;
            }

            const expenseDate = new Date(expense.date);
            const formattedDate = expenseDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });

            const expenseCard = document.createElement('div');
            expenseCard.className = 'expense-card';
            expenseCard.setAttribute('data-aos', 'fade-up');
            expenseCard.innerHTML = `
                <div class="category">
                    <i class="fas ${categoryIcon}"></i> ${expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                </div>
                <h3>${expense.description}</h3>
                <div class="amount">$${expense.amount.toFixed(2)}</div>
                <div class="meta">
                    <div>${payer.emoji} ${payer.name}</div>
                    <div>${formattedDate}</div>
                </div>
            `;

            recentExpensesList.appendChild(expenseCard);
        });
    },

    // Edit an expense
    async editExpense(expenseId) {
        const expense = this.data.expenses.find(e => e.id === expenseId);
        if (!expense) return;

        // Prepare the HTML for the modal
        let splitCheckboxes = this.data.people.map(person => {
            const isChecked = expense.splitBetween.includes(person.id) ? 'checked' : '';
            return `
                <div class="checkbox-item">
                    <input type="checkbox" id="edit-split-person-${person.id}" value="${person.id}" ${isChecked}>
                    <label for="edit-split-person-${person.id}">${person.emoji} ${person.name}</label>
                </div>`;
        }).join('');

        let payerOptions = this.data.people.map(person => {
            const isSelected = person.id === expense.payerId ? 'selected' : '';
            return `<option value="${person.id}" ${isSelected}>${person.emoji} ${person.name}</option>`;
        }).join('');

        const categories = [{
            value: 'food',
            label: 'Food & Drinks 🍔'
        }, {
            value: 'transportation',
            label: 'Transportation 🚗'
        }, {
            value: 'entertainment',
            label: 'Entertainment 🎬'
        }, {
            value: 'shopping',
            label: 'Shopping 🛍️'
        }, {
            value: 'utilities',
            label: 'Utilities 💡'
        }, {
            value: 'other',
            label: 'Other 🤷'
        }];
        let categoryOptions = categories.map(cat => {
            const isSelected = cat.value === expense.category ? 'selected' : '';
            return `<option value="${cat.value}" ${isSelected}>${cat.label}</option>`;
        }).join('');

        const {
            value: formValues
        } = await Swal.fire({
            title: 'Edit Expense',
            html: `
                <div class="form-group"><label for="edit-expense-description">Description</label><input type="text" id="edit-expense-description" class="swal2-input" value="${expense.description}"></div>
                <div class="form-group"><label for="edit-expense-amount">Amount</label><div class="input-with-icon"><i class="fas fa-dollar-sign"></i><input type="number" id="edit-expense-amount" class="swal2-input" value="${expense.amount}"></div></div>
                <div class="form-group"><label for="edit-expense-payer">Paid by</label><select id="edit-expense-payer" class="swal2-select">${payerOptions}</select></div>
                <div class="form-group"><label>Split between</label><div id="edit-expense-split-people" class="checkbox-group">${splitCheckboxes}</div></div>
                <div class="form-group"><label for="edit-expense-date">Date</label><input type="date" id="edit-expense-date" class="swal2-input" value="${expense.date}"></div>
                <div class="form-group"><label for="edit-expense-category">Category</label><select id="edit-expense-category" class="swal2-select">${categoryOptions}</select></div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#4ECDC4',
            cancelButtonColor: '#FF6B6B',
            preConfirm: () => {
                const description = document.getElementById('edit-expense-description').value.trim();
                const amount = parseFloat(document.getElementById('edit-expense-amount').value);
                const payerId = parseInt(document.getElementById('edit-expense-payer').value);
                const date = document.getElementById('edit-expense-date').value;
                const category = document.getElementById('edit-expense-category').value;
                const splitBetween = Array.from(document.querySelectorAll('#edit-expense-split-people input:checked')).map(cb => parseInt(cb.value));

                if (!description || isNaN(amount) || amount <= 0 || isNaN(payerId) || !date || splitBetween.length === 0) {
                    Swal.showValidationMessage('Please fill in all fields correctly');
                    return false;
                }
                return {
                    description,
                    amount,
                    payerId,
                    date,
                    category,
                    splitBetween,
                    splitAmount: amount / splitBetween.length
                };
            }
        });

        if (formValues) {
            try {
                const response = await fetch(`php/api.php?action=update_expense&id=${expenseId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formValues)
                });
                if (!response.ok) throw new Error('Server error');

                // Update local data
                const index = this.data.expenses.findIndex(e => e.id === expenseId);
                if (index !== -1) {
                    this.data.expenses[index] = { ...expense,
                        ...formValues
                    };
                }

                this.renderAll();
                Swal.fire('Updated!', 'Expense has been updated.', 'success');
            } catch (error) {
                console.error('Error updating expense:', error);
                Swal.fire('Error!', 'Could not update expense.', 'error');
            }
        }
    },


    // Delete an expense
    async deleteExpense(expenseId) {
        const expense = this.data.expenses.find(e => e.id === expenseId);
        if (!expense) return;

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete this expense: ${expense.description}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete!',
            confirmButtonColor: '#FF6B6B',
            cancelButtonColor: '#4ECDC4'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`php/api.php?action=delete_expense&id=${expenseId}`, {
                    method: 'POST'
                });
                if (!response.ok) throw new Error('Server error');

                this.data.expenses = this.data.expenses.filter(e => e.id !== expenseId);
                this.renderAll();

                Swal.fire('Deleted!', 'Expense has been deleted.', 'success');
            } catch (error) {
                console.error('Error deleting expense:', error);
                Swal.fire('Error!', 'Could not delete the expense.', 'error');
            }
        }
    },

    // Render summary
    renderSummary() {
        const settlementSummary = document.getElementById('settlement-summary');
        const summaryChart = document.getElementById('summary-chart');

        settlementSummary.innerHTML = '';

        if (this.data.people.length === 0 || this.data.expenses.length === 0) {
            settlementSummary.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie fa-3x"></i>
                    <p>Add some expenses to see your summary!</p>
                </div>
            `;
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
            return;
        }

        const balances = this.data.people.map(person => ({
            id: person.id,
            name: person.name,
            emoji: person.emoji,
            balance: person.totalPaid - person.totalOwed
        }));

        const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
        const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

        const settlements = [];
        let creditorIndex = 0;
        let debtorIndex = 0;

        while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
            const creditor = creditors[creditorIndex];
            const debtor = debtors[debtorIndex];
            const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

            if (amount > 0.01) {
                settlements.push({
                    from: debtor,
                    to: creditor,
                    amount
                });
            }

            creditor.balance -= amount;
            debtor.balance += amount;

            if (creditor.balance < 0.01) creditorIndex++;
            if (Math.abs(debtor.balance) < 0.01) debtorIndex++;
        }

        if (settlements.length === 0) {
            settlementSummary.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle fa-3x"></i>
                    <p>All settled up! No one owes anything.</p>
                </div>
            `;
        } else {
            settlements.forEach(settlement => {
                const settlementItem = document.createElement('div');
                settlementItem.className = 'settlement-item';
                settlementItem.setAttribute('data-aos', 'fade-up');
                settlementItem.innerHTML = `
                    <div>
                        <strong>${settlement.from.emoji} ${settlement.from.name}</strong> owes
                        <strong>${settlement.to.emoji} ${settlement.to.name}</strong>
                    </div>
                    <div class="settlement-amount">$${settlement.amount.toFixed(2)}</div>
                `;
                settlementSummary.appendChild(settlementItem);
            });
        }

        this.renderChart(summaryChart, balances);
    },

    // Render chart for summary
    renderChart(canvas, balances) {
        const labels = balances.map(b => `${b.emoji} ${b.name}`);
        const data = balances.map(b => b.balance);
        const backgroundColor = balances.map(b => b.balance >= 0 ? '#4ECDC4' : '#FF6B6B');

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data.map(Math.abs),
                    backgroundColor: backgroundColor,
                    borderColor: '#292F36',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: '"Baloo 2", cursive',
                                size: 14
                            },
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const index = context.dataIndex;
                                const balance = data[index];
                                const label = context.label || '';
                                return `${label}: ${balance < 0 ? 'Owes' : 'Gets back'} $${Math.abs(balance).toFixed(2)}`;
                            }
                        }
                    }
                },
                cutout: '60%',
            }
        });
    },

    // Update total balance on dashboard
    updateTotalBalance() {
        const balanceAmount = document.querySelector('.balance-amount');
        const totalExpenses = this.data.expenses.reduce((total, expense) => total + expense.amount, 0);
        balanceAmount.textContent = `$${totalExpenses.toFixed(2)}`;
    },

    // Settle all debts
    async settleAllDebts() {
        if (this.data.expenses.length === 0) {
            Swal.fire('No Expenses', 'There are no expenses to settle', 'info');
            return;
        }

        const result = await Swal.fire({
            title: 'Settle All Debts?',
            text: 'This will mark all debts as settled and clear all expenses. This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, settle all!',
            confirmButtonColor: '#4ECDC4',
            cancelButtonColor: '#FF6B6B'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch('php/api.php?action=settle_all', {
                    method: 'POST'
                });
                if (!response.ok) throw new Error('Server error');

                this.data.expenses = [];
                this.renderAll();

                Sounds.playSettleSound();
                Swal.fire('All Settled!', 'All debts have been settled', 'success').then(() => UI.showConfetti());
            } catch (error) {
                console.error('Error settling debts:', error);
                Swal.fire('Error!', 'Could not settle debts.', 'error');
            }
        }
    },


    // Export data
    exportData() {
        const dataStr = JSON.stringify({
            people: this.data.people,
            expenses: this.data.expenses
        }, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', 'smart-split-data.json');
        linkElement.click();
        Swal.fire('Data Exported!', 'Your data has been exported successfully', 'success');
    },

    // Import data
    async importData() {
        const importDataEl = document.getElementById('import-data');
        const importData = importDataEl.value;

        try {
            const parsedData = JSON.parse(importData);
            if (!parsedData.people || !parsedData.expenses) {
                throw new Error('Invalid data format');
            }

            const result = await Swal.fire({
                title: 'Are you sure?',
                text: 'This will replace all your current data with the imported data. This action cannot be undone.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, import!',
                confirmButtonColor: '#4ECDC4',
                cancelButtonColor: '#FF6B6B'
            });

            if (result.isConfirmed) {
                const response = await fetch('php/api.php?action=import_data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsedData)
                });

                if (!response.ok) throw new Error('Server error during import');

                this.data.people = parsedData.people;
                this.data.expenses = parsedData.expenses;
                this.renderAll();

                UI.closeAllModals();
                Swal.fire('Data Imported!', 'Your data has been imported successfully.', 'success');
            }
        } catch (error) {
            console.error('Import failed:', error);
            Swal.fire('Import Failed', 'The data format is invalid or the server failed. Please check your JSON data.', 'error');
        }
    },

    // Clear all data
    async clearData() {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: 'This will delete all your data. This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, clear all!',
            confirmButtonColor: '#FF6B6B',
            cancelButtonColor: '#4ECDC4'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch('php/api.php?action=clear_all', {
                    method: 'POST'
                });
                if (!response.ok) throw new Error('Server error');

                this.data = { people: [], expenses: [] };
                this.renderAll();

                Swal.fire('Data Cleared!', 'All your data has been cleared', 'success');
            } catch (error) {
                console.error('Error clearing data:', error);
                Swal.fire('Error!', 'Could not clear data.', 'error');
            }
        }
    },

    // Reset app (now just reloads, as server holds the state)
    resetApp() {
        Swal.fire({
            title: 'Reset App?',
            text: 'This will reload the application from the server. Any unsaved changes will be lost.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, reset!',
            confirmButtonColor: '#FF6B6B',
            cancelButtonColor: '#4ECDC4'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.reload();
            }
        });
    }
};