/**
 * Smart Split - Group Expense Tracker
 * Local Storage Data Management
 */

const LocalStorageManager = {
    // Key for storing data in local storage
    STORAGE_KEY: 'smartSplitData',

    // Initialize local storage with default data if it's empty
    initialize() {
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            const defaultData = {
                people: [],
                expenses: [],
                nextPersonId: 1,
                nextExpenseId: 1,
            };
            this.saveData(defaultData);
        }
    },

    // Get all data from local storage
    getData() {
        try {
            const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY));
            return data || { people: [], expenses: [], nextPersonId: 1, nextExpenseId: 1 };
        } catch (error) {
            console.error('Error parsing local storage data:', error);
            return { people: [], expenses: [], nextPersonId: 1, nextExpenseId: 1 };
        }
    },

    // Save all data to local storage
    saveData(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving data to local storage:', error);
        }
    },

    // Add a new person
    addPerson(person) {
        const data = this.getData();
        const newPerson = {
            ...person,
            id: data.nextPersonId,
            totalPaid: 0,
            totalOwed: 0,
        };
        data.people.push(newPerson);
        data.nextPersonId++;
        this.saveData(data);
        return newPerson;
    },

    // Update an existing person
    updatePerson(personId, updatedPerson) {
        const data = this.getData();
        const index = data.people.findIndex(p => p.id === personId);
        if (index !== -1) {
            data.people[index] = { ...data.people[index], ...updatedPerson };
            this.saveData(data);
            return data.people[index];
        }
        return null;
    },

    // Delete a person
    deletePerson(personId) {
        const data = this.getData();
        data.people = data.people.filter(p => p.id !== personId);
        this.saveData(data);
    },

    // Add a new expense
    addExpense(expense) {
        const data = this.getData();
        const newExpense = {
            ...expense,
            id: data.nextExpenseId,
        };
        data.expenses.push(newExpense);
        data.nextExpenseId++;
        this.saveData(data);
        return newExpense;
    },

    // Update an existing expense
    updateExpense(expenseId, updatedExpense) {
        const data = this.getData();
        const index = data.expenses.findIndex(e => e.id === expenseId);
        if (index !== -1) {
            data.expenses[index] = { ...data.expenses[index], ...updatedExpense };
            this.saveData(data);
            return data.expenses[index];
        }
        return null;
    },

    // Delete an expense
    deleteExpense(expenseId) {
        const data = this.getData();
        data.expenses = data.expenses.filter(e => e.id !== expenseId);
        this.saveData(data);
    },

    // Clear all expenses (settle up)
    settleAll() {
        const data = this.getData();
        data.expenses = [];
        this.saveData(data);
    },

    // Clear all data (people and expenses)
    clearAll() {
        const data = {
            people: [],
            expenses: [],
            nextPersonId: 1,
            nextExpenseId: 1,
        };
        this.saveData(data);
    },

    // Import data
    importData(importedData) {
        const data = this.getData();
        data.people = importedData.people || [];
        data.expenses = importedData.expenses || [];
        data.nextPersonId = data.people.length > 0 ? Math.max(...data.people.map(p => p.id)) + 1 : 1;
        data.nextExpenseId = data.expenses.length > 0 ? Math.max(...data.expenses.map(e => e.id)) + 1 : 1;
        this.saveData(data);
    }
};