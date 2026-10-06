import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { emptyToNull, trimString } from '../../common/dto/transforms.js';
import { CollectionKind } from '../../generated/prisma/enums.js';

export class CreateCollectionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  languageId: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'null = collection xuyên level (chủ đề)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  levelId?: string | null;

  @ApiProperty({ example: 'Lesson 3', maxLength: 100 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Tên collection không được để trống' })
  @MaxLength(100, { message: 'Tên collection dài tối đa 100 ký tự' })
  name: string;

  @ApiPropertyOptional({ enum: CollectionKind, default: CollectionKind.LESSON })
  @IsOptional()
  @IsEnum(CollectionKind)
  kind?: CollectionKind;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  description?: string | null;
}

// languageId không đổi được sau khi tạo: chuyển một bài học sang ngôn ngữ khác
// sẽ kéo theo mọi từ vựng bên trong sang sai ngôn ngữ.
export class UpdateCollectionDto extends PartialType(
  OmitType(CreateCollectionDto, ['languageId'] as const),
) {}

export class QueryCollectionDto extends PaginationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'languageId là bắt buộc' })
  languageId: string;

  @ApiPropertyOptional({
    description:
      'id của level, hoặc chuỗi "null" để lấy collection xuyên level',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  levelId?: string;

  @ApiPropertyOptional({ enum: CollectionKind })
  @IsOptional()
  @IsEnum(CollectionKind)
  kind?: CollectionKind;
}
