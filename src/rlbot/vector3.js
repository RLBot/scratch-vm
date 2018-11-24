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

    static fromString (str) {
        if (str.length < 9) {
            return null;  // Must be at least (0, 0, 0)
        }
        const numList = str.substring(1, str.length - 1).split(', ');
        if (numList.length != 3) {
            return null;
        }

        const x = Number.parseFloat(numList[0]);
        const y = Number.parseFloat(numList[1]);
        const z = Number.parseFloat(numList[2]);

        if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) {
            return null;
        }

        return new Vector3(x, y, z);
    }
}

module.exports = Vector3;
