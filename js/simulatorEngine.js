export class SimulatorManager {
    constructor() {
        this.canvas = document.getElementById('simulator-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        // UI Elements
        this.uiSpeed = document.getElementById('sim-speed');
        this.uiRpm = document.getElementById('sim-rpm');
        this.uiGear = document.getElementById('sim-gear');
        this.btnToggleEngine = document.getElementById('btn-toggle-engine');
        
        // Input State
        this.inputs = {
            gas: 0,      // 0 to 1
            brake: 0,    // 0 to 1
            clutch: 0,   // 0 to 1
            steering: 0  // -1 (left) to 1 (right)
        };
        
        // Advanced Physics State
        this.state = {
            isEngineRunning: false,
            speed: 0,
            rpm: 0,
            gear: 0, // 0 = Neutral, 1 = First Gear
            
            // Car position
            x: 0,
            y: 0,
            angle: 0,
            acceleration: 0,
            objectiveComplete: false
        };

        this.targetZone = { x: 150, y: 150, w: 60, h: 100 }; // Parking spot

        this.isRunning = false;
        this.animationFrameId = null;

        // Assets
        this.assets = {
            map: new Image(),
            car: new Image(),
            loaded: 0
        };
        
        this._loadAssets();
        this._bindEvents();
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());
    }

    _loadAssets() {
        const onLoad = () => {
            this.assets.loaded++;
            if (this.assets.loaded === 2) {
                this._initCarPosition();
                this._resizeCanvas(); // Ensure colCanvas is created
                this._render(); // Render initial frame
                if (this.startPending) {
                    this.start();
                }
            }
        };

        const onMapLoad = () => {
            console.log("map.png loaded successfully.");
            onLoad();
        };

        const onCarLoad = () => {
            console.log("car.png loaded successfully.");
            onLoad();
        };

        console.log("Loading map...");
        this.assets.map.onload = onMapLoad;
        this.assets.map.onerror = (e) => console.error('Failed to load map.png', e);
        this.assets.map.src = 'map.png';

        console.log("Loading car...");
        this.assets.car.onload = onCarLoad;
        this.assets.car.onerror = (e) => console.error('Failed to load car.png', e);
        this.assets.car.src = 'car.png';
    }

    _initCarPosition() {
        // Assume START is near bottom center
        this.state.x = this.canvas.width / 2;
        this.state.y = this.canvas.height - 100;
        this.state.angle = -Math.PI / 2; // Pointing Up
    }

    _resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight || 500; // Fallback if 0
        // Re-center car if needed
        if (this.state.x === 0) this._initCarPosition();
        
        // Setup Collision Canvas
        if (this.assets.map.complete && this.assets.map.naturalWidth > 0) {
            this.colCanvas = document.createElement('canvas');
            this.colCanvas.width = this.canvas.width;
            this.colCanvas.height = this.canvas.height;
            this.colCtx = this.colCanvas.getContext('2d', { willReadFrequently: true });
            this.colCtx.drawImage(this.assets.map, 0, 0, this.canvas.width, this.canvas.height);
        }
    }

    _bindEvents() {
        // Keyboard Events
        window.addEventListener('keydown', (e) => this._handleKey(e, true));
        window.addEventListener('keyup', (e) => this._handleKey(e, false));

        // Touch/Mouse Events for Pedals
        this._bindPedalTouch('pedal-clutch', 'clutch');
        this._bindPedalTouch('pedal-brake', 'brake');
        this._bindPedalTouch('pedal-gas', 'gas');

        // Engine Toggle
        if (this.btnToggleEngine) {
            this.btnToggleEngine.addEventListener('click', () => {
                if (!this.state.isEngineRunning) {
                    this._startEngine();
                } else {
                    this._stopEngine();
                }
            });
        }
    }

    _startEngine() {
        this.state.isEngineRunning = true;
        this.state.rpm = 800; // Idle RPM
        this._updateEngineUI();
    }

    _stopEngine() {
        this.state.isEngineRunning = false;
        this.state.rpm = 0;
        this._updateEngineUI();
    }

    _updateEngineUI() {
        if (!this.btnToggleEngine) return;
        
        if (this.state.isEngineRunning) {
            this.btnToggleEngine.innerHTML = `<span class="material-symbols-outlined">power_settings_new</span> Vypnout motor`;
            this.btnToggleEngine.classList.replace('bg-primary', 'bg-error');
        } else {
            this.btnToggleEngine.innerHTML = `<span class="material-symbols-outlined">power_settings_new</span> Nastartovat`;
            this.btnToggleEngine.classList.replace('bg-error', 'bg-primary');
            // If it stalled
            if (this.state.rpm > 0) this.uiRpm.innerText = `MOTOR CHCÍPL`;
        }
    }

    _handleKey(e, isPressed) {
        const val = isPressed ? 1 : 0;
        switch(e.key.toLowerCase()) {
            case 'a': this.inputs.clutch = val; this._updatePedalUI('pedal-clutch', isPressed); break;
            case 's': this.inputs.brake = val; this._updatePedalUI('pedal-brake', isPressed); break;
            case 'd': this.inputs.gas = val; this._updatePedalUI('pedal-gas', isPressed); break;
            case 'arrowleft': this.inputs.steering = isPressed ? -1 : 0; break;
            case 'arrowright': this.inputs.steering = isPressed ? 1 : 0; break;
            case '1': 
                if(isPressed) {
                    this.state.gear = 1;
                    if(this.uiGear) this.uiGear.innerText = '1';
                }
                break;
            case '0':
            case 'n':
                if(isPressed) {
                    this.state.gear = 0;
                    if(this.uiGear) this.uiGear.innerText = 'N';
                }
                break;
        }
    }

    _bindPedalTouch(elementId, inputKey) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const press = (e) => {
            e.preventDefault();
            this.inputs[inputKey] = 1;
            this._updatePedalUI(elementId, true);
        };
        const release = (e) => {
            e.preventDefault();
            this.inputs[inputKey] = 0;
            this._updatePedalUI(elementId, false);
        };

        el.addEventListener('mousedown', press);
        el.addEventListener('touchstart', press, {passive: false});
        
        window.addEventListener('mouseup', release);
        window.addEventListener('touchend', release);
    }

    _updatePedalUI(elementId, isPressed) {
        const el = document.getElementById(elementId);
        if (!el) return;
        if (isPressed) {
            el.style.transform = 'translateY(10px) scale(0.95)';
            el.classList.replace('bg-slate-300', 'bg-slate-400');
        } else {
            el.style.transform = 'translateY(0) scale(1)';
            el.classList.replace('bg-slate-400', 'bg-slate-300');
        }
    }

    start() {
        this._resizeCanvas(); // Ensure colCanvas is created and canvas resized when view is displayed
        if (!this.isRunning) {
            if (this.assets.loaded >= 2) {
                this.isRunning = true;
                console.log("Starting simulation loop...");
                this._loop();
            } else {
                console.log("start() called, but assets not fully loaded yet. Queueing start...");
                this.startPending = true;
            }
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    _loop() {
        if (!this.isRunning) return;
        
        this._updatePhysics();
        this._render();
        
        this.animationFrameId = requestAnimationFrame(() => this._loop());
    }

    _updatePhysics() {
        const dt = 0.016; // Approx 60fps

        if (this.state.isEngineRunning) {
            // Engine logic
            if (this.state.gear === 0) {
                // Neutral
                if (this.inputs.gas > 0) {
                    this.state.rpm = Math.min(this.state.rpm + 200, 6000);
                } else {
                    this.state.rpm = Math.max(this.state.rpm - 100, 800);
                }
                this.state.acceleration = 0;
            } else if (this.state.gear === 1) {
                // 1st Gear Stalling Logic
                // If clutch is up (0) and speed is very low and gas is low, stall!
                // To prevent stall, clutch must be down (1), OR speed must be high enough, OR gas applied.
                
                // RPM depends on gas and wheel speed if clutch is up
                const targetRpm = Math.max(800, this.state.speed * 100 + (this.inputs.gas * 2000));
                
                if (this.inputs.clutch === 1) {
                    // Clutch fully disengaged (pedal down)
                    if (this.inputs.gas > 0) {
                        this.state.rpm = Math.min(this.state.rpm + 200, 6000);
                    } else {
                        this.state.rpm = Math.max(this.state.rpm - 100, 800);
                    }
                    this.state.acceleration = 0;
                } else {
                    // Clutch engaged (pedal up)
                    this.state.rpm += (targetRpm - this.state.rpm) * 0.1;

                    // Stalling Check
                    if (this.state.rpm < 500 && this.state.speed < 5) {
                        this._stopEngine();
                        this.state.rpm = 0;
                        if(this.uiRpm) this.uiRpm.innerText = "MOTOR CHCÍPL";
                    }

                    // Acceleration force
                    if (this.state.isEngineRunning) {
                        this.state.acceleration = (this.state.rpm / 6000) * 10 * this.inputs.gas;
                    }
                }
            }
        } else {
            // Engine Off
            this.state.rpm = 0;
            this.state.acceleration = 0;
        }

        // Apply brake
        if (this.inputs.brake > 0) {
            this.state.acceleration -= 20 * this.inputs.brake;
        }

        // Collision Detection (Alpha)
        let offRoadFriction = 0;
        let isSolidCollision = false;
        
        if (this.colCtx && this.state.x >= 0 && this.state.x < this.canvas.width && this.state.y >= 0 && this.state.y < this.canvas.height) {
            const pixel = this.colCtx.getImageData(this.state.x, this.state.y, 1, 1).data;
            const r = pixel[0], g = pixel[1], b = pixel[2];
            
            // Check pixel color logic
            // Gray/White -> Asphalt/Lines (allow driving)
            // Green -> Grass (high friction)
            // Blue/Other -> Building/Obstacle (solid)
            const isGrayish = Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30;
            const isGreenish = g > r + 15 && g > b + 15;
            
            if (isGreenish) {
                offRoadFriction = 0.8; // High friction for grass
            } else if (!isGrayish && !isGreenish) {
                isSolidCollision = true; // Blue or other vibrant color
            }
        } else {
            // Out of bounds
            isSolidCollision = true;
        }

        if (isSolidCollision) {
            this.state.speed = 0;
            this.state.acceleration = 0;
            if (this.state.isEngineRunning) {
                this._stopEngine();
                this.state.rpm = 0;
                if(this.uiRpm) this.uiRpm.innerText = "MOTOR CHCÍPL (NÁRAZ)";
            }
        }

        // Friction and drag
        this.state.acceleration -= this.state.speed * (0.1 + offRoadFriction); // drag

        // Update Speed
        this.state.speed += this.state.acceleration * dt;
        if (this.state.speed < 0) this.state.speed = 0; // No reverse for now

        // Update Car Position
        if (this.state.speed > 0 && !isSolidCollision) {
            // Steering improvements: turn radius depends on speed
            // At low speeds (e.g. 5 km/h), turn sharply. At high speeds (e.g. 50 km/h), gradual turn.
            const turnFactor = Math.max(0.005, 0.12 - (this.state.speed * 0.002));
            const turnRate = (this.inputs.steering * this.state.speed * turnFactor) * dt;
            this.state.angle += turnRate;

            this.state.x += Math.cos(this.state.angle) * this.state.speed * dt * 10;
            this.state.y += Math.sin(this.state.angle) * this.state.speed * dt * 10;
        }

        // Objective Check (Parking)
        if (!this.state.objectiveComplete && !this.state.isEngineRunning && this.state.speed < 1) {
            if (this.state.x >= this.targetZone.x && this.state.x <= this.targetZone.x + this.targetZone.w &&
                this.state.y >= this.targetZone.y && this.state.y <= this.targetZone.y + this.targetZone.h) {
                this.state.objectiveComplete = true;
            }
        }

        // Update UI Text
        if (this.uiSpeed) this.uiSpeed.innerText = `${Math.floor(this.state.speed)} km/h`;
        if (this.uiRpm && this.state.isEngineRunning) {
            this.uiRpm.innerText = `${Math.floor(this.state.rpm)} RPM`;
        } else if (this.uiRpm && !this.state.isEngineRunning && this.state.rpm === 0) {
            this.uiRpm.innerText = `OFF`;
        }
    }

    _render() {
        const { width, height } = this.canvas;
        
        // Clear canvas
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, width, height);

        // Map
        if (this.assets.map.complete && this.assets.map.naturalWidth > 0) {
            // Draw map covering the canvas (or tiling, or just centered)
            this.ctx.drawImage(this.assets.map, 0, 0, width, height);
        } else {
            // Fallback grid
            this.ctx.strokeStyle = '#444';
            for(let i=0; i<width; i+=50) {
                this.ctx.beginPath(); this.ctx.moveTo(i,0); this.ctx.lineTo(i,height); this.ctx.stroke();
            }
        }

        // Target Zone (Parking Spot)
        this.ctx.save();
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 10]);
        this.ctx.strokeRect(this.targetZone.x, this.targetZone.y, this.targetZone.w, this.targetZone.h);
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        this.ctx.fillRect(this.targetZone.x, this.targetZone.y, this.targetZone.w, this.targetZone.h);
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 24px Fira Sans';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText("P", this.targetZone.x + this.targetZone.w/2, this.targetZone.y + this.targetZone.h/2);
        this.ctx.restore();

        // Car
        this.ctx.save();
        this.ctx.translate(this.state.x, this.state.y);
        this.ctx.rotate(this.state.angle + Math.PI/2); // Adjust sprite orientation
        
        if (this.assets.car.complete && this.assets.car.naturalWidth > 0) {
            // Render car sprite scaled down
            const carW = 40;
            const carH = 80;
            this.ctx.drawImage(this.assets.car, -carW/2, -carH/2, carW, carH);
        } else {
            // Fallback Red Rectangle
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(-15, -30, 30, 60);
        }
        
        this.ctx.restore();

        // Overlay status if stalled
        if (!this.state.isEngineRunning && this.state.rpm === 0 && this.state.speed < 1 && !this.state.objectiveComplete) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(0, 0, width, height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '24px Fira Sans';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("MOTOR VYPNUTÝ - Stiskněte 'Nastartovat'", width/2, height/2);
            this.ctx.font = '16px Fira Sans';
            this.ctx.fillText("Stiskněte '1' pro zařazení 1. rychlostního stupně.", width/2, height/2 + 30);
        }

        // Draw Mission Text Overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(20, 20, 380, 50);
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 18px Fira Sans';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText("Úkol: Zaparkujte na parkovacím místě č. 1", 35, 45);

        // Input Debug Overlay
        const padX = width - 170;
        const padY = height - 130;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(padX, padY, 150, 110);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Fira Sans';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        
        // Steering
        this.ctx.fillStyle = 'white';
        this.ctx.fillText("Volant:", padX + 10, padY + 20);
        this.ctx.fillStyle = '#555';
        this.ctx.fillRect(padX + 60, padY + 15, 80, 10);
        this.ctx.fillStyle = '#0cf';
        this.ctx.fillRect(padX + 60 + 40 + (this.inputs.steering * 40) - 2, padY + 15, 4, 10);

        // Clutch
        this.ctx.fillStyle = 'white';
        this.ctx.fillText("Spojka:", padX + 10, padY + 40);
        this.ctx.fillStyle = '#555';
        this.ctx.fillRect(padX + 60, padY + 35, 80, 10);
        this.ctx.fillStyle = '#0cf';
        this.ctx.fillRect(padX + 60, padY + 35, this.inputs.clutch * 80, 10);

        // Brake
        this.ctx.fillStyle = 'white';
        this.ctx.fillText("Brzda:", padX + 10, padY + 60);
        this.ctx.fillStyle = '#555';
        this.ctx.fillRect(padX + 60, padY + 55, 80, 10);
        this.ctx.fillStyle = '#f00';
        this.ctx.fillRect(padX + 60, padY + 55, this.inputs.brake * 80, 10);

        // Gas
        this.ctx.fillStyle = 'white';
        this.ctx.fillText("Plyn:", padX + 10, padY + 80);
        this.ctx.fillStyle = '#555';
        this.ctx.fillRect(padX + 60, padY + 75, 80, 10);
        this.ctx.fillStyle = '#0f0';
        this.ctx.fillRect(padX + 60, padY + 75, this.inputs.gas * 80, 10);
        
        // Objective Complete Overlay
        if (this.state.objectiveComplete) {
            this.ctx.fillStyle = 'rgba(30, 142, 62, 0.8)'; // Success green
            this.ctx.fillRect(0, 0, width, height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 36px Fira Sans';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("Mise splněna!", width/2, height/2);
            this.ctx.font = '20px Fira Sans';
            this.ctx.fillText("Úspěšně jste zaparkovali vozidlo.", width/2, height/2 + 40);
        }
    }
}
