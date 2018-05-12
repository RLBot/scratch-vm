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

                    self.playerTargets[i].setDirection(self.convertYaw(player.rotation.yaw));
                }
            }
        };

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
        if (this.ws.readyState === WebSocket.OPEN) {
            const controllerJson = JSON.stringify(this._controllerStates);
            this.ws.send(controllerJson);
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

    convertVec (v3Dict) {
        // Divide by 10 to get friendlier numbers. Invert x for sanity.
        return new Vector3(-v3Dict.x / 30, v3Dict.y / 30, v3Dict.z / 30);
    }

    // Takes in radians and gives out degrees
    convertYaw (yaw) {
        return yaw * 180 / Math.PI;
    }

    extractPlayerNum (sprite) {
        const name = sprite.name;
        if (name.startsWith('player-')) {
            return parseInt(name.slice('player-'.length), 10);
        }
        return null;
    }

}

module.exports = RLBotManager;
