import {ObjectUtils} from './object-utils.service';

describe('Test Object Utils', () => {
  it('is equal', () => {
    const original: any = {
      number: 1,
      string: 'abc',
      object: {
        a: 'a',
        b: 'b',
        c: 'c'
      },
      array: [1, 2, 3, 4],
      arrayObj: [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }]
    };
    const clone: any = ObjectUtils.clone(original);
    expect(original).toEqual(clone);
  });

  it('number do not change', () => {
    const original: any = {
      number: 1
    };
    const clone: any = ObjectUtils.clone(original);
    expect(original).toEqual(clone);
    original.number = 2;
    expect(original.number).not.toEqual(clone.number);
  });

  it('string do not change', () => {
    const original: any = {
      string: 'abc'
    };
    const clone: any = ObjectUtils.clone(original);
    expect(original).toEqual(clone);
    original.string = 'cde';
    expect(original.string).not.toEqual(clone.string);
  });

  it('object do not change', () => {
    const original: any = {
      object: {
        a: 'a',
        b: 'b',
        c: 'c'
      }
    };
    const clone: any = ObjectUtils.clone(original);
    expect(original).toEqual(clone);
    original.object.a = 'cde';
    expect(original.object).not.toEqual(clone.object);
  });

  it('array remove do not change', () => {
    const original: any = {
      array: [1, 2, 3, 4]
    };
    const clone: any = ObjectUtils.clone(original);
    expect(original).toEqual(clone);
    original.array.splice(0, 1);
    expect(original.array).not.toEqual(clone.array);
  });

  it('array change do not change', () => {
    const original: any = {
      array: [1, 2, 3, 4]
    };
    const clone: any = ObjectUtils.clone(original);
    expect(original).toEqual(clone);
    original.array[0] = 'xxx';
    expect(original.array).not.toEqual(clone.array);
  });

  it('array of Objects remove do not change', () => {
    const original: any = {
      arrayObj: [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }]
    };
    const clone: any = ObjectUtils.clone(original);
    expect(original).toEqual(clone);
    original.arrayObj.splice(0, 1);
    expect(original.arrayObj).not.toEqual(clone.arrayObj);
  });

  it('array of Objects change do not change', () => {
    const original: any = {
      arrayObj: [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }]
    };
    const clone: any = ObjectUtils.clone(original);
    expect(original).toEqual(clone);
    original.arrayObj[0].a = 'xxx';
    expect(original.arrayObj).not.toEqual(clone.arrayObj);
  });
});
