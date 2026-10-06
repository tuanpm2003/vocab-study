import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const SESSION_MODES = ['flashcard', 'multiple_choice'] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

export class ScopeDto {
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

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class SessionQueryDto extends ScopeDto {
  @ApiProperty({ enum: SESSION_MODES })
  @IsIn(SESSION_MODES, {
    message: `mode phải là một trong: ${SESSION_MODES.join(', ')}`,
  })
  mode: SessionMode;
}
