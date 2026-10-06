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
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  CreateVocabularyDto,
  QueryVocabularyDto,
  UpdateVocabularyDto,
} from './dto/vocabulary.dto.js';
import { VocabulariesService } from './vocabularies.service.js';

@ApiTags('vocabularies')
@Controller('vocabularies')
export class VocabulariesController {
  constructor(private readonly service: VocabulariesService) {}

  @Get()
  findAll(@CurrentUser() ownerId: string, @Query() query: QueryVocabularyDto) {
    return this.service.findAll(ownerId, query);
  }

  @Post()
  create(@CurrentUser() ownerId: string, @Body() dto: CreateVocabularyDto) {
    return this.service.create(ownerId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() ownerId: string) {
    return this.service.findOne(id, ownerId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() ownerId: string,
    @Body() dto: UpdateVocabularyDto,
  ) {
    return this.service.update(id, ownerId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() ownerId: string) {
    return this.service.remove(id, ownerId);
  }
}
