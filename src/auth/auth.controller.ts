import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  GetCurrentUser,
  GetCurrentUserId,
  IsPublic,
} from 'src/common/decorators';
import { AccessTokenGuard } from 'src/common/guards';
import { RefreshTokenGuard } from './../common/guards/rt.guard';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';
import { Tokens } from './types';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @IsPublic()
  @Post('/local/signup')
  @HttpCode(HttpStatus.CREATED)
  signupLocal(@Body() body: AuthDto): Promise<Tokens> {
    return this.authService.signupLocal(body);
  }

  @IsPublic()
  @Post('/local/signin')
  @HttpCode(HttpStatus.OK)
  signinLocal(@Body() body: AuthDto): Promise<Tokens> {
    return this.authService.signinLocal(body);
  }

  @IsPublic()
  @UseGuards(AccessTokenGuard)
  @Post('/logout')
  @HttpCode(HttpStatus.OK)
  logout(@GetCurrentUserId() userId: string) {
    return this.authService.logout(userId);
  }

  @UseGuards(RefreshTokenGuard)
  @Post('/refresh')
  @HttpCode(HttpStatus.OK)
  refreshTokens(
    @GetCurrentUserId() userId: string,
    @GetCurrentUser('refreshToken') refreshToken: string,
  ) {
    return this.authService.refreshTokens(userId, refreshToken);
  }
}
