class KPacker {
    static MAGIC = 0x4B43504B;
    static HEADER_SIZE = 12;
    static LZMA_HEADER_SIZE = 14;
    static LZMA_HEADER_PROPS = (2 * 5 + 0) * 9 + 3;
    static LZMA_DICT_MIN_SIZE = 0x10000;
    static COMPRESSION_FLAG = 1;

    unpack(inputData) {
        if (!inputData || inputData.byteLength < KPacker.HEADER_SIZE) {
            throw new Error("Неверные входные данные");
        }

        const headerView = new DataView(inputData.buffer, inputData.byteOffset, KPacker.HEADER_SIZE);

        if (headerView.getUint32(0, true) !== KPacker.MAGIC) {
            throw new Error("Неверное магическое число");
        }
        if (headerView.getUint32(8, true) !== KPacker.COMPRESSION_FLAG) {
            throw new Error("Неизвестный тип сжатия");
        }

        const unpackSize = headerView.getUint32(4, true);
        let dictSize = KPacker.LZMA_DICT_MIN_SIZE;
        while (dictSize < unpackSize) {
            dictSize <<= 1;
        }

        const packedDataView = new DataView(inputData.buffer, inputData.byteOffset + KPacker.HEADER_SIZE);
        const lzmaBuffer = new Uint8Array(packedDataView.byteLength + KPacker.LZMA_HEADER_SIZE);

        const lzmaView = new DataView(lzmaBuffer.buffer);
        lzmaView.setUint8(0, KPacker.LZMA_HEADER_PROPS);
        lzmaView.setUint32(1, dictSize, true);
        lzmaView.setBigUint64(5, BigInt(unpackSize), true);

        // Переворачиваем первые 4 байта данных
        const firstUint32 = packedDataView.getUint32(0, true);
        packedDataView.setUint32(0, firstUint32, false);

        lzmaBuffer.set(new Uint8Array(packedDataView.buffer, packedDataView.byteOffset, packedDataView.byteLength), KPacker.LZMA_HEADER_SIZE);

        const decompressed = LZMA.decompress(lzmaBuffer);
        return new DataView(new Uint8Array(decompressed).buffer);
    }

    pack(dataView) {
        if (!(dataView instanceof DataView)) {
            throw new Error("Входные данные должны быть DataView");
        }

        const unpackSize = dataView.byteLength;
        let compressed;

        try {
            compressed = LZMA.compress(new Uint8Array(dataView.buffer, dataView.byteOffset, unpackSize), KPacker.COMPRESSION_FLAG);
        } catch (e) {
            throw new Error("Ошибка сжатия LZMA: " + e.message);
        }

        compressed = compressed.slice(KPacker.LZMA_HEADER_SIZE);

        const output = new Uint8Array(compressed.length + KPacker.HEADER_SIZE);
        const outputView = new DataView(output.buffer);

        outputView.setUint32(0, KPacker.MAGIC, true);
        outputView.setUint32(4, unpackSize, true);
        outputView.setUint32(8, KPacker.COMPRESSION_FLAG, true);

        output.set(compressed, KPacker.HEADER_SIZE);

        // Переворачиваем первые 4 байта сжатых данных
        const firstUint32 = outputView.getUint32(KPacker.HEADER_SIZE, false);
        outputView.setUint32(KPacker.HEADER_SIZE, firstUint32, true);

        return outputView;
    }
}
