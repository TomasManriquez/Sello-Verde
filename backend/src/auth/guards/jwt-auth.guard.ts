import { Injectable, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { CAPACIDAD_KEY, capacidadDeMetodo, puede, Capacidad } from '../capacidades';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    if (!(await (super.canActivate(context) as Promise<boolean>))) return false;

    const req = context.switchToHttp().getRequest();
    const exigida =
      this.reflector.getAllAndOverride<Capacidad>(CAPACIDAD_KEY, [context.getHandler(), context.getClass()]) ??
      capacidadDeMetodo(req.method);
    if (!puede(req.user.rol, exigida)) {
      throw new ForbiddenException('Tu rol no permite realizar esta acción');
    }
    return true;
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Token inválido o expirado');
    }
    return user;
  }
}
