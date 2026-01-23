import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    // Email verification disabled until email service is implemented
    const user = await this.userModel.create({
      email,
      password: hashedPassword,
      roles: [UserRole.USER],
      emailVerified: true, // Auto-verify since email service is not available
    });

    return {
      id: user._id.toString(),
      email: user.email,
      emailVerified: user.emailVerified,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
   
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Email verification check disabled until email service is implemented
    // if (!user.emailVerified) {
    //   throw new UnauthorizedException('Please verify your email before logging in');
    // }

    // Generate tokens
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        roles: user.roles,
      },
    };
  }

  async validateUser(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId);
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.userModel.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newPayload = {
        sub: user._id.toString(),
        email: user.email,
        roles: user.roles,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        secret: process.env.JWT_SECRET,
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async verifyEmail(token: string) {
    const user = await this.userModel.findOne({ emailVerificationToken: token });
    if (!user) {
      throw new UnauthorizedException('Invalid verification token');
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    const resetToken = this.generateRandomToken();
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // TODO: Send password reset email

    return { message: 'If the email exists, a password reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return { message: 'Password reset successfully' };
  }

  private generateRandomToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}
