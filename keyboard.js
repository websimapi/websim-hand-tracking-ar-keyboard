export class ARKeyboard {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Keyboard dimensions and position
        this.keyboardWidth = canvasWidth * 0.9;
        this.keyboardHeight = canvasHeight * 0.3;
        this.keyboardX = (canvasWidth - this.keyboardWidth) / 2;
        this.keyboardY = canvasHeight * 0.6;
        
        // Key properties
        this.octaves = 2;
        this.keys = [];
        this.initializeKeys();
    }
    
    initializeKeys() {
        const whiteKeysPerOctave = 7;
        const blackKeysPerOctave = 5;
        const totalWhiteKeys = whiteKeysPerOctave * this.octaves;
        
        const whiteKeyWidth = this.keyboardWidth / totalWhiteKeys;
        const whiteKeyHeight = this.keyboardHeight;
        const blackKeyWidth = whiteKeyWidth * 0.6;
        const blackKeyHeight = this.keyboardHeight * 0.6;
        
        // Notes in an octave (C, D, E, F, G, A, B)
        const notesPerOctave = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        // Clear existing keys
        this.keys = [];
        
        // Create white keys first
        let whiteKeyIndex = 0;
        for (let octave = 0; octave < this.octaves; octave++) {
            for (let i = 0; i < notesPerOctave.length; i++) {
                const note = notesPerOctave[i];
                
                if (!note.includes('#')) {
                    const x = this.keyboardX + whiteKeyIndex * whiteKeyWidth;
                    const y = this.keyboardY;
                    
                    this.keys.push({
                        note: note + (octave + 3), // Starting from octave 3 (C3)
                        x: x,
                        y: y,
                        width: whiteKeyWidth,
                        height: whiteKeyHeight,
                        isBlack: false,
                        isPressed: false,
                        midiNote: 60 + i + (octave * 12) // Middle C (C4) is MIDI note 60
                    });
                    
                    whiteKeyIndex++;
                }
            }
        }
        
        // Add black keys on top
        for (let octave = 0; octave < this.octaves; octave++) {
            for (let i = 0; i < notesPerOctave.length; i++) {
                const note = notesPerOctave[i];
                
                if (note.includes('#')) {
                    // Find the white key before it
                    const whiteKeyBefore = this.keys.find(key => 
                        key.note === notesPerOctave[i-1] + (octave + 3)
                    );
                    
                    if (whiteKeyBefore) {
                        const x = whiteKeyBefore.x + whiteKeyWidth - (blackKeyWidth / 2);
                        const y = this.keyboardY;
                        
                        this.keys.push({
                            note: note + (octave + 3),
                            x: x,
                            y: y,
                            width: blackKeyWidth,
                            height: blackKeyHeight,
                            isBlack: true,
                            isPressed: false,
                            midiNote: 60 + i + (octave * 12)
                        });
                    }
                }
            }
        }
    }
    
    draw(ctx) {
        // Draw keyboard background
        ctx.fillStyle = 'rgba(50, 50, 50, 0.7)';
        ctx.fillRect(this.keyboardX - 10, this.keyboardY - 10, 
                    this.keyboardWidth + 20, this.keyboardHeight + 20);
        
        // Draw white keys first
        this.keys.filter(key => !key.isBlack).forEach(key => {
            ctx.fillStyle = key.isPressed ? '#AAAAFF' : '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            
            ctx.fillRect(key.x, key.y, key.width, key.height);
            ctx.strokeRect(key.x, key.y, key.width, key.height);
            
            // Draw note name
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(key.note, key.x + key.width / 2, key.y + key.height - 10);
        });
        
        // Then draw black keys on top
        this.keys.filter(key => key.isBlack).forEach(key => {
            ctx.fillStyle = key.isPressed ? '#7777CC' : '#000000';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            
            ctx.fillRect(key.x, key.y, key.width, key.height);
            ctx.strokeRect(key.x, key.y, key.width, key.height);
            
            // Draw note name
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(key.note, key.x + key.width / 2, key.y + key.height - 10);
        });
    }
    
    getKeyAtPosition(x, y) {
        // Translate normalized coordinates (0-1) to canvas coordinates
        const canvasX = x * this.canvasWidth;
        const canvasY = y * this.canvasHeight;
        
        // Check black keys first (they're on top)
        for (let i = 0; i < this.keys.length; i++) {
            const key = this.keys[i];
            if (key.isBlack && 
                canvasX >= key.x && canvasX <= key.x + key.width &&
                canvasY >= key.y && canvasY <= key.y + key.height) {
                return i;
            }
        }
        
        // Then check white keys
        for (let i = 0; i < this.keys.length; i++) {
            const key = this.keys[i];
            if (!key.isBlack && 
                canvasX >= key.x && canvasX <= key.x + key.width &&
                canvasY >= key.y && canvasY <= key.y + key.height) {
                return i;
            }
        }
        
        return -1; // No key at this position
    }
    
    setKeyPressed(keyIndex, isPressed) {
        if (keyIndex >= 0 && keyIndex < this.keys.length) {
            this.keys[keyIndex].isPressed = isPressed;
        }
    }
}

