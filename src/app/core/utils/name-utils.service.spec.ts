import {NameUtils} from './name-utils.service';

describe('Test Name Utils', () => {
  it('contains spaces', () => {
    expect(NameUtils.sanitize('  no  name   ')).toEqual('noname')
  });

});
