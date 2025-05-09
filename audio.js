export class SynthEngine {
    constructor() {
        // Initialize Web Audio API
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.audioContext.destination);
        
        // Store active oscillators
        this.activeOscillators = {};
    }
    
    playNote(keyIndex) {
        // Resume audio context if it's suspended (needed for browsers that require user interaction)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // Stop the note if it's already playing to avoid overlap
        if (this.activeOscillators[keyIndex]) {
            this.stopNote(keyIndex);
        }
        
        // Create oscillator and gain node for envelope
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Calculate frequency based on MIDI note number
        const note = keyIndex; // Replace with actual MIDI note
        const frequency = this.midiToFrequency(note);
        
        // Set oscillator properties
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        // Apply envelope
        gainNode.gain.value = 0;
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Start the oscillator
        oscillator.start();
        
        // Attack phase
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.7, this.audioContext.currentTime + 0.01);
        
        // Store oscillator and gain node
        this.activeOscillators[keyIndex] = {
            oscillator: oscillator,
            gainNode: gainNode
        };
    }
    
    stopNote(keyIndex) {
        const sound = this.activeOscillators[keyIndex];
        if (!sound) return;
        
        const { oscillator, gainNode } = sound;
        
        // Release phase
        const releaseTime = this.audioContext.currentTime + 0.1;
        gainNode.gain.linearRampToValueAtTime(0, releaseTime);
        
        // Stop oscillator after release
        oscillator.stop(releaseTime);
        
        // Remove from active oscillators
        delete this.activeOscillators[keyIndex];
    }
    
    midiToFrequency(note) {
        // A4 (MIDI note 69) is 440Hz
        return 440 * Math.pow(2, (note - 69) / 12);
    }
}

