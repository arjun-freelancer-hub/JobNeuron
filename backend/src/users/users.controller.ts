import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRolesDto } from './dto/update-roles.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../schemas/user.schema';
import type { UserDocument } from '../schemas/user.schema';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll(@GetUser() user: UserDocument) {
    return this.usersService.findAll(user);
  }

  @Get('me')
  getMe(@GetUser() user: UserDocument) {
    return {
      id: user._id.toString(),
      email: user.email,
      roles: user.roles,
      emailVerified: user.emailVerified,
      profileImageUrl: user.profileImageUrl,
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: UserDocument) {
    return this.usersService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser() user: UserDocument,
  ) {
    return this.usersService.update(id, updateUserDto, user);
  }

  @Patch(':id/roles')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  updateRoles(
    @Param('id') id: string,
    @Body() updateRolesDto: UpdateRolesDto,
    @GetUser() user: UserDocument,
  ) {
    return this.usersService.updateRoles(id, updateRolesDto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string, @GetUser() user: UserDocument) {
    return this.usersService.delete(id, user);
  }
}
