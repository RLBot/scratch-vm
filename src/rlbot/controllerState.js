class ControllerState {
    constructor () {
        this.steer = 0.0;
        this.throttle = 0.0;
        this.pitch = 0.0;
        this.yaw = 0.0;
        this.roll = 0.0;
        this.jump = false;
        this.boost = false;
        this.handbrake = false;
    }

    reset () {
        this.steer = 0.0;
        this.throttle = 0.0;
        this.pitch = 0.0;
        this.yaw = 0.0;
        this.roll = 0.0;
        this.jump = false;
        this.boost = false;
        this.handbrake = false;
    }
}

module.exports = ControllerState;
