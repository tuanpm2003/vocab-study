import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { rawValue } from '../../common/dto/transforms.js';
import { ReviewMode, ReviewRating } from '../../generated/prisma/enums.js';

export class ReviewDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vocabularyId: string;

  @ApiProperty({ enum: ReviewMode })
  @IsEnum(ReviewMode)
  mode: ReviewMode;

  @ApiPropertyOptional({
    enum: ReviewRating,
    description: 'Bắt buộc khi mode = FLASHCARD',
  })
  @IsOptional()
  @IsEnum(ReviewRating)
  rating?: ReviewRating;

  @ApiPropertyOptional({ description: 'Bắt buộc khi mode = MULTIPLE_CHOICE' })
  @IsOptional()
  @Transform(rawValue)
  @IsBoolean()
  isCorrect?: boolean;
}
