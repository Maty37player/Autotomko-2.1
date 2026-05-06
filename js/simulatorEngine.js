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
            steering: 0  // -1 (left) to 1 (right)
        };

        // Control Bindings (Defaults)
        this.controls = {
            gas: 'd',
            brake: 's',
            clutch: 'a',
            steeringLeft: 'arrowleft',
            steeringRight: 'arrowright',
            gearR: 'q',
            gearN: 'w',
            gear1: 'e',
            gear2: 'r',
            gear3: 't',
            gear4: 'z',
            gear5: 'u'
        };

        this.keys = {}; // Track active keys for robust steering

        this.engine = {
            idleRpm: 800,
            redlineRpm: 6200,
            maxRpm: 6500,
            fallRate: 140
        };

        this.gearProfiles = {
            "-1": { ratio: 2.8, drive: -1, torque: 0.85, maxSpeed: 18 },
            1: { ratio: 4.2, drive: 1, torque: 1.35, maxSpeed: 20 },
            2: { ratio: 3.0, drive: 1, torque: 1.08, maxSpeed: 32 },
            3: { ratio: 2.15, drive: 1, torque: 0.86, maxSpeed: 47 },
            4: { ratio: 1.45, drive: 1, torque: 0.68, maxSpeed: 64 },
            5: { ratio: 0.95, drive: 1, torque: 0.5, maxSpeed: 92 }
        };

        this.state = {
            isStalled: false,
            speed: 0,
            rpm: 800,
            gear: 0, // 0 = Neutral, 1-5 = Gears
            
            // Car position
            x: 0,
            y: 0,
            angle: 0,
            acceleration: 0,
            objectiveComplete: false,
            shakeTimer: 0, // For stalling effect
            zoom: 1.5, // Default camera zoom (decreased to show more of the road)
            currentMissionIndex: 0,
            missionTimer: 0,
            completedMissions: []
        };

        this.missions = [
            { text: "Rozjeď se (Zařaď 1 a plynule přidej plyn)", type: "START", targetTime: 0 },
            { text: "Mise: Jeď souvisle 5 sekund", type: "DRIVE_FWD", targetTime: 5 },
            { text: "Mise: Jeď souvisle 10 sekund", type: "DRIVE_FWD", targetTime: 10 },
            { text: "Mise: Jeď souvisle 30 sekund", type: "DRIVE_FWD", targetTime: 30 },
            { text: "Mise: Jeď souvisle 1 minutu", type: "DRIVE_FWD", targetTime: 60 },
            { text: "Mise: Zařaď zpátečku (R) a rozjeď se pospátku", type: "DRIVE_REV", targetTime: 0 },
            { text: "Mise: Jeď pospátku souvisle 5 sekund", type: "DRIVE_REV", targetTime: 5 },
            { text: "Mise: Jeď pospátku souvisle 10 sekund", type: "DRIVE_REV", targetTime: 10 },
            { text: "Mise: Jeď pospátku souvisle 30 sekund", type: "DRIVE_REV", targetTime: 30 },
            { text: "Mise: Jeď pospátku souvisle 1 minutu", type: "DRIVE_REV", targetTime: 60 },
            { text: "Všechny mise splněny! Výborně.", type: "DONE", targetTime: 0 }
        ];

        // Simulation Mode (EASY / HARD)
        this.mode = 'EASY';

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
        // Spawn at the designated red box area (World Space / Map pixels)
        // Middle-right area, straight road above the parking lot, bottom lane (pointing right)
        this.state.x = 1850;
        this.state.y = 635;
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

        // Touch/Mouse Events for Pedals (desktop on-screen controls)
        this._bindPedalTouch('pedal-clutch', 'clutch');
        this._bindPedalTouch('pedal-brake', 'brake');
        this._bindPedalTouch('pedal-gas', 'gas');

        // Touch/Mouse Events for Mobile Panel pedals
        this._bindPedalTouch('mob-pedal-gas', 'gas');
        this._bindPedalTouch('mob-pedal-brake', 'brake');
        this._bindPedalTouch('mob-pedal-clutch', 'clutch');
        this._bindPedalTouch('mob-pedal-gas-hard', 'gas');
        this._bindPedalTouch('mob-pedal-brake-hard', 'brake');

        // Touch Events for Mobile Gears (both old container and new mob-gears-row)
        document.querySelectorAll('.sim-gear-btn').forEach(btn => {
            const press = (e) => {
                if (e.cancelable) e.preventDefault();
                this._setGear(parseInt(btn.dataset.gear));
            };
            btn.addEventListener('mousedown', press);
            btn.addEventListener('touchstart', press, { passive: false });
        });
    }

    _setGear(gear) {
        this.state.gear = gear;
        if (this.uiGear) {
            if (gear === 0) this.uiGear.innerText = 'N';
            else if (gear === -1) this.uiGear.innerText = 'R';
            else this.uiGear.innerText = gear;
        }
        if (this.uiManager) this.uiManager.updateGearDisplay(gear);
    }

    resetCar(reason = "") {
        console.log("Resetting car position:", reason);
        this._initCarPosition();
        this.state.speed = 0;
        this.state.acceleration = 0;
        this.state.rpm = 800;
        this.state.isStalled = false;
        this.state.lastResetReason = reason;
        
        // Reset gear to N on hard reset if not already handled
        if (reason !== "MODE_SWITCH") {
            this._setGear(1); // Usually start in 1st or N, but previously we forced 1 in easy. Let's do 0 for safety in hard.
            if (this.mode === 'HARD') this._setGear(0);
        }

        if (reason === "GRASS") {
            this.uiManager.showSimFailure();
        }
    }

    setMode(mode) {
        this.mode = mode;
        console.log("Simulator mode set to:", mode);
        this.resetCar("MODE_SWITCH");
        
        if (mode === 'EASY') {
            this._setGear(1);
        } else {
            this._setGear(0);
        }
    }

    selectMission(index) {
        if (index >= 0 && index < this.missions.length) {
            this.state.currentMissionIndex = index;
            this.state.missionTimer = 0; // Reset timer for new manual selection
            this._updateTutorialUI(); // Force UI update
        }
    }



    _handleKey(e, isPressed) {
        const val = isPressed ? 1 : 0;
        const key = e.key.toLowerCase();
        this.keys[key] = isPressed;

        const { controls } = this;

        // In EASY mode, use W/S for gas/brake and ignore clutch
        if (this.mode === 'EASY') {
            if (key === 'w') {
                this.inputs.gas = val;
                this._updatePedalUI('pedal-gas', isPressed);
            } else if (key === 's') {
                this.inputs.brake = val;
                this._updatePedalUI('pedal-brake', isPressed);
            } else if (key === 'a') {
                this.inputs.steering = isPressed ? -1 : (this.keys['d'] ? 1 : 0);
            } else if (key === 'd') {
                this.inputs.steering = isPressed ? 1 : (this.keys['a'] ? -1 : 0);
            }
        } else {
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
            } else if (key === controls.gearR && isPressed) {
                this._setGear(-1);
            } else if (key === controls.gearN && isPressed) {
                this._setGear(0);
            } else if (key === controls.gear1 && isPressed) {
                this._setGear(1);
            } else if (key === controls.gear2 && isPressed) {
                this._setGear(2);
            } else if (key === controls.gear3 && isPressed) {
                this._setGear(3);
            } else if (key === controls.gear4 && isPressed) {
                this._setGear(4);
            } else if (key === controls.gear5 && isPressed) {
                this._setGear(5);
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



    _bindPedalTouch(elementId, inputKey) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const press = (e) => {
            if (e.cancelable) e.preventDefault();
            this.inputs[inputKey] = 1;
            this._updatePedalUI(elementId, true);
        };
        const release = (e) => {
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
            el.style.transform = 'translateY(6px) scale(0.95)';
            el.style.filter = 'brightness(0.8)';
            // Legacy color swap for old slate pedals
            el.classList.replace('bg-slate-300', 'bg-slate-400');
        } else {
            el.style.transform = 'translateY(0) scale(1)';
            el.style.filter = '';
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

        // Apply UI Manager steering if not overridden by keyboard
        if (this.uiManager && this.uiManager.steeringInput !== 0 && !this.keys[this.controls.steeringLeft] && !this.keys[this.controls.steeringRight]) {
            this.inputs.steering = this.uiManager.steeringInput;
        }

        // --- Engine Physics ---
        if (this.mode === 'EASY') {
            this.state.isStalled = false;
            this.state.gear = 1;
            if (this.uiGear) this.uiGear.innerText = 'D';

            if (this.inputs.gas > 0) {
                this.state.acceleration = 12 * this.inputs.gas;
                this.state.rpm = Math.min(800 + this.state.speed * 100 + this.inputs.gas * 2000, 6000);
            } else if (this.inputs.brake > 0) {
                if (this.state.speed > 1) {
                    this.state.acceleration = -20 * this.inputs.brake; // Braking
                } else {
                    this.state.acceleration = -5 * this.inputs.brake; // Reversing
                }
                this.state.rpm = 800;
            } else {
                this.state.acceleration = 0;
                this.state.rpm = Math.max(800, this.state.rpm - 100);
            }
        } else {
            // Hard Mode Physics
            const idleRpm = this.engine.idleRpm;
            const redlineRpm = this.engine.redlineRpm;
            const maxRpm = this.engine.maxRpm;
            const freeRevTarget = idleRpm + (maxRpm - idleRpm) * this.inputs.gas;
            
            // Stall Recovery
            if (this.state.isStalled) {
                if (this.inputs.clutch > 0.95) {
                    this.state.isStalled = false;
                    this.state.rpm = idleRpm; // Auto-restart
                } else {
                    this.state.rpm = 0;
                    this.state.acceleration = 0;
                }
            }

            if (!this.state.isStalled) {
                if (this.state.gear === 0) {
                    // Neutral
                    if (this.inputs.gas > 0) {
                        this.state.rpm += (freeRevTarget - this.state.rpm) * 0.08;
                    } else {
                        this.state.rpm = Math.max(this.state.rpm - this.engine.fallRate, idleRpm);
                    }
                    this.state.acceleration = 0;
                } else {
                    const profile = this.gearProfiles[this.state.gear] || this.gearProfiles[1];
                    const clutchSlip = Math.min(Math.max(this.inputs.clutch, 0), 1);
                    const clutchGrip = 1 - clutchSlip;
                    const speedInGear = Math.max(0, this.state.speed * profile.drive);
                    const wheelRpm = idleRpm + (speedInGear / profile.maxSpeed) * (redlineRpm - idleRpm);
                    const targetRpm = wheelRpm * clutchGrip + freeRevTarget * clutchSlip;

                    this.state.rpm += (targetRpm - this.state.rpm) * (0.08 + clutchGrip * 0.08);
                    this.state.rpm = Math.min(Math.max(this.state.rpm, clutchSlip > 0.9 ? idleRpm : 250), maxRpm);

                    if (
                        clutchGrip > 0.85 &&
                        speedInGear < 3 &&
                        this.inputs.gas < 0.12 &&
                        this.state.rpm < 1100
                    ) {
                        this.state.isStalled = true;
                        this.state.shakeTimer = 0.5;
                    }

                    if (!this.state.isStalled) {
                        const rpmPoint = Math.min(Math.max((this.state.rpm - idleRpm) / (redlineRpm - idleRpm), 0), 1);
                        const torqueCurve = Math.max(0.12, Math.sin(rpmPoint * Math.PI));
                        const limiter = this.state.rpm > redlineRpm ? Math.max(0, 1 - ((this.state.rpm - redlineRpm) / 300)) : 1;
                        const lowSpeedTraction = this.state.gear === 1 ? Math.min(1, 0.62 + speedInGear / 18) : 1;
                        const speedLimitFade = Math.max(0, 1 - Math.pow(speedInGear / profile.maxSpeed, 2.4));
                        const driveForce = this.inputs.gas * torqueCurve * profile.torque * limiter * lowSpeedTraction * speedLimitFade;
                        const engineBrake = this.inputs.gas < 0.05 ? 2.2 * profile.ratio * clutchGrip : 0;

                        this.state.acceleration = (driveForce * 28 * profile.drive * clutchGrip) - (engineBrake * Math.sign(this.state.speed));
                    }
                }
            }

            // Apply brake in HARD mode
            if (this.inputs.brake > 0) {
                if (this.state.speed > 0.5) {
                    this.state.acceleration -= 25 * this.inputs.brake;
                } else if (this.state.speed < -0.5) {
                    this.state.acceleration += 25 * this.inputs.brake;
                } else {
                    this.state.speed = 0;
                    this.state.acceleration = 0;
                }
            }
        }

        // --- Collision Detection ---
        this._handleCollisions();

        // Friction and drag
        const rollingDrag = this.mode === 'HARD' ? 0.12 : 0.15;
        const aeroDrag = this.mode === 'HARD' ? 0.002 * this.state.speed * Math.abs(this.state.speed) : 0;
        this.state.acceleration -= this.state.speed * rollingDrag + aeroDrag; 

        // Update Speed
        this.state.speed += this.state.acceleration * dt;
        
        // Floor it slightly to stop exactly at 0 if no gas/reverse applied
        if (Math.abs(this.state.speed) < 0.1 && this.state.acceleration === 0) {
            this.state.speed = 0;
        }

        // --- Mission Logic (HARD Mode only) ---
        if (this.mode === 'HARD') {
            const mission = this.missions[this.state.currentMissionIndex];
            if (mission && mission.type !== "DONE") {
                const isMovingFwd = this.state.speed > 1.0;
                const isMovingRev = this.state.speed < -1.0;
                const isMoving = isMovingFwd || isMovingRev;
                
                if (!isMoving) {
                    this.state.missionTimer = 0; // Reset if stopped
                }

                let missionCompleted = false;

                if (mission.type === "START") {
                    if (isMovingFwd) {
                        missionCompleted = true;
                    }
                } else if (mission.type === "DRIVE_FWD") {
                    if (isMovingFwd) {
                        this.state.missionTimer += dt;
                        if (this.state.missionTimer >= mission.targetTime) {
                            missionCompleted = true;
                        }
                    } else if (isMovingRev) {
                        this.state.missionTimer = 0; // Wrong direction
                    }
                } else if (mission.type === "DRIVE_REV") {
                    if (mission.targetTime === 0) { // Just start reversing
                        if (isMovingRev) {
                            missionCompleted = true;
                        }
                    } else {
                        if (isMovingRev) {
                            this.state.missionTimer += dt;
                            if (this.state.missionTimer >= mission.targetTime) {
                                missionCompleted = true;
                            }
                        } else if (isMovingFwd) {
                            this.state.missionTimer = 0;
                        }
                    }
                }

                if (missionCompleted) {
                    // Mark as completed
                    if (!this.state.completedMissions.includes(this.state.currentMissionIndex)) {
                        this.state.completedMissions.push(this.state.currentMissionIndex);
                    }
                    
                    // Retroactively complete easier missions of the same type
                    for (let i = 0; i < this.state.currentMissionIndex; i++) {
                        if (this.missions[i].type === mission.type && !this.state.completedMissions.includes(i)) {
                            this.state.completedMissions.push(i);
                        }
                    }

                    // Move to next mission if there is one
                    if (this.state.currentMissionIndex < this.missions.length - 1) {
                        this.state.currentMissionIndex++;
                        // Timer is NOT reset here, so it continues accumulating!
                    }
                }
            }
        }

        // Update Car Position
        if (Math.abs(this.state.speed) > 0.1) {
            // Adjust steering direction for reverse gear
            const speedDir = this.state.speed > 0 ? 1 : -1;
            const turnFactor = this.mode === 'HARD'
                ? Math.max(0.006, 0.1 / (1 + Math.abs(this.state.speed) * 0.045))
                : Math.max(0.005, 0.12 - (Math.abs(this.state.speed) * 0.002));
            const turnRate = (this.inputs.steering * this.state.speed * turnFactor) * speedDir * dt;
            this.state.angle += turnRate;

            this.state.x += Math.cos(this.state.angle) * this.state.speed * dt * 10;
            this.state.y += Math.sin(this.state.angle) * this.state.speed * dt * 10;
        }

        // --- UI & Tutorial Instructions ---
        this._updateTutorialUI();
    }



    _updateTutorialUI() {
        if (!this.uiManager) return;

        let msg = "";
        const s = this.state;

        if (this.mode === 'EASY') {
            msg = "Řiď pomocí WASD (nebo pedály a volantem). Můžeš i couvat (Brake). Pozor na trávu!";
        } else {
            if (s.isStalled) {
                msg = "CHCIÍPLO TO! (Zcela sešlápni spojku (A) pro nastartování)";
            } else {
                const mission = this.missions[this.state.currentMissionIndex];
                if (mission) {
                    if (mission.targetTime > 0 && this.state.missionTimer > 0) {
                        const remaining = Math.ceil(Math.max(0, mission.targetTime - this.state.missionTimer));
                        msg = `${mission.text} - Zbývá: ${remaining}s`;
                    } else {
                        msg = mission.text;
                    }
                } else {
                    msg = "Jezdi bezpečně!";
                }
                
                // Check if off-road (based on collision logic)
                if (this._isOffRoad()) {
                    this.resetCar("OFFROAD");
                }
            }

            // Update Dropdown UI
            this.uiManager.updateMissionsList(this.missions, this.state.currentMissionIndex, this.state.completedMissions, (index) => {
                this.selectMission(index);
            });
        }

        if (this.state.lastResetReason === "OFFROAD" || this.state.lastResetReason === "GRASS") {
            msg = "Neprošel jsi řídícím testem!";
        } else if (this.state.lastResetReason === "COLLISION") {
            msg = "NÁRAZ! Sleduj značky a zkus to znovu.";
        }

        this.uiManager.updateSimInstruction(msg);
        
        // Pass keyboard steering to UI manager if it's non-zero to show it visually
        if (this.inputs.steering !== 0) {
            this.uiManager.rotateSteeringWheel(this.inputs.steering * 0.5);
        }
        
        this.uiManager.updateSimControls(this.inputs);
        this.uiManager.toggleSimSuccess(this.state.objectiveComplete);

        // Update Gauges
        if (this.uiSpeed) this.uiSpeed.innerText = `${Math.floor(this.state.speed)} km/h`;
        if (this.uiRpm) {
            if (s.isStalled) this.uiRpm.innerText = "MOTOR CHCÍPL";
            else this.uiRpm.innerText = `${Math.floor(this.state.rpm)} RPM`;
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

                if (isGreenish) {
                    this.resetCar("GRASS");
                } else if (!isGrayish) {
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
