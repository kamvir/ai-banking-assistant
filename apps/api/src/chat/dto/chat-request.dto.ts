import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;
}

export class ChatRequestDto {
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  messages: ChatMessageDto[];
}
