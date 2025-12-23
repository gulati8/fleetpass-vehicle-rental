import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request as ExpressRequest } from 'express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { diskStorage } = require('multer');
import * as fs from 'fs';
import { FileValidator } from '../common/utils/file-validation';

// Multer file type interface
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  create(
    @Body() createVehicleDto: CreateVehicleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.vehicleService.create(
      req.user.organizationId,
      createVehicleDto,
    );
  }

  @Get()
  findAll(
    @Query() query: VehicleQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.vehicleService.findAll(req.user.organizationId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.vehicleService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.vehicleService.update(
      id,
      req.user.organizationId,
      updateVehicleDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.vehicleService.remove(id, req.user.organizationId);
  }

  @Post('check-availability')
  checkAvailability(
    @Body() checkAvailabilityDto: CheckAvailabilityDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.vehicleService.checkAvailability(
      req.user.organizationId,
      checkAvailabilityDto,
    );
  }

  @Post(':id/images')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: './uploads/vehicles',
        filename: (
          req: ExpressRequest,
          file: MulterFile,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = file.mimetype.split('/')[1];
          cb(null, `${uniqueSuffix}.${ext}`);
        },
      }),
      fileFilter: (
        req: ExpressRequest,
        file: MulterFile,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|avif)$/)) {
          return cb(new Error('Only image files allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: MulterFile[],
    @Request() req: AuthenticatedRequest,
  ) {
    // Handle empty uploads
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided for upload');
    }

    // Magic byte validation
    for (const file of files) {
      const isValid = await FileValidator.validateImageFile(file);
      if (!isValid) {
        // Delete the uploaded file
        fs.unlinkSync(file.path);
        throw new BadRequestException(
          `File ${file.originalname} failed security validation. Only genuine image files are allowed.`,
        );
      }
    }

    // Wrap service call with file cleanup on failure
    try {
      return await this.vehicleService.addImages(id, req.user.organizationId, files);
    } catch (error) {
      // Cleanup uploaded files if service fails
      for (const file of files) {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          // Log but don't throw - primary error is more important
          console.error(`Failed to cleanup file ${file.path}:`, cleanupError);
        }
      }
      throw error; // Re-throw original error
    }
  }

  @Delete(':id/images')
  async deleteImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.vehicleService.deleteImage(
      id,
      req.user.organizationId,
      imageUrl,
    );
  }

  @Patch(':id/images/reorder')
  async reorderImages(
    @Param('id') id: string,
    @Body('imageUrls') imageUrls: string[],
    @Request() req: AuthenticatedRequest,
  ) {
    return this.vehicleService.reorderImages(
      id,
      req.user.organizationId,
      imageUrls,
    );
  }
}
