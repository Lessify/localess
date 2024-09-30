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

  public static isEqual(source: any, target: any): boolean {
    if (source instanceof Array && target instanceof Array) {
      if (source.length !== target.length) {
        return false;
      }
      for (let i = 0; i < source.length; i++) {
        if (!this.isEqual(source[i], target[i])) {
          return false;
        }
      }
      return true;
    } else if (source instanceof Object && target instanceof Object) {
      const sourceKeys = Object.getOwnPropertyNames(source);
      const targetKeys = Object.getOwnPropertyNames(target);
      if (sourceKeys.length !== targetKeys.length) {
        return false;
      }
      for (const key of sourceKeys) {
        if (!this.isEqual(source[key], target[key])) {
          return false;
        }
      }
      return true;
    }
    return source === target;
  }

  public static isEqualAsString(source: any, target: any): boolean {
    const sourceString = JSON.stringify(source);
    const targetString = JSON.stringify(target);
    return sourceString === targetString;
  }
}
