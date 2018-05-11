const ControllerState = require('./controllerState');
const Vector3 = require('./vector3');

class RLBotManager {
    constructor () {
        this.ws = null;
        this._controllerStates = {};
        this._gameState = null;
        this.state = null;

        this.connect();
    }

    connect () {

        const self = this;

        this.ws = new WebSocket('ws://localhost:42008');

        this.ws.onopen = function () {
            self.state = 'open'; // Dummy statement so I can set a breakpoing
        };

        this.ws.onmessage = function (evt) {
            self._gameState = JSON.parse(evt.data);
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
        // Divide by 10 to get friendlier numbers.
        return new Vector3(v3Dict.x / 10, v3Dict.y / 10, v3Dict.z / 10);
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
