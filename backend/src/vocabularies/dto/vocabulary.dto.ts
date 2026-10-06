import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { emptyToNull, trimString } from '../../common/dto/transforms.js';
import { LearningStatus } from '../../generated/prisma/enums.js';
import { MaxJsonBytes } from '../../common/validators/max-json-bytes.validator.js';

export const EXTRA_MAX_BYTES = 4096;

export class CreateVocabularyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  languageId: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  levelId?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'Quan hệ N-N' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  collectionIds?: string[];

  @ApiProperty({ example: '食べる', maxLength: 200 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Từ không được để trống' })
  @MaxLength(200, { message: 'Từ dài tối đa 200 ký tự' })
  term: string;

  @ApiProperty({ example: 'ăn', maxLength: 1000 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Nghĩa không được để trống' })
  @MaxLength(1000, { message: 'Nghĩa dài tối đa 1000 ký tự' })
  meaning: string;

  @ApiPropertyOptional({ nullable: true, example: 'たべる', maxLength: 200 })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(200)
  reading?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'taberu', maxLength: 200 })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(200)
  romanization?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(1000)
  exampleSentence?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(1000)
  exampleTranslation?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: `Field đặc thù ngôn ngữ, chỉ để hiển thị. Tối đa ${EXTRA_MAX_BYTES} byte.`,
    example: { verbGroup: 'ichidan' },
  })
  @IsOptional()
  @IsObject()
  @MaxJsonBytes(EXTRA_MAX_BYTES)
  extra?: Record<string, unknown> | null;
}

// languageId không đổi được: level và collection của từ đều thuộc ngôn ngữ đó.
export class UpdateVocabularyDto extends PartialType(
  OmitType(CreateVocabularyDto, ['languageId'] as const),
) {}

// Whitelist: chuỗi `sort` từ client KHÔNG BAO GIỜ đi thẳng vào orderBy.
export const VOCABULARY_SORTS = [
  'createdAt:desc',
  'createdAt:asc',
  'updatedAt:desc',
  'updatedAt:asc',
  'term:asc',
  'term:desc',
] as const;
export type VocabularySort = (typeof VOCABULARY_SORTS)[number];

export class QueryVocabularyDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Tìm trong term, meaning, reading, romanization',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  languageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  levelId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  collectionId?: string;

  @ApiPropertyOptional({
    enum: LearningStatus,
    description: 'NEW gồm cả từ chưa ôn lần nào',
  })
  @IsOptional()
  @IsEnum(LearningStatus)
  status?: LearningStatus;

  @ApiPropertyOptional({ enum: VOCABULARY_SORTS, default: 'createdAt:desc' })
  @IsOptional()
  @IsIn(VOCABULARY_SORTS, {
    message: `sort phải là một trong: ${VOCABULARY_SORTS.join(', ')}`,
  })
  sort: VocabularySort = 'createdAt:desc';
}
