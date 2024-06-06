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
      .trim()
      .toLowerCase()
      .replace(/\s/g, '-')
      .replace(/[!*'();:@&=+$,/?%#[\]]/g, '') // Reserved
      .replace(/[.~]/g, ''); // no wish
  }
  public static schemaId(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .split(/[.\-_\s]/g) // split the text into words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(''); // join the words with a space
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
