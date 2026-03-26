import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signUp(email: string, password: string, name?: string) {
    const hash = await argon2.hash(password);
    const user = await this.users.create({ email, password: hash, name });
    const tokens = await this.issueTokens(user.id, user.email);
    await this.saveRefresh(user.id, tokens.refreshToken);
    return tokens;
  }

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.users.findByEmail(email);
    if (!user) return null;
    const ok = await argon2.verify(user.password, pass);
    return ok ? user : null;
  }

  async login(user: User) {
    const tokens = await this.issueTokens(user.id, user.email);
    await this.saveRefresh(user.id, tokens.refreshToken);
    return tokens;
  }

  private async issueTokens(sub: number, email: string) {
    const payload = { sub, email };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL'),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL'),
    });
    return { accessToken, refreshToken };
  }

  private async saveRefresh(userId: number, token: string) {
    const hashedToken = await argon2.hash(token);
    const expiresAt = addDurationToNow(this.config.get<string>('JWT_REFRESH_TTL') ?? '30d');
    await this.prisma.refreshToken.create({ data: { userId, hashedToken, expiresAt } });
  }

  async validateRefreshToken(userId: number, token: string) {
    const records = await this.prisma.refreshToken.findMany({
      where: { userId, revoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    for (const rt of records) if (await argon2.verify(rt.hashedToken, token)) return true;
    return false;
  }

  async rotateRefresh(userId: number, oldToken: string) {
    const valid = await this.validateRefreshToken(userId, oldToken);
    if (!valid) throw new UnauthorizedException();
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false, expiresAt: { gt: new Date() } },
      data: { revoked: true },
    });
    const user = await this.users.findById(userId);
    const tokens = await this.issueTokens(user.id, user.email);
    await this.saveRefresh(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: number) {
    await this.prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
  }
}

function addDurationToNow(expr: string) {
  const ms = parseDuration(expr);
  return new Date(Date.now() + ms);
}

function parseDuration(expr: string) {
  const match = /^(\d+)([smhd])$/.exec(expr);
  if (!match) return Number(expr) * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  return value * 24 * 60 * 60 * 1000;
}