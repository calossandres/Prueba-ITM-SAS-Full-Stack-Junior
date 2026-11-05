export const MAX_ORIGINAL_IMAGE_BYTES = 500000000;
export const MAX_PROCESSED_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_PIXELS = 64000000;
export function imageDimensions(header: Uint8Array): {
    width: number;
    height: number;
} {
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
    const ascii = (start: number, length: number) => String.fromCharCode(...header.subarray(start, start + length));
    let width = 0, height = 0;
    if (header.length >= 24 && header[0] === 137 && ascii(1, 3) === 'PNG' && header[4] === 13 && header[5] === 10 && header[6] === 26 && header[7] === 10 && ascii(12, 4) === 'IHDR') {
        width = view.getUint32(16);
        height = view.getUint32(20);
    }
    else if (header.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
        const chunk = ascii(12, 4);
        if (chunk === 'VP8X') {
            width = 1 + header[24] + (header[25] << 8) + (header[26] << 16);
            height = 1 + header[27] + (header[28] << 8) + (header[29] << 16);
        }
        else if (chunk === 'VP8 ' && header[23] === 0x9d && header[24] === 1 && header[25] === 0x2a) {
            width = view.getUint16(26, true) & 0x3fff;
            height = view.getUint16(28, true) & 0x3fff;
        }
        else if (chunk === 'VP8L' && header[20] === 0x2f) {
            width = 1 + header[21] + ((header[22] & 63) << 8);
            height = 1 + (header[22] >> 6) + (header[23] << 2) + ((header[24] & 15) << 10);
        }
    }
    else if (header.length >= 4 && header[0] === 0xff && header[1] === 0xd8) {
        let offset = 2;
        while (offset + 4 < header.length) {
            if (header[offset] !== 0xff)
                break;
            while (header[offset] === 0xff)
                offset++;
            const marker = header[offset++];
            if (marker === 0xd9 || marker === 0xda)
                break;
            if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7))
                continue;
            if (offset + 2 > header.length)
                break;
            const length = view.getUint16(offset);
            if (length < 2 || offset + length > header.length)
                break;
            if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
                height = view.getUint16(offset + 3);
                width = view.getUint16(offset + 5);
                break;
            }
            offset += length;
        }
    }
    if (!width || !height)
        throw new Error('Selecciona una imagen JPG, PNG o WebP válida.');
    if (width * height > MAX_PIXELS)
        throw new Error('La resolución de esta imagen es demasiado grande para procesarla en este dispositivo. Exporta una versión con menos píxeles.');
    return { width, height };
}
export async function prepareImage(file: File): Promise<File> {
    if (!file.size)
        throw new Error('La imagen está vacía.');
    if (file.size > MAX_ORIGINAL_IMAGE_BYTES)
        throw new Error('La imagen original no puede superar 500 MB.');
    // Read only a small header before decoding, not a 500 MB ArrayBuffer or base64 string.
    const header = new Uint8Array(await file.slice(0, 2 * 1024 * 1024).arrayBuffer());
    const { width, height } = imageDimensions(header);
    if (typeof createImageBitmap !== 'function')
        throw new Error('Tu navegador no puede optimizar esta imagen. Usa una versión actualizada.');
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image', resizeWidth: Math.max(1, Math.round(width * Math.min(1, 2400 / Math.max(width, height)))), resizeHeight: Math.max(1, Math.round(height * Math.min(1, 2400 / Math.max(width, height)))), resizeQuality: 'high' });
    }
    catch {
        throw new Error('No se pudo procesar la imagen en este dispositivo. Prueba con una captura o una versión más pequeña.');
    }
    const canvas = document.createElement('canvas');
    try {
        for (let attempt = 0; attempt < 5; attempt++) {
            const scale = Math.pow(0.8, attempt);
            canvas.width = Math.max(1, Math.round(bitmap.width * scale));
            canvas.height = Math.max(1, Math.round(bitmap.height * scale));
            const context = canvas.getContext('2d');
            if (!context)
                throw new Error('No se pudo preparar la vista previa.');
            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', Math.max(0.55, 0.86 - attempt * 0.08)));
            if (blob && ['image/webp', 'image/png', 'image/jpeg'].includes(blob.type) && blob.size <= MAX_PROCESSED_IMAGE_BYTES) {
                return new File([blob], 'imagen-optimizada', { type: blob.type });
            }
        }
        throw new Error('No se pudo optimizar esta imagen. Prueba exportándola con menor resolución.');
    }
    finally {
        bitmap.close();
        canvas.width = 1;
        canvas.height = 1;
    }
}
