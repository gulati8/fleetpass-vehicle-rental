import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { KycService } from './kyc.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { SubmitGovernmentIdDto } from './dto/submit-government-id.dto';
import { SubmitSelfieDto } from './dto/submit-selfie.dto';
import { DeclineInquiryDto } from './dto/decline-inquiry.dto';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  /**
   * Create KYC inquiry for a customer
   * POST /kyc/inquiries
   */
  @Post('inquiries')
  @HttpCode(HttpStatus.CREATED)
  async createInquiry(@Body() createInquiryDto: CreateInquiryDto) {
    return this.kycService.createInquiry(createInquiryDto.customerId);
  }

  /**
   * Get inquiry status
   * GET /kyc/inquiries/:id
   */
  @Get('inquiries/:id')
  async getInquiry(@Param('id') id: string) {
    return this.kycService.getInquiry(id);
  }

  /**
   * Submit government ID for verification
   * POST /kyc/inquiries/:id/government-id
   */
  @Post('inquiries/:id/government-id')
  @HttpCode(HttpStatus.OK)
  async submitGovernmentId(
    @Param('id') id: string,
    @Body() submitGovernmentIdDto: SubmitGovernmentIdDto,
  ) {
    return this.kycService.submitGovernmentId(id, {
      front_photo: submitGovernmentIdDto.frontPhoto,
      back_photo: submitGovernmentIdDto.backPhoto,
      country: submitGovernmentIdDto.country,
      id_class: submitGovernmentIdDto.idClass,
    });
  }

  /**
   * Submit selfie for verification
   * POST /kyc/inquiries/:id/selfie
   */
  @Post('inquiries/:id/selfie')
  @HttpCode(HttpStatus.OK)
  async submitSelfie(
    @Param('id') id: string,
    @Body() submitSelfieDto: SubmitSelfieDto,
  ) {
    return this.kycService.submitSelfie(id, {
      image: submitSelfieDto.imageData,
    });
  }

  /**
   * Approve inquiry (test endpoint)
   * POST /kyc/inquiries/:id/approve
   */
  @Post('inquiries/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveInquiry(@Param('id') id: string) {
    return this.kycService.approveInquiry(id);
  }

  /**
   * Decline inquiry (test endpoint)
   * POST /kyc/inquiries/:id/decline
   */
  @Post('inquiries/:id/decline')
  @HttpCode(HttpStatus.OK)
  async declineInquiry(
    @Param('id') id: string,
    @Body() declineInquiryDto: DeclineInquiryDto,
  ) {
    return this.kycService.declineInquiry(id, declineInquiryDto.reason);
  }
}
