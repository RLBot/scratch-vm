const ControllerState = require('./controllerState');
const Vector3 = require('./vector3');

class RLBotManager {
    constructor (runtime) {
        this.runtime = runtime;
        this.ws = null;
        this._controllerStates = {};
        this._gameState = null;
        this.playerTargets = [];
        this.ballTarget = null;
        this.hasFreshState = false;
        this.lastDataTime = Date.now();

        this.connect();
    }

    reset () {
        this.ballTarget = null;
        this.playerTargets = [];
        this._controllerStates = {};
    }

    connect () {

        const self = this;

        this.ws = new WebSocket('ws://localhost:42008');

        this.ws.onmessage = function (evt) {
            self._gameState = JSON.parse(evt.data);

            self.ensureCarTargetsExist(self);
            self.ensureBallTargetExists(self);

            if (self.ballTarget) {
                const location = self.convertVec(self._gameState.ball.location);
                self.ballTarget.setXY(location.x, location.y, false);
            }

            for (let i = 0; i < self.playerTargets.length; i++) {
                if (self.playerTargets[i]) {
                    const player = self._gameState.players[i];
                    const location = self.convertVec(player.location);
                    self.playerTargets[i].setXY(location.x, location.y, false);

                    self.playerTargets[i].setDirection(self.rlbotRadiansToScratchDegrees(player.rotation.yaw));
                }
            }

            self.hasFreshState = true;
            self.lastDataTime = Date.now();
        };

        this.ws.onopen = function () {
            self.hasFreshState = true;
        }

        this.ws.onclose = function () {
            setTimeout(() => {
                self.connect();
            }, 1000);
        };

        this.ws.onerror = function () {
            self.ws.close();
        };
    }

    ensureBallTargetExists () {
        if (this._gameState.ball && !this.ballTarget) {
            for (let i = 0; i < this.runtime.targets.length; i++) {
                const target = this.runtime.targets[i];
                if (target.sprite.name === 'ball') {
                    this.ballTarget = target;
                }
            }
        }
    }

    ensureCarTargetsExist () {
        if (this._gameState.players.length > this.playerTargets.length) {
            for (let i = 0; i < this.runtime.targets.length; i++) {
                const target = this.runtime.targets[i];
                const num = this.extractPlayerNum(target.sprite);
                if (Number.isInteger(num) && !this.playerTargets[num]) {
                    this.playerTargets[num] = target;
                }
            }
        }
    }

    step () {
        const readyToCall = this.hasFreshState || Date.now() - this.lastDataTime > 1000;
        if (this.ws.readyState === WebSocket.OPEN && readyToCall) {
            const controllerJson = JSON.stringify(this._controllerStates);
            this.ws.send(controllerJson);
            this.hasFreshState = false;
        }
    }

    getControllerState (playerIndex) {
        if (!this._controllerStates[playerIndex]) {
            this._controllerStates[playerIndex] = new ControllerState();
        }
        return this._controllerStates[playerIndex];
    }

    getGameState () {
        return this._gameState;
    }

    getPlayerLocation (index) {
        if (this._gameState.players && this._gameState.players[index]) {
            const v3Dict = this._gameState.players[index].location;
            return this.convertVec(v3Dict);
        }
        return new Vector3();
    }

    getBallLocation () {
        if (this._gameState.ball) {
            const v3Dict = this._gameState.ball.location;
            return this.convertVec(v3Dict);
        }
        return new Vector3();
    }

    getPlayerVelocity (index) {
        if (this._gameState.players && this._gameState.players[index]) {
            const v3Dict = this._gameState.players[index].velocity;
            return this.convertVec(v3Dict);
        }
        return new Vector3();
    }

    getBallVelocity () {
        if (this._gameState.ball) {
            const v3Dict = this._gameState.ball.velocity;
            return this.convertVec(v3Dict);
        }
        return new Vector3();
    }

    convertVec (v3Dict) {
        // Divide by 10 to get friendlier numbers. Invert x for sanity.
        return new Vector3(-v3Dict.x / 30, v3Dict.y / 30, v3Dict.z / 30);
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

    extractPlayerNum (sprite) {
        const name = sprite.name;
        if (name.startsWith('player-')) {
            return parseInt(name.slice('player-'.length), 10);
        }
        return null;
    }

    getPlayerYawRadians (index) {
        if (this._gameState.players && this._gameState.players[index]) {
            return this._gameState.players[index].rotation.yaw;
        }
        return 0;
    }
}

module.exports = RLBotManager;
