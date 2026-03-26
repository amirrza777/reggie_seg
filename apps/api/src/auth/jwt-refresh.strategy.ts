import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private config: ConfigService, private auth: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        req => req?.cookies?.refresh_token || req?.body?.refreshToken,
      ]),
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const token = req?.cookies?.refresh_token || req?.body?.refreshToken;
    const valid = await this.auth.validateRefreshToken(payload.sub, token);
    if (!valid) throw new UnauthorizedException();
    req.refreshToken = token;
    return payload;
  }
}