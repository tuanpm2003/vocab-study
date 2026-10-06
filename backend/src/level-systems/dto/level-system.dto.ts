import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { rawValue, trimString } from '../../common/dto/transforms.js';

export class CreateLevelDto {
  @ApiProperty({ example: 'N5', maxLength: 50 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Tên level không được để trống' })
  @MaxLength(50, { message: 'Tên level dài tối đa 50 ký tự' })
  name: string;

  @ApiPropertyOptional({ description: 'Bỏ trống = xếp cuối', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateLevelDto extends PartialType(CreateLevelDto) {}

export class CreateLevelSystemDto {
  @ApiProperty({ example: 'JLPT', maxLength: 50 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Tên hệ thống level không được để trống' })
  @MaxLength(50, { message: 'Tên hệ thống level dài tối đa 50 ký tự' })
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(rawValue)
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ type: [CreateLevelDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique((level: CreateLevelDto) => level?.name, {
    message: 'Tên level bị trùng trong danh sách',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateLevelDto)
  levels?: CreateLevelDto[];
}

export class UpdateLevelSystemDto {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Tên hệ thống level không được để trống' })
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(rawValue)
  @IsBoolean()
  isDefault?: boolean;
}

export class ReorderLevelsDto {
  @ApiProperty({
    type: [String],
    description: 'Toàn bộ id level theo thứ tự mới',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  levelIds: string[];
}
