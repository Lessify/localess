export class ObjectUtils {
  public static clone<T>(source: T, clean = false): T {
    if (source instanceof Array) {
      const target: any = Object.assign([], source);
      Object.getOwnPropertyNames(target).forEach(value => {
        if (target[value] instanceof Object) {
          target[value] = this.clone(target[value]);
        }
      });
      return target;
    } else if (source instanceof Object) {
      const target: any = Object.assign({}, source);
      Object.getOwnPropertyNames(target).forEach(value => {
        if (target[value] instanceof Object) {
          target[value] = this.clone(target[value]);
        }
        if (clean && target[value] == null) {
          delete target[value];
        }
      });
      return target;
    }
    return null as unknown as T;
  }

  public static clean(source: any) {
    if (source instanceof Array) {
      source.forEach(value => {
        if (value instanceof Object) {
          this.clean(value);
        }
      });
    } else if (source instanceof Object) {
      Object.getOwnPropertyNames(source).forEach(value => {
        if (source[value] instanceof Object) {
          this.clean(source[value]);
        }
        if (source[value] === null || source[value] === undefined) {
          delete source[value];
        }
      });
    }
  }
}
