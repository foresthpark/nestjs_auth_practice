/* eslint-disable prettier/prettier */
import { PrismaService } from './../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
/*
https://docs.nestjs.com/providers#services
*/

import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthDto } from './dto';
import { Tokens } from './types';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async signupLocal(body: AuthDto): Promise<Tokens> {
    const hash = await this.hashData(body.password);
    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        hash,
      },
    });

    const tokens = await this.getTokens(user.id, user.email);

    return tokens;
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashRt = await this.hashData(refreshToken);
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        hashRt,
      },
    });

    const tokens = await this.getTokens(userId, refreshToken);
    return tokens;
  }

  async signinLocal(body: AuthDto): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });

    if (!user) {
      throw new ForbiddenException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(body.password, user.hash);

    if (!isMatch) {
      throw new ForbiddenException('Invalid credentials');
    }

    const tokens = await this.updateRefreshToken(user.id, user.email);

    return tokens;
  }

  async logout(userId: string) {
    const user = await this.prisma.user.updateMany({
      where: {
        id: userId,
        hashRt: {
          not: null,
        },
      },
      data: {
        hashRt: null,
      },
    });
  }

  async refreshTokens(userId: string, rt: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new ForbiddenException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(rt, user.hashRt);

    if (!isMatch) {
      throw new ForbiddenException('Invalid credentials');
    }

    const tokens = await this.updateRefreshToken(userId, user.email);

    return tokens;
  }

  hashData(data: string) {
    return bcrypt.hash(data, 10);
  }

  async getTokens(userId: string, email: string) {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: process.env.ACCESS_TOKEN_SECRET,
          expiresIn: 60 * 15,
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: process.env.REFRESH_TOKEN_SECRET,
          expiresIn: 60 * 60 * 24 * 7,
        },
      ),
    ]);

    return { access_token: at, refresh_token: rt };
  }
}
