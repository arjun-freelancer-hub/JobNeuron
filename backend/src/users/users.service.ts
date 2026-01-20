import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRolesDto } from './dto/update-roles.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findAll(user: UserDocument) {
    // Only admins can see all users
    if (!user.roles.includes(UserRole.ADMIN) && !user.roles.includes(UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException('Only admins can view all users');
    }

    return this.userModel.find().select('-password -emailVerificationToken -passwordResetToken').exec();
  }

  async findOne(id: string, currentUser: UserDocument) {
    // Users can only see their own profile, unless they're admin
    if (id !== currentUser._id.toString() && 
        !currentUser.roles.includes(UserRole.ADMIN) && 
        !currentUser.roles.includes(UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException('You can only view your own profile');
    }

    const user = await this.userModel.findById(id).select('-password -emailVerificationToken -passwordResetToken');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: UserDocument) {
    // Users can only update their own profile, unless they're admin
    if (id !== currentUser._id.toString() && 
        !currentUser.roles.includes(UserRole.ADMIN) && 
        !currentUser.roles.includes(UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $set: updateUserDto },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateRoles(id: string, updateRolesDto: UpdateRolesDto, currentUser: UserDocument) {
    // Only super admins can change roles
    if (!currentUser.roles.includes(UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException('Only super admins can change user roles');
    }

    // Prevent removing super admin role from yourself
    if (id === currentUser._id.toString() && !updateRolesDto.roles.includes(UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException('You cannot remove your own super admin role');
    }

    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { roles: updateRolesDto.roles } },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async delete(id: string, currentUser: UserDocument) {
    // Only super admins can delete users
    if (!currentUser.roles.includes(UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException('Only super admins can delete users');
    }

    // Prevent deleting yourself
    if (id === currentUser._id.toString()) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { message: 'User deleted successfully' };
  }
}
