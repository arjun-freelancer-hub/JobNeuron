import { IsArray, IsEnum } from 'class-validator';
import { UserRole } from '../../schemas/user.schema';

export class UpdateRolesDto {
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
