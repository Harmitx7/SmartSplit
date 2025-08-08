/**
 * Smart Split - Group Expense Tracker
 * Sound Effects
 */

// Sound Effects Object
const Sounds = {
    // Initialize sound effects
    init() {
        // Preload sounds
        this.preloadSounds();
        
        // Add click sound to buttons
        this.addButtonClickSounds();
    },
    
    // Preload all sound effects
    preloadSounds() {
        // Create audio elements for each sound
        this.cashSound = new Audio();
        this.cashSound.src = 'https://assets.mixkit.co/active_storage/sfx/2648/2648-preview.mp3';
        this.cashSound.load();
        
        this.settleSound = new Audio();
        this.settleSound.src = 'https://assets.mixkit.co/active_storage/sfx/888/888-preview.mp3';
        this.settleSound.load();
        
        this.buttonClickSound = new Audio();
        this.buttonClickSound.src = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';
        this.buttonClickSound.load();
    },
    
    // Add click sound to all buttons
    addButtonClickSounds() {
        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            // Add click sound to all buttons
            document.querySelectorAll('.btn').forEach(button => {
                button.addEventListener('click', () => {
                    this.playButtonClickSound();
                });
            });
        });
    },
    
    // Play cash register sound when adding expense
    playCashSound() {
        this.cashSound.currentTime = 0;
        this.cashSound.play().catch(error => {
            console.log('Error playing cash sound:', error);
        });
    },
    
    // Play settlement sound when settling up
    playSettleSound() {
        this.settleSound.currentTime = 0;
        this.settleSound.play().catch(error => {
            console.log('Error playing settle sound:', error);
        });
    },
    
    // Play button click sound
    playButtonClickSound() {
        this.buttonClickSound.currentTime = 0;
        this.buttonClickSound.volume = 0.2; // Lower volume for button clicks
        this.buttonClickSound.play().catch(error => {
            console.log('Error playing button click sound:', error);
        });
    }
};