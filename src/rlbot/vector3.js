class Vector3 {
    constructor (x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    plus (other) {
        return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    minus (other) {
        return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    magnitude () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalized () {
        const magnitude = this.magnitude();
        if (magnitude === 0) {
            return this;
        }
        return this.scaled(1 / magnitude);
    }

    scaled (factor) {
        return new Vector3(this.x * factor, this.y * factor, this.z * factor);
    }

    toString () {
        return `(${this.x.toFixed()}, ${this.y.toFixed()}, ${this.z.toFixed()})`;
    }
}

module.exports = Vector3;
