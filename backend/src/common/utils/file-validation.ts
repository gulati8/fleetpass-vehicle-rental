/**
 * File validation utility for secure image upload
 * Validates magic bytes (file signatures) to prevent MIME type spoofing
 */
export class FileValidator {
  private static readonly MAGIC_BYTES = {
    jpeg: [0xff, 0xd8, 0xff],
    png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    webp: { riff: [0x52, 0x49, 0x46, 0x46], webp: [0x57, 0x45, 0x42, 0x50] },
    avif: [0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], // "ftypavif" at offset 4
  };

  /**
   * Validate image file by checking magic bytes
   * @param file - Multer file object
   * @returns true if file is a valid image matching its MIME type
   */
  static async validateImageFile(file: any): Promise<boolean> {
    try {
      const fs = await import('fs');
      const buffer = fs.readFileSync(file.path);
      const header = buffer.slice(0, 12);

      // Check JPEG (FF D8 FF)
      if (this.matchesSignature(header.slice(0, 3), this.MAGIC_BYTES.jpeg)) {
        return file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg';
      }

      // Check PNG (89 50 4E 47 0D 0A 1A 0A)
      if (this.matchesSignature(header.slice(0, 8), this.MAGIC_BYTES.png)) {
        return file.mimetype === 'image/png';
      }

      // Check WebP (RIFF at 0, WEBP at 8)
      if (
        this.matchesSignature(header.slice(0, 4), this.MAGIC_BYTES.webp.riff) &&
        this.matchesSignature(header.slice(8, 12), this.MAGIC_BYTES.webp.webp)
      ) {
        return file.mimetype === 'image/webp';
      }

      // Check AVIF (ftypavif at offset 4)
      if (
        buffer.length >= 12 &&
        this.matchesSignature(buffer.slice(4, 12), this.MAGIC_BYTES.avif)
      ) {
        return file.mimetype === 'image/avif';
      }

      return false;
    } catch (error) {
      console.error('File validation error:', error);
      return false;
    }
  }

  private static matchesSignature(
    buffer: Buffer,
    signature: number[],
  ): boolean {
    if (buffer.length < signature.length) return false;
    return signature.every((byte, index) => buffer[index] === byte);
  }
}
