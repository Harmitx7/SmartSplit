/**
 * Smart Split - Group Expense Tracker
 * UI Interactions and Animations
 */

// UI Object
const UI = {
    // Initialize UI
    init() {
        // Set current date as default for expense date input
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expense-date').value = today;
        
        // Initialize first emoji in picker as selected
        document.querySelector('#emoji-picker span').classList.add('selected');
        
        // Set up modal close on outside click
        window.addEventListener('click', (e) => {
            document.querySelectorAll('.modal').forEach(modal => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    },
    
    // Show a specific page
    showPage(pageId) {
        const newPage = document.getElementById(pageId);
        const currentPage = document.querySelector('.page.active');

        if (newPage === currentPage) {
            return; // Don't do anything if the page is already active
        }

        // Update active nav link
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === pageId) {
                link.classList.add('active');
            }
        });

        const showNewPage = () => {
            // Make new page active
            newPage.classList.add('active', 'page-fade-in');

            // Animate page header
            const header = newPage.querySelector('.page-header h1');
            if (header) {
                header.classList.remove('animate__bounceIn');
                void header.offsetWidth; // Trigger reflow
                header.classList.add('animate__bounceIn');
            }

            // Refresh AOS animations
            AOS.refresh();

            // Clean up animation class
            setTimeout(() => {
                newPage.classList.remove('page-fade-in');
            }, 500);
        };

        if (currentPage) {
            currentPage.classList.add('page-fade-out');
            setTimeout(() => {
                currentPage.classList.remove('active', 'page-fade-out');
                showNewPage();
            }, 400); // Match animation duration
        } else {
            showNewPage();
        }
    },
    
    // Show a modal
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        
        // If it's the add expense modal, refresh the people lists
        if (modalId === 'add-expense-modal') {
            // Set current date as default
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('expense-date').value = today;
        }
    },
    
    // Close a specific modal
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
    },
    
    // Close all modals
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    },
    
    // Show confetti animation
    showConfetti() {
        // Create confetti container if it doesn't exist
        let container = document.querySelector('.confetti-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'confetti-container';
            document.body.appendChild(container);
        } else {
            // Clear existing confetti
            container.innerHTML = '';
        }
        
        // Create confetti pieces
        const confettiCount = 100;
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            // Random position, size, and animation delay
            const left = Math.random() * 100;
            const width = Math.random() * 10 + 5;
            const height = Math.random() * 10 + 5;
            const delay = Math.random() * 3;
            
            confetti.style.left = `${left}%`;
            confetti.style.width = `${width}px`;
            confetti.style.height = `${height}px`;
            confetti.style.animationDelay = `${delay}s`;
            
            // Random shape
            if (Math.random() > 0.5) {
                confetti.style.borderRadius = '50%';
            } else if (Math.random() > 0.5) {
                confetti.style.borderRadius = '0';
            } else {
                confetti.style.borderRadius = '5px';
            }
            
            container.appendChild(confetti);
        }
        
        // Remove confetti after animation completes
        setTimeout(() => {
            container.remove();
        }, 6000);
    },
    
    // Show a toast notification
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    },
    
    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },
    
    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Escape HTML to prevent XSS attacks
    escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }
};