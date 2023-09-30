export class NameUtils {
  public static sanitize(input: string): string {
    const replace = '';
    return input
      .toLowerCase()
      .replace(' ', replace)
      .replace(/[^\w\d\s_-]/g, replace);
  }
  public static slug(input: string): string {
    return input
      .toLowerCase()
      .replace(/\s/g, '-')
      .replace(/[!*'();:@&=+$,/?%#[\]]/g, '') // Reserved
      .replace(/[.~]/g, ''); // no wish
  }
}
