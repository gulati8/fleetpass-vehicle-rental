import { FileValidator } from './file-validation';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FileValidator - Magic Byte Validation', () => {
  let tempDir: string;

  beforeAll(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-validation-test-'));
  });

  afterAll(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test files after each test
    const files = fs.readdirSync(tempDir);
    files.forEach((file) => {
      fs.unlinkSync(path.join(tempDir, file));
    });
  });

  describe('JPEG validation', () => {
    it('should accept valid JPEG file with correct magic bytes (FF D8 FF)', async () => {
      // Create a minimal valid JPEG file
      const filePath = path.join(tempDir, 'valid.jpg');
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, // JPEG SOI + APP0
        0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, // JFIF marker
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, // JFIF data
      ]);
      fs.writeFileSync(filePath, jpegHeader);

      const file = {
        path: filePath,
        mimetype: 'image/jpeg',
        originalname: 'valid.jpg',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(true);
    });

    it('should accept JPEG file with image/jpg MIME type', async () => {
      const filePath = path.join(tempDir, 'valid.jpg');
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0,
        0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      fs.writeFileSync(filePath, jpegHeader);

      const file = {
        path: filePath,
        mimetype: 'image/jpg', // Alternative MIME type
        originalname: 'valid.jpg',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(true);
    });

    it('should reject JPEG file with wrong MIME type', async () => {
      const filePath = path.join(tempDir, 'jpeg-wrong-mime.png');
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0,
        0x00, 0x10, 0x4a, 0x46,
      ]);
      fs.writeFileSync(filePath, jpegHeader);

      const file = {
        path: filePath,
        mimetype: 'image/png', // Wrong MIME type for JPEG magic bytes
        originalname: 'jpeg-wrong-mime.png',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });
  });

  describe('PNG validation', () => {
    it('should accept valid PNG file with correct magic bytes (89 50 4E 47 0D 0A 1A 0A)', async () => {
      const filePath = path.join(tempDir, 'valid.png');
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      ]);
      fs.writeFileSync(filePath, pngHeader);

      const file = {
        path: filePath,
        mimetype: 'image/png',
        originalname: 'valid.png',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(true);
    });

    it('should reject PNG file with wrong MIME type', async () => {
      const filePath = path.join(tempDir, 'png-wrong-mime.jpg');
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d,
      ]);
      fs.writeFileSync(filePath, pngHeader);

      const file = {
        path: filePath,
        mimetype: 'image/jpeg', // Wrong MIME type for PNG magic bytes
        originalname: 'png-wrong-mime.jpg',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });
  });

  describe('WebP validation', () => {
    it('should accept valid WebP file with correct magic bytes (RIFF + WEBP)', async () => {
      const filePath = path.join(tempDir, 'valid.webp');
      const webpHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x00, 0x00, 0x00, // File size
        0x57, 0x45, 0x42, 0x50, // "WEBP"
        0x56, 0x50, 0x38, 0x20, // VP8 chunk
      ]);
      fs.writeFileSync(filePath, webpHeader);

      const file = {
        path: filePath,
        mimetype: 'image/webp',
        originalname: 'valid.webp',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(true);
    });

    it('should reject WebP file with wrong MIME type', async () => {
      const filePath = path.join(tempDir, 'webp-wrong-mime.png');
      const webpHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46,
        0x24, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50,
        0x56, 0x50, 0x38, 0x20,
      ]);
      fs.writeFileSync(filePath, webpHeader);

      const file = {
        path: filePath,
        mimetype: 'image/png', // Wrong MIME type
        originalname: 'webp-wrong-mime.png',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });
  });

  describe('AVIF validation', () => {
    it('should accept valid AVIF file with correct magic bytes (ftypavif at offset 4)', async () => {
      const filePath = path.join(tempDir, 'valid.avif');
      const avifHeader = Buffer.from([
        0x00, 0x00, 0x00, 0x20, // Size
        0x66, 0x74, 0x79, 0x70, // "ftyp"
        0x61, 0x76, 0x69, 0x66, // "avif"
        0x00, 0x00, 0x00, 0x00, // Minor version
      ]);
      fs.writeFileSync(filePath, avifHeader);

      const file = {
        path: filePath,
        mimetype: 'image/avif',
        originalname: 'valid.avif',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(true);
    });

    it('should reject AVIF file with wrong MIME type', async () => {
      const filePath = path.join(tempDir, 'avif-wrong-mime.jpg');
      const avifHeader = Buffer.from([
        0x00, 0x00, 0x00, 0x20,
        0x66, 0x74, 0x79, 0x70,
        0x61, 0x76, 0x69, 0x66,
        0x00, 0x00, 0x00, 0x00,
      ]);
      fs.writeFileSync(filePath, avifHeader);

      const file = {
        path: filePath,
        mimetype: 'image/jpeg', // Wrong MIME type
        originalname: 'avif-wrong-mime.jpg',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });
  });

  describe('Security attack scenarios', () => {
    it('should reject executable file disguised as JPEG (MIME spoofing)', async () => {
      const filePath = path.join(tempDir, 'malware.jpg');
      // Windows PE executable header (MZ)
      const exeHeader = Buffer.from([
        0x4d, 0x5a, 0x90, 0x00, // MZ header
        0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
        0xff, 0xff, 0x00, 0x00,
      ]);
      fs.writeFileSync(filePath, exeHeader);

      const file = {
        path: filePath,
        mimetype: 'image/jpeg', // Lying about MIME type
        originalname: 'malware.jpg',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });

    it('should reject text file disguised as PNG', async () => {
      const filePath = path.join(tempDir, 'fake.png');
      const textContent = Buffer.from('This is a text file, not an image!');
      fs.writeFileSync(filePath, textContent);

      const file = {
        path: filePath,
        mimetype: 'image/png',
        originalname: 'fake.png',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });

    it('should reject HTML file disguised as image', async () => {
      const filePath = path.join(tempDir, 'xss.jpg');
      const htmlContent = Buffer.from(
        '<html><body><script>alert("XSS")</script></body></html>',
      );
      fs.writeFileSync(filePath, htmlContent);

      const file = {
        path: filePath,
        mimetype: 'image/jpeg',
        originalname: 'xss.jpg',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });

    it('should reject shell script disguised as WebP', async () => {
      const filePath = path.join(tempDir, 'script.webp');
      const shellScript = Buffer.from('#!/bin/bash\nrm -rf /\n');
      fs.writeFileSync(filePath, shellScript);

      const file = {
        path: filePath,
        mimetype: 'image/webp',
        originalname: 'script.webp',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should reject empty file', async () => {
      const filePath = path.join(tempDir, 'empty.jpg');
      fs.writeFileSync(filePath, Buffer.alloc(0));

      const file = {
        path: filePath,
        mimetype: 'image/jpeg',
        originalname: 'empty.jpg',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });

    it('should reject file with incomplete header (less than 12 bytes)', async () => {
      const filePath = path.join(tempDir, 'incomplete.png');
      const incompleteHeader = Buffer.from([0x89, 0x50, 0x4e]); // Only 3 bytes
      fs.writeFileSync(filePath, incompleteHeader);

      const file = {
        path: filePath,
        mimetype: 'image/png',
        originalname: 'incomplete.png',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });

    it('should reject corrupted JPEG with partial magic bytes', async () => {
      const filePath = path.join(tempDir, 'corrupted.jpg');
      const corruptedHeader = Buffer.from([
        0xff, 0xd8, 0x00, // First two bytes correct, third byte wrong
        0xe0, 0x00, 0x10,
      ]);
      fs.writeFileSync(filePath, corruptedHeader);

      const file = {
        path: filePath,
        mimetype: 'image/jpeg',
        originalname: 'corrupted.jpg',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });

    it('should handle file read errors gracefully', async () => {
      const file = {
        path: '/nonexistent/path/to/file.jpg',
        mimetype: 'image/jpeg',
        originalname: 'nonexistent.jpg',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });

    it('should reject file with correct magic bytes but insufficient length for AVIF', async () => {
      const filePath = path.join(tempDir, 'short-avif.avif');
      // Only 8 bytes, but AVIF needs at least 12 bytes
      const shortHeader = Buffer.from([
        0x00, 0x00, 0x00, 0x20,
        0x66, 0x74, 0x79, 0x70,
      ]);
      fs.writeFileSync(filePath, shortHeader);

      const file = {
        path: filePath,
        mimetype: 'image/avif',
        originalname: 'short-avif.avif',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });
  });

  describe('Comprehensive format coverage', () => {
    it('should reject unsupported image format (GIF)', async () => {
      const filePath = path.join(tempDir, 'image.gif');
      const gifHeader = Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
        0x01, 0x00, 0x01, 0x00,
      ]);
      fs.writeFileSync(filePath, gifHeader);

      const file = {
        path: filePath,
        mimetype: 'image/gif', // Even with correct MIME, GIF not supported
        originalname: 'image.gif',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });

    it('should reject unsupported image format (BMP)', async () => {
      const filePath = path.join(tempDir, 'image.bmp');
      const bmpHeader = Buffer.from([
        0x42, 0x4d, // "BM"
        0x46, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]);
      fs.writeFileSync(filePath, bmpHeader);

      const file = {
        path: filePath,
        mimetype: 'image/bmp',
        originalname: 'image.bmp',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(false);
    });
  });

  describe('matchesSignature private method behavior', () => {
    it('should accept files with extra bytes beyond the signature', async () => {
      const filePath = path.join(tempDir, 'large-jpeg.jpg');
      // Valid JPEG header followed by lots of extra data
      const jpegWithData = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
        Buffer.alloc(1000, 0xff), // 1000 bytes of padding
      ]);
      fs.writeFileSync(filePath, jpegWithData);

      const file = {
        path: filePath,
        mimetype: 'image/jpeg',
        originalname: 'large-jpeg.jpg',
      };

      const result = await FileValidator.validateImageFile(file);

      expect(result).toBe(true);
    });
  });
});
