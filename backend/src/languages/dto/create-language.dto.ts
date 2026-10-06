import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { trimString } from '../../common/dto/transforms.js';

export class CreateLanguageDto {
  @ApiProperty({ example: 'Japanese', maxLength: 50 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Tên ngôn ngữ không được để trống' })
  @MaxLength(50, { message: 'Tên ngôn ngữ dài tối đa 50 ký tự' })
  name: string;

  @ApiPropertyOptional({ example: 'ja', maxLength: 10 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(10, { message: 'Mã ngôn ngữ dài tối đa 10 ký tự' })
  code?: string;
}
