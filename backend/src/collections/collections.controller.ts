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
import { CollectionsService } from './collections.service.js';
import {
  CreateCollectionDto,
  QueryCollectionDto,
  UpdateCollectionDto,
} from './dto/collection.dto.js';

@ApiTags('collections')
@Controller('collections')
export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Get()
  findAll(@CurrentUser() ownerId: string, @Query() query: QueryCollectionDto) {
    return this.service.findAll(ownerId, query);
  }

  @Post()
  create(@CurrentUser() ownerId: string, @Body() dto: CreateCollectionDto) {
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
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.service.update(id, ownerId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() ownerId: string) {
    return this.service.remove(id, ownerId);
  }
}
