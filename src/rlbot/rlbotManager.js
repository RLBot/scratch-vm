const ControllerState = require('./controllerState');
const Vector3 = require('./vector3');
const EventEmitter = require('events');
const rlbot = require('./rlbot_generated');
const Flatbuffers = require('flatbuffers');
const ReconnectingWebSocket = require('reconnecting-websocket').default;
const AXIS_SCALE = 32;
const DEFAULT_PORT = '42008';

class RLBotManager extends EventEmitter {
    constructor (runtime) {
        super();

        this.runtime = runtime;
        this._controllerStates = {};
        this._flatState = null;
        this.playerTargets = [];
        this.ballTarget = null;
        this.lastPositionUpdate = Date.now();
        this.hasDirtyControllerState = false;
        this.socketString = 'ws://localhost:' + DEFAULT_PORT;
        this.hasConnection = false; // The UI will use this to report success to the user.
        this.enabledPlayers = [];

        const self = this;
        const urlProvider = () => self.socketString;
        this.ws = new ReconnectingWebSocket(urlProvider);
        this.ws.addEventListener("message", (evt) => {
            const now = Date.now();
            self.hasConnection = true;
            const fileReader = new FileReader();
            fileReader.onload = function(event) {
                const bb = new Flatbuffers.flatbuffers.ByteBuffer(new Uint8Array(event.target.result));
                self._flatState = rlbot.flat.TinyPacket.getRootAsTinyPacket(bb);

                const skipRedraw = now - self.lastPositionUpdate < 50; // Render at 20fps

                if (!skipRedraw) {
                    self.lastPositionUpdate = now;

                    if (self.ballTarget) {
                        const location = self.getBallLocation();
                        self.ballTarget.setXY(location.x, location.y, false, skipRedraw);
                    }
    
                    for (let i = 0; i < self.playerTargets.length; i++) {
                        if (self.playerTargets[i]) {
                            if (self._flatState.playersLength() > i) {
                                const player = self._flatState.players(i);
                                const location = self.convertVec(player.location());
                                self.playerTargets[i].setXY(location.x, location.y, false, skipRedraw);
                                self.playerTargets[i].setDirection(self.rlbotRadiansToScratchDegrees(player.rotation().yaw()), skipRedraw);
                            }
                        }
                    }
                }

                self.runtime.startHats('event_whenbroadcastreceived', {
                    BROADCAST_OPTION: 'New RLBot Data'
                });
            }
            fileReader.readAsArrayBuffer(evt.data);
        });

        this.ws.addEventListener('close', (evt) => {
            self.hasConnection = false;

            // TODO: remove this logic when https://github.com/pladaria/reconnecting-websocket/issues/60
            // is dealt with.
            if (self.ws._shouldReconnect) {
                self.ws._connect();
            }
        });
    }

    reset () {
        this.ballTarget = null;
        this.playerTargets = [];
        for (let idx in this._controllerStates) {
            this._controllerStates[idx].reset();
        }
    }

    setHost (hostString) {
        this.socketString = 'ws://' + hostString;
        if (hostString.indexOf(':') < 0) {
            this.socketString += ':' + DEFAULT_PORT;
        }

        this.ws.reconnect();
    }
        
    forgetTarget(target) {
        if (target.rlbotType === 'car') {
            delete this.playerTargets[target.rlbotIndex];
            delete this._controllerStates[target.rlbotIndex];
        } else if (target.rlbotType === 'ball') {
            this.ballTarget = null;
        }
    }

    initTarget(target) {

        this.forgetTarget(target);

        const playerNum = this.extractPlayerNum(target.sprite.name);
        if (Number.isInteger(playerNum)) {
            target.rlbotType = 'car';
            target.rlbotIndex = playerNum;
            this.playerTargets[target.rlbotIndex] = target;
            this.filterPlayer(playerNum, this.enabledPlayers[playerNum]);
        }
        if (this.isBall(target.sprite)) {
            target.rlbotType = 'ball';
            this.ballTarget = target;
        }
    }

    filterPlayer(playerIndex, shouldSendControllerState) {
        if (shouldSendControllerState) {
            if (!this._controllerStates[playerIndex]) {
                this._controllerStates[playerIndex] = new ControllerState();
            }
        } else {
            delete this._controllerStates[playerIndex];
        }

        this.enabledPlayers[playerIndex] = shouldSendControllerState;
        const target = this.playerTargets[playerIndex];
        if (target) {
            if (!shouldSendControllerState) {
                this.runtime.stopForTarget(target);
            }
            target.rlbotCommunication = shouldSendControllerState;
            this.emit('rlbotFilterUpdate', {
                target: target
            });
        }
    }

    step () {
        if (this.ws.readyState === WebSocket.OPEN) {
            const controllerJson = JSON.stringify(this._controllerStates);
            this.ws.send(controllerJson);
            this.hasDirtyControllerState = false;
        }
    }

    updateControllerState (playerIndex, propertyName, value) {
        if (!this._controllerStates[playerIndex]) {
            // This means we're not configured to control this player index, so do nothing.
            // See filterPlayer.
            return; 
        }        
        this._controllerStates[playerIndex][propertyName] = value;
        this.hasDirtyControllerState = true;

        this.emit('controllerUpdate', {
            playerIndex: playerIndex,
            controller: this._controllerStates[playerIndex]
        });
    }

    getPlayerLocation (index) {
        if (this._flatState && this._flatState.playersLength() > index) {
            const v3Dict = this._flatState.players(index).location();
            return this.convertVec(v3Dict);
        }
        return new Vector3();
    }

    getBallLocation () {
        if (this._flatState) {
            const v3Dict = this._flatState.ball().location();
            return this.convertVec(v3Dict);
        }
        return new Vector3();
    }

    getPlayerVelocity (index) {
        if (this._flatState && this._flatState.playersLength() > index) {
            const v3 = this._flatState.players(index).velocity();
            return this.convertVec(v3);
        }
        return new Vector3();
    }

    getPlayerDefendingSide (index) {
        if (this._flatState && this._flatState.playersLength() > index) {
            return this._flatState.players(index).team() * 2 - 1;
        }
        return 0;
    }

    getBallVelocity () {
        if (this._flatState) {
            const v3Dict = this._flatState.ball().velocity();
            return this.convertVec(v3Dict);
        }
        return new Vector3();
    }

    convertVec (v3Dict) {
        // Divide to get friendlier numbers. Invert x for sanity.
        return new Vector3(-v3Dict.x() / AXIS_SCALE, v3Dict.y() / AXIS_SCALE, v3Dict.z() / AXIS_SCALE);
    }

    atanRadiansToRlbotRadians(atanRads) {
        // The rotation and axes in RLBot are goofed up. 
        // We flipped the x-axis to help out a little, and now we're dealing with
        // the consequences for rotation. At this point, the RLBot rotation has 
        // PI in the +x direction and PI/2 in the +y direction.
        return Math.PI - atanRads;
    }

    rlbotRadiansToScratchDegrees(rlbotRads) {
        // Scratch degrees have 90 in the +x direction and 0 in the +y direction.
        return rlbotRads * 180 / Math.PI - 90;
    }

    extractPlayerNum (name) {
        if (name.startsWith('player-')) {
            return parseInt(name.slice('player-'.length), 10) - 1;
        }
        return null;
    }

    isBall (sprite) {
        return sprite.name === 'ball';
    }

    getPlayerYawRadians (index) {
        if (this._flatState && this._flatState.playersLength() > index) {
            return this._flatState.players(index).rotation().yaw();
        }
        return 0;
    }
}

module.exports = RLBotManager;
