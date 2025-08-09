const DataType = {
    BYTE: 1,
    CHAR: -1,
    WORD: 2,
    DWORD: 4,
    INT: -4,
    I16: -2,
    STR: 5,
    HEX6: 6,
    COLOR: 7
};

class BinaryParser {
    constructor(data, structure, callback = null) {
        this.data = new DataView(data);
        this.structure = structure;
        this.offset = 0;
        this.callback = callback;
        this.parsedData = this.parseStructure(structure);
    }

    parse() {
        return this.parsedData;
    }

    parseStructure(structure) {
        const result = {};

        for (let [key, type] of Object.entries(structure)) {
            const startOffset = this.offset;

            const isPointer = key.startsWith('#');
            if (isPointer) key = key.slice(1);

            const match = key.match(/^(?<name>[^:]+)(?::(?<count>\d+))?$/);
            const name = match.groups.name;
            let count = parseInt(match.groups.count || 1);

            let value;

            const readValue = () => typeof type === 'object' ? this.parseStructure(type) : this.parseValue(type);

            if (count > 1) {
                if (isPointer) this.offset = this.data.getUint32(startOffset, true);
                value = Array.from({ length: count }, readValue);
                if (isPointer) this.offset = startOffset + 4;
            } else {
                if (isPointer) {
                    this.offset = this.data.getUint32(startOffset, true);
                    value = readValue();
                    this.offset = startOffset + 4;
                } else {
                    value = readValue();
                }
            }

            Object.defineProperty(result, name, {
                get: () => value,
                set: (newValue) => {
                    this.offset = isPointer ? this.data.getUint32(startOffset, true) : startOffset;
                    if (Array.isArray(newValue)) {
                        newValue.forEach(v => this.writeValue(type, v));
                    } else {
                        this.writeValue(type, newValue);
                    }
                    value = newValue;
                    this.offset = startOffset;
                },
                enumerable: true
            });
        }
        return result;
    }

    parseValue(type) {
        if (typeof type === 'function') return type(this.data, this.offset);

        const readers = {
            [DataType.BYTE]: () => this.read(1, 'getUint8'),
            [DataType.CHAR]: () => String.fromCharCode(this.read(1, 'getInt8')),
            [DataType.WORD]: () => this.read(2, 'getUint16'),
            [DataType.DWORD]: () => this.read(4, 'getUint32'),
            [DataType.INT]: () => this.read(4, 'getInt32'),
            [DataType.I16]: () => this.read(2, 'getInt16'),
            [DataType.STR]: () => this.readString(),
            [DataType.HEX6]: () => this.read(4, 'getUint32').toString(16).padStart(6, '0'),
            [DataType.COLOR]: () => '#' + this.read(4, 'getUint32').toString(16).padStart(6, '0')
        };

        if (!readers[type]) throw new Error(`Unknown type: ${type}`);
        return readers[type]();
    }

    read(bytes, method) {
        const val = this.data[method](this.offset, true);
        this.offset += bytes;
        return val;
    }

    readString() {
        const bytes = [];
        while (this.offset < this.data.byteLength) {
            const char = this.data.getInt8(this.offset++);
            if (char === 0) break;
            bytes.push(char);
        }
        return new TextDecoder().decode(new Uint8Array(bytes));
    }

    writeValue(type, value) {
        const writers = {
            [DataType.BYTE]: v => this.write(1, 'setUint8', v),
            [DataType.CHAR]: v => this.write(1, 'setInt8', v.charCodeAt(0)),
            [DataType.WORD]: v => this.write(2, 'setUint16', v),
            [DataType.DWORD]: v => this.write(4, 'setUint32', v),
            [DataType.INT]: v => this.write(4, 'setInt32', v),
            [DataType.I16]: v => this.write(2, 'setInt16', v),
            [DataType.STR]: v => this.writeString(v),
            [DataType.HEX6]: v => this.write(4, 'setUint32', parseInt(v, 16)),
            [DataType.COLOR]: v => this.write(4, 'setUint32', parseInt(v.slice(1), 16))
        };

        if (!writers[type]) throw new Error(`Unknown type: ${type}`);
        writers[type](value);

        if (this.callback) this.callback(this.parsedData);
    }

    write(bytes, method, value) {
        this.data[method](this.offset, value, true);
        this.offset += bytes;
    }

    writeString(str) {
        const encoded = new TextEncoder().encode(str);
        encoded.forEach(b => this.data.setInt8(this.offset++, b));
        this.data.setInt8(this.offset++, 0);
    }
}
