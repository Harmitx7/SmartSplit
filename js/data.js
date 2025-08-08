/**
 * Smart Split - Group Expense Tracker
 * Data Management and Calculations
 */

// Data Object
const Data = {
    // Calculate who owes whom
    calculateSettlements(people, expenses) {
        // Calculate net balances for each person
        const balances = people.map(person => {
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
        
        return settlements;
    },
    
    // Get expense statistics
    getExpenseStats(people, expenses) {
        if (expenses.length === 0) {
            return {
                totalAmount: 0,
                averageAmount: 0,
                highestAmount: 0,
                highestPayer: null,
                mostFrequentCategory: null,
                expensesByCategory: {}
            };
        }
        
        // Calculate total amount
        const totalAmount = expenses.reduce((total, expense) => total + expense.amount, 0);
        
        // Calculate average amount
        const averageAmount = totalAmount / expenses.length;
        
        // Find highest amount and payer
        const highestExpense = expenses.reduce((highest, expense) => {
            return expense.amount > highest.amount ? expense : highest;
        }, expenses[0]);
        
        const highestPayer = people.find(person => person.id === highestExpense.payerId);
        
        // Count expenses by category
        const expensesByCategory = expenses.reduce((categories, expense) => {
            if (!categories[expense.category]) {
                categories[expense.category] = {
                    count: 0,
                    total: 0
                };
            }
            
            categories[expense.category].count++;
            categories[expense.category].total += expense.amount;
            
            return categories;
        }, {});
        
        // Find most frequent category
        let mostFrequentCategory = null;
        let highestCount = 0;
        
        for (const category in expensesByCategory) {
            if (expensesByCategory[category].count > highestCount) {
                highestCount = expensesByCategory[category].count;
                mostFrequentCategory = category;
            }
        }
        
        return {
            totalAmount,
            averageAmount,
            highestAmount: highestExpense.amount,
            highestPayer,
            mostFrequentCategory,
            expensesByCategory
        };
    },
    
    // Get smart suggestions
    getSmartSuggestions(people, expenses) {
        const suggestions = [];
        
        if (people.length === 0 || expenses.length === 0) {
            return suggestions;
        }
        
        // Calculate who has paid the most
        const topPayer = [...people].sort((a, b) => b.totalPaid - a.totalPaid)[0];
        
        // Calculate who has paid the least
        const bottomPayer = [...people].sort((a, b) => a.totalPaid - b.totalPaid)[0];
        
        // If there's a big difference, suggest the bottom payer to pay next
        if (topPayer.totalPaid > 0 && bottomPayer.totalPaid === 0) {
            suggestions.push({
                type: 'payment_suggestion',
                message: `${bottomPayer.emoji} ${bottomPayer.name} hasn't paid for anything yet. Maybe they should pay next?`
            });
        } else if (topPayer.totalPaid > bottomPayer.totalPaid * 2 && bottomPayer.totalPaid > 0) {
            suggestions.push({
                type: 'payment_suggestion',
                message: `${topPayer.emoji} ${topPayer.name} has paid for a lot more than ${bottomPayer.emoji} ${bottomPayer.name}. Maybe ${bottomPayer.name} should pay next?`
            });
        }
        
        // Check if there are any settlements needed
        const settlements = this.calculateSettlements(people, expenses);
        if (settlements.length > 0) {
            suggestions.push({
                type: 'settlement_suggestion',
                message: 'There are outstanding balances. You could settle up now.'
            });
        }
        
        // Check for expenses in the same category
        const expenseStats = this.getExpenseStats(people, expenses);
        if (expenseStats.mostFrequentCategory) {
            const categoryName = expenseStats.mostFrequentCategory.charAt(0).toUpperCase() + 
                               expenseStats.mostFrequentCategory.slice(1);
            
            suggestions.push({
                type: 'category_suggestion',
                message: `You spend a lot on ${categoryName}. That's your most common expense category.`
            });
        }
        
        return suggestions;
    },
    
    // Export data to CSV
    exportToCSV(people, expenses) {
        // Create CSV content for people
        let peopleCSV = 'id,name,emoji,totalPaid,totalOwed\n';
        people.forEach(person => {
            peopleCSV += `${person.id},"${person.name}",${person.emoji},${person.totalPaid},${person.totalOwed}\n`;
        });
        
        // Create CSV content for expenses
        let expensesCSV = 'id,description,amount,payerId,date,category,splitBetween,splitAmount\n';
        expenses.forEach(expense => {
            expensesCSV += `${expense.id},"${expense.description}",${expense.amount},${expense.payerId},${expense.date},${expense.category},"${expense.splitBetween.join(',')}",${expense.splitAmount}\n`;
        });
        
        return {
            people: peopleCSV,
            expenses: expensesCSV
        };
    },
    
    // Import data from CSV
    importFromCSV(peopleCSV, expensesCSV) {
        try {
            const people = [];
            const expenses = [];
            
            // Parse people CSV
            const peopleLines = peopleCSV.split('\n');
            for (let i = 1; i < peopleLines.length; i++) {
                if (peopleLines[i].trim() === '') continue;
                
                const parts = peopleLines[i].split(',');
                people.push({
                    id: parseInt(parts[0]),
                    name: parts[1].replace(/"/g, ''),
                    emoji: parts[2],
                    totalPaid: parseFloat(parts[3]),
                    totalOwed: parseFloat(parts[4])
                });
            }
            
            // Parse expenses CSV
            const expenseLines = expensesCSV.split('\n');
            for (let i = 1; i < expenseLines.length; i++) {
                if (expenseLines[i].trim() === '') continue;
                
                const parts = expenseLines[i].split(',');
                expenses.push({
                    id: parseInt(parts[0]),
                    description: parts[1].replace(/"/g, ''),
                    amount: parseFloat(parts[2]),
                    payerId: parseInt(parts[3]),
                    date: parts[4],
                    category: parts[5],
                    splitBetween: parts[6].replace(/"/g, '').split(',').map(id => parseInt(id)),
                    splitAmount: parseFloat(parts[7])
                });
            }
            
            // Calculate next IDs
            const nextPersonId = people.length > 0 ? Math.max(...people.map(p => p.id)) + 1 : 1;
            const nextExpenseId = expenses.length > 0 ? Math.max(...expenses.map(e => e.id)) + 1 : 1;
            
            return {
                people,
                expenses,
                nextPersonId,
                nextExpenseId
            };
        } catch (error) {
            console.error('Error importing CSV:', error);
            return null;
        }
    }
};