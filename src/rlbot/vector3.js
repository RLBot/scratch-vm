class Vector3 {
    constructor (x = 0, y = 0, z = 0) {
        this._x = x;
        this._y = y;
        this._z = z;
    }

    plus (other) {
        return new Vector3(this._x + other._x, this._y + other._y, this._z + other._z);
    }

    minus (other) {
        return new Vector3(this._x - other._x, this._y - other._y, this._z - other._z);
    }

    toString () {
        return `(${this._x.toFixed()}, ${this._y.toFixed()}, ${this._z.toFixed()})`;
    }
}

module.exports = Vector3;
