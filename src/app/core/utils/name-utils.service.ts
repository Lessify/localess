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

  public static random(length: number): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }
}
