export class NameUtils {
  public static sanitize(input: string): string {
    const replace = '';
    return input
      .toLowerCase()
      .replace(' ', replace)
      .replace(/[^\w\d\s_-]/g, replace);
  }
}
