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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  CreateLevelDto,
  CreateLevelSystemDto,
  ReorderLevelsDto,
  UpdateLevelDto,
  UpdateLevelSystemDto,
} from './dto/level-system.dto.js';
import { LevelSystemsService } from './level-systems.service.js';

@ApiTags('level-systems')
@Controller()
export class LevelSystemsController {
  constructor(private readonly service: LevelSystemsService) {}

  // Ngoại lệ có chủ đích của quy tắc phân trang (docs/API.md): mỗi ngôn ngữ chỉ có 1–2 hệ thống.
  @Get('languages/:languageId/level-systems')
  findByLanguage(
    @Param('languageId') languageId: string,
    @CurrentUser() ownerId: string,
  ) {
    return this.service.findByLanguage(languageId, ownerId);
  }

  @Post('languages/:languageId/level-systems')
  create(
    @Param('languageId') languageId: string,
    @CurrentUser() ownerId: string,
    @Body() dto: CreateLevelSystemDto,
  ) {
    return this.service.create(languageId, ownerId, dto);
  }

  @Patch('level-systems/:id')
  update(
    @Param('id') id: string,
    @CurrentUser() ownerId: string,
    @Body() dto: UpdateLevelSystemDto,
  ) {
    return this.service.update(id, ownerId, dto);
  }

  @Delete('level-systems/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() ownerId: string) {
    return this.service.remove(id, ownerId);
  }

  @Post('level-systems/:id/levels')
  addLevel(
    @Param('id') id: string,
    @CurrentUser() ownerId: string,
    @Body() dto: CreateLevelDto,
  ) {
    return this.service.addLevel(id, ownerId, dto);
  }

  @Post('level-systems/:id/levels/reorder')
  @HttpCode(HttpStatus.OK)
  reorderLevels(
    @Param('id') id: string,
    @CurrentUser() ownerId: string,
    @Body() dto: ReorderLevelsDto,
  ) {
    return this.service.reorderLevels(id, ownerId, dto);
  }

  @Patch('levels/:id')
  updateLevel(
    @Param('id') id: string,
    @CurrentUser() ownerId: string,
    @Body() dto: UpdateLevelDto,
  ) {
    return this.service.updateLevel(id, ownerId, dto);
  }

  @Delete('levels/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeLevel(@Param('id') id: string, @CurrentUser() ownerId: string) {
    return this.service.removeLevel(id, ownerId);
  }
}
