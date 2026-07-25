import { Body, Controller, Logger, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() body: ChatRequestDto, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const chunk of this.chatService.streamReply(body.messages)) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
    } catch (err) {
      this.logger.error('OpenAI stream failed', err instanceof Error ? err.stack : err);
      res.write(
        `data: ${JSON.stringify({ error: 'Something went wrong. Please try again.' })}\n\n`,
      );
    } finally {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}
