/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { RpcException } from '@nestjs/microservices';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import Cache from '@lib/cache';
import { RequestContext } from '@mikro-orm/core';
import { status } from '@grpc/grpc-js';

import {
  LoginDto,
  LoginResponseDto,
  SignupDto,
  SignupResponseDto,
  LogoutDto,
  LogoutResponseDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
} from '@lib/common';
import { User } from '@/db/entities/user.entity';
import { ConfigType } from '@/config';
import { UserSession } from '@/db/entities/user_session.entity';

@Injectable()
export class AuthService {
  ArgonOptions: argon2.Options = {
    type: argon2.argon2id,
    hashLength: 64,
    timeCost: 5,
  };

  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService<ConfigType>,
    private readonly jwt: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    return RequestContext.create(this.em, async () => {
      const identifier = loginDto.email ?? loginDto.username;
      try {
        await this.checkLoginBlock(identifier);
        const user = await this.em.findOne(User, {
          removed: false,
          $or: [{ email: identifier }, { username: identifier }],
        });

        if (!user) {
          console.error(
            `User not found for email: ${loginDto.email}/username: ${loginDto.username}`,
          );
          throw new RpcException({
            code: status.UNAUTHENTICATED,
            message: 'INVALID_EMAIL_USERNAME',
          });
        }

        await this.verifyPassword(
          user.password,
          loginDto.password,
          user.id,
          user.email,
        );

        const { accessToken, refreshToken } = await this.createTokens(
          user.id,
          user.email,
          user.username,
          user.verified,
        );
        const sessionId = await this.createSession(user, refreshToken);

        return {
          userId: user.id,
          accessToken,
          refreshToken,
          sessionId,
        };
      } catch (error) {
        await this.blockLogin(identifier);
        if (error instanceof RpcException) {
          throw error;
        }
        console.error(error);
        throw new RpcException({
          code: status.UNAUTHENTICATED,
          message: 'LOGIN_ERROR',
        });
      }
    });
  }

  async signup(signupDto: SignupDto): Promise<SignupResponseDto> {
    return RequestContext.create(this.em, async () => {
      try {
        const user = await this.findUserByEmail(signupDto.email);
        if (user) {
          console.error(`Signup user already exists: ${user.email}`);
          throw new RpcException({
            code: status.ALREADY_EXISTS,
            message: 'USER_EXISTS',
          });
        }

        const newUser = new User({
          email: signupDto.email,
          password: await argon2.hash(signupDto.password, this.ArgonOptions),
        });
        await this.em.persistAndFlush(newUser);
        return {
          message: 'SIGNUP_SUCCESS',
          success: true,
          error: false,
        };
      } catch (error) {
        if (error instanceof RpcException) {
          throw error;
        }
        throw new RpcException({
          code: status.UNKNOWN,
          message: 'SIGNUP_ERROR',
        });
      }
    });
  }

  async logout(logoutDto: LogoutDto): Promise<LogoutResponseDto> {
    return RequestContext.create(this.em, async () => {
      try {
        const accessTokenPayload: Record<string, string> =
          await this.jwt.verifyAsync(logoutDto.accessToken, {
            secret: this.config.getOrThrow('JWT_SECRET_ACCESS'),
          });
        const refreshToken = accessTokenPayload.refreshToken;
        const refreshTokenPayload: Record<string, string> =
          await this.jwt.verifyAsync(refreshToken, {
            secret: this.config.getOrThrow('JWT_SECRET_REFRESH'),
          });
        if (accessTokenPayload.id !== refreshTokenPayload.id) {
          console.error(
            `User id for access token: ${accessTokenPayload.id} 
          and refresh token: ${refreshTokenPayload.id} do not match`,
          );
          throw new RpcException({
            code: status.PERMISSION_DENIED,
            message: 'LOGOUT_NOT_ALLOWED',
          });
        }
        await this.findAndEndSession(refreshToken, logoutDto.sessionId);
      } catch (error) {
        console.error(error);
        if (error instanceof RpcException) {
          throw error;
        }
      }
      return {
        message: 'LOGOUT_SUCCESS',
        success: true,
        error: false,
      };
    });
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    return RequestContext.create(this.em, async () => {
      const user = await this.findUserByEmail(forgotPasswordDto.email);
      if (user) {
        await this.resetPassword(user.id, user.email);
      }
      return {
        message: 'FORGOT_PASSWORD_SUCCESS',
        success: true,
        error: true,
      };
    });
  }

  // TODO: Update this method to store actual user data in sessions table and cache
  private async createSession(user: User, refreshToken: string) {
    const newSession = new UserSession({
      user: user,
      token: refreshToken,
      user_agent: '',
      ipaddress: '0.0.0.0',
      location: 'India',
    });
    await this.em.persistAndFlush(newSession);

    const sessionId = await this.jwt.signAsync(
      {
        id: newSession.id,
      },
      {
        secret: this.config.getOrThrow('SESSION_SECRET'),
        expiresIn: '30d',
      },
    );

    const cachePayload = {
      id: newSession.id,
      userId: user.id,
      user_agent: '',
      ipaddress: '0.0.0.0',
      location: 'India',
    };

    await Cache.set(sessionId, cachePayload, 30 * 86400); // 30 days
    return sessionId;
  }

  private async createTokens(
    userId: string,
    email: string,
    username: string = '',
    verified: boolean,
  ) {
    const refreshToken = await this.jwt.signAsync(
      { id: userId },
      {
        secret: this.config.getOrThrow('JWT_SECRET_REFRESH'),
        expiresIn: '30d',
      },
    );

    const accessToken = await this.jwt.signAsync(
      {
        id: userId,
        email: email,
        username: username,
        verified: verified,
        refreshToken,
      },
      {
        secret: this.config.getOrThrow('JWT_SECRET_ACCESS'),
        expiresIn: '15m',
      },
    );

    return { accessToken, refreshToken };
  }

  private async verifyPassword(
    hash: string,
    inputPassword: string,
    userId: string,
    email: string,
  ) {
    const isPasswordValid = await argon2.verify(
      hash,
      inputPassword,
      this.ArgonOptions,
    );
    if (!isPasswordValid) {
      console.error(`Invalid password for user: ${userId}-${email}`);
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'INVALID_PASSWORD',
      });
    }
  }

  async findUserById(id: string) {
    return this.em.findOne(User, {
      id,
    });
  }

  private async findUserByEmail(email: string) {
    return this.em.findOne(User, {
      email,
    });
  }

  private async findAndEndSession(token: string, sessionId: string) {
    const session = await this.em.findOne(UserSession, {
      token,
    });

    const sessionPayload: Record<string, string> = await this.jwt.verifyAsync(
      sessionId,
      {
        secret: this.config.getOrThrow('SESSION_SECRET'),
      },
    );

    if (session && sessionPayload.id === session.id) {
      session.expires_at = new Date();
      session.removed = true;
      session.rtime = new Date();
      await this.em.persistAndFlush(session);
      await Cache.del(sessionId);
    } else {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message: 'LOGOUT_SESSION_INVALID',
      });
    }
  }

  // TODO: Implement password reset mail
  private async resetPassword(userId: string, email: string) {}

  /**
   * Increases the number of failed login attempts in cache
   * @param identifier User login identifier - email/username
   */
  private async blockLogin(identifier: string): Promise<void> {
    let attempts = await Cache.get<number>(identifier);
    if (!attempts) {
      attempts = 1;
    }
    await Cache.set(identifier, attempts + 1, 30 * 60);
  }

  /**
   * Blocks user login for 30 mins if failed login attempts are more than 3
   * @param identifier User login identifier - email/username
   * @returns
   */
  private async checkLoginBlock(identifier: string): Promise<void> {
    const attempts = await Cache.get<number>(identifier);
    if (!attempts) {
      return;
    }
    if (attempts > 3) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message: 'LOGIN_ATTEMPTS_LIMIT_REACHED',
      });
    }
  }
}
