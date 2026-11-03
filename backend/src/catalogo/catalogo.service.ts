import { Injectable, NotFoundException } from '@nestjs/common';
import { CATALOGO_ESTABLECIMIENTOS, CatalogoEstablecimiento } from './catalogo-establecimientos.data';

const POR_RBD = new Map(CATALOGO_ESTABLECIMIENTOS.map((e) => [e.rbd, e]));

/** Datos de referencia de los establecimientos del SLEP, para autocompletar el alta por RBD. */
@Injectable()
export class CatalogoService {
  /** Acepta el RBD con o sin dígito verificador ("7976" o "7976-6"): el listado no trae el dígito. */
  buscarPorRbd(rbd: string): { data: CatalogoEstablecimiento & { region: string }; message: string } {
    const numero = rbd.split('-')[0].replace(/\D/g, '');
    const item = POR_RBD.get(numero);
    if (!item) {
      throw new NotFoundException(`El RBD ${rbd} no está en el listado de establecimientos del SLEP`);
    }
    return { data: { ...item, region: 'Los Lagos' }, message: 'OK' };
  }
}
