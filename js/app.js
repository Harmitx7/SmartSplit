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
        nextPersonId: 1,
        nextExpenseId: 1
    },
    
    // Initialize the app
    init() {
        // Load data from localStorage
        this.loadData();
        
        // Initialize UI components
        UI.init();
        
        // Initialize sound effects
        Sounds.init();
        
        // Render initial data
        this.renderAll();
        
        // Set up event listeners
        this.setupEventListeners();
    },
    
    // Load data from localStorage
    loadData() {
        const savedData = localStorage.getItem('smartSplitData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                this.data = parsedData;
            } catch (error) {
                console.error('Error loading data:', error);
                // If there's an error, use default empty data
            }
        }
    },
    
    // Save data to localStorage
    saveData() {
        localStorage.setItem('smartSplitData', JSON.stringify(this.data));
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
    },
    
    // Render all data
    renderAll() {
        this.renderPeople();
        this.renderExpenses();
        this.renderRecentExpenses();
        this.renderSummary();
        this.updateTotalBalance();
    },
    
    // Add a new person
    addPerson() {
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
            id: this.data.nextPersonId++,
            name,
            emoji,
            totalPaid: 0,
            totalOwed: 0
        };
        
        this.data.people.push(newPerson);
        this.saveData();
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
    },
    
    // Add a new expense
    addExpense() {
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
            id: this.data.nextExpenseId++,
            description,
            amount,
            payerId,
            date,
            category,
            splitBetween,
            splitAmount,
            timestamp: new Date().getTime()
        };
        
        this.data.expenses.push(newExpense);
        
        // Update person balances
        const payer = this.data.people.find(person => person.id === payerId);
        if (payer) {
            payer.totalPaid += amount;
        }
        
        splitBetween.forEach(personId => {
            const person = this.data.people.find(p => p.id === personId);
            if (person) {
                person.totalOwed += splitAmount;
            }
        });
        
        this.saveData();
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
    editPerson(personId) {
        const person = this.data.people.find(p => p.id === personId);
        if (!person) return;
        
        Swal.fire({
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
                
                // Check if name already exists (excluding this person)
                if (this.data.people.some(p => p.id !== personId && p.name.toLowerCase() === name.toLowerCase())) {
                    Swal.showValidationMessage('This name already exists');
                    return false;
                }
                
                return { name, emoji };
            },
            didOpen: () => {
                // Add event listeners for emoji picker
                document.querySelectorAll('.swal2-emoji-picker span').forEach(emoji => {
                    emoji.addEventListener('click', () => {
                        document.querySelectorAll('.swal2-emoji-picker span').forEach(e => e.classList.remove('selected'));
                        emoji.classList.add('selected');
                        document.getElementById('edit-person-emoji').value = emoji.getAttribute('data-emoji');
                    });
                });
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // Update person
                person.name = result.value.name;
                person.emoji = result.value.emoji;
                
                this.saveData();
                this.renderAll();
                
                Swal.fire({
                    title: 'Updated!',
                    text: 'Person has been updated',
                    icon: 'success',
                    confirmButtonColor: '#4ECDC4'
                });
            }
        });
    },
    
    // Delete a person
    deletePerson(personId) {
        const person = this.data.people.find(p => p.id === personId);
        if (!person) return;
        
        // Check if person is involved in any expenses
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
        
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete ${person.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete!',
            confirmButtonColor: '#FF6B6B',
            cancelButtonColor: '#4ECDC4'
        }).then((result) => {
            if (result.isConfirmed) {
                // Remove person
                this.data.people = this.data.people.filter(p => p.id !== personId);
                
                this.saveData();
                this.renderAll();
                
                Swal.fire({
                    title: 'Deleted!',
                    text: 'Person has been deleted',
                    icon: 'success',
                    confirmButtonColor: '#4ECDC4'
                });
            }
        });
    },
    
    // Render expenses list
    renderExpenses() {
        const expensesList = document.getElementById('expenses-list');
        
        // Clear existing content
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
        
        // Sort expenses by date (newest first)
        const sortedExpenses = [...this.data.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Populate expenses list
        sortedExpenses.forEach(expense => {
            const payer = this.data.people.find(p => p.id === expense.payerId);
            if (!payer) return;
            
            const expenseItem = document.createElement('div');
            expenseItem.className = 'expense-item';
            
            // Get category icon
            let categoryIcon = 'fa-receipt';
            switch (expense.category) {
                case 'food': categoryIcon = 'fa-utensils'; break;
                case 'transportation': categoryIcon = 'fa-car'; break;
                case 'entertainment': categoryIcon = 'fa-film'; break;
                case 'shopping': categoryIcon = 'fa-shopping-bag'; break;
                case 'utilities': categoryIcon = 'fa-lightbulb'; break;
                default: categoryIcon = 'fa-receipt';
            }
            
            // Format date
            const expenseDate = new Date(expense.date);
            const formattedDate = expenseDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            // Get split names
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
        
        // Add event listeners for edit and delete buttons
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
        
        // Clear existing content
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
        
        // Sort expenses by timestamp (newest first) and take the first 3
        const recentExpenses = [...this.data.expenses]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 3);
        
        // Populate recent expenses
        recentExpenses.forEach(expense => {
            const payer = this.data.people.find(p => p.id === expense.payerId);
            if (!payer) return;
            
            // Get category icon
            let categoryIcon = 'fa-receipt';
            switch (expense.category) {
                case 'food': categoryIcon = 'fa-utensils'; break;
                case 'transportation': categoryIcon = 'fa-car'; break;
                case 'entertainment': categoryIcon = 'fa-film'; break;
                case 'shopping': categoryIcon = 'fa-shopping-bag'; break;
                case 'utilities': categoryIcon = 'fa-lightbulb'; break;
                default: categoryIcon = 'fa-receipt';
            }
            
            // Format date
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
    editExpense(expenseId) {
        const expense = this.data.expenses.find(e => e.id === expenseId);
        if (!expense) return;
        
        // Prepare the HTML for the modal
        let splitCheckboxes = '';
        this.data.people.forEach(person => {
            const isChecked = expense.splitBetween.includes(person.id) ? 'checked' : '';
            splitCheckboxes += `
                <div class="checkbox-item">
                    <input type="checkbox" id="edit-split-person-${person.id}" value="${person.id}" ${isChecked}>
                    <label for="edit-split-person-${person.id}">${person.emoji} ${person.name}</label>
                </div>
            `;
        });
        
        let payerOptions = '';
        this.data.people.forEach(person => {
            const isSelected = person.id === expense.payerId ? 'selected' : '';
            payerOptions += `<option value="${person.id}" ${isSelected}>${person.emoji} ${person.name}</option>`;
        });
        
        let categoryOptions = '';
        const categories = [
            { value: 'food', label: 'Food & Drinks 🍔' },
            { value: 'transportation', label: 'Transportation 🚗' },
            { value: 'entertainment', label: 'Entertainment 🎬' },
            { value: 'shopping', label: 'Shopping 🛍️' },
            { value: 'utilities', label: 'Utilities 💡' },
            { value: 'other', label: 'Other 🤷' }
        ];
        
        categories.forEach(cat => {
            const isSelected = cat.value === expense.category ? 'selected' : '';
            categoryOptions += `<option value="${cat.value}" ${isSelected}>${cat.label}</option>`;
        });
        
        Swal.fire({
            title: 'Edit Expense',
            html: `
                <div class="form-group">
                    <label for="edit-expense-description">Description</label>
                    <input type="text" id="edit-expense-description" class="swal2-input" value="${expense.description}" placeholder="What was this for?">
                </div>
                
                <div class="form-group">
                    <label for="edit-expense-amount">Amount</label>
                    <div class="input-with-icon">
                        <i class="fas fa-dollar-sign"></i>
                        <input type="number" id="edit-expense-amount" class="swal2-input" min="0.01" step="0.01" value="${expense.amount}" placeholder="0.00">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="edit-expense-payer">Paid by</label>
                    <select id="edit-expense-payer" class="swal2-select">
                        ${payerOptions}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Split between</label>
                    <div id="edit-expense-split-people" class="checkbox-group">
                        ${splitCheckboxes}
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="edit-expense-date">Date</label>
                    <input type="date" id="edit-expense-date" class="swal2-input" value="${expense.date}">
                </div>
                
                <div class="form-group">
                    <label for="edit-expense-category">Category</label>
                    <select id="edit-expense-category" class="swal2-select">
                        ${categoryOptions}
                    </select>
                </div>
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
                
                // Validate inputs
                if (description === '' || isNaN(amount) || amount <= 0 || isNaN(payerId) || date === '') {
                    Swal.showValidationMessage('Please fill in all fields correctly');
                    return false;
                }
                
                // Get split people
                const splitBetween = [];
                document.querySelectorAll('#edit-expense-split-people input:checked').forEach(checkbox => {
                    splitBetween.push(parseInt(checkbox.value));
                });
                
                if (splitBetween.length === 0) {
                    Swal.showValidationMessage('Please select at least one person to split with');
                    return false;
                }
                
                return { description, amount, payerId, date, category, splitBetween };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // First, revert the old expense's effect on balances
                const oldPayer = this.data.people.find(person => person.id === expense.payerId);
                if (oldPayer) {
                    oldPayer.totalPaid -= expense.amount;
                }
                
                expense.splitBetween.forEach(personId => {
                    const person = this.data.people.find(p => p.id === personId);
                    if (person) {
                        person.totalOwed -= expense.splitAmount;
                    }
                });
                
                // Update expense with new values
                expense.description = result.value.description;
                expense.amount = result.value.amount;
                expense.payerId = result.value.payerId;
                expense.date = result.value.date;
                expense.category = result.value.category;
                expense.splitBetween = result.value.splitBetween;
                expense.splitAmount = expense.amount / expense.splitBetween.length;
                
                // Apply the new expense's effect on balances
                const newPayer = this.data.people.find(person => person.id === expense.payerId);
                if (newPayer) {
                    newPayer.totalPaid += expense.amount;
                }
                
                expense.splitBetween.forEach(personId => {
                    const person = this.data.people.find(p => p.id === personId);
                    if (person) {
                        person.totalOwed += expense.splitAmount;
                    }
                });
                
                this.saveData();
                this.renderAll();
                
                Swal.fire({
                    title: 'Updated!',
                    text: 'Expense has been updated',
                    icon: 'success',
                    confirmButtonColor: '#4ECDC4'
                });
            }
        });
    },
    
    // Delete an expense
    deleteExpense(expenseId) {
        const expense = this.data.expenses.find(e => e.id === expenseId);
        if (!expense) return;
        
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete this expense: ${expense.description}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete!',
            confirmButtonColor: '#FF6B6B',
            cancelButtonColor: '#4ECDC4'
        }).then((result) => {
            if (result.isConfirmed) {
                // Revert the expense's effect on balances
                const payer = this.data.people.find(person => person.id === expense.payerId);
                if (payer) {
                    payer.totalPaid -= expense.amount;
                }
                
                expense.splitBetween.forEach(personId => {
                    const person = this.data.people.find(p => p.id === personId);
                    if (person) {
                        person.totalOwed -= expense.splitAmount;
                    }
                });
                
                // Remove expense
                this.data.expenses = this.data.expenses.filter(e => e.id !== expenseId);
                
                this.saveData();
                this.renderAll();
                
                Swal.fire({
                    title: 'Deleted!',
                    text: 'Expense has been deleted',
                    icon: 'success',
                    confirmButtonColor: '#4ECDC4'
                });
            }
        });
    },
    
    // Render summary
    renderSummary() {
        const settlementSummary = document.getElementById('settlement-summary');
        const summaryChart = document.getElementById('summary-chart');
        
        // Clear existing content
        settlementSummary.innerHTML = '';
        
        if (this.data.people.length === 0 || this.data.expenses.length === 0) {
            settlementSummary.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie fa-3x"></i>
                    <p>Add some expenses to see your summary!</p>
                </div>
            `;
            
            // Clear chart
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
            
            return;
        }
        
        // Calculate net balances for each person
        const balances = this.data.people.map(person => {
            return {
                id: person.id,
                name: person.name,
                emoji: person.emoji,
                balance: person.totalPaid - person.totalOwed
            };
        });
        
        // Separate creditors (positive balance) and debtors (negative balance)
        const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
        const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);
        
        // Calculate settlements
        const settlements = [];
        
        // Deep copy of creditors and debtors to work with
        const creditorsWork = JSON.parse(JSON.stringify(creditors));
        const debtorsWork = JSON.parse(JSON.stringify(debtors));
        
        // Calculate settlements
        while (creditorsWork.length > 0 && debtorsWork.length > 0) {
            const creditor = creditorsWork[0];
            const debtor = debtorsWork[0];
            
            // Calculate the amount to settle
            const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
            
            if (amount > 0.01) { // Only add settlements for non-trivial amounts
                settlements.push({
                    from: debtor,
                    to: creditor,
                    amount
                });
            }
            
            // Update balances
            creditor.balance -= amount;
            debtor.balance += amount;
            
            // Remove settled parties
            if (Math.abs(creditor.balance) < 0.01) creditorsWork.shift();
            if (Math.abs(debtor.balance) < 0.01) debtorsWork.shift();
        }
        
        // Render settlements
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
        
        // Render chart
        this.renderChart(summaryChart, balances);
    },
    
    // Render chart for summary
    renderChart(canvas, balances) {
        // Prepare data for chart
        const labels = balances.map(b => `${b.emoji} ${b.name}`);
        const data = balances.map(b => Math.abs(b.balance));
        const backgroundColor = balances.map(b => b.balance >= 0 ? '#4ECDC4' : '#FF6B6B');
        
        // Destroy previous chart if exists
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Create new chart
        this.chart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
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
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.chart.getDatasetMeta(0).total;
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });
    },
    
    // Update total balance on dashboard
    updateTotalBalance() {
        const balanceAmount = document.querySelector('.balance-amount');
        
        // Calculate total expenses
        const totalExpenses = this.data.expenses.reduce((total, expense) => total + expense.amount, 0);
        
        balanceAmount.textContent = `$${totalExpenses.toFixed(2)}`;
    },
    
    // Settle all debts
    settleAllDebts() {
        if (this.data.expenses.length === 0) {
            Swal.fire({
                title: 'No Expenses',
                text: 'There are no expenses to settle',
                icon: 'info',
                confirmButtonColor: '#4ECDC4'
            });
            return;
        }
        
        Swal.fire({
            title: 'Settle All Debts?',
            text: 'This will mark all debts as settled and clear all expenses. This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, settle all!',
            confirmButtonColor: '#4ECDC4',
            cancelButtonColor: '#FF6B6B'
        }).then((result) => {
            if (result.isConfirmed) {
                // Reset all balances
                this.data.people.forEach(person => {
                    person.totalPaid = 0;
                    person.totalOwed = 0;
                });
                
                // Clear all expenses
                this.data.expenses = [];
                
                this.saveData();
                this.renderAll();
                
                // Play settlement sound
                Sounds.playSettleSound();
                
                // Show success message with confetti
                Swal.fire({
                    title: 'All Settled!',
                    text: 'All debts have been settled',
                    icon: 'success',
                    confirmButtonColor: '#4ECDC4'
                }).then(() => {
                    UI.showConfetti();
                });
            }
        });
    },
    
    // Export data
    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'smart-split-data.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        Swal.fire({
            title: 'Data Exported!',
            text: 'Your data has been exported successfully',
            icon: 'success',
            confirmButtonColor: '#4ECDC4'
        });
    },
    
    // Import data
    importData() {
        const importData = document.getElementById('import-data').value;
        
        try {
            const parsedData = JSON.parse(importData);
            
            // Validate data structure
            if (!parsedData.people || !parsedData.expenses || 
                !parsedData.nextPersonId || !parsedData.nextExpenseId) {
                throw new Error('Invalid data format');
            }
            
            Swal.fire({
                title: 'Are you sure?',
                text: 'This will replace all your current data. This action cannot be undone.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, import!',
                confirmButtonColor: '#4ECDC4',
                cancelButtonColor: '#FF6B6B'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Import data
                    this.data = parsedData;
                    this.saveData();
                    this.renderAll();
                    
                    UI.closeAllModals();
                    
                    Swal.fire({
                        title: 'Data Imported!',
                        text: 'Your data has been imported successfully',
                        icon: 'success',
                        confirmButtonColor: '#4ECDC4'
                    });
                }
            });
        } catch (error) {
            Swal.fire({
                title: 'Import Failed',
                text: 'The data format is invalid. Please check your JSON data.',
                icon: 'error',
                confirmButtonColor: '#FF6B6B'
            });
        }
    },
    
    // Clear all data
    clearData() {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This will delete all your data. This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, clear all!',
            confirmButtonColor: '#FF6B6B',
            cancelButtonColor: '#4ECDC4'
        }).then((result) => {
            if (result.isConfirmed) {
                // Reset data
                this.data = {
                    people: [],
                    expenses: [],
                    nextPersonId: 1,
                    nextExpenseId: 1
                };
                
                this.saveData();
                this.renderAll();
                
                Swal.fire({
                    title: 'Data Cleared!',
                    text: 'All your data has been cleared',
                    icon: 'success',
                    confirmButtonColor: '#4ECDC4'
                });
            }
        });
    },
    
    // Reset app
    resetApp() {
        Swal.fire({
            title: 'Reset App?',
            text: 'This will reset the app to its initial state. All your data will be lost. This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, reset!',
            confirmButtonColor: '#FF6B6B',
            cancelButtonColor: '#4ECDC4'
        }).then((result) => {
            if (result.isConfirmed) {
                // Clear localStorage
                localStorage.removeItem('smartSplitData');
                
                // Reload page
                window.location.reload();
            }
        });
    }
};