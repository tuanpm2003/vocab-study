import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { CreateLanguageDto } from './dto/create-language.dto.js';
import { UpdateLanguageDto } from './dto/update-language.dto.js';
import { LanguagesService } from './languages.service.js';

@ApiTags('languages')
@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Get()
  findAll(@CurrentUser() ownerId: string, @Query() query: PaginationDto) {
    return this.languagesService.findAll(ownerId, query);
  }

  @Post()
  @ApiConflictResponse({ description: 'Trùng tên trong cùng owner' })
  create(@CurrentUser() ownerId: string, @Body() dto: CreateLanguageDto) {
    return this.languagesService.create(ownerId, dto);
  }

  @Get(':id')
  @ApiNotFoundResponse()
  findOne(@Param('id') id: string, @CurrentUser() ownerId: string) {
    return this.languagesService.findOne(id, ownerId);
  }

  @Patch(':id')
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'Trùng tên trong cùng owner' })
  update(
    @Param('id') id: string,
    @CurrentUser() ownerId: string,
    @Body() dto: UpdateLanguageDto,
  ) {
    return this.languagesService.update(id, ownerId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id') id: string, @CurrentUser() ownerId: string) {
    return this.languagesService.remove(id, ownerId);
  }
}
