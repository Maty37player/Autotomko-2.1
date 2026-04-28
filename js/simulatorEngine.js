export class SimulatorManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
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
            gas: 0,
            brake: 0,
            clutch: 0,
            steering: 0,  // -1 (left) to 1 (right)
            ignition: false
        };

        // Control Bindings (Defaults)
        this.controls = {
            gas: 'd',
            brake: 's',
            clutch: 'a',
            steeringLeft: 'arrowleft',
            steeringRight: 'arrowright',
            ignition: 'e',
            gear1: '1',
            gearN: '0'
        };

        this.keys = {}; // Track active keys for robust steering

        // Realistic Engine States
        this.ENGINE_STATES = {
            OFF: 'OFF',
            KEY_INSERTED: 'KEY_INSERTED',
            STARTING: 'STARTING',
            RUNNING: 'RUNNING',
            STALLED: 'STALLED'
        };

        this.state = {
            engineState: this.ENGINE_STATES.OFF,
            ignitionTimer: 0,
            speed: 0,
            rpm: 0,
            gear: 0, // 0 = Neutral, 1 = First Gear
            
            // Car position
            x: 0,
            y: 0,
            angle: 0,
            acceleration: 0,
            objectiveComplete: false,
            shakeTimer: 0, // For stalling effect
            zoom: 2.5 // Default camera zoom (increased for better road focus)
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
            console.log(`${this.assets.car.src.split('/').pop()} loaded successfully.`);
            onLoad();
        };

        const onCarError = (e) => {
            if (this.assets.car.src.includes('car37.png')) {
                console.warn("Failed to load car37.png, trying fallback car.png");
                this.assets.car.src = 'car.png';
            } else {
                console.error('Failed to load car assets completely.', e);
            }
        };

        console.log("Loading map...");
        this.assets.map.onload = onMapLoad;
        this.assets.map.onerror = (e) => console.error('Failed to load map.png', e);
        this.assets.map.src = 'map.png';

        console.log("Loading car...");
        this.assets.car.onload = onCarLoad;
        this.assets.car.onerror = onCarError;
        this.assets.car.src = 'car37.png';
    }

    _initCarPosition() {
        // Spawn at the designated parking spot (World Space / Map pixels)
        // Middle-right area, second bay in the upper row
        this.state.x = 2220;
        this.state.y = 450;
        this.state.angle = 0; // Pointing Right
    }

    _resizeCanvas() {
        const container = this.canvas.parentElement;
        if (!container) return;
        
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight || 500; // Fallback if 0
        
        // Re-center car if needed
        if (this.state.x === 0) this._initCarPosition();

        // Setup/Resize Collision Canvas to match map's natural size (World Space)
        if (this.assets.map.complete && this.assets.map.naturalWidth > 0) {
            if (!this.colCanvas) {
                this.colCanvas = document.createElement('canvas');
            }
            // Use natural dimensions so state.x/y match map pixels exactly
            this.colCanvas.width = this.assets.map.naturalWidth;
            this.colCanvas.height = this.assets.map.naturalHeight;
            this.colCtx = this.colCanvas.getContext('2d', { willReadFrequently: true });
            
            // Draw map at 1:1 on collision canvas
            this.colCtx.drawImage(this.assets.map, 0, 0);
            console.log("Collision canvas (World Space) synchronized:", this.colCanvas.width, "x", this.colCanvas.height);
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
                if (this.state.engineState !== this.ENGINE_STATES.RUNNING) {
                    this._startEngine();
                } else {
                    this._stopEngine();
                }
            });
        }
    }

    _startEngine() {
        this.state.engineState = this.ENGINE_STATES.RUNNING;
        this.state.rpm = 800; // Idle RPM
        this._updateEngineUI();
    }

    _stopEngine(stalled = false) {
        this.state.engineState = stalled ? this.ENGINE_STATES.STALLED : this.ENGINE_STATES.OFF;
        this.state.rpm = 0;
        if (stalled) this.state.shakeTimer = 0.5; // Shake for 0.5s
        this._updateEngineUI();
    }

    resetCar(reason = "") {
        console.log("Resetting car position:", reason);
        this._initCarPosition();
        this.state.speed = 0;
        this.state.acceleration = 0;
        this.state.rpm = 0;
        this.state.engineState = this.ENGINE_STATES.STALLED; // Treat as a stall for feedback
        this.state.lastResetReason = reason;
        this._updateEngineUI();
    }

    _updateEngineUI() {
        if (!this.btnToggleEngine) return;

        const isRunning = this.state.engineState === this.ENGINE_STATES.RUNNING;

        if (isRunning) {
            this.btnToggleEngine.innerHTML = `<span class="material-symbols-outlined">power_settings_new</span> Vypnout motor`;
            this.btnToggleEngine.classList.replace('bg-primary', 'bg-error');
        } else {
            this.btnToggleEngine.innerHTML = `<span class="material-symbols-outlined">power_settings_new</span> Nastartovat`;
            this.btnToggleEngine.classList.replace('bg-error', 'bg-primary');
        }
    }

    _handleKey(e, isPressed) {
        const val = isPressed ? 1 : 0;
        const key = e.key.toLowerCase();
        this.keys[key] = isPressed;

        const { controls } = this;

        // Check if the key matches any of our controls
        if (key === controls.gas) {
            this.inputs.gas = val;
            this._updatePedalUI('pedal-gas', isPressed);
        } else if (key === controls.brake) {
            this.inputs.brake = val;
            this._updatePedalUI('pedal-brake', isPressed);
        } else if (key === controls.clutch) {
            this.inputs.clutch = val;
            this._updatePedalUI('pedal-clutch', isPressed);
        } else if (key === controls.steeringLeft || key === controls.steeringRight) {
            if (this.keys[controls.steeringLeft] && this.keys[controls.steeringRight]) this.inputs.steering = 0;
            else if (this.keys[controls.steeringLeft]) this.inputs.steering = -1;
            else if (this.keys[controls.steeringRight]) this.inputs.steering = 1;
            else this.inputs.steering = 0;
        } else if (key === controls.ignition) {
            this.inputs.ignition = isPressed;
            this._handleIgnition(isPressed);
        } else if (key === controls.gear1) {
            if (isPressed) {
                this.state.gear = 1;
                if (this.uiGear) this.uiGear.innerText = '1';
            }
        } else if (key === controls.gearN) {
            if (isPressed) {
                this.state.gear = 0;
                if (this.uiGear) this.uiGear.innerText = 'N';
            }
        }

        // Zoom Controls
        if (isPressed) {
            if (key === '+' || key === '=' || key === 'numplus') {
                this.state.zoom = Math.min(this.state.zoom + 0.1, 5.0);
            } else if (key === '-' || key === '_' || key === 'numminus') {
                this.state.zoom = Math.max(this.state.zoom - 0.1, 0.5);
            }
        }
    }

    _handleIgnition(isPressed) {
        if (!isPressed) {
            // Key released
            if (this.state.engineState === this.ENGINE_STATES.STARTING) {
                this.state.engineState = this.ENGINE_STATES.KEY_INSERTED;
                this.state.rpm = 0;
            }
            this.state.ignitionTimer = 0;
            return;
        }

        // Key pressed
        this.state.lastResetReason = null; // Clear any past failure messages
        
        if (this.state.engineState === this.ENGINE_STATES.OFF) {
            this.state.engineState = this.ENGINE_STATES.KEY_INSERTED;
        } else if (this.state.engineState === this.ENGINE_STATES.RUNNING) {
            this.state.engineState = this.ENGINE_STATES.OFF;
            this.state.rpm = 0;
        } else if (this.state.engineState === this.ENGINE_STATES.STALLED) {
            this.state.engineState = this.ENGINE_STATES.KEY_INSERTED;
        }
    }

    _updateIgnition(dt) {
        // Holding 'E' logic
        const isHoldingE = this.inputs.ignitionTimer > 0 || (window.event && window.event.key === 'e'); 
        // Note: Simple keyboard state tracking is better. I'll use a local input flag.
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
        el.addEventListener('touchstart', press, { passive: false });

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
        const isRunning = this.state.engineState === this.ENGINE_STATES.RUNNING;

        // --- Engine State & Ignition Logic ---
        this._updateEngineStateMachine(dt);

        // --- Engine Physics ---
        if (isRunning) {
            if (this.state.gear === 0) {
                // Neutral
                if (this.inputs.gas > 0) {
                    this.state.rpm = Math.min(this.state.rpm + 200, 6000);
                } else {
                    this.state.rpm = Math.max(this.state.rpm - 100, 800);
                }
                this.state.acceleration = 0;
            } else if (this.state.gear === 1) {
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

                    // REALISTIC STALLING: If clutch released without enough speed/gas
                    if (this.inputs.clutch < 0.2 && this.state.speed < 10 && this.inputs.gas < 0.1) {
                        this._stopEngine(true); // Stalled
                        return;
                    }

                    // Normal Stalling Check
                    if (this.state.rpm < 500 && this.state.speed < 5) {
                        this._stopEngine(true);
                        return;
                    }

                    // Acceleration force
                    this.state.acceleration = (this.state.rpm / 6000) * 12 * this.inputs.gas;
                }
            }
        } else {
            // Engine Off/Starting/Stalled
            if (this.state.engineState !== this.ENGINE_STATES.STARTING) {
                this.state.rpm = 0;
            }
            this.state.acceleration = 0;
        }

        // Apply brake
        if (this.inputs.brake > 0) {
            this.state.acceleration -= 25 * this.inputs.brake;
        }

        // --- Collision Detection ---
        this._handleCollisions();

        // Friction and drag
        this.state.acceleration -= this.state.speed * 0.15; 

        // Update Speed
        this.state.speed += this.state.acceleration * dt;
        if (this.state.speed < 0) this.state.speed = 0;

        // Update Car Position
        if (this.state.speed > 0) {
            const turnFactor = Math.max(0.005, 0.12 - (this.state.speed * 0.002));
            const turnRate = (this.inputs.steering * this.state.speed * turnFactor) * dt;
            this.state.angle += turnRate;

            this.state.x += Math.cos(this.state.angle) * this.state.speed * dt * 10;
            this.state.y += Math.sin(this.state.angle) * this.state.speed * dt * 10;
        }

        // --- UI & Tutorial Instructions ---
        this._updateTutorialUI();
    }

    _updateEngineStateMachine(dt) {
        if (this.state.engineState === this.ENGINE_STATES.KEY_INSERTED && this.inputs.ignition) {
            this.state.engineState = this.ENGINE_STATES.STARTING;
            this.state.ignitionTimer = 0;
        }

        if (this.state.engineState === this.ENGINE_STATES.STARTING) {
            this.state.ignitionTimer += dt;
            this.state.rpm = 400 + Math.random() * 200; // Cranking sound/visual

            if (this.state.ignitionTimer >= 1.5) {
                if (this.state.gear === 0 || this.inputs.clutch > 0.8) {
                    this._startEngine();
                } else {
                    this._stopEngine(true); // Stalled (tried to start in gear without clutch)
                }
            }
        }
    }

    _updateTutorialUI() {
        if (!this.uiManager) return;

        let msg = "";
        const s = this.state;

        if (s.engineState === this.ENGINE_STATES.OFF) msg = "Stiskni 'E' pro vložení klíčku.";
        else if (s.engineState === this.ENGINE_STATES.KEY_INSERTED) msg = "Podrž 'E' pro nastartování.";
        else if (s.engineState === this.ENGINE_STATES.STARTING) msg = "Startování...";
        else if (s.engineState === this.ENGINE_STATES.STALLED) msg = "CHCIÍPLO TO! (Zkus to znovu)";
        else if (s.engineState === this.ENGINE_STATES.RUNNING) {
            if (s.speed === 0) {
                if (this.inputs.clutch < 0.8) msg = "Sešlápni spojku (Shift) a zařaď 1.";
                else if (s.gear !== 1) msg = "Zařaď 1. rychlostní stupeň.";
                else msg = "Pomalu pouštěj spojku a přidávej plyn (W).";
            } else if (s.speed < 5) {
                msg = "Pomalu... Teď zkus zatočit pomocí 'A' a 'D'.";
            } else {
                msg = "Skvělá práce! Sleduj cestu.";
                // Check if off-road (based on collision logic)
                if (this._isOffRoad()) {
                    this.resetCar("OFFROAD");
                }
            }
        }

        if (this.state.lastResetReason === "OFFROAD") {
            msg = "Jsi mimo cestu! Zkus to znovu.";
        } else if (this.state.lastResetReason === "COLLISION") {
            msg = "NÁRAZ! Sleduj značky a zkus to znovu.";
        }

        this.uiManager.updateSimInstruction(msg);
        this.uiManager.rotateSteeringWheel(this.inputs.steering * 0.5);
        this.uiManager.updateSimControls(this.inputs);
        this.uiManager.toggleSimSuccess(this.state.objectiveComplete);

        // Update Gauges
        if (this.uiSpeed) this.uiSpeed.innerText = `${Math.floor(this.state.speed)} km/h`;
        if (this.uiRpm) {
            if (s.engineState === this.ENGINE_STATES.RUNNING) this.uiRpm.innerText = `${Math.floor(this.state.rpm)} RPM`;
            else if (s.engineState === this.ENGINE_STATES.STALLED) this.uiRpm.innerText = "MOTOR CHCÍPL";
            else this.uiRpm.innerText = "OFF";
        }
    }

    _isOffRoad() {
        if (!this.colCtx) return false;
        try {
            const pixel = this.colCtx.getImageData(this.state.x, this.state.y, 1, 1).data;
            const r = pixel[0], g = pixel[1], b = pixel[2];
            const isGrayish = Math.abs(r - g) < 30 && Math.abs(g - b) < 30;
            const isGreenish = g > r + 15 && g > b + 15;
            return isGreenish;
        } catch(e) { return false; }
    }

    _handleCollisions() {
        if (!this.colCtx) return;
        
        try {
            // Check against map (world) dimensions, not canvas (viewport) dimensions
            if (this.state.x >= 0 && this.state.x < this.colCanvas.width && 
                this.state.y >= 0 && this.state.y < this.colCanvas.height) {
                const pixel = this.colCtx.getImageData(this.state.x, this.state.y, 1, 1).data;
                const r = pixel[0], g = pixel[1], b = pixel[2];
                const isGrayish = Math.abs(r - g) < 30 && Math.abs(g - b) < 30;
                const isGreenish = g > r + 15 && g > b + 15;

                if (!isGrayish && !isGreenish) {
                    this.resetCar("COLLISION");
                }
            }
        } catch (e) {
            console.warn("Collision detection failed due to canvas state.");
        }
    }

    _render() {
        const { width, height } = this.canvas;
        const zoom = this.state.zoom;

        // Clear canvas
        this.ctx.fillStyle = '#111'; 
        this.ctx.fillRect(0, 0, width, height);

        // --- Follow Camera Setup (Track-Up Mode) ---
        this.ctx.save();
        
        // 1. Move origin to center of screen
        this.ctx.translate(width / 2, height / 2);
        
        // 2. Zoom in
        this.ctx.scale(zoom, zoom);
        
        // 3. Rotate map so car always points UP
        // car.angle 0 is Right, -PI/2 is UP.
        // We rotate the world by (-angle - PI/2)
        this.ctx.rotate(-this.state.angle - Math.PI / 2);
        
        // 4. Center on car world position
        this.ctx.translate(-this.state.x, -this.state.y);

        // --- Shake Effect ---
        if (this.state.shakeTimer > 0) {
            const intensity = 3 * (this.state.shakeTimer / 0.5);
            this.ctx.translate(
                (Math.random() - 0.5) * intensity,
                (Math.random() - 0.5) * intensity
            );
            this.state.shakeTimer -= 0.016;
        }

        // --- Render Background (Map) ---
        if (this.assets.map.complete && this.assets.map.naturalWidth > 0) {
            this.ctx.drawImage(this.assets.map, 0, 0);
        } else {
            this.ctx.strokeStyle = '#444';
            this.ctx.lineWidth = 1 / zoom;
            for (let i = 0; i < 3000; i += 100) {
                this.ctx.beginPath(); this.ctx.moveTo(i, 0); this.ctx.lineTo(i, 3000); this.ctx.stroke();
                this.ctx.beginPath(); this.ctx.moveTo(0, i); this.ctx.lineTo(3000, i); this.ctx.stroke();
            }
        }

        // --- Draw Car ---
        // Car is at (state.x, state.y) in world space.
        // We've rotated the context by (-state.angle - PI/2).
        // To make the car point UP on the screen, we draw it at state.angle.
        // (angle) + (-angle - PI/2) = -PI/2 (UP)
        this.ctx.save();
        this.ctx.translate(this.state.x, this.state.y);
        this.ctx.rotate(this.state.angle);

        // Based on 75px lane width, a 70px wide car (narrow side) 
        // With 1.97:1 aspect ratio, carWidth (long side) should be ~138px
        const carWidth = 138; 
        if (this.assets.car.complete && this.assets.car.naturalWidth > 0) {
            const aspectRatio = this.assets.car.naturalHeight / this.assets.car.naturalWidth;
            const carHeight = carWidth * aspectRatio;
            // The sprite itself is oriented facing RIGHT.
            this.ctx.drawImage(this.assets.car, -carWidth / 2, -carHeight / 2, carWidth, carHeight);
        } else {
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(-25, -50, 50, 100);
        }

        this.ctx.restore();
        this.ctx.restore(); // End camera save
    }
}
