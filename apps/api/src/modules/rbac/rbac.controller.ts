import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth';
import { RbacService } from './rbac.service';
import { permissionCreateSchema, permissionUpdateSchema, roleCreateSchema, roleUpdateSchema, userRolesSchema } from '@motive-fashion/validation';

@Controller('rbac')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('rbac.roles.write')
export class RbacController {
  constructor(@Inject(RbacService) private readonly rbac: RbacService) {}

  @Get('permissions')
  permissions() {
    return this.rbac.listPermissions();
  }

  @Post('permissions')
  createPermission(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    return this.rbac.createPermission(permissionCreateSchema.parse(body), user.sub);
  }

  @Patch('permissions/:id')
  updatePermission(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    return this.rbac.updatePermission(id, permissionUpdateSchema.parse(body), user.sub);
  }

  @Delete('permissions/:id')
  removePermission(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.rbac.deletePermission(id, user.sub);
  }

  @Get('roles')
  roles() {
    return this.rbac.listRoles();
  }

  @Get('roles/:id')
  role(@Param('id') id: string) {
    return this.rbac.getRole(id);
  }

  @Post('roles')
  create(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    return this.rbac.createRole(roleCreateSchema.parse(body), user.sub);
  }

  @Patch('roles/:id')
  update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    return this.rbac.updateRole(id, roleUpdateSchema.parse(body), user.sub);
  }

  @Delete('roles/:id')
  remove(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.rbac.deleteRole(id, user.sub);
  }

  @Get('users')
  @RequirePermissions('rbac.users.assign')
  users() {
    return this.rbac.listUsers();
  }

  @Put('users/:id/roles')
  @RequirePermissions('rbac.users.assign')
  setRoles(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    return this.rbac.setUserRoles(id, userRolesSchema.parse(body).roleIds, user.sub);
  }
}
