import { Controller } from '@nestjs/common';
import { Payload, GrpcMethod } from '@nestjs/microservices';
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
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod('AuthService', 'Login')
  login(@Payload() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @GrpcMethod('AuthService', 'Signup')
  signup(@Payload() signupDto: SignupDto): Promise<SignupResponseDto> {
    return this.authService.signup(signupDto);
  }

  @GrpcMethod('AuthService', 'Logout')
  logout(@Payload() logoutDto: LogoutDto): Promise<LogoutResponseDto> {
    return this.authService.logout(logoutDto);
  }

  @GrpcMethod('AuthService', 'ForgotPassword')
  forgotPassword(
    @Payload() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }
}
